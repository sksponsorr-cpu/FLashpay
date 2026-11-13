import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Enregistre (POST) ou supprime (DELETE) l'appareil de l'utilisateur connecté.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ message: "Abonnement invalide." }, { status: 400 });
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    { owner_id: user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ message: "Enregistrement impossible." }, { status: 503 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) await supabase.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("owner_id", user.id);
  return NextResponse.json({ ok: true });
}
