// FLASH PAY — routage automatique par pays.
// Paiement direct (SasPay) : le client reste dans l'application.
// Redirection (Swychr) : le client est envoyé sur la page de paiement, puis revient.
export const SASPAY_COUNTRIES = new Set([
  "BF", "BJ", "CD", "CI", "CM", "GH", "GN", "KE", "ML", "MW",
  "NE", "NG", "RW", "SN", "TG", "TZ", "UG", "ZM",
]);

export const SWYCHR_COUNTRIES = new Set([
  "CM", "CI", "NG", "GH", "ML", "BF", "BJ", "KE", "UG", "TZ", "RW",
]);

export type Provider = "saspay" | "swychr";

export function routeProvider(countryCode: string): Provider {
  const c = countryCode.toUpperCase();
  if (SASPAY_COUNTRIES.has(c)) return "saspay";
  if (SWYCHR_COUNTRIES.has(c)) return "swychr";
  return "swychr";
}

export const MIN_WITHDRAWAL_SASPAY_FCFA = 3000;
export const MIN_WITHDRAWAL_SWYCHR_FCFA = 1500;

export function withdrawalMinimumFcfa(countryCode: string): number {
  return routeProvider(countryCode) === "saspay" ? MIN_WITHDRAWAL_SASPAY_FCFA : MIN_WITHDRAWAL_SWYCHR_FCFA;
}
