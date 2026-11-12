// Messages destinés au client : jamais le nom du prestataire ni le texte brut de son API.
export function customerMessage(raw: string | undefined): string {
  const text = raw ?? "";
  const min = text.match(/minimum[^0-9]*([0-9][0-9 .,]*)\s*([A-Z]{3})/i);
  if (min) return `Le montant minimum est de ${min[1].trim()} ${min[2]}.`;
  if (/minimum/i.test(text)) return "Le montant saisi est trop faible pour ce moyen de paiement.";
  return "Le paiement n’a pas pu être lancé. Réessaie dans un instant.";
}
