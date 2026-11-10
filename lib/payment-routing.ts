// FLASH PAY — routage automatique par pays. Le marchand n’a rien à choisir : le pays décide du mode.
// Paiement direct SasPay (le client reste dans l’application, valide sur son téléphone) : RDC, Burkina Faso, Bénin, Mali, Togo.
// Paiement hébergé Swychr (le client est redirigé vers la page de paiement) : Cameroun, Congo, Sénégal, Côte d’Ivoire, Nigeria, Rwanda, Ghana, Kenya.
export const SASPAY_DIRECT_COUNTRIES = new Set(["BF", "BJ", "CD", "ML", "TG"]);

export const SWYCHR_COUNTRIES = new Set([
  "CM", "CG", "CI", "NG", "GH", "SN", "KE", "UG", "TZ", "RW",
]);

export const SASPAY_COUNTRIES = new Set([
  "BF", "BJ", "CD", "CI", "CM", "GH", "GN", "KE", "ML", "MW",
  "NE", "NG", "RW", "SN", "TG", "TZ", "UG", "ZM",
]);

export type Provider = "saspay" | "swychr";

export function routeProvider(countryCode: string): Provider {
  const c = countryCode.toUpperCase();
  if (SASPAY_DIRECT_COUNTRIES.has(c)) return "saspay";
  if (SWYCHR_COUNTRIES.has(c)) return "swychr";
  if (SASPAY_COUNTRIES.has(c)) return "saspay";
  return "swychr";
}

// Retrait minimum en FCFA (équivalent) :
// - paiement direct (SasPay) : 3 000 FCFA.
// - redirection (Swychr) : 1 500 FCFA.
export const MIN_WITHDRAWAL_SASPAY_FCFA = 3000;
export const MIN_WITHDRAWAL_SWYCHR_FCFA = 1500;

export function withdrawalMinimumFcfa(countryCode: string): number {
  return routeProvider(countryCode) === "saspay" ? MIN_WITHDRAWAL_SASPAY_FCFA : MIN_WITHDRAWAL_SWYCHR_FCFA;
}
