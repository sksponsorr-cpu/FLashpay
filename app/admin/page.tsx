"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import PaymentProviderSwitch from "@/components/admin/payment-provider-switch";
import BrandLoader from "@/components/brand-loader";

type Withdrawal = { id: string; currency_code: string; requested_amount: number; payout_amount: number; fee_amount: number; destination_details?: unknown; destination_name?: string | null; destination_country?: string | null; destination_operator?: string | null; destination_mobile?: string | null; status: string; last_error?: string | null; created_at: string };
type Conversion = { id: string; from_currency: string; to_currency: string; amount: number; fee_rate?: number; status: string; created_at: string };
type Rate = { from_currency: string; to_currency: string; rate: number };
type Minimum = { currency_code: string; minimum_amount: number };
type Account = { id: string; email: string };
type Identity = { id: string; owner_id: string; full_name: string; country_code: string; document_type: string; document_number: string; status: string; created_at: string; document_url: string | null; selfie_url: string | null };
type Merchant = { owner_id: string; email: string; successful_count: number; pending_count: number; failed_count: number; volume: Record<string, number> };
type Client = { id: string; full_name: string; country_code: string | null; verification_status: string; created_at: string; email: string };
type Movement = { id: string; owner_id: string; currency_code: string; kind: string; amount: number; balance_after: number; reference: string; created_at: string; email: string };
type Reference = { transaction_id: string; owner_id: string; amount: number; currency_code: string; status: string; country_code: string; payment_method: string | null; processing_fee: number | null; purpose: string | null; created_at: string; email: string };
type TicketMessage = { id: string; ticket_id: string; author: "merchant" | "admin"; body: string; created_at: string };
type Ticket = { id: string; owner_id: string; subject: string; message: string; status: string; created_at: string; email: string; messages?: TicketMessage[] };

const QUICK_REPLIES = [
  "Bonjour, merci pour ton message. Nous examinons ta demande.",
  "Peux-tu nous indiquer la référence de la transaction concernée ?",
  "Ta demande a bien été traitée. N’hésite pas à revenir vers nous si besoin.",
  "Nous revenons vers toi dès que la vérification est terminée.",
];
type Data = { margin_points?: number; clients?: Client[]; interwallet?: Movement[]; references?: Reference[]; tickets?: Ticket[]; profit?: Record<string, number>; withdrawals: Withdrawal[]; conversions: Conversion[]; rates: Rate[]; minimums: Minimum[]; accounts: Account[]; identities: Identity[]; overview?: { users: number; transactions: { total: number; successful: number; pending: number; failed: number }; withdrawals: { total: number; delivered: number; pending: number; not_delivered: number }; merchants: Merchant[] } };
type Step = "overview" | "tx_stats" | "finance" | "treasury" | "kyc" | "transactions" | "direct_ops" | "withdrawals" | "simulator" | "merchants" | "clients" | "interwallet" | "support" | "conversions" | "rates" | "ids" | "subs";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const NAV: { group: string; items: { id: Step; label: string }[] }[] = [
  { group: "Vue d’ensemble", items: [{ id: "overview", label: "Statistiques" }, { id: "tx_stats", label: "Statistiques transactions" }, { id: "finance", label: "Finance" }, { id: "treasury", label: "Trésorerie" }] },
  { group: "Traitement quotidien", items: [{ id: "kyc", label: "File KYC" }, { id: "transactions", label: "Transactions" }, { id: "direct_ops", label: "Opérations directes" }, { id: "withdrawals", label: "Retraits en attente" }, { id: "simulator", label: "Simulateur de retrait" }] },
  { group: "Marchands & support", items: [{ id: "merchants", label: "Comptes marchands" }, { id: "subs", label: "Abonnements" }, { id: "clients", label: "Clients" }, { id: "interwallet", label: "Transferts interwallet" }, { id: "support", label: "Support" }] },
];

const CSS = `
.adm{--bg:#f5f5f7;--card:rgba(255,255,255,.86);--ink:#1d1d1f;--ink2:#6e6e73;--ink3:#8e8e93;--line:rgba(60,60,67,.12);--brand:#e8472a;--brand-soft:rgba(232,71,42,.10);--shadow:0 1px 2px rgba(0,0,0,.04),0 8px 28px -12px rgba(0,0,0,.10);min-height:100vh;display:grid;grid-template-columns:248px minmax(0,1fr);background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;color-scheme:light;letter-spacing:-.011em}
.adm *{box-sizing:border-box}
.adm-side{position:sticky;top:0;height:100vh;overflow-y:auto;background:rgba(255,255,255,.72);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-right:1px solid var(--line);padding:22px 14px;display:flex;flex-direction:column;gap:22px}
.adm-brand{display:flex;align-items:center;gap:10px;padding:0 8px;font-size:17px;font-weight:600;letter-spacing:-.02em;color:var(--ink)}
.adm-brand small{font-size:11px;font-weight:600;color:var(--brand);margin-left:2px;text-transform:uppercase;letter-spacing:.06em}
.adm-logo{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:var(--brand);color:#fff;font-weight:700;font-size:14px}
.adm-cap{margin:0 0 6px;padding:0 10px;color:var(--ink3);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
.adm-nav{width:100%;display:flex;align-items:center;justify-content:space-between;min-height:36px;padding:0 10px;border:0;border-radius:10px;background:transparent;color:var(--ink);font:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:background .2s ease,color .2s ease}
.adm-nav:hover{background:rgba(0,0,0,.045)}
.adm-nav.on{background:var(--brand-soft);color:var(--brand);font-weight:600}
.adm-nav em{font-style:normal;min-width:20px;height:18px;padding:0 6px;border-radius:99px;background:rgba(0,0,0,.06);color:var(--ink2);font-size:11px;font-weight:600;display:grid;place-items:center}
.adm-nav.on em{background:var(--brand);color:#fff}
.adm-back{margin-top:auto;padding:0 10px;color:var(--brand);font-size:13px;font-weight:500;text-decoration:none}
.adm-main{min-width:0;padding:28px 36px 64px;max-width:1280px}
.adm-top{display:flex;align-items:center;gap:10px;margin-bottom:30px}
.adm-search{flex:1;min-width:0;height:38px;border:0;border-radius:10px;background:rgba(118,118,128,.12);padding:0 14px;font:inherit;font-size:14px;color:var(--ink);outline:0;transition:box-shadow .2s ease,background .2s ease}
.adm-search::placeholder{color:var(--ink3)}
.adm-search:focus{background:#fff;box-shadow:0 0 0 3px rgba(232,71,42,.25)}
.adm-burger{display:none;width:38px;height:38px;flex:none;border:0;border-radius:10px;background:rgba(118,118,128,.12);place-items:center;cursor:pointer;color:var(--ink);font-size:16px}
.adm-bell{position:relative;width:38px;height:38px;flex:none;border:0;border-radius:50%;background:rgba(118,118,128,.12);display:grid;place-items:center;color:var(--ink)}
.adm-bell i{position:absolute;top:-3px;right:-3px;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:var(--brand);color:#fff;font-size:11px;font-weight:700;font-style:normal;display:grid;place-items:center;box-shadow:0 0 0 2px var(--bg)}
.adm-me{display:flex;align-items:center;gap:8px;height:38px;padding:0 14px 0 4px;border-radius:999px;background:rgba(118,118,128,.12);font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap}
.adm-me b{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:var(--brand);color:#fff;font-size:12px;font-weight:600}
.adm h1{margin:0;font-size:30px;font-weight:700;letter-spacing:-.03em}
.adm-sub{margin:6px 0 24px;color:var(--ink2);font-size:15px;line-height:1.45}
.adm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.adm-kpi{display:grid;gap:8px;padding:20px;border-radius:18px;background:var(--card);border:1px solid var(--line);box-shadow:var(--shadow);animation:adm-rise .5s ease both}
.adm-kpi span{font-size:13px;font-weight:500;color:var(--ink2)}
.adm-kpi strong{font-size:28px;font-weight:600;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.adm-kpi small{color:var(--ink3);font-size:12px;line-height:1.4}
.adm-kpi.violet,.adm-kpi.mint,.adm-kpi.amber,.adm-kpi.rose{background:var(--card)}
.adm-panel{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px 24px;box-shadow:var(--shadow);margin-bottom:16px}
.adm-panel h2{margin:0 0 4px;font-size:17px;font-weight:600;letter-spacing:-.02em}
.adm-panel > p{margin:0 0 16px;color:var(--ink2);font-size:13px}
.adm-cur{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.adm-cur div{padding:14px 16px;border-radius:14px;background:rgba(118,118,128,.07);display:grid;gap:4px}
.adm-cur span{color:var(--ink2);font-size:12px;font-weight:500}
.adm-cur strong{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
.adm-table-wrap{overflow-x:auto;margin:0 -8px}
.adm-table{width:100%;border-collapse:collapse;font-size:14px}
.adm-table th,.adm-table td{padding:12px 10px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}
.adm-table th{color:var(--ink3);font-size:12px;font-weight:600;letter-spacing:.01em}
.adm-table td{color:var(--ink)}
.adm-table tbody tr{transition:background .2s ease}
.adm-table tbody tr:hover{background:rgba(0,0,0,.025)}
.adm-table tbody tr[aria-selected="true"]{background:var(--brand-soft)}
.adm-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px 22px;margin-bottom:14px;box-shadow:var(--shadow);display:grid;gap:12px;animation:adm-rise .45s ease both}
.adm-card h2{margin:0;font-size:16px;font-weight:600;letter-spacing:-.02em}
.adm-meta{color:var(--ink2);font-size:13px;word-break:break-all}
.adm-list{display:grid;gap:5px;font-size:14px;color:var(--ink2)}
.adm-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.adm-btn{min-height:34px;padding:0 16px;border:0;border-radius:999px;background:var(--brand);color:#fff;font:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .2s ease,transform .15s ease,background .2s ease}
.adm-btn:hover{opacity:.9}
.adm-btn:active{transform:scale(.97)}
.adm-btn.g{background:rgba(118,118,128,.13);color:var(--ink)}
.adm-btn.g:hover{background:rgba(118,118,128,.2)}
.adm-btn:disabled{opacity:.4;cursor:default;transform:none}
.adm-in{min-height:40px;width:100%;padding:0 12px;border:0;border-radius:10px;background:rgba(118,118,128,.10);font:inherit;font-size:14px;color:var(--ink);outline:0;transition:box-shadow .2s ease,background .2s ease}
.adm-in:focus{background:#fff;box-shadow:0 0 0 3px rgba(232,71,42,.25)}
.adm-lbl{font-size:13px;font-weight:500;color:var(--ink2)}
.adm-note{margin-bottom:16px;padding:12px 16px;border-radius:12px;background:rgba(52,199,89,.12);color:#1d6b33;font-size:14px;font-weight:500;animation:adm-rise .3s ease both}
.adm-empty{color:var(--ink3);font-size:14px}
.adm-err{margin-bottom:14px;padding:12px 16px;border-radius:12px;background:rgba(255,59,48,.10);color:#c7281d;font-weight:500}
.adm-scrim{position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:80}
@keyframes adm-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.adm *{animation:none!important;transition:none!important}}
@media(max-width:860px){
  .adm{grid-template-columns:1fr}
  .adm-side{position:fixed;top:0;left:0;bottom:0;width:272px;max-width:86vw;z-index:90;height:100vh;transform:translateX(-102%);transition:transform .3s cubic-bezier(.2,.8,.2,1);box-shadow:12px 0 40px rgba(0,0,0,.12);padding:20px 14px}
  .adm-side.open{transform:translateX(0)}
  .adm-burger{display:grid!important}
  .adm-nav{min-height:42px}
  .adm-main{padding:14px 14px 40px}
  .adm-top{flex-wrap:nowrap;gap:8px}
  .adm-me{display:none}
}
`


function Simulator() {
  const [amount, setAmount] = useState("");
  const [percent, setPercent] = useState("5");
  const value = Number(amount);
  const fee = value > 0 ? (value * Number(percent)) / 100 : 0;
  return (
    <section>
      <h1>Simulateur de retrait</h1>
      <p className="adm-sub">Calcule le montant versé après frais de retrait.</p>
      <div className="adm-panel" style={{ display: "grid", gap: 10 }}>
        <input className="adm-in" inputMode="decimal" placeholder="Montant demandé" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="adm-in" inputMode="decimal" placeholder="Frais de retrait (%)" value={percent} onChange={(e) => setPercent(e.target.value)} />
        {value > 0 && (
          <div className="adm-list">
            <span>Frais : <strong>{fmt(fee)}</strong></span>
            <span>Montant versé : <strong>{fmt(value - fee)}</strong></span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AdminPage() {
  const [step, setStep] = useState<Step>("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [credit, setCredit] = useState({ currency: "CDF", amount: "", reason: "" });
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [bellOpen, setBellOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [query, setQuery] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [convRate, setConvRate] = useState<Record<string, string>>({});
  const [rateForm, setRateForm] = useState({ from: "CDF", to: "USD", rate: "" });
  const [minForm, setMinForm] = useState({ currency: "XAF", minimum: "" });
  const [marginForm, setMarginForm] = useState("");
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
    kyc: data?.identities?.length,
    direct_ops: data?.conversions.length,
    support: data?.tickets?.length,
  };

  // Totaux par devise, tous marchands confondus.
  const byCurrency = Object.entries(
    (data?.overview?.merchants ?? []).reduce<Record<string, number>>((acc, m) => {
      for (const [c, v] of Object.entries(m.volume as Record<string, number>)) acc[c] = (acc[c] ?? 0) + Number(v);
      return acc;
    }, {})
  ).sort((a, b) => Number(b[1]) - Number(a[1])) as [string, number][];

  const merchants = (data?.overview?.merchants ?? []).filter((m) =>
    (m.email || m.owner_id).toLowerCase().includes(query.trim().toLowerCase())
  );

  const feesPending = (data?.withdrawals ?? []).reduce<number>((sum, w) => sum + Number(w.fee_amount ?? 0), 0);
  const pendingTotal = (data?.withdrawals.length ?? 0) + (data?.identities?.length ?? 0) + (data?.conversions.length ?? 0);

  if (!data && !error) return <BrandLoader fullscreen />;

  return (
    <main className="adm">
      <style>{CSS}</style>

      {navOpen && <div className="adm-scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`adm-side${navOpen ? " open" : ""}`}>
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="adm-cap">{g.group}</p>
            {g.items.map((it) => (
              <button key={it.id} className={`adm-nav${step === it.id ? " on" : ""}`} aria-current={step === it.id ? "page" : undefined} onClick={() => { setStep(it.id); setNotice(""); setNavOpen(false); }}>
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
          <button className="adm-burger" aria-label="Ouvrir le menu" onClick={() => setNavOpen(true)}>☰</button>
          <input className="adm-search" placeholder="Rechercher un marchand, un utilisateur…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Rechercher un marchand" />
          <div style={{ position: "relative" }}>
            <button type="button" className="adm-bell" aria-label="Notifications" aria-expanded={bellOpen} onClick={() => setBellOpen((v) => !v)} style={{ cursor: "pointer" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              {pendingTotal > 0 && <i>{pendingTotal > 9 ? "9+" : pendingTotal}</i>}
            </button>
            {bellOpen && (
              <div role="dialog" aria-label="Éléments en attente" style={{ position: "absolute", right: 0, top: "115%", width: 280, background: "#fff", borderRadius: 18, boxShadow: "0 24px 60px rgba(30,20,70,.18)", padding: 10, zIndex: 80 }}>
                {[
                  { label: "Demandes de support ouvertes", count: (data?.tickets ?? []).length, go: "support" as Step },
                  { label: "Retraits en attente", count: (data?.withdrawals ?? []).filter((w) => w.status === "pending" || w.status === "scheduled").length, go: "withdrawals" as Step },
                  { label: "Conversions en attente", count: (data?.conversions ?? []).filter((c) => c.status === "pending").length, go: "conversions" as Step },
                  { label: "Identités à vérifier", count: (data?.identities ?? []).filter((i) => i.status === "pending").length, go: "kyc" as Step },
                ].map((row) => (
                  <button key={row.go} type="button" onClick={() => { setStep(row.go); setBellOpen(false); setNotice(""); }} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 12px", border: 0, borderRadius: 12, background: "transparent", cursor: "pointer", font: "inherit", color: "#14142b", textAlign: "left" }}>
                    <span style={{ fontSize: 14 }}>{row.label}</span>
                    <strong style={{ color: row.count > 0 ? "#e8472a" : "#9a97b0" }}>{row.count}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="adm-me"><b>A</b>Administrateur</div>
        </header>

        {error && <p className="adm-err">{error}</p>}
        {notice && <div className="adm-note" role="status">{notice}</div>}

        {step === "overview" && (
          <section>
            <h1>Statistiques plateforme</h1>
            <p className="adm-sub">Vue d’ensemble de tous les marchands. Données mises à jour à l’ouverture de la page.</p>

            <div className="adm-kpis">
              <div className="adm-kpi violet"><span>Marchands actifs</span><strong>{data?.overview?.merchants.length ?? "—"}</strong></div>
              <div className="adm-kpi mint"><span>Transactions réussies</span><strong>{data?.overview?.transactions.successful ?? "—"}</strong><small>sur {data?.overview?.transactions.total ?? "—"} au total</small></div>
              <div className="adm-kpi amber"><span>Identités en attente</span><strong>{data?.identities?.length ?? "—"}</strong></div>
              <div className="adm-kpi violet"><span>Bénéfice plateforme</span><strong>{Object.keys(data?.profit ?? {}).length ? Object.entries(data?.profit ?? {}).map(([c, v]) => `${fmt(Number(v))} ${c}`).join(" · ") : "—"}</strong><small>frais d’encaissement, retraits et conversions</small></div>
              <div className="adm-kpi rose"><span>Retraits en attente</span><strong>{data?.overview?.withdrawals.pending ?? "—"}</strong><small>frais à percevoir : {fmt(feesPending)}</small></div>
            </div>

            <div className="adm-panel">
              <h2>Volume par devise</h2>
              <p>Montants encaissés, tous marchands confondus.</p>
              <div className="adm-cur">
                {byCurrency.length === 0 && <span className="adm-empty">Aucune transaction pour le moment.</span>}
                {byCurrency.map(([c, v]) => <div key={c}><span>{c}</span><strong>{fmt(Number(v))}</strong></div>)}
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
                      <tr key={m.owner_id} onClick={() => setSelected(m)} style={{ cursor: "pointer" }}>
                        <td>{m.email || m.owner_id.slice(0, 8)}</td>
                        <td><strong>{Object.entries(m.volume as Record<string, number>).map(([c, v]) => `${fmt(Number(v))} ${c}`).join(" · ") || "0"}</strong></td>
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
                <div className="adm-row" style={{ justifyContent: "space-between" }}>
                  <h2 style={{ margin: 0 }}>{fmt(w.payout_amount)} {w.currency_code} à verser</h2>
                  <span className="adm-meta" style={{ fontWeight: 600, color: w.status === "failed" ? "#c7281d" : w.status === "processing" ? "#1d6b33" : "#6e6e73" }}>
                    {({ pending: "Demande", scheduled: "Envoi automatique prévu", sending: "Envoi automatique en cours", processing: "Envoyé", failed: "Échec automatique : à payer manuellement" } as Record<string, string>)[w.status] ?? w.status}
                  </span>
                </div>
                {w.last_error && <div className="adm-list" style={{ color: "#c7281d" }}><span>{w.last_error}</span></div>}
                <div className="adm-list"><span>Demandé : {fmt(w.requested_amount)} {w.currency_code} · frais : {fmt(w.fee_amount)}</span><span>{dateFmt(w.created_at)}</span></div>
                <div className="adm-list">
                  <span>Bénéficiaire : <strong>{w.destination_name ?? "non renseigné"}</strong></span>
                  <span>Téléphone : <strong>{w.destination_mobile ?? "non renseigné"}</strong></span>
                  <span>Pays : {w.destination_country ?? "—"} · Opérateur : {w.destination_operator ?? "—"}</span>
                </div>
                <div className="adm-row">
                  <button className="adm-btn" disabled={busy || w.status === "sending"} onClick={() => act({ action: "mark_withdrawal_paid", id: w.id }, "Retrait payé : solde débité et marchand notifié.")}>Marquer payé (débiter le solde)</button>
                  {(w.status === "pending" || w.status === "scheduled" || w.status === "failed") && (
                    <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "reject_withdrawal", id: w.id }, "Retrait rejeté.")}>Rejeter</button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {(step === "conversions" || step === "direct_ops") && (
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

        {(step === "ids" || step === "kyc") && (
          <section>
            <h1>Identités</h1>
            <p className="adm-sub">Vérifie la pièce et le selfie, puis approuve ou rejette.</p>
            {data && (data.identities ?? []).length === 0 && <p className="adm-empty">Aucune demande en attente.</p>}
            {(data?.identities ?? []).map((i) => (
              <div className="adm-card" key={i.id}>
                <h2>{i.full_name}</h2>
                <span className="adm-meta">{i.country_code} · {i.document_type} · n° {i.document_number}</span>
                {i.document_url && <img src={i.document_url} alt="Pièce d’identité" style={{ width: "100%", borderRadius: 16 }} />}
                {i.selfie_url && <img src={i.selfie_url} alt="Selfie avec la pièce" style={{ width: "100%", borderRadius: 16 }} />}
                <input className="adm-in" placeholder="Motif du rejet (si rejet)" value={reasons[i.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [i.id]: e.target.value })} />
                <div className="adm-row">
                  <button className="adm-btn" disabled={busy} onClick={() => act({ action: "review_identity", id: i.id, approve: true }, "Identité approuvée. Le compte est vérifié.")}>Approuver</button>
                  <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "review_identity", id: i.id, approve: false, reason: reasons[i.id] }, "Demande rejetée.")}>Rejeter</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {(step === "rates" || step === "finance") && (
          <section>
            <h1>Taux et minimums</h1>
            <p className="adm-sub">Modifie les taux de change et les minimums de retrait.</p>
            <div style={{ marginBottom: 18 }}><PaymentProviderSwitch /></div>
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
              <h2>Marge FlashPay</h2>
              <p>Points ajoutés au taux du réseau. Actuel : {data?.margin_points ?? "—"} point(s). Le client paie le taux réseau plus cette marge.</p>
              <div style={{ display: "grid", gap: 10 }}>
                <input className="adm-in" inputMode="decimal" placeholder="Nouvelle marge (ex. 5)" value={marginForm} onChange={(e) => setMarginForm(e.target.value)} />
                <button className="adm-btn" disabled={busy || marginForm === ""} onClick={() => act({ action: "set_margin", points: Number(marginForm) }, "Marge enregistrée.")}>Enregistrer la marge</button>
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

        {step === "tx_stats" && (
          <section>
            <h1>Statistiques transactions</h1>
            <p className="adm-sub">Nombre de transactions par statut, tous marchands confondus.</p>
            <div className="adm-kpis">
              <div className="adm-kpi violet"><span>Total</span><strong>{data?.overview?.transactions.total ?? "—"}</strong></div>
              <div className="adm-kpi mint"><span>Réussies</span><strong>{data?.overview?.transactions.successful ?? "—"}</strong></div>
              <div className="adm-kpi amber"><span>En attente</span><strong>{data?.overview?.transactions.pending ?? "—"}</strong></div>
              <div className="adm-kpi rose"><span>Échouées</span><strong>{data?.overview?.transactions.failed ?? "—"}</strong></div>
            </div>
          </section>
        )}

        {step === "treasury" && (
          <section>
            <h1>Trésorerie</h1>
            <p className="adm-sub">Bénéfice plateforme par devise : frais d’encaissement, frais de retrait et marge de conversion.</p>
            <div className="adm-panel">
              <h2>Bénéfice plateforme</h2>
              <div className="adm-cur">
                {Object.keys(data?.profit ?? {}).length === 0 && <span className="adm-empty">Aucun bénéfice enregistré pour le moment.</span>}
                {Object.entries(data?.profit ?? {}).map(([c, v]) => <div key={c}><span>{c}</span><strong>{fmt(Number(v))}</strong></div>)}
              </div>
            </div>
            <p className="adm-sub">Montants encaissés par devise, tous marchands confondus.</p>
            <div className="adm-panel">
              <div className="adm-cur">
                {byCurrency.length === 0 && <span className="adm-empty">Aucune transaction pour le moment.</span>}
                {byCurrency.map(([c, v]) => <div key={c}><span>{c}</span><strong>{fmt(Number(v))}</strong></div>)}
              </div>
            </div>
          </section>
        )}

        {step === "finance" && null}

        {step === "simulator" && <Simulator />}

        {step === "transactions" && (
          <section>
            <h1>Transactions</h1>
            <p className="adm-sub">Références des 200 dernières transactions. Recherche par référence ou par e-mail.</p>
            <div className="adm-panel">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Référence</th><th>Marchand</th><th>Montant</th><th>Frais</th><th>Statut</th><th>Pays</th><th>Date</th></tr></thead>
                  <tbody>
                    {(data?.references ?? []).filter((r) => (r.transaction_id + r.email).toLowerCase().includes(query.trim().toLowerCase())).map((r) => (
                      <tr key={r.transaction_id}>
                        <td><strong>{r.transaction_id}</strong></td>
                        <td>{r.email || r.owner_id.slice(0, 8)}</td>
                        <td>{fmt(Number(r.amount))} {r.currency_code}</td>
                        <td>{r.processing_fee != null ? fmt(Number(r.processing_fee)) : "—"}</td>
                        <td>{r.status}</td>
                        <td>{r.country_code}</td>
                        <td>{dateFmt(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data?.references ?? []).length === 0 && <p className="adm-empty" style={{ padding: 12 }}>Aucune transaction pour le moment.</p>}
              </div>
            </div>
          </section>
        )}

        {step === "merchants" && (
          <section>
            <h1>{step === "merchants" ? "Comptes marchands" : "Transactions"}</h1>
            <p className="adm-sub">Activité de chaque marchand : montants, réussies, en attente, échouées.</p>
            <div className="adm-panel">
                {selected ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                      <strong style={{ fontSize: 16 }}>{selected.email || selected.owner_id}</strong>
                      <button className="adm-btn g" onClick={() => setSelected(null)}>Fermer</button>
                    </div>
                    <div className="adm-list">
                      <span>Réussies : {selected.successful_count} · En attente : {selected.pending_count} · Échouées : {selected.failed_count}</span>
                      <span>Volume : {Object.entries(selected.volume as Record<string, number>).map(([c, v]) => `${fmt(Number(v))} ${c}`).join(" · ") || "0"}</span>
                    </div>
                    <div className="adm-row">
                      <button className="adm-btn" disabled={busy} onClick={() => act({ action: "set_account_status", owner_id: selected.owner_id, status: "suspended" }, "Compte suspendu : paiements et retraits bloqués.")}>Suspendre</button>
                      <button className="adm-btn" disabled={busy} onClick={() => act({ action: "set_account_status", owner_id: selected.owner_id, status: "banned", days: 30 }, "Compte bloqué pour 30 jours : retraits bloqués.")}>Bannir 30 jours</button>
                      <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "set_account_status", owner_id: selected.owner_id, status: "active" }, "Compte réactivé.")}>Réactiver</button>
                    </div>
                    <div style={{ display: "grid", gap: 8, borderTop: "1px solid #f1eff7", paddingTop: 12 }}>
                      <strong>Ajustement manuel du solde</strong>
                      <input className="adm-in" placeholder="Devise (ex. CDF)" value={credit.currency} onChange={(e) => setCredit({ ...credit, currency: e.target.value.toUpperCase() })} />
                      <input className="adm-in" inputMode="decimal" placeholder="Montant" value={credit.amount} onChange={(e) => setCredit({ ...credit, amount: e.target.value })} />
                      <input className="adm-in" placeholder="Motif (obligatoire)" value={credit.reason} onChange={(e) => setCredit({ ...credit, reason: e.target.value })} />
                      <div className="adm-row">
                        <button className="adm-btn" disabled={busy || !credit.amount || !credit.reason} onClick={() => act({ action: "credit_wallet", owner_id: selected.owner_id, currency: credit.currency, amount: Number(credit.amount), reason: credit.reason }, "Montant crédité.")}>Créditer</button>
                        <button className="adm-btn g" disabled={busy || !credit.amount || !credit.reason} onClick={() => act({ action: "debit_wallet", owner_id: selected.owner_id, currency: credit.currency, amount: Number(credit.amount), reason: credit.reason }, "Montant débité.")}>Débiter</button>
                      </div>
                    </div>
                  </div>
                ) : <p className="adm-empty" style={{ margin: 0 }}>Clique sur un marchand pour voir sa fiche et ses actions.</p>}
              </div>
              <div className="adm-panel">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Marchand</th><th>Montant encaissé</th><th>Réussies</th><th>En attente</th><th>Échouées</th></tr></thead>
                  <tbody>
                    {merchants.map((m) => (
                      <tr key={m.owner_id} onClick={() => setSelected(m)} style={{ cursor: "pointer" }}>
                        <td>{m.email || m.owner_id.slice(0, 8)}</td>
                        <td><strong>{Object.entries(m.volume as Record<string, number>).map(([c, v]) => `${fmt(Number(v))} ${c}`).join(" · ") || "0"}</strong></td>
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


        {step === "clients" && (
          <section>
            <h1>Clients</h1>
            <p className="adm-sub">Tous les comptes inscrits, avec leur pays et leur statut de vérification. Touche une ligne pour voir la fiche.</p>
            {selectedClient && (
              <div className="adm-card" style={{ marginBottom: 16 }}>
                <div className="adm-row" style={{ justifyContent: "space-between" }}>
                  <h2 style={{ margin: 0 }}>{selectedClient.full_name || "Client sans nom"}</h2>
                  <button className="adm-btn g" onClick={() => setSelectedClient(null)}>Fermer</button>
                </div>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {[
                    ["E-mail", selectedClient.email || "—"],
                    ["Pays", selectedClient.country_code ?? "—"],
                    ["Vérification", selectedClient.verification_status],
                    ["Inscrit le", dateFmt(selectedClient.created_at)],
                    ["Identifiant", selectedClient.id],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #f1eff7", paddingBottom: 10, fontSize: 14 }}>
                      <span style={{ color: "#8a8aa3" }}>{k}</span>
                      <b style={{ color: "#14142b", textAlign: "right", overflowWrap: "anywhere" }}>{v}</b>
                    </div>
                  ))}
                </div>
                <div className="adm-row" style={{ marginTop: 14 }}>
                  <button className="adm-btn" onClick={() => { setQuery(selectedClient.email); setStep("merchants"); setSelectedClient(null); }}>Voir son activité marchand</button>
                </div>
              </div>
            )}
            <div className="adm-panel">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Nom</th><th>E-mail</th><th>Pays</th><th>Vérification</th><th>Inscrit le</th></tr></thead>
                  <tbody>
                    {(data?.clients ?? []).filter((c) => (c.email + c.full_name).toLowerCase().includes(query.trim().toLowerCase())).map((c) => (
                      <tr key={c.id} onClick={() => setSelectedClient(c)} style={{ cursor: "pointer" }} aria-selected={selectedClient?.id === c.id}>
                        <td>{c.full_name || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.country_code ?? "—"}</td>
                        <td>{c.verification_status}</td>
                        <td>{dateFmt(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data?.clients ?? []).length === 0 && <p className="adm-empty" style={{ padding: 12 }}>Aucun client pour le moment.</p>}
              </div>
            </div>
          </section>
        )}

        {step === "interwallet" && (
          <section>
            <h1>Transferts interwallet</h1>
            <p className="adm-sub">Conversions entre devises d’un même portefeuille : entrées et sorties.</p>
            <div className="adm-panel">
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead><tr><th>Marchand</th><th>Type</th><th>Devise</th><th>Montant</th><th>Solde après</th><th>Référence</th><th>Date</th></tr></thead>
                  <tbody>
                    {(data?.interwallet ?? []).map((m) => (
                      <tr key={m.id}>
                        <td>{m.email || m.owner_id.slice(0, 8)}</td>
                        <td>{m.kind === "conversion_in" ? "Entrée" : "Sortie"}</td>
                        <td>{m.currency_code}</td>
                        <td><strong>{fmt(Number(m.amount))}</strong></td>
                        <td>{fmt(Number(m.balance_after))}</td>
                        <td>{m.reference}</td>
                        <td>{dateFmt(m.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data?.interwallet ?? []).length === 0 && <p className="adm-empty" style={{ padding: 12 }}>Aucun transfert interwallet pour le moment.</p>}
              </div>
            </div>
          </section>
        )}

        {step === "support" && (
          <section>
            <h1>Support</h1>
            <p className="adm-sub">Demandes ouvertes des marchands. Réponds dans le fil, puis ferme la demande une fois traitée.</p>
            {(data?.tickets ?? []).length === 0 && <p className="adm-empty">Aucune demande ouverte.</p>}
            {(data?.tickets ?? []).map((t) => {
              const thread: TicketMessage[] = t.messages?.length
                ? t.messages
                : [{ id: t.id, ticket_id: t.id, author: "merchant", body: t.message, created_at: t.created_at }];
              const last = thread[thread.length - 1];
              const awaitingTeam = last.author === "merchant";
              return (
                <div className="adm-card" key={t.id}>
                  <div className="adm-row" style={{ justifyContent: "space-between" }}>
                    <h2 style={{ margin: 0 }}>{t.subject}</h2>
                    <span className="adm-meta" style={{ fontWeight: 700, color: awaitingTeam ? "#c8321a" : "#0f7a47" }}>
                      {awaitingTeam ? "À répondre" : "Réponse envoyée"}
                    </span>
                  </div>
                  <span className="adm-meta">{t.email || t.owner_id.slice(0, 8)} · {dateFmt(t.created_at)}</span>

                  <div style={{ display: "grid", gap: 8, margin: "12px 0" }}>
                    {thread.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          justifySelf: m.author === "admin" ? "end" : "start",
                          maxWidth: "82%",
                          background: m.author === "admin" ? "#5b3fd6" : "#f4f2fb",
                          color: m.author === "admin" ? "#fff" : "#2a2940",
                          borderRadius: 16,
                          padding: "10px 14px",
                          fontSize: 14,
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <div>{m.body}</div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{m.author === "admin" ? "FlashPay" : "Marchand"} · {dateFmt(m.created_at)}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {QUICK_REPLIES.map((q) => (
                      <button key={q} type="button" className="adm-btn g" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setReplies((r) => ({ ...r, [t.id]: q }))}>
                        {q.length > 34 ? q.slice(0, 34) + "…" : q}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={replies[t.id] ?? ""}
                    onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                    placeholder="Écris ta réponse au marchand…"
                    rows={3}
                    maxLength={2000}
                    style={{ width: "100%", boxSizing: "border-box", borderRadius: 14, border: "1px solid #e4e1ef", padding: 12, font: "inherit", resize: "vertical" }}
                  />

                  <div className="adm-row">
                    <button
                      className="adm-btn"
                      disabled={busy || !(replies[t.id] ?? "").trim()}
                      onClick={async () => {
                        const text = (replies[t.id] ?? "").trim();
                        await act({ action: "reply_ticket", id: t.id, body: text }, "Réponse envoyée au marchand.");
                        setReplies((r) => ({ ...r, [t.id]: "" }));
                      }}
                    >
                      {busy ? "Envoi en cours…" : "Envoyer la réponse"}
                    </button>
                    <button className="adm-btn g" disabled={busy} onClick={() => act({ action: "close_ticket", id: t.id }, "Demande fermée.")}>Marquer traitée</button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
