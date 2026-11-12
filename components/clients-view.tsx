"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type Tx = { transaction_id: string; amount: number; currency_code: string; country_code: string; status: string; customer_name: string | null; customer_phone: string | null; created_at: string };
type Client = { key: string; name: string; phone: string; country: string; count: number; successful: number; total: Record<string, number>; last: string };

// Clients de l'application : les payeurs, regroupés par numéro de téléphone.
export default function ClientsView({ appId }: { appId: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    createClient().from("transactions")
      .select("transaction_id, amount, currency_code, country_code, status, customer_name, customer_phone, created_at")
      .eq("app_id", appId).order("created_at", { ascending: false }).limit(1000)
      .then(({ data }) => { if (alive) { setTxs((data as Tx[]) ?? []); setLoading(false); } });
    return () => { alive = false; };
  }, [appId]);

  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Client>();
    for (const t of txs) {
      const key = t.customer_phone || t.transaction_id;
      const c = map.get(key) ?? { key, name: t.customer_name || "—", phone: t.customer_phone || "—", country: t.country_code, count: 0, successful: 0, total: {} as Record<string, number>, last: t.created_at };
      c.count += 1;
      if (t.status === "successful") { c.successful += 1; c.total[t.currency_code] = (c.total[t.currency_code] ?? 0) + Number(t.amount); }
      if (t.created_at > c.last) c.last = t.created_at;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [txs]);

  const shown = clients.filter((c) => (c.name + c.phone).toLowerCase().includes(query.trim().toLowerCase()));
  const th: CSSProperties = { textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#8a8aa3", fontWeight: 700 };
  const td: CSSProperties = { padding: "12px 8px", borderTop: "1px solid #f1eff7", fontSize: 14 };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou téléphone" style={{ flex: 1, minWidth: 200, minHeight: 44, border: "1px solid #e4e1ef", borderRadius: 14, padding: "0 14px", font: "inherit" }} />
        <a href={`/releve?app=${encodeURIComponent(appId)}`} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 14, background: "#e8472a", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Relevé imprimable</a>
      </div>
      {loading ? <p style={{ color: "#8a8aa3", fontSize: 14 }}>Chargement…</p> : shown.length === 0 ? <p style={{ color: "#8a8aa3", fontSize: 14 }}>Aucun client pour le moment.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Client</th><th style={th}>Téléphone</th><th style={th}>Pays</th><th style={th}>Paiements</th><th style={th}>Total réussi</th><th style={th}>Dernier</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.key}>
                  <td style={td}><strong>{c.name}</strong></td>
                  <td style={td}>{c.phone}</td>
                  <td style={td}>{c.country}</td>
                  <td style={td}>{c.successful} / {c.count}</td>
                  <td style={td}>{Object.entries(c.total).map(([cur, v]) => `${Number(v).toLocaleString("fr-FR")} ${cur}`).join(" · ") || "—"}</td>
                  <td style={td}>{new Date(c.last).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
