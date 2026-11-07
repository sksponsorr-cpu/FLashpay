"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Withdrawal = { id: string; currency_code: string; requested_amount: number; payout_amount: number; fee_amount: number; destination_details?: unknown; destination_name?: string | null; destination_country?: string | null; destination_operator?: string | null; destination_mobile?: string | null; created_at: string };
type Conversion = { id: string; from_currency: string; to_currency: string; amount: number; fee_rate?: number; created_at: string };
type Rate = { from_currency: string; to_currency: string; rate: number };
type Minimum = { currency_code: string; minimum_amount: number };
type Account = { id: string; email: string };
type Identity = { id: string; owner_id: string; full_name: string; country_code: string; document_type: string; document_number: string; status: string; created_at: string; document_url: string | null; selfie_url: string | null };
type Data = { withdrawals: Withdrawal[]; conversions: Conversion[]; rates: Rate[]; minimums: Minimum[]; accounts: Account[]; identities: Identity[]; overview?: { users: number; transactions: { total: number; successful: number; pending: number; failed: number }; withdrawals: { total: number; delivered: number; pending: number; not_delivered: number }; merchants: { owner_id: string; email: string; successful_count: number; pending_count: number; failed_count: number; volume: Record<string, number> }[] } };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function AdminPage() {
  const [step, setStep] = useState<"overview" | "withdrawals" | "conversions" | "rates" | "subs" | "ids">("overview");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});

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
    { id: "overview", label: "Vue d’ensemble" },
    { id: "withdrawals", label: "Retraits", count: data?.withdrawals.length },
    { id: "conversions", label: "Conversions", count: data?.conversions.length },
    { id: "rates", label: "Taux et minimums" },
    { id: "ids", label: "Identités", count: data?.identities?.length },
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
        .adm-lbl{font-size:13px;font-weight:700;color:#55566a}
        .adm-kpis{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
        @media(min-width:700px){.adm-kpis{grid-template-columns:repeat(3,1fr)}}
        .adm-kpi{background:#fff;border:1px solid #f3e3dc;border-radius:18px;padding:14px;display:grid;gap:6px;box-shadow:0 8px 24px #17211b0d}
        .adm-kpi span{font-size:12px;font-weight:700;color:#6b7f74}
        .adm-kpi strong{font-size:24px;font-weight:800}
        .adm-kpi.ok strong{color:#13a05a}.adm-kpi.wait strong{color:#b76e00}.adm-kpi.ko strong{color:#c8321a}
        .adm-h{font-size:17px;margin:18px 0 10px}
        .adm-table-wrap{overflow-x:auto;background:#fff;border:1px solid #f3e3dc;border-radius:18px}
        .adm-table{width:100%;border-collapse:collapse;font-size:14px}
        .adm-table th,.adm-table td{padding:12px 14px;text-align:left;border-bottom:1px solid #f6ece7;white-space:nowrap}
        .adm-table th{color:#6b7f74;font-size:12px;font-weight:700}

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

      {step === "overview" && (
        <section>
          <div className="adm-kpis">
            <div className="adm-kpi"><span>Utilisateurs</span><strong>{data?.overview?.users ?? "—"}</strong></div>
            <div className="adm-kpi"><span>Transactions</span><strong>{data?.overview?.transactions.total ?? "—"}</strong></div>
            <div className="adm-kpi ok"><span>Retraits livrés</span><strong>{data?.overview?.withdrawals.delivered ?? "—"}</strong></div>
            <div className="adm-kpi wait"><span>Retraits en attente</span><strong>{data?.overview?.withdrawals.pending ?? "—"}</strong></div>
            <div className="adm-kpi ko"><span>Retraits non livrés</span><strong>{data?.overview?.withdrawals.not_delivered ?? "—"}</strong></div>
            <div className="adm-kpi"><span>Total des retraits</span><strong>{data?.overview?.withdrawals.total ?? "—"}</strong></div>
          </div>
          <h2 className="adm-h">Marchands, du plus gros montant au plus petit</h2>
          {data?.overview && data.overview.merchants.length === 0 && <p className="adm-empty">Aucune transaction pour le moment.</p>}
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Marchand</th><th>Montant encaissé</th><th>Réussies</th><th>En attente</th><th>Échouées</th></tr></thead>
              <tbody>
                {data?.overview?.merchants.map((m) => (
                  <tr key={m.owner_id}>
                    <td>{m.email || m.owner_id.slice(0, 8)}</td>
                    <td><strong>{Object.entries(m.volume).map(([c, v]) => `${fmt(v)} ${c}`).join(" · ") || "0"}</strong></td>
                    <td>{m.successful_count}</td>
                    <td>{m.pending_count}</td>
                    <td>{m.failed_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {step === "withdrawals" && (
        <section>
          <p className="adm-sub">Demandes de retrait en attente. Marque-les payées une fois l’argent envoyé, ou rejette-les.</p>
          {data && data.withdrawals.length === 0 && <p className="adm-empty">Aucune demande en attente.</p>}
          {data?.withdrawals.map((w) => (
            <div className="adm-card" key={w.id}>
              <h2>{fmt(w.payout_amount)} {w.currency_code} à verser</h2>
              <div className="adm-list"><span>Demandé : {fmt(w.requested_amount)} {w.currency_code} · frais : {fmt(w.fee_amount)}</span><span>{dateFmt(w.created_at)}</span></div>
              <div className="adm-list">
                <span>Bénéficiaire : <strong>{w.destination_name ?? "non renseigné"}</strong></span>
                <span>Téléphone : <strong>{w.destination_mobile ?? "non renseigné"}</strong></span>
                <span>Pays : {w.destination_country ?? "—"} · Opérateur : {w.destination_operator ?? "—"}</span>
              </div>
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
              {(() => {
                const rate = Number(convRate[c.id]);
                const fee = Number(c.fee_rate ?? 0);
                const benefit = rate > 0 ? c.amount * rate * (fee / 100) : null;
                const payout = rate > 0 ? c.amount * rate * (1 - fee / 100) : null;
                return (
                  <div className="adm-list">
                    <span>Frais de conversion : {fee} %</span>
                    {payout !== null && <span>À verser au client : <strong>{fmt(payout)} {c.to_currency}</strong></span>}
                    {benefit !== null && <span>Bénéfice FlashPay : <strong>{fmt(benefit)} {c.to_currency}</strong></span>}
                    {payout === null && <span className="adm-meta">Saisis le taux pour voir le montant à verser et ton bénéfice.</span>}
                  </div>
                );
              })()}
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

      {step === "ids" && (
        <section>
          <p className="adm-sub">Demandes de vérification d’identité en attente. Vérifie la pièce et le selfie, puis approuve ou rejette.</p>
          {data && (data.identities ?? []).length === 0 && <p className="adm-empty">Aucune demande en attente.</p>}
          {(data?.identities ?? []).map((i) => (
            <div className="adm-card" key={i.id}>
              <h2>{i.full_name}</h2>
              <span className="adm-meta">{i.country_code} · {i.document_type} · n° {i.document_number}</span>
              {i.document_url && <img src={i.document_url} alt="Pièce d’identité" style={{ width: "100%", borderRadius: 12 }} />}
              {i.selfie_url && <img src={i.selfie_url} alt="Selfie avec la pièce" style={{ width: "100%", borderRadius: 12 }} />}
              <input className="adm-in" placeholder="Motif du rejet (si rejet)" value={reasons[i.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [i.id]: e.target.value })} />
              <div className="adm-row">
                <button className="adm-btn" disabled={busy} onClick={() => act({ action: "review_identity", id: i.id, approve: true }, "Identité approuvée. Le compte est vérifié.")}>Approuver</button>
                <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "review_identity", id: i.id, approve: false, reason: reasons[i.id] }, "Demande rejetée.")}>Rejeter</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {step === "subs" && (
        <section>
          <div className="adm-card">
            <h2>Activer un abonnement</h2>
            <p className="adm-sub">1. Choisis le compte. 2. Choisis le plan. 3. Choisis la durée. 4. Clique sur Activer.</p>
            <label className="adm-lbl">Compte marchand</label>
            <select className="adm-in" value={subForm.owner} onChange={(e) => setSubForm({ ...subForm, owner: e.target.value })}>
              <option value="">— Choisir un compte —</option>
              {data?.accounts.map((a) => <option key={a.id} value={a.id}>{a.email}</option>)}
            </select>
            <label className="adm-lbl">Plan</label>
            <select className="adm-in" value={subForm.plan} onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}>
              <option value="basic">Basic : 1 % jusqu’à 200 000 FCFA par mois, puis 6 %</option>
              <option value="premium">Premium : 1 % jusqu’à 500 000 FCFA par mois, puis 6 %</option>
            </select>
            <label className="adm-lbl">Durée</label>
            <select className="adm-in" value={subForm.months} onChange={(e) => setSubForm({ ...subForm, months: e.target.value })}>
              <option value="1">1 mois</option>
              <option value="3">3 mois</option>
              <option value="12">12 mois</option>
            </select>
            <button className="adm-btn" disabled={busy || !subForm.owner} onClick={() => act({ action: "activate_subscription", owner_id: subForm.owner, plan: subForm.plan, months: Number(subForm.months) }, "Abonnement activé.")}>Activer l’abonnement</button>
          </div>
        </section>
      )}
    </main>
  );
}
