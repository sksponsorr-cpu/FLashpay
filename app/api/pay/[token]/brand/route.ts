import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Identité visuelle publique de l'application d'un lien : nom, logo, couleur. Aucune donnée sensible.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ brand: null }, { headers: { "Cache-Control": "no-store" } });

  const admin = createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
  const { data: link } = await admin.from("payment_links").select("app_id").eq("token", token).maybeSingle();
  if (!link?.app_id) return NextResponse.json({ brand: null }, { headers: { "Cache-Control": "no-store" } });

  const { data: app } = await admin.from("apps").select("name, brand_logo_url, brand_cover_url, brand_color, brand_template, brand_animation, brand_logo_position").eq("id", link.app_id).maybeSingle();
  return NextResponse.json(
    { brand: app ? { name: app.name, logo_url: app.brand_logo_url, cover_url: app.brand_cover_url, color: app.brand_color, template: app.brand_template, animation: app.brand_animation, logo_position: app.brand_logo_position } : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
