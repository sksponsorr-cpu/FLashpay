import { createHash, randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import { computeTotal, createSwychrPaymentRequest, internationalMobile, localMobile } from "@/lib/swychr";
import { createSaspayPayment } from "@/lib/saspay";
import { getActiveProvider } from "@/lib/payment-provider";

const RATE_LIMIT_PER_MINUTE = 60;

type CollectionBody = {
  country_code?: string;
  amount?: number;
  mobile?: string;
  name?: string;
  email?: string;
  transaction_id?: string;
  payment_method?: string;
  description?: string;
  pass_digital_charge?: boolean;
  callback_url?: string;
  failed_callback_url?: string;
};

export async function POST(request: Request) {
  const key = request.headers.get("x-flashpay-key");
  const isLive = key?.startsWith("fp_live_") ?? false;

  if (!key || !(key.startsWith("fp_test_") || isLive)) {
    return NextResponse.json({ message: "Une clé FlashPay valide est requise dans X-FlashPay-Key." }, { status: 401 });
  }
  // Les collectes live restent bloquées tant que l'interrupteur serveur n'est pas activé.
  if (isLive && process.env.SWYCHR_LIVE_PAYMENTS_ENABLED !== "true") {
    return NextResponse.json({ message: "Les collectes live ne sont pas encore disponibles." }, { status: 503 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.json({ message: "Le service de collecte n’est pas configuré." }, { status: 503 });
  }

  const supabase = createSupabaseClient(url, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  const keyHash = createHash("sha256").update(key).digest("hex");

  // Limite de requêtes par clé (contrôle réservé au serveur, avec la clé service role).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = serviceKey
    ? createSupabaseClient(url, serviceKey, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
      })
    : null;

  if (admin) {
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

  let body: CollectionBody;
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
  if (isLive && !body.payment_method?.trim()) {
    return NextResponse.json({ message: "Le moyen de paiement (payment_method) est requis pour une collecte live." }, { status: 400 });
  }

  const environment = isLive ? "live" : "test";
  const transactionId = body.transaction_id?.trim() || `FP${environment === "live" ? "" : "TEST"}-${randomBytes(8).toString("hex").toUpperCase()}`;

  const { data, error } = await supabase.rpc("record_api_transaction", {
    p_key_hash: keyHash,
    p_transaction_id: transactionId,
    p_country_code: country.code,
    p_currency_code: country.currency,
    p_payment_method: body.payment_method?.trim().toUpperCase() ?? null,
    p_amount: amount,
    p_environment: environment,
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

  // Collecte test : aucun appel au prestataire.
  if (!isLive) {
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
        message: "Collecte de test enregistrée. Aucun appel au prestataire et aucun mouvement de fonds n’ont eu lieu.",
      },
    });
  }

  // Collecte live : fournisseur actif (Swychr ou SasPay).
  const provider = admin ? await getActiveProvider(admin) : "swychr";
  const paymentMethod = body.payment_method!.trim().toUpperCase();
  const description = body.description?.trim() || "Collecte FlashPay";

  // Le payeur règle les frais (2,5 %) sauf si le marchand envoie pass_digital_charge: false.
  // Le montant débité est enregistré tel quel, pour que le webhook du prestataire corresponde.
  // Le montant du marchand, la commission et le net restent calculés sur le montant demandé.
  const payerPaysFees = body.pass_digital_charge !== false;
  const charged = computeTotal(amount, country.code, payerPaysFees);
  if (admin && charged !== amount) {
    await admin.from("transactions").update({ amount: charged }).eq("transaction_id", record.out_transaction_id);
  }

  if (provider === "saspay") {
    // Paiement direct : le payeur valide sur son téléphone, sans lien de redirection.
    // Le montant envoyé est exactement celui demandé ; les frais sont réglés selon le réglage SasPay (DEDUCTED).
    const apiKey = process.env.SASPAY_API_KEY;
    if (!apiKey) return NextResponse.json({ message: "La clé de paiement SasPay n’est pas configurée." }, { status: 503 });

    const result = await createSaspayPayment(
      {
        amount: charged,
        currency: country.currency,
        countryCode: country.code,
        operatorLabel: paymentMethod,
        description,
        name: body.name.trim(),
        email: body.email?.trim() || process.env.SASPAY_DEFAULT_EMAIL || "paiements@flashpay.app",
        phone: internationalMobile(country.code, body.mobile),
      },
      apiKey,
    );

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: 502 });
    }

    // Retrouve la transaction par son identifiant chez SasPay pour recevoir la notification.
    if (admin && (result.providerId || result.reference)) {
      await admin
        .from("transactions")
        .update({ provider: "saspay", provider_transaction_id: result.providerId ?? result.reference })
        .eq("transaction_id", record.out_transaction_id);
    }

    return NextResponse.json({
      mode: "live",
      data: {
        transaction_id: record.out_transaction_id,
        country_code: country.code,
        currency_code: country.currency,
        amount,
        payment_method: paymentMethod,
        status: record.out_status,
        platform_fee: record.out_platform_fee,
        net_payable: record.out_net_payable,
        message: "Demande envoyée. Le client valide le paiement avec son code PIN sur son téléphone.",
      },
    });
  }

  // Swychr : lien hébergé, le client est redirigé.
  const swychrKey = process.env.SWYCHR_API_KEY;
  if (!swychrKey) {
    return NextResponse.json({ message: "La clé de paiement serveur n’est pas configurée." }, { status: 503 });
  }

  const paymentRequest = await createSwychrPaymentRequest(
    {
      country_code: country.code,
      name: body.name.trim(),
      email: body.email?.trim() || undefined,
      mobile: localMobile(country.code, body.mobile),
      transaction_id: record.out_transaction_id,
      amount: charged,
      payment_method: paymentMethod,
      description,
      // Montant déjà calculé (frais inclus si le payeur les règle) : aucun ajout supplémentaire.
      clientFee: false,
    },
    swychrKey,
  );

  if (!paymentRequest.ok) {
    // La transaction reste en "pending" dans FlashPay : elle n'a pas été acceptée par le prestataire.
    return NextResponse.json({ message: paymentRequest.message }, { status: 502 });
  }

  return NextResponse.json({
    mode: "live",
    data: {
      transaction_id: record.out_transaction_id,
      country_code: country.code,
      currency_code: country.currency,
      amount,
      payment_method: paymentMethod,
      status: record.out_status,
      platform_fee: record.out_platform_fee,
      net_payable: record.out_net_payable,
      payment_link: paymentRequest.paymentLink,
      message: "Demande créée. Redirige le client vers payment_link pour finaliser le paiement.",
    },
  });
}
