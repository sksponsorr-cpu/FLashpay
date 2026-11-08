import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Portefeuille du compte connecté (mode par compte) ou d'une application (?app=<id>).
// Les frais de retrait et de conversion sont calculés par les fonctions SQL, selon l'abonnement actif.

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

  // Vérifie l'application si elle est demandée
  if (appId) {
    const { data: app } = await supabase.from("apps").select("id").eq("id", appId).eq("owner_id", user.id).maybeSingle();
    if (!app) return NextResponse.json({ message: "Application introuvable." }, { status: 404 });
  }

  const scope = <T extends { eq: (c: string, v: string) => T }>(query: T) =>
    appId ? query.eq("app_id", appId) : query.eq("owner_id", user.id);

  const [wallets, movements, withdrawals, conversions, minimums, rates, plan] = await Promise.all([
    scope(supabase.from("wallets").select("currency_code, balance")).order("currency_code"),
    scope(supabase.from("wallet_movements").select("id, currency_code, kind, amount, balance_after, created_at")).order("created_at", { ascending: false }).limit(50),
    scope(supabase.from("withdrawal_requests").select("id, currency_code, requested_amount, fee_amount, payout_amount, status, created_at")).order("created_at", { ascending: false }).limit(20),
    scope(supabase.from("conversion_requests").select("id, from_currency, to_currency, amount, status, received_amount, created_at")).order("created_at", { ascending: false }).limit(20),
    supabase.from("withdrawal_minimums").select("currency_code, minimum_amount").order("currency_code"),
    supabase.from("fx_rates").select("from_currency, to_currency, rate"),
    supabase.rpc("active_plan", { p_owner: user.id }),
  ]);

  const failed = [wallets, movements, withdrawals, conversions, minimums, rates].find((r) => r.error);
  if (failed?.error) {
    console.error("[wallet] lecture", failed.error);
    return NextResponse.json(
      { message: "Impossible de charger le portefeuille. Vérifie que toutes les migrations sont appliquées." },
      { status: 503 }
    );
  }

  const activePlan = typeof plan.data === "string" && plan.data !== "" ? plan.data : null;

  return NextResponse.json(
    {
      wallets: wallets.data ?? [],
      movements: movements.data ?? [],
      withdrawals: withdrawals.data ?? [],
      conversions: conversions.data ?? [],
      minimums: minimums.data ?? [],
      rates: rates.data ?? [],
      plan: activePlan,
      fee: { withdrawal: activePlan === "premium" ? 0 : 5, conversion: activePlan ? 1 : 4.5 },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

type WalletAction =
  | {
      action: "withdraw";
      currency_code: string;
      amount: number;
      app_id?: string;
      destination?: { country_code?: string; operator?: string; mobile?: string; name?: string };
    }
  | { action: "convert"; from_currency: string; to_currency: string; amount: number; app_id?: string };

const messages: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Solde insuffisant pour cette opération.",
  BELOW_MINIMUM: "Le montant est inférieur au minimum de retrait.",
  MINIMUM_NOT_CONFIGURED: "Le retrait n’est pas encore disponible dans cette devise.",
  INVALID_AMOUNT: "Le montant doit être supérieur à zéro.",
  INVALID_CONVERSION: "Choisis deux devises différentes et un montant valide.",
  NOT_AUTHENTICATED: "Connecte-toi.",
};

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  let body: WalletAction;
  try {
    body = (await request.json()) as WalletAction;
  } catch {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }

  if (body.app_id) {
    const { data: app } = await supabase.from("apps").select("id").eq("id", body.app_id).eq("owner_id", user.id).maybeSingle();
    if (!app) return NextResponse.json({ message: "Application introuvable." }, { status: 404 });
  }

  let result: { data: unknown; error: { message?: string } | null } | null = null;

  if (body.action === "withdraw") {
    // Retrait : la fonction SQL vérifie le solde et le minimum, puis applique les frais (5 %, 0 % en Premium).
    result = await supabase.rpc("request_withdrawal", {
      p_currency: body.currency_code,
      p_amount: body.amount,
    });
  } else if (body.action === "convert") {
    // Conversion : la fonction SQL applique les frais de conversion (4,5 %, 1 % en Premium).
    result = await supabase.rpc("request_conversion", {
      p_from: body.from_currency,
      p_to: body.to_currency,
      p_amount: body.amount,
    });
  }

  if (!result) return NextResponse.json({ message: "Action inconnue." }, { status: 400 });

  if (result.error) {
    const text = result.error.message ?? "";
    const key = Object.keys(messages).find((candidate) => text.includes(candidate));
    console.error("[wallet] action", body.action, text);
    return NextResponse.json(
      { message: key ? messages[key] : "Demande refusée. Vérifie que les migrations sont appliquées." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, result: result.data });
}
