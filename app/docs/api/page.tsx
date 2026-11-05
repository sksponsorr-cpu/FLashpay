import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Documentation API | FlashPay",
  description: "Guide d’intégration de l’API FlashPay.",
};

const sections = [
  { id: "demarrage", label: "Démarrage" },
  { id: "cle", label: "Obtenir une clé" },
  { id: "auth", label: "Authentification" },
  { id: "collecte", label: "Créer une collecte" },
  { id: "notifications", label: "Notifications" },
  { id: "erreurs", label: "Codes d’erreur" },
  { id: "pays", label: "Pays et devises" },
  { id: "frais", label: "Frais" },
  { id: "production", label: "Passer en production" },
];

const css = `
  .fp-docs { min-height:100vh; width:100%; overflow-x:hidden; background:#fffaf8; color:#17211b; font-family:inherit; }
  .fp-docs * { box-sizing:border-box; min-width:0; }
  .fp-docs a { color:inherit; }
  .fp-docs-top { position:sticky; top:0; z-index:5; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px max(16px,calc((100vw - 1180px)/2)); border-bottom:1px solid #f3e3dc; background:rgba(255,255,255,.96); backdrop-filter:blur(10px); }
  .fp-docs-brand { display:flex; align-items:center; gap:9px; font-size:19px; font-weight:800; text-decoration:none; }
  .fp-docs-logo { display:grid; place-items:center; width:32px; height:32px; border-radius:10px; background:linear-gradient(145deg,#ff6a3d,#e8401f); color:white; }
  .fp-docs-brand b { color:#e8401f; }
  .fp-docs-back { color:#d93a1f!important; font-size:14px; font-weight:700; text-decoration:none; overflow-wrap:anywhere; }
  .fp-docs-layout { display:grid; grid-template-columns:230px minmax(0,1fr); gap:40px; width:min(1180px,100%); margin:0 auto; padding:32px 20px 72px; }
  .fp-docs-nav { position:sticky; top:88px; align-self:start; display:grid; gap:5px; }
  .fp-docs-nav strong { margin:0 0 7px; color:#d93a1f; font-size:12px; letter-spacing:.12em; text-transform:uppercase; }
  .fp-docs-nav a { padding:9px 11px; border-radius:10px; color:#526158; font-size:14px; text-decoration:none; overflow-wrap:anywhere; }
  .fp-docs-nav a:hover { background:#fff0eb; color:#d93a1f; }
  .fp-docs-content { width:100%; max-width:860px; overflow-wrap:anywhere; word-break:normal; }
  .fp-docs-kicker { color:#d93a1f; font-size:12px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
  .fp-docs h1 { max-width:100%; margin:10px 0 14px; font-size:clamp(30px,5vw,48px); line-height:1.08; letter-spacing:-.03em; overflow-wrap:anywhere; }
  .fp-docs h2 { margin:0 0 12px; font-size:25px; letter-spacing:-.02em; }
  .fp-docs h3 { margin:22px 0 8px; font-size:17px; }
  .fp-docs p,.fp-docs li { max-width:100%; color:#526158; font-size:15px; line-height:1.7; overflow-wrap:anywhere; }
  .fp-docs section { padding-top:38px; scroll-margin-top:85px; }
  .fp-docs ul,.fp-docs ol { padding-left:22px; }
  .fp-docs-card { margin:14px 0; padding:16px; border:1px solid #f3e3dc; border-radius:16px; background:#fff; }
  .fp-docs-note { margin:14px 0; padding:15px 16px; border:1px solid #f3e3dc; border-radius:14px; background:#fff0eb; color:#563a30; line-height:1.65; overflow-wrap:anywhere; }
  .fp-docs-note strong { color:#c83c20; }
  .fp-docs-code { max-width:100%; margin:14px 0; overflow-x:hidden; border:1px solid #38231d; border-radius:14px; background:#15110f; color:#fff1eb; }
  .fp-docs-code-head { padding:9px 14px; border-bottom:1px solid #38231d; color:#ffd0c0; font-size:12px; }
  .fp-docs-code pre { max-width:100%; margin:0; padding:14px; overflow-x:auto; white-space:pre-wrap; overflow-wrap:anywhere; word-break:break-word; font:13px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace; }
  .fp-docs-inline { padding:2px 6px; border-radius:6px; background:#fff0eb; color:#b63820; font-size:.92em; overflow-wrap:anywhere; word-break:break-word; }
  .fp-docs-table-wrap { width:100%; max-width:100%; overflow-x:auto; border:1px solid #f3e3dc; border-radius:12px; background:#fff; }
  .fp-docs table { width:100%; border-collapse:collapse; font-size:14px; }
  .fp-docs th,.fp-docs td { padding:10px 12px; border-bottom:1px solid #f3e3dc; text-align:left; vertical-align:top; overflow-wrap:anywhere; }
  .fp-docs th { color:#d93a1f; font-size:12px; text-transform:uppercase; letter-spacing:.06em; }
  .fp-docs tr:last-child td { border-bottom:0; }
  .fp-docs-footer { margin-top:48px; padding-top:18px; border-top:1px solid #f3e3dc; color:#718078!important; font-size:13px!important; }
  @media(max-width:760px) {
    .fp-docs-top { padding:11px 14px; }
    .fp-docs-layout { grid-template-columns:minmax(0,1fr); gap:18px; padding:20px 14px 48px; }
    .fp-docs-nav { position:static; display:grid; grid-template-columns:minmax(0,1fr); gap:2px; padding:12px; border:1px solid #f3e3dc; border-radius:14px; background:#fff; }
    .fp-docs-nav strong { margin-bottom:5px; }
    .fp-docs-nav a { padding:8px 9px; }
    .fp-docs h2 { font-size:22px; }
    .fp-docs section { padding-top:30px; scroll-margin-top:76px; }
  }
  @media(max-width:420px) {
    .fp-docs-layout { padding-right:12px; padding-left:12px; }
    .fp-docs-top { gap:8px; }
    .fp-docs-back { max-width:52%; text-align:right; }
    .fp-docs-card,.fp-docs-note { padding:13px; }
    .fp-docs-code pre { padding:12px; font-size:12px; }
    .fp-docs th,.fp-docs td { padding:8px; }
  }
`;

async function getBackHref() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ? "/dashboard" : "/";
  } catch {
    return "/";
  }
}

export default async function ApiDocumentationPage() {
  const backHref = await getBackHref();

  return (
    <main className="fp-docs">
      <style>{css}</style>
      <header className="fp-docs-top">
        <Link className="fp-docs-brand" href="/"><span className="fp-docs-logo">f</span><span>flash<b>pay</b></span></Link>
        <Link className="fp-docs-back" href={backHref}>← Retour à FlashPay</Link>
      </header>

      <div className="fp-docs-layout">
        <nav className="fp-docs-nav" aria-label="Sommaire de la documentation">
          <strong>Documentation API</strong>
          {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
        </nav>

        <article className="fp-docs-content">
          <span className="fp-docs-kicker">API</span>
          <h1>Intègre FlashPay dans ton application.</h1>
          <p>Crée des demandes de paiement mobile money depuis ton serveur et traite les notifications de statut. Garde tes clés secrètes et teste ton intégration avant toute mise en production.</p>

          <section id="demarrage">
            <h2>Démarrage</h2>
            <div className="fp-docs-card"><ol><li>Crée un compte FlashPay.</li><li>Génère une clé API depuis l’espace Développeur.</li><li>Envoie tes requêtes depuis ton serveur et vérifie les notifications reçues.</li></ol></div>
          </section>

          <section id="cle">
            <h2>Obtenir une clé</h2>
            <p>Crée une clé et donne-lui un nom qui identifie ton intégration. Une clé secrète n’est affichée qu’une seule fois.</p>
            <div className="fp-docs-note"><strong>Sécurité.</strong> Conserve la clé dans une variable d’environnement serveur. Ne l’intègre jamais dans le code navigateur ni dans un dépôt public.</div>
          </section>

          <section id="auth">
            <h2>Authentification</h2>
            <p>Ajoute ta clé dans l’en-tête <code className="fp-docs-inline">X-FlashPay-Key</code> de chaque requête.</p>
            <div className="fp-docs-code"><div className="fp-docs-code-head">En-tête HTTP</div><pre>{"X-FlashPay-Key: fp_test_…"}</pre></div>
          </section>

          <section id="collecte">
            <h2>Créer une collecte</h2>
            <p>Envoie une requête <code className="fp-docs-inline">POST /api/v1/collections</code> avec les données du client.</p>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>Champ</th><th>Obligatoire</th><th>Description</th></tr></thead><tbody>
              <tr><td><code>country_code</code></td><td>Oui</td><td>Code pays à deux lettres.</td></tr>
              <tr><td><code>amount</code></td><td>Oui</td><td>Montant demandé, strictement supérieur à zéro.</td></tr>
              <tr><td><code>mobile</code></td><td>Oui</td><td>Numéro de téléphone local du payeur.</td></tr>
              <tr><td><code>name</code></td><td>Oui</td><td>Nom du payeur.</td></tr>
              <tr><td><code>payment_method</code></td><td>Selon le mode</td><td>Moyen de paiement disponible dans le pays concerné.</td></tr>
              <tr><td><code>transaction_id</code></td><td>Non</td><td>Référence unique de ta commande.</td></tr>
            </tbody></table></div>
            <h3>Exemple côté serveur</h3>
            <div className="fp-docs-code"><div className="fp-docs-code-head">JavaScript · serveur</div><pre>{`const response = await fetch("/api/v1/collections", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-FlashPay-Key": process.env.FLASHPAY_API_KEY,
  },
  body: JSON.stringify({
    country_code: "CM",
    amount: 25000,
    mobile: "670000000",
    name: "Client",
  }),
});
const result = await response.json();`}</pre></div>
          </section>

          <section id="notifications">
            <h2>Notifications</h2>
            <p>FlashPay signale les changements de statut à l’adresse webhook configurée. Vérifie la signature avec le secret qui t’a été montré à sa création et rends ton traitement idempotent.</p>
            <div className="fp-docs-note"><strong>Important.</strong> Ne traite une notification qu’après validation de sa signature et du statut de la transaction.</div>
          </section>

          <section id="erreurs">
            <h2>Codes d’erreur</h2>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>Code</th><th>Signification</th><th>Action</th></tr></thead><tbody>
              <tr><td>400</td><td>Données invalides</td><td>Vérifie le corps de la requête.</td></tr>
              <tr><td>401</td><td>Clé manquante ou invalide</td><td>Vérifie l’en-tête d’authentification.</td></tr>
              <tr><td>409</td><td>Référence déjà utilisée</td><td>Envoie une référence unique.</td></tr>
              <tr><td>429</td><td>Limite de requêtes dépassée</td><td>Attends avant de réessayer.</td></tr>
              <tr><td>503</td><td>Service indisponible</td><td>Réessaie plus tard ou contacte le support.</td></tr>
            </tbody></table></div>
          </section>

          <section id="pays">
            <h2>Pays et devises</h2>
            <p>Les pays et moyens de paiement disponibles sont ceux configurés dans FlashPay au moment de la demande. Utilise le code pays attendu par l’API.</p>
          </section>

          <section id="frais">
            <h2>Frais</h2>
            <div className="fp-docs-note">Le payeur règle <strong>2,5 %</strong> en plus du montant demandé. Sans abonnement, la commission est de <strong>6 %</strong>. Basic applique 1 % jusqu’à 200 000 FCFA encaissés par mois, puis 6 %. Premium applique 1 % jusqu’à 500 000 FCFA encaissés par mois, puis 6 %.</div>
          </section>

          <section id="production">
            <h2>Passer en production</h2>
            <p>Les collectes réelles demeurent protégées par les contrôles d’activation et de vérification côté serveur. Les paramètres de cette documentation ne désactivent aucun garde-fou.</p>
          </section>

          <p className="fp-docs-footer">FlashPay · Documentation développeur</p>
        </article>
      </div>
    </main>
  );
}
