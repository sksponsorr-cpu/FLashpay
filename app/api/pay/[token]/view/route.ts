import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppAccess } from "@/lib/app-access";

// Statistiques de conversion des 30 derniers jours : visites des liens, paiements réussis, taux.
export async function GET(request: Request) {
  const supabase = await createClient();
  const appId = new URL(request.url).searchParams.get("app") ?? "";
  if (!appId) return NextResponse.json({ message: "Choisis une application." }, { status: 400 });
  const access = await getAppAccess(supabase, appId);
  if (access.role === "none") return NextResponse.json({ message: "Application introuvable." }, { status: 404 });

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [views, paid] = await Promise.all([
    supabase.from("payment_link_views").select("id", { count: "exact", head: true }).eq("app_id", appId).gte("created_at", since),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("app_id", appId).eq("status", "successful").gte("created_at", since),
  ]);
  const visits = views.count ?? 0;
  const payments = paid.count ?? 0;
  return NextResponse.json({
    days: 30,
    visits,
    payments,
    conversion_rate: visits > 0 ? Math.round((payments / visits) * 1000) / 10 : null,
  });
}
