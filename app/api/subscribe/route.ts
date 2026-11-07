import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";
import { createSwychrPaymentRequest, localMobile } from "@/lib/swychr";
import { createClient } from "@/lib/supabase/server";

// Achat d'abonnement par le client connecté. Le paiement passe par Swychr comme une collecte ;
// le webhook active le plan automatiquement quand le paiement est confirmé.

const PLANS: Record<string, { amount: number; label: string }> = {
  basic: { amount: 10000, label: "Basic" },
  premium: { amount: 20000, label: "Premium" },
};

type SubscribeBody = {
  plan?: string;
  country_code?: string;
  mobile?: string;
  payment_method?: string;
  name?: string;
};

export async function POST(request: Request) {
  if (process.env.SWYCHR_LIVE_PAYMENTS_ENABLED !== "true") {
    return NextResponse.json({ message: "Les paiements d’abonnement ne sont pas encore disponibles." }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connecte-toi pour t’abonner." }, { status: 401 });

  let body: SubscribeBody;
  try {
    body = (await request.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ message: "Corps JSON invalide." }, { status: 400 });
  }

  const plan = body.plan ? PLANS[body.plan] : undefined;
  if (!plan) return NextResponse.json({ message: "Choisis le plan Basic ou Premium." }, { status: 400 });

  const country = getSupportedCountry(body.country_code?.trim().toUpperCase());
  if (!country || (country.currency !== "XAF" && country.currency !== "XOF")) {
    return NextResponse.json({ message: "Les abonnements se paient en FCFA." }, { status: 400 });
  }
  if (!body.mobile?.trim() || !body.payment_method?.trim()) {
    return NextResponse.json({ message: "Le numéro mobile et l’opérateur sont requis." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const swychrKey = process.env.SWYCHR_API_KEY;
  if (!url || !serviceKey || !swychrKey) {
    return NextResponse.json({ message: "Le paiement n’est pas configuré." }, { status: 503 });
  }

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });

  const transactionId = `SUB-${randomBytes(8).toString("hex").toUpperCase()}`;
  const paymentMethod = body.payment_method.trim().toUpperCase();

  // Transaction d'abonnement : frais FlashPay nuls, le montant complet va au plan.
  const { error: txError } = await admin.from("transactions").insert({
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
  if (txError) return NextResponse.json({ message: "Impossible de créer le paiement." }, { status: 503 });

  const { error: subError } = await admin.from("subscription_payments").insert({
    transaction_id: transactionId,
    owner_id: user.id,
    plan: body.plan,
  });
  if (subError) return NextResponse.json({ message: "Impossible de créer l’abonnement." }, { status: 503 });

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const payerName = body.name?.trim() || profile?.full_name?.trim() || user.email || "Client FlashPay";

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
    swychrKey,
  );

  if (!paymentRequest.ok) {
    return NextResponse.json({ message: paymentRequest.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    data: { transaction_id: transactionId, plan: body.plan, amount: plan.amount, payment_link: paymentRequest.paymentLink },
  });
}
