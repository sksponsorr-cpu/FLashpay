"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
const filters: { value: string; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "successful", label: "Réussi" },
  { value: "pending", label: "En attente" },
  { value: "failed", label: "Échoué" },
  { value: "expired", label: "Expiré" },
];

export default function TransactionsList({ appId }: { appId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("transactions")
          .select("transaction_id,amount,currency_code,net_payable,status,purpose,created_at")
          .eq("app_id", appId)
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
    return rows.filter((r) =>
      (status === "all" || r.status === status) &&
      (!q || r.transaction_id.toLowerCase().includes(q))
    );
  }, [rows, status, query]);

  if (error) return <p className="tx-msg tx-error">{error}</p>;
  if (!rows) return <p className="tx-msg">Chargement…</p>;

  return (
    <div className="tx-wrap">
      <input
        className="tx-search"
        type="search"
        placeholder="Rechercher une référence"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="tx-pills" role="tablist">
        {filters.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={status === f.value}
            className={status === f.value ? "tx-pill on" : "tx-pill"}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!rows.length && <p className="tx-msg">Aucune transaction pour cette application.</p>}
      {rows.length > 0 && !visible.length && <p className="tx-msg">Aucune transaction ne correspond à ce filtre.</p>}

      {visible.map((row) => (
        <div className="tx-row" key={row.transaction_id}>
          <div className="tx-main">
            <strong>{row.purpose === "subscription" ? "Abonnement" : "Encaissement"}</strong>
            <span className="tx-ref">{row.transaction_id}</span>
            <span className="tx-date">
              {new Date(row.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="tx-side">
            <strong>{fmt(row.amount)} {row.currency_code}</strong>
            {row.purpose !== "subscription" && <span className="tx-net">Net : {fmt(row.net_payable)}</span>}
            <span className={`tx-badge tx-${row.status}`}>{statusLabel[row.status] ?? row.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
