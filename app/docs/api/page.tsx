import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getActiveProvider } from "@/lib/payment-provider";
import { Rocket, KeyRound, Bell, ShieldCheck, Globe, Percent, AlertTriangle, Search, Menu, Zap, PlusCircle, LayoutDashboard, Code2, ChevronDown } from "lucide-react";

export const metadata = {
  title: "Documentation API | FlashPay",
  description: "Guide d’intégration de l’API FlashPay.",
};

const groups = [
  { label: "Démarrage", items: [
    { id: "demarrage", label: "Démarrer", icon: Rocket },
    { id: "cle", label: "Obtenir une clé", icon: KeyRound },
    { id: "auth", label: "Authentification", icon: ShieldCheck },
  ] },
  { label: "Intégration", items: [
    { id: "collecte", label: "Créer une collecte", icon: PlusCircle },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "pays", label: "Pays et devises", icon: Globe },
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

// Fournisseur actif : détermine la forme de la réponse de création de collecte.
async function currentProvider() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "swychr" as const;
  const admin = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return getActiveProvider(admin);
}

async function getBackHref() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user ? "/dashboard" : "/";
  } catch {
    return "/";
  }
}

async function ApiDocumentationContent() {
  const backHref = await getBackHref();
  const direct = (await currentProvider()) === "saspay";
  return (
    <main className="fp-docs">
      <style>{css}</style>

      <header className="fp-docs-top">
        <Link className="fp-docs-brand" href="/"><span className="fp-docs-logo">f</span><span>flash<b>pay</b></span></Link>
        <span className="fp-docs-icon" aria-hidden="true"><Search size={18} /></span>
        <Link className="fp-docs-back" href={backHref}>← Retour à FlashPay</Link>
      </header>

      <div className="fp-docs-crumb"><span>Démarrage</span><span>›</span><strong>FlashPay</strong></div>

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
          <span className="fp-docs-kicker">API · Version test</span>
          <h1>Intègre FlashPay dans ton application.</h1>
          <p className="fp-docs-lead">Crée des demandes de paiement mobile money depuis ton serveur et traite les notifications de statut. Garde tes clés secrètes et teste ton intégration avant toute mise en production.</p>

          <div className="fp-docs-starts">
            <a className="fp-docs-start" href="#cle"><span className="fp-docs-start-ico"><Zap size={22} /></span><strong>Démarrer en 5 minutes</strong><span className="t">Obtiens ta clé de test et lance ton premier encaissement.</span></a>
            <a className="fp-docs-start" href="#collecte"><span className="fp-docs-start-ico"><Rocket size={22} /></span><strong>Créer une collecte</strong><span className="t">Envoie une demande de paiement mobile money depuis ton serveur.</span></a>
            <a className="fp-docs-start" href="#notifications"><span className="fp-docs-start-ico"><Bell size={22} /></span><strong>Recevoir les notifications</strong><span className="t">Vérifie la signature et mets à jour tes commandes.</span></a>
          </div>

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
            {direct ? (
              <div className="fp-docs-note"><strong>Paiement direct.</strong> Le client reste sur ta page et valide la demande avec son code PIN sur son téléphone. La réponse ne contient pas de lien de redirection : suis le statut de la transaction grâce aux notifications de paiement.</div>
            ) : (
              <div className="fp-docs-note"><strong>Redirection.</strong> La réponse contient <code className="fp-docs-inline">payment_link</code>. Redirige le client vers cette adresse pour qu’il finalise le paiement.</div>
            )}
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

          <section id="pays">
            <h2>Pays et devises</h2>
            <p>Les pays et moyens de paiement disponibles sont ceux configurés dans FlashPay au moment de la demande. Utilise le code pays attendu par l’API.</p>
          </section>

          <section id="frais">
            <h2>Frais</h2>
            <div className="fp-docs-note">Le payeur règle <strong>2,5 %</strong> en plus du montant demandé. Sans abonnement, la commission est de <strong>6 %</strong>. Basic applique 1 % jusqu’à 200 000 FCFA encaissés par mois, puis 6 %. Premium applique 1 % jusqu’à 500 000 FCFA encaissés par mois, puis 6 %.</div>
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

// La partie qui lit la session est isolée dans Suspense (exigé par cacheComponents).
export default function ApiDocumentationPage() {
  return (
    <Suspense fallback={<div className="fp-docs" />}>
      <ApiDocumentationContent />
    </Suspense>
  );
}
