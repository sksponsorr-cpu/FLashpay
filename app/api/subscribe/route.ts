import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import {
  createSwychrPaymentRequest,
  localMobile,
  swychrMethod,
} from "@/lib/swychr";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json(
      { message: "Connecte-toi pour t’abonner." },
      { status: 401 }
    );
  }

  let body: SubscribeBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Données invalides." },
      { status: 400 }
    );
  }

  const plan = body.plan ? PLANS[body.plan] : undefined;

  if (!plan) {
    return NextResponse.json(
      { message: "Plan Basic ou Premium invalide." },
      { status: 400 }
    );
  }

  const countryCode = body.country_code?.trim().toUpperCase();
  const country = getSupportedCountry(countryCode);

  if (!country || !["XAF", "XOF"].includes(country.currency)) {
    return NextResponse.json(
      { message: "Les abonnements sont disponibles uniquement en FCFA." },
      { status: 400 }
    );
  }

  if (!body.mobile?.trim() || !body.payment_method?.trim()) {
    return NextResponse.json(
      { message: "Numéro et opérateur obligatoires." },
      { status: 400 }
    );
  }

  const apiKey = process.env.SWYCHR_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { message: "Configuration du paiement incomplète." },
      { status: 503 }
    );
  }

  const admin = createSupabaseClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const transactionId =
    `SUB-${randomBytes(8).toString("hex").toUpperCase()}`;

  const paymentMethod = swychrMethod(body.payment_method);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const payerName =
    body.name?.trim() ||
    profile?.full_name?.trim() ||
    user.email ||
    "Client FlashPay";

  const { error: txError } = await admin
    .from("transactions")
    .insert({
      owner_id: user.id,
      transaction_id: transactionId,
      country_code: country.code,
      payment_method: paymentMethod,
      amount: plan.amount,
      currency_code: country.currency,
      processing_fee: 0,
      net_payable: plan.amount,
      status: "pending",
      environment: "live",
      purpose: "subscription",
    });

  if (txError) {
    console.error("Subscription transaction error:", txError);

    return NextResponse.json(
      { message: "Impossible d'enregistrer la transaction." },
      { status: 503 }
    );
  }

  const { error: subscriptionError } = await admin
    .from("subscription_payments")
    .insert({
      transaction_id: transactionId,
      owner_id: user.id,
      plan: body.plan,
      status: "pending",
    });

  if (subscriptionError) {
    console.error("Subscription record error:", subscriptionError);

    return NextResponse.json(
      { message: "Impossible d'enregistrer l'abonnement." },
      { status: 503 }
    );
  }

  const paymentRequest = await createSwychrPaymentRequest(
    {
      country_code: country.code,
      name: payerName,
      email: user.email || undefined,
      mobile: localMobile(country.code, body.mobile),
      transaction_id: transactionId,
      amount: plan.amount,
      payment_method: paymentMethod,
      description: `Abonnement FlashPay ${plan.label}`,
      pass_digital_charge: true,
    },
    apiKey
  );

  if (!paymentRequest.ok || !paymentRequest.paymentLink) {
    await admin
      .from("transactions")
      .update({ status: "failed" })
      .eq("transaction_id", transactionId);

    await admin
      .from("subscription_payments")
      .update({ status: "failed" })
      .eq("transaction_id", transactionId);

    return NextResponse.json(
      {
        message:
          paymentRequest.ok
            ? "Le prestataire n'a pas retourné de lien de paiement."
            : paymentRequest.message,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      transaction_id: transactionId,
      plan: body.plan,
      amount: plan.amount,
      currency: country.currency,
      payment_link: paymentRequest.paymentLink,
    },
  });
}
