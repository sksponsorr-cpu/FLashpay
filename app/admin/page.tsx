"use client";

import { useEffect, useState } from "react";

type Withdrawal = { id: string; owner_id: string; currency_code: string; requested_amount: number; fee_amount: number; payout_amount: number; created_at: string };
type Conversion = { id: string; owner_id: string; from_currency: string; to_currency: string; amount: number; fee_rate: number; created_at: string };
type Rate = { from_currency: string; to_currency: string; rate: number };
type Minimum = { currency_code: string; minimum_amount: number };
type AdminData = { withdrawals: Withdrawal[]; conversions: Conversion[]; rates: Rate[]; minimums: Minimum[] };

const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversionRates, setConversionRates] = useState<Record<string, string>>({});
  const [sub, setSub] = useState({ owner_id: "", plan: "basic", months: "1" });
  const [rate, setRate] = useState({ from: "XAF", to: "USD", value: "" });
  const [minimum, setMinimum] = useState({ currency: "XAF", value: "" });

  async function load() {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.message ?? "Impossible de charger l’espace admin.");
      return;
    }
    setData(result);
  }

  useEffect(() => { void load(); }, []);

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Action refusée.");
      setMessage("Action enregistrée.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action refusée.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <main style={{ padding: 16 }}><p>{message || "Chargement de l’espace admin…"}</p></main>;
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16, display: "grid", gap: 24 }}>
      <h1>Espace administrateur</h1>
      {message && <p role="status">{message}</p>}

      <section>
        <h2>Retraits en attente ({data.withdrawals.length})</h2>
        {data.withdrawals.length === 0 && <p>Aucun retrait en attente.</p>}
        {data.withdrawals.map((item) => (
          <div key={item.id} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <p><strong>{fmt(item.payout_amount)} {item.currency_code}</strong> à envoyer</p>
            <p>Demandé : {fmt(item.requested_amount)} {item.currency_code} · Frais : {fmt(item.fee_amount)}</p>
            <p>Client : <code>{item.owner_id}</code></p>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={busy} onClick={() => void act({ action: "mark_withdrawal_paid", id: item.id })}>Marquer payé</button>
              <button disabled={busy} onClick={() => void act({ action: "reject_withdrawal", id: item.id })}>Rejeter</button>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2>Conversions en attente ({data.conversions.length})</h2>
        {data.conversions.length === 0 && <p>Aucune conversion en attente.</p>}
        {data.conversions.map((item) => (
          <div key={item.id} style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <p>{fmt(item.amount)} {item.from_currency} → {item.to_currency} · frais {item.fee_rate} %</p>
            <p>Client : <code>{item.owner_id}</code></p>
            <input
              placeholder="Taux appliqué"
              inputMode="decimal"
              value={conversionRates[item.id] ?? ""}
              onChange={(event) => setConversionRates({ ...conversionRates, [item.id]: event.target.value })}
            />
            <button
              disabled={busy || !conversionRates[item.id]}
              onClick={() => void act({ action: "complete_conversion", id: item.id, rate: Number(conversionRates[item.id]) })}
            >
              Exécuter
            </button>
          </div>
        ))}
      </section>

      <section>
        <h2>Abonnement</h2>
        <p>Active un abonnement après paiement reçu. Prix : Basic 10 000 FCFA, Premium 25 000 FCFA par mois.</p>
        <input placeholder="ID du client" value={sub.owner_id} onChange={(event) => setSub({ ...sub, owner_id: event.target.value })} />
        <select value={sub.plan} onChange={(event) => setSub({ ...sub, plan: event.target.value })}>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </select>
        <input inputMode="numeric" value={sub.months} onChange={(event) => setSub({ ...sub, months: event.target.value })} />
        <button disabled={busy || !sub.owner_id} onClick={() => void act({ action: "activate_subscription", owner_id: sub.owner_id, plan: sub.plan, months: Number(sub.months) })}>
          Activer
        </button>
      </section>

      <section>
        <h2>Taux de change</h2>
        {data.rates.map((item) => (
          <p key={`${item.from_currency}-${item.to_currency}`}>1 {item.from_currency} = {item.rate} {item.to_currency}</p>
        ))}
        <input placeholder="De (ex. XAF)" value={rate.from} onChange={(event) => setRate({ ...rate, from: event.target.value })} />
        <input placeholder="Vers (ex. USD)" value={rate.to} onChange={(event) => setRate({ ...rate, to: event.target.value })} />
        <input placeholder="Taux" inputMode="decimal" value={rate.value} onChange={(event) => setRate({ ...rate, value: event.target.value })} />
        <button disabled={busy || !rate.value} onClick={() => void act({ action: "set_rate", from_currency: rate.from, to_currency: rate.to, rate: Number(rate.value) })}>
          Enregistrer le taux
        </button>
      </section>

      <section>
        <h2>Minimums de retrait</h2>
        {data.minimums.map((item) => (
          <p key={item.currency_code}>{item.currency_code} : {fmt(item.minimum_amount)}</p>
        ))}
        <input placeholder="Devise (ex. XAF)" value={minimum.currency} onChange={(event) => setMinimum({ ...minimum, currency: event.target.value })} />
        <input placeholder="Minimum" inputMode="decimal" value={minimum.value} onChange={(event) => setMinimum({ ...minimum, value: event.target.value })} />
        <button disabled={busy || !minimum.value} onClick={() => void act({ action: "set_minimum", currency_code: minimum.currency, minimum_amount: Number(minimum.value) })}>
          Enregistrer le minimum
        </button>
      </section>
    </main>
  );
}
