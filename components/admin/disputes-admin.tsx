"use client";
import { useCallback, useEffect, useState } from "react";

type Dispute = { id: string; transaction_id: string; reason: string; status: string; admin_reply: string | null; created_at: string; email: string };

const LABEL: Record<string, string> = { open: "Ouvert", in_review: "En cours", resolved: "Résolu" };

// Section « Litiges » du bureau administrateur.
export default function DisputesAdmin() {
  const [rows, setRows] = useState<Dispute[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/disputes", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.message ?? "Chargement impossible."); return; }
    setError("");
    setRows(json.disputes as Dispute[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function update(id: string, status: string) {
    setBusy(id);
    const res = await fetch("/api/admin/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, reply: draft[id] ?? "" }) });
    setBusy(null);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).message ?? "Action impossible."); return; }
    setDraft((d) => ({ ...d, [id]: "" }));
    await load();
  }

  return (
    <section>
      <h1>Litiges</h1>
      <p className="adm-sub">Litiges ouverts par les marchands. Réponds, puis change le statut. Le marchand est prévenu.</p>
      {error && <p role="alert" className="adm-empty">{error}</p>}
      {rows && rows.length === 0 && <p className="adm-empty">Aucun litige pour le moment.</p>}
      {rows?.map((d) => (
        <div className="adm-card" key={d.id}>
          <div className="adm-row" style={{ justifyContent: "space-between" }}>
            <strong>{d.transaction_id}</strong>
            <span className="adm-meta" style={{ fontWeight: 700 }}>{LABEL[d.status] ?? d.status}</span>
          </div>
          <span className="adm-meta">{d.email || "—"} · {new Date(d.created_at).toLocaleString("fr-FR")}</span>
          <p style={{ margin: "10px 0", fontSize: 14 }}>{d.reason}</p>
          {d.admin_reply && <p className="adm-meta" style={{ margin: "0 0 10px" }}>Réponse envoyée : {d.admin_reply}</p>}
          <textarea
            rows={3}
            placeholder="Réponse au marchand (facultatif)"
            value={draft[d.id] ?? ""}
            onChange={(e) => setDraft((prev) => ({ ...prev, [d.id]: e.target.value }))}
            style={{ width: "100%", borderRadius: 12, border: "1px solid #e4e1ef", padding: 10, font: "inherit" }}
          />
          <div className="adm-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {d.status !== "in_review" && <button className="adm-btn" disabled={busy === d.id} onClick={() => void update(d.id, "in_review")}>Mettre en cours</button>}
            {d.status !== "resolved" && <button className="adm-btn" disabled={busy === d.id} onClick={() => void update(d.id, "resolved")}>Marquer résolu</button>}
          </div>
        </div>
      ))}
    </section>
  );
}
