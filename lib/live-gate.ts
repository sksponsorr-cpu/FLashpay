import type { SupabaseClient } from "@supabase/supabase-js";

// Verrou des paiements réels : tous les critères doivent être réunis.
export async function liveGate(admin: SupabaseClient, ownerId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (process.env.SWYCHR_LIVE_PAYMENTS_ENABLED !== "true") {
    return { ok: false, message: "Les paiements réels ne sont pas encore ouverts sur FlashPay." };
  }
  if (!process.env.SWYCHR_API_KEY) {
    return { ok: false, message: "La clé de production n’est pas configurée." };
  }
  const { data, error } = await admin.from("profiles").select("verification_status").eq("id", ownerId).single();
  if (error || data?.verification_status !== "verified") {
    return { ok: false, message: "Le compte doit être vérifié avant d’accepter de vrais paiements." };
  }
  return { ok: true };
}
