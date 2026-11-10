import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Rocket, KeyRound, Bell, ShieldCheck, Globe, Percent, AlertTriangle, Search, Zap, PlusCircle, ChevronDown, Activity, List } from "lucide-react";

export const metadata = {
  title: "Documentation API | FlashPay",
  description: "Guide d’intégration de l’API FlashPay.",
};

const BASE = "https://f-lashpay.vercel.app";

const groups = [
  { label: "Démarrage", items: [
    { id: "demarrage", label: "Démarrer", icon: Rocket },
    { id: "cle", label: "Obtenir une clé", icon: KeyRound },
    { id: "auth", label: "Authentification", icon: ShieldCheck },
  ] },
  { label: "Intégration", items: [
    { id: "collecte", label: "Créer une collecte", icon: PlusCircle },
    { id: "statut", label: "Suivre le statut", icon: Activity },
    { id: "moyens", label: "Moyens de paiement", icon: List },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "pays", label: "Pays et modes", icon: Globe },
    { id: "frais", label: "Frais", icon: Percent },
  ] },
  { label: "Référence", items: [
    { id: "erreurs", label: "Codes d’erreur", icon: AlertTriangle },
    { id: "production", label: "Passer en production", icon: ShieldCheck },
  ] },
];

const css = `
.fp-docs{min-height:100vh;background:#0d0e13;color:#d3d4dc;font-family:Roboto,system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark}
.fp-docs *{box-sizing:border-box}
.fp-docs a{color:inherit;text-decoration:none}
.fp-docs-top{display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid #1f2028;position:sticky;top:0;background:#0d0e13;z-index:5}
.fp-docs-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px;color:#f2f2f7}
.fp-docs-brand b{color:#ff6a3d}
.fp-docs-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff;font-weight:800}
.fp-docs-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;color:#9ea0b2;border:1px solid #24252f;margin-left:auto}
.fp-docs-back{font-size:13px;color:#ff6a3d;font-weight:700}
.fp-docs-crumb{padding:12px 18px;border-bottom:1px solid #1f2028;font-size:14px;color:#8b8da0;display:flex;gap:8px;align-items:center}
.fp-docs-crumb strong{color:#f2f2f7}
.fp-docs-layout{display:grid;grid-template-columns:1fr;gap:0;max-width:1200px;margin:0 auto}
@media(min-width:900px){.fp-docs-layout{grid-template-columns:270px 1fr}}
.fp-docs-nav{padding:18px 16px;border-bottom:1px solid #1f2028}
@media(min-width:900px){.fp-docs-nav{border-bottom:0;border-right:1px solid #1f2028;position:sticky;top:0;align-self:start;height:100vh;overflow:auto}}
.fp-docs-nav details{}
.fp-docs-nav summary{list-style:none;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid #24252f;border-radius:14px;font-weight:700;color:#e7e7ee;cursor:pointer}
.fp-docs-nav summary::-webkit-details-marker{display:none}
@media(min-width:900px){.fp-docs-nav summary{display:none}.fp-docs-nav details{display:block}}
.fp-docs-nav details[open] .fp-docs-menu{display:block}
.fp-docs-menu{display:none;margin-top:10px}
@media(min-width:900px){.fp-docs-menu{display:block;margin-top:0}}
.fp-docs-group{display:block;margin:18px 10px 8px;font-size:14px;font-weight:700;color:#e7e7ee}
.fp-docs-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;color:#9ea0b2;font-size:15px;line-height:1.3}
.fp-docs-item:hover{background:#17181f;color:#fff}
.fp-docs-item.on{background:#2a1812;color:#ff8a66}
.fp-docs-item svg{flex:none;opacity:.85}
.fp-docs-content{padding:22px 18px 60px;min-width:0}
@media(min-width:900px){.fp-docs-content{padding:34px 40px 80px}}
.fp-docs-kicker{display:block;font-size:13px;font-weight:800;color:#ff6a3d;margin-top:10px;letter-spacing:.02em}
.fp-docs-content h1{font-size:34px;line-height:1.15;letter-spacing:-.02em;color:#f2f2f7;margin:6px 0 12px;font-weight:800}
@media(min-width:900px){.fp-docs-content h1{font-size:40px}}
.fp-docs-content h2{font-size:24px;color:#f2f2f7;margin:44px 0 12px;font-weight:800}
.fp-docs-content h3{font-size:18px;color:#f2f2f7;margin:26px 0 8px;font-weight:700}
.fp-docs-content p,.fp-docs-content li{font-size:16px;line-height:1.7;color:#b8bac7}
.fp-docs-lead{font-size:17px;max-width:720px}
.fp-docs-starts{display:grid;gap:14px;margin:26px 0 10px}
@media(min-width:700px){.fp-docs-starts{grid-template-columns:repeat(3,1fr)}}
.fp-docs-start{display:grid;gap:8px;padding:20px;border-radius:20px;background:#14151c;border:1px solid #24252f;transition:transform .2s ease,border-color .2s ease}
.fp-docs-start:hover{transform:translateY(-2px);border-color:#3a3c4a}
.fp-docs-start strong{font-size:17px;color:#f2f2f7}
.fp-docs-start span.t{font-size:14px;color:#9ea0b2;line-height:1.5}
.fp-docs-start-ico{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#2a1812;color:#ff6a3d}
.fp-docs-card,.fp-docs-note{padding:16px 18px;border-radius:16px;background:#14151c;border:1px solid #24252f;margin:14px 0;color:#d3d4dc;font-size:15px;line-height:1.65}
.fp-docs-note strong{color:#ffb199}
.fp-docs-card ol{margin:0;padding-left:20px}
.fp-docs-code{border-radius:16px;overflow:hidden;border:1px solid #24252f;margin:14px 0;background:#0a0b0f}
.fp-docs-code-head{padding:9px 14px;font-size:12px;color:#8b8da0;border-bottom:1px solid #1f2028;background:#101117}
.fp-docs-code pre{margin:0;padding:16px;overflow:auto;font-size:14px;line-height:1.6;color:#e7e7ee;font-family:"Roboto Mono",ui-monospace,Menlo,Consolas,monospace}
code.fp-docs-inline{background:#1d1f29;color:#ffb199;padding:2px 7px;border-radius:7px;font-size:14px}
.fp-docs-table-wrap{overflow-x:auto;border:1px solid #24252f;border-radius:16px;margin:14px 0}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{padding:12px 14px;text-align:left;border-bottom:1px solid #1f2028;vertical-align:top}
th{color:#f2f2f7;background:#101117;font-weight:700}
td{color:#b8bac7}
td code{background:#1d1f29;color:#ffb199;padding:1px 6px;border-radius:6px}
.fp-docs-footer{margin-top:56px;color:#6f7285;font-size:13px}
section{scroll-margin-top:80px}
`;

const CODE_COLLECT = [
  "const response = await fetch('https://f-lashpay.vercel.app/api/v1/collections', {",
  "  method: 'POST',",
  "  headers: {",
  "    'Content-Type': 'application/json',",
  "    'X-FlashPay-Key': process.env.FLASHPAY_KEY,",
  "  },",
  "  body: JSON.stringify({",
  "    country_code: 'CD',",
  "    amount: 25000,",
  "    mobile: '0812345678',",
  "    name: 'Awa Sossou',",
  "    payment_method: 'ORANGE',",
  "    transaction_id: 'CMD-1042',",
  "  }),",
  "});",
  "const result = await response.json();",
].join("\n");

const CODE_HOSTED = [
  "const response = await fetch('https://f-lashpay.vercel.app/api/v1/collections', {",
  "  method: 'POST',",
  "  headers: {",
  "    'Content-Type': 'application/json',",
  "    'X-FlashPay-Key': process.env.FLASHPAY_KEY,",
  "  },",
  "  body: JSON.stringify({",
  "    country_code: 'CM',",
  "    amount: 25000,",
  "    mobile: '670000000',",
  "    name: 'Client',",
  "    payment_method: 'MTN',",
  "    checkout: 'hosted',",
  "    transaction_id: 'CMD-1043',",
  "  }),",
  "});",
  "const { data } = await response.json();",
  "// Redirige ton client vers data.checkout_url",
].join("\n");

const CODE_STATUS = [
  "const response = await fetch('https://f-lashpay.vercel.app/api/v1/collections/CMD-1042', {",
  "  headers: { 'X-FlashPay-Key': process.env.FLASHPAY_KEY },",
  "});",
  "const { data } = await response.json();",
  "// data.status : pending | successful | failed | cancelled | expired",
].join("\n");

const CODE_WEBHOOK = [
  "import { createHmac, timingSafeEqual } from 'node:crypto';",
  "",
  "// rawBody : le corps brut reçu, sans le transformer en JSON avant la vérification.",
  "function isGenuine(rawBody, timestamp, signature, secret) {",
  "  const age = Math.abs(Date.now() / 1000 - Number(timestamp));",
  "  if (!Number.isFinite(age) || age > 300) return false;",
  "  const expected = createHmac('sha256', secret)",
  "    .update(timestamp + '.' + rawBody)",
  "    .digest('hex');",
  "  const a = Buffer.from(signature);",
  "  const b = Buffer.from(expected);",
  "  return a.length === b.length && timingSafeEqual(a, b);",
  "}",
].join("\n");

const CODE_WEBHOOK_BODY = [
  "{",
  "  \"event\": \"transaction.successful\",",
  "  \"created_at\": \"2026-11-10T11:30:00.000Z\",",
  "  \"data\": {",
  "    \"transaction_id\": \"CMD-1042\",",
  "    \"status\": \"successful\",",
  "    \"amount\": 25000,",
  "    \"currency_code\": \"XOF\",",
  "    \"country_code\": \"BJ\",",
  "    \"payment_method\": \"MTN\",",
  "    \"environment\": \"live\"",
  "  }",
  "}",
].join("\n");

function ApiDocumentationContent() {
  return (
    <main className="fp-docs">
      <style>{css}</style>

      <header className="fp-docs-top">
        <Link className="fp-docs-brand" href="/"><span className="fp-docs-logo">f</span><span>flash<b>pay</b></span></Link>
        <span className="fp-docs-icon" aria-hidden="true"><Search size={18} /></span>
        <Link className="fp-docs-back" href="/dashboard">← Retour à FlashPay</Link>
      </header>

      <div className="fp-docs-crumb"><span>Documentation</span><span>›</span><strong>API FlashPay</strong></div>

      <div className="fp-docs-layout">
        <nav className="fp-docs-nav" aria-label="Sommaire de la documentation">
          <details>
            <summary><span>Documentation</span><ChevronDown size={18} /></summary>
            <div className="fp-docs-menu">
              {groups.map((g) => (
                <div key={g.label}>
                  <span className="fp-docs-group">{g.label}</span>
                  {g.items.map((it) => { const Icon = it.icon; return (
                    <a key={it.id} className="fp-docs-item" href={`#${it.id}`}><Icon size={18} />{it.label}</a>
                  ); })}
                </div>
              ))}
            </div>
          </details>
        </nav>

        <article className="fp-docs-content">
          <span className="fp-docs-kicker">API · Version 1</span>
          <h1>Intègre FlashPay dans ton application.</h1>
          <p className="fp-docs-lead">Crée une demande de paiement mobile money depuis ton serveur, puis suis son statut ou reçois une notification. FlashPay choisit automatiquement le mode de paiement selon le pays du client.</p>

          <section id="demarrage">
            <h2>Démarrage</h2>
            <div className="fp-docs-card"><ol>
              <li>Crée une clé de test dans l’espace Développeur (préfixe <code className="fp-docs-inline">fp_test_</code>).</li>
              <li>Envoie tes premières collectes en test : aucun argent n’est débité.</li>
              <li>Quand ton compte est vérifié, crée une clé live (préfixe <code className="fp-docs-inline">fp_live_</code>) et remplace la clé de test dans ton serveur.</li>
            </ol></div>
            <p>Base de l’API : <code className="fp-docs-inline">{BASE}</code></p>
          </section>

          <section id="cle">
            <h2>Obtenir une clé</h2>
            <p>Crée une clé dans l’espace Développeur, en lui donnant un nom qui identifie ton intégration. La clé secrète n’est affichée qu’une seule fois : copie-la immédiatement.</p>
            <div className="fp-docs-note"><strong>Clé live.</strong> Elle n’est acceptée que si ton compte est vérifié et que les paiements réels sont ouverts. Sinon, FlashPay répond 403 à la création, et 503 à la collecte.</div>
            <div className="fp-docs-note"><strong>Sécurité.</strong> Garde la clé dans une variable d’environnement serveur. Ne l’utilise jamais dans le code du navigateur ni dans un dépôt public.</div>
          </section>

          <section id="auth">
            <h2>Authentification</h2>
            <p>Chaque requête porte ta clé dans l’en-tête <code className="fp-docs-inline">X-FlashPay-Key</code>.</p>
            <div className="fp-docs-code"><div className="fp-docs-code-head">En-tête HTTP</div><pre>{"X-FlashPay-Key: fp_test_…"}</pre></div>
          </section>

          <section id="collecte">
            <h2>Créer une collecte</h2>
            <p>Envoie une requête <code className="fp-docs-inline">POST {BASE}/api/v1/collections</code>.</p>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>Champ</th><th>Obligatoire</th><th>Description</th></tr></thead><tbody>
              <tr><td><code>country_code</code></td><td>Oui</td><td>Code pays à deux lettres (voir « Pays et modes »).</td></tr>
              <tr><td><code>amount</code></td><td>Oui</td><td>Montant dans la devise du pays, strictement supérieur à zéro.</td></tr>
              <tr><td><code>name</code></td><td>Oui</td><td>Nom du payeur.</td></tr>
              <tr><td><code>mobile</code></td><td>Oui</td><td>Numéro mobile money du payeur, sans l’indicatif pays.</td></tr>
              <tr><td><code>payment_method</code></td><td>Oui en live</td><td>Opérateur mobile money (voir « Moyens de paiement »).</td></tr>
              <tr><td><code>transaction_id</code></td><td>Non</td><td>Ta référence unique. Sans elle, FlashPay en génère une. Une référence déjà utilisée renvoie 409.</td></tr>
              <tr><td><code>checkout</code></td><td>Non</td><td>Mettre <code>hosted</code> pour obtenir une page de paiement hébergée (<code>checkout_url</code>).</td></tr>
              <tr><td><code>email</code></td><td>Non</td><td>E-mail du payeur, transmis au prestataire quand il le demande.</td></tr>
            </tbody></table></div>

            <h3>Pays en paiement direct (RDC, Burkina Faso, Bénin, Mali, Togo)</h3>
            <p>Le client reste sur ton site et valide la demande sur son téléphone. Aucune redirection n’est nécessaire : suis le statut avec « Suivre le statut ».</p>
            <div className="fp-docs-code"><div className="fp-docs-code-head">JavaScript · serveur</div><pre>{CODE_COLLECT}</pre></div>

            <h3>Pays en paiement hébergé (Cameroun, Congo, Sénégal, Côte d’Ivoire, Nigeria, Rwanda, Ghana, Kenya)</h3>
            <p>Ajoute <code className="fp-docs-inline">checkout: &quot;hosted&quot;</code> et redirige ton client vers <code className="fp-docs-inline">data.checkout_url</code>. Il y choisit son opérateur et valide sur son téléphone.</p>
            <div className="fp-docs-code"><div className="fp-docs-code-head">JavaScript · serveur</div><pre>{CODE_HOSTED}</pre></div>

            <div className="fp-docs-note"><strong>Mode test.</strong> Une clé <code className="fp-docs-inline">fp_test_</code> ne contacte aucun prestataire. La réponse contient <code className="fp-docs-inline">mode: &quot;test&quot;</code> et une référence commençant par <code className="fp-docs-inline">FPTEST-</code>.</div>
          </section>

          <section id="statut">
            <h2>Suivre le statut</h2>
            <p>Interroge <code className="fp-docs-inline">GET {BASE}/api/v1/collections/&#123;transaction_id&#125;</code> avec ta clé. Tant que le statut est <code className="fp-docs-inline">pending</code>, attends quelques secondes avant de réessayer. Le statut final ne change plus.</p>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>Statut</th><th>Signification</th></tr></thead><tbody>
              <tr><td><code>pending</code></td><td>Demande envoyée, en attente de la validation du client.</td></tr>
              <tr><td><code>successful</code></td><td>Paiement reçu. Tu peux livrer la commande.</td></tr>
              <tr><td><code>failed</code></td><td>Paiement refusé ou échoué.</td></tr>
              <tr><td><code>cancelled</code></td><td>Paiement annulé par le client.</td></tr>
              <tr><td><code>expired</code></td><td>Le client n’a pas validé à temps.</td></tr>
            </tbody></table></div>
            <div className="fp-docs-code"><div className="fp-docs-code-head">JavaScript · serveur</div><pre>{CODE_STATUS}</pre></div>
          </section>

          <section id="moyens">
            <h2>Moyens de paiement</h2>
            <p>Avant de proposer un opérateur à ton client, demande la liste acceptée pour son pays :</p>
            <div className="fp-docs-code"><div className="fp-docs-code-head">Requête</div><pre>{`GET ${BASE}/api/v1/payment-methods?country_code=CD`}</pre></div>
            <p>La réponse contient <code className="fp-docs-inline">payment_methods</code>, une liste de valeurs à envoyer telles quelles dans <code className="fp-docs-inline">payment_method</code>.</p>
          </section>

          <section id="notifications">
            <h2>Notifications</h2>
            <p>Quand une collecte est payée, FlashPay envoie une requête <code className="fp-docs-inline">POST</code> à l’adresse de notification configurée dans ton espace Développeur.</p>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>En-tête</th><th>Contenu</th></tr></thead><tbody>
              <tr><td><code>X-FlashPay-Timestamp</code></td><td>Date d’envoi en secondes (Unix).</td></tr>
              <tr><td><code>X-FlashPay-Signature</code></td><td>HMAC-SHA256 en hexadécimal de <code>timestamp + &quot;.&quot; + corps brut</code>, signé avec ton secret de notification.</td></tr>
            </tbody></table></div>
            <div className="fp-docs-code"><div className="fp-docs-code-head">Corps de la notification</div><pre>{CODE_WEBHOOK_BODY}</pre></div>
            <div className="fp-docs-code"><div className="fp-docs-code-head">Vérification de la signature · Node.js</div><pre>{CODE_WEBHOOK}</pre></div>
            <div className="fp-docs-note"><strong>Important.</strong> Vérifie la signature et l’âge de la notification (5 minutes maximum) avant de la traiter. Réponds 2xx dès réception. FlashPay réessaie jusqu’à 3 fois, à 0 s, 2 s et 6 s. Rends ton traitement idempotent : une même transaction peut être notifiée deux fois.</div>
            <div className="fp-docs-note"><strong>Événement disponible.</strong> Seul <code className="fp-docs-inline">transaction.successful</code> est envoyé pour le moment. Pour les échecs, interroge le statut.</div>
          </section>

          <section id="pays">
            <h2>Pays et modes</h2>
            <p>FlashPay choisit le mode selon le pays du client. Tu n’as rien à configurer.</p>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>Pays</th><th>Code</th><th>Mode</th></tr></thead><tbody>
              <tr><td>République démocratique du Congo</td><td><code>CD</code></td><td>Direct</td></tr>
              <tr><td>Burkina Faso</td><td><code>BF</code></td><td>Direct</td></tr>
              <tr><td>Bénin</td><td><code>BJ</code></td><td>Direct</td></tr>
              <tr><td>Mali</td><td><code>ML</code></td><td>Direct</td></tr>
              <tr><td>Togo</td><td><code>TG</code></td><td>Direct</td></tr>
              <tr><td>Cameroun</td><td><code>CM</code></td><td>Hébergé</td></tr>
              <tr><td>Congo-Brazzaville</td><td><code>CG</code></td><td>Hébergé</td></tr>
              <tr><td>Sénégal</td><td><code>SN</code></td><td>Hébergé</td></tr>
              <tr><td>Côte d’Ivoire</td><td><code>CI</code></td><td>Hébergé</td></tr>
              <tr><td>Nigeria</td><td><code>NG</code></td><td>Hébergé</td></tr>
              <tr><td>Rwanda</td><td><code>RW</code></td><td>Hébergé</td></tr>
              <tr><td>Ghana</td><td><code>GH</code></td><td>Hébergé</td></tr>
              <tr><td>Kenya</td><td><code>KE</code></td><td>Hébergé</td></tr>
            </tbody></table></div>
            <div className="fp-docs-note"><strong>Direct</strong> : le client valide sur son téléphone, sans quitter ton site. <strong>Hébergé</strong> : redirige le client vers <code className="fp-docs-inline">checkout_url</code>.</div>
          </section>

          <section id="frais">
            <h2>Frais</h2>
            <div className="fp-docs-note">Le payeur règle <strong>2,5 %</strong> en plus du montant demandé. Sans abonnement, la commission est de <strong>6 %</strong>. Basic applique 1 % jusqu’à 200 000 FCFA encaissés par mois, puis 6 %. Premium applique 1 % jusqu’à 500 000 FCFA encaissés par mois, puis 6 %.</div>
          </section>

          <section id="erreurs">
            <h2>Codes d’erreur</h2>
            <div className="fp-docs-table-wrap"><table><thead><tr><th>Code</th><th>Signification</th><th>Action</th></tr></thead><tbody>
              <tr><td>400</td><td>Données invalides, pays non pris en charge, ou <code>payment_method</code> absent en live.</td><td>Vérifie le corps de la requête.</td></tr>
              <tr><td>401</td><td>Clé absente, invalide ou révoquée.</td><td>Vérifie l’en-tête <code>X-FlashPay-Key</code>.</td></tr>
              <tr><td>404</td><td>Collecte introuvable pour ce compte.</td><td>Vérifie la référence <code>transaction_id</code>.</td></tr>
              <tr><td>409</td><td>Référence déjà utilisée.</td><td>Envoie une référence unique.</td></tr>
              <tr><td>429</td><td>Plus de 60 requêtes par minute avec la même clé.</td><td>Attends 60 secondes (en-tête <code>Retry-After</code>).</td></tr>
              <tr><td>502</td><td>Le prestataire a refusé la demande (mode hébergé).</td><td>Réessaie avec un autre opérateur.</td></tr>
              <tr><td>503</td><td>Paiements live non ouverts, ou service indisponible.</td><td>Réessaie plus tard ou contacte le support.</td></tr>
            </tbody></table></div>
          </section>

          <section id="production">
            <h2>Passer en production</h2>
            <div className="fp-docs-card"><ol>
              <li>Ton compte est vérifié dans l’espace Développeur.</li>
              <li>Tu as créé une clé <code className="fp-docs-inline">fp_live_</code> et remplacé la clé de test sur ton serveur.</li>
              <li>Tu as testé au moins une collecte dans chaque mode utilisé par tes clients (direct et hébergé).</li>
              <li>Ton endpoint de notification répond 2xx et vérifie la signature.</li>
            </ol></div>
          </section>

          <p className="fp-docs-footer">FlashPay · Documentation développeur</p>
        </article>
      </div>
    </main>
  );
}

// La partie qui lit la session est isolée dans Suspense (exigé par cacheComponents).
export default function ApiDocumentationPage() {
  return (
    <Suspense fallback={<div className="fp-docs" />}>
      <ApiDocumentationContent />
    </Suspense>
  );
}
