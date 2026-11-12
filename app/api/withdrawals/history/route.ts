import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Historique des demandes de retrait du marchand, avec un statut lisible.
// Examen : pas encore envoyé au prestataire ou en attente de décision.
// En cours de traitement : envoyé au prestataire, pas encore validé par l'administrateur.
// Payé / Refusé : décision finale de l'administrateur.
// Statuts vus par le marchand (définis par le processus, pas par le prestataire) :
// En examen           : demande faite, pas encore envoyée au prestataire.
// En cours de traitement : envoyée au prestataire (y compris si le prestataire rejette : l'administrateur tranche).
// Payé                : l'administrateur a marqué le retrait payé.
// Refusé              : l'administrateur a refusé le retrait (et seulement lui).
function statusFor(row: { status: string; provider_payout_id: string | null }) {
  if (row.status === "paid") return { key: "paid", label: "Payé" };
  if (row.status === "rejected") return { key: "refused", label: "Refusé" };
  // « failed » = solde insuffisant au moment de l'envoi : rien n'est parti, c'est à l'administrateur de trancher.
  if (row.status === "failed") return { key: "review", label: "En examen" };
  if (row.status === "processing" || row.provider_payout_id) {
    return { key: "processing", label: "En cours de traitement" };
  }
  return { key: "review", label: "En examen" };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Configuration incomplète." }, { status: 503 });
  const admin = createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await admin
    .from("withdrawal_requests")
    .select("id, currency_code, requested_amount, payout_amount, fee_amount, destination_name, destination_mobile, destination_operator, status, last_error, provider_payout_id, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ message: "Lecture impossible." }, { status: 500 });

  const requests = (data ?? []).map((r) => {
    const s = statusFor(r);
    return {
      id: r.id,
      currency_code: r.currency_code,
      requested_amount: r.requested_amount,
      payout_amount: r.payout_amount,
      fee_amount: r.fee_amount,
      destination_name: r.destination_name,
      destination_mobile: r.destination_mobile,
      destination_operator: r.destination_operator,
      created_at: r.created_at,
      status_key: s.key,
      status_label: s.label,
      // Motif affiché : seulement si le retrait est refusé.
      reason: s.key === "refused" ? (r.last_error ?? "Le retrait n’a pas été accepté.") : null,
    };
  });
  return NextResponse.json({ requests });
}
