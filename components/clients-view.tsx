"use client";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type Tx = { transaction_id: string; amount: number; currency_code: string; country_code: string; status: string; customer_name: string | null; customer_phone: string | null; created_at: string };
type Client = { key: string; name: string; phone: string; country: string; count: number; successful: number; total: Record<string, number>; last: string; txs: Tx[] };

const STATUS_LABEL: Record<string, string> = { successful: "Réussi", pending: "En attente", failed: "Échoué" };

// Clients de l'application : les payeurs, regroupés par numéro de téléphone. Un clic ouvre le détail.
export default function ClientsView({ appId }: { appId: string }) {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

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
      const c = map.get(key) ?? { key, name: t.customer_name || "—", phone: t.customer_phone || "—", country: t.country_code, count: 0, successful: 0, total: {} as Record<string, number>, last: t.created_at, txs: [] };
      c.count += 1;
      c.txs.push(t);
      if (t.status === "successful") { c.successful += 1; c.total[t.currency_code] = (c.total[t.currency_code] ?? 0) + Number(t.amount); }
      if (t.created_at > c.last) c.last = t.created_at;
      if (c.name === "—" && t.customer_name) c.name = t.customer_name;
      map.set(key, c);
    }
    return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [txs]);

  const shown = clients.filter((c) => (c.name + c.phone).toLowerCase().includes(query.trim().toLowerCase()));
  const selected = clients.find((c) => c.key === selectedKey) ?? null;
  const th: CSSProperties = { textAlign: "left", padding: "10px 8px", fontSize: 12, color: "#8a8aa3", fontWeight: 700 };
  const td: CSSProperties = { padding: "12px 8px", borderTop: "1px solid #f1eff7", fontSize: 14 };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher par nom ou téléphone" style={{ flex: 1, minWidth: 200, minHeight: 44, border: "1px solid #e4e1ef", borderRadius: 14, padding: "0 14px", font: "inherit" }} />
        <a href={`/releve?app=${encodeURIComponent(appId)}`} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 14, background: "#e8472a", color: "#fff", fontWeight: 700, textDecoration: "none" }}>Relevé imprimable</a>
      </div>

      {selected && (
        <section style={{ border: "1px solid #e4e1ef", borderRadius: 18, padding: 16, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <strong style={{ fontSize: 16 }}>{selected.name}</strong>
            <button type="button" onClick={() => setSelectedKey(null)} style={{ border: 0, background: "none", color: "#e8472a", fontWeight: 700, cursor: "pointer" }}>Fermer</button>
          </div>
          <div style={{ fontSize: 14, color: "#55566a", display: "grid", gap: 4 }}>
            <span>Téléphone : {selected.phone}</span>
            <span>Pays : {selected.country}</span>
            <span>Paiements réussis : {selected.successful} / {selected.count}</span>
            <span>Total réussi : {Object.entries(selected.total).map(([cur, v]) => `${Number(v).toLocaleString("fr-FR")} ${cur}`).join(" · ") || "—"}</span>
            <span>Dernier paiement : {new Date(selected.last).toLocaleString("fr-FR")}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Date</th><th style={th}>Montant</th><th style={th}>Statut</th><th style={th}>Référence</th></tr></thead>
              <tbody>
                {selected.txs.map((t) => (
                  <tr key={t.transaction_id}>
                    <td style={td}>{new Date(t.created_at).toLocaleDateString("fr-FR")}</td>
                    <td style={td}>{Number(t.amount).toLocaleString("fr-FR")} {t.currency_code}</td>
                    <td style={td}>{STATUS_LABEL[t.status] ?? t.status}</td>
                    <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{t.transaction_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading ? <p style={{ color: "#8a8aa3", fontSize: 14 }}>Chargement…</p> : shown.length === 0 ? <p style={{ color: "#8a8aa3", fontSize: 14 }}>Aucun client pour le moment.</p> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={th}>Client</th><th style={th}>Téléphone</th><th style={th}>Pays</th><th style={th}>Paiements</th><th style={th}>Total réussi</th><th style={th}>Dernier</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.key} onClick={() => setSelectedKey(c.key)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") setSelectedKey(c.key); }}
                    style={{ cursor: "pointer", background: selectedKey === c.key ? "#fdf3f0" : undefined }}>
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
