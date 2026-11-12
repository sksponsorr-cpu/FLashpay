"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Changement du mot de passe du compte (affiché dans l'onglet Sécurité des paramètres).
export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent) {
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
    <form onSubmit={submit} className="dash-card set-card" style={{ display: "grid", gap: 10 }}>
      <strong>Changer le mot de passe</strong>
      <input type="password" autoComplete="new-password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
      <input type="password" autoComplete="new-password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
      {notice && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: notice.ok ? "#0f7a47" : "#c8321a" }}>{notice.text}</p>}
      <button type="submit" disabled={busy} style={{ minHeight: 46, border: 0, borderRadius: 14, background: "#e8472a", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer" }}>{busy ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
    </form>
  );
}
