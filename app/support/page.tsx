"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Support marchand : historique des demandes, fil de discussion et réponses.
type Ticket = { id: string; subject: string; message: string; status: string; created_at: string };
type Msg = { id: string; ticket_id: string; author: "merchant" | "admin"; body: string; created_at: string };

const BRAND = "#e8472a";

const dateFmt = (v: string) =>
  new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: ticketRows } = await supabase
      .from("support_tickets")
      .select("id, subject, message, status, created_at")
      .order("created_at", { ascending: false });
    const list = (ticketRows as Ticket[]) ?? [];
    setTickets(list);
    if (list.length) {
      const { data: msgRows } = await supabase
        .from("support_messages")
        .select("id, ticket_id, author, body, created_at")
        .in("ticket_id", list.map((t) => t.id))
        .order("created_at", { ascending: true });
      setMessages((msgRows as Msg[]) ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setNotice("Indique un sujet et un message.");
      return;
    }
    setBusy(true);
    setNotice("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setNotice("Connecte-toi pour envoyer une demande.");
      return;
    }
    const { error } = await supabase
      .from("support_tickets")
      .insert({ owner_id: user.id, subject: subject.trim(), message: message.trim() });
    setBusy(false);
    if (error) {
      setNotice("Impossible d’envoyer la demande. Réessaie.");
      return;
    }
    setSubject("");
    setMessage("");
    setNotice("Demande envoyée. Notre équipe te répondra ici.");
    await load();
  }

  async function sendReply(ticketId: string) {
    const text = reply.trim();
    if (!text) return;
    setSendingReply(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSendingReply(false);
      return;
    }
    const { error } = await supabase
      .from("support_messages")
      .insert({ ticket_id: ticketId, owner_id: user.id, author: "merchant", body: text });
    setSendingReply(false);
    if (!error) {
      setReply("");
      await load();
    }
  }

  const statusLabel = (t: Ticket, thread: Msg[]) => {
    if (t.status === "closed") return { text: "Traitée", color: "#0f7a47" };
    const last = thread[thread.length - 1];
    if (last?.author === "admin") return { text: "Réponse reçue", color: "#5b3fd6" };
    return { text: "En cours de traitement", color: "#9a6a00" };
  };

  return (
    <main style={{ maxWidth: 620, margin: "0 auto", padding: "24px 18px 60px", fontFamily: "inherit", color: "#17162b" }}>
      <Link href="/dashboard" style={{ color: "#5b3fd6", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Retour au tableau de bord</Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 6px" }}>Support</h1>
      <p style={{ color: "#7a7590", fontSize: 14, marginBottom: 20 }}>Décris ton problème. Indique si possible la référence de la transaction concernée.</p>

      <form onSubmit={send} style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 20 }}>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet" maxLength={120} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message" rows={5} maxLength={2000} style={{ border: "1px solid #e4e1ef", borderRadius: 15, padding: 14, font: "inherit", resize: "vertical" }} />
        {notice && <p role="status" style={{ margin: 0, color: notice.startsWith("Demande envoyée") ? "#0f7a47" : "#c8321a", fontWeight: 600, fontSize: 14 }}>{notice}</p>}
        <button type="submit" disabled={busy} style={{ minHeight: 48, border: 0, borderRadius: 15, background: BRAND, color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Envoi en cours…" : "Envoyer la demande"}
        </button>
      </form>

      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "28px 0 12px" }}>Mes demandes</h2>
      {tickets.length === 0 && <p style={{ color: "#7a7590", fontSize: 14 }}>Aucune demande pour le moment.</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {tickets.map((t) => {
          const thread = messages.filter((m) => m.ticket_id === t.id);
          const isOpen = openId === t.id;
          const st = statusLabel(t, thread);
          return (
            <article key={t.id} style={{ background: "#fff", border: "1px solid #ebe7f6", borderRadius: 20, padding: 16 }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : t.id)}
                style={{ width: "100%", border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
                aria-expanded={isOpen}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <strong style={{ fontSize: 15 }}>{t.subject}</strong>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.color, whiteSpace: "nowrap" }}>{st.text}</span>
                </div>
                <span style={{ fontSize: 12, color: "#8a8aa3" }}>{dateFmt(t.created_at)}</span>
              </button>

              {isOpen && (
                <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                  <div style={{ justifySelf: "end", maxWidth: "85%", background: BRAND, color: "#fff", borderRadius: 16, padding: "10px 14px", fontSize: 14, lineHeight: 1.5 }}>
                    {t.message}
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>Toi · {dateFmt(t.created_at)}</div>
                  </div>
                  {thread.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        justifySelf: m.author === "merchant" ? "end" : "start",
                        maxWidth: "85%",
                        background: m.author === "merchant" ? BRAND : "#f4f2fb",
                        color: m.author === "merchant" ? "#fff" : "#2a2940",
                        borderRadius: 16,
                        padding: "10px 14px",
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {m.body}
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{m.author === "merchant" ? "Toi" : "FlashPay"} · {dateFmt(m.created_at)}</div>
                    </div>
                  ))}

                  {t.status === "open" ? (
                    <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Ajouter un message…"
                        rows={2}
                        maxLength={2000}
                        style={{ border: "1px solid #e4e1ef", borderRadius: 14, padding: 12, font: "inherit", resize: "vertical" }}
                      />
                      <button
                        type="button"
                        onClick={() => void sendReply(t.id)}
                        disabled={sendingReply || !reply.trim()}
                        style={{ minHeight: 44, border: 0, borderRadius: 14, background: BRAND, color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: sendingReply || !reply.trim() ? 0.55 : 1 }}
                      >
                        {sendingReply ? "Envoi en cours…" : "Envoyer"}
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: "6px 0 0", fontSize: 13, color: "#7a7590" }}>Cette demande est traitée.</p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
