"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TransactionDetail from "@/components/transaction-detail";

// Liste des encaissements en direct. Mise en page autonome (aucune classe CSS externe requise).
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
  cancelled: "Annulé",
};
const statusStyle: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fff4e0", fg: "#8a5a00" },
  successful: { bg: "#e7f7ef", fg: "#0f7a47" },
  failed: { bg: "#fdecea", fg: "#c8321a" },
  expired: { bg: "#f0eef8", fg: "#6b6c80" },
  cancelled: { bg: "#f0eef8", fg: "#6b6c80" },
};
const filters: { value: string; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "successful", label: "Réussi" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Échoué" },
  { value: "expired", label: "Expiré" },
  { value: "cancelled", label: "Annulé" },
];

const field: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: 14,
  border: "1px solid #ebe8f7",
  background: "#fbfaff",
  font: "inherit",
  fontSize: 14,
  color: "#14142b",
  minWidth: 0,
};

export default function TransactionsList({ appId }: { appId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [currency, setCurrency] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: queryError } = await createClient()
          .from("transactions")
          .select("transaction_id,amount,currency_code,net_payable,status,purpose,created_at")
          .eq("app_id", appId)
          .eq("environment", "live")
          .order("created_at", { ascending: false })
          .limit(50);
        if (queryError) throw queryError;
        if (!cancelled) setRows((data ?? []) as Row[]);
      } catch {
        if (!cancelled) setError("Impossible de charger les transactions de cette application.");
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    const start = from ? new Date(from).getTime() : null;
    const end = to ? new Date(to).getTime() + 86399999 : null;
    return rows.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return (status === "all" || r.status === status) &&
        (currency === "all" || r.currency_code === currency) &&
        (start === null || t >= start) &&
        (end === null || t <= end) &&
        (!q || r.transaction_id.toLowerCase().includes(q));
    });
  }, [rows, status, query, currency, from, to]);

  const currencies = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.currency_code))).sort(), [rows]);

  function exportCsv() {
    const header = ["reference", "type", "montant", "devise", "net", "statut", "date"];
    const lines = visible.map((r) => [
      r.transaction_id,
      r.purpose === "subscription" ? "Abonnement" : "Encaissement",
      r.amount, r.currency_code, r.net_payable, statusLabel[r.status] ?? r.status, r.created_at,
    ].join(";"));
    const blob = new Blob([[header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <p style={{ color: "#c8321a", fontSize: 15 }}>{error}</p>;
  if (!rows) return <p style={{ color: "#6b6c80", fontSize: 15 }}>Chargement…</p>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input
        type="search"
        placeholder="Rechercher une référence"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...field, width: "100%" }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <select aria-label="Devise" value={currency} onChange={(e) => setCurrency(e.target.value)} style={field}>
          <option value="all">Toutes les devises</option>
          {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ ...field, display: "flex", gap: 8, alignItems: "center" }}>Du <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ border: 0, background: "transparent", font: "inherit" }} /></label>
        <label style={{ ...field, display: "flex", gap: 8, alignItems: "center" }}>Au <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: 0, background: "transparent", font: "inherit" }} /></label>
        <button type="button" onClick={exportCsv} disabled={!visible.length} style={{ ...field, background: "#5b3fd6", color: "#fff", border: 0, fontWeight: 700, cursor: visible.length ? "pointer" : "not-allowed", opacity: visible.length ? 1 : .5 }}>
          Exporter
        </button>
      </div>

      <div role="tablist" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {filters.map((f) => {
          const on = status === f.value;
          return (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setStatus(f.value)}
              style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid #ebe8f7", background: on ? "#14142b" : "#fff", color: on ? "#fff" : "#14142b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {!rows.length && <p style={{ color: "#8a8aa3", fontSize: 14, margin: 0 }}>Aucune transaction pour cette application.</p>}
      {rows.length > 0 && !visible.length && <p style={{ color: "#8a8aa3", fontSize: 14, margin: 0 }}>Aucune transaction ne correspond à ce filtre.</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {visible.map((row) => {
          const s = statusStyle[row.status] ?? { bg: "#f0eef8", fg: "#6b6c80" };
          return (
            <button type="button" key={row.transaction_id} onClick={() => setSelected(row.transaction_id)} style={{ display: "flex", justifyContent: "space-between", gap: 12, width: "100%", font: "inherit", textAlign: "left", cursor: "pointer", background: "#fff", borderRadius: 18, padding: "16px 18px", border: "1px solid #f0eef8", boxShadow: "0 1px 0 rgba(20,20,43,.04)" }}>
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <strong style={{ fontSize: 15, color: "#14142b" }}>{row.purpose === "subscription" ? "Abonnement" : "Encaissement"}</strong>
                <span style={{ fontSize: 12, color: "#8a8aa3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.transaction_id}</span>
                <span style={{ fontSize: 12, color: "#8a8aa3" }}>
                  {new Date(row.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div style={{ display: "grid", gap: 6, justifyItems: "end", textAlign: "right", flexShrink: 0 }}>
                <strong style={{ fontSize: 15, color: "#14142b" }}>{fmt(row.amount)} {row.currency_code}</strong>
                {row.purpose !== "subscription" && <span style={{ fontSize: 12, color: "#8a8aa3" }}>Net : {fmt(row.net_payable)}</span>}
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: s.bg, color: s.fg }}>
                  {statusLabel[row.status] ?? row.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {selected && <TransactionDetail transactionId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
