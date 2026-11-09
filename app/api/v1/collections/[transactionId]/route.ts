import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// GET /api/v1/collections/{transaction_id}
// Statut d'une collecte, pour le marchand qui l'a créée. Header : X-FlashPay-Key.
export async function GET(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const key = request.headers.get("x-flashpay-key") ?? "";
  if (!key || !(key.startsWith("fp_test_") || key.startsWith("fp_live_"))) {
    return NextResponse.json({ message: "Une clé FlashPay valide est requise dans X-FlashPay-Key." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Service indisponible." }, { status: 503 });

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // La clé doit exister et ne pas être révoquée ; on retrouve le marchand propriétaire.
  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data: apiKey } = await admin
    .from("api_keys")
    .select("owner_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!apiKey) return NextResponse.json({ message: "Cette clé est invalide ou révoquée." }, { status: 401 });

  // La collecte doit appartenir à ce marchand.
  const { data: tx } = await admin
    .from("transactions")
    .select("transaction_id, status, amount, currency_code, country_code, payment_method, created_at")
    .eq("transaction_id", transactionId)
    .eq("owner_id", apiKey.owner_id)
    .maybeSingle();
  if (!tx) return NextResponse.json({ message: "Collecte introuvable." }, { status: 404 });

  return NextResponse.json({
    data: {
      transaction_id: tx.transaction_id,
      status: tx.status, // pending | successful | failed | cancelled | expired
      amount: tx.amount,
      currency_code: tx.currency_code,
      country_code: tx.country_code,
      payment_method: tx.payment_method,
      created_at: tx.created_at,
    },
  });
}
