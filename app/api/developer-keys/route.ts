import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const liveKeysEnabled = () => process.env.LIVE_API_KEYS_ENABLED === "true";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour gérer tes clés." }, { status: 401 });
    const appId = new URL(request.url).searchParams.get("app");
    if (!appId) return NextResponse.json({ message: "Choisis une application." }, { status: 400 });
    const { data: app } = await supabase.from("apps").select("id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
    if (!app) return NextResponse.json({ message: "Application introuvable." }, { status: 404 });
    const [{ data, error }, { data: profile }] = await Promise.all([
      supabase.from("api_keys").select("id, name, key_prefix, environment, created_at, last_used_at, revoked_at").eq("app_id", appId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("verification_status").eq("id", user.id).maybeSingle(),
    ]);
    if (error) return NextResponse.json({ message: "Impossible de charger les clés de cette application." }, { status: 503 });
    return NextResponse.json({ keys: data, live: { enabled: liveKeysEnabled(), verified: profile?.verification_status === "verified" } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "Supabase n’est pas disponible." }, { status: 503 }); }
}

export async function POST(request: Request) {
  let body: { name?: string; environment?: string; app_id?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ message: "Requête invalide." }, { status: 400 }); }
  const name = body.name?.trim();
  if (!name || name.length > 60) return NextResponse.json({ message: "Donne un nom de 1 à 60 caractères à cette clé." }, { status: 400 });
  if (!body.app_id) return NextResponse.json({ message: "Choisis une application." }, { status: 400 });
  const environment = body.environment === "live" ? "live" : "test";
  if (environment === "live" && !liveKeysEnabled()) return NextResponse.json({ message: "Les clés live ne sont pas encore activées sur FlashPay." }, { status: 403 });
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour créer une clé." }, { status: 401 });
    const { data: app } = await supabase.from("apps").select("id").eq("id", body.app_id).eq("owner_id", user.id).maybeSingle();
    if (!app) return NextResponse.json({ message: "Application introuvable." }, { status: 404 });
    const secret = `${environment === "live" ? "fp_live_" : "fp_test_"}${randomBytes(32).toString("base64url")}`;
    const hash = createHash("sha256").update(secret).digest("hex");
    const { data, error } = await supabase.rpc("create_api_key_for_app", { p_app_id: body.app_id, p_name: name, p_key_prefix: secret.slice(0, 15), p_key_hash: hash, p_environment: environment });
    if (error?.message?.includes("ACCOUNT_NOT_VERIFIED")) return NextResponse.json({ message: "Ton compte doit être vérifié avant de créer une clé live." }, { status: 403 });
    if (error || !data?.length) return NextResponse.json({ message: "Impossible de créer la clé. Vérifie que les migrations sont appliquées." }, { status: 503 });
    return NextResponse.json({ key: secret, record: data[0] }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "Impossible de créer la clé." }, { status: 503 }); }
}
