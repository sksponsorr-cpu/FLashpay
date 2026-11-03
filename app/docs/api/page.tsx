import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Documentation API | FlashPay",
  description: "Documentation de l’API de test FlashPay.",
};

export default function ApiDocumentationPage() {
  return <main className="docs-page">
    <header className="docs-nav"><Link className="landing-brand" href="/"><span className="landing-logo">f<i /></span><span>flash<span>pay</span></span></Link><Link className="docs-back" href="/"><ArrowLeft size={15} /> Retour à FlashPay</Link></header>
    <div className="docs-layout">
      <aside className="docs-sidebar"><span className="docs-nav-caption">DOCUMENTATION</span><a href="#quickstart">Démarrage</a><a href="#countries">Pays et méthodes</a><a href="#collections">Créer une collecte test</a><a href="#fees">Frais de traitement</a><a href="#production">Clés de production</a></aside>
      <article className="docs-content">
        <span className="docs-eyebrow">FLASHpay API · VERSION TEST</span>
        <h1>Intégrer FlashPay à ton application.</h1>
        <p className="docs-lead">Cette documentation décrit l’API de test actuellement disponible. Les requêtes test ne créent aucun paiement et ne déplacent pas d’argent.</p>
        <div className="docs-callout"><ShieldCheck size={17} /><span><strong>Clés de test uniquement.</strong> Une clé générée dans l’espace développeur commence par <code>fp_test_</code> et ne peut déclencher aucun paiement réel.</span></div>

        <section className="docs-section" id="quickstart"><span className="docs-section-index">01</span><div><h2>Démarrage rapide</h2><p>Connecte-toi à FlashPay, ouvre <strong>Développeurs</strong> dans le dashboard et crée une clé test. Elle ne s’affichera qu’une fois. Garde-la dans le serveur de ton application, jamais dans le navigateur.</p><div className="docs-code"><div className="docs-code-title">Node.js · serveur uniquement</div><pre><code>{`const response = await fetch("https://api.flashpay.example/api/v1/collections", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-FlashPay-Key": process.env.FLASHPAY_API_KEY,
  },
  body: JSON.stringify({
    country_code: "CM",
    amount: 25000,
    payment_method: "MTN",
    mobile: "237670000000",
    name: "Client test",
  }),
});

const result = await response.json();`}</code></pre></div></div></section>

        <section className="docs-section" id="countries"><span className="docs-section-index">02</span><div><h2>Pays et méthodes</h2><p>Les pays configurés dans FlashPay sont des marchés cibles, pas une confirmation de disponibilité. Pour obtenir les opérateurs du compte marchand, appelle la route de lecture :</p><div className="docs-endpoint"><span className="http-get">GET</span><code>/api/swychr/payment-methods?country_code=CM</code></div><p>Pour la RDC, utilise le code <code>CD</code>. Si aucune méthode n’apparaît, vérifie que la clé de paiement est configurée côté serveur et que la collecte est activée pour le pays sur ton compte marchand. La documentation publique ne confirme pas à elle seule les méthodes ouvertes pour ton compte.</p><div className="docs-country-list">CM Cameroun · CD RDC · CG Congo-Brazzaville · SN Sénégal · BF Burkina Faso · BJ Bénin · NG Nigeria · RW Rwanda · CI Côte d’Ivoire · TG Togo · ML Mali · GH Ghana · KE Kenya</div></div></section>

        <section className="docs-section" id="collections"><span className="docs-section-index">03</span><div><h2>Créer une collecte de test</h2><div className="docs-endpoint"><span className="http-post">POST</span><code>/api/v1/collections</code></div><p>Corps JSON requis : <code>country_code</code>, <code>amount</code>, <code>mobile</code> et <code>name</code>. Le moyen <code>payment_method</code> est optionnel pour le checkout Nigeria. La route valide la clé test, le pays et le montant puis renvoie un statut <code>pending</code> simulé. Elle ne contacte aucun opérateur de paiement : la transaction est seulement enregistrée dans l’environnement test, avec la commission calculée.</p><div className="docs-code"><div className="docs-code-title">Réponse de test</div><pre><code>{`{
  "mode": "test",
  "data": {
    "transaction_id": "FPTEST-…",
    "country_code": "CM",
    "currency_code": "XAF",
    "amount": 25000,
    "status": "pending",
    "message": "Collecte simulée…"
  }
}`}</code></pre></div></div></section>

        <section className="docs-section" id="fees"><span className="docs-section-index">04</span><div><h2>Frais de traitement</h2><p>Les frais de traitement de base sont de <strong>2,5 %</strong>, prélevés par notre partenaire de paiement. Le taux appliqué à ton compte et l’accord commercial par pays prévalent.</p><ul><li>Sans transfert des frais au payeur, les frais sont déduits du règlement marchand.</li><li>Avec <code>pass_digital_charge: true</code>, les frais sont ajoutés au montant payé par le client et le marchand reçoit le montant demandé.</li><li>La commission FlashPay affichée dans le simulateur est une hypothèse ajustable, pas un tarif activé.</li></ul></div></section>

        <section className="docs-section" id="production"><span className="docs-section-index">05</span><div><h2>Clés de production</h2><p>FlashPay ne génère pas encore de clés de production. Une clé FlashPay ne remplace pas les accès de paiement du compte marchand, et aucun sous-compte n’est créé par utilisateur à ce stade.</p><p>Avant d’activer des clés live, il faut l’accord écrit de notre partenaire de paiement pour l’encaissement destiné à des bénéficiaires tiers, la validation KYC, une persistance durable des paiements, le traitement idempotent des webhooks et un parcours de versement conforme.</p><div className="docs-callout docs-callout-warn"><ShieldCheck size={17} /><span>N’ajoute jamais une clé de paiement dans le navigateur ou dans un exemple public. Les clés serveur restent dans un gestionnaire de secrets.</span></div></div></section>
        <footer className="docs-footer"><Link href="/">FlashPay</Link><span>Documentation de l’environnement de test · aucune collecte réelle</span></footer>
      </article>
    </div>
  </main>;
}
