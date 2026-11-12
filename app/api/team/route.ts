import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Équipe d'une application. Seul le propriétaire de l'application gère ses membres.
async function ownedApp(supabase: Awaited<ReturnType<typeof createClient>>, appId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Connexion requise." }, { status: 401 }) };
  const { data: app } = await supabase.from("apps").select("id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
  if (!app) return { error: NextResponse.json({ message: "Application introuvable." }, { status: 404 }) };
  return { user };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const appId = new URL(request.url).searchParams.get("app_id") ?? "";
  const check = await ownedApp(supabase, appId);
  if ("error" in check) return check.error;
  const { data, error } = await supabase.from("app_members").select("id,email,role,created_at").eq("app_id", appId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ message: "Lecture impossible." }, { status: 500 });
  return NextResponse.json({ members: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const body = (await request.json().catch(() => null)) as { app_id?: string; email?: string; role?: string } | null;
  const email = (body?.email ?? "").trim().toLowerCase();
  const role = body?.role === "manager" ? "manager" : "viewer";
  if (!body?.app_id || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ message: "E-mail invalide." }, { status: 400 });
  const check = await ownedApp(supabase, body.app_id);
  if ("error" in check) return check.error;
  const { error } = await supabase.from("app_members").upsert(
    { app_id: body.app_id, email, role, invited_by: check.user.id },
    { onConflict: "app_id,email" }
  );
  if (error) return NextResponse.json({ message: "Invitation impossible." }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const appId = url.searchParams.get("app_id") ?? "";
  const memberId = url.searchParams.get("id") ?? "";
  const check = await ownedApp(supabase, appId);
  if ("error" in check) return check.error;
  const { error } = await supabase.from("app_members").delete().eq("id", memberId).eq("app_id", appId);
  if (error) return NextResponse.json({ message: "Suppression impossible." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
