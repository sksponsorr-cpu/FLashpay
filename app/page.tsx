import Link from "next/link";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";
import FeeEstimator from "@/components/fee-estimator";

const transactions = [
  { op: "M", name: "MTN MoMo · Aïcha N.", ref: "FP-1042", status: "Réussi", amount: "42 300", delay: "0.6s", tone: "gold" },
  { op: "O", name: "Orange Money · Moussa D.", ref: "FP-1041", status: "Réussi", amount: "28 200", delay: "1.5s", tone: "orange" },
  { op: "M", name: "MTN MoMo · Grace K.", ref: "FP-1040", status: "Réussi", amount: "79 900", delay: "2.4s", tone: "gold" },
  { op: "O", name: "Orange Money · Paul T.", ref: "FP-1039", status: "En attente", amount: "18 800", delay: "3.3s", tone: "orange" },
];

const features = [
  { title: "Encaisse par mobile money", text: "MTN, Orange, Moov, Wave et les autres opérateurs de ton pays, depuis une seule intégration." },
  { title: "Un portefeuille par devise", text: "Chaque encaissement alimente le portefeuille de sa devise : FCFA, CDF, NGN, RWF." },
  { title: "Une API pour tes développeurs", text: "Clés API, webhooks signés et documentation claire pour brancher FlashPay sur ton SaaS." },
];

const pricing = [
  { label: "Encaissement", value: "6 %", note: "Commission FlashPay, pour tous les comptes. Le client paie 2,5 % de frais en plus." },
  { label: "Retrait", value: "5 %", note: "0 % avec l’abonnement Premium. Minimum 1 USD converti." },
  { label: "Conversion", value: "4,5 %", note: "1 % avec un abonnement actif." },
];

const steps = [
  { n: "1", title: "Crée ton compte", text: "Renseigne ton pays et ton activité." },
  { n: "2", title: "Branche ton SaaS", text: "Crée une clé API et envoie tes demandes de paiement." },
  { n: "3", title: "Encaisse", text: "Le client valide sur son téléphone. Le solde se met à jour." },
];

const flag = (code: string) => String.fromCodePoint(...code.toUpperCase().split("").map((c) => 127397 + c.charCodeAt(0)));
const countryBand = [...SUPPORTED_COUNTRIES, ...SUPPORTED_COUNTRIES];

const faqs = [
  { q: "Qu’est-ce que FlashPay ?", a: "FlashPay permet à ton SaaS d’encaisser des paiements mobile money auprès de tes clients, de suivre chaque transaction et de retrouver ton solde par devise." },
  { q: "Quels opérateurs sont acceptés ?", a: "MTN, Orange, Moov, Wave et les autres opérateurs disponibles dans ton pays, depuis une seule intégration." },
  { q: "Qui paie les frais ?", a: "Le client paie 2,5 % en plus du montant demandé. FlashPay retient 6 % sur ton encaissement. Tu vois toujours le montant exact avant de demander le paiement." },
  { q: "Comment retirer mon argent ?", a: "Tu fais une demande de retrait depuis ton portefeuille. Les frais de retrait sont de 5 %, et de 0 % avec l’abonnement Premium." },
  { q: "Mes données et mes paiements sont-ils sécurisés ?", a: "L’accès à ton compte est protégé. Les notifications de paiement de l’API sont signées pour que ton serveur puisse vérifier leur origine." },
  { q: "Puis-je tester avant de passer en réel ?", a: "Oui. Tu peux créer une clé de test pour intégrer FlashPay sans encaisser de vrais paiements. Les clés réelles s’activent après vérification de ton compte." },
];

const css = `
  .fp { min-height: 100vh; background: #ffffff; color: #0d1712; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-x: hidden; }
  .fp * { box-sizing: border-box; }
  .fp a { color: inherit; text-decoration: none; }
  .fp-serif { font-family: Georgia, "Times New Roman", serif; }

  .fp-nav { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,.94); backdrop-filter: blur(10px); border-bottom: 1px solid #f3e3dc; }
  .fp-nav-in { max-width: 1160px; margin: 0 auto; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .fp-brand { display: flex; align-items: center; gap: 9px; font-weight: 800; font-size: 19px; letter-spacing: -.01em; }
  .fp-logo { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(145deg, #ff6a3d, #d93a1f); display: grid; place-items: center; color: #fff; font-weight: 900; }
  .fp-brand span { color: #d93a1f; }
  .fp-nav-links { display: flex; align-items: center; gap: 6px; }
  .fp-ghost { padding: 10px 12px; border-radius: 12px; font-weight: 600; font-size: 14px; color: #33463c; }
  .fp-cta { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 0 24px; border-radius: 14px; background: linear-gradient(180deg, #ff6a3d, #e8401f); color: #fff; font-weight: 700; font-size: 16px; overflow: hidden; box-shadow: 0 12px 26px -12px rgba(232,64,31,.8); transition: transform .2s ease, box-shadow .2s ease; white-space: nowrap; }
  .fp-cta:hover { transform: translateY(-2px); box-shadow: 0 18px 32px -12px rgba(232,64,31,.9); }
  .fp-cta::after { content: ""; position: absolute; top: 0; bottom: 0; width: 50px; left: -80px; background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-20deg); animation: fp-shine 3.4s ease-in-out infinite; }
  .fp-cta.sm { min-height: 40px; padding: 0 14px; font-size: 14px; border-radius: 12px; }
  .fp-cta.block { width: 100%; }

  .fp-hero { max-width: 1160px; margin: 0 auto; padding: 34px 18px 10px; text-align: center; }
  .fp-hero h1 { margin: 10px auto 0; font-size: 46px; line-height: 1.08; letter-spacing: -.02em; font-weight: 800; max-width: 900px; font-family: Georgia, "Times New Roman", serif; }
  .fp-hero h1 em { font-style: normal; color: #d93a1f; }
  .fp-lead { margin: 18px auto 26px; font-size: 18px; line-height: 1.6; color: #4a5d52; max-width: 560px; }
  .fp-hero-cta { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .fp-link { display: inline-flex; align-items: center; min-height: 50px; padding: 0 22px; border-radius: 14px; border: 1px solid #f0cfc2; font-weight: 700; font-size: 16px; color: #d93a1f; }

  .fp-stage { position: relative; max-width: 560px; height: 500px; margin: 40px auto 0; }
  .fp-card-pay { position: absolute; left: 4%; top: 6%; width: 300px; background: #fff; border: 1px solid #f3e3dc; border-radius: 18px; box-shadow: 0 30px 60px -30px rgba(13,23,18,.35); overflow: hidden; z-index: 2; text-align: left; animation: fp-float 8s ease-in-out infinite; }
  .fp-card-top { background: #0d1712; color: #fff; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .fp-card-top small { display: block; font-size: 11px; color: #e7c4b8; }
  .fp-card-top b { font-size: 14px; }
  .fp-card-top .amt { text-align: right; font-size: 17px; font-weight: 800; }
  .fp-card-body { padding: 14px 16px 16px; }
  .fp-card-body h4 { margin: 0 0 10px; font-size: 14px; }
  .fp-opt { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .fp-opt div { border: 1px solid #f3e3dc; border-radius: 12px; padding: 10px 6px; font-size: 11px; font-weight: 700; text-align: center; color: #33463c; }
  .fp-opt div.on { background: linear-gradient(180deg, #ff6a3d, #e8401f); color: #fff; border-color: transparent; }
  .fp-input { margin-top: 12px; height: 40px; border: 1px solid #f3e3dc; border-radius: 10px; display: flex; align-items: center; padding: 0 12px; font-size: 13px; color: #7d9187; }

  .fp-person { position: absolute; right: 0; bottom: 0; width: 290px; height: 400px; border-radius: 26px; overflow: hidden; background: #fbe5e5; z-index: 1; box-shadow: 0 30px 60px -30px rgba(13,23,18,.35); }
  .fp-person img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 25%; display: block; }
  .fp-ok { position: absolute; left: 0; bottom: 36px; z-index: 3; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px; background: linear-gradient(180deg, #ff6a3d, #e8401f); color: #fff; text-align: left; box-shadow: 0 22px 40px -18px rgba(232,64,31,.9); animation: fp-float 6.5s ease-in-out infinite reverse; min-width: 260px; }
  .fp-ok .ic { width: 38px; height: 38px; border-radius: 12px; background: #fff; color: #e8401f; display: grid; place-items: center; font-weight: 900; flex-shrink: 0; }
  .fp-ok b { display: block; font-size: 15px; }
  .fp-ok small { font-size: 12px; opacity: .92; }

  .fp-tx { position: absolute; left: 2%; top: 0; width: 250px; background: #0d1712; border-radius: 22px; padding: 14px; z-index: 4; box-shadow: 0 30px 60px -26px rgba(0,0,0,.6); text-align: left; }
  .fp-tx-head { display: flex; align-items: center; justify-content: space-between; color: #fff; margin-bottom: 10px; }
  .fp-tx-head b { font-size: 13px; }
  .fp-tx-head small { font-size: 10px; color: #ff6a3d; }
  .fp-tx-bal { background: linear-gradient(160deg, #c9361c, #7a1d0c); border-radius: 14px; padding: 10px 12px; color: #fff; margin-bottom: 8px; }
  .fp-tx-bal small { font-size: 10px; color: #ffd8cc; }
  .fp-tx-bal b { display: block; font-size: 19px; margin-top: 2px; }
  .fp-row { display: grid; grid-template-columns: 26px 1fr auto; gap: 8px; align-items: center; background: #241512; border: 1px solid #3d2420; border-radius: 12px; padding: 7px 8px; margin-top: 6px; opacity: 0; transform: translateY(12px); animation: fp-in .7s cubic-bezier(.2,.8,.2,1) forwards; }
  .fp-ico { width: 26px; height: 26px; border-radius: 9px; background: #ffd966; color: #3a2a00; font-weight: 900; font-size: 11px; display: grid; place-items: center; }
  .fp-ico.orange { background: #ffb38a; color: #4a1f00; }
  .fp-row-info { min-width: 0; color: #fff; }
  .fp-row-info strong { display: block; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fp-row-info span { font-size: 9px; color: #c9a59a; }
  .fp-row-amt { font-size: 10px; font-weight: 800; color: #ff6a3d; white-space: nowrap; }

  .fp-band { margin-top: 36px; overflow: hidden; border-top: 1px solid #f3e3dc; border-bottom: 1px solid #f3e3dc; padding: 16px 0; background: #fff7f4; }
  .fp-track { display: flex; gap: 12px; width: max-content; animation: fp-marquee 40s linear infinite; }
  .fp-track span { padding: 8px 14px; border-radius: 999px; background: #fff; border: 1px solid #f0d9cf; font-size: 14px; color: #33463c; white-space: nowrap; }

  .fp-sec { max-width: 1160px; margin: 0 auto; padding: 72px 18px 0; }
  .fp-sec-head { text-align: center; margin-bottom: 34px; }
  .fp-eyebrow { font-size: 12px; font-weight: 800; letter-spacing: .14em; color: #d93a1f; text-transform: uppercase; }
  .fp-sec h2 { font-family: Georgia, "Times New Roman", serif; font-size: 36px; line-height: 1.12; letter-spacing: -.02em; margin: 12px auto 12px; font-weight: 700; max-width: 720px; }
  .fp-sec-head p { color: #4a5d52; font-size: 17px; line-height: 1.6; max-width: 620px; margin: 0 auto; }
  .fp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .fp-item { display: flex; gap: 14px; align-items: flex-start; padding: 22px; border-radius: 18px; background: #fff; border: 1px solid #f3e3dc; }
  .fp-item .sq { width: 44px; height: 44px; border-radius: 14px; background: #fff0eb; color: #d93a1f; display: grid; place-items: center; font-weight: 800; flex-shrink: 0; }
  .fp-item h3 { margin: 2px 0 6px; font-size: 17px; }
  .fp-item p { margin: 0; color: #4a5d52; font-size: 15px; line-height: 1.6; }
  .fp-price { padding: 24px; border-radius: 18px; background: #fff7f4; border: 1px solid #f3e3dc; }
  .fp-price .big { font-family: Georgia, "Times New Roman", serif; font-size: 44px; font-weight: 700; color: #d93a1f; margin: 6px 0 8px; }
  .fp-price p { margin: 0; color: #4a5d52; font-size: 15px; line-height: 1.6; }
  .fp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .fp-step { padding: 24px; border-radius: 18px; border: 1px solid #f3e3dc; }
  .fp-step i { font-style: normal; width: 36px; height: 36px; border-radius: 12px; background: #d93a1f; color: #fff; font-weight: 800; display: grid; place-items: center; }
  .fp-step h3 { margin: 16px 0 6px; font-size: 18px; }
  .fp-step p { margin: 0; color: #4a5d52; font-size: 15px; line-height: 1.55; }

  .fp-final { max-width: 1160px; margin: 72px auto 0; padding: 0 18px; }
  .fp-final-box { border-radius: 26px; padding: 56px 22px; text-align: center; background: #0d1712; color: #fff; }
  .fp-final-box h2 { font-family: Georgia, "Times New Roman", serif; font-size: 36px; margin: 0 0 12px; font-weight: 700; }
  .fp-final-box p { color: #e7c4b8; font-size: 17px; margin: 0 0 26px; }
  .fp-foot { margin-top: 64px; border-top: 1px solid #f3e3dc; padding: 26px 18px 34px; text-align: center; color: #6b7e73; font-size: 13px; }
  .fp-foot a { margin: 0 10px; color: #33463c; font-weight: 600; }

  .fe-card { display: grid; gap: 16px; margin-top: 26px; padding: 24px; border-radius: 18px; background: #0d1712; color: #fff; animation: fp-reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 30%; }
  .fe-head p { margin: 6px 0 0; color: #e7c4b8; font-size: 15px; }
  .fe-tag { font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #ff8a5c; }
  .fe-label { display: grid; gap: 6px; font-size: 13px; color: #e7c4b8; }
  .fe-label input { height: 50px; border-radius: 12px; border: 1px solid #3d2420; background: #15100d; color: #fff; padding: 0 14px; font-size: 18px; font-weight: 700; outline: none; transition: border-color .3s ease, box-shadow .3s ease; }
  .fe-label input:focus { border-color: #ff6a3d; box-shadow: 0 0 0 4px rgba(255,106,61,.2); }
  .fe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .fe-box { border-radius: 14px; padding: 14px; background: #241512; transition: transform .3s ease; }
  .fe-box small { color: #e7c4b8; font-size: 12px; }
  .fe-box-hot { background: linear-gradient(180deg, #ff6a3d, #e8401f); position: relative; overflow: hidden; }
  .fe-box-hot small { color: #fff; opacity: .9; }
  .fe-box-hot::after { content: ""; position: absolute; top: 0; bottom: 0; width: 60px; left: -80px; background: linear-gradient(100deg, transparent, rgba(255,255,255,.4), transparent); transform: skewX(-20deg); animation: fp-shine 3.8s ease-in-out infinite; }
  .fe-num { font-size: 20px; font-weight: 800; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .fe-num span { font-size: 12px; }
  .fe-bar { height: 8px; border-radius: 99px; background: #2a1a15; overflow: hidden; }
  .fe-bar i { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #ff8a5c, #ff6a3d); transition: width .8s cubic-bezier(.2,.8,.2,1); }
  .fe-bar-static i { width: var(--w, 92%); }
  .fe-note { color: #c9a59a; font-size: 12px; line-height: 1.5; }
  @keyframes fp-in { to { opacity: 1; transform: none; } }
  @keyframes fp-up { from { opacity: 0; transform: translateY(36px); filter: blur(6px); } to { opacity: 1; transform: none; filter: blur(0); } }
  @keyframes fp-reveal { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
  .fp-hero h1, .fp-hero .fp-lead, .fp-hero .fp-hero-cta { animation: fp-up .9s cubic-bezier(.2,.8,.2,1) both; }
  .fp-hero .fp-lead { animation-delay: .12s; }
  .fp-hero .fp-hero-cta { animation-delay: .24s; }
  .fp-stage { animation: fp-up 1.1s .35s cubic-bezier(.2,.8,.2,1) both; }
  .fp-sec, .fp-final { animation: fp-reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 30%; }
  .fp-band { animation: fp-reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 30%; }
  .fp-item, .fp-price, .fp-step { transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease; }
  .fp-item:hover, .fp-price:hover, .fp-step:hover { transform: translateY(-4px); box-shadow: 0 24px 40px -28px rgba(13,23,18,.45); border-color: #f0cfc2; }
  .fp-faq { display: grid; gap: 10px; max-width: 760px; margin: 0 auto; }
  .fp-faq details { border: 1px solid #f3e3dc; border-radius: 16px; padding: 0 20px; background: #fff; transition: border-color .3s ease, box-shadow .3s ease; }
  .fp-faq details[open] { border-color: #f0cfc2; box-shadow: 0 18px 30px -24px rgba(13,23,18,.45); }
  .fp-faq summary { cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 0; font-weight: 700; font-size: 16px; }
  .fp-faq summary::-webkit-details-marker { display: none; }
  .fp-faq summary::after { content: "+"; width: 30px; height: 30px; border-radius: 10px; background: #fff0eb; color: #d93a1f; display: grid; place-items: center; font-size: 20px; font-weight: 700; flex-shrink: 0; transition: transform .3s ease; }
  .fp-faq details[open] summary::after { transform: rotate(45deg); }
  .fp-faq details p { margin: 0 0 18px; color: #4a5d52; font-size: 15px; line-height: 1.65; animation: fp-up .5s ease both; }
  @keyframes fp-shine { 0% { left: -80px; } 60%,100% { left: 110%; } }
  @keyframes fp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  @keyframes fp-marquee { to { transform: translateX(-50%); } }

  @media (min-width: 760px) {
    .fp-hero h1 { font-size: 60px; }
    .fp-grid, .fp-steps { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 760px) {
    .fp-grid, .fp-steps { grid-template-columns: 1fr; }
    .fp-sec h2 { font-size: 30px; }
    .fp-nav-links .fp-ghost { display: none; }
  }
  @media (max-width: 480px) {
    .fp-hero { padding-top: 26px; }
    .fp-hero h1 { font-size: 36px; }
    .fp-lead { font-size: 16px; }
    .fp-hero-cta { width: 100%; }
    .fp-hero-cta .fp-cta, .fp-hero-cta .fp-link { width: 100%; }
    .fp-stage { height: 540px; max-width: 390px; }
    .fp-card-pay { width: 230px; left: 0; top: 0; }
    .fp-card-top .amt { font-size: 14px; }
    .fp-opt div { font-size: 10px; }
    .fp-tx { width: 200px; top: 0; left: 0; padding: 10px; }
    .fp-person { width: 280px; height: 430px; right: -4px; bottom: 0; border-radius: 26px; }
    .fp-person img { object-position: 50% 15%; transform: scale(1.12); }
    .fp-ok { bottom: 14px; width: 250px; }
    .fp-tx-bal b { font-size: 16px; }
    .fp-row { grid-template-columns: 22px 1fr auto; padding: 6px; }
    .fp-ico { width: 22px; height: 22px; font-size: 9px; }
    .fp-ok { left: 0; bottom: 18px; min-width: 0; width: 230px; padding: 12px; }
    .fp-ok .ic { width: 32px; height: 32px; }
    .fp-ok b { font-size: 13px; }
    .fp-ok small { font-size: 11px; }
    .fp-final-box h2, .fp-sec h2 { font-size: 28px; }
    .fp-final-box { padding: 44px 18px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .fp *, .fp *::before, .fp *::after { animation: none !important; }
    .fp-row { opacity: 1; transform: none; }
  }
`;

export default function LandingPage() {
  return (
    <main className="fp">
      <style>{css}</style>

      <header className="fp-nav">
        <div className="fp-nav-in">
          <Link href="/" className="fp-brand"><span className="fp-logo">f</span><div>flash<span>pay</span></div></Link>
          <nav className="fp-nav-links">
            <Link className="fp-ghost" href="/docs/api">Documentation</Link>
            <Link className="fp-ghost" href="/login">Connexion</Link>
            <Link className="fp-cta sm" href="/signup">Commencer maintenant</Link>
          </nav>
        </div>
      </header>

      <section className="fp-hero">
        <h1>
          Encaisse les paiements de ton SaaS <em>dans toute l’Afrique.</em>
        </h1>
        <p className="fp-lead">Demande un paiement mobile money, suis chaque transaction et retrouve ton solde par devise.</p>
        <div className="fp-hero-cta">
          <Link className="fp-cta" href="/signup">Commencer gratuitement</Link>
          <Link className="fp-link" href="/docs/api">Voir la documentation</Link>
        </div>

        <div className="fp-stage">
          <div className="fp-person">
            <img src="/hero-person.jpg" alt="Un client FlashPay qui reçoit son paiement" />
          </div>

          <div className="fp-tx">
            <div className="fp-tx-head"><b>Encaissements</b><small>● en direct</small></div>
            <div className="fp-tx-bal"><small>Solde XAF</small><b>428 500 FCFA</b></div>
            {transactions.map((t) => (
              <div key={t.ref} className="fp-row" style={{ animationDelay: t.delay }}>
                <div className={`fp-ico ${t.tone === "orange" ? "orange" : ""}`}>{t.op}</div>
                <div className="fp-row-info"><strong>{t.name}</strong><span>{t.ref} · {t.status}</span></div>
                <div className="fp-row-amt">+{t.amount}</div>
              </div>
            ))}
          </div>

          <div className="fp-ok">
            <div className="ic">✓</div>
            <div><b>Paiement approuvé</b><small>Votre paiement de 25 000 FCFA a été approuvé</small></div>
          </div>
        </div>
      </section>

      <section className="fp-band" aria-label="Pays couverts">
        <div className="fp-track">
          {countryBand.map((c, i) => <span key={`${c.code}-${i}`}>{flag(c.code)} {c.name}</span>)}
        </div>
      </section>

      <section className="fp-sec">
        <div className="fp-sec-head">
          <span className="fp-eyebrow">Ce que tu obtiens</span>
          <h2>Tout ce qu’il faut pour encaisser, rien de superflu.</h2>
          <p>Une interface claire pour toi, une API propre pour tes développeurs.</p>
        </div>
        <div className="fp-grid">
          {features.map((f, i) => (
            <article className="fp-item" key={f.title}>
              <div className="sq">{i + 1}</div>
              <div><h3>{f.title}</h3><p>{f.text}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="fp-sec">
        <div className="fp-sec-head">
          <span className="fp-eyebrow">Des frais lisibles</span>
          <h2>Les mêmes règles pour tous les comptes.</h2>
          <p>Le client paie 2,5 % en plus du montant demandé. Tu reçois le montant moins 6 %.</p>
        </div>
        <FeeEstimator />
        <div className="fp-grid">
          {pricing.map((p) => (
            <article className="fp-price" key={p.label}>
              <span className="fp-eyebrow">{p.label}</span>
              <div className="big">{p.value}</div>
              <p>{p.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fp-sec">
        <div className="fp-sec-head">
          <span className="fp-eyebrow">Comment ça marche</span>
          <h2>Trois étapes pour ton premier encaissement.</h2>
          <p>De la création du compte au solde de ton portefeuille.</p>
        </div>
        <div className="fp-steps">
          {steps.map((s) => (
            <div className="fp-step" key={s.n}><i>{s.n}</i><h3>{s.title}</h3><p>{s.text}</p></div>
          ))}
        </div>
      </section>

      <section className="fp-sec">
        <div className="fp-sec-head">
          <span className="fp-eyebrow">Questions fréquentes</span>
          <h2>Tout ce qu’il faut savoir avant de commencer.</h2>
        </div>
        <div className="fp-faq">
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="fp-final">
        <div className="fp-final-box">
          <h2>Prêt à encaisser en mobile money ?</h2>
          <p>Crée ton compte en quelques minutes, sans engagement.</p>
          <Link className="fp-cta" href="/signup">Commencer gratuitement</Link>
        </div>
      </section>

      <footer className="fp-foot">
        <div>© 2026 FlashPay</div>
        <div style={{ marginTop: 10 }}>
          <Link href="/docs/api">Documentation</Link>
          <Link href="/login">Connexion</Link>
          <Link href="/signup">Inscription</Link>
        </div>
      </footer>
    </main>
  );
}
