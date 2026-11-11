// Indicatif téléphonique par pays (ISO). Sert à guider la saisie du numéro mobile.
export const CALLING_CODE: Record<string, string> = {
  CD: "+243", CG: "+242", CM: "+237", SN: "+221", CI: "+225", BF: "+226", BJ: "+229",
  ML: "+223", TG: "+228", TZ: "+255", UG: "+256", RW: "+250", KE: "+254", GH: "+233",
  NG: "+234", ZM: "+260", SL: "+232",
};

export function callingCodeFor(countryIso: string | undefined | null): string {
  return CALLING_CODE[(countryIso ?? "").toUpperCase()] ?? "";
}

/** Numéro saisi : chiffres uniquement, sans indicatif ni espaces (l'indicatif du pays est ajouté ailleurs). */
export function normalizeMobile(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
}
