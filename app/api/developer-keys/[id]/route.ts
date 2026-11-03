import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ message: "Identifiant de clé invalide." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour révoquer une clé." }, { status: 401 });

    const { data, error } = await supabase.rpc("revoke_api_key", { p_key_id: id });
    if (error) return NextResponse.json({ message: "Impossible de révoquer cette clé." }, { status: 503 });
    if (!data) return NextResponse.json({ message: "Cette clé est introuvable ou déjà révoquée." }, { status: 404 });

    return NextResponse.json({ revoked: true });
  } catch {
    return NextResponse.json({ message: "Supabase n’est pas disponible." }, { status: 503 });
  }
}
