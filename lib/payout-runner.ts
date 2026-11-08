// FLASH PAY — traitement des retraits échus : réclamation, virement SasPay, enregistrement du résultat.
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSaspayPayout } from "@/lib/saspay-payout";

type DueRow = {
  id: string;
  currency_code: string;
  payout_amount: number | string;
  destination_country: string | null;
  destination_operator: string | null;
  destination_mobile: string | null;
  destination_name: string | null;
};

export type PayoutRunResult = {
  processed: number;
  results: { id: string; outcome: string }[];
  error?: string;
};

/** Traite jusqu'à `limit` retraits échus. Appelable depuis le cron ou juste après une demande. */
export async function runDuePayouts(admin: SupabaseClient, limit = 20): Promise<PayoutRunResult> {
  const apiKey = process.env.SASPAY_API_KEY ?? "";
  if (!apiKey) return { processed: 0, results: [], error: "Clé SasPay manquante." };

  const { data, error } = await admin.rpc("claim_due_withdrawals", { p_limit: limit });
  if (error) {
    console.error("[payouts] claim", error);
    return { processed: 0, results: [], error: "Impossible de lire les retraits." };
  }

  const results: { id: string; outcome: string }[] = [];

  for (const row of (data ?? []) as DueRow[]) {
    const sent = await sendSaspayPayout(
      {
        amount: Number(row.payout_amount),
        currency: row.currency_code,
        countryCode: row.destination_country ?? "",
        operator: row.destination_operator ?? "",
        phone: String(row.destination_mobile ?? "").replace(/\D/g, ""),
        name: row.destination_name ?? "",
        description: `Retrait FlashPay ${row.id}`,
        reference: row.id,
      },
      apiKey
    );

    const { data: outcome } = await admin.rpc("complete_withdrawal", {
      p_id: row.id,
      p_ok: sent.ok,
      p_provider_payout_id: sent.ok ? sent.providerId : null,
      p_error: sent.ok ? null : sent.message,
    });

    results.push({ id: row.id, outcome: String(outcome ?? "UNKNOWN") });
  }

  return { processed: results.length, results };
}
