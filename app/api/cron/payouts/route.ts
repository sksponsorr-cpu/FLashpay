import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendSaspayPayout } from "@/lib/saspay-payout";

// Appelé par Vercel Cron (voir vercel.json). Vercel envoie : Authorization: Bearer $CRON_SECRET.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.SASPAY_API_KEY ?? "";
  if (!url || !serviceKey || !apiKey) {
    return NextResponse.json({ message: "Configuration incomplète." }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // Réclame les retraits échus : le solde est débité au moment de la réclamation.
  const { data: due, error } = await admin.rpc("claim_due_withdrawals", { p_limit: 20 });
  if (error) {
    console.error("[payouts] claim", error);
    return NextResponse.json({ message: "Impossible de lire les retraits." }, { status: 503 });
  }

  const results: { id: string; outcome: string }[] = [];

  for (const row of due ?? []) {
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

  return NextResponse.json({ processed: results.length, results });
}
