"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Liste réelle des transactions du compte connecté (lecture seule, selon les règles RLS).

type Row = {
  transaction_id: string;
  amount: number;
  currency_code: string;
  net_payable: number;
  status: string;
  purpose: string;
  created_at: string;
};

const fmt = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
const statusLabel: Record<string, string> = {
  pending: "En attente",
  successful: "Réussi",
  failed: "Échoué",
  expired: "Expiré",
};

export default function TransactionsList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("transactions")
          .select("transaction_id, amount, currency_code, net_payable, status, purpose, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (queryError) throw queryError;
        if (!cancelled) setRows((data ?? []) as Row[]);
      } catch {
        if (!cancelled) setError("Impossible de charger les transactions pour le moment.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (error) return <p style={{ color: "#8a5a00", fontSize: 14 }}>{error}</p>;
  if (!rows) return <p style={{ color: "#6b7f74", fontSize: 14 }}>Chargement…</p>;
  if (rows.length === 0) return <p style={{ color: "#6b7f74", fontSize: 14 }}>Aucune transaction pour le moment. Elles apparaîtront ici dès le premier encaissement.</p>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map((row) => (
        <div key={row.transaction_id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid #eef2ef", fontSize: 14 }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.purpose === "subscription" ? "Abonnement" : "Encaissement"} · {row.transaction_id}
            </strong>
            <span style={{ fontSize: 12, color: "#6b7f74" }}>
              {new Date(row.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {statusLabel[row.status] ?? row.status}
            </span>
          </div>
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <strong>{fmt(row.amount)} {row.currency_code}</strong>
            {row.purpose !== "subscription" && <span style={{ display: "block", fontSize: 12, color: "#6b7f74" }}>Net : {fmt(row.net_payable)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
