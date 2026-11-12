"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import MfaSetup from "@/components/mfa-setup";

// Paramètres du compte : changement du mot de passe.
export default function SettingsPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setNotice({ ok: false, text: "Le mot de passe doit contenir au moins 8 caractères." }); return; }
    if (password !== confirm) { setNotice({ ok: false, text: "Les deux mots de passe ne correspondent pas." }); return; }
    setBusy(true); setNotice(null);
    const { error } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (error) { setNotice({ ok: false, text: "Mot de passe non modifié. Reconnecte-toi puis réessaie." }); return; }
    setPassword(""); setConfirm("");
    setNotice({ ok: true, text: "Mot de passe modifié." });
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "24px 18px 60px", color: "#17162b" }}>
      <Link href="/dashboard" style={{ color: "#5b3fd6", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Retour au tableau de bord</Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 6px" }}>Paramètres</h1>
      <p style={{ color: "#7a7590", fontSize: 14, marginBottom: 20 }}>Sécurité du compte.</p>
      <div style={{ marginBottom: 16 }}><MfaSetup /></div>
      <form onSubmit={changePassword} style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 20 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Changer le mot de passe</h2>
        <input type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
        <input type="password" autoComplete="new-password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
        {notice && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: notice.ok ? "#0f7a47" : "#c8321a" }}>{notice.text}</p>}
        <button type="submit" disabled={busy} style={{ minHeight: 48, border: 0, borderRadius: 15, background: "#5b3fd6", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
      </form>
    </main>
  );
}
