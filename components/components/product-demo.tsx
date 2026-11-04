"use client";

import { useEffect, useState } from "react";

// Démo en scène : un téléphone incliné qui flotte, entouré de cartes qui flottent.
// Quatre temps : choix de l’opérateur, saisie du numéro, validation, crédit du portefeuille.
// Données fictives uniquement.

const REQUESTED = 45000;
const CLIENT_PAYS = Math.round(REQUESTED * 1.025);
const MERCHANT_RECEIVES = Math.round(REQUESTED * 0.94);
const NUMBER = "690 12 34 56";
const STEP_MS = [4200, 4400, 4600, 5000];

const scenes = [
  { title: "Le client choisit son opérateur", text: "Il voit les moyens de paiement disponibles dans son pays." },
  { title: "Il saisit son numéro mobile", text: "Pas besoin d’indicatif : FlashPay le complète." },
  { title: "Il valide sur son téléphone", text: "Une demande de confirmation apparaît. Aucun lien à ouvrir." },
  { title: "Ton portefeuille est crédité", text: "La confirmation arrive et le solde se met à jour." },
];

const fmt = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

export default function ProductDemo() {
  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState(0);
  const [pin, setPin] = useState(0);
  const [balance, setBalance] = useState(0);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      setScene(3);
      setBalance(MERCHANT_RECEIVES);
      setTyped(NUMBER.length);
      setPin(4);
      return;
    }
    const t = window.setTimeout(() => setScene((s) => (s + 1) % scenes.length), STEP_MS[scene]);
    return () => window.clearTimeout(t);
  }, [scene, reduced]);

  useEffect(() => {
    if (reduced) return;
    const timers: number[] = [];
    if (scene === 1) {
      setTyped(0);
      for (let i = 1; i <= NUMBER.length; i++) timers.push(window.setTimeout(() => setTyped(i), 240 * i));
    }
    if (scene === 2) {
      setPin(0);
      for (let i = 1; i <= 4; i++) timers.push(window.setTimeout(() => setPin(i), 650 * i));
    }
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [scene, reduced]);

  useEffect(() => {
    if (reduced) return;
    if (scene !== 3) return;
    setBalance(0);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1500);
      setBalance(Math.round(MERCHANT_RECEIVES * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scene, reduced]);

  return (
    <div className="pf">
      <style>{`
        .pf { position: relative; border-radius: 32px; background: radial-gradient(ellipse at 50% 35%, #ffffff 0%, #eef6f1 55%, #e3efe8 100%); border: 1px solid #e3ebe6; padding: 40px 20px 28px; overflow: hidden; }
        .pf-stage { position: relative; height: 560px; display: grid; place-items: center; perspective: 1200px; }
        .pf-phone { position: relative; z-index: 2; width: 270px; height: 530px; border-radius: 44px; background: linear-gradient(160deg, #22382d, #0f1a14); padding: 11px; box-shadow: 0 50px 80px -30px rgba(20,36,28,.55), inset 0 0 0 1px rgba(255,255,255,.08); transform: rotateY(-14deg) rotateX(6deg); animation: pf-float 7s ease-in-out infinite; transform-style: preserve-3d; }
        .pf-screen { position: relative; width: 100%; height: 100%; border-radius: 34px; background: #f7faf8; overflow: hidden; padding: 46px 18px 18px; color: #14241c; }
        .pf-island { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 88px; height: 25px; border-radius: 16px; background: #0f1a14; }
        .pf-layer { transition: opacity .7s ease, transform .7s ease; }
        .pf-hide { opacity: 0; transform: translateY(12px); pointer-events: none; position: absolute; inset: 46px 18px 18px; }
        .pf-kicker { font-size: 11px; font-weight: 700; color: #1f6b4c; letter-spacing: .04em; }
        .pf-amount { font-size: 30px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; margin-top: 4px; }
        .pf-muted { font-size: 11px; color: #6b7f74; }
        .pf-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 18px; }
        .pf-op { border: 1.5px solid #dbe5df; background: #fff; border-radius: 14px; padding: 12px 8px; font-size: 12px; font-weight: 700; text-align: center; transition: all .6s ease; }
        .pf-op.sel { border-color: #1f6b4c; background: #e4f1ea; color: #1f6b4c; transform: scale(1.04); }
        .pf-field { margin-top: 16px; background: #fff; border: 1px solid #dbe5df; border-radius: 14px; padding: 12px; font-size: 14px; font-variant-numeric: tabular-nums; min-height: 44px; }
        .pf-btn { margin-top: 16px; background: #1f6b4c; color: #fff; text-align: center; border-radius: 14px; padding: 13px; font-size: 13px; font-weight: 700; }
        .pf-pin { margin-top: 26px; text-align: center; }
        .pf-pin-dots { display: flex; gap: 10px; justify-content: center; margin-top: 14px; }
        .pf-pin-dots i { width: 13px; height: 13px; border-radius: 50%; background: #dbe5df; transition: background .3s, transform .3s; }
        .pf-pin-dots i.on { background: #1f6b4c; transform: scale(1.2); }
        .pf-spin { width: 46px; height: 46px; margin: 0 auto; border-radius: 50%; border: 4px solid #e4f1ea; border-top-color: #1f6b4c; animation: pf-spin 1s linear infinite; }
        .pf-ok { width: 64px; height: 64px; margin: 6px auto 0; border-radius: 50%; background: #e4f1ea; color: #1f6b4c; display: grid; place-items: center; font-size: 30px; font-weight: 800; animation: pf-pop .7s cubic-bezier(.2,.8,.2,1); }
        .pf-bal { margin-top: 26px; background: #fff; border-radius: 18px; padding: 16px; box-shadow: 0 1px 2px rgba(20,36,28,.06); animation: pf-rise .8s ease both; }
        .pf-bal .pf-amount { font-size: 26px; }
        .pf-card { position: absolute; z-index: 3; background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border: 1px solid #e3ebe6; border-radius: 18px; padding: 12px 14px; box-shadow: 0 22px 40px -22px rgba(20,36,28,.35); font-size: 12px; font-weight: 700; color: #14241c; display: flex; gap: 10px; align-items: center; white-space: nowrap; animation: pf-float-small 6s ease-in-out infinite; transition: opacity .6s ease, transform .6s ease; }
        .pf-card small { display: block; font-size: 10px; color: #6b7f74; font-weight: 600; }
        .pf-badge { width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; font-size: 13px; font-weight: 800; flex: none; }
        .pf-c1 { top: 16%; left: 2%; animation-delay: 0s; }
        .pf-c2 { top: 26%; right: 0; animation-delay: -2.4s; }
        .pf-c3 { bottom: 22%; left: 0; animation-delay: -4s; }
        .pf-c4 { bottom: 12%; right: 4%; animation-delay: -1.2s; background: #1f6b4c; color: #fff; border-color: #1f6b4c; }
        .pf-c4 small { color: #cfe6da; }
        .pf-hidden { opacity: 0; transform: translateY(10px) scale(.96); }
        .pf-caption { position: relative; z-index: 4; text-align: center; margin-top: 8px; min-height: 66px; }
        .pf-caption h3 { margin: 0; font-size: 20px; letter-spacing: -.01em; transition: opacity .5s ease; }
        .pf-caption p { margin: 6px auto 0; max-width: 460px; color: #5e7267; font-size: 14px; line-height: 1.5; }
        .pf-dots { display: flex; gap: 8px; justify-content: center; margin-top: 16px; position: relative; z-index: 4; }
        .pf-dots button { width: 10px; height: 10px; border-radius: 999px; border: 0; background: #cbdcd2; padding: 0; cursor: pointer; transition: width .5s ease, background .5s ease; }
        .pf-dots button.on { width: 30px; background: #1f6b4c; }
        @keyframes pf-float { 0%,100% { transform: rotateY(-14deg) rotateX(6deg) translateY(0); } 50% { transform: rotateY(-10deg) rotateX(4deg) translateY(-16px); } }
        @keyframes pf-float-small { 0%,100% { transform: translate(0,0); } 50% { transform: translate(8px,-14px); } }
        @keyframes pf-spin { to { transform: rotate(360deg); } }
        @keyframes pf-pop { 0% { transform: scale(.4); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
        @keyframes pf-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @media (max-width: 900px) { .pf-stage { height: 520px; } .pf-phone { width: 250px; height: 500px; } }
        @media (max-width: 620px) {
          .pf { padding: 28px 12px 22px; }
          .pf-stage { height: 480px; }
          .pf-phone { width: 230px; height: 460px; }
          .pf-card { font-size: 11px; padding: 9px 11px; }
          .pf-card.pf-c2, .pf-card.pf-c3 { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-phone, .pf-card, .pf-spin, .pf-ok, .pf-bal { animation: none !important; }
        }
      `}</style>

      <div className="pf-stage" aria-label="Démonstration du paiement">
        <div className={`pf-card pf-c1 ${scene === 0 ? "" : ""}`}>
          <span className="pf-badge" style={{ background: "#fff1c2", color: "#8a5a00" }}>M</span>
          <div>MTN MoMo<small>Opérateur disponible</small></div>
        </div>
        <div className="pf-card pf-c2">
          <span className="pf-badge" style={{ background: "#e4f1ea", color: "#1f6b4c" }}>CM</span>
          <div>Cameroun · CD · SN<small>+10 pays</small></div>
        </div>
        <div className="pf-card pf-c3">
          <span className="pf-badge" style={{ background: "#ffe6d6", color: "#a4501b" }}>O</span>
          <div>Orange Money<small>Confirmation mobile</small></div>
        </div>
        <div className={`pf-card pf-c4 ${scene === 3 ? "" : "pf-hidden"}`}>
          <span className="pf-badge" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>✓</span>
          <div>Paiement reçu<small>+{fmt(MERCHANT_RECEIVES)} FCFA</small></div>
        </div>

        <div className="pf-phone">
          <div className="pf-screen">
            <div className="pf-island" />

            <div className={`pf-layer ${scene === 2 || scene === 3 ? "pf-hide" : ""}`} style={{ position: scene === 2 || scene === 3 ? "absolute" : "relative", inset: scene === 2 || scene === 3 ? "46px 18px 18px" : undefined }}>
              <div className="pf-kicker">PAIEMENT · AÏCHA N.</div>
              <div className="pf-amount">{fmt(CLIENT_PAYS)} <span style={{ fontSize: 13 }}>FCFA</span></div>
              <div className="pf-muted">45 000 FCFA + 2,5 % de frais</div>
              <div className="pf-ops">
                <div className={`pf-op ${scene === 0 ? "sel" : ""}`}>MTN MoMo</div>
                <div className={`pf-op ${scene === 1 ? "sel" : ""}`}>Orange Money</div>
              </div>
              {scene >= 1 && <div className="pf-field">+237 {NUMBER.slice(0, typed)}<span style={{ opacity: typed % 2 ? 0 : 1 }}>|</span></div>}
              <div className="pf-btn">Payer {fmt(CLIENT_PAYS)} FCFA</div>
            </div>

            <div className={`pf-layer ${scene === 2 ? "" : "pf-hide"}`} style={{ position: "absolute", inset: "46px 18px 18px" }}>
              <div className="pf-pin">
                <div className="pf-spin" />
                <div className="pf-kicker" style={{ marginTop: 16 }}>CONFIRME SUR TON TÉLÉPHONE</div>
                <div className="pf-muted" style={{ marginTop: 4 }}>Saisis ton code pour valider {fmt(CLIENT_PAYS)} FCFA</div>
                <div className="pf-pin-dots">{[0, 1, 2, 3].map((d) => <i key={d} className={pin > d ? "on" : ""} />)}</div>
              </div>
            </div>

            <div className={`pf-layer ${scene === 3 ? "" : "pf-hide"}`} style={{ position: "absolute", inset: "46px 18px 18px" }}>
              <div className="pf-ok">✓</div>
              <div className="pf-kicker" style={{ textAlign: "center", marginTop: 10 }}>PAIEMENT REÇU</div>
              <div className="pf-bal">
                <div className="pf-muted">Solde XAF</div>
                <div className="pf-amount">{fmt(balance)} FCFA</div>
                <div className="pf-muted">Commission de 6 % déduite</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pf-caption">
        <h3>{scenes[scene].title}</h3>
        <p>{scenes[scene].text}</p>
      </div>

      <div className="pf-dots">
        {scenes.map((_, i) => (
          <button key={i} aria-label={`Étape ${i + 1}`} className={scene === i ? "on" : ""} onClick={() => setScene(i)} />
        ))}
      </div>
    </div>
  );
}
