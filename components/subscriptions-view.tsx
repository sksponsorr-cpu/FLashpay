"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const plans = [
  { id: "none", name: "Sans abonnement", rate: "6 %", text: "Chaque encaissement est facturé 6 %. Aucun engagement." },
  { id: "basic", name: "Basic", rate: "1 %", text: "1 % sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %." },
  { id: "premium", name: "Premium", rate: "1 %", text: "1 % jusqu’à 500 000 FCFA encaissés par mois, puis 6 %." },
];
const operators = ["Orange Money", "MTN MoMo", "Moov Money", "Wave"];
type Country = { code: string; name: string; currency_code: string };

export default function SubscriptionsView({ plan }: { plan: string | null }) {
  const current = plan ?? "none";
  const [choice, setChoice] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    createClient().from("supported_countries").select("code,name,currency_code").order("name").then(({ data }) => {
      if (data) setCountries((data as Country[]).filter((c) => c.currency_code === "XAF" || c.currency_code === "XOF"));
    });
  }, []);

  async function pay() {
    if (!choice || !country || !operator || !mobile.trim() || !name.trim()) {
      setMessage("Choisis le pays, l’opérateur, et indique ton nom et ton numéro.");
      return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: choice, country_code: country, mobile: mobile.trim(), payment_method: operator, name: name.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Paiement impossible.");
      if (result.data?.payment_link) { window.location.href = result.data.payment_link; return; }
      setMessage("Valide le paiement sur ton téléphone avec ton code PIN. Ton abonnement s’active après confirmation.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Paiement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sub-wrap">
      <h1 className="sub-title">Abonnements</h1>
      <p className="dash-muted">Ton plan actuel : <b>{plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Sans abonnement"}</b></p>

      {plans.map((p) => (
        <article key={p.id} className={`dash-card sub-card${p.id === current ? " on" : ""}`}>
          <span className="sub-name">{p.name}</span>
          <strong className="sub-rate">{p.rate}</strong>
          <p className="dash-muted">{p.text}</p>
          {p.id === current && <span className="sub-badge">Plan actuel</span>}
          {p.id !== "none" && p.id !== current && (
            <button className="primary-button" onClick={() => { setChoice(p.id); setMessage(""); }}>Choisir {p.name}</button>
          )}
        </article>
      ))}

      {choice && (
        <div className="dash-card sub-card">
          <strong>Payer l’abonnement {choice === "basic" ? "Basic" : "Premium"}</strong>
          <label className="lbl">Pays</label>
          <select className="in" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Choisir un pays</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
          <label className="lbl">Opérateur</label>
          <select className="in" value={operator} onChange={(e) => setOperator(e.target.value)}>
            <option value="">Choisir un opérateur</option>
            {operators.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <label className="lbl">Ton nom</label>
          <input className="in" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="lbl">Ton numéro mobile</label>
          <input className="in" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          {message && <p className="dash-muted" role="status">{message}</p>}
          <button className="primary-button" disabled={busy} onClick={() => void pay()}>{busy ? "Paiement…" : "Payer l’abonnement"}</button>
        </div>
      )}

      <p className="dash-muted">Le paiement passe par notre prestataire. Ton abonnement s’active une fois le paiement confirmé.</p>
    </section>
  );
}
