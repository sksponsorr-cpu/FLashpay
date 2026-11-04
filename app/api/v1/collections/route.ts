import { createHash, randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";

const RATE_LIMIT_PER_MINUTE = 60;

export async function POST(request: Request) {
  const key = request.headers.get("x-flashpay-key");
  if (key?.startsWith("fp_live_")) {
    // Les clés live ne déclenchent aucune collecte réelle tant que l'appel Swychr de collecte n'est pas implémenté.
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

  // Limite de requêtes par clé. Ce contrôle utilise la clé service role, réservée au serveur.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { data: allowed, error: rateError } = await admin.rpc("check_api_rate_limit", {
      p_key_hash: keyHash,
      p_limit: RATE_LIMIT_PER_MINUTE,
    });
    if (rateError) {
      return NextResponse.json({ message: "Le contrôle des requêtes est indisponible. Réessaie plus tard." }, { status: 503 });
    }
    if (allowed === false) {
      return NextResponse.json(
        { message: "Trop de requêtes pour cette clé. Réessaie dans une minute." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
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

  const { data, error } = await supabase.rpc("record_api_transaction", {
    p_key_hash: keyHash,
    p_transaction_id: transactionId,
    p_country_code: country.code,
    p_currency_code: country.currency,
    p_payment_method: body.payment_method ?? null,
    p_amount: amount,
    p_environment: "test",
  });

  if (error) {
    const text = error.message ?? "";
    if (text.includes("INVALID_KEY")) {
      return NextResponse.json({ message: "Cette clé est invalide ou révoquée." }, { status: 401 });
    }
    if (text.includes("UNKNOWN_CURRENCY")) {
      return NextResponse.json({ message: "Aucune commission n’est configurée pour cette devise." }, { status: 503 });
    }
    return NextResponse.json({ message: "La transaction n’a pas pu être enregistrée. Vérifie que les migrations sont appliquées." }, { status: 503 });
  }

  const record = Array.isArray(data) ? data[0] : data;
  if (!record) {
    return NextResponse.json({ message: "Cet identifiant de transaction est déjà utilisé." }, { status: 409 });
  }

  return NextResponse.json({
    mode: "test",
    data: {
      transaction_id: record.out_transaction_id,
      country_code: country.code,
      currency_code: country.currency,
      amount,
      payment_method: body.payment_method ?? null,
      status: record.out_status,
      platform_fee: record.out_platform_fee,
      net_payable: record.out_net_payable,
      message: "Collecte de test enregistrée. Aucun appel à Swychr et aucun mouvement de fonds n’ont eu lieu.",
    },
  });
}
