import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToOwner } from "@/lib/push";

// Litiges côté administrateur. Accès réservé à l'administrateur FlashPay.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Connecte-toi." }, { status: 401 }) };
  const { data: isAdmin } = await supabase.rpc("is_flashpay_admin");
  if (isAdmin !== true) return { error: NextResponse.json({ message: "Accès réservé à l’administrateur." }, { status: 403 }) };
  return { ok: true as const };
}

function serviceClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const db = serviceClient();
  const { data, error } = await db
    .from("disputes")
    .select("id, owner_id, transaction_id, reason, status, admin_reply, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ message: "Litiges indisponibles." }, { status: 503 });
  const ownerIds = [...new Set((data ?? []).map((d) => d.owner_id))];
  const emails = new Map<string, string>();
  for (const id of ownerIds) {
    const { data: u } = await db.auth.admin.getUserById(id);
    if (u?.user?.email) emails.set(id, u.user.email);
  }
  return NextResponse.json(
    { disputes: (data ?? []).map((d) => ({ ...d, email: emails.get(d.owner_id) ?? "" })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const STATUSES = ["open", "in_review", "resolved"] as const;

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const body = (await request.json().catch(() => ({}))) as { id?: string; status?: string; reply?: string };
  if (!body.id || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }
  const reply = (body.reply ?? "").trim();
  if (reply.length > 2000) return NextResponse.json({ message: "Réponse trop longue." }, { status: 400 });

  const db = serviceClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: body.status, updated_at: now, resolved_at: body.status === "resolved" ? now : null };
  if (reply) patch.admin_reply = reply;
  const { data, error } = await db.from("disputes").update(patch).eq("id", body.id).select("owner_id, transaction_id, status").maybeSingle();
  if (error || !data) return NextResponse.json({ message: "Mise à jour impossible." }, { status: 503 });

  const label = body.status === "resolved" ? "Litige résolu" : body.status === "in_review" ? "Litige en cours de traitement" : "Litige ouvert";
  const text = `Transaction ${data.transaction_id} : ${label.toLowerCase()}.`;
  await db.from("user_notifications").insert({ owner_id: data.owner_id, kind: "info", title: label, body: text, reference: data.transaction_id }).then(() => null, () => null);
  await sendPushToOwner(data.owner_id, { title: label, body: text, url: "/dashboard" }).catch(() => {});

  return NextResponse.json({ ok: true });
}
