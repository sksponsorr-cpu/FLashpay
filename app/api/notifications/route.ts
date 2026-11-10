import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, read_at, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ message: "Notifications indisponibles." }, { status: 503 });
  const rows = data ?? [];
  return NextResponse.json(
    { notifications: rows, unread: rows.filter((n) => !n.read_at).length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "read_all") return NextResponse.json({ message: "Action inconnue." }, { status: 400 });
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", user.id)
    .is("read_at", null);
  if (error) return NextResponse.json({ message: "Mise à jour impossible." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
