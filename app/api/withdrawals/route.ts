import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDuePayouts } from "@/lib/payout-runner";

// Retrait immédiat pour les comptes vérifiés : la demande déclenche le virement tout de suite.
type Body = {
  action: "schedule";
  currency_code: string;
  amount: number;
  destination: { country_code: string; operator: string; mobile: string; name: string };
};

const messages: Record<string, string> = {
  NOT_VERIFIED: "Vérifie ton identité avant de faire un retrait.",
  INSUFFICIENT_BALANCE: "Solde insuffisant pour ce retrait.",
  BELOW_MINIMUM: "Le montant est inférieur au minimum de retrait.",
  MINIMUM_NOT_CONFIGURED: "Le retrait n’est pas encore disponible dans cette devise.",
  INVALID_AMOUNT: "Le montant doit être supérieur à zéro.",
  INVALID_DESTINATION: "Indique l’opérateur et le numéro qui recevront l’argent.",
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connecte-toi." }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ message: "Données invalides." }, { status: 400 });
  }
  if (body.action !== "schedule") return NextResponse.json({ message: "Action inconnue." }, { status: 400 });

  const d = body.destination;
  const { data, error } = await supabase.rpc("request_withdrawal_scheduled", {
    p_currency: body.currency_code,
    p_amount: body.amount,
    p_country: d?.country_code ?? "",
    p_operator: d?.operator ?? "",
    p_mobile: (d?.mobile ?? "").replace(/\D/g, ""),
    p_name: d?.name ?? "",
  });

  if (error) {
    const key = Object.keys(messages).find((k) => (error.message ?? "").includes(k));
    return NextResponse.json({ message: key ? messages[key] : "Demande refusée." }, { status: 400 });
  }

  const row = Array.isArray(data) ? data[0] : data;

  // Envoi immédiat : on traite le virement tout de suite, sans attendre le cron.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let status = "scheduled";
  let lastError: string | null = null;

  if (url && serviceKey && row?.out_id) {
    const admin = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    await runDuePayouts(admin, 20);

    const { data: current } = await admin
      .from("withdrawal_requests")
      .select("status, last_error")
      .eq("id", row.out_id)
      .maybeSingle();
    status = current?.status ?? status;
    lastError = current?.last_error ?? null;
  }

  return NextResponse.json({
    ok: status !== "failed",
    withdrawal: { ...row, status, last_error: lastError },
    message:
      status === "paid"
        ? "Retrait envoyé vers ton mobile money."
        : status === "failed"
          ? "Le virement n’a pas abouti. Le montant a été rendu à ton portefeuille."
          : "Retrait en cours de traitement.",
  });
}
