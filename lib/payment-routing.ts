// FLASH PAY — routage automatique par pays.
// Swychr : lien hébergé (le client est redirigé). Pays confirmés par le support Swychr.
// SasPay : paiement direct (le client reste dans l'application). Autres pays de la liste SasPay.
export const SWYCHR_COUNTRIES = new Set([
  "CM", "CI", "NG", "GH", "SN", "ML", "BF", "BJ", "KE", "UG", "TZ", "RW",
]);

export const SASPAY_COUNTRIES = new Set([
  "BF", "BJ", "CD", "CI", "CM", "GH", "GN", "KE", "ML", "MW",
  "NE", "NG", "RW", "SN", "TG", "TZ", "UG", "ZM",
]);

export type Provider = "saspay" | "swychr";

export function routeProvider(countryCode: string): Provider {
  const c = countryCode.toUpperCase();
  if (SWYCHR_COUNTRIES.has(c)) return "swychr";
  if (SASPAY_COUNTRIES.has(c)) return "saspay";
  return "swychr";
}

// Retrait minimum en FCFA (équivalent) :
// - paiement direct (SasPay) : 3 000 FCFA. Pour la RDC, 10 000 CDF étaient inférieurs à 3 000 FCFA,
//   donc le minimum est relevé à 3 000 FCFA (environ 12 120 CDF).
// - redirection (Swychr) : 1 500 FCFA.
export const MIN_WITHDRAWAL_SASPAY_FCFA = 3000;
export const MIN_WITHDRAWAL_SWYCHR_FCFA = 1500;

export function withdrawalMinimumFcfa(countryCode: string): number {
  return routeProvider(countryCode) === "saspay" ? MIN_WITHDRAWAL_SASPAY_FCFA : MIN_WITHDRAWAL_SWYCHR_FCFA;
}
