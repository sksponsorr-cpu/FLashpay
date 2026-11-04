import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

// Lecture : indique si une adresse est enregistrée (le secret n'est jamais renvoyé).
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour gérer les notifications." }, { status: 401 });

  const admin = adminClient();
  if (!admin) return NextResponse.json({ message: "Le service de notifications n’est pas configuré." }, { status: 503 });

  const { data, error } = await admin
    .from("merchant_webhooks")
    .select("url, updated_at")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ message: "Impossible de charger les notifications." }, { status: 503 });

  return NextResponse.json({ configured: Boolean(data), url: data?.url ?? null }, { headers: { "Cache-Control": "no-store" } });
}

// Enregistrement ou changement d'adresse : génère un nouveau secret, renvoyé une seule fois.
export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const url = body.url?.trim() ?? "";
  if (!/^https:\/\/[^\s]+$/.test(url) || url.length > 500) {
    return NextResponse.json({ message: "L’adresse doit commencer par https:// (par exemple https://monsaas.com/webhooks/flashpay)." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour gérer les notifications." }, { status: 401 });

  const admin = adminClient();
  if (!admin) return NextResponse.json({ message: "Le service de notifications n’est pas configuré." }, { status: 503 });

  const secret = randomBytes(32).toString("hex");
  const { error } = await admin
    .from("merchant_webhooks")
    .upsert({ owner_id: user.id, url, secret, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
  if (error) return NextResponse.json({ message: "Impossible d’enregistrer l’adresse." }, { status: 503 });

  return NextResponse.json({ configured: true, url, secret }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

// Suppression : FlashPay n'enverra plus de notifications à cette adresse.
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ message: "Connecte-toi pour gérer les notifications." }, { status: 401 });

  const admin = adminClient();
  if (!admin) return NextResponse.json({ message: "Le service de notifications n’est pas configuré." }, { status: 503 });

  const { error } = await admin.from("merchant_webhooks").delete().eq("owner_id", user.id);
  if (error) return NextResponse.json({ message: "Impossible de supprimer l’adresse." }, { status: 503 });

  return NextResponse.json({ removed: true });
}
