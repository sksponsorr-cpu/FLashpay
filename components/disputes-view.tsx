"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Dispute = { id: string; transaction_id: string; reason: string; status: string; created_at: string };
const statusLabel: Record<string, string> = { open: "Ouvert", in_review: "En cours", resolved: "Résolu" };

// Litiges de CETTE application uniquement : on ne montre que les litiges portant sur ses transactions.
export default function DisputesView({ appId }: { appId: string }) {
  const [rows, setRows] = useState<Dispute[] | null>(null);
  const [txIds, setTxIds] = useState<string[]>([]);
  const [txId, setTxId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // Toutes les transactions de l'application (test et live) pour rattacher les litiges.
      const { data: t } = await supabase.from("transactions").select("transaction_id").eq("app_id", appId).order("created_at", { ascending: false }).limit(500);
      const ids = (t ?? []).map((x: { transaction_id: string }) => x.transaction_id);
      const { data: d } = ids.length
        ? await supabase.from("disputes").select("id,transaction_id,reason,status,created_at").in("transaction_id", ids).order("created_at", { ascending: false }).limit(100)
        : { data: [] as Dispute[] };
      if (cancelled) return;
      setTxIds(ids.filter((_, i) => i < 200));
      setRows((d ?? []) as Dispute[]);
    })();
    return () => { cancelled = true; };
  }, [appId, reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!txId || reason.trim().length < 5) {
      setNotice("Choisis une transaction et décris le problème (5 caractères minimum).");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("disputes").insert({ owner_id: user?.id, transaction_id: txId, reason: reason.trim() });
    setBusy(false);
    if (error) {
      setNotice("Litige refusé : vérifie la transaction choisie.");
      return;
    }
    setNotice("Litige ouvert.");
    setReason("");
    setTxId("");
    setReload((n) => n + 1);
  }

  return (
    <div className="disputes-wrap">
      <form className="dash-card wd-card wd-form" onSubmit={submit}>
        <label className="set-field"><span>Transaction concernée</span>
          <select value={txId} onChange={(e) => setTxId(e.target.value)}>
            <option value="">Choisir une transaction</option>
            {txIds.map((id) => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label className="set-field"><span>Motif du litige</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Explique le problème" />
        </label>
        {notice && <p className="dash-muted">{notice}</p>}
        <div className="wd-actions"><button className="primary-button" disabled={busy}>{busy ? "Envoi…" : "Ouvrir un litige"}</button></div>
      </form>
      <div className="dash-card wd-card">
        {rows && rows.length === 0 && <p className="dash-muted">Aucun litige pour le moment.</p>}
        {rows?.map((r) => (
          <div className="wd-row" key={r.id}>
            <div>
              <strong>{r.transaction_id}</strong>
              <span className="dash-muted">{r.reason}</span>
            </div>
            <span className="tx-badge tx-pending">{statusLabel[r.status] ?? r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
