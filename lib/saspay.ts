// FLASH PAY — SASPAY — paiement direct (softpay) et vérification des webhooks.
// Serveur uniquement : SASPAY_API_KEY ne doit jamais être exposée au navigateur.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { resolveSaspayNetwork } from "@/lib/saspay-networks";

const BASE_URL = "https://api.saspay.me/api/v1";
const TOLERANCE_SECONDS = 300;

// Nom d'opérateur -> préfixe réseau SasPay. Le suffixe pays est ajouté automatiquement (ex. mtn_bj).
const NETWORK_BASE: { match: string[]; code: string }[] = [
  { match: ["airtel"], code: "airtel" },
  { match: ["mpesa", "m-pesa", "vodacom"], code: "mpesa" },
  { match: ["orange"], code: "orange" },
  { match: ["mtn"], code: "mtn" },
  { match: ["moov"], code: "moov" },
  { match: ["wave"], code: "wave" },
  { match: ["africell"], code: "africell" },
  { match: ["vodafone"], code: "vodafone" },
  { match: ["free"], code: "free" },
];

export function saspayNetwork(operatorLabel: string, countryCode: string): string {
  const value = operatorLabel.toLowerCase();
  const rule = NETWORK_BASE.find((r) => r.match.some((m) => value.includes(m)));
  const base = rule ? rule.code : value.replace(/\s+/g, "");
  return `${base}_${countryCode.toLowerCase()}`;
}

export type SaspayCollectInput = {
  amount: number;
  currency: string;
  countryCode: string;
  operatorLabel: string;
  description: string;
  name: string;
  email: string;
  /** Numéro international, chiffres seuls (ex. 243808782440). */
  phone: string;
};

export type SaspayCollectResult =
  | { ok: true; providerId: string | null; reference: string | null; raw: Record<string, unknown> }
  | { ok: false; message: string };

/** POST /payments/softpay/ — le client valide sur son téléphone, sans quitter FlashPay. */
export async function createSaspayPayment(input: SaspayCollectInput, apiKey: string): Promise<SaspayCollectResult> {
  if (!apiKey) return { ok: false, message: "Clé API SasPay manquante." };

  // Code réseau issu de la liste officielle SasPay (GET /networks/), jamais deviné.
  const network = await resolveSaspayNetwork(input.countryCode, input.operatorLabel, apiKey);
  if (!network) {
    return {
      ok: false,
      message: `Aucun réseau SasPay pour ${input.countryCode.toUpperCase()} / ${input.operatorLabel}. Vérifie que ce pays et cet opérateur sont activés sur ton compte SasPay.`,
    };
  }

  const parts = input.name.trim().split(/\s+/);
  const body = {
    amount: input.amount.toFixed(2),
    currency: input.currency,
    country: input.countryCode.toUpperCase(),
    network,
    description: input.description,
    customer: {
      email: input.email,
      first_name: parts[0] || "Client",
      last_name: parts.slice(1).join(" ") || "FlashPay",
      phone: `+${input.phone}`,
    },
  };

  const paths = ["/payments/softpay/", "/payments/softpay/initialize/"];
  let res!: Response;
  try {
    for (const path of paths) {
      res = await fetch(`${BASE_URL}${path}`, {
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
      if (res.status !== 404) break; // 404 : on essaie le chemin suivant
    }
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      message: timeout ? "SasPay met trop de temps à répondre." : "Impossible de contacter SasPay.",
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
    const envelope = json["error"] && typeof json["error"] === "object" ? (json["error"] as Record<string, unknown>) : null;
    const businessMessage = envelope && typeof envelope["message"] === "string" ? envelope["message"] : null;
    const businessCode = envelope && typeof envelope["code"] === "string" ? envelope["code"] : null;

    // Erreur de validation : { "champ": ["message"] }
    const fieldErrors = Object.entries(json)
      .filter(([k, v]) => k !== "error" && k !== "success" && k !== "code" && Array.isArray(v))
      .map(([k, v]) => `${k} : ${(v as unknown[]).join(", ")}`);

    const detail = [businessMessage, businessCode ? `(${businessCode})` : null, fieldErrors.length ? fieldErrors.join(" ; ") : null]
      .filter(Boolean)
      .join(" ");

    const message = `SasPay ${res.status} : ${detail || text.slice(0, 200) || "requête refusée"}`;
    console.error("[saspay] softpay", res.status, text.slice(0, 1000));
    return { ok: false, message };
  }

  const data =
    json["data"] && typeof json["data"] === "object" && !Array.isArray(json["data"])
      ? (json["data"] as Record<string, unknown>)
      : json;

  const providerId = data["id"] ?? data["payment_id"] ?? null;
  const reference = data["reference"] ?? null;

  return {
    ok: true,
    providerId: providerId != null ? String(providerId) : null,
    reference: reference != null ? String(reference) : null,
    raw: json,
  };
}

/** Vérifie X-Webhook-Signature sur le corps brut, avec contrôle d'âge (5 minutes). */
export function verifySaspaySignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) return false;
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
