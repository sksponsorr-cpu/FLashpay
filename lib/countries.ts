export const SUPPORTED_COUNTRIES = [
  { code: "CM", name: "Cameroun", currency: "XAF" },
  { code: "CD", name: "République démocratique du Congo", currency: "CDF" },
  { code: "CG", name: "Congo-Brazzaville", currency: "XAF" },
  { code: "SN", name: "Sénégal", currency: "XOF" },
  { code: "BF", name: "Burkina Faso", currency: "XOF" },
  { code: "BJ", name: "Bénin", currency: "XOF" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "RW", name: "Rwanda", currency: "RWF" },
  { code: "CI", name: "Côte d’Ivoire", currency: "XOF" },
  { code: "TG", name: "Togo", currency: "XOF" },
  { code: "ML", name: "Mali", currency: "XOF" },
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "TZ", name: "Tanzanie", currency: "TZS" },
  { code: "UG", name: "Ouganda", currency: "UGX" },
  { code: "SL", name: "Sierra Leone", currency: "SLE" },
  { code: "ZM", name: "Zambie", currency: "ZMW" },
] as const;

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRIES)[number]["code"];

export function getSupportedCountry(code: string | undefined) {
  return SUPPORTED_COUNTRIES.find((country) => country.code === code?.toUpperCase());
}
