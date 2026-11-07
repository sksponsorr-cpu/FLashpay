"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Withdrawal = { id: string; currency_code: string; requested_amount: number; payout_amount: number; fee_amount: number; destination_details: unknown; created_at: string };
type Conversion = { id: string; from_currency: string; to_currency: string; amount: number; created_at: string };
type Rate = { from_currency: string; to_currency: string; rate: number };
type Minimum = { currency_code: string; minimum_amount: number };
type Data = { withdrawals: Withdrawal[]; conversions: Conversion[]; rates: Rate[]; minimums: Minimum[] };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminPage() {
  const [step, setStep] = useState<"withdrawals" | "conversions" | "rates" | "subs">("withdrawals");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Champs des formulaires
  const [convRate, setConvRate] = useState<Record<string, string>>({});
  const [rateForm, setRateForm] = useState({ from: "CDF", to: "USD", rate: "" });
  const [minForm, setMinForm] = useState({ currency: "XAF", minimum: "" });
  const [subForm, setSubForm] = useState({ owner: "", plan: "basic", months: "1" });

  async function load() {
    try {
      const response = await fetch("/api/admin", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Accès refusé.");
      setData(result as Data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger l’espace admin.");
    }
  }
  useEffect(() => { void load(); }, []);

  async function act(body: Record<string, unknown>, ok: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Action refusée.");
      setNotice(ok);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action refusée.");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: typeof step; label: string; count?: number }[] = [
    { id: "withdrawals", label: "Retraits", count: data?.withdrawals.length },
    { id: "conversions", label: "Conversions", count: data?.conversions.length },
    { id: "rates", label: "Taux et minimums" },
    { id: "subs", label: "Abonnements" },
  ];

  return (
    <main className="adm">
      <style>{`
        .adm{min-height:100vh;background:#fffaf8;color:#17211b;padding:18px 16px 40px;font-family:inherit;color-scheme:light}
        .adm-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
        .adm h1{font-size:24px;margin:0;font-weight:800}
        .adm-back{color:#e8401f;font-weight:700;font-size:14px}
        .adm-sub{color:#6b7f74;font-size:14px;margin:0 0 14px}
        .adm-tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:14px}
        .adm-tab{flex:none;min-height:42px;padding:0 14px;border:1px solid #efd9cf;border-radius:14px;background:#fff;color:#55566a;font-weight:700;cursor:pointer}
        .adm-tab.on{background:#e8401f;border-color:#e8401f;color:#fff}
        .adm-card{background:#fff;border:1px solid #f3e3dc;border-radius:20px;padding:16px;margin-bottom:12px;box-shadow:0 8px 24px #17211b0d;display:grid;gap:10px}
        .adm-card h2{font-size:17px;margin:0}
        .adm-meta{color:#6b7f74;font-size:13px;word-break:break-all}
        .adm-row{display:flex;gap:8px;flex-wrap:wrap}
        .adm-btn{min-height:44px;padding:0 16px;border:0;border-radius:14px;background:#e8401f;color:#fff;font-weight:800;cursor:pointer}
        .adm-btn.g{background:#fff;color:#e8401f;border:1px solid #efd9cf}
        .adm-btn:disabled{opacity:.55}
        .adm-in{min-height:46px;padding:0 12px;border:1px solid #efd9cf;border-radius:14px;background:#fffaf8;font:inherit;width:100%}
        .adm-note{padding:12px 14px;border-radius:14px;background:#fff0eb;color:#8a2a14;font-size:14px}
        .adm-empty{color:#6b7f74;font-size:14px}
        .adm-err{color:#c8321a;font-weight:600}
        .adm-list{display:grid;gap:4px;font-size:14px;color:#55566a}
      `}</style>

      <div className="adm-top">
        <h1>Bureau d’administration</h1>
        <Link className="adm-back" href="/dashboard">← Tableau de bord</Link>
      </div>
      <p className="adm-sub">Une étape à la fois : choisis une rubrique, traite les demandes, puis lis le message de confirmation.</p>

      {error && <p className="adm-err">{error}</p>}
      {notice && <div className="adm-note" role="status">{notice}</div>}

      <nav className="adm-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={step === t.id} className={step === t.id ? "adm-tab on" : "adm-tab"} onClick={() => { setStep(t.id); setNotice(""); }}>
            {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
          </button>
        ))}
      </nav>

      {step === "withdrawals" && (
        <section>
          <p className="adm-sub">Demandes de retrait en attente. Marque-les payées une fois l’argent envoyé, ou rejette-les.</p>
          {data && data.withdrawals.length === 0 && <p className="adm-empty">Aucune demande en attente.</p>}
          {data?.withdrawals.map((w) => (
            <div className="adm-card" key={w.id}>
              <h2>{fmt(w.payout_amount)} {w.currency_code} à verser</h2>
              <div className="adm-list"><span>Demandé : {fmt(w.requested_amount)} {w.currency_code} · frais : {fmt(w.fee_amount)}</span><span>{dateFmt(w.created_at)}</span></div>
              <span className="adm-meta">Destination : {JSON.stringify(w.destination_details ?? {})}</span>
              <div className="adm-row">
                <button className="adm-btn" disabled={busy} onClick={() => act({ action: "mark_withdrawal_paid", id: w.id }, "Retrait marqué comme payé.")}>Marquer payé</button>
                <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "reject_withdrawal", id: w.id }, "Retrait rejeté.")}>Rejeter</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {step === "conversions" && (
        <section>
          <p className="adm-sub">Conversions en attente. Saisis le taux appliqué, puis termine.</p>
          {data && data.conversions.length === 0 && <p className="adm-empty">Aucune conversion en attente.</p>}
          {data?.conversions.map((c) => (
            <div className="adm-card" key={c.id}>
              <h2>{fmt(c.amount)} {c.from_currency} → {c.to_currency}</h2>
              <span className="adm-meta">{dateFmt(c.created_at)}</span>
              <input className="adm-in" inputMode="decimal" placeholder="Taux appliqué" value={convRate[c.id] ?? ""} onChange={(e) => setConvRate({ ...convRate, [c.id]: e.target.value })} />
              <div className="adm-row">
                <button className="adm-btn" disabled={busy} onClick={() => act({ action: "complete_conversion", id: c.id, rate: Number(convRate[c.id]) }, "Conversion terminée.")}>Terminer</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {step === "rates" && (
        <section>
          <div className="adm-card">
            <h2>Taux de change</h2>
            <div className="adm-list">{data?.rates.map((r) => <span key={`${r.from_currency}-${r.to_currency}`}>{r.from_currency} → {r.to_currency} : {r.rate}</span>)}</div>
            <input className="adm-in" placeholder="Devise de départ (ex. CDF)" value={rateForm.from} onChange={(e) => setRateForm({ ...rateForm, from: e.target.value })} />
            <input className="adm-in" placeholder="Devise d’arrivée (ex. USD)" value={rateForm.to} onChange={(e) => setRateForm({ ...rateForm, to: e.target.value })} />
            <input className="adm-in" inputMode="decimal" placeholder="Taux" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} />
            <button className="adm-btn" disabled={busy} onClick={() => act({ action: "set_rate", from_currency: rateForm.from, to_currency: rateForm.to, rate: Number(rateForm.rate) }, "Taux enregistré.")}>Enregistrer le taux</button>
          </div>
          <div className="adm-card">
            <h2>Minimums de retrait</h2>
            <div className="adm-list">{data?.minimums.map((m) => <span key={m.currency_code}>{m.currency_code} : {fmt(m.minimum_amount)}</span>)}</div>
            <input className="adm-in" placeholder="Devise (ex. XAF)" value={minForm.currency} onChange={(e) => setMinForm({ ...minForm, currency: e.target.value })} />
            <input className="adm-in" inputMode="decimal" placeholder="Minimum" value={minForm.minimum} onChange={(e) => setMinForm({ ...minForm, minimum: e.target.value })} />
            <button className="adm-btn" disabled={busy} onClick={() => act({ action: "set_minimum", currency_code: minForm.currency, minimum_amount: Number(minForm.minimum) }, "Minimum enregistré.")}>Enregistrer le minimum</button>
          </div>
        </section>
      )}

      {step === "subs" && (
        <section>
          <div className="adm-card">
            <h2>Activer un abonnement</h2>
            <p className="adm-meta">Identifiant du compte marchand (owner_id), trouvé dans la base.</p>
            <input className="adm-in" placeholder="Identifiant du compte" value={subForm.owner} onChange={(e) => setSubForm({ ...subForm, owner: e.target.value })} />
            <select className="adm-in" value={subForm.plan} onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
            <input className="adm-in" inputMode="numeric" placeholder="Nombre de mois" value={subForm.months} onChange={(e) => setSubForm({ ...subForm, months: e.target.value })} />
            <button className="adm-btn" disabled={busy} onClick={() => act({ action: "activate_subscription", owner_id: subForm.owner, plan: subForm.plan, months: Number(subForm.months) }, "Abonnement activé.")}>Activer</button>
          </div>
        </section>
      )}
    </main>
  );
}
