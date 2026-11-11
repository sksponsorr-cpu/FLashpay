"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Montants d'abonnement (identiques à la route /api/subscribe)
const plans = [
  { id: "none", name: "Sans abonnement", price: "", rate: "6 %", text: "Chaque encaissement est facturé 6 %. Aucun engagement." },
  { id: "basic", name: "Basic", price: "10 000 FCFA / mois", rate: "1 %", text: "1 % sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %." },
  { id: "premium", name: "Premium", price: "25 000 FCFA / mois", rate: "1 %", text: "1 % jusqu’à 500 000 FCFA encaissés par mois, puis 6 %." },
];
const operators = [
  { id: "MTN MoMo", icon: "📱" },
  { id: "Orange Money", icon: "🟠" },
  { id: "Moov Money", icon: "🔵" },
  { id: "Wave", icon: "🌊" },
  { id: "Airtel Money", icon: "🔴" },
];
// Pays où Orange Money exige un code OTP
const ORANGE_OTP_COUNTRIES = ["CI", "SN", "BF"];

type Country = { code: string; name: string; currency_code: string };

export default function SubscriptionsView({ plan }: { plan: string | null }) {
  const current = plan ?? "none";
  const [choice, setChoice] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("");
  const [operator, setOperator] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [msgOk, setMsgOk] = useState(false);
  const [done, setDone] = useState(false);
  const [txId, setTxId] = useState("");

  useEffect(() => {
    createClient()
      .from("supported_countries")
      .select("code,name,currency_code")
      .order("name")
      .then(({ data }) => {
        if (data) setCountries(data as Country[]);
      });
  }, []);

  // Attente de la confirmation sur le téléphone : on interroge le serveur toutes les 4 secondes.
  useEffect(() => {
    if (!txId) return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/subscribe/status?tx=${encodeURIComponent(txId)}`, { cache: "no-store" });
        const j = await r.json();
        if (j.status === "successful") {
          clearInterval(timer);
          setTxId("");
          setMsgOk(true);
          setMessage("Paiement confirmé. Ton abonnement est actif.");
        } else if (["failed", "cancelled", "expired"].includes(j.status)) {
          clearInterval(timer);
          setTxId("");
          setDone(false);
          setMsgOk(false);
          setMessage("Le paiement n’a pas été confirmé. Tu peux réessayer.");
        }
      } catch {
        // Erreur réseau ponctuelle : on réessaie au prochain tour.
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [txId]);

  const chosen = plans.find((p) => p.id === choice);
  const countryName = countries.find((c) => c.code === country)?.name ?? "";
  const needsOtp = operator === "Orange Money" && ORANGE_OTP_COUNTRIES.includes(country);

  function open(id: string) {
    setChoice(id);
    setStep(1);
    setMessage("");
    setMsgOk(false);
    setDone(false);
    setTxId("");
  }
  function close() {
    setChoice(null);
  }

  function goNext() {
    if (step === 1 && !country) return setMessage("Choisis ton pays.");
    if (step === 2 && !operator) return setMessage("Choisis ton opérateur.");
    if (step === 3 && (!name.trim() || !mobile.trim())) return setMessage("Indique ton nom et ton numéro.");
    if (step === 3 && needsOtp && !otp.trim()) return setMessage("Saisis le code OTP de ton compte Orange Money.");
    setMessage("");
    setStep((s) => s + 1);
  }

  async function pay() {
    setBusy(true);
    setMessage("");
    setMsgOk(false);
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: choice,
          country_code: country,
          mobile: mobile.trim(),
          payment_method: operator,
          name: name.trim(),
          otp: needsOtp ? otp.trim() : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Paiement impossible.");

      setTxId(result.data.transaction_id);
      setDone(true);
      setMsgOk(true);
      setMessage("Valide le paiement sur ton téléphone avec ton code PIN. Ton abonnement s’activera après confirmation.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Paiement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sub-wrap">
      <style>{`
        .sub-wrap{display:grid;gap:14px}
        .sub-card{display:grid;gap:8px;transition:transform .25s ease,box-shadow .25s ease}
        .sub-card:hover{transform:translateY(-2px)}
        .sub-card.on{border:1px solid #ff6a3d}
        .sub-name{font-size:13px;font-weight:800;color:#e8401f;text-transform:uppercase;letter-spacing:.04em}
        .sub-price{font-size:20px;font-weight:800}
        .sub-badge{justify-self:start;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:#fff0eb;color:#c8321a}
        .ck-back{position:fixed;inset:0;background:rgba(15,15,26,.45);display:grid;place-items:end center;z-index:50;animation:ck-fade .3s ease both}
        .ck{width:100%;max-width:440px;background:#fff;border-radius:28px 28px 0 0;padding:20px 18px 26px;box-shadow:0 -20px 60px rgba(15,15,26,.25);animation:ck-up .45s cubic-bezier(.2,.8,.2,1) both;max-height:92vh;overflow:auto}
        .ck-top{display:flex;justify-content:space-between;align-items:center}
        .ck-x{width:38px;height:38px;border-radius:50%;border:0;background:#f3f2fb;font-size:18px;cursor:pointer}
        .ck-dots{display:flex;gap:6px;margin:12px 0 18px}
        .ck-dot{height:6px;flex:1;border-radius:6px;background:#ececf4;transition:background .4s ease}
        .ck-dot.on{background:#ff6a3d}
        .ck-step{animation:ck-slide .4s cubic-bezier(.2,.8,.2,1) both}
        .ck h2{font-size:22px;margin:0 0 4px;font-weight:800}
        .ck-sub{color:#6b6c80;font-size:14px;margin:0 0 14px}
        .ck-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .ck-tile{position:relative;display:grid;gap:6px;justify-items:start;padding:14px;border-radius:18px;border:1px solid #ececf4;background:#fff;cursor:pointer;text-align:left;transition:transform .2s ease,box-shadow .25s ease,border-color .25s ease}
        .ck-tile:active{transform:scale(.97)}
        .ck-tile.on{border-color:#ff6a3d;box-shadow:0 10px 24px rgba(255,106,61,.25);background:#fff8f5}
        .ck-ico{font-size:26px}
        .ck-tile strong{font-size:15px}
        .ck-tick{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:#ff6a3d;color:#fff;display:grid;place-items:center;font-size:13px;transform:scale(0);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
        .ck-tile.on .ck-tick{transform:scale(1)}
        .ck-field{position:relative;margin-top:12px}
        .ck-field input{width:100%;min-height:56px;padding:22px 14px 8px;border:1px solid #ececf4;border-radius:16px;background:#fafafe;font:inherit;transition:border-color .25s ease,box-shadow .25s ease}
        .ck-field input:focus{outline:none;border-color:#ff6a3d;box-shadow:0 0 0 4px rgba(255,106,61,.15)}
        .ck-field label{position:absolute;left:14px;top:18px;color:#6b6c80;font-size:15px;pointer-events:none;transition:all .25s ease}
        .ck-field input:focus + label,.ck-field input:not(:placeholder-shown) + label{top:7px;font-size:11px;color:#e8401f;font-weight:700}
        .ck-recap{display:grid;gap:0;border-radius:18px;background:#fafafe;padding:6px 14px;margin:6px 0 14px}
        .ck-recap div{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #ececf4;font-size:14px}
        .ck-recap div:first-child{border-top:0}
        .ck-total{font-size:20px;font-weight:800;color:#e8401f}
        .ck-btn{width:100%;min-height:54px;border:0;border-radius:18px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 14px 28px -10px rgba(232,64,31,.6);transition:transform .15s ease}
        .ck-btn:active{transform:scale(.98)}
        .ck-btn:disabled{opacity:.6}
        .ck-msg{color:#c8321a;font-size:14px;font-weight:600;margin:10px 0 0}
        .ck-ok{color:#13a05a;font-size:14px;font-weight:600;margin:10px 0 0}
        @keyframes ck-up{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
        @keyframes ck-fade{from{opacity:0}to{opacity:1}}
        @keyframes ck-slide{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
        @media (prefers-reduced-motion: reduce){.ck,.ck-back,.ck-step{animation:none}}
      `}</style>

      <p className="dash-muted">
        Ton plan actuel : <b>{plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Sans abonnement"}</b>
      </p>

      {plans.map((p) => (
        <article key={p.id} className={`dash-card sub-card${p.id === current ? " on" : ""}`}>
          <span className="sub-name">{p.name}</span>
          {p.price && <span className="sub-price">{p.price}</span>}
          <strong style={{ fontSize: 30 }}>{p.rate}</strong>
          <p className="dash-muted">{p.text}</p>
          {p.id === current && <span className="sub-badge">Plan actuel</span>}
          {p.id !== "none" && p.id !== current && (
            <button className="primary-button" onClick={() => open(p.id)}>Choisir {p.name}</button>
          )}
        </article>
      ))}

      {choice && chosen && (
        <div className="ck-back" onClick={close}>
          <div className="ck" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="ck-top">
              <strong>Abonnement {chosen.name} · {chosen.price}</strong>
              <button className="ck-x" onClick={close} aria-label="Fermer">×</button>
            </div>
            <div className="ck-dots">
              {[1, 2, 3, 4].map((n) => <span key={n} className={`ck-dot${n <= step ? " on" : ""}`} />)}
            </div>

            {step === 1 && (
              <div className="ck-step" key="s1">
                <h2>Ton pays</h2>
                <p className="ck-sub">Choisis le pays où se trouve ton compte mobile money.</p>
                <div className="ck-grid">
                  {countries.map((c) => (
                    <button key={c.code} className={`ck-tile${country === c.code ? " on" : ""}`} onClick={() => setCountry(c.code)}>
                      <span className="ck-ico">🌍</span><strong>{c.name}</strong><span className="ck-tick">✓</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="ck-step" key="s2">
                <h2>Ton opérateur</h2>
                <p className="ck-sub">{countryName} · choisis le moyen de paiement.</p>
                <div className="ck-grid">
                  {operators.map((o) => (
                    <button key={o.id} className={`ck-tile${operator === o.id ? " on" : ""}`} onClick={() => setOperator(o.id)}>
                      <span className="ck-ico">{o.icon}</span><strong>{o.id}</strong><span className="ck-tick">✓</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="ck-step" key="s3">
                <h2>Tes coordonnées</h2>
                <p className="ck-sub">Le numéro qui recevra la demande de paiement.</p>
                <div className="ck-field">
                  <input id="ck-name" placeholder=" " value={name} onChange={(e) => setName(e.target.value)} />
                  <label htmlFor="ck-name">Ton nom</label>
                </div>
                <div className="ck-field">
                  <input id="ck-mob" placeholder=" " inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                  <label htmlFor="ck-mob">Ton numéro mobile</label>
                </div>
                {needsOtp && (
                  <div className="ck-field">
                    <input id="ck-otp" placeholder=" " inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <label htmlFor="ck-otp">Code OTP Orange Money</label>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="ck-step" key="s4">
                <h2>Confirmation</h2>
                <p className="ck-sub">Vérifie avant de payer.</p>
                <div className="ck-recap">
                  <div><span>Plan</span><strong>{chosen.name}</strong></div>
                  <div><span>Pays</span><strong>{countryName}</strong></div>
                  <div><span>Opérateur</span><strong>{operator}</strong></div>
                  <div><span>Numéro</span><strong>{mobile}</strong></div>
                  <div><span>Montant</span><strong className="ck-total">{chosen.price}</strong></div>
                </div>
              </div>
            )}

            {message && <p className={msgOk ? "ck-ok" : "ck-msg"} role="status">{message}</p>}

            <div style={{ marginTop: 14 }}>
              {step < 4 && <button className="ck-btn" onClick={goNext}>Continuer</button>}
              {step === 4 && !done && (
                <button className="ck-btn" disabled={busy} onClick={() => void pay()}>
                  {busy ? "Paiement…" : `Payer ${chosen.price}`}
                </button>
              )}
              {done && <button className="ck-btn" onClick={close}>Terminé</button>}
            </div>
          </div>
        </div>
      )}

      <p className="dash-muted">Le paiement passe par notre prestataire. Ton abonnement s’active une fois le paiement confirmé.</p>
    </section>
  );
}
