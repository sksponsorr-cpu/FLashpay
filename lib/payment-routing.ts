// FLASH PAY — routage automatique par pays.
// Paiement direct (SasPay) : le client reste dans l'application.
// Redirection (Swychr) : le client est envoyé sur la page de paiement, puis revient.
// Paiement direct (SasPay) : RDC, Congo-Brazzaville, Burkina Faso, Bénin, Mali, Sénégal.
export const SASPAY_COUNTRIES = new Set(["CD", "CG", "BF", "BJ", "ML", "SN"]);

// Tous les autres pays : lien de redirection Swychr (ex. Cameroun).
export const SWYCHR_COUNTRIES = new Set([
  "CM", "CI", "GH", "KE", "NG", "RW", "SL", "TG", "TZ", "UG", "ZM",
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
