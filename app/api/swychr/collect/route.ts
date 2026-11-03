import { NextResponse } from "next/server";
import { getSupportedCountry } from "@/lib/countries";

type CollectionInput = {
  country_code?: string;
  name?: string;
  email?: string;
  mobile?: string;
  amount?: number;
  transaction_id?: string;
  payment_method?: string;
  description?: string;
};

export async function POST(request: Request) {
  let input: CollectionInput;

  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const countryCode = input.country_code?.trim().toUpperCase();
  const transactionId = input.transaction_id?.trim();
  const amount = Number(input.amount);

  if (!getSupportedCountry(countryCode)) {
    return NextResponse.json({ message: "Choisissez un pays configuré dans FlashPay." }, { status: 400 });
  }
  if (!input.name?.trim() || !input.mobile?.trim()) {
    return NextResponse.json({ message: "Le nom et le numéro mobile sont requis." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || !transactionId) {
    return NextResponse.json({ message: "Montant ou référence de transaction invalide." }, { status: 400 });
  }

  if (process.env.SWYCHR_LIVE_PAYMENTS_ENABLED === "true") {
    return NextResponse.json(
      { message: "Les paiements réels restent bloqués jusqu’à la mise en place de l’authentification, du stockage durable et des validations Swychr." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    mode: "demo",
    transaction_id: transactionId,
    status: 0,
    message: "Simulation uniquement; aucun paiement réel n’a été déclenché.",
  });
}