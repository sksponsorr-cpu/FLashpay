"use client";
import { useEffect, useState } from "react";

type Stats = { days: number; visits: number; payments: number; conversion_rate: number | null };

// Taux de conversion des liens de paiement sur 30 jours : visites, paiements réussis, taux.
export default function ConversionStats({ appId }: { appId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/stats/conversion?app=${encodeURIComponent(appId)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); if (alive) setStats(j); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Statistiques indisponibles."); });
    return () => { alive = false; };
  }, [appId]);

  if (error) return <p style={{ color: "#c8321a", fontSize: 14 }}>{error}</p>;
  if (!stats) return <p style={{ color: "#8a8aa3", fontSize: 14 }}>Chargement…</p>;

  const card = { background: "#faf9fd", border: "1px solid #ebe7f6", borderRadius: 16, padding: 16, display: "grid", gap: 6 } as const;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Conversion des liens de paiement</h3>
      <p style={{ margin: 0, color: "#7a7590", fontSize: 13 }}>Sur les {stats.days} derniers jours.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <div style={card}><span style={{ fontSize: 12, color: "#7a7590" }}>Visites des liens</span><strong style={{ fontSize: 22 }}>{stats.visits}</strong></div>
        <div style={card}><span style={{ fontSize: 12, color: "#7a7590" }}>Paiements réussis</span><strong style={{ fontSize: 22 }}>{stats.payments}</strong></div>
        <div style={card}><span style={{ fontSize: 12, color: "#7a7590" }}>Taux de conversion</span><strong style={{ fontSize: 22, color: "#5b3fd6" }}>{stats.conversion_rate === null ? "—" : `${stats.conversion_rate} %`}</strong></div>
      </div>
    </div>
  );
}
