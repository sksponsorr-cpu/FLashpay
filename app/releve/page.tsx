"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Row = { transaction_id: string; customer_name: string | null; customer_phone: string | null; amount: number; fee_amount: number | null; currency_code: string; status: string; payment_method: string | null; created_at: string };

// Relevé imprimable des transactions de l'application (Imprimer → PDF).
function Statement() {
  const appId = useSearchParams().get("app") ?? "";
  const [rows, setRows] = useState<Row[]>([]);
  const [appName, setAppName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId) { setLoading(false); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("apps").select("name").eq("id", appId).maybeSingle(),
      supabase.from("transactions").select("transaction_id, customer_name, customer_phone, amount, fee_amount, currency_code, status, payment_method, created_at").eq("app_id", appId).order("created_at", { ascending: false }).limit(1000),
    ]).then(([app, tx]) => { setAppName(app.data?.name ?? ""); setRows((tx.data as Row[]) ?? []); setLoading(false); });
  }, [appId]);

  const ok = rows.filter((r) => r.status === "successful");
  const totals: Record<string, { amount: number; fee: number }> = {};
  for (const r of ok) {
    const t = (totals[r.currency_code] ??= { amount: 0, fee: 0 });
    t.amount += Number(r.amount); t.fee += Number(r.fee_amount ?? 0);
  }
  const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const statusLabel: Record<string, string> = { successful: "Réussi", pending: "En attente", failed: "Échoué", expired: "Expiré", cancelled: "Annulé" };

  if (loading) return <main style={{ padding: 24, fontFamily: "system-ui" }}><p>Chargement du relevé…</p></main>;
  if (!appId) return <main style={{ padding: 24, fontFamily: "system-ui" }}><p>Application non précisée.</p></main>;

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 28, fontFamily: "system-ui", color: "#17162b" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div><strong style={{ fontSize: 20 }}>{appName || "Relevé"}</strong><div style={{ color: "#7a7590", fontSize: 13 }}>Relevé des transactions</div></div>
        <div style={{ textAlign: "right", color: "#7a7590", fontSize: 13 }}>Édité le {new Date().toLocaleDateString("fr-FR")}<br />{rows.length} transaction(s)</div>
      </div>

      <table style={{ width: "100%", marginTop: 24, borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", color: "#7a7590", borderBottom: "1px solid #ebe7f6" }}>
          <th style={{ padding: "8px 4px" }}>Date</th><th>Référence</th><th>Client</th><th>Moyen</th><th style={{ textAlign: "right" }}>Montant</th><th style={{ textAlign: "right" }}>Frais</th><th>Statut</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.transaction_id} style={{ borderBottom: "1px solid #f1eff7" }}>
              <td style={{ padding: "8px 4px" }}>{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
              <td style={{ overflowWrap: "anywhere" }}>{r.transaction_id}</td>
              <td>{r.customer_name || "—"}<div style={{ color: "#8a8aa3", fontSize: 11 }}>{r.customer_phone || ""}</div></td>
              <td>{r.payment_method || "—"}</td>
              <td style={{ textAlign: "right" }}>{fmt(Number(r.amount))} {r.currency_code}</td>
              <td style={{ textAlign: "right" }}>{fmt(Number(r.fee_amount ?? 0))}</td>
              <td>{statusLabel[r.status] ?? r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 20, borderTop: "2px solid #17162b", paddingTop: 12 }}>
        <strong>Totaux des paiements réussis</strong>
        {Object.keys(totals).length === 0 && <p style={{ color: "#7a7590" }}>Aucun paiement réussi sur la période.</p>}
        {Object.entries(totals).map(([cur, t]) => (
          <div key={cur} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 6 }}>
            <span>{cur} — {ok.filter((r) => r.currency_code === cur).length} paiement(s)</span>
            <strong>{fmt(t.amount)} {cur} · frais {fmt(t.fee)}</strong>
          </div>
        ))}
      </div>

      <button className="no-print" onClick={() => window.print()} style={{ marginTop: 26, width: "100%", minHeight: 46, border: 0, borderRadius: 14, background: "#e8472a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Imprimer / enregistrer en PDF</button>
    </main>
  );
}

export default function RelevePage() {
  return <Suspense fallback={<main style={{ padding: 24 }}><p>Chargement…</p></main>}><Statement /></Suspense>;
}
