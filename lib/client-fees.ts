// FLASH PAY — frais payés par le CLIENT, ajoutés au montant du lien de paiement.
// Taux = taux du réseau choisi (tableau SasPay « Encaissement »). Pays sans taux renseigné : 5,5 %.
// Les frais FlashPay de 6 % restent prélevés sur l'encaissement du marchand (inchangé).
import { FEE_SCHEDULE, FLASHPAY_MARGIN_POINTS, clientPercent, type NetworkFee } from "@/lib/fee-schedule";

export const DEFAULT_CLIENT_FEE_PERCENT = 5.5;

const NAME_BY_ISO: Record<string, string> = {
  CD: "République démocratique du Congo",
  CG: "Congo-Brazzaville",
  CM: "Cameroun",
  CI: "Côte d’Ivoire",
  BF: "Burkina Faso",
  BJ: "Bénin",
  ML: "Mali",
  GH: "Ghana",
  KE: "Kenya",
  NG: "Nigeria",
  RW: "Rwanda",
  SN: "Sénégal",
  TZ: "Tanzanie",
  UG: "Ouganda",
  SL: "Sierra Leone",
  TG: "Togo",
  ZM: "Zambie",
};

const CURRENCY_BY_ISO: Record<string, string> = {
  CD: "CDF", CG: "XAF", CM: "XAF", CI: "XOF", BF: "XOF", BJ: "XOF", ML: "XOF", SN: "XOF", TG: "XOF",
  GH: "GHS", KE: "KES", NG: "NGN", RW: "RWF", TZ: "TZS", UG: "UGX", SL: "SLE", ZM: "ZMW",
};

// Mot-clé du réseau (opérateur envoyé par le client ou le catalogue SasPay) -> nom présent dans la grille.
const ALIASES: Record<string, string> = {
  mpesa: "vodacom", "m-pesa": "vodacom", vodacom: "vodacom",
  airtel: "airtel", orange: "orange", mtn: "mtn", moov: "moov", wave: "wave",
  afrimoney: "afrimoney", africell: "africell", expresso: "expresso", free: "free",
  wizall: "wizall", togocel: "togocel", tigo: "tigo", halopesa: "halopesa",
  ttcl: "ttcl", ezypesa: "ezypesa", zamtel: "zamtel", vodafone: "vodafone",
};

function normalize(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Minimum affiché (« 0,03 USD », « 44 CDF ») converti en nombre dans la devise du pays. */
export function parseMinimum(minimum: string | undefined): number | null {
  if (!minimum) return null;
  const value = parseFloat(minimum.replace(",", ".").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : null;
}

export type ClientFee = { percent: number; minimum: number | null; network: NetworkFee | null };

/** Frais client pour un pays et un opérateur. Retombe sur 5,5 % si le réseau n'est pas dans la grille. */
export function clientFeeFor(countryIso: string, operator: string | null | undefined, currencyOverride?: string, margin: number = FLASHPAY_MARGIN_POINTS): ClientFee {
  const iso = countryIso.toUpperCase();
  const countryName = NAME_BY_ISO[iso];
  // La devise du lien prime (ex. RDC en USD ou en CDF : deux lignes de grille distinctes).
  const currency = currencyOverride ?? CURRENCY_BY_ISO[iso];
  const key = normalize(operator ?? "").split(/\s+/)[0] ?? "";
  const alias = ALIASES[key] ?? ALIASES[normalize(operator ?? "")] ?? key;

  if (countryName && currency && alias) {
    const entry = FEE_SCHEDULE.find((c) => c.country === countryName && c.currency === currency);
    const network = entry?.networks.find((n) => normalize(n.network).includes(alias)) ?? null;
    if (network) return { percent: clientPercent(network.percent, margin), minimum: parseMinimum(network.minimum), network };
  }
  return { percent: clientPercent(DEFAULT_CLIENT_FEE_PERCENT, margin), minimum: null, network: null };
}

/** Nom de pays affiché -> code ISO (inverse de NAME_BY_ISO), pour la page de paiement. */
export const ISO_BY_COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_BY_ISO).map(([iso, name]) => [name, iso])
);

/** Réseaux proposés pour un pays et une devise : exactement ceux de la grille tarification. */
export function networksFor(countryName: string, currency: string): NetworkFee[] {
  const entry = FEE_SCHEDULE.find((c) => c.country === countryName && c.currency === currency);
  return entry ? entry.networks : [];
}
