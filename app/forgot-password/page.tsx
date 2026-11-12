"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Mot de passe oublié : envoi d'un lien de réinitialisation par e-mail.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/settings` });
    setBusy(false);
    setSent(true); // Message identique, que le compte existe ou non (pas de fuite d'information).
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 18px", color: "#17162b" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Mot de passe oublié</h1>
      {sent ? (
        <p style={{ color: "#0f7a47", fontWeight: 600 }}>Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.</p>
      ) : (
        <form onSubmit={send} style={{ display: "grid", gap: 12 }}>
          <input type="email" required placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
          <button type="submit" disabled={busy} style={{ minHeight: 48, border: 0, borderRadius: 15, background: "#5b3fd6", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer" }}>Envoyer le lien</button>
        </form>
      )}
      <Link href="/login" style={{ display: "inline-block", marginTop: 18, color: "#5b3fd6", fontWeight: 700, textDecoration: "none" }}>← Retour à la connexion</Link>
    </main>
  );
}
