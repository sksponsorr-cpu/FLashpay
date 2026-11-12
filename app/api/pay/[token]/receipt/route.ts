import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Reçu d'un paiement lancé depuis un lien. Accès : le lien doit être celui de la transaction.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const transactionId = new URL(request.url).searchParams.get("tx") ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !transactionId) return NextResponse.json({ message: "Requête invalide." }, { status: 400 });

  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const { data: link } = await admin.from("payment_links").select("app_id, label").eq("token", token).maybeSingle();
  if (!link) return NextResponse.json({ message: "Lien introuvable." }, { status: 404 });

  const { data: tx } = await admin
    .from("transactions")
    .select("transaction_id, amount, fee_amount, currency_code, status, payment_method, country_code, created_at, app_id")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (!tx || tx.app_id !== link.app_id) return NextResponse.json({ message: "Reçu introuvable." }, { status: 404 });
  if (tx.status !== "successful") return NextResponse.json({ message: "Le reçu est disponible après un paiement réussi." }, { status: 409 });

  return NextResponse.json({
    receipt: {
      transaction_id: tx.transaction_id,
      amount: tx.amount,
      fee_amount: tx.fee_amount,
      currency_code: tx.currency_code,
      payment_method: tx.payment_method,
      country_code: tx.country_code,
      created_at: tx.created_at,
      merchant_label: link.label ?? "Paiement",
    },
  });
}
