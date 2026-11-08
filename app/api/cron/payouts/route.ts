import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runDuePayouts } from "@/lib/payout-runner";

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

  const summary = await runDuePayouts(admin, 20);
  if (summary.error) return NextResponse.json({ message: summary.error }, { status: 503 });
  return NextResponse.json(summary);
}
