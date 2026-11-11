"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Support marchand : envoie une demande traitée depuis l'administrateur.
export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) { setNotice("Indique un sujet et un message."); return; }
    setBusy(true); setNotice("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); setNotice("Connecte-toi pour envoyer une demande."); return; }
    const { error } = await supabase.from("support_tickets").insert({ owner_id: user.id, subject: subject.trim(), message: message.trim() });
    setBusy(false);
    if (error) { setNotice("Impossible d’envoyer la demande. Réessaie."); return; }
    setSubject(""); setMessage(""); setNotice("Demande envoyée. Notre équipe te répondra.");
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 18px 60px", fontFamily: "inherit", color: "#17162b" }}>
      <Link href="/dashboard" style={{ color: "#5b3fd6", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Retour au tableau de bord</Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 6px" }}>Support</h1>
      <p style={{ color: "#7a7590", fontSize: 14, marginBottom: 20 }}>Décris ton problème. Indique si possible la référence de la transaction concernée.</p>
      <form onSubmit={send} style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 20 }}>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet" maxLength={120} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={6} maxLength={2000} style={{ border: "1px solid #e4e1ef", borderRadius: 15, padding: 14, font: "inherit", resize: "vertical" }} />
        {notice && <p style={{ margin: 0, color: notice.startsWith("Demande envoyée") ? "#0f7a47" : "#c8321a", fontWeight: 600, fontSize: 14 }}>{notice}</p>}
        <button type="submit" disabled={busy} style={{ minHeight: 48, border: 0, borderRadius: 15, background: "#e8472a", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Envoi…" : "Envoyer la demande"}</button>
      </form>
    </main>
  );
}
