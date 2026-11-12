import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppAccess } from "@/lib/app-access";

// Données d'une facture pour un paiement réussi de l'application. Accès : propriétaire ou membre invité.
export async function GET(request: Request, { params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Connecte-toi." }, { status: 401 });

  const { data: tx } = await supabase
    .from("transactions")
    .select("transaction_id, app_id, amount, fee_amount, currency_code, country_code, payment_method, status, created_at")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (!tx?.app_id) return NextResponse.json({ message: "Facture introuvable." }, { status: 404 });
  const access = await getAppAccess(supabase, tx.app_id);
  if (access.role === "none") return NextResponse.json({ message: "Facture introuvable." }, { status: 404 });
  if (tx.status !== "successful") return NextResponse.json({ message: "La facture est disponible après un paiement réussi." }, { status: 409 });

  const { data: app } = await supabase.from("apps").select("name, website").eq("id", tx.app_id).maybeSingle();
  return NextResponse.json({
    invoice: {
      number: `FAC-${new Date(tx.created_at).getFullYear()}-${String(tx.transaction_id).slice(-8).toUpperCase()}`,
      issued_at: tx.created_at,
      seller: app?.name ?? "—",
      seller_website: app?.website ?? null,
      transaction_id: tx.transaction_id,
      payment_method: tx.payment_method,
      country_code: tx.country_code,
      amount: tx.amount,
      fee_amount: tx.fee_amount,
      currency_code: tx.currency_code,
    },
  });
}
