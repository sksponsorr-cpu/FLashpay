import Link from "next/link";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";
import ProductDemo from "@/components/product-demo";

const features = [
  { title: "Encaisse par mobile money", text: "MTN, Orange, Moov, Wave et les autres opérateurs de ton pays, depuis une seule intégration." },
  { title: "Un portefeuille par devise", text: "Chaque encaissement alimente le portefeuille de sa devise : FCFA, CDF, NGN, RWF." },
  { title: "Une API pour tes développeurs", text: "Clés API, webhooks signés et documentation claire pour brancher FlashPay sur ton SaaS." },
];

const pricing = [
  { label: "Encaissement", value: "6 %", note: "Commission FlashPay, pour tous les comptes. Le client paie +2,5 % en plus." },
  { label: "Retrait", value: "5 %", note: "0 % avec l’abonnement Premium. Minimum 1 USD converti." },
  { label: "Conversion", value: "4,5 %", note: "1 % avec un abonnement actif." },
];

export default function LandingPage() {
  return (
    <div className="lp">
      <style>{`
        .lp { min-height: 100vh; background: #f6f9f7; color: #14241c; font-family: inherit; }
        .lp * { box-sizing: border-box; }
        .lp a { color: inherit; text-decoration: none; }
        .lp-nav { position: sticky; top: 0; z-index: 20; background: rgba(246,249,247,.9); backdrop-filter: blur(8px); border-bottom: 1px solid #e3ebe6; }
        .lp-nav-in { max-width: 1120px; margin: 0 auto; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .lp-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; }
        .lp-logo { width: 34px; height: 34px; border-radius: 10px; background: #1f6b4c; color: #fff; display: grid; place-items: center; }
        .lp-brand span { color: #2f9a6c; }
        .lp-links { display: flex; align-items: center; gap: 10px; }
        .lp-ghost { padding: 10px 14px; border-radius: 11px; font-weight: 600; font-size: 14px; color: #1f6b4c; }
        .lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #1f6b4c; color: #fff; padding: 14px 22px; border-radius: 12px; font-weight: 700; font-size: 15px; min-height: 48px; }
        .lp-btn-light { background: #fff; color: #1f6b4c; }
        .lp-hero { max-width: 1120px; margin: 0 auto; padding: 64px 20px 40px; display: grid; grid-template-columns: 1.1fr .9fr; gap: 40px; align-items: center; }
        .lp-eyebrow { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #2f9a6c; background: #e4f1ea; padding: 6px 12px; border-radius: 999px; }
        .lp h1 { font-size: 52px; line-height: 1.04; letter-spacing: -.03em; margin: 18px 0 16px; }
        .lp h1 span { color: #2f9a6c; }
        .lp-lead { font-size: 18px; line-height: 1.6; color: #5e7267; margin: 0 0 26px; max-width: 540px; }
        .lp-cta { display: flex; gap: 12px; flex-wrap: wrap; }
        .lp-trust { margin-top: 22px; font-size: 13px; color: #6b7f74; }
        .lp-section { max-width: 1120px; margin: 0 auto; padding: 56px 20px; }
        .lp-section h2 { font-size: 34px; letter-spacing: -.02em; margin: 0 0 10px; }
        .lp-section > p.sub { color: #5e7267; font-size: 16px; margin: 0 0 28px; max-width: 620px; }
        .lp-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .lp-card { background: #fff; border: 1px solid #e3ebe6; border-radius: 18px; padding: 24px; }
        .lp-card h3 { margin: 0 0 8px; font-size: 18px; }
        .lp-card p { margin: 0; color: #5e7267; font-size: 15px; line-height: 1.55; }
        .lp-countries { display: flex; flex-wrap: wrap; gap: 10px; }
        .lp-country { background: #fff; border: 1px solid #e3ebe6; border-radius: 999px; padding: 8px 14px; font-size: 14px; font-weight: 600; display: inline-flex; gap: 8px; align-items: center; }
        .lp-country small { color: #6b7f74; font-weight: 600; }
        .lp-fees { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .lp-fee strong { display: block; font-size: 38px; letter-spacing: -.02em; color: #1f6b4c; margin: 6px 0; }
        .lp-band { background: #14241c; color: #e9f3ee; }
        .lp-band .lp-section h2 { color: #fff; }
        .lp-band .lp-section > p.sub { color: #a9bdb2; }
        .lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; counter-reset: s; }
        .lp-steps div { background: #1d3429; border-radius: 18px; padding: 22px; }
        .lp-steps i { font-style: normal; font-weight: 800; color: #6fcf9d; font-size: 14px; }
        .lp-steps p { margin: 8px 0 0; color: #bcd0c5; font-size: 15px; line-height: 1.5; }
        .lp-final { text-align: center; padding: 72px 20px; }
        .lp-final h2 { font-size: 36px; margin: 0 0 12px; letter-spacing: -.02em; }
        .lp-final p { color: #5e7267; margin: 0 0 24px; }
        .lp-foot { border-top: 1px solid #e3ebe6; padding: 24px 20px; text-align: center; color: #6b7f74; font-size: 13px; }
        .lp-foot a { margin: 0 10px; font-weight: 600; color: #1f6b4c; }
        @media (max-width: 900px) {
          .lp-hero { grid-template-columns: 1fr; padding-top: 40px; }
          .lp h1 { font-size: 40px; }
          .lp-cards, .lp-fees, .lp-steps { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .lp-hero { padding: 28px 16px 24px; }
          .lp h1 { font-size: 32px; }
          .lp-lead { font-size: 16px; }
          .lp-section { padding: 40px 16px; }
          .lp-section h2 { font-size: 26px; }
          .lp-ghost { display: none; }
          .lp-btn { width: 100%; }
          .lp-cta { flex-direction: column; }
        }
      `}</style>

      <header className="lp-nav">
        <div className="lp-nav-in">
          <Link href="/" className="lp-brand"><span className="lp-logo">f</span><div>flash<span>pay</span></div></Link>
          <nav className="lp-links">
            <Link className="lp-ghost" href="/docs/api">Documentation</Link>
            <Link className="lp-ghost" href="/login">Connexion</Link>
            <Link className="lp-btn" href="/signup">Créer un compte</Link>
          </nav>
        </div>
      </header>

      <section className="lp-hero">
        <div>
          <span className="lp-eyebrow">Encaissements mobile money</span>
          <h1>Encaisse en <span>mobile money</span>, suis tout depuis un seul espace.</h1>
          <p className="lp-lead">FlashPay relie ton activité aux opérateurs de la zone franc et d’Afrique de l’Ouest : tu encaisses, tu suis chaque paiement et tu gardes le contrôle pays par pays.</p>
          <div className="lp-cta">
            <Link className="lp-btn" href="/signup">Commencer gratuitement →</Link>
            <Link className="lp-btn lp-btn-light" href="/docs/api" style={{ border: "1px solid #dbe5df" }}>Voir la documentation</Link>
          </div>
          <p className="lp-trust">Accès personnel sécurisé · Paiements réels activés après vérification du compte</p>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 8 }}>
        <h2>Voici comment ça marche.</h2>
        <p className="sub">De la demande au solde de ton portefeuille, en quatre étapes.</p>
        <ProductDemo />
      </section>

      <section className="lp-section">
        <h2>Tout ce qu’il faut, rien de superflu.</h2>
        <p className="sub">Une interface claire pour toi, une API propre pour tes développeurs.</p>
        <div className="lp-cards">
          {features.map((f) => (
            <article className="lp-card" key={f.title}><h3>{f.title}</h3><p>{f.text}</p></article>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>Des pays, des opérateurs, une seule intégration.</h2>
        <p className="sub">La disponibilité réelle des opérateurs est vérifiée avant chaque demande de paiement.</p>
        <div className="lp-countries">
          {SUPPORTED_COUNTRIES.map((c) => (
            <span className="lp-country" key={c.code}>{c.name} <small>{c.currency}</small></span>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2>Des frais lisibles, à leur place.</h2>
        <p className="sub">Les mêmes règles pour tous les comptes. Le client paie +2,5 % en plus du montant demandé.</p>
        <div className="lp-fees">
          {pricing.map((p) => (
            <article className="lp-card lp-fee" key={p.label}><span>{p.label}</span><strong>{p.value}</strong><p>{p.note}</p></article>
          ))}
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-section">
          <h2>Trois étapes pour commencer.</h2>
          <p className="sub">Du compte à ton premier encaissement.</p>
          <div className="lp-steps">
            <div><i>01</i><p>Crée ton compte et renseigne ton pays.</p></div>
            <div><i>02</i><p>Crée ta clé API et branche FlashPay sur ton SaaS.</p></div>
            <div><i>03</i><p>Le client confirme sur son téléphone, le portefeuille se met à jour.</p></div>
          </div>
        </div>
      </section>

      <section className="lp-final">
        <h2>Prêt à encaisser ?</h2>
        <p>Crée ton compte en quelques minutes.</p>
        <Link className="lp-btn" href="/signup">Créer un compte →</Link>
      </section>

      <footer className="lp-foot">
        <div>© 2026 FlashPay</div>
        <div style={{ marginTop: 8 }}>
          <Link href="/docs/api">Documentation</Link>
          <Link href="/login">Connexion</Link>
          <Link href="/signup">Inscription</Link>
        </div>
      </footer>
    </div>
  );
}
