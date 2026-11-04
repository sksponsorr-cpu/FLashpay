"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

// Portefeuilles réels par devise : un bloc par devise, retrait et conversion en ligne.

type Wallet = { currency_code: string; balance: number };
type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };
type WalletData = {
  wallets: Wallet[];
  movements: Movement[];
  minimums: { currency_code: string; minimum_amount: number }[];
  plan: string | null;
  fee: { withdrawal: number; conversion: number };
};

const currencyLabel: Record<string, string> = {
  XAF: "Franc CFA (CEMAC)",
  XOF: "Franc CFA (UEMOA)",
  CDF: "Franc congolais",
  NGN: "Naira nigérian",
  RWF: "Franc rwandais",
  USD: "Dollar américain",
};

const kindLabel: Record<string, string> = {
  collection: "Encaissement",
  withdrawal: "Retrait",
  conversion_in: "Conversion reçue",
  conversion_out: "Conversion envoyée",
  adjustment: "Ajustement",
};

const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const dateFmt = (value: string) => new Date(value).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function WalletOverview() {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<{ currency: string; mode: "withdraw" | "convert" } | null>(null);
  const [amount, setAmount] = useState("");
  const [toCurrency, setToCurrency] = useState("USD");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de charger le portefeuille.");
      setData(result);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger le portefeuille.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!open) return;
    setBusy(true);
    setNotice("");
    const payload = open.mode === "withdraw"
      ? { action: "withdraw", currency_code: open.currency, amount: Number(amount) }
      : { action: "convert", from_currency: open.currency, to_currency: toCurrency.toUpperCase(), amount: Number(amount) };
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Demande refusée.");
      setNotice("Demande enregistrée. FlashPay la traite manuellement.");
      setOpen(null);
      setAmount("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Demande refusée.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="fp-muted">{error}</p>;
  if (!data) return <p className="fp-muted">Chargement de tes portefeuilles…</p>;

  const minimumFor = (currency: string) => data.minimums.find((m) => m.currency_code === currency)?.minimum_amount;

  return (
    <div className="fp-wallets">
      {data.wallets.length === 0 && (
        <div className="fp-empty-card">
          <strong>Aucun portefeuille pour le moment</strong>
          <p>Un portefeuille apparaît automatiquement dans la devise de ton pays dès ton premier encaissement réussi.</p>
        </div>
      )}

      <div className="fp-wallet-grid">
        {data.wallets.map((wallet) => (
          <article className="fp-wallet-card" key={wallet.currency_code}>
            <div className="fp-wallet-head">
              <span className="fp-code">{wallet.currency_code}</span>
              <span className="fp-small">{currencyLabel[wallet.currency_code] ?? wallet.currency_code}</span>
            </div>
            <div className="fp-wallet-balance">{fmt(wallet.balance)} <small>{wallet.currency_code}</small></div>
            <div className="fp-wallet-meta">
              Retrait {data.fee.withdrawal} % · Conversion {data.fee.conversion} %
              {minimumFor(wallet.currency_code) !== undefined && <> · Minimum {fmt(minimumFor(wallet.currency_code)!)} {wallet.currency_code}</>}
            </div>
            <div className="fp-actions">
              <button className="fp-btn" onClick={() => { setOpen({ currency: wallet.currency_code, mode: "withdraw" }); setAmount(""); }}>Retirer</button>
              <button className="fp-btn fp-btn-ghost" onClick={() => { setOpen({ currency: wallet.currency_code, mode: "convert" }); setAmount(""); }}>Convertir</button>
            </div>

            {open && open.currency === wallet.currency_code && (
              <form className="fp-form" onSubmit={submit}>
                <strong>{open.mode === "withdraw" ? "Demande de retrait" : "Demande de conversion"}</strong>
                {open.mode === "convert" && (
                  <input className="fp-input" placeholder="Vers (ex. USD)" value={toCurrency} onChange={(event) => setToCurrency(event.target.value)} required />
                )}
                <input className="fp-input" inputMode="decimal" placeholder={`Montant en ${wallet.currency_code}`} value={amount} onChange={(event) => setAmount(event.target.value)} required />
                <span className="fp-small">
                  {open.mode === "withdraw"
                    ? `Tu reçois le montant demandé moins ${data.fee.withdrawal} %.`
                    : `Frais de conversion : ${data.fee.conversion} %. Le taux est appliqué par FlashPay.`}
                </span>
                <div className="fp-actions">
                  <button className="fp-btn" disabled={busy || !amount} type="submit">{busy ? "Envoi…" : "Confirmer"}</button>
                  <button className="fp-btn fp-btn-ghost" type="button" onClick={() => setOpen(null)}>Annuler</button>
                </div>
              </form>
            )}
          </article>
        ))}
      </div>

      {notice && <p role="status" className="fp-notice">{notice}</p>}

      <article className="fp-card">
        <div className="fp-card-head">
          <h3>Derniers mouvements</h3>
          <span className="fp-small">Abonnement : {data.plan ? (data.plan === "premium" ? "Premium" : "Basic") : "aucun"}</span>
        </div>
        {data.movements.length === 0 && <p className="fp-muted">Aucun mouvement pour le moment.</p>}
        {data.movements.slice(0, 10).map((m) => (
          <div className="fp-row" key={m.id}>
            <div>
              <strong>{kindLabel[m.kind] ?? m.kind}</strong>
              <span className="fp-small">{dateFmt(m.created_at)}</span>
            </div>
            <strong className={m.amount > 0 ? "fp-plus" : ""}>{m.amount > 0 ? "+" : ""}{fmt(m.amount)} {m.currency_code}</strong>
          </div>
        ))}
      </article>
    </div>
  );
}
