import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Espace administrateur FlashPay. Chaque action passe par une fonction SQL qui vérifie is_admin.
// La lecture de toutes les demandes utilise la clé service role, uniquement après vérification admin.

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Connecte-toi." }, { status: 401 }) };

  const { data: isAdmin } = await supabase.rpc("is_flashpay_admin");
  if (isAdmin !== true) return { error: NextResponse.json({ message: "Accès réservé à l’administrateur." }, { status: 403 }) };

  return { supabase };
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: "Base non configurée." }, { status: 503 });

  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });

  const [withdrawals, conversions, rates, minimums] = await Promise.all([
    admin.from("withdrawal_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
    admin.from("conversion_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
    admin.from("fx_rates").select("*").order("from_currency"),
    admin.from("withdrawal_minimums").select("*").order("currency_code"),
  ]);

  // Liste des comptes marchands (adresse e-mail) pour choisir un abonné sans saisir d'identifiant
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const accounts = (users.data?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? "" }));

    const failed = [withdrawals, conversions, rates, minimums].find((result) => result.error);
  if (failed) return NextResponse.json({ message: "Impossible de charger l’espace admin." }, { status: 503 });

  // Documents d'identité en attente : liens signés valables 10 minutes
  const pending = await admin.from("identity_verifications").select("*").eq("status", "under_review").order("created_at", { ascending: true });
  const identities = await Promise.all((pending.data ?? []).map(async (row) => {
    const doc = await admin.storage.from("identity-documents").createSignedUrl(row.document_path, 600);
    const selfie = await admin.storage.from("identity-documents").createSignedUrl(row.selfie_path, 600);
    return { ...row, document_url: doc.data?.signedUrl ?? null, selfie_url: selfie.data?.signedUrl ?? null };
  }));

  // Vue d'ensemble : chiffres clés et marchands classés par montant encaissé
  const txResult = await admin.from("transactions").select("owner_id,amount,currency_code,status").limit(10000);
  const txs = txResult.data ?? [];
  const emailById = new Map(accounts.map((a) => [a.id, a.email]));
  const counts = { total: txs.length, successful: 0, pending: 0, failed: 0 };
  type Row = { owner_id: string; email: string; successful_count: number; pending_count: number; failed_count: number; volume: Record<string, number> };
  const byOwner = new Map<string, Row>();
  for (const t of txs) {
    const isOk = t.status === "successful";
    const isFail = t.status === "failed" || t.status === "expired" || t.status === "cancelled";
    if (isOk) counts.successful += 1; else if (isFail) counts.failed += 1; else counts.pending += 1;
    const row = byOwner.get(t.owner_id) ?? { owner_id: t.owner_id, email: emailById.get(t.owner_id) ?? "", successful_count: 0, pending_count: 0, failed_count: 0, volume: {} };
    if (isOk) {
      row.successful_count += 1;
      row.volume[t.currency_code] = (row.volume[t.currency_code] ?? 0) + Number(t.amount);
    } else if (isFail) row.failed_count += 1;
    else row.pending_count += 1;
    byOwner.set(t.owner_id, row);
  }
  // Classement : le plus gros montant encaissé en haut (plus grande devise de chaque marchand)
  const merchants = [...byOwner.values()].sort((a, b) => Math.max(0, ...Object.values(b.volume)) - Math.max(0, ...Object.values(a.volume)));
  // Demandes de retrait : livrées (paid), en attente (pending), non livrées (rejected)
  const wdResult = await admin.from("withdrawal_requests").select("status,requested_amount,currency_code").limit(10000);
  const wdAll = wdResult.data ?? [];
  const withdrawalStats = {
    total: wdAll.length,
    delivered: wdAll.filter((w) => w.status === "paid").length,
    pending: wdAll.filter((w) => w.status === "pending").length,
    not_delivered: wdAll.filter((w) => w.status === "rejected").length,
  };
  const overview = { users: accounts.length, transactions: counts, withdrawals: withdrawalStats, merchants };

  return NextResponse.json({
    withdrawals: withdrawals.data,
    conversions: conversions.data,
    rates: rates.data,
    minimums: minimums.data,
    accounts,
    identities,
    overview,
  });
}

type AdminAction =
  | { action: "mark_withdrawal_paid"; id: string }
  | { action: "reject_withdrawal"; id: string }
  | { action: "complete_conversion"; id: string; rate: number }
  | { action: "activate_subscription"; owner_id: string; plan: "basic" | "premium"; months: number }
  | { action: "set_rate"; from_currency: string; to_currency: string; rate: number }
  | { action: "review_identity"; id: string; approve: boolean; reason?: string }
  | { action: "set_minimum"; currency_code: string; minimum_amount: number };

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const supabase = auth.supabase;

  let body: AdminAction;
  try {
    body = (await request.json()) as AdminAction;
  } catch {
    return NextResponse.json({ message: "Corps JSON invalide." }, { status: 400 });
  }

  let result;
  switch (body.action) {
    case "mark_withdrawal_paid":
      result = await supabase.rpc("admin_mark_withdrawal_paid", { p_id: body.id });
      break;
    case "reject_withdrawal":
      result = await supabase.rpc("admin_reject_withdrawal", { p_id: body.id });
      break;
    case "complete_conversion":
      result = await supabase.rpc("admin_complete_conversion", { p_id: body.id, p_rate: body.rate });
      break;
    case "activate_subscription":
      result = await supabase.rpc("admin_activate_subscription", {
        p_owner: body.owner_id,
        p_plan: body.plan,
        p_months: body.months,
      });
      break;
    case "review_identity": {
      const service = serviceClient();
      const { data: row } = await service.from("identity_verifications").select("owner_id").eq("id", body.id).single();
      if (!row) return NextResponse.json({ message: "Demande introuvable." }, { status: 404 });
      const approve = body.approve === true;
      await service.from("identity_verifications").update({
        status: approve ? "approved" : "rejected",
        rejection_reason: approve ? null : (body.reason ?? "Documents non conformes."),
        reviewed_at: new Date().toISOString(),
      }).eq("id", body.id);
      await service.from("profiles").update({ verification_status: approve ? "verified" : "rejected" }).eq("id", row.owner_id);
      result = { data: "REVIEWED", error: null };
      break;
    }
    case "set_rate":
      // Les tables de taux ne sont pas modifiables par les utilisateurs connectés : écriture serveur après vérification admin.
      result = await serviceClient().from("fx_rates").upsert({
        from_currency: body.from_currency.toUpperCase(),
        to_currency: body.to_currency.toUpperCase(),
        rate: body.rate,
        updated_at: new Date().toISOString(),
      });
      break;
    case "set_minimum":
      result = await serviceClient().from("withdrawal_minimums").upsert({
        currency_code: body.currency_code.toUpperCase(),
        minimum_amount: body.minimum_amount,
        updated_at: new Date().toISOString(),
      });
      break;
    default:
      return NextResponse.json({ message: "Action inconnue." }, { status: 400 });
  }

  if (result.error) {
    return NextResponse.json({ message: result.error.message || "Action refusée." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: result.data ?? null });
}
