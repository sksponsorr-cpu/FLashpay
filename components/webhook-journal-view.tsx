"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Delivery = { id: string; transaction_id: string; event: string; url: string; attempts: number; http_status: number | null; success: boolean; created_at: string };

export default function WebhookJournalView() {
  const [rows, setRows] = useState<Delivery[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: queryError } = await createClient()
          .from("webhook_deliveries")
          .select("id,transaction_id,event,url,attempts,http_status,success,created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        if (queryError) throw queryError;
        if (!cancelled) setRows((data ?? []) as Delivery[]);
      } catch {
        if (!cancelled) setError("Impossible de charger le journal des webhooks.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <p className="tx-msg tx-error">{error}</p>;
  if (!rows) return <p className="tx-msg">Chargement…</p>;
  if (!rows.length) return <p className="tx-msg">Aucun envoi webhook pour le moment.</p>;
  return (
    <div className="tx-wrap">
      {rows.map((r) => (
        <div className="tx-row" key={r.id}>
          <div className="tx-main">
            <strong>{r.event}</strong>
            <span className="tx-ref">{r.transaction_id}</span>
            <span className="tx-date">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
          </div>
          <div className="tx-side">
            <span className="tx-net">HTTP {r.http_status ?? "—"} · {r.attempts} tentative(s)</span>
            <span className={`tx-badge ${r.success ? "tx-successful" : "tx-failed"}`}>{r.success ? "Livré" : "Échec"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
