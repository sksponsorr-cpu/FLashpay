// FLASH PAY — grille des frais par pays et par réseau.
// Source : tableau SasPay « Encaissement » (mode « ajoutés », payé par le client en plus du montant).
// Les frais affichés à l'client = frais SasPay + marge FlashPay.

// Marge FlashPay ajoutée à chaque réseau, en points de pourcentage.
// À ajuster ici uniquement : toute la page tarification se met à jour.
export const FLASHPAY_MARGIN_POINTS = 5;

export type NetworkFee = {
  network: string;
  percent: number;          // frais SasPay en %
  extra?: string;           // frais fixe ou complément (ex. « + 100 XOF »)
  minimum: string;          // frais minimum, tel qu'affiché par SasPay
};

export type CountryFees = {
  country: string;
  currency: string;
  networks: NetworkFee[];
};

export const FEE_SCHEDULE: CountryFees[] = [
  {
    country: "République démocratique du Congo",
    currency: "USD",
    networks: [
      { network: "Airtel Congo", percent: 4.7, minimum: "0,03 USD" },
      { network: "Orange Congo", percent: 4.7, minimum: "0,03 USD" },
      { network: "Vodacom Congo", percent: 4.2, minimum: "0,03 USD" },
    ],
  },
  {
    country: "République démocratique du Congo",
    currency: "CDF",
    networks: [
      { network: "Afrimoney Congo", percent: 5.5, minimum: "44 CDF" },
      { network: "Airtel Congo", percent: 4.7, minimum: "38 CDF" },
      { network: "Orange Congo", percent: 5.45, minimum: "44 CDF" },
      { network: "Vodacom Congo", percent: 4.2, minimum: "34 CDF" },
    ],
  },
  {
    country: "Tanzanie",
    currency: "TZS",
    networks: [
      { network: "Airtel Tanzania", percent: 5, minimum: "47 TZS" },
      { network: "EzyPesa Tanzania", percent: 4.5, minimum: "42 TZS" },
      { network: "Halopesa", percent: 5, minimum: "47 TZS" },
      { network: "TTCL Tanzania", percent: 4.5, minimum: "42 TZS" },
      { network: "Tigo Tanzania", percent: 5, minimum: "47 TZS" },
      { network: "Vodacom Tanzania", percent: 5, minimum: "47 TZS" },
    ],
  },
  {
    country: "Ouganda",
    currency: "UGX",
    networks: [{ network: "MTN MoMo Uganda", percent: 4.7, minimum: "66 UGX" }],
  },
  {
    country: "Sénégal",
    currency: "XOF",
    networks: [
      { network: "Expresso Sénégal", percent: 3.9, extra: "+ 100 XOF", minimum: "108 XOF" },
      { network: "Free Money Senegal", percent: 5.05, minimum: "11 XOF" },
      { network: "Orange Money Senegal", percent: 5.15, minimum: "11 XOF" },
      { network: "Wave Senegal", percent: 5.15, minimum: "11 XOF" },
      { network: "Wizall Senegal", percent: 3.5, minimum: "7 XOF" },
    ],
  },
  {
    country: "Sierra Leone",
    currency: "SLE",
    networks: [{ network: "Orange Sierra Leone", percent: 5, minimum: "2 SLE" }],
  },
  {
    country: "Togo",
    currency: "XOF",
    networks: [
      { network: "Moov Money Togo", percent: 4.1, minimum: "9 XOF" },
      { network: "Togocel Money", percent: 4.1, minimum: "9 XOF" },
    ],
  },
  {
    country: "Zambie",
    currency: "ZMW",
    networks: [
      { network: "Airtel Zambia", percent: 5.5, minimum: "2 ZMW" },
      { network: "MTN MoMo Zambia", percent: 3.5, extra: "+ 8 ZMW", minimum: "10 ZMW" },
      { network: "Zamtel Kwacha", percent: 4.5, minimum: "2 ZMW" },
    ],
  },
  {
    country: "Rwanda",
    currency: "RWF",
    networks: [
      { network: "Airtel Rwanda", percent: 4.2, minimum: "22 RWF" },
      { network: "MTN MoMo Rwanda", percent: 4.7, minimum: "25 RWF" },
    ],
  },
];

/** Taux affiché au client : frais SasPay + marge FlashPay, arrondi à deux décimales. */
export function clientRate(percent: number): string {
  const total = Math.round((percent + FLASHPAY_MARGIN_POINTS) * 100) / 100;
  return `${total.toString().replace(".", ",")} %`;
}
