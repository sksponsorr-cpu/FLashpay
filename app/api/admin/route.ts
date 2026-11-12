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
    const row: Row = byOwner.get(t.owner_id) ?? { owner_id: t.owner_id, email: emailById.get(t.owner_id) ?? "", successful_count: 0, pending_count: 0, failed_count: 0, volume: {} as Record<string, number> };
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

  // Clients (profils), interwallet, références, support et bénéfice plateforme
  const [profilesRes, movementsRes, txRefsRes, ticketsRes, paidWdRes, doneConvRes, okTxFeeRes] = await Promise.all([
    admin.from("profiles").select("id,full_name,country_code,verification_status,created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("wallet_movements").select("id,owner_id,currency_code,kind,amount,balance_after,reference,created_at").in("kind", ["conversion_in", "conversion_out"]).order("created_at", { ascending: false }).limit(200),
    admin.from("transactions").select("transaction_id,owner_id,amount,currency_code,status,country_code,payment_method,processing_fee,purpose,created_at").order("created_at", { ascending: false }).limit(200),
    admin.from("support_tickets").select("id,owner_id,subject,message,status,created_at").eq("status", "open").order("created_at", { ascending: true }),
    admin.from("withdrawal_requests").select("currency_code,fee_amount").eq("status", "paid").limit(10000),
    admin.from("conversion_requests").select("from_currency,to_currency,amount,rate_applied,fee_rate").eq("status", "done").limit(10000),
    admin.from("transactions").select("currency_code,processing_fee").eq("status", "successful").limit(10000),
  ]);

  const emailOf = new Map(accounts.map((a) => [a.id, a.email]));
  const clients = (profilesRes.data ?? []).map((p) => ({ ...p, email: emailOf.get(p.id) ?? "" }));
  const interwallet = (movementsRes.data ?? []).map((m) => ({ ...m, email: emailOf.get(m.owner_id) ?? "" }));
  const references = (txRefsRes.data ?? []).map((t) => ({ ...t, email: emailOf.get(t.owner_id) ?? "" }));
  const tickets = (ticketsRes.data ?? []).map((t) => ({ ...t, email: emailOf.get(t.owner_id) ?? "" }));

  // Bénéfice plateforme par devise : frais d'encaissement + frais de retrait + marge de conversion.
  const profit: Record<string, number> = {};
  const addProfit = (currency: string, value: number) => { profit[currency] = (profit[currency] ?? 0) + value; };
  for (const t of okTxFeeRes.data ?? []) addProfit(t.currency_code, Number(t.processing_fee ?? 0));
  for (const w of paidWdRes.data ?? []) addProfit(w.currency_code, Number(w.fee_amount ?? 0));
  for (const c of doneConvRes.data ?? []) {
    const received = Number(c.amount) * Number(c.rate_applied ?? 0);
    addProfit(c.to_currency, received * (Number(c.fee_rate ?? 0) / 100));
  }

  const { data: marginRow } = await admin.from("platform_settings").select("value").eq("key", "client_fee_margin_points").maybeSingle();
  return NextResponse.json({
    margin_points: marginRow ? Number(marginRow.value) : 5,
    withdrawals: withdrawals.data,
    conversions: conversions.data,
    rates: rates.data,
    minimums: minimums.data,
    accounts,
    identities,
    overview,
    clients,
    interwallet,
    references,
    tickets,
    profit,
  });
}

type AdminAction =
  | { action: "set_account_status"; owner_id: string; status: "active" | "suspended" | "banned"; days?: number }
  | { action: "credit_wallet"; owner_id: string; currency: string; amount: number; reason: string }
  | { action: "set_margin"; points: number }
  | { action: "close_ticket"; id: string }
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
    case "set_account_status": {
      const until = body.status === "banned" ? new Date(Date.now() + (Number(body.days) || 30) * 86400000).toISOString() : null;
      result = await serviceClient().from("profiles").update({
        account_status: body.status,
        banned_until: until,
      }).eq("id", body.owner_id);
      break;
    }
    case "credit_wallet": {
      const amount = Number(body.amount);
      if (!(amount > 0) || !body.reason?.trim()) return NextResponse.json({ message: "Montant et motif obligatoires." }, { status: 400 });
      const svc = serviceClient();
      const { data: wallet } = await svc.from("wallets").select("id, balance").eq("owner_id", body.owner_id).eq("currency_code", body.currency).maybeSingle();
      if (!wallet) return NextResponse.json({ message: "Aucun portefeuille dans cette devise pour ce compte." }, { status: 404 });
      const newBalance = Number(wallet.balance) + amount;
      await svc.from("wallets").update({ balance: newBalance, updated_at: new Date().toISOString() }).eq("id", wallet.id);
      result = await svc.from("wallet_movements").insert({
        owner_id: body.owner_id, wallet_id: wallet.id, currency_code: body.currency, kind: "adjustment",
        amount, balance_after: newBalance, reference: `admin_credit:${crypto.randomUUID()}`,
      });
      break;
    }
    case "set_margin": {
      const points = Number(body.points);
      if (!Number.isFinite(points) || points < 0 || points > 50) return NextResponse.json({ message: "Marge invalide (0 à 50 points)." }, { status: 400 });
      result = await serviceClient().from("platform_settings").upsert({ key: "client_fee_margin_points", value: points, updated_at: new Date().toISOString() });
      break;
    }
    case "close_ticket":
      result = await serviceClient().from("support_tickets").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", body.id);
      break;
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

  // Les fonctions de retrait répondent par un code : on le traduit, on ne le masque pas.
  const code = typeof result.data === "string" ? result.data : null;
  const blocked: Record<string, string> = {
    ALREADY_PROCESSED: "Cette demande a déjà été traitée.",
    UNKNOWN_REQUEST: "Demande introuvable.",
  };
  if (code && blocked[code]) {
    return NextResponse.json({ message: blocked[code] }, { status: 409 });
  }

  // Notification du marchand : visible seulement quand l'administrateur a tranché.
  if (body.action === "mark_withdrawal_paid" || body.action === "reject_withdrawal") {
    try {
      const { data: wd } = await serviceClient()
        .from("withdrawal_requests")
        .select("id, owner_id, payout_amount, currency_code")
        .eq("id", body.id)
        .maybeSingle();
      if (wd?.owner_id) {
        const paid = body.action === "mark_withdrawal_paid";
        await serviceClient().from("user_notifications").insert({
          owner_id: wd.owner_id,
          kind: "withdrawal",
          title: paid ? "Retrait réussi" : "Retrait refusé",
          body: paid
            ? `${wd.payout_amount} ${wd.currency_code} envoyés vers ton mobile money.`
            : `Ton retrait de ${wd.payout_amount} ${wd.currency_code} n’a pas été accepté. Le montant est rendu à ton portefeuille.`,
          reference: wd.id,
        });
      }
    } catch {
      // La notification ne bloque jamais l'action de l'administrateur.
    }
  }

  // Journal : qui a fait quoi, et quand (jamais bloquant).
  try {
    const { data: who } = await supabase.auth.getUser();
    await serviceClient().from("admin_audit_log").insert({
      admin_email: who.user?.email ?? null,
      action: body.action,
      payload: body as unknown as Record<string, unknown>,
    });
  } catch {
    // Le journal ne doit jamais bloquer une action validée.
  }

  return NextResponse.json({ ok: true, result: result.data ?? null });
}
