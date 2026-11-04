"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDownLeft, Code2, Link2, LayoutDashboard, Menu, Percent, Settings, Wallet, Plus } from "lucide-react";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";
import ApiKeyManager from "@/components/api-key-manager";
import WebhookSettings from "@/components/webhook-settings";
import WalletOverview from "@/components/wallet-overview";
import TransactionsList from "@/components/transactions-list";

type Country = { code: string; name: string; currency: string };

const sections = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "wallet", label: "Portefeuille", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ArrowDownLeft },
  { id: "links", label: "Liens de paiement", icon: Link2 },
  { id: "developers", label: "Développeurs", icon: Code2 },
  { id: "pricing", label: "Tarification", icon: Percent },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;

type SectionId = (typeof sections)[number]["id"];

// Date calculée après le rendu navigateur (évite l'erreur de pré-rendu).
function TodayLabel() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }));
  }, []);
  return <>{label}</>;
}

function CollectionForm({ countryList }: { countryList: Country[] }) {
  const [countryCode, setCountryCode] = useState("CM");
  const [methods, setMethods] = useState<string[]>([]);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setMethods([]);
    fetch(`/api/swychr/payment-methods?country_code=${countryCode}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Moyens de paiement indisponibles.");
        return (result.data?.payment_methods ?? []).map((item: { payment_method: string }) => item.payment_method) as string[];
      })
      .then((list) => {
        if (!active) return;
        setMethods(list);
        setMethod(list[0] ?? "");
      })
      .catch((error) => {
        if (active) setNotice(error instanceof Error ? error.message : "Impossible de joindre le service de paiement.");
      });
    return () => { active = false; };
  }, [countryCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/swychr/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: countryCode,
          name,
          mobile,
          amount: Number(amount),
          transaction_id: `FP-${Date.now()}`,
          payment_method: countryCode === "NG" ? undefined : method,
          description: "Collecte créée depuis FlashPay",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "La collecte n’a pas pu être créée.");
      if (result.payment_link) {
        window.location.assign(result.payment_link);
        return;
      }
      setNotice("Demande envoyée au client. Le paiement sera confirmé automatiquement.");
      setAmount("");
      setMobile("");
      setName("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="fp-card fp-form-grid" onSubmit={submit}>
      <label className="fp-label">Pays
        <select className="fp-input" value={countryCode} onChange={(event) => setCountryCode(event.target.value)}>
          {countryList.map((country) => <option key={country.code} value={country.code}>{country.name} · {country.currency}</option>)}
        </select>
      </label>
      {countryCode !== "NG" && (
        <label className="fp-label">Opérateur
          <select className="fp-input" value={method} onChange={(event) => setMethod(event.target.value)} required>
            {methods.length === 0 && <option value="">Aucun opérateur disponible</option>}
            {methods.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      )}
      <label className="fp-label">Nom du client
        <input className="fp-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. Aïcha N." />
      </label>
      <label className="fp-label">Numéro mobile (sans indicatif)
        <input className="fp-input" inputMode="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="Ex. 690000000" required />
      </label>
      <label className="fp-label">Montant
        <input className="fp-input" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ex. 45 000" required />
      </label>
      <p className="fp-small fp-span">Le client paie le montant + 2,5 % de frais. Tu reçois le montant demandé moins 6 % de commission.</p>
      <button className="fp-btn fp-span" disabled={busy || !amount || !mobile || !method} type="submit">
        {busy ? "Envoi…" : <><Plus size={16} /> Créer la demande de paiement</>}
      </button>
      {notice && <p role="status" className="fp-notice fp-span">{notice}</p>}
    </form>
  );
}

export default function DashboardPage() {
  const [active, setActive] = useState<SectionId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [countryList, setCountryList] = useState<Country[]>(SUPPORTED_COUNTRIES.map((country) => ({ ...country })));

  useEffect(() => {
    let alive = true;
    fetch("/api/countries")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (alive && result && Array.isArray(result.countries) && result.countries.length) setCountryList(result.countries);
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const current = sections.find((section) => section.id === active)!;

  return (
    <div className="fp-app">
      <style>{`
        .fp-app { min-height: 100vh; background: #f4f7f5; color: #14241c; font-family: inherit; }
        .fp-app * { box-sizing: border-box; }
        .fp-side { position: fixed; inset: 0 auto 0 0; width: 248px; background: #fff; border-right: 1px solid #e3ebe6; padding: 22px 14px; display: flex; flex-direction: column; gap: 6px; z-index: 40; transition: transform .25s ease; }
        .fp-brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 18px; font-weight: 800; font-size: 20px; }
        .fp-logo { width: 34px; height: 34px; border-radius: 10px; background: #1f6b4c; color: #fff; display: grid; place-items: center; font-weight: 800; }
        .fp-brand span { color: #2f9a6c; }
        .fp-nav-btn { display: flex; align-items: center; gap: 12px; width: 100%; border: 0; background: transparent; padding: 11px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #5e7267; cursor: pointer; text-align: left; }
        .fp-nav-btn:hover { background: #f1f6f3; }
        .fp-nav-btn.on { background: #e4f1ea; color: #1f6b4c; }
        .fp-main { margin-left: 248px; min-width: 0; }
        .fp-top { position: sticky; top: 0; z-index: 30; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border-bottom: 1px solid #e3ebe6; height: 60px; display: flex; align-items: center; gap: 12px; padding: 0 28px; }
        .fp-burger { display: none; border: 0; background: #f1f6f3; border-radius: 10px; width: 40px; height: 40px; place-items: center; cursor: pointer; color: #1f6b4c; }
        .fp-crumb { font-size: 14px; color: #6b7f74; }
        .fp-crumb strong { color: #14241c; }
        .fp-content { padding: 28px; max-width: 1100px; margin: 0 auto; display: grid; gap: 20px; }
        .fp-head h1 { margin: 0; font-size: 26px; letter-spacing: -.02em; }
        .fp-head p { margin: 6px 0 0; color: #6b7f74; font-size: 14px; }
        .fp-card { background: #fff; border: 1px solid #e6eeea; border-radius: 16px; padding: 18px; box-shadow: 0 1px 2px rgba(20,36,28,.04); }
        .fp-card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
        .fp-card h3 { margin: 0; font-size: 16px; }
        .fp-wallet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
        .fp-wallets { display: grid; gap: 14px; }
        .fp-wallet-card { background: #fff; border: 1px solid #e6eeea; border-radius: 16px; padding: 18px; display: grid; gap: 6px; align-content: start; }
        .fp-wallet-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
        .fp-code { font-weight: 800; font-size: 13px; background: #e4f1ea; color: #1f6b4c; padding: 4px 9px; border-radius: 999px; }
        .fp-wallet-balance { font-size: 28px; font-weight: 800; letter-spacing: -.02em; margin-top: 8px; font-variant-numeric: tabular-nums; }
        .fp-wallet-balance small { font-size: 13px; color: #6b7f74; font-weight: 600; }
        .fp-wallet-meta { font-size: 12px; color: #6b7f74; }
        .fp-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .fp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #1f6b4c; color: #fff; border: 0; border-radius: 11px; padding: 11px 16px; font-size: 14px; font-weight: 700; cursor: pointer; min-height: 42px; }
        .fp-btn:disabled { opacity: .5; cursor: not-allowed; }
        .fp-btn-ghost { background: #eef4f0; color: #1f6b4c; }
        .fp-input { width: 100%; padding: 11px 12px; border-radius: 11px; border: 1px solid #dbe5df; font-size: 15px; background: #fff; font-family: inherit; color: inherit; }
        .fp-label { display: grid; gap: 6px; font-size: 13px; font-weight: 600; color: #3d5249; }
        .fp-form { display: grid; gap: 8px; margin-top: 8px; border-top: 1px solid #eef2ef; padding-top: 12px; }
        .fp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .fp-span { grid-column: 1 / -1; }
        .fp-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid #eef2ef; font-size: 14px; }
        .fp-row > div { display: grid; gap: 2px; min-width: 0; }
        .fp-plus { color: #1f6b4c; }
        .fp-small { font-size: 12px; color: #6b7f74; }
        .fp-muted { color: #6b7f74; font-size: 14px; margin: 0; }
        .fp-notice { font-size: 14px; color: #1f6b4c; background: #e4f1ea; padding: 10px 12px; border-radius: 10px; margin: 0; }
        .fp-empty-card { background: #fff; border: 1px dashed #c9d8cf; border-radius: 16px; padding: 18px; }
        .fp-empty-card p { margin: 6px 0 0; color: #6b7f74; font-size: 14px; }
        .fp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .fp-stat strong { display: block; font-size: 22px; margin-top: 6px; }
        .fp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .fp-table th, .fp-table td { text-align: left; padding: 12px 8px; border-top: 1px solid #eef2ef; vertical-align: top; }
        .fp-table th { color: #6b7f74; font-size: 12px; font-weight: 600; }
        .fp-scroll { overflow-x: auto; }
        .fp-scrim { display: none; }
        @media (max-width: 900px) {
          .fp-side { transform: translateX(-100%); }
          .fp-side.open { transform: translateX(0); box-shadow: 0 20px 40px rgba(0,0,0,.15); }
          .fp-scrim.open { display: block; position: fixed; inset: 0; background: rgba(20,36,28,.35); z-index: 35; }
          .fp-main { margin-left: 0; }
          .fp-burger { display: grid; }
          .fp-stats { grid-template-columns: 1fr; }
        }
        @media (max-width: 620px) {
          .fp-top { padding: 0 16px; }
          .fp-content { padding: 18px 16px 28px; gap: 16px; }
          .fp-head h1 { font-size: 22px; }
          .fp-form-grid { grid-template-columns: 1fr; }
          .fp-wallet-grid { grid-template-columns: 1fr; }
          .fp-wallet-balance { font-size: 24px; }
        }
      `}</style>

      <aside className={`fp-side ${menuOpen ? "open" : ""}`}>
        <div className="fp-brand"><span className="fp-logo">f</span><div>flash<span>pay</span></div></div>
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`fp-nav-btn ${active === id ? "on" : ""}`} onClick={() => { setActive(id); setMenuOpen(false); }}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
          </button>
        ))}
        <div style={{ marginTop: "auto" }} className="fp-small">Compte personnel</div>
      </aside>
      <div className={`fp-scrim ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />

      <div className="fp-main">
        <header className="fp-top">
          <button aria-label="Ouvrir le menu" className="fp-burger" onClick={() => setMenuOpen(true)}><Menu size={20} /></button>
          <div className="fp-crumb">FlashPay / <strong>{current.label}</strong></div>
        </header>

        <main className="fp-content">
          <section className="fp-head">
            <h1>{current.id === "overview" ? "Bonjour" : current.label}</h1>
            <p>{current.id === "overview" ? <><TodayLabel /> · Tes soldes et tes derniers encaissements.</> : null}</p>
          </section>

          {active === "overview" && (
            <>
              <WalletOverview />
              <section className="fp-card">
                <div className="fp-card-head"><h3>Dernières transactions</h3><button className="fp-btn fp-btn-ghost" onClick={() => setActive("transactions")}>Tout voir</button></div>
                <TransactionsList />
              </section>
            </>
          )}

          {active === "wallet" && <WalletOverview />}

          {active === "transactions" && (
            <section className="fp-card">
              <div className="fp-card-head"><h3>Toutes les transactions</h3><span className="fp-small">Mises à jour à chaque paiement</span></div>
              <TransactionsList />
            </section>
          )}

          {active === "links" && (
            <>
              <p className="fp-muted">Crée une demande de paiement mobile money. Le client confirme sur son téléphone, sans ouvrir de lien.</p>
              <CollectionForm countryList={countryList} />
            </>
          )}

          {active === "developers" && (
            <>
              <ApiKeyManager />
              <WebhookSettings />
            </>
          )}

          {active === "pricing" && (
            <section className="fp-card fp-scroll">
              <div className="fp-card-head"><h3>Tes tarifs</h3><span className="fp-small">Appliqués à tous les comptes</span></div>
              <table className="fp-table">
                <thead><tr><th>Opération</th><th>Qui paie</th><th>Frais</th></tr></thead>
                <tbody>
                  <tr><td>Encaissement client</td><td>Le client : +2,5 %</td><td>Toi : 6 % de commission</td></tr>
                  <tr><td>Retrait</td><td>Toi</td><td>5 % (0 % en Premium)</td></tr>
                  <tr><td>Conversion de devise</td><td>Toi</td><td>4,5 % (1 % avec abonnement)</td></tr>
                  <tr><td>Abonnement Basic</td><td>Toi</td><td>10 000 FCFA / mois</td></tr>
                  <tr><td>Abonnement Premium</td><td>Toi</td><td>25 000 FCFA / mois</td></tr>
                </tbody>
              </table>
              <p className="fp-small">Retrait minimum : 1 USD converti, affiché dans chaque devise. Les retraits et conversions sont traités manuellement par FlashPay.</p>
            </section>
          )}

          {active === "settings" && (
            <section className="fp-card">
              <div className="fp-card-head"><h3>Paramètres du compte</h3></div>
              <p className="fp-muted">Les encaissements réels s’activent après vérification de ton compte. Pour toute question, contacte l’équipe FlashPay.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
