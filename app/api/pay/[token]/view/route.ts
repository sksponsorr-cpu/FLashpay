import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Enregistre une visite de la page de paiement (statistiques de conversion). Sans donnée personnelle.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });
  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const { data: link } = await admin.from("payment_links").select("app_id").eq("token", token).maybeSingle();
  if (!link?.app_id) return NextResponse.json({ ok: false }, { status: 404 });
  await admin.from("payment_link_views").insert({ app_id: link.app_id, link_token: token });
  return NextResponse.json({ ok: true });
}
