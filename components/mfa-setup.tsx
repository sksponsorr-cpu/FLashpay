"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Double authentification (TOTP) : activation par QR code, désactivation, codes de vérification.
type Factor = { id: string; status: string; friendly_name?: string | null };

export default function MfaSetup() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadFactors() {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors(((data?.totp ?? []) as Factor[]).filter((f) => f.status === "verified"));
  }
  useEffect(() => { void loadFactors(); }, []);

  async function start() {
    setBusy(true); setNotice(null);
    const { data, error } = await createClient().auth.mfa.enroll({ factorType: "totp", friendlyName: "FlashPay" });
    setBusy(false);
    if (error || !data) { setNotice({ ok: false, text: "Impossible d’activer la double authentification." }); return; }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: code.trim() });
    setBusy(false);
    if (error) { setNotice({ ok: false, text: "Code incorrect. Vérifie l’application et réessaie." }); return; }
    setEnrolling(null); setCode("");
    setNotice({ ok: true, text: "Double authentification activée." });
    void loadFactors();
  }

  async function disable(id: string) {
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    setNotice(error ? { ok: false, text: "Désactivation impossible." } : { ok: true, text: "Double authentification désactivée." });
    void loadFactors();
  }

  return (
    <section style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 20 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Double authentification</h2>
      <p style={{ margin: 0, color: "#7a7590", fontSize: 14 }}>Demande un code à ton application d’authentification à chaque connexion.</p>

      {factors.length > 0 ? (
        <button onClick={() => void disable(factors[0].id)} disabled={busy} style={{ minHeight: 46, border: 0, borderRadius: 15, background: "#fff0ee", color: "#e8472a", fontWeight: 700, cursor: "pointer" }}>Désactiver</button>
      ) : enrolling ? (
        <form onSubmit={confirm} style={{ display: "grid", gap: 12, justifyItems: "center" }}>
          <div dangerouslySetInnerHTML={{ __html: enrolling.qr }} style={{ width: 180, height: 180 }} />
          <p style={{ margin: 0, fontSize: 13, color: "#7a7590", textAlign: "center" }}>Scanne ce QR code, ou saisis la clé : <strong>{enrolling.secret}</strong></p>
          <input inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} style={{ minHeight: 46, width: "100%", border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit", textAlign: "center", letterSpacing: ".3em" }} />
          <button type="submit" disabled={busy || code.length !== 6} style={{ minHeight: 48, width: "100%", border: 0, borderRadius: 15, background: "#5b3fd6", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer" }}>Confirmer</button>
        </form>
      ) : (
        <button onClick={() => void start()} disabled={busy} style={{ minHeight: 48, border: 0, borderRadius: 15, background: "#5b3fd6", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer" }}>Activer</button>
      )}

      {notice && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: notice.ok ? "#0f7a47" : "#c8321a" }}>{notice.text}</p>}
    </section>
  );
}
