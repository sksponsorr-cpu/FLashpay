"use client";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };
type Wallet = { currency_code: string; balance: number };
type Minimum = { currency_code: string; minimum_amount: number };

const DESTINATIONS: Record<string, { name: string; currency: string; operators: string[] }> = {
  CM: { name: "Cameroun", currency: "XAF", operators: ["MTN MoMo", "Orange Money", "Airtel Money"] },
  CG: { name: "Congo-Brazzaville", currency: "XAF", operators: ["MTN MoMo", "Airtel Money"] },
  CD: { name: "RD Congo", currency: "CDF", operators: ["Airtel Money", "Orange Money", "M-Pesa", "Africell Money"] },
  SN: { name: "Sénégal", currency: "XOF", operators: ["Orange Money", "Wave"] },
  CI: { name: "Côte d’Ivoire", currency: "XOF", operators: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"] },
  BF: { name: "Burkina Faso", currency: "XOF", operators: ["Orange Money", "Moov Money"] },
  BJ: { name: "Bénin", currency: "XOF", operators: ["MTN MoMo", "Moov Money"] },
  TG: { name: "Togo", currency: "XOF", operators: ["Moov Money"] },
  ML: { name: "Mali", currency: "XOF", operators: ["Orange Money", "Moov Money"] },
  RW: { name: "Rwanda", currency: "RWF", operators: ["MTN MoMo", "Airtel Money"] },
  KE: { name: "Kenya", currency: "KES", operators: ["M-Pesa", "Airtel Money"] },
  GH: { name: "Ghana", currency: "GHS", operators: ["MTN MoMo", "Vodafone Cash"] },
  NG: { name: "Nigeria", currency: "NGN", operators: ["Bank transfer"] },
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) =>
  new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function WithdrawalsView({ appId }: { appId: string; onNew?: () => void }) {
  const [tab, setTab] = useState<"list" | "methods">("list");
  const [items, setItems] = useState<Movement[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [minimums, setMinimums] = useState<Minimum[]>([]);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("");
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`/api/wallet?app=${encodeURIComponent(appId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Impossible de charger les retraits.");
        if (!alive) return;
        setItems((result.movements as Movement[]).filter((m) => m.kind === "withdrawal"));
        setWallets(result.wallets as Wallet[]);
        setMinimums(result.minimums as Minimum[]);
        setLoadError("");
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : "Impossible de charger les retraits.");
      }
    })();
    return () => { alive = false; };
  }, [appId, reload]);

  const walletCurrencies = useMemo(() => wallets.filter((w) => w.balance > 0).map((w) => w.currency_code), [wallets]);
  const countries = useMemo(
    () => Object.entries(DESTINATIONS).filter(([, d]) => d.currency === currency).map(([code, d]) => ({ code, ...d })),
    [currency],
  );
  const balance = wallets.find((w) => w.currency_code === currency)?.balance ?? 0;
  const minimum = minimums.find((m) => m.currency_code === currency)?.minimum_amount;
  const operators = DESTINATIONS[country]?.operators ?? [];
  const filtered = items.filter((m) => !query || m.currency_code.toLowerCase().includes(query.toLowerCase()) || dateFmt(m.created_at).toLowerCase().includes(query.toLowerCase()));

  function pickCurrency(value: string) {
    setCurrency(value);
    setCountry("");
    setOperator("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!currency || !country || !operator || !mobile.trim() || !name.trim() || !amount) {
      setNotice({ kind: "err", text: "Remplis tous les champs avant de demander le retrait." });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          currency_code: currency,
          amount: Number(amount),
          destination: { country_code: country, operator, mobile: mobile.trim(), name: name.trim() },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "Demande refusée.");
      setNotice({ kind: "ok", text: "Demande de retrait enregistrée." });
      setAmount("");
      setMobile("");
      setName("");
      setReload((n) => n + 1);
    } catch (e) {
      setNotice({ kind: "err", text: e instanceof Error ? e.message : "Demande refusée." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="wd-wrap">
      <div className="dev-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "list"} className={tab === "list" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("list")}>Retraits</button>
        <button role="tab" aria-selected={tab === "methods"} className={tab === "methods" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("methods")}>Méthodes de retrait</button>
      </div>

      {tab === "list" && (
        <>
          <form className="dash-card wd-card wd-form" onSubmit={submit}>
            <div className="wd-grid">
              <label className="set-field"><span>Devise du portefeuille</span>
                <select value={currency} onChange={(e) => pickCurrency(e.target.value)}>
                  <option value="">Choisir une devise</option>
                  {walletCurrencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="set-field"><span>Pays de réception</span>
                <select value={country} disabled={!currency} onChange={(e) => { setCountry(e.target.value); setOperator(""); }}>
                  <option value="">Choisir un pays</option>
                  {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="set-field"><span>Opérateur mobile money</span>
                <select value={operator} disabled={!country} onChange={(e) => setOperator(e.target.value)}>
                  <option value="">Choisir un opérateur</option>
                  {operators.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="set-field"><span>Numéro qui recevra l’argent</span>
                <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="ex. 812345678" inputMode="tel" />
              </label>
              <label className="set-field"><span>Nom du bénéficiaire</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" />
              </label>
              <label className="set-field"><span>Montant{currency ? ` en ${currency}` : ""}</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" />
              </label>
            </div>
            {currency && (
              <p className="dash-muted wd-hint">
                Solde disponible : {fmt(balance)} {currency}
                {minimum !== undefined && <> · Minimum : {fmt(minimum)} {currency}</>}
              </p>
            )}
            {notice && <p className={notice.kind === "ok" ? "wd-ok" : "wd-err"}>{notice.text}</p>}
            <div className="wd-actions">
              <button type="button" className="secondary-button" onClick={() => { setAmount(""); setMobile(""); setName(""); setNotice(null); }}>Annuler</button>
              <button className="primary-button" disabled={busy}>{busy ? "Envoi…" : "Demander le retrait"}</button>
            </div>
          </form>

          <div className="dash-card wd-card">
            <input className="tx-search" type="search" placeholder="Rechercher par devise ou date" value={query} onChange={(e) => setQuery(e.target.value)} />
            {loadError && <p className="dash-muted">{loadError}</p>}
            {!loadError && filtered.length === 0 && <p className="dash-muted">Aucun retrait pour le moment.</p>}
            {filtered.map((m) => (
              <div className="wd-row" key={m.id}>
                <div>
                  <strong>Retrait {m.currency_code}</strong>
                  <span className="dash-muted">{dateFmt(m.created_at)}</span>
                </div>
                <strong>{fmt(Math.abs(m.amount))} {m.currency_code}</strong>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "methods" && (
        <div className="dash-card">
          <strong>Bientôt disponible</strong>
          <p className="dash-muted">L’enregistrement de comptes de retrait n’est pas encore activé. Pour l’instant, les retraits sont traités manuellement par FlashPay.</p>
        </div>
      )}
    </section>
  );
}
