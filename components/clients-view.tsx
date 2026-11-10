"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { customer_name: string | null; customer_phone: string | null; amount: number; currency_code: string; status: string; created_at: string };
type Client = { phone: string; name: string; count: number; successful: number; totals: Record<string, number>; last: string };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

export default function ClientsView({ appId }: { appId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: queryError } = await createClient()
          .from("transactions")
          .select("customer_name,customer_phone,amount,currency_code,status,created_at")
          .eq("app_id", appId)
          .eq("environment", "live")
          .not("customer_phone", "is", null)
          .order("created_at", { ascending: false })
          .limit(5000);
        if (queryError) throw queryError;
        if (!cancelled) setRows((data ?? []) as Row[]);
      } catch {
        if (!cancelled) setError("Impossible de charger les clients.");
      }
    })();
    return () => { cancelled = true; };
  }, [appId]);

  const clients = useMemo(() => {
    const map = new Map<string, Client>();
    for (const r of rows ?? []) {
      if (!r.customer_phone) continue;
      const c = map.get(r.customer_phone) ?? { phone: r.customer_phone, name: r.customer_name ?? "", count: 0, successful: 0, totals: {}, last: r.created_at };
      c.count += 1;
      if (r.status === "successful") {
        c.successful += 1;
        c.totals[r.currency_code] = (c.totals[r.currency_code] ?? 0) + Number(r.amount);
      }
      if (!c.name && r.customer_name) c.name = r.customer_name;
      map.set(r.customer_phone, c);
    }
    return Array.from(map.values()).sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [rows]);

  const visible = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    return !q || c.phone.includes(q) || c.name.toLowerCase().includes(q);
  });

  if (error) return <p className="tx-msg tx-error">{error}</p>;
  if (!rows) return <p className="tx-msg">Chargement…</p>;

  return (
    <div className="tx-wrap">
      <input className="tx-search" type="search" placeholder="Rechercher par nom ou téléphone" value={query} onChange={(e) => setQuery(e.target.value)} />
      {visible.length === 0 && <p className="tx-msg">Aucun client pour le moment. Les clients apparaissent après leur premier paiement.</p>}
      {visible.map((c) => (
        <div className="tx-row" key={c.phone}>
          <div className="tx-main">
            <strong>{c.name || "Client sans nom"}</strong>
            <span className="tx-ref">{c.phone}</span>
            <span className="tx-date">Dernier paiement : {new Date(c.last).toLocaleString("fr-FR")}</span>
          </div>
          <div className="tx-side">
            <span className="tx-net">{c.successful} réussi(s) / {c.count}</span>
            {Object.entries(c.totals).map(([cur, total]) => (
              <strong key={cur}>{fmt(total)} {cur}</strong>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
