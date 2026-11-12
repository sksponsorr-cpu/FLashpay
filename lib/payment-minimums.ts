// Montant minimum de paiement (encaissement) par devise, en unité de la devise.
// null = aucun minimum appliqué côté FlashPay (le prestataire reste juge).
// TODO : définir les minimums réels par devise avec l'équipe. Ne pas confondre avec
// les minimums de retrait (lib/payment-routing.ts, table withdrawal_minimums).
// Minimum d’encaissement (créé ou payé) par devise. CDF : 800.
const PAYMENT_MINIMUMS: Record<string, number> = { CDF: 800 };

export function minimumFor(currency: string): number | null {
  return PAYMENT_MINIMUMS[currency.toUpperCase()] ?? null;
}
