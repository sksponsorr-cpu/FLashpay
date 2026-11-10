"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { amount: number; currency_code: string; status: string; purpose: string; created_at: string };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

export default function StatsView({ appId }: { appId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("transactions")
          .select("amount,currency_code,status,purpose,created_at")
          .eq("app_id", appId)
          .eq("environment", "live")
          .order("created_at", { ascending: false })
          .limit(5000);
        if (queryError) throw queryError;
        if (!cancelled) setRows((data ?? []) as Row[]);
      } catch {
        if (!cancelled) setError("Impossible de charger les statistiques.");
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const success = list.filter((r) => r.status === "successful");
    const finished = list.filter((r) => ["successful", "failed", "expired", "cancelled"].includes(r.status));
    const byCurrency: Record<string, number> = {};
    for (const r of success) byCurrency[r.currency_code] = (byCurrency[r.currency_code] ?? 0) + Number(r.amount);
    const byStatus: Record<string, number> = {};
    for (const r of list) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const rate = finished.length ? Math.round((success.length / finished.length) * 100) : 0;
    return { total: list.length, successCount: success.length, byCurrency, byStatus, rate };
  }, [rows]);

  if (error) return <p className="tx-msg tx-error">{error}</p>;
  if (!rows) return <p className="tx-msg">Chargement…</p>;

  const statusLabel: Record<string, string> = { pending: "En attente", successful: "Réussi", failed: "Échoué", expired: "Expiré", cancelled: "Annulé" };

  return (
    <div className="stats-wrap">
      <div className="stats-grid">
        <div className="stats-card">
          <span>Transactions live</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stats-card">
          <span>Taux de réussite</span>
          <strong>{stats.rate} %</strong>
        </div>
        {Object.entries(stats.byCurrency).map(([currency, total]) => (
          <div className="stats-card" key={currency}>
            <span>Encaissé en {currency}</span>
            <strong>{fmt(total)} {currency}</strong>
          </div>
        ))}
      </div>
      <h3 className="stats-title">Par statut</h3>
      {Object.keys(stats.byStatus).length === 0 && <p className="tx-msg">Aucune transaction live pour l’instant.</p>}
      {Object.entries(stats.byStatus).map(([status, count]) => (
        <div className="stats-row" key={status}>
          <span>{statusLabel[status] ?? status}</span>
          <strong>{count}</strong>
        </div>
      ))}
    </div>
  );
}
