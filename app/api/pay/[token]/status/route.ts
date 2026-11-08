import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Statut d'un paiement lancé depuis un lien : lu par la page client pendant la validation sur téléphone.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const transactionId = new URL(request.url).searchParams.get("tx") ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !transactionId) return NextResponse.json({ message: "Requête invalide." }, { status: 400 });

  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const { data: link } = await admin.from("payment_links").select("app_id").eq("token", token).maybeSingle();
  if (!link) return NextResponse.json({ message: "Lien introuvable." }, { status: 404 });

  const { data: tx } = await admin.from("transactions").select("status, app_id").eq("transaction_id", transactionId).maybeSingle();
  if (!tx || tx.app_id !== link.app_id) return NextResponse.json({ message: "Paiement introuvable." }, { status: 404 });

  return NextResponse.json({ status: tx.status });
}
