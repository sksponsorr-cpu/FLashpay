"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Wallet = { currency_code: string; balance: number };
type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };
type WalletData = {
  wallets: Wallet[];
  movements: Movement[];
  minimums: { currency_code: string; minimum_amount: number }[];
  plan: string | null;
  fee: { withdrawal: number; conversion: number };
};
type Country = { code: string; name: string; currency_code: string };

const labels: Record<string, string> = {
  XAF: "Franc CFA (CEMAC)", XOF: "Franc CFA (UEMOA)", CDF: "Franc congolais",
  NGN: "Naira nigérian", RWF: "Franc rwandais", USD: "Dollar américain",
};
const operatorsByCurrency: Record<string, string[]> = {
  XAF: ["MTN MoMo", "Orange Money", "Airtel Money"],
  XOF: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"],
  CDF: ["Airtel Money", "Orange Money", "M-Pesa", "Africell Money"],
  KES: ["M-Pesa", "Airtel Money"],
  RWF: ["MTN MoMo", "Airtel Money"],
  GHS: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"],
  NGN: ["Virement bancaire"],
  USD: ["Virement bancaire"],
};
const kinds: Record<string, string> = {
  collection: "Encaissement", withdrawal: "Retrait", conversion_in: "Conversion reçue",
  conversion_out: "Conversion envoyée", adjustment: "Ajustement",
};
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type Mode = "withdraw" | "convert";

export default function WalletOverview({ appId, onSubmitted, autoWithdraw = false }: { appId: string; onSubmitted?: (mode: Mode) => void; autoWithdraw?: boolean }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<{ currency: string; mode: Mode } | null>(null);
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [operator, setOperator] = useState("");
  const [mobile, setMobile] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [toCurrency, setToCurrency] = useState("USD");
  const [countries, setCountries] = useState<Country[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

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

  useEffect(() => {
    createClient().from("supported_countries").select("code,name,currency_code").order("name").then(({ data }) => {
      if (data) setCountries(data as Country[]);
    });
  }, []);

  // Ouvre directement le formulaire de retrait (depuis « Demander un retrait »)
  useEffect(() => {
    if (autoWithdraw && data && data.wallets.length > 0 && !open) {
      const w = data.wallets.find((x) => x.balance > 0) ?? data.wallets[0];
      openAction(w.currency_code, "withdraw");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoWithdraw, data]);

  function openAction(currency: string, mode: Mode) {
    setOpen({ currency, mode });
    setStep(1);
    setAmount(""); setCountryCode(""); setOperator(""); setMobile(""); setBeneficiary("");
    setNotice("");
  }
  function closeAction() { setOpen(null); }

  const current = open ? data?.wallets.find((w) => w.currency_code === open.currency) : undefined;
  const minimum = open ? data?.minimums.find((m) => m.currency_code === open.currency)?.minimum_amount ?? 0 : 0;
  const countriesForCurrency = open ? countries.filter((c) => c.currency_code === open.currency) : [];
  const operators = open ? (operatorsByCurrency[open.currency] ?? []) : [];
  const amountNum = Number(amount);
  const fee = open?.mode === "withdraw" ? Math.round(amountNum * (data?.fee.withdrawal ?? 0)) / 100 : 0;

  function validateStep(): string {
    if (step === 1) {
      if (!(amountNum > 0)) return "Saisis un montant.";
      if (open && amountNum < minimum) return `Le minimum est ${fmt(minimum)} ${open.currency}.`;
      if (current && amountNum > current.balance) return "Le montant dépasse ton solde disponible.";
    }
    if (step === 2 && (!countryCode || !operator)) return "Choisis le pays et l’opérateur du bénéficiaire.";
    if (step === 3 && (!mobile.trim() || !beneficiary.trim())) return "Indique le nom et le numéro du bénéficiaire.";
    return "";
  }

  function next() {
    const err = validateStep();
    if (err) { setNotice(err); return; }
    setNotice("");
    setStep((s) => s + 1);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!open) return;
    setBusy(true); setNotice("");
    const payload = open.mode === "withdraw"
      ? { action: "withdraw", currency_code: open.currency, amount: amountNum, app_id: appId,
          destination: { country_code: countryCode, operator, mobile: mobile.trim(), name: beneficiary.trim() } }
      : { action: "convert", from_currency: open.currency, to_currency: toCurrency.toUpperCase(), amount: amountNum, app_id: appId };
    try {
      const response = await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Demande refusée.");
      const mode = open.mode;
      setOpen(null);
      setNotice(mode === "withdraw" ? "Demande de retrait enregistrée. Elle est en attente de traitement." : "Demande de conversion enregistrée.");
      await load();
      onSubmitted?.(mode);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Demande refusée.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="fp-muted">{error}</p>;
  if (!data) return <p className="fp-muted">Chargement des portefeuilles…</p>;

  const minOf = (c: string) => data.minimums.find((x) => x.currency_code === c)?.minimum_amount;

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
            <div className="fp-wallet-balance">{fmt(wallet.balance)} <small>{wallet.currency_code}</small></div>
            <div className="fp-wallet-meta">
              Retrait {data.fee.withdrawal}% · Conversion {data.fee.conversion}%
              {minOf(wallet.currency_code) !== undefined && <> · Minimum {fmt(minOf(wallet.currency_code)!)} {wallet.currency_code}</>}
            </div>
            <div className="fp-actions">
              <button className="fp-btn" onClick={() => openAction(wallet.currency_code, "withdraw")}>Retirer</button>
              <button className="fp-btn fp-btn-ghost" onClick={() => openAction(wallet.currency_code, "convert")}>Convertir</button>
            </div>
          </article>
        ))}
      </div>

      {notice && !open && <p role="status" className="fp-notice">{notice}</p>}

      <article className="fp-card">
        <div className="fp-card-head">
          <h3>Derniers mouvements</h3>
          <span className="fp-small">Abonnement : {data.plan ?? "aucun"}</span>
        </div>
        {!data.movements.length && <p className="fp-muted">Aucun mouvement.</p>}
        {data.movements.slice(0, 10).map((m) => (
          <div className="fp-row" key={m.id}>
            <div><strong>{kinds[m.kind] ?? m.kind}</strong><span className="fp-small">{dateFmt(m.created_at)}</span></div>
            <strong className={m.amount > 0 ? "fp-plus" : ""}>{m.amount > 0 ? "+" : ""}{fmt(m.amount)} {m.currency_code}</strong>
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

            {open.mode === "withdraw" && (
              <div className="fp-steps">
                {["Montant", "Destination", "Bénéficiaire", "Confirmation"].map((label, i) => (
                  <span key={label} className={i + 1 === step ? "fp-step on" : i + 1 < step ? "fp-step done" : "fp-step"}>{i + 1}. {label}</span>
                ))}
              </div>
            )}

            <form className="fp-form" onSubmit={submit}>
              {(open.mode === "convert" || step === 1) && (
                <>
                  <p className="fp-muted">Solde disponible : {fmt(current?.balance ?? 0)} {open.currency}{open.mode === "withdraw" && minimum ? ` · minimum ${fmt(minimum)} ${open.currency}` : ""}</p>
                  {open.mode === "convert" && (
                    <label className="fp-field"><span>Vers la devise</span>
                      <input className="fp-input" placeholder="ex. USD" value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} required />
                    </label>
                  )}
                  <label className="fp-field"><span>Montant en {open.currency}</span>
                    <input className="fp-input" inputMode="decimal" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  </label>
                </>
              )}

              {open.mode === "withdraw" && step === 2 && (
                <>
                  <label className="fp-field"><span>Pays du bénéficiaire</span>
                    <select className="fp-input" value={countryCode} onChange={(e) => { setCountryCode(e.target.value); setOperator(""); }}>
                      <option value="">Choisir un pays</option>
                      {countriesForCurrency.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className="fp-field"><span>Opérateur</span>
                    <select className="fp-input" value={operator} onChange={(e) => setOperator(e.target.value)}>
                      <option value="">Choisir un opérateur</option>
                      {operators.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                </>
              )}

              {open.mode === "withdraw" && step === 3 && (
                <>
                  <label className="fp-field"><span>Nom du bénéficiaire</span>
                    <input className="fp-input" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
                  </label>
                  <label className="fp-field"><span>Numéro mobile du bénéficiaire</span>
                    <input className="fp-input" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                  </label>
                </>
              )}

              {open.mode === "withdraw" && step === 4 && (
                <div className="fp-recap">
                  <div className="fp-row"><span>Montant demandé</span><strong>{fmt(amountNum)} {open.currency}</strong></div>
                  <div className="fp-row"><span>Frais FlashPay ({data.fee.withdrawal} %)</span><strong>{fmt(fee)} {open.currency}</strong></div>
                  <div className="fp-row"><span>Montant reçu par le bénéficiaire</span><strong>{fmt(amountNum - fee)} {open.currency}</strong></div>
                  <div className="fp-row"><span>Bénéficiaire</span><strong>{beneficiary} · {mobile}</strong></div>
                  <div className="fp-row"><span>Pays / opérateur</span><strong>{countriesForCurrency.find((c) => c.code === countryCode)?.name} · {operator}</strong></div>
                </div>
              )}

              {notice && <p className="fp-notice" role="status">{notice}</p>}

              <div className="fp-actions">
                {open.mode === "withdraw" && step > 1 && <button type="button" className="fp-btn fp-btn-ghost" onClick={() => setStep((s) => s - 1)}>Retour</button>}
                {open.mode === "withdraw" && step < 4 && <button type="button" className="fp-btn" onClick={next}>Continuer</button>}
                {(open.mode === "convert" || step === 4) && <button className="fp-btn" disabled={busy || !amount}>{busy ? "Envoi…" : "Confirmer"}</button>}
                <button type="button" className="fp-btn fp-btn-ghost" onClick={closeAction}>Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
