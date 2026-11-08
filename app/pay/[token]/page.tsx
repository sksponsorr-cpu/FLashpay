"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Link = { label: string; amount: number; currency_code: string; country_name: string; is_active: boolean; mode: string };

// Moyens de paiement proposés selon la devise du lien.
const networksByCurrency: Record<string, { name: string; color: string; short: string }[]> = {
  CDF: [
    { name: "Airtel Money", color: "#e10600", short: "Ai" },
    { name: "Orange Money", color: "#ff6600", short: "Or" },
    { name: "M-Pesa", color: "#00a651", short: "Mp" },
    { name: "Africell Money", color: "#1e3c8c", short: "Af" },
  ],
  XAF: [
    { name: "MTN MoMo", color: "#ffcc00", short: "MTN" },
    { name: "Orange Money", color: "#ff6600", short: "Or" },
    { name: "Airtel Money", color: "#e10600", short: "Ai" },
  ],
  XOF: [
    { name: "Orange Money", color: "#ff6600", short: "Or" },
    { name: "MTN MoMo", color: "#ffcc00", short: "MTN" },
    { name: "Moov Money", color: "#0066cc", short: "Mv" },
    { name: "Wave", color: "#1ba3ff", short: "Wv" },
  ],
  KES: [{ name: "M-Pesa", color: "#00a651", short: "Mp" }, { name: "Airtel Money", color: "#e10600", short: "Ai" }],
  RWF: [{ name: "MTN MoMo", color: "#ffcc00", short: "MTN" }, { name: "Airtel Money", color: "#e10600", short: "Ai" }],
  GHS: [{ name: "MTN MoMo", color: "#ffcc00", short: "MTN" }, { name: "Vodafone Cash", color: "#e60000", short: "Vf" }],
  NGN: [{ name: "Virement bancaire", color: "#6b6c80", short: "Bk" }],
  USD: [{ name: "Carte bancaire", color: "#6b6c80", short: "Cb" }],
};

// Indicatif affiché dans le champ numéro, selon le pays du lien.
const dialByCurrency: Record<string, { code: string; label: string }> = {
  CDF: { code: "+243", label: "RDC" },
  XAF: { code: "+237", label: "Cameroun" },
  XOF: { code: "", label: "Pays de la zone UEMOA" },
  KES: { code: "+254", label: "Kenya" },
  RWF: { code: "+250", label: "Rwanda" },
  GHS: { code: "+233", label: "Ghana" },
  NGN: { code: "+234", label: "Nigeria" },
  USD: { code: "", label: "" },
};

// Frais ajoutés au montant, à la charge du client (passé à true côté serveur).
const CLIENT_FEE_RATE = 0.025;

const extraCss = `.pg-ring{position:relative;width:110px;height:110px;border-radius:50%;background:#f1edff;display:grid;place-items:center;animation:pgPulse 1.8s ease-in-out infinite}.pg-phone{font-size:42px}.pg-steps{display:flex;gap:10px;align-items:center;font-size:14px;color:#55566a}.pg-stepn{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#f1edff;color:#5b3fd6;font-weight:800}@keyframes pgPulse{0%,100%{box-shadow:0 0 0 0 rgba(91,63,214,.25)}50%{box-shadow:0 0 0 22px rgba(91,63,214,0)}}`;

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

const css = `
:root{color-scheme:light}
${extraCss}
html,body{background:#f4f2ff}
.pg{min-height:100vh;display:grid;place-items:center;padding:20px 14px;background:radial-gradient(900px 520px at 15% -10%,#e6dfff 0%,transparent 60%),#f4f2ff;color:#14142b;font-family:inherit}
.pg-card{position:relative;width:100%;max-width:440px;background:#fff;border-radius:28px;padding:22px 20px 26px;box-shadow:0 30px 70px -30px rgba(40,30,110,.45);overflow:hidden;animation:pgUp .5s cubic-bezier(.2,.8,.2,1) both}
.pg-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pg-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px}
.pg-logo{display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:linear-gradient(145deg,#7b5cf0,#5b3fd6);color:#fff}
.pg-test{font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;background:#fff4e0;color:#8a5a00}
.pg-amount{margin:16px 0 4px;font-size:34px;font-weight:800;letter-spacing:-.02em}
.pg-amount small{font-size:16px;color:#6b6c80}
.pg-sub{color:#6b6c80;font-size:14px;margin:0 0 16px}
.pg-dots{display:flex;gap:6px;margin:6px 0 18px}
.pg-dot{flex:1;height:6px;border-radius:6px;background:#ebe8f7;transition:background .4s ease}
.pg-dot.on{background:linear-gradient(90deg,#7b5cf0,#5b3fd6)}
.pg-step{animation:pgSlide .4s cubic-bezier(.2,.8,.2,1) both}
.pg-h{font-size:21px;font-weight:800;margin:0 0 4px}
.pg-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pg-tile{position:relative;display:grid;gap:6px;justify-items:start;padding:14px;border-radius:18px;border:1px solid #ebe8f7;background:#fff;cursor:pointer;text-align:left;transition:transform .2s ease,box-shadow .25s ease,border-color .25s ease}
.pg-tile:active{transform:scale(.97)}
.pg-tile.on{border-color:#5b3fd6;background:#f8f6ff;box-shadow:0 12px 26px -12px rgba(91,63,214,.5)}
.pg-chip{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px}
.pg-tile strong{font-size:14px}
.pg-fee{font-size:12px;color:#6b6c80}
.pg-tick{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:#5b3fd6;color:#fff;display:grid;place-items:center;font-size:12px;transform:scale(0);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.pg-tile.on .pg-tick{transform:scale(1)}
.pg-field{position:relative;margin-top:14px}
.pg-field input{width:100%;min-height:58px;padding:24px 14px 8px;border:1px solid #ebe8f7;border-radius:16px;background:#fbfaff;font:inherit;transition:border-color .25s ease,box-shadow .25s ease}
.pg-field input:focus{outline:none;border-color:#5b3fd6;box-shadow:0 0 0 4px rgba(91,63,214,.15)}
.pg-field label{position:absolute;left:14px;top:20px;color:#6b6c80;font-size:15px;pointer-events:none;transition:all .25s ease}
.pg-field input:focus + label,.pg-field input:not(:placeholder-shown) + label{top:8px;font-size:11px;color:#5b3fd6;font-weight:700}
.pg-prefix{display:flex;align-items:center;gap:8px;margin-top:14px;padding:0 14px;min-height:58px;border:1px solid #ebe8f7;border-radius:16px;background:#fbfaff}
.pg-prefix span{font-weight:800;color:#5b3fd6}
.pg-prefix input{flex:1;border:0;background:transparent;font:inherit;font-size:16px;padding:14px 0;outline:none}
.pg-recap{display:grid;gap:0;border-radius:18px;background:#fbfaff;padding:6px 14px;margin:6px 0 16px}
.pg-recap div{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #ebe8f7;font-size:14px}
.pg-recap div:first-child{border-top:0}
.pg-total{font-size:19px;font-weight:800;color:#5b3fd6}
.pg-btn{width:100%;min-height:56px;border:0;border-radius:18px;background:linear-gradient(145deg,#7b5cf0,#5b3fd6);color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 16px 30px -12px rgba(91,63,214,.7);transition:transform .15s ease}
.pg-btn:active{transform:scale(.98)}
.pg-btn:disabled{opacity:.55}
.pg-ghost{background:#fff;color:#5b3fd6;border:1px solid #ebe8f7;box-shadow:none;margin-top:10px}
.pg-msg{margin:12px 0 0;font-size:14px;font-weight:600;color:#c8321a}
.pg-foot{margin-top:18px;text-align:center;font-size:12px;color:#8a8aa3}
@keyframes pgUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes pgSlide{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pg-card,.pg-step,.pg-tile{animation:none;transition:none}}
`;

function PayContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [link, setLink] = useState<Link | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(1);
  const [network, setNetwork] = useState("");
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [txId, setTxId] = useState("");
  const [waitStatus, setWaitStatus] = useState<"" | "pending" | "successful" | "failed">("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_payment_link", { p_token: token });
      if (error || !data || data.length === 0) setNotFound(true);
      else setLink(data[0] as Link);
    })();
  }, [token]);

  useEffect(() => {
    if (!txId || waitStatus === "successful" || waitStatus === "failed") return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const r = await fetch(`/api/pay/${encodeURIComponent(token)}/status?tx=${encodeURIComponent(txId)}`, { cache: "no-store" });
        const j = await r.json();
        if (j.status === "successful") { setWaitStatus("successful"); clearInterval(timer); }
        else if (j.status === "failed" || j.status === "cancelled" || j.status === "expired") { setWaitStatus("failed"); clearInterval(timer); }
        else setWaitStatus("pending");
      } catch { /* on réessaie */ }
      if (tries > 60) { setWaitStatus("failed"); clearInterval(timer); }
    }, 3000);
    return () => clearInterval(timer);
  }, [txId, token, waitStatus]);

  const networks = link ? (networksByCurrency[link.currency_code] ?? []) : [];
  const dial = link ? dialByCurrency[link.currency_code] ?? { code: "", label: "" } : { code: "", label: "" };
  const fee = link ? Math.round(link.amount * CLIENT_FEE_RATE * 100) / 100 : 0;
  const total = link ? Math.round((link.amount + fee) * 100) / 100 : 0;
  const chosen = networks.find((n) => n.name === network);

  function next() {
    if (step === 1 && !link?.is_active) { setMsg("Ce lien n’est plus actif."); return; }
    if (step === 2 && !network) { setMsg("Choisis ton moyen de paiement."); return; }
    if (step === 3 && (!mobile.trim() || !name.trim())) { setMsg("Indique ton nom et ton numéro."); return; }
    setMsg("");
    setStep((s) => s + 1);
  }

  async function pay() {
    setBusy(true); setMsg("");
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), mobile: (dial.code + mobile).trim(), operator: network }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Le paiement n’a pas pu être effectué.");
      setTxId(result.transaction_id ?? "");
      setWaitStatus("pending");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Le paiement n’a pas pu être effectué.");
    } finally {
      setBusy(false);
    }
  }

  if (txId) {
    return (
      <main className="pg">
        <style>{css}</style>
        <div className="pg-card" style={{ textAlign: "center", display: "grid", gap: 14, justifyItems: "center" }}>
          <div className="pg-ring"><span className="pg-phone">📱</span></div>
          {waitStatus === "successful" ? (
            <>
              <h2 className="pg-h">Paiement reçu</h2>
              <p className="pg-sub">Merci. Ton paiement de {fmt(total)} {link?.currency_code} est confirmé.</p>
            </>
          ) : waitStatus === "failed" ? (
            <>
              <h2 className="pg-h">Paiement non abouti</h2>
              <p className="pg-sub">Le paiement n’a pas été confirmé sur ton téléphone. Tu peux réessayer.</p>
              <button className="pg-btn" onClick={() => { setTxId(""); setWaitStatus(""); setStep(2); }}>Réessayer</button>
            </>
          ) : (
            <>
              <h2 className="pg-h">Confirme le paiement sur ton téléphone</h2>
              <p className="pg-sub">Saisis ton code PIN quand ton téléphone te le demande. Cette page se met à jour toute seule.</p>
              <div className="pg-steps">
                <span className="pg-stepn">1</span><span>Demande envoyée à {chosen?.name ?? "ton opérateur"}</span>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="pg">
      <style>{css}</style>
      <div className="pg-card">
        <div className="pg-top">
          <div className="pg-brand"><span className="pg-logo">f</span><span>flash<span style={{ color: "#5b3fd6" }}>pay</span></span></div>
          {link?.mode === "test" && <span className="pg-test">Mode test</span>}
        </div>

        {notFound && <p className="pg-sub" style={{ marginTop: 18 }}>Ce lien de paiement n’existe pas.</p>}
        {!notFound && !link && <p className="pg-sub" style={{ marginTop: 18 }}>Chargement…</p>}

        {link && (
          <>
            <p className="pg-sub" style={{ marginTop: 16, marginBottom: 0 }}>{link.label} · {link.country_name}</p>
            <div className="pg-amount">{fmt(link.amount)} <small>{link.currency_code}</small></div>

            <div className="pg-dots">{[1, 2, 3, 4].map((n) => <span key={n} className={`pg-dot${n <= step ? " on" : ""}`} />)}</div>

            {step === 1 && (
              <div className="pg-step" key="s1">
                <h2 className="pg-h">Ton pays</h2>
                <p className="pg-sub">Ce paiement est demandé pour {link.country_name}.</p>
                <div className="pg-tile on" style={{ cursor: "default" }}>
                  <span className="pg-chip" style={{ background: "#5b3fd6" }}>{link.currency_code}</span>
                  <strong>{link.country_name}</strong>
                  <span className="pg-tick">✓</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="pg-step" key="s2">
                <h2 className="pg-h">Moyen de paiement</h2>
                <p className="pg-sub">Frais de {CLIENT_FEE_RATE * 100} % inclus dans le total.</p>
                <div className="pg-tiles">
                  {networks.map((n) => (
                    <button type="button" key={n.name} className={`pg-tile${network === n.name ? " on" : ""}`} onClick={() => setNetwork(n.name)}>
                      <span className="pg-chip" style={{ background: n.color }}>{n.short}</span>
                      <strong>{n.name}</strong>
                      <span className="pg-fee">+{fmt(fee)} {link.currency_code} de frais</span>
                      <span className="pg-tick">✓</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="pg-step" key="s3">
                <h2 className="pg-h">Tes coordonnées</h2>
                <p className="pg-sub">Le numéro qui recevra la demande de paiement sur {chosen?.name ?? "ton moyen de paiement"}.</p>
                <div className="pg-field">
                  <input id="pg-name" placeholder=" " value={name} onChange={(e) => setName(e.target.value)} />
                  <label htmlFor="pg-name">Ton nom complet</label>
                </div>
                <div className="pg-prefix">
                  <span>{dial.code || "+"}</span>
                  <input inputMode="tel" placeholder="Ton numéro mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
                {dial.label && <p className="pg-fee" style={{ marginTop: 8 }}>Numéro {dial.label} : {dial.code} suivi de ton numéro.</p>}
              </div>
            )}

            {step === 4 && (
              <div className="pg-step" key="s4">
                <h2 className="pg-h">Confirmation</h2>
                <p className="pg-sub">Vérifie avant de payer.</p>
                <div className="pg-recap">
                  <div><span>Montant</span><strong>{fmt(link.amount)} {link.currency_code}</strong></div>
                  <div><span>Frais</span><strong>+{fmt(fee)} {link.currency_code}</strong></div>
                  <div><span>Moyen</span><strong>{network}</strong></div>
                  <div><span>Numéro</span><strong>{dial.code}{mobile}</strong></div>
                  <div><span>Total à payer</span><strong className="pg-total">{fmt(total)} {link.currency_code}</strong></div>
                </div>
              </div>
            )}

            {msg && <p className="pg-msg" role="status">{msg}</p>}

            <div style={{ marginTop: 16 }}>
              {step < 4 && link.is_active && <button className="pg-btn" onClick={next}>Continuer</button>}
              {step === 4 && <button className="pg-btn" disabled={busy} onClick={() => void pay()}>{busy ? "Redirection…" : `Payer ${fmt(total)} ${link.currency_code}`}</button>}
              {step > 1 && step < 5 && <button className="pg-btn pg-ghost" onClick={() => { setStep((s) => s - 1); setMsg(""); }}>Retour</button>}
            </div>
            <p className="pg-foot">Paiement sécurisé · vous serez redirigé vers la page de validation de votre opérateur.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<main className="pg" />}>
      <PayContent />
    </Suspense>
  );
}
