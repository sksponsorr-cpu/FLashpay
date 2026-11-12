import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Applications accessibles à l'utilisateur : celles dont il est propriétaire et celles où il est invité.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connexion requise." }, { status: 401 });

  const { data: owned } = await supabase.from("apps").select("id,name,category,website").eq("owner_id", user.id);
  const { data: memberships } = await supabase.from("app_members").select("app_id,role").eq("user_id", user.id);
  const memberRoles = new Map((memberships ?? []).map((m) => [m.app_id, m.role as "viewer" | "manager"]));

  const { data: invited } = memberRoles.size
    ? await supabase.from("apps").select("id,name,category,website").in("id", [...memberRoles.keys()])
    : { data: [] as { id: string; name: string; category: string; website: string | null }[] };

  const ownedList = (owned ?? []).map((a) => ({ ...a, role: "owner" as const }));
  const invitedList = (invited ?? []).map((a) => ({ ...a, role: memberRoles.get(a.id) ?? "viewer" }));
  return NextResponse.json({ apps: [...ownedList, ...invitedList] });
}
