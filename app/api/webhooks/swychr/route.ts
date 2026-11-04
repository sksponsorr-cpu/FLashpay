import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { notifyMerchant } from "@/lib/merchant-webhook";

type PaymentLinkEvent = {
  event?: string;
  data?: {
    data?: {
      attributes?: {
        transaction_id?: string;
        status?: string;
        amount?: string | number;
        currency_code?: string;
        swychr_reference?: string;
      };
    };
  };
};

export async function POST(request: Request) {
  const secret = process.env.SWYCHR_WEBHOOK_SECRET;
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";
  const signature = request.headers.get("x-webhook-signature-v2") ?? "";

  if (!secret) {
    return NextResponse.json({ message: "Le secret webhook n’est pas configuré." }, { status: 503 });
  }

  const timestampSeconds = Number(timestamp);
  const ageSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (!Number.isFinite(timestampSeconds) || ageSeconds > 300 || !/^[a-f0-9]{64}$/i.test(signature)) {
    return NextResponse.json({ message: "Signature webhook invalide ou expirée." }, { status: 401 });
  }

  // Le corps brut doit être utilisé tel quel : la signature porte sur ces octets exacts.
  const rawBody = await request.text();
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const received = Buffer.from(signature, "hex");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ message: "Signature webhook invalide." }, { status: 401 });
  }

  let event: PaymentLinkEvent;
  try {
    event = JSON.parse(rawBody) as PaymentLinkEvent;
  } catch {
    return NextResponse.json({ message: "Corps webhook JSON invalide." }, { status: 400 });
  }

  const attributes = event.data?.data?.attributes;
  const amount = Number(attributes?.amount);
  if (
    event.event !== "payment_link_status_updated" ||
    !attributes?.transaction_id ||
    !attributes.status ||
    !Number.isFinite(amount)
  ) {
    return NextResponse.json({ message: "Événement non reconnu." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ message: "La base n’est pas configurée pour les webhooks." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });

  const { data, error } = await admin.rpc("apply_swychr_payment_event", {
    p_transaction_id: attributes.transaction_id,
    p_provider_status: String(attributes.status),
    p_amount: amount,
    p_currency_code: attributes.currency_code ?? "",
    p_swychr_reference: attributes.swychr_reference ?? null,
  });

  // En cas d'erreur de la base, on répond 503 : le prestataire renverra la notification plus tard.
  if (error) {
    return NextResponse.json({ message: "Notification reçue, mais enregistrement impossible. Nouvelle tentative attendue." }, { status: 503 });
  }

  // Notification au SaaS du développeur, une seule fois, au moment où le paiement devient « réussi ».
  // Un échec d'envoi n'empêche pas de répondre 200 au prestataire.
  if (data === "SUCCESSFUL") {
    // Abonnement : plan activé automatiquement. Collecte : portefeuille crédité, net de la commission.
    const { data: purpose, error: settleError } = await admin.rpc("settle_successful_transaction", {
      p_transaction_id: attributes.transaction_id,
    });
    if (!settleError && purpose === "collection") {
      await notifyMerchant(admin, attributes.transaction_id);
    }
  }

  return NextResponse.json({ received: true, result: data }, { status: 200 });
}
