"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp, ShieldCheck, Sparkles } from "lucide-react";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";

const processorRate = 2.5;
const formatMoney = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

export default function LandingPage() {
  const [amount, setAmount] = useState(100000);
  const [platformRate, setPlatformRate] = useState(1);
  const [passFee, setPassFee] = useState(true);
  const [feeCountryCode, setFeeCountryCode] = useState("CM");
  const selectedCountry = SUPPORTED_COUNTRIES.find((country) => country.code === feeCountryCode) ?? SUPPORTED_COUNTRIES[0];
  const processorFee = passFee ? 0 : amount - amount / (1 + processorRate / 100);
  const settledAmount = passFee ? amount : amount / (1 + processorRate / 100);
  const platformFee = amount * platformRate / 100;
  const recipientEstimate = Math.max(0, settledAmount - platformFee);
  const customerPays = passFee ? amount * (1 + processorRate / 100) : amount;

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="FlashPay accueil"><span className="landing-logo">f<i /></span><span>flash<span>pay</span></span></Link>
        <nav className="landing-links" aria-label="Navigation du site"><a href="#experience">La plateforme</a><a href="#countries">Pays</a><a href="#fees">Frais</a><Link href="/docs/api">Documentation API</Link></nav>
        <div className="landing-actions"><Link className="landing-login" href="/login">Connexion</Link><Link className="landing-cta landing-cta-small" href="/signup">Créer un compte <ArrowRight size={15} /></Link></div>
      </header>

      <section className="landing-hero" id="experience">
        <div className="hero-copy">
          <span className="hero-kicker"><span className="hero-kicker-dot" /> L’ESSENTIEL DU PAIEMENT, ENFIN RÉUNI</span>
          <h1>FlashPay<span className="hero-title-dot">.</span><br /><span className="hero-title-soft">Recevoir devient</span><br />plus simple.</h1>
          <p>Un espace personnel pour encaisser par mobile money, suivre tes paiements et garder le contrôle, pays par pays.</p>
          <div className="hero-actions"><Link className="landing-cta" href="/signup">Découvrir FlashPay <ArrowRight size={17} /></Link><a className="landing-text-link" href="#fees">Voir les frais estimés <ArrowDownLeft size={15} /></a></div>
          <div className="hero-assurance"><span><ShieldCheck size={15} /> Accès personnel sécurisé</span><i /><span>13 pays ciblés</span></div>
        </div>

        <div className="phone-stage" aria-label="Aperçu animé de l’application FlashPay">
          <div className="stage-lines" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="phone-orbit orbit-a" aria-hidden="true" /><div className="phone-orbit orbit-b" aria-hidden="true" />
          <div className="float-label float-label-mtn"><span className="mini-provider mini-mtn">M</span><span>MTN Mobile Money</span><Check size={13} /></div>
          <div className="float-label float-label-secure"><ShieldCheck size={15} /><span>Paiement confirmé</span></div>
          <div className="phone-device"><div className="phone-frame"><div className="phone-screen">
            <div className="phone-status"><span>9:41</span><span className="phone-signal"><i /><i /><i /><b /></span></div><div className="phone-notch" />
            <div className="phone-appbar"><span className="phone-mini-brand">f<span>p</span></span><span className="phone-avatar">A</span></div>
            <div className="phone-greeting">Bonjour Amara <span>✳</span></div><div className="phone-balance-label">SOLDE DISPONIBLE</div><div className="phone-balance">428 500 <small>FCFA</small></div><div className="phone-trend"><ArrowUpRight size={12} /> +8,4 % ce mois</div>
            <div className="phone-quick-actions"><span><i><ArrowDownLeft size={15} /></i>Recevoir</span><span><i><ArrowRight size={15} /></i>Envoyer</span><span><i><Sparkles size={15} /></i>Services</span></div>
            <div className="phone-activity-head"><strong>Activité récente</strong><span>Tout voir</span></div>
            <div className="phone-payment-row"><span className="phone-payment-avatar payment-sun">M</span><span className="phone-payment-copy"><strong>MTN Money</strong><small>Reçu · 10:42</small></span><strong>+85 000<small>FCFA</small></strong></div>
            <div className="phone-payment-row"><span className="phone-payment-avatar payment-peach">O</span><span className="phone-payment-copy"><strong>Orange Money</strong><small>Reçu · Hier</small></span><strong>+42 000<small>FCFA</small></strong></div><div className="phone-tabbar"><i /><i /><i /><i /></div>
          </div></div></div>
          <div className="float-label float-label-countries"><span>CM</span><i /><span>CD</span><i /><span>SN</span><i /><span>+10</span></div>
          <span className="stage-caption">TON ESPACE, PARTOUT AVEC TOI</span>
        </div>
        <a className="hero-scroll" href="#countries"><span /> DÉFILER</a>
      </section>

      <section className="landing-country-band" id="countries"><div className="section-overline">UN MÊME ESPACE, PLUSIEURS MARCHÉS</div><div className="country-band-copy"><h2>Conçu pour les réalités locales.</h2><p>Pays ciblés. Méthodes de paiement confirmées selon la disponibilité des opérateurs.</p></div><div className="country-marquee"><div className="country-track">{SUPPORTED_COUNTRIES.map((country) => <span className="country-chip" key={country.code}><i>{country.code}</i>{country.name}</span>)}</div></div><div className="country-note"><CircleHelp size={15} /> Être dans cette liste ne garantit pas la disponibilité des opérateurs. FlashPay vérifie les méthodes disponibles avant chaque demande.</div></section>

      <section className="landing-fees" id="fees">
        <div className="fees-copy"><span className="section-overline">DES CHIFFRES LISIBLES</span><h2>Chaque frais,<br /><span>à sa place.</span></h2><p>Les frais de traitement de base sont de 2,5 %. Ton accord peut prévoir un autre taux selon le pays. Simule l’effet d’une commission FlashPay avant de fixer ton offre.</p><div className="fees-disclaimer"><ShieldCheck size={16} /><span>Estimation uniquement. Le taux de ton accord fait foi.</span></div></div>
        <div className="fee-tool" aria-label="Simulateur indicatif des frais"><div className="fee-tool-head"><div><span className="tool-kicker">SIMULATEUR INDICATIF</span><h3>Estime une collecte</h3></div><label className="tool-currency"><span className="sr-only">Pays de simulation</span><select aria-label="Pays de simulation" onChange={(event) => setFeeCountryCode(event.target.value)} style={{ appearance: "none", border: 0, outline: 0, background: "transparent", color: "inherit", font: "inherit", cursor: "pointer" }} value={feeCountryCode}>{SUPPORTED_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.code} · {country.currency}</option>)}</select><ChevronDown size={13} /></label></div>
          <label className="tool-label" htmlFor="fee-amount">Montant de la collecte</label><div className="tool-amount"><input id="fee-amount" min="100" onChange={(event) => setAmount(Math.max(100, Number(event.target.value) || 100))} type="number" value={amount} /><span>{selectedCountry.currency}</span></div>
          <label className="fee-toggle"><span><strong>Faire payer les frais de traitement au client</strong><small>+{processorRate}% estimés</small></span><input checked={passFee} onChange={(event) => setPassFee(event.target.checked)} type="checkbox" /><i /></label>
          <div className="fee-slider-head"><label htmlFor="fee-rate">Commission FlashPay envisagée</label><strong>{platformRate.toFixed(1)}%</strong></div><input className="fee-slider" id="fee-rate" max="5" min="0" onChange={(event) => setPlatformRate(Number(event.target.value))} step="0.1" type="range" value={platformRate} />
          <div className="fee-breakdown"><div><span>Le client paie</span><strong>{formatMoney(customerPays)} {selectedCountry.currency}</strong></div><div><span>Frais de traitement estimés</span><strong>{formatMoney(processorFee)} {selectedCountry.currency}</strong></div><div><span>Commission FlashPay simulée</span><strong>{formatMoney(platformFee)} {selectedCountry.currency}</strong></div><div className="fee-net"><span>Montant estimé pour le bénéficiaire</span><strong>{formatMoney(recipientEstimate)} {selectedCountry.currency}</strong></div></div>
          <p className="fee-tool-foot">Simulation sans effet sur les paiements. La commission doit être validée contractuellement.</p>
        </div>
      </section>

      <section className="landing-api" id="api"><div className="api-visual"><div className="api-window"><div className="api-window-top"><span /><span /><span /><small>flashpay · api</small></div><pre><code><span className="code-muted">POST</span> /v1/collections<br /><br />{"{"}<br />  <span className="code-key">"country"</span>: <span className="code-string">"CM"</span>,<br />  <span className="code-key">"amount"</span>: <span className="code-number">25000</span>,<br />  <span className="code-key">"method"</span>: <span className="code-string">"MTN"</span><br />{"}"}</code></pre><div className="api-response"><Check size={13} /> Mode démo · aucun paiement réel</div></div></div><div className="api-copy"><span className="section-overline">POUR LES CRÉATEURS</span><h2>Une API claire.<br /><span>À intégrer à ton produit.</span></h2><p>Consulte la documentation et prépare une intégration de test avant de brancher ton propre service.</p><div className="api-actions"><Link className="landing-cta" href="/docs/api">Lire la documentation <ArrowRight size={16} /></Link><span className="api-status"><i /> Production verrouillée</span></div><p className="production-note">Les clés de production exigent un KYC validé, des comptes bénéficiaires approuvés et l’accord écrit de Swychr. Cette version ne les génère pas.</p></div></section>

      <section className="landing-close"><div><span className="section-overline">TON PROCHAIN PAS</span><h2>Prêt à recevoir autrement ?</h2><p>Crée ton espace et découvre le parcours de démonstration.</p></div><Link className="landing-cta" href="/signup">Créer mon compte <ArrowRight size={17} /></Link></section>
      <footer className="landing-footer"><Link className="landing-brand" href="/"><span className="landing-logo">f<i /></span><span>flash<span>pay</span></span></Link><span>© 2026 FlashPay · Paiements de démonstration</span><div><Link href="/docs/api">Documentation</Link><Link href="/login">Connexion</Link></div></footer>
    </main>
  );
}
