"use client";
import { Suspense, useEffect, useState } from "react";
import { clientFeeFor, ISO_BY_COUNTRY_NAME, networksFor } from "@/lib/client-fees";
import { FLASHPAY_MARGIN_POINTS } from "@/lib/fee-schedule";
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

// Indicatif affiché dans le champ numéro, selon la devise du lien.
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

// Frais ajoutés au montant, à la charge du client (ajoutés côté serveur).


const extraCss = `.pg-ring{position:relative;width:110px;height:110px;border-radius:50%;background:#f1edff;display:grid;place-items:center;animation:pgPulse 1.8s ease-in-out infinite}.pg-phone{font-size:42px}.pg-steps{display:flex;gap:10px;align-items:center;font-size:14px;color:#55566a}.pg-stepn{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#f1edff;color:#e8472a;font-weight:800}@keyframes pgPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,71,42,.25)}50%{box-shadow:0 0 0 22px rgba(232,71,42,0)}}`;

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

const css = `
:root{color-scheme:light}
${extraCss}
html,body{background:#f4f2ff}
.pg{min-height:100vh;display:grid;place-items:center;padding:20px 14px;background:radial-gradient(900px 520px at 15% -10%,#e6dfff 0%,transparent 60%),#f4f2ff;color:#14142b;font-family:inherit}
.pg-card{position:relative;width:100%;max-width:440px;background:#fff;border-radius:28px;padding:22px 20px 26px;box-shadow:0 30px 70px -30px rgba(40,30,110,.45);overflow:hidden;animation:pgUp .5s cubic-bezier(.2,.8,.2,1) both}
.pg-top{display:flex;justify-content:space-between;align-items:center;gap:10px}
.pg-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:18px}
.pg-logo{display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:linear-gradient(145deg,#f0593f,#e8472a);color:#fff}
.pg-test{font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;background:#fff4e0;color:#8a5a00}
.pg-amount{margin:16px 0 4px;font-size:34px;font-weight:800;letter-spacing:-.02em}
.pg-amount small{font-size:16px;color:#6b6c80}
.pg-sub{color:#6b6c80;font-size:14px;margin:0 0 16px}
.pg-dots{display:flex;gap:6px;margin:6px 0 18px}
.pg-dot{flex:1;height:6px;border-radius:6px;background:#ebe8f7;transition:background .4s ease}
.pg-dot.on{background:linear-gradient(90deg,#f0593f,#e8472a)}
.pg-step{animation:pgSlide .4s cubic-bezier(.2,.8,.2,1) both}
.pg-h{font-size:21px;font-weight:800;margin:0 0 4px}
.pg-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pg-tile{position:relative;display:grid;gap:6px;justify-items:start;padding:14px;border-radius:18px;border:1px solid #ebe8f7;background:#fff;cursor:pointer;text-align:left;transition:transform .2s ease,box-shadow .25s ease,border-color .25s ease}
.pg-tile:active{transform:scale(.97)}
.pg-tile.on{border-color:#e8472a;background:#f8f6ff;box-shadow:0 12px 26px -12px rgba(232,71,42,.5)}
.pg-chip{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px}
.pg-tile strong{font-size:14px}
.pg-fee{font-size:12px;color:#6b6c80}
.pg-tick{position:absolute;top:10px;right:10px;width:22px;height:22px;border-radius:50%;background:#e8472a;color:#fff;display:grid;place-items:center;font-size:12px;transform:scale(0);transition:transform .3s cubic-bezier(.2,.8,.2,1)}
.pg-tile.on .pg-tick{transform:scale(1)}
.pg-field{position:relative;margin-top:14px}
.pg-field input{width:100%;min-height:58px;padding:24px 14px 8px;border:1px solid #ebe8f7;border-radius:16px;background:#fbfaff;font:inherit;transition:border-color .25s ease,box-shadow .25s ease}
.pg-field input:focus{outline:none;border-color:#e8472a;box-shadow:0 0 0 4px rgba(232,71,42,.15)}
.pg-field label{position:absolute;left:14px;top:20px;color:#6b6c80;font-size:15px;pointer-events:none;transition:all .25s ease}
.pg-field input:focus + label,.pg-field input:not(:placeholder-shown) + label{top:8px;font-size:11px;color:#e8472a;font-weight:700}
.pg-prefix{display:flex;align-items:center;gap:8px;margin-top:14px;padding:0 14px;min-height:58px;border:1px solid #ebe8f7;border-radius:16px;background:#fbfaff}
.pg-rule{margin-top:12px;padding:12px 14px;border-radius:14px;background:#f4f1ff;font-size:13px;color:#3d3560}.pg-rule ul{margin:6px 0 0;padding-left:18px}.pg-rule li{margin:2px 0}
.pg-prefix input{flex:1;border:0;background:transparent;font:inherit;font-size:16px;padding:14px 0;outline:none}
.pg-recap{display:grid;gap:0;border-radius:18px;background:#fbfaff;padding:6px 14px;margin:6px 0 16px}
.pg-recap div{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #ebe8f7;font-size:14px}
.pg-recap div:first-child{border-top:0}
.pg-total{font-size:19px;font-weight:800;color:#e8472a}
.pg-btn{width:100%;min-height:56px;border:0;border-radius:18px;background:linear-gradient(145deg,#f0593f,#e8472a);color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 16px 30px -12px rgba(232,71,42,.7);transition:transform .15s ease}
.pg-btn:active{transform:scale(.98)}
.pg-btn:disabled{opacity:.55}
.pg-ghost{background:#fff;color:#e8472a;border:1px solid #ebe8f7;box-shadow:none;margin-top:10px}
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
  const [margin, setMargin] = useState(FLASHPAY_MARGIN_POINTS);
  useEffect(() => {
    fetch("/api/platform-settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (typeof d.margin_points === "number") setMargin(d.margin_points); })
      .catch(() => {});
  }, []);
  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [txId, setTxId] = useState("");
  const [waitStatus, setWaitStatus] = useState<"" | "pending" | "successful" | "failed">("");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [retrying, setRetrying] = useState(false);
  // Relance du même paiement SasPay (même transaction FlashPay) avec le réseau déjà choisi.
  async function retrySamePayment() {
    if (!txId || !network) return;
    setRetrying(true);
    setMsg("");
    try {
      const r = await fetch(`/api/pay/${encodeURIComponent(token)}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txId, operator: network }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message ?? "Relance impossible.");
      setWaitStatus("pending");
      setSecondsLeft(PAY_WINDOW_SECONDS);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Relance impossible.");
    } finally {
      setRetrying(false);
    }
  }

  const [brand, setBrand] = useState<{ name: string; logo_url: string | null; cover_url?: string | null; color: string | null; template?: string; animation?: string; logo_position?: string } | null>(null);
  // Statistiques de conversion : une visite par chargement de la page (sans donnée personnelle).
  useEffect(() => {
    fetch(`/api/pay/${encodeURIComponent(token)}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [token]);
  useEffect(() => {
    fetch(`/api/pay/${encodeURIComponent(token)}/brand`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.brand) setBrand(d.brand); })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_payment_link", { p_token: token });
      if (error || !data || data.length === 0) setNotFound(true);
      else setLink(data[0] as Link);
    })();
  }, [token]);

  // Attente de la confirmation sur téléphone (fournisseur à paiement direct).
  // Échec affiché : on informe le serveur pour fermer la transaction côté FlashPay.
  useEffect(() => {
    if (waitStatus !== "failed" || !txId) return;
    fetch(`/api/pay/${encodeURIComponent(token)}/status?tx=${encodeURIComponent(txId)}`, { cache: "no-store" }).catch(() => {});
  }, [waitStatus, txId, token]);

  // Paiement direct : 3 minutes pour valider sur le téléphone. Le compte à rebours est indicatif :
  // à zéro, on continue de vérifier auprès du fournisseur au lieu d'annoncer un échec.
  useEffect(() => {
    if (!txId) return;
    setSecondsLeft(PAY_WINDOW_SECONDS);
    const clock = setInterval(() => {
      setSecondsLeft((v) => (v <= 1 ? 0 : v - 1));
    }, 1000);
    return () => clearInterval(clock);
  }, [txId]);

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
      } catch {
        // on réessaie au prochain tour
      }
      // Environ 3 minutes de vérification après la fenêtre de validation, puis échec définitif.
      if (tries > PAY_MAX_POLLS) { setWaitStatus("failed"); clearInterval(timer); }
    }, 3000);
    return () => clearInterval(timer);
  }, [txId, token, waitStatus]);

  const countryIso = link ? (ISO_BY_COUNTRY_NAME[link.country_name] ?? "") : "";
  const networks = link
    ? networksFor(link.country_name, link.currency_code).map((n) => ({
        name: n.network,
        short: n.network.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase(),
        color: "#e8472a",
      }))
    : [];
  // Frais du réseau choisi = taux de la grille tarification (minimum appliqué si connu).
  const feeOf = (operator: string) => {
    if (!link) return 0;
    const f = clientFeeFor(countryIso, operator, link.currency_code, margin);
    const raw = link.amount * (f.percent / 100);
    return Math.round((f.minimum !== null ? Math.max(raw, f.minimum) : raw) * 100) / 100;
  };
  const percentOf = (operator: string) => clientFeeFor(countryIso, operator, link?.currency_code, margin).percent;
  const dial = link ? dialByCurrency[link.currency_code] ?? { code: "", label: "" } : { code: "", label: "" };
  const fee = link && network ? feeOf(network) : 0;
  const total = link ? Math.round((link.amount + fee) * 100) / 100 : 0;
  const chosen = networks.find((n) => n.name === network);

  function next() {
    if (step === 1 && !link?.is_active) { setMsg("Ce lien n’est plus actif."); return; }
    if (step === 2 && !network) { setMsg("Choisis ton moyen de paiement."); return; }
    if (step === 3 && (!mobile.trim() || !name.trim())) { setMsg("Indique ton nom et ton numéro."); return; }
    if (step === 3) {
      const compact = mobile.replace(/[\s-]/g, "");
      if (compact.includes("+")) { setMsg("Ne mets pas le + : écris ton numéro sans indicatif du pays."); return; }
      if (!/^\d{8,12}$/.test(compact)) { setMsg("Ton numéro doit contenir uniquement des chiffres (8 à 12)."); return; }
    }
    setMsg("");
    setStep((s) => s + 1);
  }

  async function pay() {
    setBusy(true);
    setMsg("");
    try {
      const response = await fetch(`/api/pay/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), mobile: mobile.replace(/[\s-]/g, ""), operator: network }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Le paiement n’a pas pu être effectué.");

      if (result.mode === "test") {
        setMsg(result.message);
        setBusy(false);
        return;
      }

      // Swychr : redirection vers la page du prestataire.
      if (result.payment_link) {
        window.location.assign(result.payment_link);
        return; // la page quitte le site : on ne réactive pas le bouton
      }

      // SasPay : paiement direct, on attend la validation sur le téléphone.
      setTxId(result.transaction_id ?? "");
      setWaitStatus("pending");
      setBusy(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Le paiement n’a pas pu être effectué.");
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
            <div className="pg-result">
              <style>{`
                .pg-result{display:grid;justify-items:center;text-align:center;gap:10px;padding:8px 0}
                .pg-circle{stroke-dasharray:166;stroke-dashoffset:166;animation:pg-draw .7s ease forwards}
                .pg-check{stroke-dasharray:48;stroke-dashoffset:48;animation:pg-draw .4s .6s ease forwards}
                .pg-burst{transform-origin:50% 50%;animation:pg-pop .6s .9s ease both}
                @keyframes pg-draw{to{stroke-dashoffset:0}}
                @keyframes pg-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
                @media (prefers-reduced-motion:reduce){.pg-circle,.pg-check,.pg-burst{animation:none;stroke-dashoffset:0}}
              `}</style>
              <svg width="96" height="96" viewBox="0 0 60 60" aria-hidden>
                <circle className="pg-circle" cx="30" cy="30" r="26.5" fill="none" stroke="#2fbf7f" strokeWidth="3" strokeLinecap="round" />
                <path className="pg-check" d="M18 31 L26 39 L43 22" fill="none" stroke="#2fbf7f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle className="pg-burst" cx="30" cy="30" r="30" fill="none" stroke="#2fbf7f" strokeOpacity=".25" strokeWidth="2" />
              </svg>
              <h2 className="pg-h">Paiement effectué avec succès !</h2>
              <p className="pg-sub">Ton paiement de {fmt(total)} {link?.currency_code} est confirmé.</p>
              {txId && <a href={`/pay/${encodeURIComponent(token)}/recu?tx=${encodeURIComponent(txId)}`} style={{ color: "#b9a8ff", fontWeight: 700 }}>Voir le reçu</a>}
            </div>
          ) : waitStatus === "failed" ? (
            <>
              <h2 className="pg-h">Le paiement n’a pas abouti</h2>
              <p className="pg-sub">Le paiement n’a pas été confirmé dans le temps imparti. Si l’argent a été débité, contacte le support avec ta référence.</p>
              <button className="pg-btn" disabled={retrying} onClick={() => void retrySamePayment()}>{retrying ? "Relance en cours…" : "Relancer sur ce téléphone"}</button>
              <button className="pg-btn pg-ghost" style={{ marginTop: 10 }} onClick={() => { setTxId(""); setWaitStatus(""); setStep(2); }}>Choisir un autre réseau</button>
            </>
          ) : (
            <>
              <p className="pg-sub" style={{ margin: 0, letterSpacing: ".04em", textTransform: "uppercase", fontSize: 12, color: "#b9b4d6" }}>Sécurisation de votre transaction…</p>
              <h2 className="pg-h">Confirme le paiement sur ton téléphone</h2>
              <p className="pg-sub">Saisis ton code PIN quand ton téléphone te le demande. Temps restant : {secondsLeft} s.</p>
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
          <div className="pg-brand">{brand?.logo_url ? <img src={brand.logo_url} alt={brand.name} style={{ height: 40, maxWidth: 160, objectFit: "contain" }} /> : brand?.name ? <span>{brand.name}</span> : null}</div>
          {brand?.color && <style>{`.pg-btn:not(.pg-ghost){background:${brand.color} !important}` + checkoutCss(brand)}</style>}
          {link?.mode === "test" && <span className="pg-test">Mode test</span>}
        </div>

        {brand?.cover_url && (brand.template === "oreo" || brand.template === "feed" || brand.template === "make") && (
          brand.template === "oreo" ? (
            <div style={{ margin: "14px -4px 0", borderRadius: 18, overflow: "hidden", background: "#f4f2fb" }}>
              <img src={brand.cover_url} alt="" style={{ display: "block", width: "100%", height: 190, objectFit: "cover" }} />
            </div>
          ) : brand.template === "make" ? (
            <div style={{ margin: "14px -20px 0", padding: "16px 20px", background: "#14142b", color: "#fff", display: "flex", gap: 12, alignItems: "center", borderRadius: "18px 18px 0 0" }}>
              <img src={brand.cover_url} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: "cover", flex: "none" }} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis" }}>{link?.label ?? brand.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{brand.name}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <img src={brand.cover_url} alt="" style={{ width: 76, height: 76, borderRadius: 16, objectFit: "cover", flex: "none" }} />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: "block", fontSize: 15 }}>{link?.label ?? ""}</strong>
                <span style={{ fontSize: 12, color: "#8a8aa3" }}>{brand.name}</span>
              </div>
            </div>
          )
        )}

        {notFound && <p className="pg-sub" style={{ marginTop: 18 }}>Ce lien de paiement n’existe pas.</p>}
        {!notFound && !link && <div role="status" aria-label="Chargement en cours" style={{ marginTop: 18, display: "grid", placeItems: "center", height: 80 }}><span style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #f1eef8", borderTopColor: brand?.color ?? "#e8472a", animation: "pgSpin 0.9s linear infinite" }} /><style>{"@keyframes pgSpin{to{transform:rotate(360deg)}}"}</style></div>}

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
                  <span className="pg-chip" style={{ background: "#e8472a" }}>{link.currency_code}</span>
                  <strong>{link.country_name}</strong>
                  <span className="pg-tick">✓</span>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="pg-step" key="s2">
                <h2 className="pg-h">Moyen de paiement</h2>
                <p className="pg-sub">{network ? `Frais de ${percentOf(network).toString().replace(".", ",")} % inclus dans le total.` : "Les frais dépendent du moyen choisi."}</p>
                <div className="pg-tiles">
                  {networks.map((n) => (
                    <button type="button" key={n.name} className={`pg-tile${network === n.name ? " on" : ""}`} onClick={() => setNetwork(n.name)}>
                      <span className="pg-chip" style={{ background: n.color }}>{n.short}</span>
                      <strong>{n.name}</strong>
                      <span className="pg-fee">+{fmt(feeOf(n.name))} {link.currency_code} de frais</span>
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
                  <input inputMode="tel" placeholder="Ton numéro mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                </div>
                <div className="pg-rule">
                  <strong>Comment écrire ton numéro</strong>
                  <ul>
                    <li>Écris-le comme tu le composes dans ton pays.</li>
                    <li>Ne mets pas le signe + et n’ajoute pas l’indicatif du pays (ex. +243).</li>
                    <li>Garde le 0 du début s’il fait partie de ton numéro (ex. Bénin : 0197505050).</li>
                  </ul>
                </div>
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
                  <div><span>Numéro</span><strong>{mobile}</strong></div>
                  <div><span>Total à payer</span><strong className="pg-total">{fmt(total)} {link.currency_code}</strong></div>
                </div>
              </div>
            )}

            {msg && <p className="pg-msg" role="status">{msg}</p>}

            <div style={{ marginTop: 16 }}>
              {step < 4 && link.is_active && <button className="pg-btn" onClick={next}>Continuer</button>}
              {step === 4 && <button className="pg-btn" disabled={busy} onClick={() => void pay()}>{busy ? "Traitement…" : `Payer ${fmt(total)} ${link.currency_code}`}</button>}
              {step > 1 && step < 5 && <button className="pg-btn pg-ghost" onClick={() => { setStep((s) => s - 1); setMsg(""); }}>Retour</button>}
            </div>
            <p className="pg-foot">Paiement sécurisé · vous serez redirigé vers la page de validation de votre opérateur.</p>
          </>
        )}
      </div>
    </main>
  );
}

// Modèle, animation et position du logo choisis par le marchand (valeurs contrôlées, jamais du texte libre).
function checkoutCss(b: { template?: string; animation?: string; logo_position?: string }) {
  const tpl = b.template === "split" || b.template === "minimal" || b.template === "glass" ? b.template : "classic";
  const anim = b.animation === "none" || b.animation === "rise" ? b.animation : "fade";
  const parts: string[] = [];
  if (tpl === "split") parts.push(".pg-card{border-top:8px solid var(--brand,#e8472a)}");
  if (tpl === "minimal") parts.push(".pg-card{box-shadow:none;border:1px solid #ebe8f7}");
  if (tpl === "glass") parts.push(".pg{background:linear-gradient(160deg,var(--brand,#e8472a) 0%,#14142b 100%)!important}.pg-card{background:rgba(255,255,255,.78)!important;backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);border:1px solid rgba(255,255,255,.6);box-shadow:0 30px 70px -30px rgba(0,0,0,.45)}");
  if (b.logo_position === "center") parts.push(".pg-brand{justify-content:center}");
  if (anim === "none") parts.push(".pg-card{animation:none!important}");
  if (anim === "fade") parts.push("@keyframes pgFadeIn{from{opacity:0}to{opacity:1}}.pg-card{animation:pgFadeIn .5s ease both!important}");
  if (anim === "rise") parts.push("@keyframes pgRiseIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}.pg-card{animation:pgRiseIn .6s cubic-bezier(.2,.8,.2,1) both!important}");
  parts.push("@media(prefers-reduced-motion:reduce){.pg-card{animation:none!important}}");
  return parts.join("");
}

const PAY_WINDOW_SECONDS = 180;
const PAY_MAX_POLLS = 150; // 3 s par tentative : environ 7,5 minutes au maximum

export default function PayPage() {
  return (
    <Suspense fallback={<main className="pg" />}>
      <PayContent />
    </Suspense>
  );
}
