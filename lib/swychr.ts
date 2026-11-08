// Client serveur pour la création de demandes de paiement Swychr.
// À utiliser uniquement côté serveur : la clé Api-Key ne doit jamais aller dans le navigateur.

const CREATE_PAYMENT_REQUEST_URL = "https://api.accountpe.com/api/payin/create_payment_links";

// Indicatifs pays : la documentation Swychr montre le numéro complet, avec indicatif (exemple : 237670000000).
const DIAL_CODES: Record<string, string> = {
  CM: "237", CD: "243", CG: "242", SN: "221", BF: "226", BJ: "229", NG: "234",
  RW: "250", CI: "225", TG: "228", ML: "223", GH: "233", KE: "254",
};

// Numéro au format international : indicatif + numéro, sans 0 initial.
export function localMobile(countryCode: string, mobile: string): string {
  let digits = mobile.replace(/\D/g, "");
  const dial = DIAL_CODES[countryCode];
  if (!dial) return digits;
  if (digits.startsWith(dial)) return digits;
  digits = digits.replace(/^0+/, "");
  return dial + digits;
}

// Code de moyen de paiement attendu par Swychr (MTN, ORANGE...).
// Seuls MTN et ORANGE sont confirmés par la documentation ; les autres sont à valider.
export function swychrMethod(label: string): string {
  const key = label.trim().toLowerCase();
  if (key.includes("mtn")) return "MTN";
  if (key.includes("orange")) return "ORANGE";
  if (key.includes("moov")) return "MOOV";
  if (key.includes("airtel")) return "AIRTEL";
  if (key.includes("wave")) return "WAVE";
  if (key.includes("m-pesa") || key.includes("mpesa")) return "MPESA";
  return label.trim().toUpperCase();
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
