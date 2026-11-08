import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Statut d'un abonnement en attente : lu par l'interface pendant la validation sur téléphone.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "Connecte-toi." }, { status: 401 });
  }

  const transactionId = new URL(request.url).searchParams.get("tx")?.trim() ?? "";
  if (!transactionId) {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ message: "Service indisponible." }, { status: 503 });
  }

  const admin = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: tx } = await admin
    .from("transactions")
    .select("status")
    .eq("transaction_id", transactionId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!tx) {
    return NextResponse.json({ message: "Transaction introuvable." }, { status: 404 });
  }

  return NextResponse.json({ status: tx.status });
}
