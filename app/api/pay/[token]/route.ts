import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import {
  computeTotal,
  createSwychrPaymentRequest,
  internationalMobile,
  resolvePaymentMethod,
} from "@/lib/swychr";
import { createSaspayPayment } from "@/lib/saspay";
import { getActiveProvider } from "@/lib/payment-provider";
import { liveGate } from "@/lib/live-gate";

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

  let body: { name?: string; mobile?: string; operator?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const operator = String(body.operator ?? "").trim();

  if (!name || !mobile || !operator) {
    return NextResponse.json(
      { message: "Choisis ton opérateur et indique ton nom et ton numéro." },
      { status: 400 }
    );
  }

  const { data: link } = await admin.from("payment_links").select("*").eq("token", token).maybeSingle();

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

  const provider = await getActiveProvider(admin);
  const amount = Number(link.amount);
  const total = computeTotal(amount, link.country_code, true);
  // Frais FlashPay existants, calculés sur le montant du lien.
  const fee = Math.round(amount * 0.06 * 100) / 100;
  const transactionId = `FP-${randomBytes(8).toString("hex").toUpperCase()}`;
  const apiKey = provider === "saspay" ? process.env.SASPAY_API_KEY ?? "" : process.env.SWYCHR_API_KEY ?? "";

  const paymentMethod =
    provider === "swychr" ? await resolvePaymentMethod(link.country_code, operator, apiKey) : operator;

  // Transaction enregistrée avant l'appel au prestataire.
  // amount = total payé par le client (frais inclus), pour que le webhook corresponde.
  const { error: insertError } = await admin.from("transactions").insert({
    owner_id: link.owner_id,
    app_id: link.app_id,
    transaction_id: transactionId,
    country_code: link.country_code,
    payment_method: paymentMethod,
    amount: total,
    currency_code: link.currency_code,
    processing_fee: fee,
    net_payable: Math.round((amount - fee) * 100) / 100,
    status: "pending",
    provider,
  });

  if (insertError) {
    return NextResponse.json({ message: "Le paiement n’a pas pu être préparé." }, { status: 500 });
  }

  const markFailed = () =>
    admin.from("transactions").update({ status: "failed" }).eq("transaction_id", transactionId);

  // --- SasPay : paiement direct, le client reste sur FlashPay ---
  if (provider === "saspay") {
    const result = await createSaspayPayment(
      {
        amount: total,
        currency: link.currency_code,
        countryCode: link.country_code,
        operatorLabel: operator,
        description: link.label,
        name,
        email: process.env.SASPAY_DEFAULT_EMAIL ?? "paiements@flashpay.app",
        phone: mobile, // numéro tel que saisi : la conversion se fait dans lib/saspay.ts
      },
      apiKey
    );

    if (!result.ok) {
      await markFailed();
      return NextResponse.json({ message: result.message }, { status: 502 });
    }

    if (result.providerId || result.reference) {
      await admin
        .from("transactions")
        .update({ provider_transaction_id: result.providerId ?? result.reference })
        .eq("transaction_id", transactionId);
    }

    return NextResponse.json({
      status: "pending",
      mode: "live",
      transaction_id: transactionId,
      message: "Valide le paiement sur ton téléphone avec ton code PIN.",
    });
  }

  // --- Swychr : lien hébergé, le client est redirigé ---
  const result = await createSwychrPaymentRequest(
    {
      country_code: link.country_code,
      name,
      mobile,
      transaction_id: transactionId,
      amount,
      payment_method: paymentMethod,
      description: link.label,
      clientFee: true,
    },
    apiKey
  );

  if (!result.ok) {
    await markFailed();
    return NextResponse.json({ message: result.message }, { status: 502 });
  }

  return NextResponse.json({
    status: "pending",
    mode: "live",
    transaction_id: transactionId,
    payment_link: result.paymentLink,
    message: "Redirection vers la page de validation de ton opérateur.",
  });
}
