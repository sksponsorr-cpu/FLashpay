"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Statistiques des encaissements en direct. Mise en page autonome (ne dépend d'aucune feuille de style externe).
type Row = { amount: number; currency_code: string; status: string; purpose: string; created_at: string };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

const statusLabel: Record<string, string> = {
  pending: "En attente",
  successful: "Réussi",
  failed: "Échoué",
  expired: "Expiré",
  cancelled: "Annulé",
};
const statusColor: Record<string, string> = {
  pending: "#e08a00",
  successful: "#13a05a",
  failed: "#c8321a",
  expired: "#8a8aa3",
  cancelled: "#8a8aa3",
};

export default function StatsView({ appId }: { appId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: queryError } = await createClient()
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
    return { total: list.length, byCurrency, byStatus, rate };
  }, [rows]);

  if (error) return <p style={{ color: "#c8321a", fontSize: 15 }}>{error}</p>;
  if (!rows) return <p style={{ color: "#6b6c80", fontSize: 15 }}>Chargement…</p>;

  const card: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 22,
    padding: "20px 22px",
    boxShadow: "0 1px 0 rgba(20,20,43,.04), 0 12px 32px rgba(20,20,43,.06)",
    border: "1px solid #f0eef8",
    display: "grid",
    gap: 6,
  };
  const label: React.CSSProperties = { fontSize: 13, color: "#8a8aa3", letterSpacing: ".02em" };
  const big: React.CSSProperties = { fontSize: 30, fontWeight: 700, color: "#14142b", letterSpacing: "-.02em" };
  const entries = Object.entries(stats.byStatus).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        <div style={card}>
          <span style={label}>Transactions en direct</span>
          <strong style={big}>{stats.total}</strong>
        </div>
        <div style={card}>
          <span style={label}>Taux de réussite</span>
          <strong style={big}>{stats.rate} %</strong>
        </div>
        {Object.entries(stats.byCurrency).map(([currency, total]) => (
          <div style={card} key={currency}>
            <span style={label}>Encaissé en {currency}</span>
            <strong style={big}>{fmt(total)} <small style={{ fontSize: 15, color: "#8a8aa3" }}>{currency}</small></strong>
          </div>
        ))}
      </div>

      <section style={{ ...card, gap: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#14142b" }}>Par statut</span>
        {entries.length === 0 && <p style={{ margin: 0, color: "#8a8aa3", fontSize: 14 }}>Aucune transaction en direct pour l’instant.</p>}
        {entries.map(([status, count]) => (
          <div key={status} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
              <span style={{ color: "#14142b" }}>{statusLabel[status] ?? status}</span>
              <strong style={{ color: "#14142b" }}>{count}</strong>
            </div>
            <div style={{ height: 6, background: "#f0eef8", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: statusColor[status] ?? "#5b3fd6", borderRadius: 6, transition: "width .6s cubic-bezier(.2,.8,.2,1)" }} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
