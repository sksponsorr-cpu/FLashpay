"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Wallet = { currency_code: string; balance: number };
type Movement = { id: string; currency_code: string; kind: string; amount: number; balance_after: number; created_at: string };
type Withdrawal = { id: string; currency_code: string; requested_amount: number; payout_amount: number; status: string; created_at: string };
type Conversion = { id: string; from_currency: string; to_currency: string; amount: number; status: string; received_amount: number | null; created_at: string };
type Minimum = { currency_code: string; minimum_amount: number };
type WalletData = {
  wallets: Wallet[];
  movements: Movement[];
  withdrawals: Withdrawal[];
  conversions: Conversion[];
  minimums: Minimum[];
  rates: { from_currency: string; to_currency: string; rate: number }[];
  plan: string | null;
  fee: { withdrawal: number; conversion: number };
};

const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const kindLabel: Record<string, string> = {
  collection: "Encaissement",
  withdrawal: "Retrait",
  conversion_in: "Conversion reçue",
  conversion_out: "Conversion envoyée",
  adjustment: "Ajustement",
};
const statusLabel: Record<string, string> = { pending: "En attente", paid: "Payé", rejected: "Rejeté", done: "Effectuée" };

export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [withdrawCurrency, setWithdrawCurrency] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("");
  const [toCurrency, setToCurrency] = useState("");
  const [convertAmount, setConvertAmount] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/wallet", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de charger ton portefeuille.");
      setData(result);
      setWithdrawCurrency((current) => current || result.wallets[0]?.currency_code || "");
      setFromCurrency((current) => current || result.wallets[0]?.currency_code || "");
      setToCurrency((current) => current || result.wallets.find((w: Wallet) => w.currency_code !== result.wallets[0]?.currency_code)?.currency_code || "USD");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger ton portefeuille.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function send(payload: Record<string, unknown>, onDone: () => void) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Demande refusée.");
      setMessage("Demande enregistrée. Elle sera traitée par FlashPay.");
      onDone();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Demande refusée.");
    } finally {
      setBusy(false);
    }
  }

  function submitWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(
      { action: "withdraw", currency_code: withdrawCurrency, amount: Number(withdrawAmount) },
      () => setWithdrawAmount(""),
    );
  }

  function submitConvert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(
      { action: "convert", from_currency: fromCurrency, to_currency: toCurrency, amount: Number(convertAmount) },
      () => setConvertAmount(""),
    );
  }

  if (!data) {
    return <main style={{ padding: 16 }}><p>{message || "Chargement de ton portefeuille…"}</p></main>;
  }

  const minimumFor = (currency: string) => data.minimums.find((m) => m.currency_code === currency)?.minimum_amount;
  const hasWallets = data.wallets.length > 0;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16, display: "grid", gap: 24 }}>
      <h1>Mon portefeuille</h1>
      <p>Abonnement : {data.plan ? (data.plan === "premium" ? "Premium" : "Basic") : "aucun"}</p>
      {message && <p role="status">{message}</p>}

      <section>
        <h2>Soldes</h2>
        {!hasWallets && <p>Ton portefeuille apparaîtra ici après ton premier encaissement réussi.</p>}
        {data.wallets.map((w) => (
          <p key={w.currency_code}><strong>{fmt(w.balance)} {w.currency_code}</strong></p>
        ))}
      </section>

      <section>
        <h2>Retrait</h2>
        <p>Frais : {data.fee.withdrawal} %. Tu reçois le montant demandé moins ces frais. Le minimum est affiché dans chaque devise.</p>
        {hasWallets && (
          <form onSubmit={submitWithdraw} style={{ display: "grid", gap: 8 }}>
            <select value={withdrawCurrency} onChange={(event) => setWithdrawCurrency(event.target.value)}>
              {data.wallets.map((w) => <option key={w.currency_code} value={w.currency_code}>{w.currency_code}</option>)}
            </select>
            <input
              inputMode="decimal"
              placeholder="Montant demandé"
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
              required
            />
            {minimumFor(withdrawCurrency) !== undefined && <p>Minimum : {fmt(minimumFor(withdrawCurrency)!)} {withdrawCurrency}</p>}
            <button disabled={busy || !withdrawAmount} type="submit">Demander le retrait</button>
          </form>
        )}
      </section>

      <section>
        <h2>Conversion</h2>
        <p>Frais : {data.fee.conversion} %. Le taux est appliqué par FlashPay au moment du traitement.</p>
        {hasWallets && (
          <form onSubmit={submitConvert} style={{ display: "grid", gap: 8 }}>
            <select value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)}>
              {data.wallets.map((w) => <option key={w.currency_code} value={w.currency_code}>{w.currency_code}</option>)}
            </select>
            <input placeholder="Vers (ex. USD)" value={toCurrency} onChange={(event) => setToCurrency(event.target.value.toUpperCase())} required />
            <input inputMode="decimal" placeholder="Montant à convertir" value={convertAmount} onChange={(event) => setConvertAmount(event.target.value)} required />
            <button disabled={busy || !convertAmount || !toCurrency} type="submit">Demander la conversion</button>
          </form>
        )}
      </section>

      <section>
        <h2>Demandes</h2>
        {data.withdrawals.length === 0 && data.conversions.length === 0 && <p>Aucune demande pour le moment.</p>}
        {data.withdrawals.map((r) => (
          <p key={r.id}>Retrait {fmt(r.requested_amount)} {r.currency_code} · reçu {fmt(r.payout_amount)} · {statusLabel[r.status] ?? r.status}</p>
        ))}
        {data.conversions.map((r) => (
          <p key={r.id}>Conversion {fmt(r.amount)} {r.from_currency} → {r.to_currency} · {statusLabel[r.status] ?? r.status}{r.received_amount ? ` · reçu ${fmt(r.received_amount)}` : ""}</p>
        ))}
      </section>

      <section>
        <h2>Mouvements</h2>
        {data.movements.length === 0 && <p>Aucun mouvement.</p>}
        {data.movements.map((m) => (
          <p key={m.id}>
            {kindLabel[m.kind] ?? m.kind} · {m.amount > 0 ? "+" : ""}{fmt(m.amount)} {m.currency_code} · solde {fmt(m.balance_after)}
          </p>
        ))}
      </section>
    </main>
  );
}
