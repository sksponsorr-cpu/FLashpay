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

  const failed = [withdrawals, conversions, rates, minimums].find((result) => result.error);
  if (failed) return NextResponse.json({ message: "Impossible de charger l’espace admin." }, { status: 503 });

  return NextResponse.json({
    withdrawals: withdrawals.data,
    conversions: conversions.data,
    rates: rates.data,
    minimums: minimums.data,
  });
}

type AdminAction =
  | { action: "mark_withdrawal_paid"; id: string }
  | { action: "reject_withdrawal"; id: string }
  | { action: "complete_conversion"; id: string; rate: number }
  | { action: "activate_subscription"; owner_id: string; plan: "basic" | "premium"; months: number }
  | { action: "set_rate"; from_currency: string; to_currency: string; rate: number }
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
