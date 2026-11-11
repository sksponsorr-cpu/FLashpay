"use client";
import { useState } from "react";

// Retrait en 4 étapes : pays, mobile money, montant, confirmation.
type Dest = { country_code: string; operator: string; mobile: string; name: string };
type Props = { currency: string; minimum: number; available: number; onSubmit: (amount: number, dest: Dest) => Promise<void> };

const STEPS = ["Pays", "Mobile money", "Montant", "Confirmation"];

export default function WithdrawStepper({ currency, minimum, available, onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [dest, setDest] = useState<Dest>({ country_code: "", operator: "", mobile: "", name: "" });
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const n = Number(amount);
  const canNext = [
    !!dest.country_code,
    !!dest.operator && !!dest.mobile.trim() && !!dest.name.trim(),
    n >= minimum && n <= available,
    true,
  ][step];

  async function submit() {
    setBusy(true); setErr("");
    try { await onSubmit(n, dest); } catch (e) { setErr(e instanceof Error ? e.message : "Demande refusée."); }
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ height: 6, background: "#ebe8f7", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${((step + 1) / STEPS.length) * 100}%`, background: "linear-gradient(90deg,#7b5cf0,#5b3fd6)", transition: "width .45s cubic-bezier(.2,.8,.2,1)" }} />
      </div>
      <div style={{ fontSize: 13, color: "#6b6c80" }}>Étape {step + 1} sur {STEPS.length} · {STEPS[step]}</div>

      <div key={step} style={{ animation: "wsIn .35s cubic-bezier(.2,.8,.2,1) both" }}>
        {step === 0 && <input placeholder="Code pays (ex. TG, SN, CD)" value={dest.country_code} onChange={(e) => setDest({ ...dest, country_code: e.target.value.toUpperCase() })} style={field} />}
        {step === 1 && (
          <div style={{ display: "grid", gap: 10 }}>
            <input placeholder="Opérateur (ex. Moov Money)" value={dest.operator} onChange={(e) => setDest({ ...dest, operator: e.target.value })} style={field} />
            <input placeholder="Numéro, sans + ni indicatif" inputMode="tel" value={dest.mobile} onChange={(e) => setDest({ ...dest, mobile: e.target.value })} style={field} />
            <input placeholder="Nom du bénéficiaire" value={dest.name} onChange={(e) => setDest({ ...dest, name: e.target.value })} style={field} />
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "grid", gap: 8 }}>
            <input placeholder={`Montant en ${currency}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} style={field} />
            <small style={{ color: "#6b6c80" }}>Minimum {minimum.toLocaleString("fr-FR")} {currency} · disponible {available.toLocaleString("fr-FR")} {currency}</small>
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "grid", gap: 6, fontSize: 15 }}>
            <div>Montant : <strong>{n.toLocaleString("fr-FR")} {currency}</strong></div>
            <div>Vers : <strong>{dest.operator}</strong> · {dest.mobile}</div>
            <div>Bénéficiaire : <strong>{dest.name}</strong></div>
          </div>
        )}
      </div>

      {err && <p role="alert" style={{ color: "#c8321a", margin: 0 }}>{err}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && <button type="button" onClick={() => setStep(step - 1)} style={ghost}>Retour</button>}
        {step < STEPS.length - 1
          ? <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} style={primary}>Continuer</button>
          : <button type="button" disabled={busy} onClick={() => void submit()} style={primary}>{busy ? "Envoi…" : "Confirmer le retrait"}</button>}
      </div>

      <style>{`@keyframes wsIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { div[style*="wsIn"] { animation: none !important; } }`}</style>
    </div>
  );
}

const field: React.CSSProperties = { width: "100%", padding: "14px 14px", borderRadius: 14, border: "1px solid #ebe8f7", background: "#fbfaff", font: "inherit" };
const primary: React.CSSProperties = { flex: 1, padding: "14px", borderRadius: 14, border: 0, background: "linear-gradient(145deg,#7b5cf0,#5b3fd6)", color: "#fff", fontWeight: 800 };
const ghost: React.CSSProperties = { padding: "14px 18px", borderRadius: 14, border: "1px solid #ebe8f7", background: "#fff", color: "#5b3fd6", fontWeight: 700 };
