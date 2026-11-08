import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { verifySaspaySignature } from "@/lib/saspay";

// Événements SasPay -> statut attendu par la base FlashPay.
const STATUS_BY_EVENT: Record<string, string> = {
  "transaction.success": "successful",
  "transaction.failed": "failed",
  "transaction.cancelled": "cancelled",
};

export async function POST(request: Request) {
  const secret = process.env.SASPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ message: "Secret webhook SasPay non configuré." }, { status: 503 });

  // Corps brut : la signature porte sur les octets exacts reçus.
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? "";
  const timestamp = request.headers.get("x-webhook-timestamp") ?? "";

  if (!verifySaspaySignature(rawBody, signature, timestamp, secret)) {
    return NextResponse.json({ message: "Signature invalide ou expirée." }, { status: 401 });
  }

  let payload: { event?: string; data?: Record<string, unknown> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: "JSON invalide." }, { status: 400 });
  }

  const event = request.headers.get("x-webhook-event") ?? payload.event ?? "";
  const status = STATUS_BY_EVENT[event];
  if (!status) return NextResponse.json({ received: true, ignored: true });

  const data = payload.data ?? {};
  const providerIds = [data["id"], data["reference"]].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  if (providerIds.length === 0) return NextResponse.json({ message: "Identifiant manquant." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Configuration Supabase manquante." }, { status: 503 });

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: tx } = await admin
    .from("transactions")
    .select("transaction_id, currency_code")
    .eq("provider", "saspay")
    .in("provider_transaction_id", providerIds)
    .maybeSingle();

  if (!tx) return NextResponse.json({ message: "Transaction inconnue." }, { status: 404 });

  // charged = ce que le client a réellement débité (frais inclus selon fee_charge_mode).
  const charged = Number(data["charged"] ?? data["amount"]);
  const { data: result, error } = await admin.rpc("apply_swychr_payment_event", {
    p_transaction_id: tx.transaction_id,
    p_provider_status: status,
    p_amount: charged,
    p_currency_code: typeof data["currency"] === "string" ? data["currency"] : tx.currency_code,
    p_swychr_reference: typeof data["reference"] === "string" ? data["reference"] : null,
  });

  if (error) {
    console.error("[saspay webhook] rpc", error);
    return NextResponse.json({ message: "Erreur d'enregistrement." }, { status: 503 });
  }
  if (result === "UNKNOWN_TRANSACTION" || result === "AMOUNT_MISMATCH") {
    console.error("[saspay webhook] refusé", { transaction_id: tx.transaction_id, result, charged });
    return NextResponse.json({ message: "Transaction non validée.", result }, { status: 400 });
  }

  if (status === "successful" && (result === "SUCCESSFUL" || result === "ALREADY_PROCESSED")) {
    const { error: settleError } = await admin.rpc("settle_successful_transaction", {
      p_transaction_id: tx.transaction_id,
    });
    if (settleError) console.error("[saspay webhook] settlement", settleError);
  }

  return NextResponse.json({ received: true, result });
}
