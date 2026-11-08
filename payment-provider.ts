import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentProvider = "swychr" | "saspay";
export const PAYMENT_PROVIDERS: PaymentProvider[] = ["swychr", "saspay"];

/** Fournisseur actuellement utilisé pour les nouveaux paiements. Défaut : swychr. */
export async function getActiveProvider(admin: SupabaseClient): Promise<PaymentProvider> {
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "payment_provider")
    .maybeSingle();
  return data?.value === "saspay" ? "saspay" : "swychr";
}
