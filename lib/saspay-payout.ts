// FLASH PAY — SASPAY — envoi d'un virement mobile money (payout).
// Serveur uniquement. L'API payout exige une adresse IP whitelistée côté SasPay.
import { randomUUID } from "node:crypto";

const BASE_URL = "https://api.saspay.me/api/v1";

// Préfixe réseau SasPay selon l'opérateur choisi par le client.
const NETWORK_BASE: { match: string[]; code: string }[] = [
  { match: ["airtel"], code: "airtel" },
  { match: ["mpesa", "m-pesa", "vodacom"], code: "mpesa" },
  { match: ["orange"], code: "orange" },
  { match: ["mtn"], code: "mtn" },
  { match: ["moov"], code: "moov" },
  { match: ["wave"], code: "wave" },
  { match: ["africell"], code: "africell" },
  { match: ["vodafone"], code: "vodafone" },
];

export function saspayPayoutNetwork(operatorLabel: string, countryCode: string): string {
  const value = operatorLabel.toLowerCase();
  const rule = NETWORK_BASE.find((r) => r.match.some((m) => value.includes(m)));
  const base = rule ? rule.code : value.replace(/\s+/g, "");
  return `${base}_${countryCode.toLowerCase()}`;
}

export type PayoutInput = {
  amount: number;
  currency: string;
  countryCode: string;
  operator: string;
  /** Numéro international, chiffres seuls. */
  phone: string;
  name: string;
  description: string;
  reference: string;
};

export type PayoutResult =
  | { ok: true; providerId: string | null }
  | { ok: false; message: string };

/**
 * POST /payouts/initialize/ — à valider avec la page « Initier un payout » de la documentation SasPay.
 * Le corps ci-dessous suit le même modèle que le paiement direct ; les champs exacts sont à confirmer.
 */
export async function sendSaspayPayout(input: PayoutInput, apiKey: string): Promise<PayoutResult> {
  if (!apiKey) return { ok: false, message: "Clé API SasPay manquante." };

  const parts = input.name.trim().split(/\s+/);
  const body = {
    amount: input.amount.toFixed(2),
    currency: input.currency,
    country: input.countryCode.toUpperCase(),
    network: saspayPayoutNetwork(input.operator, input.countryCode),
    description: input.description,
    reference: input.reference,
    recipient: {
      first_name: parts[0] || "Bénéficiaire",
      last_name: parts.slice(1).join(" ") || "FlashPay",
      phone: `+${input.phone}`,
    },
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/payouts/initialize/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return { ok: false, message: "Impossible de contacter SasPay." };
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
      (typeof json["message"] === "string" && json["message"]) || `Erreur SasPay (${res.status})`;
    return { ok: false, message };
  }

  const data =
    json["data"] && typeof json["data"] === "object" && !Array.isArray(json["data"])
      ? (json["data"] as Record<string, unknown>)
      : json;
  const providerId = data["id"] ?? null;
  return { ok: true, providerId: providerId != null ? String(providerId) : null };
}
