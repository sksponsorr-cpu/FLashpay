"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

// Portefeuilles par devise, affichés directement dans la vue d'ensemble.
// Chaque carte s'ouvre pour faire un retrait ou une conversion, sans quitter le tableau de bord.

type Wallet = { currency_code: string; balance: number };
type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };
type WalletData = {
  wallets: Wallet[];
  movements: Movement[];
  minimums: { currency_code: string; minimum_amount: number }[];
  plan: string | null;
  fee: { withdrawal: number; conversion: number };
};

// Devises des pays FlashPay, affichées dès l'ouverture du tableau de bord.
const DEFAULT_WALLETS = ["XAF", "CDF", "XOF", "NGN", "RWF", "GHS", "KES"];

const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const kindLabel: Record<string, string> = {
  collection: "Encaissement",
  withdrawal: "Retrait",
  conversion_in: "Conversion reçue",
  conversion_out: "Conversion envoyée",
  adjustment: "Ajustement",
};

const card = { background: "#fff", borderRadius: 16, padding: 14, boxShadow: "0 1px 2px rgba(20,36,28,.06)" } as const;
const field = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #dfe6e1", fontSize: 14 } as const;
const button = { background: "#1f6b4c", color: "#fff", border: 0, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as const;
const ghost = { background: "#eef4f0", color: "#1f6b4c", border: 0, borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as const;

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
      setNotice("Demande enregistrée. FlashPay la traite.");
      setOpen(null);
      setAmount("");
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Demande refusée.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return (
    <div style={{ ...card, display: "grid", gap: 8 }} role="alert">
      <strong style={{ fontSize: 14 }}>Portefeuille indisponible</strong>
      <p style={{ margin: 0, fontSize: 13, color: "#8a5a00" }}>{error}</p>
      <div><button style={button} type="button" onClick={() => { setError(""); void load(); }}>Réessayer</button></div>
    </div>
  );
  const shownWallets = data && data.wallets.length > 0 ? data.wallets : DEFAULT_WALLETS.map((code) => ({ currency_code: code, balance: 0 }));
  if (!data) return (
    <div style={card} aria-busy="true">
      <strong style={{ fontSize: 14 }}>Mes portefeuilles</strong>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7f74" }}>Chargement du portefeuille…</p>
    </div>
  );

  const minimumFor = (currency: string) => data.minimums.find((m) => m.currency_code === currency)?.minimum_amount;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Mes portefeuilles</h3>
        <span style={{ fontSize: 12, color: "#6b7f74" }}>Abonnement : {data.plan ? (data.plan === "premium" ? "Premium" : "Basic") : "aucun"}</span>
      </div>

      {shownWallets.map((wallet) => (
        <div key={wallet.currency_code} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6b7f74", fontWeight: 600 }}>{wallet.currency_code}</span>
            <span style={{ fontSize: 12, color: "#6b7f74" }}>Retrait : {data.fee.withdrawal} % · Conversion : {data.fee.conversion} %</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{fmt(wallet.balance)} <span style={{ fontSize: 13, color: "#6b7f74" }}>{wallet.currency_code}</span></div>
          {minimumFor(wallet.currency_code) !== undefined && (
            <div style={{ fontSize: 12, color: "#6b7f74", marginTop: 2 }}>Retrait minimum : {fmt(minimumFor(wallet.currency_code)!)} {wallet.currency_code}</div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button style={button} onClick={() => { setOpen({ currency: wallet.currency_code, mode: "withdraw" }); setAmount(""); }}>Retirer</button>
            <button style={ghost} onClick={() => { setOpen({ currency: wallet.currency_code, mode: "convert" }); setAmount(""); }}>Convertir</button>
          </div>

          {open && open.currency === wallet.currency_code && (
            <form onSubmit={submit} style={{ display: "grid", gap: 8, marginTop: 12, borderTop: "1px solid #eef2ef", paddingTop: 12 }}>
              <strong style={{ fontSize: 14 }}>{open.mode === "withdraw" ? "Demande de retrait" : "Demande de conversion"}</strong>
              {open.mode === "convert" && (
                <input style={field} placeholder="Vers (ex. USD)" value={toCurrency} onChange={(event) => setToCurrency(event.target.value)} required />
              )}
              <input style={field} inputMode="decimal" placeholder={`Montant en ${wallet.currency_code}`} value={amount} onChange={(event) => setAmount(event.target.value)} required />
              <span style={{ fontSize: 12, color: "#6b7f74" }}>
                {open.mode === "withdraw"
                  ? `Tu reçois le montant demandé moins ${data.fee.withdrawal} %.`
                  : `Frais de conversion : ${data.fee.conversion} %. Le taux est appliqué par FlashPay.`}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={button} disabled={busy || !amount} type="submit">{busy ? "Envoi…" : "Confirmer"}</button>
                <button style={ghost} type="button" onClick={() => setOpen(null)}>Annuler</button>
              </div>
            </form>
          )}
        </div>
      ))}

      {notice && <p role="status" style={{ fontSize: 13, color: "#1f6b4c", margin: 0 }}>{notice}</p>}

      <div style={card}>
        <strong style={{ fontSize: 14 }}>Derniers mouvements</strong>
        {data.movements.length === 0 && <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7f74" }}>Aucun mouvement pour le moment.</p>}
        {data.movements.slice(0, 8).map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderTop: "1px solid #eef2ef", marginTop: 8 }}>
            <span>{kindLabel[m.kind] ?? m.kind}</span>
            <span style={{ fontWeight: 700 }}>{m.amount > 0 ? "+" : ""}{fmt(m.amount)} {m.currency_code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
