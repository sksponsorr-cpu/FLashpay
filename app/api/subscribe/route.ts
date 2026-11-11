import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import { createSwychrPaymentRequest, resolvePaymentMethod } from "@/lib/swychr";
import { createSaspayPayment } from "@/lib/saspay";
import { routeProvider } from "@/lib/payment-routing";
import { createClient } from "@/lib/supabase/server";

// Taux appliqué pour les abonnements en RDC (1 XOF = 3,2323 CDF).
const XOF_TO_CDF = 3.2323;

const PLANS: Record<string, { amount: number; label: string }> = {
  basic: { amount: 10000, label: "Basic" },
  premium: { amount: 25000, label: "Premium" },
};

type SubscribeBody = {
  plan?: string;
  country_code?: string;
  mobile?: string;
  payment_method?: string;
  name?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Connecte-toi pour t’abonner." }, { status: 401 });
  }

  let body: SubscribeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }

  const plan = body.plan ? PLANS[body.plan] : undefined;
  if (!plan) return NextResponse.json({ message: "Plan Basic ou Premium invalide." }, { status: 400 });

  const country = getSupportedCountry(body.country_code?.trim().toUpperCase());
  if (!country || !["XAF", "XOF", "CDF"].includes(country.currency)) {
    return NextResponse.json(
      { message: "Les abonnements sont disponibles en FCFA et en CDF." },
      { status: 400 }
    );
  }

  const chargeAmount = country.currency === "CDF" ? Math.round(plan.amount * XOF_TO_CDF) : plan.amount;

  if (!body.mobile?.trim() || !body.payment_method?.trim()) {
    return NextResponse.json({ message: "Numéro et opérateur obligatoires." }, { status: 400 });
  }

  // Routage par pays : paiement direct SasPay ou redirection Swychr.
  const provider = routeProvider(country.code);
  const apiKey = provider === "saspay" ? process.env.SASPAY_API_KEY : process.env.SWYCHR_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ message: "Configuration du paiement incomplète." }, { status: 503 });
  }

  const admin = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const transactionId = `SUB-${randomBytes(8).toString("hex").toUpperCase()}`;
  const paymentMethod =
    provider === "swychr" ? await resolvePaymentMethod(country.code, body.payment_method, apiKey) : body.payment_method;

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const payerName = body.name?.trim() || profile?.full_name?.trim() || user.email || "Client FlashPay";

  const { error: txError } = await admin.from("transactions").insert({
    owner_id: user.id,
    transaction_id: transactionId,
    country_code: country.code,
    payment_method: paymentMethod,
    amount: chargeAmount,
    currency_code: country.currency,
    processing_fee: 0,
    net_payable: chargeAmount,
    status: "pending",
    environment: "live",
    purpose: "subscription",
    provider,
  });

  if (txError) {
    console.error("Subscription transaction error:", txError);
    return NextResponse.json({ message: "Impossible d'enregistrer la transaction." }, { status: 503 });
  }

  const { error: subscriptionError } = await admin.from("subscription_payments").insert({
    transaction_id: transactionId,
    owner_id: user.id,
    plan: body.plan,
    status: "pending",
  });

  if (subscriptionError) {
    console.error("Subscription record error:", subscriptionError);
    return NextResponse.json({ message: "Impossible d'enregistrer l'abonnement." }, { status: 503 });
  }

  // --- SasPay : paiement direct, le client reste sur FlashPay ---
  if (provider === "saspay") {
    const result = await createSaspayPayment(
      {
        amount: chargeAmount,
        currency: country.currency,
        countryCode: country.code,
        operatorLabel: body.payment_method,
        description: `Abonnement FlashPay ${plan.label}`,
        name: payerName,
        email: process.env.SASPAY_DEFAULT_EMAIL ?? "paiements@flashpay.app",
        phone: body.mobile,
      },
      apiKey ?? ""
    );

    if (!result.ok) {
      await admin.from("transactions").update({ status: "failed" }).eq("transaction_id", transactionId);
      await admin.from("subscription_payments").update({ status: "failed" }).eq("transaction_id", transactionId);
      return NextResponse.json({ message: result.message }, { status: 502 });
    }

    if (result.providerId || result.reference) {
      await admin
        .from("transactions")
        .update({ provider_transaction_id: result.providerId ?? result.reference })
        .eq("transaction_id", transactionId);
    }

    return NextResponse.json({
      ok: true,
      data: {
        transaction_id: transactionId,
        plan: body.plan,
        amount: chargeAmount,
        currency: country.currency,
        payment_link: null,
        message: "Valide le paiement sur ton téléphone avec ton code PIN.",
      },
    });
  }

  // --- Swychr : lien hébergé, le client est redirigé ---
  const paymentRequest = await createSwychrPaymentRequest(
    {
      country_code: country.code,
      name: payerName,
      email: user.email || undefined,
      mobile: body.mobile,
      transaction_id: transactionId,
      amount: chargeAmount,
      payment_method: paymentMethod,
      description: `Abonnement FlashPay ${plan.label}`,
      clientFee: false,
    },
    apiKey
  );

  if (!paymentRequest.ok) {
    await admin.from("transactions").update({ status: "failed" }).eq("transaction_id", transactionId);
    await admin.from("subscription_payments").update({ status: "failed" }).eq("transaction_id", transactionId);
    return NextResponse.json({ message: paymentRequest.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      transaction_id: transactionId,
      plan: body.plan,
      amount: chargeAmount,
      currency: country.currency,
      payment_link: paymentRequest.paymentLink,
    },
  });
}
