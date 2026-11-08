// FLASH PAY — ACCOUNTPE / SWYCHR — API Direct (create_payment_request)
// Serveur uniquement. Ne jamais exposer la clé API au navigateur.
// Le client reste sur FlashPay : il valide le paiement sur son téléphone (push).

const CREATE_PAYMENT_REQUEST_URL =
  "https://api.accountpe.com/api/payin/create_payment_request";

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

// Numéro au format national, sans indicatif (format attendu par l'API Direct).
export function nationalMobile(countryCode: string, mobile: string): string {
  let digits = mobile.replace(/\D/g, "");
  const dialCode = DIAL_CODES[countryCode.toUpperCase()];

  if (dialCode && digits.startsWith(dialCode)) {
    digits = digits.slice(dialCode.length);
  }

  return digits.replace(/^0+/, "");
}

// Conservé pour les routes qui utilisent encore l'ancien format (ex. collect).
export function localMobile(countryCode: string, mobile: string): string {
  let digits = mobile.replace(/\D/g, "");
  const dialCode = DIAL_CODES[countryCode.toUpperCase()];

  if (!dialCode) return digits;
  if (digits.startsWith(dialCode)) return digits;

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

// Orange Money exige un code OTP dans ces pays (sinon l'API répond 400).
export function requiresOtp(countryCode: string, paymentMethod: string): boolean {
  return (
    paymentMethod === "ORANGE" &&
    ["CI", "SN", "BF"].includes(countryCode.toUpperCase())
  );
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
  otp?: string;
  callback_url?: string;
  failed_callback_url?: string;
};

// Le paiement se valide sur le téléphone du client : il n'y a plus de lien à ouvrir.
// paymentLink est conservé à null pour compatibilité avec les anciennes routes.
export type PaymentRequestResult =
  | {
      ok: true;
      paymentLink: null;
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
    return { ok: false, message: "Clé API AccountPe manquante." };
  }

  try {
    const response = await fetch(CREATE_PAYMENT_REQUEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result) {
      console.error("AccountPe HTTP error:", response.status, result?.message);

      return {
        ok: false,
        message: result?.message ?? `Erreur AccountPe HTTP ${response.status}.`,
      };
    }

    if (result.status !== 200 && result.status !== "200") {
      return {
        ok: false,
        message: result.message ?? "AccountPe a refusé la demande de paiement.",
      };
    }

    const data = result.data ?? {};

    return {
      ok: true,
      paymentLink: null,
      swychrReference: data.id != null ? String(data.id) : null,
    };
  } catch (error) {
    console.error("AccountPe connection error:", error);

    return {
      ok: false,
      message:
        error instanceof Error && error.name === "TimeoutError"
          ? "Le prestataire AccountPe met trop de temps à répondre."
          : "Impossible de contacter AccountPe.",
    };
  }
}
