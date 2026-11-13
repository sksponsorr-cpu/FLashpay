"use client";
import { useState } from "react";

// Section « Annonces » du bureau administrateur : envoie une notification à tous les marchands.
const KINDS = [
  { id: "offer", label: "Nouvelle offre" },
  { id: "feature", label: "Nouveauté" },
  { id: "maintenance", label: "Maintenance" },
  { id: "info", label: "Information" },
];

export default function AnnouncementsAdmin() {
  const [kind, setKind] = useState("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/dashboard");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function send() {
    setNotice("");
    if (!body.trim()) { setNotice("Écris le message à envoyer."); return; }
    if (!window.confirm("Envoyer cette annonce à tous les marchands ? Elle partira sur le site et sur leur téléphone.")) return;
    setBusy(true);
    const res = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, title, body, url }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setNotice(json.message ?? "Envoi impossible."); return; }
    setNotice(`Annonce envoyée à ${json.recipients} marchand(s).`);
    setTitle(""); setBody("");
  }

  return (
    <section>
      <h1>Annonces</h1>
      <p className="adm-sub">Envoie une information à tous les marchands : offres, nouveautés, maintenance. Elle apparaît dans leur cloche et sur leur téléphone.</p>
      <div className="adm-card" style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}><span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #e4e1ef", padding: "0 10px" }}>
            {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}><span>Titre (facultatif)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Maintenance ce samedi" style={{ minHeight: 42, borderRadius: 12, border: "1px solid #e4e1ef", padding: "0 10px" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}><span>Message</span>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Écris le message pour les marchands" style={{ borderRadius: 12, border: "1px solid #e4e1ef", padding: 10, font: "inherit" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}><span>Page à ouvrir au clic</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ minHeight: 42, borderRadius: 12, border: "1px solid #e4e1ef", padding: "0 10px" }} />
        </label>
        {notice && <p role="status" className="adm-meta">{notice}</p>}
        <button className="adm-btn" disabled={busy} onClick={() => void send()}>{busy ? "Envoi…" : "Envoyer à tous les marchands"}</button>
      </div>
    </section>
  );
}
