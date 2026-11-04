import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Portefeuille du client connecté. Toutes les lectures passent par les règles RLS (ses propres lignes seulement).
// Toutes les écritures passent par des fonctions SQL qui utilisent l'identifiant de session.

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ message: "Connecte-toi." }, { status: 401 }) };
  return { supabase };
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const supabase = auth.supabase;

  const [wallets, movements, withdrawals, conversions, minimums, rates, subscriptions] = await Promise.all([
    supabase.from("wallets").select("currency_code, balance").order("currency_code"),
    supabase.from("wallet_movements").select("id, currency_code, kind, amount, balance_after, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("withdrawal_requests").select("id, currency_code, requested_amount, payout_amount, fee_amount, status, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("conversion_requests").select("id, from_currency, to_currency, amount, status, received_amount, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("withdrawal_minimums").select("currency_code, minimum_amount"),
    supabase.from("fx_rates").select("from_currency, to_currency, rate"),
    supabase.from("subscriptions").select("plan, current_period_end").order("current_period_end", { ascending: false }).limit(1),
  ]);

  const failed = [wallets, movements, withdrawals, conversions, minimums, rates, subscriptions].find((r) => r.error);
  if (failed) return NextResponse.json({ message: "Impossible de charger ton portefeuille." }, { status: 503 });

  const current = subscriptions.data?.[0];
  const activePlan = current && new Date(current.current_period_end) > new Date() ? current.plan : null;

  return NextResponse.json({
    wallets: wallets.data,
    movements: movements.data,
    withdrawals: withdrawals.data,
    conversions: conversions.data,
    minimums: minimums.data,
    rates: rates.data,
    plan: activePlan,
    fee: {
      withdrawal: activePlan === "premium" ? 0 : 5,
      conversion: activePlan ? 1 : 4.5,
    },
  });
}

type WalletAction =
  | { action: "withdraw"; currency_code: string; amount: number }
  | { action: "convert"; from_currency: string; to_currency: string; amount: number };

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const supabase = auth.supabase;

  let body: WalletAction;
  try {
    body = (await request.json()) as WalletAction;
  } catch {
    return NextResponse.json({ message: "Corps JSON invalide." }, { status: 400 });
  }

  const result =
    body.action === "withdraw"
      ? await supabase.rpc("request_withdrawal", { p_currency: body.currency_code, p_amount: body.amount })
      : body.action === "convert"
        ? await supabase.rpc("request_conversion", { p_from: body.from_currency, p_to: body.to_currency, p_amount: body.amount })
        : null;

  if (!result) return NextResponse.json({ message: "Action inconnue." }, { status: 400 });

  if (result.error) {
    const text = result.error.message ?? "";
    const messages: Record<string, string> = {
      INSUFFICIENT_BALANCE: "Solde insuffisant pour cette opération.",
      BELOW_MINIMUM: "Le montant est inférieur au minimum de retrait pour cette devise.",
      MINIMUM_NOT_CONFIGURED: "Le retrait n’est pas encore disponible dans cette devise.",
      INVALID_AMOUNT: "Le montant doit être supérieur à zéro.",
      INVALID_CONVERSION: "Choisis deux devises différentes et un montant valide.",
    };
    const key = Object.keys(messages).find((k) => text.includes(k));
    return NextResponse.json({ message: key ? messages[key] : "Demande refusée." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, result: result.data });
}
