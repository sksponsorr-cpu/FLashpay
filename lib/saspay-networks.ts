// FLASH PAY — SASPAY — codes réseau, tirés du catalogue officiel « Pays, réseaux et format du téléphone ».
// Le code envoyé à SasPay est exactement celui du catalogue (ex. orange_cd, moov_tg, togocel).
// Les réseaux marqués « inactif » dans la documentation sont exclus.

type Option = { label: string[]; code: string };

// Clé : code ISO du pays. Pour chaque moyen proposé dans l'application, le code SasPay correspondant.
const CATALOGUE: Record<string, Option[]> = {
  BF: [
    { label: ["orange"], code: "orange_bf" },
    { label: ["moov"], code: "moov_bf" },
  ],
  BJ: [
    { label: ["mtn"], code: "mtn_bj" },
    { label: ["moov"], code: "moov_bj" },
    { label: ["celtiis"], code: "celtiis_bj" },
  ],
  CD: [
    { label: ["airtel"], code: "airtel_cd" },
    { label: ["orange"], code: "orange_cd" },
    { label: ["mpesa", "m-pesa", "vodacom"], code: "vodacom_cd" },
  ],
  CI: [
    { label: ["orange"], code: "orange_ci" },
    { label: ["mtn"], code: "mtn_ci" },
    { label: ["moov"], code: "moov_ci" },
    { label: ["wave"], code: "wave_ci" },
  ],
  CM: [
    { label: ["mtn"], code: "mtn_cm" },
    { label: ["orange"], code: "orange_cm" },
  ],
  GH: [
    { label: ["mtn"], code: "mtn_gh" },
    { label: ["tigo", "airtel"], code: "tigo_gh" },
    { label: ["vodafone"], code: "vodafone_gh" },
  ],
  GN: [{ label: ["mtn"], code: "mtn_gn" }],
  KE: [{ label: ["mpesa", "m-pesa"], code: "mpesa_ke" }],
  ML: [
    { label: ["orange"], code: "orange_ml" },
    { label: ["moov"], code: "moov_ml" },
    { label: ["mobi"], code: "mobi_cash_ml" },
  ],
  MW: [
    { label: ["airtel"], code: "airtel_mw" },
    { label: ["tnm", "mpamba"], code: "tnm_mw" },
  ],
  NE: [{ label: ["airtel"], code: "airtel_ne" }],
  NG: [
    { label: ["mtn"], code: "mtn_ng" },
    { label: ["airtel"], code: "airtel_ng" },
  ],
  RW: [
    { label: ["mtn"], code: "mtn_rw" },
    { label: ["airtel"], code: "airtel_rw" },
  ],
  SN: [
    { label: ["orange"], code: "orange_sn" },
    { label: ["wave"], code: "wave_sn" },
    { label: ["free"], code: "freemoney_sn" },
    { label: ["wizall"], code: "wizall_sn" },
  ],
  TG: [
    { label: ["moov"], code: "moov_tg" },
    { label: ["togocel"], code: "togocel" },
  ],
  TZ: [
    { label: ["airtel"], code: "airtel_tz" },
    { label: ["halopesa"], code: "halopesa_tz" },
    { label: ["mpesa", "vodacom"], code: "mpesa_tz" },
    { label: ["tigo"], code: "tigo_tz" },
  ],
  UG: [
    { label: ["airtel"], code: "airtel_ug" },
    { label: ["mtn"], code: "mtn_ug" },
  ],
  ZM: [
    { label: ["airtel"], code: "airtel_zm" },
    { label: ["mtn"], code: "mtn_zm" },
    { label: ["zamtel"], code: "zamtel_zm" },
  ],
};

/** Code SasPay exact pour un pays ISO et un libellé d'opérateur, ou null si non disponible. */
export async function resolveSaspayNetwork(countryIso: string, operatorLabel: string, _apiKey: string): Promise<string | null> {
  const options = CATALOGUE[countryIso.toUpperCase()] ?? [];
  const label = operatorLabel.toLowerCase();
  const hit = options.find((o) => o.label.some((l) => label.includes(l)));
  return hit ? hit.code : null;
}

/** Diagnostic : réseaux disponibles pour le pays, selon le catalogue. */
export async function describeNetworks(countryIso: string, _apiKey: string): Promise<string> {
  const options = CATALOGUE[countryIso.toUpperCase()] ?? [];
  return options.length ? `réseaux catalogue pour ${countryIso.toUpperCase()} : ${options.map((o) => o.code).join(", ")}` : `aucun réseau au catalogue pour ${countryIso.toUpperCase()}`;
}

/** Opérateurs SasPay acceptés pour un pays, sous forme de valeurs à envoyer dans payment_method. */
export function saspayOperatorsFor(countryIso: string): string[] {
  const options = CATALOGUE[countryIso.toUpperCase()] ?? [];
  return options.map((o) => o.label[0].toUpperCase());
}
