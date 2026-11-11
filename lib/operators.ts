// Opérateurs de paiement mobile par pays (code ISO). Source unique pour l'abonnement,
// les retraits et le portefeuille : un pays ne voit que ses propres opérateurs.
export const OPERATORS_BY_COUNTRY: Record<string, string[]> = {
  CD: ["Airtel Money", "Orange Money", "M-Pesa", "Afrimoney", "Africell Money"],
  CG: ["MTN MoMo", "Airtel Money"],
  CM: ["MTN MoMo", "Orange Money", "Airtel Money"],
  SN: ["Orange Money", "Wave", "Free Money", "Wizall", "Expresso"],
  CI: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"],
  BF: ["Orange Money", "Moov Money"],
  BJ: ["MTN MoMo", "Moov Money"],
  TG: ["Moov Money", "Togocel Money"],
  ML: ["Orange Money", "Moov Money"],
  RW: ["MTN MoMo", "Airtel Money"],
  KE: ["M-Pesa", "Airtel Money"],
  GH: ["MTN MoMo", "Vodafone Cash"],
  TZ: ["Airtel Money", "M-Pesa", "Tigo Pesa", "Halopesa", "EzyPesa", "TTCL"],
  UG: ["MTN MoMo"],
  SL: ["Orange Money"],
  ZM: ["Airtel Money", "MTN MoMo", "Zamtel Kwacha"],
  NG: [],
};

export const OPERATOR_ICONS: Record<string, string> = {
  "MTN MoMo": "📱",
  "Orange Money": "🟠",
  "Moov Money": "🔵",
  Wave: "🌊",
  "Airtel Money": "🔴",
};

export function operatorsFor(countryCode: string | undefined | null): string[] {
  return OPERATORS_BY_COUNTRY[(countryCode ?? "").toUpperCase()] ?? [];
}
