// Client serveur pour la création de demandes de paiement Swychr.
// À utiliser uniquement côté serveur : la clé Api-Key ne doit jamais aller dans le navigateur.

const CREATE_PAYMENT_REQUEST_URL = "https://api.accountpe.com/api/payin/create_payment_request";

// Indicatifs pays : Swychr attend le numéro mobile SANS indicatif (exemple : 651791902).
const DIAL_CODES: Record<string, string> = {
  CM: "237", CD: "243", CG: "242", SN: "221", BF: "226", BJ: "229", NG: "234",
  RW: "250", CI: "225", TG: "228", ML: "223", GH: "233", KE: "254",
};

export function localMobile(countryCode: string, mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  const dial = DIAL_CODES[countryCode];
  if (dial && digits.startsWith(dial) && digits.length > dial.length + 6) {
    return digits.slice(dial.length);
  }
  return digits;
}

export type PaymentRequestInput = {
  country_code: string;
  name: string;
  email?: string;
  mobile: string;
  transaction_id: string;
  amount: number;
  payment_method: string;
  description: string;
  pass_digital_charge: boolean;
  callback_url?: string;
  failed_callback_url?: string;
};

export type PaymentRequestResult =
  | { ok: true; paymentLink: string | null; swychrReference: string | null }
  | { ok: false; message: string };

export async function createSwychrPaymentRequest(
  input: PaymentRequestInput,
  apiKey: string,
): Promise<PaymentRequestResult> {
  try {
    const response = await fetch(CREATE_PAYMENT_REQUEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": apiKey },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);

    if (!response.ok || !result || result.status !== 200) {
      return {
        ok: false,
        message: result?.message ?? "Le prestataire de paiement n’a pas accepté la demande.",
      };
    }

    return {
      ok: true,
      paymentLink: result.payment_link ?? null,
      swychrReference: result.data?.swychr_reference ?? null,
    };
  } catch {
    return { ok: false, message: "Impossible de joindre le prestataire de paiement." };
  }
}
