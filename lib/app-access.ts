// Règle d'accès unique à une application, vérifiée côté serveur.
// owner   : propriétaire du compte (tous les droits)
// manager : membre invité en gestion (peut agir)
// viewer  : membre invité en lecture seule (voit, ne modifie rien)
// none    : aucun accès
import type { SupabaseClient } from "@supabase/supabase-js";

export type AppRole = "owner" | "manager" | "viewer" | "none";

export async function getAppAccess(supabase: SupabaseClient, appId: string): Promise<{ role: AppRole; userId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !appId) return { role: "none", userId: null };

  const { data: app } = await supabase.from("apps").select("id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
  if (app) return { role: "owner", userId: user.id };

  const { data: member } = await supabase.from("app_members").select("role").eq("app_id", appId).eq("user_id", user.id).maybeSingle();
  if (member?.role === "manager") return { role: "manager", userId: user.id };
  if (member?.role === "viewer") return { role: "viewer", userId: user.id };
  return { role: "none", userId: user.id };
}

/** Peut modifier l'application (propriétaire ou gestionnaire). */
export function canAct(role: AppRole): boolean {
  return role === "owner" || role === "manager";
}

/**
 * Lecteur serveur (clé de service) pour les lectures autorisées par la règle d'accès.
 * À n'utiliser qu'APRÈS getAppAccess : c'est la règle qui décide, pas la base.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function serviceReader(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
