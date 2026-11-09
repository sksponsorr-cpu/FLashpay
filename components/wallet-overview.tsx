"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Wallet = { currency_code: string; balance: number };
type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };
type WalletData = {
  wallets: Wallet[];
  movements: Movement[];
  minimums: { currency_code: string; minimum_amount: number }[];
  plan: string | null;
  fee: { withdrawal: number; conversion: number };
  rates: { from_currency: string; to_currency: string; rate: number }[];
};

// Pays de destination des retraits, avec leur devise et leurs opérateurs mobile money.
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

const labels: Record<string, string> = {
  XAF: "Franc CFA (CEMAC)", XOF: "Franc CFA (UEMOA)", CDF: "Franc congolais",
  NGN: "Naira nigérian", RWF: "Franc rwandais", USD: "Dollar américain", KES: "Shilling kényan", GHS: "Cedi ghanéen",
};
const kinds: Record<string, string> = {
  collection: "Encaissement", withdrawal: "Retrait", conversion_in: "Conversion reçue",
  conversion_out: "Conversion envoyée", adjustment: "Ajustement",
};
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) =>
  new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Action = { currency: string; mode: "withdraw" | "convert" } | null;

export default function WalletOverview({ appId, onSubmitted, autoWithdraw = false }: { appId: string; onSubmitted?: (mode: "withdraw" | "convert") => void; autoWithdraw?: boolean }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Action>(null);
  const [amount, setAmount] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeOk, setNoticeOk] = useState(false);

  async function load() {
    try {
      const response = await fetch(`/api/wallet?app=${encodeURIComponent(appId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de charger le portefeuille.");
      setData(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le portefeuille.");
    }
  }

  useEffect(() => { void load(); }, [appId]);

  // Ouvre directement le formulaire de retrait (depuis « Demander un retrait »)
  useEffect(() => {
    if (autoWithdraw && data && data.wallets.length > 0 && !open) {
      const withBalance = data.wallets.find((w) => w.balance > 0) ?? data.wallets[0];
      openAction(withBalance.currency_code, "withdraw");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWithdraw, data]);

  // Pays proposés : ceux qui utilisent la devise du portefeuille
  const countriesFor = (currency: string) =>
    Object.entries(DESTINATIONS).filter(([, d]) => d.currency === currency);

  function openAction(currency: string, mode: "withdraw" | "convert") {
    setOpen({ currency, mode });
    setAmount("");
    setToCurrency("");
    setCountry("");
    setOperator("");
    setMobile("");
    setName("");
    setNotice("");
  }

  function closeAction() {
    setOpen(null);
    setAmount("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!open) return;
    setBusy(true);
    setNotice("");
    try {
      let response: Response;
      if (open.mode === "withdraw") {
        // Retrait vers un mobile money : la demande part immédiatement pour les comptes vérifiés.
        response = await fetch("/api/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "schedule",
            currency_code: open.currency,
            amount: Number(amount),
            destination: { country_code: country, operator, mobile, name },
          }),
        });
      } else {
        response = await fetch("/api/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "convert",
            from_currency: open.currency,
            to_currency: toCurrency.toUpperCase(),
            amount: Number(amount),
            app_id: appId,
          }),
        });
      }

      const result = await response.json();
      if (!response.ok || result.ok === false) throw new Error(result.message ?? "Demande refusée.");

      const mode = open.mode;
      setOpen(null);
      setAmount("");
      setNoticeOk(true);
      setNotice(
        mode === "withdraw"
          ? result.message ?? "Retrait enregistré."
          : "Demande de conversion enregistrée."
      );
      await load();
      onSubmitted?.(mode);
    } catch (e) {
      setNoticeOk(false);
      setNotice(e instanceof Error ? e.message : "Demande refusée.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="fp-muted">{error}</p>;
  if (!data) return <p className="fp-muted">Chargement des portefeuilles…</p>;

  const minimum = (currency: string) => data.minimums.find((x) => x.currency_code === currency)?.minimum_amount;
  const destinationOptions = open && open.mode === "withdraw" ? countriesFor(open.currency) : [];
  const targetCurrencies = open && open.mode === "convert"
    ? Array.from(new Set([
        ...data.rates.filter((r) => r.from_currency === open.currency).map((r) => r.to_currency),
        ...Object.keys(labels),
      ])).filter((c) => c !== open.currency).sort()
    : [];
  const operatorOptions = country ? DESTINATIONS[country]?.operators ?? [] : [];

  return (
    <div className="fp-wallets">
      {data.wallets.length === 0 && (
        <div className="fp-empty-card">
          <strong>Aucun portefeuille pour cette application</strong>
          <p>Un portefeuille apparaît après le premier encaissement réussi.</p>
        </div>
      )}

      <div className="fp-wallet-grid">
        {data.wallets.map((wallet) => (
          <article className="fp-wallet-card" key={wallet.currency_code}>
            <div className="fp-wallet-head">
              <span className="fp-code">{wallet.currency_code}</span>
              <span className="fp-small">{labels[wallet.currency_code] ?? wallet.currency_code}</span>
            </div>
            <div className="fp-wallet-balance">
              {fmt(wallet.balance)} <small>{wallet.currency_code}</small>
            </div>
            <div className="fp-wallet-meta">
              Retrait {data.fee.withdrawal}% · Conversion {data.fee.conversion}%
              {minimum(wallet.currency_code) !== undefined && (
                <> · Minimum {fmt(minimum(wallet.currency_code)!)} {wallet.currency_code}</>
              )}
            </div>
            <div className="fp-actions">
              <button className="fp-btn" onClick={() => openAction(wallet.currency_code, "withdraw")}>Retirer</button>
              <button className="fp-btn fp-btn-ghost" onClick={() => openAction(wallet.currency_code, "convert")}>Convertir</button>
            </div>
          </article>
        ))}
      </div>

      {notice && <p role="status" className="fp-notice" style={noticeOk ? undefined : { background: "#fdecea", color: "#c8321a" }}>{notice}</p>}

      <article className="fp-card">
        <div className="fp-card-head">
          <h3>Derniers mouvements</h3>
          <span className="fp-small">Abonnement : {data.plan ?? "aucun"}</span>
        </div>
        {!data.movements.length && <p className="fp-muted">Aucun mouvement.</p>}
        {data.movements.slice(0, 10).map((m) => (
          <div className="fp-row" key={m.id}>
            <div>
              <strong>{kinds[m.kind] ?? m.kind}</strong>
              <span className="fp-small">{dateFmt(m.created_at)}</span>
            </div>
            <strong className={m.amount > 0 ? "fp-plus" : ""}>
              {m.amount > 0 ? "+" : ""}{fmt(m.amount)} {m.currency_code}
            </strong>
          </div>
        ))}
      </article>

      {open && (
        <div className="fp-modal-overlay" onClick={closeAction}>
          <div className="fp-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="fp-modal-head">
              <strong>{open.mode === "withdraw" ? "Demande de retrait" : "Demande de conversion"}</strong>
              <button type="button" className="fp-close" aria-label="Fermer" onClick={closeAction}>×</button>
            </div>
            <p className="fp-muted">
              Solde disponible : {fmt(data.wallets.find((w) => w.currency_code === open.currency)?.balance ?? 0)} {open.currency}
            </p>
            <form className="fp-form" onSubmit={submit}>
              {open.mode === "convert" && (
                <label className="fp-field">
                  <span>Vers la devise</span>
                  <select className="fp-input" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} required>
                    <option value="">Choisir une devise</option>
                    {targetCurrencies.map((c) => (
                      <option key={c} value={c}>{c} — {labels[c] ?? c}</option>
                    ))}
                  </select>
                </label>
              )}

              {open.mode === "withdraw" && (
                <>
                  <label className="fp-field">
                    <span>Pays de réception</span>
                    <select className="fp-input" value={country} onChange={(e) => { setCountry(e.target.value); setOperator(""); }} required>
                      <option value="">Choisir un pays</option>
                      {destinationOptions.map(([code, d]) => <option key={code} value={code}>{d.name}</option>)}
                    </select>
                  </label>
                  <label className="fp-field">
                    <span>Opérateur mobile money</span>
                    <select className="fp-input" value={operator} onChange={(e) => setOperator(e.target.value)} required disabled={!country}>
                      <option value="">Choisir un opérateur</option>
                      {operatorOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <label className="fp-field">
                    <span>Numéro qui recevra l’argent</span>
                    <input className="fp-input" inputMode="tel" placeholder="ex. 812345678" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                  </label>
                  <label className="fp-field">
                    <span>Nom du bénéficiaire</span>
                    <input className="fp-input" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} required />
                  </label>
                </>
              )}

              <label className="fp-field">
                <span>Montant en {open.currency}</span>
                <input className="fp-input" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </label>
              <div className="fp-actions">
                <button className="fp-btn" disabled={busy || !amount}>{busy ? "Envoi…" : "Confirmer"}</button>
                <button className="fp-btn fp-btn-ghost" type="button" onClick={closeAction}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
