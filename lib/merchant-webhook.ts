import { createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Envoie une notification signée au SaaS du développeur, avec 3 tentatives.
// Signature : HMAC-SHA256 de "<timestamp>.<corps>", avec le secret du développeur.
// En-têtes : X-FlashPay-Timestamp et X-FlashPay-Signature.
export async function notifyMerchant(admin: SupabaseClient, transactionId: string): Promise<boolean> {
  const { data: tx } = await admin
    .from("transactions")
    .select("owner_id, transaction_id, status, amount, currency_code, country_code, payment_method, environment")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (!tx) return false;

  const { data: hook } = await admin
    .from("merchant_webhooks")
    .select("url, secret")
    .eq("owner_id", tx.owner_id)
    .maybeSingle();
  if (!hook) return false;

  const body = JSON.stringify({
    event: "transaction.successful",
    created_at: new Date().toISOString(),
    data: {
      transaction_id: tx.transaction_id,
      status: tx.status,
      amount: Number(tx.amount),
      currency_code: tx.currency_code,
      country_code: tx.country_code,
      payment_method: tx.payment_method,
      environment: tx.environment,
    },
  });

  const delays = [0, 2000, 6000];
  for (const delay of delays) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", hook.secret).update(`${timestamp}.${body}`).digest("hex");

    try {
      const response = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-FlashPay-Timestamp": timestamp,
          "X-FlashPay-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (response.ok) return true;
    } catch {
      // Nouvelle tentative au tour suivant.
    }
  }
  return false;
}
