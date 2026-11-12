// Blocage d'un compte marchand, vérifié côté serveur avant tout paiement ou retrait.
// suspended : aucun paiement (liens, API, abonnements) ni retrait.
// banned    : aucun retrait jusqu'à la date de fin ; les paiements reçus restent bloqués aussi.
type AdminLike = { from: (table: string) => any };

export async function accountBlock(admin: AdminLike, ownerId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("account_status, banned_until").eq("id", ownerId).maybeSingle();
  if (!data) return null;
  if (data.account_status === "suspended") return "Ce compte est suspendu. Les paiements et retraits sont bloqués.";
  if (data.account_status === "banned" && data.banned_until && new Date(data.banned_until) > new Date()) {
    const until = new Date(data.banned_until).toLocaleDateString("fr-FR");
    return `Ce compte est bloqué jusqu’au ${until}. Les retraits sont bloqués.`;
  }
  return null;
}
