import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Enregistre une visite de la page de paiement.
export async function POST(request: Request) {
try {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  return NextResponse.json(
    { ok: false, message: "Configuration serveur manquante." },
    { status: 503 }
  );
}

const body = await request.json().catch(() => ({}));
const requestUrl = new URL(request.url);

const token = body.token || requestUrl.searchParams.get("token");

if (!token || typeof token !== "string") {
  return NextResponse.json(
    { ok: false, message: "Token manquant." },
    { status: 400 }
  );
}

const admin = createSupabaseClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const { data: link, error } = await admin
  .from("payment_links")
  .select("app_id")
  .eq("token", token)
  .maybeSingle();

if (error || !link?.app_id) {
  return NextResponse.json(
    { ok: false },
    { status: 404 }
  );
}

const { error: insertError } = await admin
  .from("payment_link_views")
  .insert({
    app_id: link.app_id,
    link_token: token,
  });

if (insertError) {
  return NextResponse.json(
    { ok: false },
    { status: 500 }
  );
}

return NextResponse.json({ ok: true });

} catch {
return NextResponse.json(
{ ok: false, message: "Erreur interne du serveur." },
{ status: 500 }
);
}
}
