// FLASH PAY — SWYCHR / ACCOUNTPE — liens de paiement hébergés (create_payment_links)
// Même flux que SAS : le client est redirigé vers la page de validation du prestataire.
// Serveur uniquement : SWYCHR_API_KEY ne doit jamais être exposée au navigateur.

const BASE_URL = "https://api.accountpe.com";

// Indicatifs téléphoniques, sans « + ».
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

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  CM: "XAF",
  CG: "XAF",
  CD: "CDF",
  SN: "XOF",
  BF: "XOF",
  BJ: "XOF",
  CI: "XOF",
  TG: "XOF",
  ML: "XOF",
  NG: "NGN",
  RW: "RWF",
  GH: "GHS",
  KE: "KES",
};

// Devises qui acceptent des décimales. Les autres exigent un montant entier.
const DECIMAL_CURRENCIES = new Set(["GHS", "KES", "NGN"]);

// Frais ajoutés au montant, à la charge du client (affichés sur la page de paiement FlashPay).
export const CLIENT_FEE_RATE = 0.025;

// Adresse utilisée si le client n'a pas d'e-mail : à définir dans SWYCHR_DEFAULT_EMAIL.
const DEFAULT_EMAIL = process.env["SWYCHR_DEFAULT_EMAIL"] ?? "paiements@flashpay.app";

// Correspondance nom d'opérateur -> clé réseau attendue par SwyChr.
const NETWORK_KEYS: { match: string[]; key: string }[] = [
  { match: ["airtel"], key: "airtel" },
  { match: ["mpesa", "m-pesa", "vodacom"], key: "mpesa" },
  { match: ["orange"], key: "orange" },
  { match: ["mtn"], key: "mtn" },
  { match: ["moov"], key: "moov" },
  { match: ["wave"], key: "wave" },
  { match: ["free"], key: "free" },
  { match: ["touchcash", "touch cash"], key: "touchcash" },
  { match: ["africell"], key: "africell" },
  { match: ["afrimoney"], key: "afrimoney" },
  { match: ["vodafone"], key: "vodafone" },
];

export function networkKey(method: string): string {
  const value = method.toLowerCase();
  const rule = NETWORK_KEYS.find((r) => r.match.some((m) => value.includes(m)));
  return rule ? rule.key : value.trim();
}

// Ancien nom de fonction, conservé pour les routes qui l'importent encore.
export function swychrMethod(label: string): string {
  return networkKey(label).toUpperCase();
}

/** Numéro au format international sans « + » ni 0 initial (ex. 243808782440). */
export function internationalMobile(countryCode: string, raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  const dial = DIAL_CODES[countryCode.toUpperCase()];
  if (!dial) return digits.replace(/^0+/, "");

  if (digits.startsWith(dial) && digits.length > dial.length) {
    digits = digits.slice(dial.length);
  }
  return `${dial}${digits.replace(/^0+/, "")}`;
}

/** Alias conservé pour la route collect. */
export function localMobile(countryCode: string, mobile: string): string {
  return internationalMobile(countryCode, mobile);
}

/**
 * Montant final envoyé au prestataire. Avec clientFee, le client paie 2,5 % de plus.
 * Renvoie un entier pour les devises sans décimales.
 */
export function computeTotal(amount: number, countryCode: string, clientFee: boolean, rate: number = CLIENT_FEE_RATE): number {
  const currency = CURRENCY_BY_COUNTRY[countryCode.toUpperCase()] ?? "";
  const decimal = DECIMAL_CURRENCIES.has(currency);
  const round = (v: number) => (decimal ? Math.round(v * 100) / 100 : Math.ceil(v));
  return round(clientFee ? amount * (1 + rate) : amount);
}

type ApiResult = { ok: true; data: Record<string, unknown> } | { ok: false; message: string; status?: number };

async function callSwychr(path: string, body: Record<string, unknown>, apiKey: string): Promise<ApiResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      message: timeout
        ? "Le prestataire met trop de temps à répondre."
        : "Impossible de contacter le prestataire de paiement.",
    };
  }

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = {};
  }

  if (!res.ok) {
    const message =
      (typeof json["message"] === "string" && json["message"]) ||
      text.slice(0, 300) ||
      `Erreur SwyChr (${res.status})`;
    console.error("[swychr]", path, res.status, message);
    return { ok: false, message, status: res.status };
  }
  return { ok: true, data: json };
}

/**
 * Code de moyen de paiement tel qu'attendu par SwyChr pour ce pays.
 * Consulte payout_methods ; à défaut, utilise le nom normalisé.
 */
export async function resolvePaymentMethod(countryCode: string, label: string, apiKey: string): Promise<string> {
  const key = networkKey(label);
  const result = await callSwychr("/api/payout/payout_methods", { country_code: countryCode }, apiKey);
  if (result.ok) {
    const container =
      result.data["data"] && typeof result.data["data"] === "object" && !Array.isArray(result.data["data"])
        ? (result.data["data"] as Record<string, unknown>)
        : result.data;
    const list: unknown[] =
      (Array.isArray(container["payment_methods"]) && (container["payment_methods"] as unknown[])) ||
      (Array.isArray(container["methods"]) && (container["methods"] as unknown[])) ||
      (Array.isArray(result.data["data"]) && (result.data["data"] as unknown[])) ||
      [];

    for (const entry of list) {
      const item = typeof entry === "string" ? { code: entry } : (entry as Record<string, unknown>);
      const code = String(item["payment_method"] ?? item["method"] ?? item["code"] ?? item["name"] ?? "");
      const haystack = `${code} ${item["name"] ?? ""} ${item["label"] ?? ""}`.toLowerCase();
      if (code && haystack.includes(key)) return code;
    }
  }
  return swychrMethod(label);
}

export type PaymentRequestInput = {
  country_code: string;
  name: string;
  email?: string;
  mobile: string;
  transaction_id: string;
  /** Montant avant frais. */
  amount: number;
  payment_method: string;
  description: string;
  /** true : ajoute 2,5 % à la charge du client (pages de paiement). */
  clientFee?: boolean;
  /** Ignoré : conservé pour compatibilité avec les anciens appels. */
  pass_digital_charge?: boolean;
  callback_url?: string;
};

export type PaymentRequestResult =
  | { ok: true; paymentLink: string; swychrReference: string | null }
  | { ok: false; message: string };

function pickLink(data: Record<string, unknown>): string | null {
  // Seuls les champs de PAIEMENT sont acceptés. Un champ générique (url, payment_uuid) peut pointer
  // vers l'espace administrateur du prestataire : on ne le suit jamais.
  const candidates = [data["payment_link"], data["payment_url"], data["checkout_url"]];
  for (const value of candidates) {
    if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  }
  return null;
}

/**
 * Crée le lien de paiement hébergé. Le client doit être redirigé vers paymentLink.
 */
export async function createSwychrPaymentRequest(
  input: PaymentRequestInput,
  apiKey: string,
): Promise<PaymentRequestResult> {
  if (!apiKey) return { ok: false, message: "Clé API SwyChr manquante." };

  const country = input.country_code.toUpperCase();
  const currency = CURRENCY_BY_COUNTRY[country];
  if (!currency) return { ok: false, message: "Pays non pris en charge." };

  const mobile = internationalMobile(country, input.mobile);
  const key = networkKey(input.payment_method);

  const payload: Record<string, unknown> = {
    country_code: country,
    payment_method: input.payment_method,
    network: key,
    operator: key,
    name: input.name,
    transaction_id: input.transaction_id,
    amount: computeTotal(input.amount, country, Boolean(input.clientFee)),
    currency,
    email: input.email || DEFAULT_EMAIL,
    mobile,
    phone_number: mobile,
    description: input.description,
    pass_digital_charge: false,
    ...(input.callback_url ? { callback_url: input.callback_url } : {}),
  };

  const result = await callSwychr("/api/payin/create_payment_links", payload, apiKey);
  if (!result.ok) return { ok: false, message: result.message };

  const raw = result.data;
  const status = typeof raw["status"] === "number" ? (raw["status"] as number) : 200;
  const data =
    raw["data"] && typeof raw["data"] === "object" && !Array.isArray(raw["data"])
      ? (raw["data"] as Record<string, unknown>)
      : {};

  const link = pickLink(data);
  if (status >= 400 || !link) {
    return {
      ok: false,
      message:
        (typeof raw["message"] === "string" && raw["message"]) || "Impossible de créer le lien de paiement.",
    };
  }

  return {
    ok: true,
    paymentLink: link,
    swychrReference: data["id"] != null ? String(data["id"]) : null,
  };
}
