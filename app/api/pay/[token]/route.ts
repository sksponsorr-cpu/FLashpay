import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import {
  createSwychrPaymentRequest,
  nationalMobile,
  requiresOtp,
  swychrMethod,
} from "@/lib/swychr";
import { liveGate } from "@/lib/live-gate";

// Paiement d'un lien : mode test (simulation) ou live (API Direct), avec refus clair si non autorisé.
function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = serviceClient();
  if (!admin) return NextResponse.json({ message: "Service indisponible." }, { status: 503 });

  let body: { name?: string; mobile?: string; operator?: string; otp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const operator = String(body.operator ?? "").trim();
  const otp = String(body.otp ?? "").trim();

  if (!name || !mobile || !operator) {
    return NextResponse.json(
      { message: "Choisis ton opérateur et indique ton nom et ton numéro." },
      { status: 400 }
    );
  }

  const { data: link } = await admin
    .from("payment_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!link) return NextResponse.json({ message: "Ce lien de paiement n’existe pas." }, { status: 404 });
  if (!link.is_active) return NextResponse.json({ message: "Ce lien n’est plus actif." }, { status: 409 });

  // Mode test : simulation, aucun argent réel
  if (link.mode === "test") {
    const { error } = await admin.rpc("pay_payment_link", {
      p_token: token,
      p_name: name,
      p_mobile: mobile,
      p_operator: operator,
    });
    if (error) {
      return NextResponse.json({ message: "Le paiement de test n’a pas pu être enregistré." }, { status: 400 });
    }
    return NextResponse.json({
      status: "paid",
      mode: "test",
      message: "Paiement de test enregistré. Aucun argent réel n’a été débité.",
    });
  }

  // Mode live : vérification stricte avant tout appel au prestataire
  const gate = await liveGate(admin, link.owner_id);
  if (!gate.ok) return NextResponse.json({ message: gate.message }, { status: 403 });

  const paymentMethod = swychrMethod(operator);

  if (requiresOtp(link.country_code, paymentMethod) && !otp) {
    return NextResponse.json(
      { message: "Saisis le code OTP de ton compte Orange Money." },
      { status: 400 }
    );
  }

  const { data: country } = await admin
    .from("supported_countries")
    .select("currency_code")
    .eq("code", link.country_code)
    .single();

  const amount = Number(link.amount);
  const fee = Math.round(amount * 0.06 * 100) / 100;
  const transactionId = `FP-${randomBytes(8).toString("hex").toUpperCase()}`;

  // Enregistre la transaction en attente avant d'appeler le prestataire
  const { error: insertError } = await admin.from("transactions").insert({
    owner_id: link.owner_id,
    app_id: link.app_id,
    transaction_id: transactionId,
    country_code: link.country_code,
    payment_method: paymentMethod,
    amount,
    currency_code: link.currency_code ?? country?.currency_code,
    processing_fee: fee,
    net_payable: Math.round((amount - fee) * 100) / 100,
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ message: "Le paiement n’a pas pu être préparé." }, { status: 500 });
  }

  const result = await createSwychrPaymentRequest(
    {
      country_code: link.country_code,
      name,
      mobile: nationalMobile(link.country_code, mobile),
      transaction_id: transactionId,
      amount,
      payment_method: paymentMethod,
      description: link.label,
      pass_digital_charge: true,
      otp: otp || undefined,
    },
    process.env.SWYCHR_API_KEY ?? ""
  );

  if (!result.ok) {
    await admin.from("transactions").update({ status: "failed" }).eq("transaction_id", transactionId);
    return NextResponse.json({ message: result.message }, { status: 502 });
  }

  return NextResponse.json({
    status: "pending",
    mode: "live",
    transaction_id: transactionId,
    message: "Valide le paiement sur ton téléphone avec ton code PIN.",
  });
}
