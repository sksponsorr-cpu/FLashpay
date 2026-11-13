// FLASH PAY — SASPAY — lecture du statut réel d'un paiement et relance.
// Serveur uniquement. Utilisé avant de fermer en échec un paiement direct resté en attente.
import type { SupabaseClient } from "@supabase/supabase-js";

const BASE_URL = "https://api.saspay.me/api/v1";

export type SaspayState = "successful" | "failed" | "cancelled" | "pending";

/** Traduit le statut SasPay (transaction_status) en statut FlashPay. Inconnu = encore en attente. */
export function mapSaspayTransactionStatus(value: unknown): SaspayState {
  const v = String(value ?? "").toUpperCase();
  if (v === "SUCCESS" || v === "SUCCESSFUL" || v === "PAID") return "successful";
  if (v === "FAILED" || v === "FAILURE" || v === "DECLINED" || v === "EXPIRED") return "failed";
  if (v === "CANCELLED" || v === "CANCELED") return "cancelled";
  return "pending";
}

export type StatusResult =
  | { ok: true; state: SaspayState; raw: Record<string, unknown> }
  | { ok: false; message: string };

/** GET /checkout-sessions/{id}/status/ — interroge SasPay sur l'état réel du paiement. */
export async function fetchSaspayCheckoutStatus(sessionId: string, apiKey: string): Promise<StatusResult> {
  if (!apiKey || !sessionId) return { ok: false, message: "Identifiant ou clé SasPay manquant." };
  try {
    const res = await fetch(`${BASE_URL}/checkout-sessions/${encodeURIComponent(sessionId)}/status/`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      json = {};
    }
    if (!res.ok) return { ok: false, message: `SasPay ${res.status}` };
    return { ok: true, state: mapSaspayTransactionStatus(json["transaction_status"]), raw: json };
  } catch {
    return { ok: false, message: "SasPay ne répond pas." };
  }
}

/** POST /payments/{id}/retry/ — relance un paiement avec d'autres réseaux (ex. ["moov_bj"]). */
export async function retrySaspayPayment(paymentId: string, methods: string[], apiKey: string) {
  if (!apiKey || !paymentId || methods.length === 0) return { ok: false as const, message: "Paramètres manquants." };
  try {
    const res = await fetch(`${BASE_URL}/payments/${encodeURIComponent(paymentId)}/retry/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ methods }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false as const, message: `SasPay ${res.status} : relance refusée.` };
    return { ok: true as const, id: String(json["id"] ?? ""), checkoutUrl: String(json["checkout_url"] ?? "") };
  } catch {
    return { ok: false as const, message: "SasPay ne répond pas." };
  }
}

export type PendingTx = {
  transaction_id: string;
  amount: number;
  currency_code: string;
  provider_transaction_id: string | null;
  status: string;
  created_at: string;
};

/**
 * Réconcilie une transaction SasPay en attente avec le statut réel chez SasPay.
 * - succès : enregistré et réglé comme le webhook le fait ;
 * - échec / annulation : fermée en échec ;
 * - toujours en attente : laissée telle quelle, sauf au-delà de `giveUpAfterMinutes` (fermée en échec).
 * Retourne le statut final, ou "unknown" si SasPay est injoignable et que la transaction n'a pas expiré.
 */
export async function reconcileSaspayTransaction(
  admin: SupabaseClient,
  tx: PendingTx,
  apiKey: string,
  giveUpAfterMinutes = 30
): Promise<"successful" | "failed" | "cancelled" | "pending" | "unknown"> {
  const ageMinutes = (Date.now() - new Date(tx.created_at).getTime()) / 60000;
  const remote = tx.provider_transaction_id
    ? await fetchSaspayCheckoutStatus(tx.provider_transaction_id, apiKey)
    : ({ ok: false, message: "Pas d'identifiant fournisseur" } as const);

  let next: SaspayState | "unknown" = "unknown";
  if (remote.ok) next = remote.state;

  if (next === "pending" && ageMinutes >= giveUpAfterMinutes) next = "failed";
  if (next === "unknown") {
    if (ageMinutes >= giveUpAfterMinutes) next = "failed";
    else return "unknown";
  }
  if (next === "pending") return "pending";

  if (next === "successful") {
    const { data: result, error } = await admin.rpc("apply_swychr_payment_event", {
      p_transaction_id: tx.transaction_id,
      p_provider_status: "successful",
      p_amount: tx.amount,
      p_currency_code: tx.currency_code,
      p_swychr_reference: null,
    });
    if (error) return "unknown";
    if (result === "SUCCESSFUL" || result === "ALREADY_PROCESSED") {
      const { error: settleError } = await admin.rpc("settle_successful_transaction", { p_transaction_id: tx.transaction_id });
      if (settleError) console.error("[saspay status] règlement", settleError);
    }
    return "successful";
  }

  // Échec ou annulation : on ferme la transaction côté FlashPay.
  await admin.from("transactions").update({ status: next === "cancelled" ? "cancelled" : "failed" }).eq("transaction_id", tx.transaction_id);
  return next;
}
