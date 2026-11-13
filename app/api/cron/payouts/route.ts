import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runDuePayouts } from "@/lib/payout-runner";
import { reconcileSaspayTransaction } from "@/lib/saspay-status";

// Filet de sécurité : traite les retraits restés en attente (ex. erreur réseau au moment de la demande).
// Vercel Cron envoie : Authorization: Bearer $CRON_SECRET.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Non autorisé." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Configuration incomplète." }, { status: 503 });

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  // Paiements directs restés « en attente » plus de 10 minutes : on demande à SasPay leur statut réel,
  // puis on applique le résultat (succès réglé, échec ou annulation fermés, abandon après 30 minutes).
  const apiKey = process.env.SASPAY_API_KEY ?? "";
  const staleBefore = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: stale } = await admin
    .from("transactions")
    .select("transaction_id, amount, currency_code, provider_transaction_id, status, created_at")
    .eq("provider", "saspay")
    .eq("status", "pending")
    .lt("created_at", staleBefore)
    .order("created_at", { ascending: true })
    .limit(50);
  let reconciled = 0;
  if (apiKey) {
    for (const tx of stale ?? []) {
      const outcome = await reconcileSaspayTransaction(admin, { ...tx, provider_transaction_id: tx.provider_transaction_id ?? null }, apiKey);
      if (outcome !== "pending" && outcome !== "unknown") reconciled += 1;
    }
  }

  const summary = await runDuePayouts(admin, 20);
  if (summary.error) return NextResponse.json({ message: summary.error }, { status: 503 });
  return NextResponse.json({ ...summary, paiements_reconciliés: reconciled });
}
