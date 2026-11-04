"use client";

import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  Code2,
  CircleHelp,
  Clock3,
  Download,
  Ellipsis,
  FileCheck2,
  LayoutDashboard,
  Link2,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";
import ApiKeyManager from "@/components/api-key-manager";

type Payment = {
  reference: string;
  customer: string;
  initials: string;
  amount: number;
  method: string;
  date: string;
  status: "Réussi" | "En attente" | "Échoué";
  tint: string;
};

type Country = { code: string; name: string; currency: string };

const navigation = [
  { label: "Vue d’ensemble", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowDownLeft },
  { label: "Liens de paiement", icon: Link2 },
  { label: "Bénéficiaires", icon: UsersRound },
  { label: "Développeurs", icon: Code2 },
];

// Aucune transaction fictive : la liste se remplira avec les vraies transactions.
const starterPayments: Payment[] = [];

const money = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

function WorkspacePanel({ section, notify, onNewCollection }: { section: string; notify: (message: string) => void; onNewCollection: () => void }) {
  const [documentType, setDocumentType] = useState("Carte nationale d’identité");
  const [documentName, setDocumentName] = useState("");
  const [paidRows, setPaidRows] = useState<string[]>([]);
  // Aucun bénéficiaire fictif : la liste se remplira avec les vrais bénéficiaires.
  const beneficiaries: { name: string; country: string; amount: number; mobile: string }[] = [];

  if (section === "Vérification d’identité") {
    return <section className="workspace-view">
      <div className="view-intro"><span className="view-icon"><ShieldCheck size={19} /></span><div><h2>Vérification d’identité</h2><p>Votre identité doit être validée avant d’activer les encaissements.</p></div></div>
      <div className="verification-banner"><div className="verification-symbol"><Clock3 size={18} /></div><div><strong>Vérification à compléter</strong><span>Votre compte est en mode démonstration. Les pièces ne sont pas envoyées ni stockées.</span></div><span className="status-pill status-pending"><i />À compléter</span></div>
      <article className="panel verification-panel"><div className="panel-heading"><div><h2>Pièce d’identité</h2><p>Choisissez un document officiel valide à votre nom.</p></div><span className="step-count">ÉTAPE 1 SUR 2</span></div>
        <div className="document-options">{["Carte nationale d’identité", "Passeport", "Permis de conduire"].map((type) => <button key={type} className={`document-option ${documentType === type ? "document-option-active" : ""}`} onClick={() => setDocumentType(type)}><FileCheck2 size={17} /><span>{type}</span>{documentType === type && <Check size={16} />}</button>)}</div>
        <label className="upload-zone"><input accept="image/jpeg,image/png,application/pdf" type="file" onChange={(event) => { const name = event.target.files?.[0]?.name ?? ""; setDocumentName(name); if (name) notify("Fichier sélectionné sur cet appareil uniquement; aucun document n’a été transmis."); }} /><span className="upload-icon"><Plus size={19} /></span><strong>{documentName || "Ajouter une pièce d’identité"}</strong><span>JPG, PNG ou PDF · votre fichier reste sur cet appareil en démo</span></label>
        <button className="primary-button verify-button" disabled={!documentName} onClick={() => notify("Envoi désactivé en démo. L’upload sera activé après mise en place d’un stockage chiffré et d’un parcours KYC conforme.")}><span>Continuer la vérification</span><ArrowRight size={16} /></button>
        <p className="security-note"><ShieldCheck size={15} /> En production, vos documents nécessiteront un stockage privé et chiffré.</p>
      </article>
    </section>;
  }

  if (section === "Bénéficiaires") {
    return <section className="workspace-view">
      <div className="view-intro"><span className="view-icon"><UsersRound size={19} /></span><div><h2>Versements aux bénéficiaires</h2><p>Suivez les montants à régler manuellement après encaissement confirmé.</p></div><button className="export-button" onClick={() => notify("L’ajout de bénéficiaires sera activé après la mise en place des comptes sécurisés.")}><Plus size={15} />Ajouter</button></div>
      <div className="demo-banner"><span className="demo-pulse" /><strong>Suivi de démonstration</strong><span>Les montants ci-dessous sont fictifs; aucun versement n’est déclenché.</span></div>
      <article className="panel payout-panel"><div className="panel-heading"><div><h2>Versements en attente</h2><p>Montants à vérifier et à régler en dehors de FlashPay</p></div><span className="pending-label">0 FCFA à traiter</span></div>
          <div className="payout-list">{beneficiaries.map((person, index) => <div className="payout-row" key={person.name}><div className={`customer-avatar avatar-${["peach", "blue", "green"][index]}`}>{person.name.split(" ").map((part) => part[0]).join("")}</div><div className="payout-person"><strong>{person.name}</strong><span>{person.country} · {person.mobile}</span></div><strong className="payout-amount">{money(person.amount)} <small>FCFA</small></strong><button className="export-button" disabled={paidRows.includes(person.name)} onClick={() => { setPaidRows((current) => [...current, person.name]); notify("Simulation uniquement : aucun transfert d’argent n’a été effectué."); }}>{paidRows.includes(person.name) ? "Marqué en démo" : "Marquer traité"}</button></div>)}</div>
        <p className="security-note"><Wallet size={15} /> Les paiements encaissés sont crédités sur le portefeuille marchand. Ce tableau ne déclenche pas de transfert.</p>
      </article>
    </section>;
  }

  if (section === "Transactions") {
    return <section className="workspace-view"><div className="view-intro"><span className="view-icon"><ArrowDownLeft size={19} /></span><div><h2>Transactions</h2><p>Historique de démonstration des encaissements récents.</p></div><button className="export-button" onClick={() => notify("L’export sera disponible après connexion à un historique persistant.")}><Download size={15} />Exporter</button></div><article className="panel payout-panel"><div className="panel-heading"><div><h2>Toutes les opérations</h2><p>Les statuts réels seront alimentés par les notifications de paiement.</p></div></div><div className="payout-list">{starterPayments.map((payment) => <div className="payout-row" key={payment.reference}><div className={`customer-avatar avatar-${payment.tint}`}>{payment.initials}</div><div className="payout-person"><strong>{payment.customer}</strong><span>{payment.reference} · {payment.method}</span></div><span className={`status-pill status-${payment.status === "Réussi" ? "success" : payment.status === "En attente" ? "pending" : "failed"}`}><i />{payment.status}</span><strong className="payout-amount">{money(payment.amount)} <small>FCFA</small></strong></div>)}</div></article></section>;
  }

  if (section === "Développeurs") return <ApiKeyManager />;

  if (section === "Liens de paiement") {
    return <section className="workspace-view"><div className="view-intro"><span className="view-icon"><Link2 size={19} /></span><div><h2>Collecte de paiement</h2><p>Déclenchez une demande depuis votre interface FlashPay personnalisée.</p></div><button className="primary-button" onClick={onNewCollection}><Plus size={17} />Nouvelle collecte</button></div><article className="panel integration-card"><div className="integration-icon"><Sparkles size={20} /></div><h2>Un parcours de paiement à votre image</h2><p>FlashPay récupère les moyens de paiement disponibles auprès du prestataire de paiement, déclenche une demande côté serveur et attend une confirmation signée. Le client confirme sur son portefeuille mobile; la page ne marque jamais un paiement comme reçu sur la seule base d’une redirection.</p><div className="integration-steps"><span><i>01</i>Choix du pays et de l’opérateur</span><span><i>02</i>Confirmation sur mobile</span><span><i>03</i>Réception du webhook</span></div><div className="provider-note"><ShieldCheck size={16} /><span>Le paiement utilise un checkout hébergé par le prestataire pour le Nigeria. Les autres opérateurs mobiles suivent le parcours intégré documenté.</span></div></article></section>;
  }

  return <section className="workspace-view"><div className="view-intro"><span className="view-icon"><Wallet size={19} /></span><div><h2>Paramètres du compte</h2><p>Profil personnel et préférences de démonstration.</p></div></div><article className="panel settings-card"><div className="settings-row"><div><strong>Profil</strong><span>Compte particulier</span></div><button className="export-button" onClick={() => notify("La gestion du profil sera disponible après ajout de l’authentification.")}>Modifier</button></div><div className="settings-row"><div><strong>Pays de résidence</strong><span>Non renseigné</span></div><span className="settings-state">Compte de démonstration</span></div><div className="settings-row"><div><strong>Mode de paiement</strong><span>Les paiements réels sont désactivés</span></div><span className="settings-state">Démo active</span></div></article></section>;
}

export default function Home() {
  const [activeNav, setActiveNav] = useState("Vue d’ensemble");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [payments, setPayments] = useState(starterPayments);
  const [notice, setNotice] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState("");
  const [method, setMethod] = useState("MTN");
  const [countryCode, setCountryCode] = useState("CM");
  const [countryList, setCountryList] = useState<Country[]>(SUPPORTED_COUNTRIES.map((country) => ({ ...country })));
  const [availableMethods, setAvailableMethods] = useState<string[]>(["MTN", "ORANGE"]);
  const [methodsError, setMethodsError] = useState("");
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCountries = async () => {
      try {
        const response = await fetch("/api/countries");
        if (!response.ok) return;
        const result = await response.json();
        if (active && Array.isArray(result.countries) && result.countries.length) {
          setCountryList(result.countries);
        }
      } catch {
        return;
      }
    };
    void loadCountries();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setMethodsError("");
    fetch(`/api/swychr/payment-methods?country_code=${countryCode}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Moyens de paiement indisponibles.");
        return result.data?.payment_methods?.map((item: { payment_method: string }) => item.payment_method) ?? [];
      })
      .then((methods: string[]) => {
        if (!active) return;
        setAvailableMethods(methods);
        setMethod(methods[0] ?? "");
      })
      .catch((error) => {
        if (active) {
          setAvailableMethods([]);
          setMethodsError(error instanceof Error ? error.message : "Impossible de joindre le service de paiement.");
        }
      })
      .finally(() => {
        if (active) setMethodsLoading(false);
      });
    return () => { active = false; };
  }, [countryCode]);

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice("");
    try {
      const response = await fetch("/api/swychr/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: countryCode,
          name: customer,
          mobile: phone,
          amount: Number(amount),
          transaction_id: `FP-${Date.now()}`,
          payment_method: countryCode === "NG" ? undefined : method,
          description: "Collecte créée depuis FlashPay",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "La collecte n’a pas pu être créée.");
      if (result.mode === "demo") {
        setPayments((current) => [{
          reference: result.transaction_id,
          customer: customer || "Nouveau client",
          initials: (customer || "NC").slice(0, 2).toUpperCase(),
          amount: Number(amount),
          method: method === "MTN" ? "MTN Mobile Money" : "Orange Money",
          date: "À l’instant",
          status: "En attente",
          tint: "blue",
        }, ...current]);
        setNotice("Démo : aucune demande de paiement réelle n’a été envoyée.");
      } else {
        if (result.payment_link) {
          window.location.assign(result.payment_link);
          return;
        }
        setNotice("Demande envoyée. Le paiement sera confirmé automatiquement.");
      }
      setAmount("");
      setPhone("");
      setCustomer("");
      setCollectionOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  const heading = activeNav === "Vue d’ensemble" ? "Votre activité, en un coup d’œil." : activeNav;

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>f</span><i /></div>
          <div className="brand-name">flash<span>pay</span><small>ESPACE PERSONNEL</small></div>
          <button aria-label="Fermer le menu" className="icon-button mobile-close" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>
        </div>
        <div className="workspace-switcher"><div className="workspace-avatar">F</div><div className="workspace-copy"><strong>Mon compte</strong><span>Compte personnel</span></div><ChevronDown size={15} /></div>
        <div className="nav-caption">MENU PRINCIPAL</div>
        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map(({ label, icon: Icon, badge }) => <button className={`nav-item ${activeNav === label ? "nav-item-active" : ""}`} key={label} onClick={() => { setActiveNav(label); setMobileNavOpen(false); }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{badge && <small className="nav-badge">{badge}</small>}</button>)}
        </nav>
        <div className="nav-caption nav-caption-spaced">COMPTE</div>
        <nav className="main-nav" aria-label="Paramètres du compte">
          <button className={`nav-item ${activeNav === "Vérification d’identité" ? "nav-item-active" : ""}`} onClick={() => setActiveNav("Vérification d’identité")}><ShieldCheck size={18} strokeWidth={1.8} /><span>Vérification d’identité</span><i className="nav-alert" /></button>
          <button className={`nav-item ${activeNav === "Paramètres" ? "nav-item-active" : ""}`} onClick={() => setActiveNav("Paramètres")}><Wallet size={18} strokeWidth={1.8} /><span>Paramètres</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="support-card"><div className="support-icon"><CircleHelp size={17} /></div><strong>Besoin d’aide ?</strong><p>Notre équipe est là pour vous.</p><button onClick={() => setNotice("Le support FlashPay sera bientôt disponible.")}>Contacter le support <ArrowRight size={14} /></button></div>
          <div className="profile-row"><div className="profile-avatar">F</div><div className="profile-copy"><strong>Mon compte</strong><span>Identité à vérifier</span></div><Ellipsis size={19} /></div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button aria-label="Ouvrir le menu" className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)}><Menu size={20} /></button>
          <div className="breadcrumb"><span>FlashPay</span><span className="breadcrumb-slash">/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions"><button aria-label="Rechercher" className="icon-button topbar-icon"><Search size={18} /></button><button aria-label="Notifications" className="icon-button topbar-icon notification-button" onClick={() => setNotice("Vous êtes à jour. Aucune nouvelle notification.")}><Bell size={18} /><i /></button><div className="topbar-divider" /><button className="help-button" onClick={() => setNotice("Centre d’aide FlashPay bientôt disponible.")}><CircleHelp size={16} /><span>Aide</span></button><div className="topbar-avatar">F</div></div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row"><div className="welcome-copy"><div className="eyebrow"><span className="eyebrow-dot" /> {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</div><h1>Bonjour <span className="wave-mark">✳</span></h1><p>{heading}</p></div><button className="primary-button" onClick={() => { setNotice(""); setCollectionOpen(true); }}><Plus size={18} strokeWidth={2.2} /><span>Nouvelle collecte</span></button></section>
          <div className="demo-banner"><span className="demo-pulse" /><strong>Mode démonstration</strong><span>Les paiements affichés sont simulés. Aucun fonds réel ne circule.</span><button aria-label="En savoir plus" onClick={() => setNotice("Le mode réel nécessite vos identifiants API côté serveur et l’accord du prestataire de paiement pour les encaissements destinés à des tiers.")}><CircleHelp size={15} /></button></div>
          {notice && <div className="notice-bar" role="status"><Check size={16} /><span>{notice}</span><button aria-label="Fermer" onClick={() => setNotice("")}><X size={15} /></button></div>}

          {activeNav === "Vue d’ensemble" ? <div className="dashboard-content"><section className="summary-grid" aria-label="Résumé du compte">
            <article className="summary-card balance-card"><div className="card-topline"><span>Solde disponible</span><button aria-label="Options du solde"><Ellipsis size={19} /></button></div><div className="balance-amount">0 <span>FCFA</span></div><div className="balance-foot"><span>Aucune opération réelle pour l’instant</span><button aria-label="Voir le solde"><ArrowRight size={16} /></button></div><div className="balance-orbit orbit-one" /><div className="balance-orbit orbit-two" /></article>
            <article className="summary-card"><div className="card-topline"><span>Encaissé ce mois</span><span className="mini-icon mint-icon"><ArrowDownLeft size={17} /></span></div><div className="summary-amount">0 <span>FCFA</span></div><div className="summary-foot"><span>Aucune opération réelle pour l’instant</span></div><div className="mini-sparkline"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="summary-card"><div className="card-topline"><span>À verser manuellement</span><span className="mini-icon amber-icon"><Clock3 size={16} /></span></div><div className="summary-amount">0 <span>FCFA</span></div><div className="summary-foot"><span className="pending-label">0 versement</span><span>à traiter</span></div><button className="manual-link" onClick={() => setActiveNav("Bénéficiaires")}>Voir les bénéficiaires <ArrowRight size={14} /></button></article>
          </section>

          <section className="main-grid">
            <article className="panel activity-panel"><div className="panel-heading"><div><h2>Activité des paiements</h2><p>Suivez les encaissements de votre compte</p></div><button className="select-button">30 derniers jours <ChevronDown size={15} /></button></div><div className="chart-summary"><strong>0 <span>FCFA</span></strong><div><span>Aucune opération réelle pour l’instant</span></div></div>
              <div className="chart-wrap" style={{ display: "none" }} role="img" aria-label="Graphique disponible après vos premières opérations"><div className="chart-y-labels"><span>3M</span><span>2M</span><span>1M</span><span>0</span></div><div className="chart-area"><div className="chart-gridline line-one" /><div className="chart-gridline line-two" /><div className="chart-gridline line-three" /><div className="chart-gridline line-four" /><svg className="chart-svg" viewBox="0 0 760 170" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#35a977" stopOpacity=".17" /><stop offset="100%" stopColor="#35a977" stopOpacity="0" /></linearGradient></defs><path d="M0 130 C45 124 55 107 108 112 S174 132 218 101 S275 108 326 83 S389 103 436 72 S490 86 542 49 S606 67 653 42 S713 50 760 20 L760 170 L0 170 Z" fill="url(#chartFill)" /><path d="M0 130 C45 124 55 107 108 112 S174 132 218 101 S275 108 326 83 S389 103 436 72 S490 86 542 49 S606 67 653 42 S713 50 760 20" fill="none" stroke="#2e9f71" strokeWidth="3" strokeLinecap="round" /><circle cx="542" cy="49" r="5" fill="#fff" stroke="#2e9f71" strokeWidth="3" /></svg></div><div className="chart-x-labels"><span>Juin</span><span>Juil.</span><span>Août</span><span>Sept.</span><span>Oct.</span><span>Nov.</span></div></div>
            </article>
            <article className="panel channel-panel"><div className="panel-heading compact-heading"><div><h2>Moyens de paiement</h2><p>Répartition des encaissements</p></div><button aria-label="Plus d’options"><Ellipsis size={19} /></button></div><div className="donut-zone"><div className="donut-chart"><div className="donut-center"><strong>0</strong><span>FCFA</span></div></div><div className="donut-legend"><div><i className="legend-dot dot-mtn" /><span>MTN Mobile Money</span><strong>—</strong></div><div><i className="legend-dot dot-orange" /><span>Orange Money</span><strong>—</strong></div><div><i className="legend-dot dot-other" /><span>Autres</span><strong>—</strong></div></div></div><div className="channel-note"><Sparkles size={15} /><span>La répartition apparaîtra après vos premières opérations.</span></div></article>
          </section>

          <section className="panel transactions-panel"><div className="panel-heading transaction-heading"><div><h2>Transactions récentes</h2><p>Les dernières opérations sur votre compte</p></div><div className="table-actions"><button className="select-button filter-button"><span>Tout afficher</span><ChevronDown size={15} /></button><button className="export-button" onClick={() => setNotice("L’export sera disponible avec l’historique connecté.")}><Download size={15} /><span>Exporter</span></button></div></div>
            <div className="table-scroll"><table><thead><tr><th>CLIENT</th><th>RÉFÉRENCE</th><th>MOYEN</th><th>DATE</th><th>STATUT</th><th className="amount-column">MONTANT</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{payments.slice(0, 4).map((payment) => <tr key={payment.reference}><td><div className="customer-cell"><div className={`customer-avatar avatar-${payment.tint}`}>{payment.initials}</div><strong>{payment.customer}</strong></div></td><td className="reference-cell">{payment.reference}</td><td><span className={`method-mark ${payment.method.startsWith("MTN") ? "method-mtn" : "method-orange"}`}>{payment.method.startsWith("MTN") ? "M" : "O"}</span><span className="method-name">{payment.method}</span></td><td className="date-cell">{payment.date}</td><td><span className={`status-pill status-${payment.status === "Réussi" ? "success" : payment.status === "En attente" ? "pending" : "failed"}`}><i />{payment.status}</span></td><td className="amount-cell">{money(payment.amount)} <span>FCFA</span></td><td><button className="row-more" aria-label={`Options ${payment.reference}`}><Ellipsis size={17} /></button></td></tr>)}</tbody></table></div>
            <button className="view-all-button" onClick={() => setActiveNav("Transactions")}>Voir toutes les transactions <ArrowRight size={15} /></button>
          </section>

          <footer className="footer-row"><span>© 2026 FlashPay. Votre argent, en mouvement.</span><div><span className="secure-label"><ShieldCheck size={13} /> Connexion sécurisée</span><span className="footer-separator" /><button onClick={() => setNotice("Centre d’aide FlashPay bientôt disponible.")}>Centre d’aide</button><button onClick={() => setNotice("Les conditions seront publiées avant ouverture au public.")}>Confidentialité</button></div></footer></div> : <WorkspacePanel section={activeNav} notify={setNotice} onNewCollection={() => { setNotice(""); setCollectionOpen(true); }} />}
        </div>
      </section>

      {collectionOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCollectionOpen(false); }}><section className="collection-modal" role="dialog" aria-modal="true" aria-labelledby="collection-title"><div className="modal-head"><div><span className="modal-kicker">NOUVEL ENCAISSEMENT</span><h2 id="collection-title">Créer une collecte</h2><p>Envoyez une demande de paiement mobile money.</p></div><button className="icon-button modal-close" aria-label="Fermer" onClick={() => setCollectionOpen(false)}><X size={19} /></button></div>
        <form onSubmit={createCollection}><label className="field-label" htmlFor="collect-country">Pays d’encaissement</label><select className="text-input country-select" id="collect-country" value={countryCode} onChange={(event) => { setMethodsLoading(true); setMethodsError(""); setAvailableMethods([]); setCountryCode(event.target.value); }}>{countryList.map((country) => <option key={country.code} value={country.code}>{country.name} · {country.currency}</option>)}</select><label className="field-label amount-label" htmlFor="collect-amount">Montant à encaisser</label><div className="amount-input-wrap"><input id="collect-amount" inputMode="numeric" min="1" placeholder="0" required type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /><span>{countryList.find((country) => country.code === countryCode)?.currency}</span></div>
          <div className="field-row"><div><label className="field-label" htmlFor="collect-customer">Nom du client</label><input className="text-input" id="collect-customer" placeholder="Ex. Aïcha Nguema" value={customer} onChange={(event) => setCustomer(event.target.value)} /></div><div><label className="field-label" htmlFor="collect-phone">Téléphone Mobile Money</label><input className="text-input" id="collect-phone" inputMode="tel" placeholder="6XX XX XX XX" required value={phone} onChange={(event) => setPhone(event.target.value)} /></div></div>
          <span className="field-label method-field-label">Moyen de paiement</span>{countryCode === "NG" ? <div className="provider-note"><ShieldCheck size={16} /><span>Le paiement au Nigeria continue sur le checkout sécurisé de l’opérateur.</span></div> : methodsLoading ? <div className="provider-note"><span className="loading-dot" /> Chargement des moyens de paiement…</div> : availableMethods.length ? <div className="method-options">{availableMethods.map((item) => <button className={`method-option ${method === item ? "method-option-selected" : ""}`} key={item} onClick={() => setMethod(item)} type="button"><span className={`method-mark ${item === "MTN" ? "method-mtn" : "method-orange"}`}>{item === "MTN" ? "M" : "O"}</span><span>{item === "MTN" ? "MTN Mobile Money" : item === "ORANGE" ? "Orange Money" : item}</span>{method === item && <Check size={16} />}</button>)}</div> : <div className="provider-note"><ShieldCheck size={16} /><span>{methodsError || `Aucun opérateur de démonstration pour ${countryList.find((country) => country.code === countryCode)?.name ?? countryCode}. Pour afficher la RDC et les autres pays, un administrateur doit configurer la clé de paiement et activer les méthodes du compte marchand.`}</span></div>}
          <div className="fee-preview"><span>Frais estimés</span><strong>2,5 % + 5 %</strong><small>2,5 % de frais de traitement, plus 5 % de commission FlashPay. Le taux exact dépend de votre accord.</small></div>
          <button className="primary-button modal-submit" disabled={submitting || methodsLoading || (countryCode !== "NG" && !method)} type="submit"><span>{submitting ? "Création…" : "Créer la demande"}</span><ArrowRight size={17} /></button><p className="modal-footnote"><ShieldCheck size={14} /> Vos identifiants API restent côté serveur.</p>
        </form></section></div>}
    </main>
  );
}
