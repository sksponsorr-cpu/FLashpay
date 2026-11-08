import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Demande de retrait programmé et annulation pendant le délai.
type Body =
  | {
      action: "schedule";
      currency_code: string;
      amount: number;
      destination: { country_code: string; operator: string; mobile: string; name: string };
    }
  | { action: "cancel"; id: string };

const messages: Record<string, string> = {
  INSUFFICIENT_BALANCE: "Solde insuffisant pour ce retrait.",
  BELOW_MINIMUM: "Le montant est inférieur au minimum de retrait.",
  MINIMUM_NOT_CONFIGURED: "Le retrait n’est pas encore disponible dans cette devise.",
  INVALID_AMOUNT: "Le montant doit être supérieur à zéro.",
  INVALID_DESTINATION: "Indique l’opérateur et le numéro qui recevront l’argent.",
  NOT_CANCELLABLE: "Ce retrait ne peut plus être annulé.",
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

  if (body.action === "schedule") {
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
    return NextResponse.json({ ok: true, withdrawal: row });
  }

  if (body.action === "cancel") {
    const { data, error } = await supabase.rpc("cancel_scheduled_withdrawal", { p_id: body.id });
    if (error || data !== "CANCELLED") {
      return NextResponse.json({ message: messages.NOT_CANCELLABLE }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Action inconnue." }, { status: 400 });
}
