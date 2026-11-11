"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDownToLine, Plus, Smartphone, Trash2, Wallet } from "lucide-react";

type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };
type WalletItem = { currency_code: string; balance: number };
type Minimum = { currency_code: string; minimum_amount: number };
type Method = { id: string; country_code: string; country_name: string; currency_code: string; operator: string; mobile: string; beneficiary_name: string; is_default: boolean };

const DESTINATIONS: Record<string, { name: string; currency: string; operators: string[] }> = {
  CD: { name: "République démocratique du Congo", currency: "CDF", operators: ["Airtel Money", "Orange Money", "M-Pesa", "Africell Money"] },
  CM: { name: "Cameroun", currency: "XAF", operators: ["MTN MoMo", "Orange Money"] },
  CG: { name: "Congo-Brazzaville", currency: "XAF", operators: ["MTN MoMo", "Airtel Money"] },
  SN: { name: "Sénégal", currency: "XOF", operators: ["Orange Money", "Wave"] },
  CI: { name: "Côte d’Ivoire", currency: "XOF", operators: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"] },
  BF: { name: "Burkina Faso", currency: "XOF", operators: ["Orange Money", "Moov Money"] },
  BJ: { name: "Bénin", currency: "XOF", operators: ["MTN MoMo", "Moov Money"] },
  TG: { name: "Togo", currency: "XOF", operators: ["Moov Money"] },
  ML: { name: "Mali", currency: "XOF", operators: ["Orange Money", "Moov Money"] },
  RW: { name: "Rwanda", currency: "RWF", operators: ["MTN MoMo", "Airtel Money"] },
  KE: { name: "Kenya", currency: "KES", operators: ["M-Pesa", "Airtel Money"] },
  GH: { name: "Ghana", currency: "GHS", operators: ["MTN MoMo", "Vodafone Cash"] },
  NG: { name: "Nigeria", currency: "NGN", operators: ["Virement bancaire"] },
};
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) => new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function WithdrawalsView({ appId }: { appId: string; onNew?: () => void }) {
  const [tab, setTab] = useState<"list" | "methods">("list");
  const [items, setItems] = useState<Movement[]>([]);
  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [minimums, setMinimums] = useState<Minimum[]>([]);
  const [feePercent, setFeePercent] = useState(5);
  const [methods, setMethods] = useState<Method[]>([]);
  const [currency, setCurrency] = useState("");
  const [methodId, setMethodId] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("CD");
  const [operator, setOperator] = useState("");
  const [mobile, setMobile] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [refresh, setRefresh] = useState(0);

  async function load() {
    const [walletResponse, methodResponse] = await Promise.all([
      fetch(`/api/wallet?app=${encodeURIComponent(appId)}`, { cache: "no-store" }),
      fetch("/api/withdrawal-methods", { cache: "no-store" }),
    ]);
    const walletData = await walletResponse.json();
    const methodData = await methodResponse.json();
    if (!walletResponse.ok) throw new Error(walletData.message ?? "Impossible de charger les portefeuilles.");
    if (!methodResponse.ok) throw new Error(methodData.message ?? "Impossible de charger les méthodes de retrait.");
    setItems((walletData.movements ?? []).filter((m: Movement) => m.kind === "withdrawal"));
    setWallets(walletData.wallets ?? []);
    setMinimums(walletData.minimums ?? []);
    setFeePercent(Number(walletData.fee?.withdrawal ?? 5));
    setMethods(methodData.methods ?? []);
    const first = (methodData.methods ?? []).find((m: Method) => m.is_default) ?? (methodData.methods ?? [])[0];
    if (first) setMethodId((old) => old || first.id);
    setError("");
  }
  useEffect(() => { load().catch((e) => setError(e instanceof Error ? e.message : "Erreur de chargement.")); }, [appId, refresh]);

  const selectedMethod = methods.find((m) => m.id === methodId);
  const balance = wallets.find((w) => w.currency_code === currency)?.balance ?? 0;
  const minimum = minimums.find((m) => m.currency_code === currency)?.minimum_amount ?? 0;
  const amountNumber = Number(amount);
  const fee = Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber * feePercent / 100 : 0;
  const net = Math.max(0, amountNumber - fee);
  const filtered = useMemo(() => items.filter((m) => !query || `${m.currency_code} ${m.created_at} ${m.amount}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  const countryConfig = DESTINATIONS[country];

  async function saveMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/withdrawal-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country_code: country, operator, mobile, beneficiary_name: beneficiary, is_default: methods.length === 0 }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible d’enregistrer cette méthode.");
      setNotice({ ok: true, text: "Méthode de retrait enregistrée." }); setMobile(""); setBeneficiary(""); setOperator(""); setRefresh((n) => n + 1);
    } catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Erreur." }); }
    finally { setBusy(false); }
  }
  async function deleteMethod(id: string) {
    if (!window.confirm("Supprimer cette méthode de retrait ?")) return;
    setBusy(true);
    try { const r = await fetch(`/api/withdrawal-methods?id=${encodeURIComponent(id)}`, { method: "DELETE" }); const j = await r.json(); if (!r.ok) throw new Error(j.message ?? "Suppression impossible."); setMethodId(""); setRefresh((n) => n + 1); }
    catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Erreur." }); }
    finally { setBusy(false); }
  }
  async function requestWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    if (!selectedMethod) { setNotice({ ok: false, text: "Enregistre d’abord une méthode de retrait." }); setBusy(false); return; }
    try {
      const r = await fetch("/api/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "schedule", currency_code: currency, amount: amountNumber, destination: { country_code: selectedMethod.country_code, operator: selectedMethod.operator, mobile: selectedMethod.mobile, name: selectedMethod.beneficiary_name } }) });
      const j = await r.json(); if (!r.ok || j.ok === false) throw new Error(j.message ?? "Demande refusée.");
      setNotice({ ok: true, text: j.message ?? "Demande de retrait enregistrée." }); setAmount(""); setRefresh((n) => n + 1);
    } catch (e) { setNotice({ ok: false, text: e instanceof Error ? e.message : "Demande refusée." }); }
    finally { setBusy(false); }
  }

  return <section className="wd-wrap">
    <style>{`.wd-wrap{display:grid;gap:18px}.wd-tabs{display:flex;gap:10px;flex-wrap:wrap}.wd-tab{min-height:46px;padding:0 18px;border:1px solid #ececf4;border-radius:14px;background:#fff;color:#55566a;font:inherit;font-weight:750}.wd-tab.on{background:#e8401f;color:#fff;border-color:#e8401f;box-shadow:0 8px 20px #e8401f30}.wd-panel{padding:20px;border:1px solid #ececf4;border-radius:22px;background:#fff;box-shadow:0 10px 28px #17211b0a;display:grid;gap:16px}.wd-panel h2{margin:0;font-size:18px}.wd-muted{margin:0;color:#747587;line-height:1.5}.wd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.wd-field{display:grid;gap:7px;color:#55566a;font-size:13px;font-weight:750}.wd-field input,.wd-field select,.wd-search{width:100%;min-height:48px;padding:0 13px;border:1px solid #e8e7ef;border-radius:13px;background:#faf9fd;color:#171722;font:inherit;font-weight:500}.wd-field input:focus,.wd-field select:focus,.wd-search:focus{outline:3px solid #e8401f20;border-color:#e8401f}.wd-full{grid-column:1/-1}.wd-summary{display:grid;gap:8px;padding:15px;border-radius:16px;background:#fff7f3;color:#6d5c57}.wd-summary div{display:flex;justify-content:space-between;gap:12px}.wd-summary strong{color:#191923}.wd-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.wd-btn{min-height:48px;padding:0 18px;border:0;border-radius:14px;background:#e8401f;color:white;font:inherit;font-weight:800}.wd-btn:disabled{opacity:.55}.wd-method{display:flex;align-items:center;gap:13px;padding:15px;border:1px solid #ececf4;border-radius:16px}.wd-method-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;background:#fff0eb;color:#e8401f;flex:none}.wd-method-copy{display:grid;gap:3px;flex:1;min-width:0}.wd-method-copy small{color:#747587;overflow-wrap:anywhere}.wd-method button{border:0;background:#fff0eb;color:#c8321a;border-radius:10px;padding:9px}.wd-radio{display:flex;align-items:center;gap:10px;padding:13px;border:1px solid #ececf4;border-radius:14px}.wd-radio:has(input:checked){border-color:#e8401f;background:#fff8f5}.wd-notice{padding:12px 14px;border-radius:13px;background:#eaf8ef;color:#167444}.wd-notice.err{background:#fff0ed;color:#b83220}.wd-row{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-top:1px solid #f0eff4}.wd-row div{display:grid;gap:4px}.wd-row small{color:#747587}@media(max-width:600px){.wd-grid{grid-template-columns:1fr}.wd-panel{padding:16px}.wd-actions .wd-btn{width:100%}}`}</style>
    <div className="wd-tabs" role="tablist"><button className={`wd-tab${tab === "list" ? " on" : ""}`} onClick={() => setTab("list")} role="tab" aria-selected={tab === "list"}>Retraits</button><button className={`wd-tab${tab === "methods" ? " on" : ""}`} onClick={() => setTab("methods")} role="tab" aria-selected={tab === "methods"}>Méthodes de retrait ({methods.length})</button></div>
    {error && <p className="wd-notice err" role="alert">{error}</p>}{notice && <p className={`wd-notice${notice.ok ? "" : " err"}`} role="status">{notice.text}</p>}
    {tab === "methods" ? <>
      <form className="wd-panel" onSubmit={saveMethod}><div><h2>Ajouter un compte de réception</h2><p className="wd-muted">Enregistre ton compte Mobile Money une seule fois. Tu pourras le sélectionner lors de tes prochains retraits.</p></div>
        <div className="wd-grid"><label className="wd-field">Pays<select value={country} onChange={(e) => { setCountry(e.target.value); setOperator(""); }} required>{Object.entries(DESTINATIONS).map(([code, d]) => <option key={code} value={code}>{d.name}</option>)}</select></label><label className="wd-field">Réseau / opérateur<select value={operator} onChange={(e) => setOperator(e.target.value)} required><option value="">Choisir un réseau</option>{countryConfig?.operators.map((o) => <option key={o}>{o}</option>)}</select></label><label className="wd-field">Numéro Mobile Money<input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="Ex. 812345678" required /></label><label className="wd-field">Nom du bénéficiaire<input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Nom complet" required /></label></div>
        <div className="wd-actions"><button className="wd-btn" disabled={busy || !operator}>{busy ? "Enregistrement…" : "Enregistrer cette méthode"}</button></div></form>
      <div className="wd-panel"><h2>Mes méthodes enregistrées</h2>{methods.length === 0 && <p className="wd-muted">Aucun compte enregistré pour le moment.</p>}{methods.map((m) => <div className="wd-method" key={m.id}><span className="wd-method-icon"><Smartphone size={20}/></span><div className="wd-method-copy"><strong>{m.operator}{m.is_default ? " · Par défaut" : ""}</strong><small>{m.country_name} · {m.mobile} · {m.beneficiary_name}</small></div><button type="button" aria-label="Supprimer cette méthode" disabled={busy} onClick={() => void deleteMethod(m.id)}><Trash2 size={17}/></button></div>)}</div>
    </> : <>
      <form className="wd-panel" onSubmit={requestWithdrawal}><div><h2>Effectuer un retrait</h2><p className="wd-muted">Choisis ton portefeuille et un compte de réception déjà enregistré.</p></div>
        <div className="wd-grid"><label className="wd-field">Portefeuille / devise<select value={currency} onChange={(e) => setCurrency(e.target.value)} required><option value="">Choisir un portefeuille</option>{wallets.map((w) => <option key={w.currency_code} value={w.currency_code}>{w.currency_code} · Solde {fmt(w.balance)}</option>)}</select></label><label className="wd-field">Montant à retirer<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" type="number" min="0" step="any" placeholder="0" required /></label></div>
        <div><strong>Compte de réception</strong>{methods.length === 0 ? <p className="wd-muted">Tu n’as pas encore enregistré de méthode. Ouvre l’onglet « Méthodes de retrait » pour en ajouter une.</p> : <div style={{display:"grid",gap:9,marginTop:10}}>{methods.map((m) => <label className="wd-radio" key={m.id}><input type="radio" name="withdrawal-method" value={m.id} checked={methodId === m.id} onChange={() => setMethodId(m.id)}/><span><strong>{m.operator}</strong><br/><small>{m.country_name} · {m.mobile} · {m.beneficiary_name}</small></span></label>)}</div>}</div>
        {currency && <div className="wd-summary"><div><span>Solde disponible</span><strong>{fmt(balance)} {currency}</strong></div><div><span>Minimum de retrait</span><strong>{fmt(minimum)} {currency}</strong></div><div><span>Frais estimés ({feePercent} %)</span><strong>{fmt(fee)} {currency}</strong></div><div><span>Montant net estimé</span><strong>{fmt(net)} {currency}</strong></div></div>}
        {amount && (!Number.isFinite(amountNumber) || amountNumber <= 0 || amountNumber > balance || (minimum > 0 && amountNumber < minimum)) && <p className="wd-notice err">{amountNumber > balance ? "Le montant dépasse ton solde disponible." : minimum > 0 && amountNumber < minimum ? `Le retrait minimum est de ${fmt(minimum)} ${currency}.` : "Saisis un montant valide."}</p>}
        <div className="wd-actions"><button className="wd-btn" disabled={busy || !selectedMethod || !currency || !amount || amountNumber <= 0 || amountNumber > balance || (minimum > 0 && amountNumber < minimum)}><ArrowDownToLine size={17} style={{verticalAlign:"middle",marginRight:8}}/>{busy ? "Traitement…" : "Confirmer le retrait"}</button></div>
      </form>
      <div className="wd-panel"><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}><h2>Historique des retraits</h2><input className="wd-search" style={{maxWidth:260}} type="search" placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)}/></div>{filtered.length === 0 ? <p className="wd-muted">Aucun retrait pour le moment.</p> : filtered.map((m) => <div className="wd-row" key={m.id}><div><strong>Retrait · {m.currency_code}</strong><small>{dateFmt(m.created_at)}</small></div><strong>{fmt(Math.abs(m.amount))} {m.currency_code}</strong></div>)}</div>
    </>}
  </section>;
}
