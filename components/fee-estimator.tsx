"use client";

import { useEffect, useRef, useState } from "react";

const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);

function useTween(target: number, duration = 700) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      current.current = value;
      setShown(value);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return shown;
}

export default function FeeEstimator() {
  const [amount, setAmount] = useState("25000");
  const value = Number(amount.replace(/\s/g, "").replace(",", "."));
  const valid = Number.isFinite(value) && value > 0;
  const payer = valid ? Math.round(value * 1.025) : 0;
  const receive = valid ? Math.round(value * 0.94) : 0;
  const payerShown = useTween(payer);
  const receiveShown = useTween(receive);
  const ratio = valid ? (receive / payer) * 100 : 0;

  return (
    <div className="fe-card">
      <div className="fe-head">
        <span className="fe-tag">Simulateur</span>
        <p>Tape le montant demandé au client.</p>
      </div>
      <label className="fe-label">
        Montant demandé (FCFA)
        <input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <div className="fe-grid">
        <div className="fe-box">
          <small>Le client paie</small>
          <div className="fe-num">{valid ? fmt(payerShown) : "—"} <span>FCFA</span></div>
        </div>
        <div className="fe-box fe-box-hot">
          <small>Tu reçois</small>
          <div className="fe-num">{valid ? fmt(receiveShown) : "—"} <span>FCFA</span></div>
        </div>
      </div>
      <div className="fe-bar" aria-hidden="true"><i style={{ width: `${ratio.toFixed(1)}%` }} /></div>
      <small className="fe-note">Estimation : +2,5 % payés par le client, −6 % retenus sur ton encaissement.</small>
    </div>
  );
}
