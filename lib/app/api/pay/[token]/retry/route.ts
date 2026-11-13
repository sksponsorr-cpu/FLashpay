import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { retrySaspayPayment } from "@/lib/saspay-status";
import { saspayNetwork } from "@/lib/saspay";

// Relance d'un paiement direct SasPay échoué, avec d'autres réseaux (ex. ["moov_bj"]).
// Le paiement reste rattaché à la même transaction FlashPay.

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.SASPAY_API_KEY;
  if (!url || !key || !apiKey) return NextResponse.json({ message: "Configuration incomplète." }, { status: 503 });

  let body: { transaction_id?: string; operator?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }
  const transactionId = String(body.transaction_id ?? "");
  const operator = String(body.operator ?? "").trim();
  if (!transactionId || !operator) return NextResponse.json({ message: "Réseau de relance invalide." }, { status: 400 });

  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const { data: link } = await admin.from("payment_links").select("app_id").eq("token", token).maybeSingle();
  if (!link) return NextResponse.json({ message: "Lien introuvable." }, { status: 404 });

  const { data: tx } = await admin
    .from("transactions")
    .select("transaction_id, status, app_id, provider, provider_transaction_id, country_code")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (!tx || tx.app_id !== link.app_id || tx.provider !== "saspay") {
    return NextResponse.json({ message: "Paiement introuvable." }, { status: 404 });
  }
  if (tx.status !== "failed" && tx.status !== "cancelled") {
    return NextResponse.json({ message: "Seul un paiement échoué peut être relancé." }, { status: 400 });
  }
  if (!tx.provider_transaction_id) return NextResponse.json({ message: "Paiement non relançable." }, { status: 400 });

  const country = String(tx.country_code ?? "");
  if (!country) return NextResponse.json({ message: "Pays du paiement inconnu." }, { status: 400 });
  // Code réseau SasPay calculé comme pour le paiement initial (ex. moov_bj).
  const methods = [saspayNetwork(operator, country)];

  const result = await retrySaspayPayment(tx.provider_transaction_id, methods, apiKey);
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: 502 });

  await admin
    .from("transactions")
    .update({ status: "pending", provider_transaction_id: result.id || tx.provider_transaction_id })
    .eq("transaction_id", transactionId);

  return NextResponse.json({ ok: true, status: "pending", checkout_url: result.checkoutUrl || null });
}
