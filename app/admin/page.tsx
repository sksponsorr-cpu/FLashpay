"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PaymentProviderSwitch from "@/components/admin/payment-provider-switch";

type Withdrawal = { id: string; currency_code: string; requested_amount: number; payout_amount: number; fee_amount: number; destination_details?: unknown; destination_name?: string | null; destination_country?: string | null; destination_operator?: string | null; destination_mobile?: string | null; created_at: string };
type Conversion = { id: string; from_currency: string; to_currency: string; amount: number; fee_rate?: number; created_at: string };
type Rate = { from_currency: string; to_currency: string; rate: number };
type Minimum = { currency_code: string; minimum_amount: number };
type Account = { id: string; email: string };
type Identity = { id: string; owner_id: string; full_name: string; country_code: string; document_type: string; document_number: string; status: string; created_at: string; document_url: string | null; selfie_url: string | null };
type Merchant = { owner_id: string; email: string; successful_count: number; pending_count: number; failed_count: number; volume: Record<string, number> };
type Data = { withdrawals: Withdrawal[]; conversions: Conversion[]; rates: Rate[]; minimums: Minimum[]; accounts: Account[]; identities: Identity[]; overview?: { users: number; transactions: { total: number; successful: number; pending: number; failed: number }; withdrawals: { total: number; delivered: number; pending: number; not_delivered: number }; merchants: Merchant[] } };
type Step = "overview" | "withdrawals" | "conversions" | "rates" | "ids" | "subs";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const NAV: { group: string; items: { id: Step; label: string }[] }[] = [
  { group: "Vue d’ensemble", items: [{ id: "overview", label: "Statistiques" }] },
  { group: "Traitement quotidien", items: [{ id: "withdrawals", label: "Retraits en attente" }, { id: "conversions", label: "Conversions" }, { id: "ids", label: "Identités" }] },
  { group: "Marchands & support", items: [{ id: "rates", label: "Taux et minimums" }, { id: "subs", label: "Abonnements" }] },
];

const CSS = `
.adm{min-height:100vh;display:grid;grid-template-columns:246px minmax(0,1fr);background:#f6f7fb;color:#17211b;font-family:inherit;color-scheme:light}
.adm *{box-sizing:border-box}
.adm-side{position:sticky;top:0;height:100vh;overflow-y:auto;background:#fff;border-right:1px solid #ececf4;padding:22px 14px;display:flex;flex-direction:column;gap:18px}
.adm-brand{display:flex;align-items:center;gap:9px;padding:0 8px;font-size:19px;font-weight:800}
.adm-brand small{margin-left:6px;color:#6236d6;font-size:12px;font-weight:700}
.adm-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#7c5be6,#5b3fd6);color:#fff}
.adm-cap{margin:0 0 6px;padding:0 10px;color:#9a95aa;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.adm-nav{width:100%;display:flex;align-items:center;justify-content:space-between;min-height:40px;padding:0 12px;border:0;border-radius:12px;background:transparent;color:#55566a;font:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:background .2s ease,color .2s ease}
.adm-nav:hover{background:#f4f1ff;color:#3b2a8c}
.adm-nav.on{background:#5b3fd6;color:#fff;box-shadow:0 10px 24px -12px rgba(91,63,214,.7)}
.adm-nav em{font-style:normal;min-width:22px;height:20px;padding:0 6px;border-radius:99px;background:#ffe3d9;color:#c8321a;font-size:11px;font-weight:700;display:grid;place-items:center}
.adm-nav.on em{background:#fff;color:#5b3fd6}
.adm-back{margin-top:auto;padding:0 10px;color:#6236d6;font-size:13px;font-weight:700;text-decoration:none}
.adm-main{min-width:0;padding:22px 28px 48px}
.adm-top{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.adm-search{flex:1;min-width:0;height:44px;border:1px solid #ececf4;border-radius:14px;background:#fff;padding:0 14px;font:inherit;font-size:14px;outline:0;transition:border .2s ease,box-shadow .2s ease}
.adm-search:focus{border-color:#8f7ae8;box-shadow:0 0 0 4px #efeafe}
.adm-me{display:flex;align-items:center;gap:9px;height:44px;padding:0 14px 0 6px;border:1px solid #ececf4;border-radius:14px;background:#fff;font-size:14px;font-weight:700;color:#2d2540;white-space:nowrap}
.adm-me b{display:grid;width:32px;height:32px;place-items:center;border-radius:50%;background:#5b3fd6;color:#fff;font-size:12px}
.adm h1{margin:0;font-size:26px;font-weight:800;letter-spacing:-.02em}
.adm-sub{margin:6px 0 22px;color:#7a7590;font-size:14px;line-height:1.5}
.adm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.adm-kpi{display:grid;gap:8px;padding:18px 20px;border-radius:20px;background:#fff;border:1px solid #ececf4;box-shadow:0 10px 30px #17211b0d;animation:adm-rise .5s ease both}
.adm-kpi span{font-size:13px;font-weight:600;color:#6b6680}
.adm-kpi strong{font-size:28px;font-weight:800;letter-spacing:-.02em}
.adm-kpi small{color:#8a8aa3;font-size:12px}
.adm-kpi.violet{background:#f4f1ff;border-color:#e4dcff}
.adm-kpi.mint{background:#effaf4;border-color:#cdeedd}
.adm-kpi.amber{background:#fff7e9;border-color:#f6e2b8}
.adm-kpi.rose{background:#fff0ee;border-color:#f6d2cc}
.adm-panel{background:#fff;border:1px solid #ececf4;border-radius:20px;padding:18px 20px;box-shadow:0 10px 30px #17211b0d;margin-bottom:16px}
.adm-panel h2{margin:0 0 4px;font-size:16px;font-weight:700}
.adm-panel > p{margin:0 0 14px;color:#8a8aa3;font-size:13px}
.adm-cur{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.adm-cur div{padding:14px;border-radius:14px;background:#faf9fd;border:1px solid #f0eef8;display:grid;gap:4px}
.adm-cur span{color:#8a8aa3;font-size:12px;font-weight:700}
.adm-cur strong{font-size:18px;font-weight:800}
.adm-table-wrap{overflow-x:auto}
.adm-table{width:100%;border-collapse:collapse;font-size:14px}
.adm-table th,.adm-table td{padding:12px 10px;text-align:left;border-bottom:1px solid #f1eff7;white-space:nowrap}
.adm-table th{color:#8a8aa3;font-size:12px;font-weight:700}
.adm-table tbody tr{transition:background .2s ease}
.adm-table tbody tr:hover{background:#fbfaff}
.adm-card{background:#fff;border:1px solid #ececf4;border-radius:20px;padding:18px;margin-bottom:14px;box-shadow:0 10px 30px #17211b0d;display:grid;gap:10px;animation:adm-rise .45s ease both}
.adm-card h2{margin:0;font-size:17px}
.adm-meta{color:#7a7590;font-size:13px;word-break:break-all}
.adm-list{display:grid;gap:4px;font-size:14px;color:#55566a}
.adm-row{display:flex;gap:8px;flex-wrap:wrap}
.adm-btn{min-height:42px;padding:0 16px;border:0;border-radius:14px;background:#5b3fd6;color:#fff;font:inherit;font-weight:700;cursor:pointer;transition:transform .15s ease,opacity .2s ease}
.adm-btn:active{transform:scale(.97)}
.adm-btn.g{background:#fff;color:#5b3fd6;border:1px solid #e4dcff}
.adm-btn:disabled{opacity:.55;cursor:default}
.adm-in{min-height:44px;width:100%;padding:0 12px;border:1px solid #e4e1ef;border-radius:14px;background:#fbfbfe;font:inherit;font-size:14px;outline:0;transition:border .2s ease,box-shadow .2s ease}
.adm-in:focus{border-color:#8f7ae8;box-shadow:0 0 0 4px #efeafe}
.adm-lbl{font-size:13px;font-weight:700;color:#55566a}
.adm-note{margin-bottom:16px;padding:12px 14px;border-radius:14px;background:#efeafe;color:#3b2a8c;font-size:14px;animation:adm-rise .3s ease both}
.adm-empty{color:#8a8aa3;font-size:14px}
.adm-err{margin-bottom:14px;padding:12px 14px;border-radius:14px;background:#fff0ee;color:#c8321a;font-weight:600}
@keyframes adm-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.adm *{animation:none!important;transition:none!important}}
@media(max-width:860px){
  .adm{grid-template-columns:1fr}
  .adm-side{position:static;height:auto;flex-direction:column;gap:12px;padding:16px}
  .adm-main{padding:16px 14px 40px}
  .adm-top{flex-wrap:wrap}
  .adm-me{display:none}
}
`;

export default function AdminPage() {
  const [step, setStep] = useState<Step>("overview");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
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
      const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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

  const counts: Partial<Record<Step, number>> = {
    withdrawals: data?.withdrawals.length,
    conversions: data?.conversions.length,
    ids: data?.identities?.length,
  };

  // Totaux par devise, tous marchands confondus.
  const byCurrency = Object.entries(
    (data?.overview?.merchants ?? []).reduce<Record<string, number>>((acc, m) => {
      for (const [c, v] of Object.entries(m.volume)) acc[c] = (acc[c] ?? 0) + v;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const merchants = (data?.overview?.merchants ?? []).filter((m) =>
    (m.email || m.owner_id).toLowerCase().includes(query.trim().toLowerCase())
  );

  const feesPending = (data?.withdrawals ?? []).reduce((sum, w) => sum + (w.fee_amount ?? 0), 0);

  return (
    <main className="adm">
      <style>{CSS}</style>

      <aside className="adm-side">
        <div className="adm-brand"><span className="adm-logo">f</span>flash<span style={{ color: "#e8401f" }}>pay</span><small>Admin</small></div>
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="adm-cap">{g.group}</p>
            {g.items.map((it) => (
              <button key={it.id} className={`adm-nav${step === it.id ? " on" : ""}`} aria-current={step === it.id ? "page" : undefined} onClick={() => { setStep(it.id); setNotice(""); }}>
                <span>{it.label}</span>
                {counts[it.id] ? <em>{counts[it.id]}</em> : null}
              </button>
            ))}
          </div>
        ))}
        <Link className="adm-back" href="/dashboard">← Retour au tableau de bord</Link>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <input className="adm-search" placeholder="Rechercher un marchand…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher un marchand" />
          <div className="adm-me"><b>A</b>Administrateur</div>
        </header>

        {error && <p className="adm-err">{error}</p>}
        {notice && <div className="adm-note" role="status">{notice}</div>}

        {step === "overview" && (
          <section>
            <h1>Statistiques plateforme</h1>
            <p className="adm-sub">Vue d’ensemble de tous les marchands Flash Pay.</p>

            <div className="adm-kpis">
              <div className="adm-kpi violet"><span>Marchands actifs</span><strong>{data?.overview?.merchants.length ?? "—"}</strong></div>
              <div className="adm-kpi mint"><span>Transactions réussies</span><strong>{data?.overview?.transactions.successful ?? "—"}</strong><small>sur {data?.overview?.transactions.total ?? "—"} au total</small></div>
              <div className="adm-kpi amber"><span>Identités en attente</span><strong>{data?.identities?.length ?? "—"}</strong></div>
              <div className="adm-kpi rose"><span>Retraits en attente</span><strong>{data?.overview?.withdrawals.pending ?? "—"}</strong><small>frais à percevoir : {fmt(feesPending)}</small></div>
            </div>

            <div className="adm-panel">
              <h2>Volume par devise</h2>
              <p>Montants encaissés, tous marchands confondus.</p>
              <div className="adm-cur">
                {byCurrency.length === 0 && <span className="adm-empty">Aucune transaction pour le moment.</span>}
                {byCurrency.map(([c, v]) => <div key={c}><span>{c}</span><strong>{fmt(v)}</strong></div>)}
              </div>
            </div>

            <div className="adm-panel">
              <h2>Marchands</h2>
              <p>Du plus gros montant au plus petit.</p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Marchand</th><th>Montant encaissé</th><th>Réussies</th><th>En attente</th><th>Échouées</th></tr></thead>
                  <tbody>
                    {merchants.map((m) => (
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
                {merchants.length === 0 && <p className="adm-empty" style={{ padding: 12 }}>Aucun marchand ne correspond.</p>}
              </div>
            </div>
          </section>
        )}

        {step === "withdrawals" && (
          <section>
            <h1>Retraits en attente</h1>
            <p className="adm-sub">Marque-les payés une fois l’argent envoyé, ou rejette-les.</p>
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
            <h1>Conversions</h1>
            <p className="adm-sub">Saisis le taux appliqué, puis termine. Le bénéfice se calcule automatiquement.</p>
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
                      {benefit !== null && <span>Bénéfice Flash Pay : <strong>{fmt(benefit)} {c.to_currency}</strong></span>}
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

        {step === "ids" && (
          <section>
            <h1>Identités</h1>
            <p className="adm-sub">Vérifie la pièce et le selfie, puis approuve ou rejette.</p>
            {data && (data.identities ?? []).length === 0 && <p className="adm-empty">Aucune demande en attente.</p>}
            {(data?.identities ?? []).map((i) => (
              <div className="adm-card" key={i.id}>
                <h2>{i.full_name}</h2>
                <span className="adm-meta">{i.country_code} · {i.document_type} · n° {i.document_number}</span>
                {i.document_url && <img src={i.document_url} alt="Pièce d’identité" style={{ width: "100%", borderRadius: 14 }} />}
                {i.selfie_url && <img src={i.selfie_url} alt="Selfie avec la pièce" style={{ width: "100%", borderRadius: 14 }} />}
                <input className="adm-in" placeholder="Motif du rejet (si rejet)" value={reasons[i.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [i.id]: e.target.value })} />
                <div className="adm-row">
                  <button className="adm-btn" disabled={busy} onClick={() => act({ action: "review_identity", id: i.id, approve: true }, "Identité approuvée. Le compte est vérifié.")}>Approuver</button>
                  <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "review_identity", id: i.id, approve: false, reason: reasons[i.id] }, "Demande rejetée.")}>Rejeter</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {step === "rates" && (
          <section>
            <h1>Taux et minimums</h1>
            <p className="adm-sub">Modifie les taux de change et les minimums de retrait.</p>
            <div style={{ marginBottom: 16 }}><PaymentProviderSwitch /></div>
            <div className="adm-panel">
              <h2>Taux de change</h2>
              <div className="adm-list" style={{ marginBottom: 12 }}>{data?.rates.map((r) => <span key={`${r.from_currency}-${r.to_currency}`}>{r.from_currency} → {r.to_currency} : {r.rate}</span>)}</div>
              <div style={{ display: "grid", gap: 10 }}>
                <input className="adm-in" placeholder="Devise de départ (ex. CDF)" value={rateForm.from} onChange={(e) => setRateForm({ ...rateForm, from: e.target.value })} />
                <input className="adm-in" placeholder="Devise d’arrivée (ex. USD)" value={rateForm.to} onChange={(e) => setRateForm({ ...rateForm, to: e.target.value })} />
                <input className="adm-in" inputMode="decimal" placeholder="Taux" value={rateForm.rate} onChange={(e) => setRateForm({ ...rateForm, rate: e.target.value })} />
                <button className="adm-btn" disabled={busy} onClick={() => act({ action: "set_rate", from_currency: rateForm.from, to_currency: rateForm.to, rate: Number(rateForm.rate) }, "Taux enregistré.")}>Enregistrer le taux</button>
              </div>
            </div>
            <div className="adm-panel">
              <h2>Minimums de retrait</h2>
              <div className="adm-list" style={{ marginBottom: 12 }}>{data?.minimums.map((m) => <span key={m.currency_code}>{m.currency_code} : {fmt(m.minimum_amount)}</span>)}</div>
              <div style={{ display: "grid", gap: 10 }}>
                <input className="adm-in" placeholder="Devise (ex. XAF)" value={minForm.currency} onChange={(e) => setMinForm({ ...minForm, currency: e.target.value })} />
                <input className="adm-in" inputMode="decimal" placeholder="Minimum" value={minForm.minimum} onChange={(e) => setMinForm({ ...minForm, minimum: e.target.value })} />
                <button className="adm-btn" disabled={busy} onClick={() => act({ action: "set_minimum", currency_code: minForm.currency, minimum_amount: Number(minForm.minimum) }, "Minimum enregistré.")}>Enregistrer le minimum</button>
              </div>
            </div>
          </section>
        )}

        {step === "subs" && (
          <section>
            <h1>Abonnements</h1>
            <p className="adm-sub">Choisis le compte, le plan et la durée, puis active.</p>
            <div className="adm-panel">
              <h2>Activer un abonnement</h2>
              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
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
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
