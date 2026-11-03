import { createHash, randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";

export async function POST(request: Request) {
  const key = request.headers.get("x-flashpay-key");
  if (key?.startsWith("fp_live_")) {
    // Les clés live ne déclenchent aucune collecte réelle tant que l'enregistrement des transactions
    // et l'appel Swychr de collecte ne sont pas implémentés.
    return NextResponse.json({ message: "Les collectes live ne sont pas encore disponibles." }, { status: 503 });
  }
  if (!key?.startsWith("fp_test_")) {
    return NextResponse.json({ message: "Une clé de test FlashPay valide est requise dans X-FlashPay-Key." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ message: "Le service de clés de test n’est pas configuré." }, { status: 503 });
  }

  const supabase = createSupabaseClient(url, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const keyHash = createHash("sha256").update(key).digest("hex");
  const { data: keyRows, error: keyError } = await supabase.rpc("validate_test_api_key", { p_key_hash: keyHash });
  const keyRecord = Array.isArray(keyRows) ? keyRows[0] : keyRows;

  if (keyError) {
    return NextResponse.json({ message: "Le service de clés de test n’est pas initialisé. Applique la migration API keys." }, { status: 503 });
  }
  if (!keyRecord) {
    return NextResponse.json({ message: "Cette clé est invalide ou révoquée." }, { status: 401 });
  }

  let body: { country_code?: string; amount?: number; mobile?: string; name?: string; transaction_id?: string; payment_method?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Corps JSON invalide." }, { status: 400 });
  }

  const countryCode = body.country_code?.trim().toUpperCase();
  const country = getSupportedCountry(countryCode);
  const amount = Number(body.amount);
  if (!country) return NextResponse.json({ message: "Pays non configuré dans FlashPay." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ message: "Le montant doit être supérieur à zéro." }, { status: 400 });
  if (!body.name?.trim() || !body.mobile?.trim()) {
    return NextResponse.json({ message: "Le nom et le numéro mobile du payeur sont requis." }, { status: 400 });
  }

  const transactionId = body.transaction_id?.trim() || `FPTEST-${randomBytes(8).toString("hex").toUpperCase()}`;
  return NextResponse.json({
    mode: "test",
    data: {
      transaction_id: transactionId,
      country_code: country.code,
      currency_code: country.currency,
      amount,
      payment_method: body.payment_method ?? null,
      status: "pending",
      message: "Collecte simulée. Aucun appel à Swychr et aucun mouvement de fonds n’ont eu lieu.",
    },
  });
}
