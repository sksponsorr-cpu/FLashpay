import Link from "next/link";

export const metadata = {
  title: "Documentation API | FlashPay",
  description: "Intègre les encaissements FlashPay dans ton application : clés, collectes, notifications et codes d’erreur.",
};

const nav = [
  { href: "#demarrage", label: "Démarrage" },
  { href: "#cle", label: "Obtenir une clé" },
  { href: "#auth", label: "Authentification" },
  { href: "#collecte", label: "Créer une collecte" },
  { href: "#notifications", label: "Notifications" },
  { href: "#erreurs", label: "Codes d’erreur" },
  { href: "#pays", label: "Pays et devises" },
  { href: "#frais", label: "Frais" },
  { href: "#production", label: "Passer en production" },
];

const css = `
  .dx { min-height: 100vh; background: #0b0f0d; color: #d9e3dd; font-family: inherit; }
  .dx a { color: inherit; }
  .dx-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 24px; border-bottom: 1px solid #1b2620; background: rgba(11,15,13,.92); backdrop-filter: blur(8px); }
  .dx-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 18px; text-decoration: none; }
  .dx-logo { width: 30px; height: 30px; border-radius: 9px; background: #2f8a63; display: grid; place-items: center; color: #fff; font-weight: 800; }
  .dx-back { font-size: 14px; color: #8fa89b; text-decoration: none; }
  .dx-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 40px; max-width: 1180px; margin: 0 auto; padding: 32px 24px 80px; }
  .dx-side { position: sticky; top: 90px; align-self: start; display: grid; gap: 4px; }
  .dx-side small { font-size: 11px; letter-spacing: .12em; color: #6f8478; text-transform: uppercase; margin: 0 0 6px; }
  .dx-side a { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; color: #a9bdb1; text-decoration: none; }
  .dx-side a:hover { background: #142019; color: #fff; }
  .dx-kicker { font-size: 12px; letter-spacing: .14em; color: #5fd09c; font-weight: 700; text-transform: uppercase; }
  .dx h1 { font-size: 44px; line-height: 1.08; letter-spacing: -.02em; margin: 10px 0 14px; color: #fff; }
  .dx-lead { font-size: 17px; line-height: 1.6; color: #a9bdb1; max-width: 680px; }
  .dx section { padding-top: 48px; scroll-margin-top: 90px; }
  .dx h2 { font-size: 26px; margin: 0 0 12px; color: #fff; letter-spacing: -.01em; }
  .dx h3 { font-size: 17px; margin: 22px 0 8px; color: #fff; }
  .dx p, .dx li { font-size: 15px; line-height: 1.7; color: #b8c9be; }
  .dx ul { padding-left: 20px; }
  .dx-note { border: 1px solid #1f3a2c; background: #0f1a14; border-radius: 14px; padding: 14px 16px; margin: 16px 0; font-size: 14px; color: #b8c9be; }
  .dx-note strong { color: #5fd09c; }
  .dx-code { background: #070a08; border: 1px solid #1b2620; border-radius: 14px; overflow: hidden; margin: 14px 0; }
  .dx-code-head { display: flex; justify-content: space-between; padding: 9px 14px; border-bottom: 1px solid #1b2620; font-size: 12px; color: #6f8478; }
  .dx-code pre { margin: 0; padding: 14px; overflow-x: auto; font-size: 13px; line-height: 1.6; color: #d9e3dd; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .dx-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 14px; }
  .dx-table th, .dx-table td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #1b2620; vertical-align: top; }
  .dx-table th { color: #6f8478; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .dx-table td code, .dx code.inline { background: #142019; padding: 2px 6px; border-radius: 6px; font-size: 13px; color: #9fe3c2; }
  .dx-steps { display: grid; gap: 12px; margin: 14px 0; counter-reset: s; }
  .dx-step { display: grid; grid-template-columns: 34px 1fr; gap: 12px; background: #101913; border: 1px solid #1b2620; border-radius: 14px; padding: 14px; }
  .dx-step b { width: 30px; height: 30px; border-radius: 50%; background: #17352a; color: #5fd09c; display: grid; place-items: center; font-size: 13px; }
  .dx-foot { margin-top: 64px; padding-top: 20px; border-top: 1px solid #1b2620; font-size: 13px; color: #6f8478; }
  @media (max-width: 860px) {
    .dx-layout { grid-template-columns: 1fr; gap: 16px; padding: 22px 16px 60px; }
    .dx-side { position: static; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 8px; }
    .dx-side small { grid-column: 1 / -1; }
    .dx h1 { font-size: 30px; }
    .dx h2 { font-size: 22px; }
    .dx-lead { font-size: 15px; }
    .dx-top { padding: 12px 16px; }
    .dx-table { display: block; overflow-x: auto; white-space: nowrap; }
  }
`;

export default function ApiDocumentationPage() {
  return (
    <main className="dx">
      <style>{css}</style>

      <header className="dx-top">
        <Link className="dx-brand" href="/"><span className="dx-logo">f</span>flashpay</Link>
        <Link className="dx-back" href="/">← Retour à FlashPay</Link>
      </header>

      <div className="dx-layout">
        <aside className="dx-side" aria-label="Sommaire">
          <small>Documentation</small>
          {nav.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </aside>

        <article>
          <span className="dx-kicker">API · version test</span>
          <h1>Intègre FlashPay dans ton application.</h1>
          <p className="dx-lead">Demande des encaissements par mobile money depuis ton serveur, puis reçois une notification dès que le paiement est confirmé. Les clés test ne déclenchent aucun paiement réel.</p>

          <section id="demarrage">
            <h2>Démarrage</h2>
            <div className="dx-steps">
              <div className="dx-step"><b>1</b><div><strong style={{ color: "#fff" }}>Crée ton compte</strong><p style={{ margin: "4px 0 0" }}>Connecte-toi à FlashPay et ouvre la rubrique Développeurs.</p></div></div>
              <div className="dx-step"><b>2</b><div><strong style={{ color: "#fff" }}>Crée une clé test</strong><p style={{ margin: "4px 0 0" }}>Elle commence par <code className="inline">fp_test_</code>. Tu ne la verras qu’une fois.</p></div></div>
              <div className="dx-step"><b>3</b><div><strong style={{ color: "#fff" }}>Fais ta première requête</strong><p style={{ margin: "4px 0 0" }}>Depuis ton serveur, appelle <code className="inline">POST /api/v1/collections</code>.</p></div></div>
            </div>
          </section>

          <section id="cle">
            <h2>Obtenir une clé</h2>
            <p>Dans la rubrique Développeurs, donne un nom à ton intégration, par exemple « Mon SaaS - staging », puis clique sur Créer une clé test.</p>
            <div className="dx-note"><strong>Règles de sécurité.</strong> Garde la clé sur ton serveur, dans une variable d’environnement. Ne la mets jamais dans du code côté navigateur ni dans Git. Si elle est exposée, révoque-la immédiatement et crées-en une nouvelle.</div>
          </section>

          <section id="auth">
            <h2>Authentification</h2>
            <p>Chaque requête contient ta clé dans l’en-tête <code className="inline">X-FlashPay-Key</code>.</p>
            <div className="dx-code"><div className="dx-code-head"><span>En-tête HTTP</span></div><pre>{`X-FlashPay-Key: fp_test_xxxxxxxxxxxxxxxxxxxxxxxx`}</pre></div>
          </section>

          <section id="collecte">
            <h2>Créer une collecte</h2>
            <p><code className="inline">POST https://&lt;adresse-de-flashpay&gt;/api/v1/collections</code></p>
            <table className="dx-table">
              <thead><tr><th>Champ</th><th>Obligatoire</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>country_code</code></td><td>Oui</td><td>Code pays à deux lettres (voir Pays et devises)</td></tr>
                <tr><td><code>amount</code></td><td>Oui</td><td>Montant demandé, supérieur à 0, dans la devise du pays</td></tr>
                <tr><td><code>mobile</code></td><td>Oui</td><td>Numéro du payeur <strong>sans</strong> l’indicatif, par exemple <code>670000000</code></td></tr>
                <tr><td><code>name</code></td><td>Oui</td><td>Nom du payeur</td></tr>
                <tr><td><code>payment_method</code></td><td>Oui en live</td><td><code>MTN</code> ou <code>ORANGE</code></td></tr>
                <tr><td><code>transaction_id</code></td><td>Non</td><td>Ta référence unique. Si absente, FlashPay en génère une.</td></tr>
                <tr><td><code>email</code>, <code>description</code></td><td>Non</td><td>Email du payeur, libellé affiché au payeur</td></tr>
                <tr><td><code>callback_url</code>, <code>failed_callback_url</code></td><td>Non</td><td>Où renvoyer le payeur après le paiement</td></tr>
              </tbody>
            </table>

            <h3>Exemple</h3>
            <div className="dx-code"><div className="dx-code-head"><span>Node.js · serveur uniquement</span></div><pre>{`const response = await fetch("https://<adresse-de-flashpay>/api/v1/collections", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-FlashPay-Key": process.env.FLASHPAY_API_KEY,
  },
  body: JSON.stringify({
    country_code: "CM",
    amount: 25000,
    mobile: "670000000",
    name: "Client test",
    transaction_id: "ORDER-1042",
    payment_method: "MTN",
  }),
});

const result = await response.json();`}</pre></div>

            <h3>Réponse (clé test)</h3>
            <div className="dx-code"><div className="dx-code-head"><span>200 OK</span></div><pre>{`{
  "mode": "test",
  "data": {
    "transaction_id": "ORDER-1042",
    "currency_code": "XAF",
    "amount": 25000,
    "status": "pending",
    "platform_fee": 1500,
    "net_payable": 23500
  }
}`}</pre></div>

            <h3>Réponse (clé live)</h3>
            <p>Elle contient en plus <code className="inline">payment_link</code>. Redirige le client vers cette adresse pour qu’il finalise le paiement sur son téléphone.</p>
          </section>

          <section id="notifications">
            <h2>Notifications</h2>
            <p>Quand un paiement passe à <code className="inline">successful</code>, FlashPay envoie une requête <code className="inline">POST</code> à l’adresse https que tu as enregistrée dans la rubrique Développeurs.</p>
            <div className="dx-code"><div className="dx-code-head"><span>Corps de la notification</span></div><pre>{`{
  "event": "transaction.successful",
  "created_at": "2026-11-04T08:00:00.000Z",
  "data": {
    "transaction_id": "ORDER-1042",
    "status": "successful",
    "amount": 25000,
    "currency_code": "XAF",
    "country_code": "CM",
    "payment_method": "MTN",
    "environment": "live"
  }
}`}</pre></div>
            <h3>Vérifier la signature</h3>
            <ul>
              <li>Lis les en-têtes <code className="inline">X-FlashPay-Timestamp</code> et <code className="inline">X-FlashPay-Signature</code>.</li>
              <li>Calcule un HMAC-SHA256 du texte <code className="inline">timestamp + "." + corps</code>, avec le secret affiché une seule fois.</li>
              <li>Refuse la notification si la signature ne correspond pas, ou si le timestamp a plus de 5 minutes.</li>
            </ul>
            <div className="dx-note"><strong>Où ranger le secret ?</strong> Dans les variables d’environnement de <em>ton</em> serveur, par exemple <code className="inline">FLASHPAY_WEBHOOK_SECRET</code>. Il ne se met jamais dans le navigateur.</div>
            <p>En cas d’échec de ton serveur, FlashPay réessaie après 2 s puis 6 s. Rends ton traitement idempotent : une même <code className="inline">transaction_id</code> peut arriver plusieurs fois.</p>
          </section>

          <section id="erreurs">
            <h2>Codes d’erreur</h2>
            <table className="dx-table">
              <thead><tr><th>Code</th><th>Signification</th><th>Action</th></tr></thead>
              <tbody>
                <tr><td>400</td><td>Données invalides</td><td>Corrige le corps de la requête</td></tr>
                <tr><td>401</td><td>Clé absente, invalide ou révoquée</td><td>Vérifie la clé</td></tr>
                <tr><td>403</td><td>Action non autorisée</td><td>Vérifie le type de clé</td></tr>
                <tr><td>409</td><td><code>transaction_id</code> déjà utilisé</td><td>Utilise une référence unique</td></tr>
                <tr><td>429</td><td>Plus de 60 requêtes par minute</td><td>Attends une minute</td></tr>
                <tr><td>502</td><td>Le prestataire n’a pas accepté la demande</td><td>Réessaie plus tard</td></tr>
                <tr><td>503</td><td>Service indisponible, ou clé live pas encore ouverte</td><td>Réessaie plus tard</td></tr>
              </tbody>
            </table>
          </section>

          <section id="pays">
            <h2>Pays et devises</h2>
            <table className="dx-table">
              <thead><tr><th>Code</th><th>Pays</th><th>Devise</th></tr></thead>
              <tbody>
                <tr><td>CM</td><td>Cameroun</td><td>XAF</td></tr>
                <tr><td>CG</td><td>Congo-Brazzaville</td><td>XAF</td></tr>
                <tr><td>SN</td><td>Sénégal</td><td>XOF</td></tr>
                <tr><td>BF</td><td>Burkina Faso</td><td>XOF</td></tr>
                <tr><td>BJ</td><td>Bénin</td><td>XOF</td></tr>
                <tr><td>CI</td><td>Côte d’Ivoire</td><td>XOF</td></tr>
                <tr><td>TG</td><td>Togo</td><td>XOF</td></tr>
                <tr><td>ML</td><td>Mali</td><td>XOF</td></tr>
                <tr><td>CD</td><td>RDC</td><td>CDF</td></tr>
                <tr><td>NG</td><td>Nigeria</td><td>NGN</td></tr>
                <tr><td>RW</td><td>Rwanda</td><td>RWF</td></tr>
                <tr><td>GH</td><td>Ghana</td><td>GHS</td></tr>
                <tr><td>KE</td><td>Kenya</td><td>KES</td></tr>
              </tbody>
            </table>
          </section>

          <section id="frais">
            <h2>Frais</h2>
            <ul>
              <li><strong style={{ color: "#fff" }}>Commission FlashPay : 6 %</strong> du montant demandé, pour toutes les devises.</li>
              <li><strong style={{ color: "#fff" }}>Frais de paiement : 2,5 %</strong>, à la charge du payeur. Il paie le montant + 2,5 %.</li>
            </ul>
            <div className="dx-note"><strong>Exemple.</strong> Pour une collecte de 25 000 FCFA : le payeur paie 25 625 FCFA, la commission est de 1 500 FCFA, et tu reçois 23 500 FCFA.</div>
          </section>

          <section id="production">
            <h2>Passer en production</h2>
            <p>Les clés live s’ouvrent après la vérification de ton compte et la validation des paiements réels. Cette documentation sera mise à jour à ce moment-là.</p>
            <p>Limite : 60 requêtes par minute et par clé.</p>
          </section>

          <p className="dx-foot">En cas de problème, indique le <code className="inline">transaction_id</code>, le code d’erreur et l’heure de la requête. N’envoie jamais ta clé complète.</p>
        </article>
      </div>
    </main>
  );
}
