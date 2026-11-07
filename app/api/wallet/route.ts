import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ message: "Connecte-toi." }, { status: 401 }) };
  return { supabase, user };
}

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  const appId = new URL(request.url).searchParams.get("app");
  if (!appId) return NextResponse.json({ message: "Choisis une application." }, { status: 400 });

  const { data: app, error: appError } = await supabase.from("apps").select("id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
  if (appError || !app) return NextResponse.json({ message: "Application introuvable." }, { status: 404 });

  const [wallets, movements, withdrawals, conversions, minimums, rates, subscriptions] = await Promise.all([
    supabase.from("wallets").select("currency_code, balance").eq("app_id", appId).order("currency_code"),
    supabase.from("wallet_movements").select("id, currency_code, kind, amount, balance_after, created_at").eq("app_id", appId).order("created_at", { ascending: false }).limit(50),
    supabase.from("withdrawal_requests").select("id, currency_code, requested_amount, payout_amount, fee_amount, status, created_at").eq("app_id", appId).order("created_at", { ascending: false }).limit(20),
    supabase.from("conversion_requests").select("id, from_currency, to_currency, amount, status, received_amount, created_at").eq("app_id", appId).order("created_at", { ascending: false }).limit(20),
    supabase.from("withdrawal_minimums").select("currency_code, minimum_amount"),
    supabase.from("fx_rates").select("from_currency, to_currency, rate"),
    supabase.from("subscriptions").select("plan, current_period_end").eq("app_id", appId).order("current_period_end", { ascending: false }).limit(1),
  ]);
  const failed = [wallets, movements, withdrawals, conversions, minimums, rates, subscriptions].find((r) => r.error);
  if (failed) return NextResponse.json({ message: "Impossible de charger le portefeuille de cette application. Vérifie que la migration des applications est appliquée." }, { status: 503 });
  const current = subscriptions.data?.[0];
  const activePlan = current && new Date(current.current_period_end) > new Date() ? current.plan : null;

  return NextResponse.json({
    wallets: wallets.data, movements: movements.data, withdrawals: withdrawals.data,
    conversions: conversions.data, minimums: minimums.data, rates: rates.data, plan: activePlan,
    fee: { withdrawal: activePlan === "premium" ? 0 : 5, conversion: activePlan ? 1 : 4.5 },
  }, { headers: { "Cache-Control": "no-store" } });
}

type WalletAction =
  | { action: "withdraw"; currency_code: string; amount: number; app_id: string; destination?: { country_code?: string; operator?: string; mobile?: string; name?: string } }
  | { action: "convert"; from_currency: string; to_currency: string; amount: number; app_id: string };

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;
  let body: WalletAction;
  try { body = await request.json() as WalletAction; }
  catch { return NextResponse.json({ message: "Corps JSON invalide." }, { status: 400 }); }
  if (!body.app_id) return NextResponse.json({ message: "Choisis une application." }, { status: 400 });
  const { data: app } = await supabase.from("apps").select("id").eq("id", body.app_id).eq("owner_id", user.id).maybeSingle();
  if (!app) return NextResponse.json({ message: "Application introuvable." }, { status: 404 });
  const result = body.action === "withdraw"
    ? await supabase.rpc("request_withdrawal_for_app", { p_app_id: body.app_id, p_currency: body.currency_code, p_amount: body.amount, p_country: body.destination?.country_code ?? "", p_operator: body.destination?.operator ?? "", p_mobile: body.destination?.mobile ?? "", p_name: body.destination?.name ?? "" })
    : body.action === "convert"
      ? await supabase.rpc("request_conversion_for_app", { p_app_id: body.app_id, p_from: body.from_currency, p_to: body.to_currency, p_amount: body.amount })
      : null;
  if (!result) return NextResponse.json({ message: "Action inconnue." }, { status: 400 });
  if (result.error) {
    const text = result.error.message ?? "";
    const messages: Record<string, string> = {
      INSUFFICIENT_BALANCE: "Solde insuffisant pour cette opération.", BELOW_MINIMUM: "Le montant est inférieur au minimum de retrait.",
      MINIMUM_NOT_CONFIGURED: "Le retrait n’est pas encore disponible dans cette devise.", INVALID_AMOUNT: "Le montant doit être supérieur à zéro.",
      INVALID_CONVERSION: "Choisis deux devises différentes et un montant valide.", APP_NOT_FOUND: "Application introuvable.",
    };
    const key = Object.keys(messages).find((candidate) => text.includes(candidate));
    return NextResponse.json({ message: key ? messages[key] : "Demande refusée. Vérifie que les migrations sont appliquées." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, result: result.data });
}
