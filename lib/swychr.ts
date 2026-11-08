// FLASH PAY — ACCOUNTPE / SWYCHR
// Communication serveur avec le prestataire de paiement.
// Ne jamais exposer la clé API au navigateur.

const CREATE_PAYMENT_REQUEST_URL =
  "https://api.accountpe.com/api/payin/create_payment_links";

const DIAL_CODES: Record<string, string> = {
  CM: "237",
  CD: "243",
  CG: "242",
  SN: "221",
  BF: "226",
  BJ: "229",
  NG: "234",
  RW: "250",
  CI: "225",
  TG: "228",
  ML: "223",
  GH: "233",
  KE: "254",
};

// Normalisation des numéros internationaux.
export function localMobile(
  countryCode: string,
  mobile: string
): string {
  let digits = mobile.replace(/\D/g, "");

  const dialCode = DIAL_CODES[countryCode.toUpperCase()];

  if (!dialCode) return digits;

  if (digits.startsWith(dialCode)) {
    return digits;
  }

  digits = digits.replace(/^0+/, "");

  return `${dialCode}${digits}`;
}

// Normalisation des opérateurs.
export function swychrMethod(label: string): string {
  const key = label.trim().toLowerCase();

  const methods: Record<string, string> = {
    "orange money": "ORANGE",
    orange: "ORANGE",
    "mtn momo": "MTN",
    "mtn mobile money": "MTN",
    mtn: "MTN",
    "moov money": "MOOV",
    moov: "MOOV",
    airtel: "AIRTEL",
    "airtel money": "AIRTEL",
    wave: "WAVE",
    "wave money": "WAVE",
    "m-pesa": "MPESA",
    mpesa: "MPESA",
  };

  return methods[key] ?? label.trim().toUpperCase();
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
  | {
      ok: true;
      paymentLink: string | null;
      swychrReference: string | null;
    }
  | {
      ok: false;
      message: string;
    };

export async function createSwychrPaymentRequest(
  input: PaymentRequestInput,
  apiKey: string
): Promise<PaymentRequestResult> {
  if (!apiKey) {
    return {
      ok: false,
      message: "Clé API AccountPe manquante.",
    };
  }

  try {
    const response = await fetch(
      CREATE_PAYMENT_REQUEST_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Api-Key": apiKey,
          Accept: "application/json",
        },

        body: JSON.stringify(input),

        cache: "no-store",

        signal: AbortSignal.timeout(30000),
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      console.error(
        "AccountPe HTTP error:",
        response.status,
        result?.message
      );

      return {
        ok: false,
        message:
          result?.message ??
          `Erreur AccountPe HTTP ${response.status}.`,
      };
    }

    if (
      result.status !== 200 &&
      result.status !== "200"
    ) {
      return {
        ok: false,
        message:
          result.message ??
          "AccountPe a refusé la demande de paiement.",
      };
    }

    const data = result.data ?? {};

    const paymentLink =
      data.payment_link ??
      data.payment_url ??
      data.checkout_url ??
      result.payment_link ??
      result.payment_url ??
      result.checkout_url ??
      null;

    const swychrReference =
      data.swychr_reference ??
      data.reference ??
      data.id ??
      null;

    return {
      ok: true,
      paymentLink:
        typeof paymentLink === "string"
          ? paymentLink
          : null,

      swychrReference:
        swychrReference !== null
          ? String(swychrReference)
          : null,
    };
  } catch (error) {
    console.error("AccountPe connection error:", error);

    return {
      ok: false,
      message:
        error instanceof Error &&
        error.name === "TimeoutError"
          ? "Le prestataire AccountPe met trop de temps à répondre."
          : "Impossible de contacter AccountPe.",
    };
  }
  }
