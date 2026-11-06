"use client";
import { useEffect, useState } from "react";

type Movement = { id: string; currency_code: string; kind: string; amount: number; created_at: string };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const dateFmt = (v: string) =>
  new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function WithdrawalsView({ appId, onNew }: { appId: string; onNew: () => void }) {
  const [tab, setTab] = useState<"list" | "methods">("list");
  const [items, setItems] = useState<Movement[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch(`/api/wallet?app=${encodeURIComponent(appId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? "Impossible de charger les retraits.");
        if (alive) setItems((result.movements as Movement[]).filter((m) => m.kind === "withdrawal"));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Impossible de charger les retraits.");
      }
    })();
    return () => { alive = false; };
  }, [appId]);

  return (
    <section className="wd-wrap">

      <div className="dev-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "list"} className={tab === "list" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("list")}>Retraits</button>
        <button role="tab" aria-selected={tab === "methods"} className={tab === "methods" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("methods")}>Méthodes de retrait</button>
      </div>

      {tab === "list" && (
        <div className="dash-card wd-card">
          <button className="primary-button" onClick={onNew}>+ Demander un retrait</button>
          <p className="dash-muted wd-hint">Choisis le portefeuille, puis « Retirer ».</p>
          {error && <p className="dash-muted">{error}</p>}
          {!error && items.length === 0 && <p className="dash-muted">Aucun retrait pour le moment.</p>}
          {items.map((m) => (
            <div className="wd-row" key={m.id}>
              <div>
                <strong>Retrait {m.currency_code}</strong>
                <span className="dash-muted">{dateFmt(m.created_at)}</span>
              </div>
              <strong>{fmt(Math.abs(m.amount))} {m.currency_code}</strong>
            </div>
          ))}
        </div>
      )}

      {tab === "methods" && (
        <div className="dash-card">
          <strong>Bientôt disponible</strong>
          <p className="dash-muted">L’enregistrement de comptes de retrait n’est pas encore activé. Pour l’instant, les retraits sont traités manuellement par FlashPay.</p>
        </div>
      )}
    </section>
  );
}
