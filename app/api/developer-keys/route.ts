import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour gérer tes clés." }, { status: 401 });

    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, environment, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ message: "Impossible de charger les clés de test." }, { status: 503 });

    return NextResponse.json({ keys: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Supabase n’est pas disponible." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length > 60) {
    return NextResponse.json({ message: "Donne un nom de 1 à 60 caractères à cette clé." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour créer une clé de test." }, { status: 401 });

    const secret = `fp_test_${randomBytes(32).toString("base64url")}`;
    const hash = createHash("sha256").update(secret).digest("hex");
    const { data, error } = await supabase.rpc("create_test_api_key", {
      p_name: name,
      p_key_prefix: secret.slice(0, 15),
      p_key_hash: hash,
    });
    if (error || !data?.length) {
      return NextResponse.json({ message: "La migration des clés de test n’est pas encore appliquée." }, { status: 503 });
    }

    return NextResponse.json({ key: secret, record: data[0] }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "Impossible de créer la clé de test." }, { status: 503 });
  }
}
