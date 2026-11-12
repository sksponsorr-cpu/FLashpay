"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

// Fiche détaillée d'une transaction, ouverte depuis la liste. Feuille animée depuis le bas.
type Tx = {
  transaction_id: string;
  amount: number;
  currency_code: string;
  net_payable?: number | null;
  processing_fee?: number | null;
  status: string;
  purpose?: string | null;
  created_at: string;
  country_code?: string | null;
  payment_method?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const statusLabel: Record<string, string> = { pending: "En attente", successful: "Réussi", failed: "Échoué", expired: "Expiré", cancelled: "Annulé" };
const statusStyle: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fff4e0", fg: "#8a5a00" },
  successful: { bg: "#e7f7ef", fg: "#0f7a47" },
  failed: { bg: "#fdecea", fg: "#c8321a" },
  expired: { bg: "#f0eef8", fg: "#6b6c80" },
  cancelled: { bg: "#f0eef8", fg: "#6b6c80" },
};

const CSS = `
.td-back{position:fixed;inset:0;z-index:120;background:rgba(20,20,43,.35);backdrop-filter:blur(3px);animation:td-fade .25s ease both}
.td-sheet{position:fixed;z-index:130;left:0;right:0;bottom:0;max-height:88vh;overflow-y:auto;background:#fff;border-radius:26px 26px 0 0;padding:14px 20px calc(24px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 50px rgba(20,20,43,.18);animation:td-up .42s cubic-bezier(.2,.8,.2,1) both}
@media(min-width:720px){.td-sheet{left:50%;right:auto;bottom:50%;width:min(520px,calc(100vw - 40px));max-height:84vh;transform:translate(-50%,50%);border-radius:26px;animation:td-pop .3s cubic-bezier(.2,.8,.2,1) both}}
.td-grab{width:40px;height:4px;margin:0 auto 14px;border-radius:99px;background:#e0ddea}
.td-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}
.td-head h2{margin:0;font-size:20px;color:#14142b}
.td-x{width:36px;height:36px;border:0;border-radius:50%;background:#f4f1ff;color:#5b3fd6;font-size:20px;cursor:pointer}
.td-amount{margin:4px 0 12px;font-size:30px;font-weight:800;color:#14142b;letter-spacing:-.02em}
.td-pill{display:inline-flex;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700}
.td-list{margin:16px 0 0;display:grid;gap:0}
.td-row{display:flex;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #f1eff7;font-size:14px}
.td-row dt{color:#8a8aa3}
.td-row dd{margin:0;color:#14142b;font-weight:600;text-align:right;overflow-wrap:anywhere}
.td-sec{margin:18px 0 4px;color:#8a8aa3;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
@keyframes td-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes td-pop{from{opacity:0;transform:translate(-50%,50%) scale(.96)}to{opacity:1;transform:translate(-50%,50%)}}
@keyframes td-fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.td-back,.td-sheet{animation:none!important}}
`;

export default function TransactionDetail({ transactionId, onClose }: { transactionId: string; onClose: () => void }) {
  const [tx, setTx] = useState<Tx | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: queryError } = await createClient()
        .from("transactions")
        .select("*")
        .eq("transaction_id", transactionId)
        .maybeSingle();
      if (!alive) return;
      if (queryError || !data) setError("Impossible de charger cette transaction.");
      else setTx(data as Tx);
    })();
    return () => { alive = false; };
  }, [transactionId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const s = tx ? statusStyle[tx.status] ?? { bg: "#f0eef8", fg: "#6b6c80" } : null;
  const rows: [string, string | null | undefined][] = tx
    ? [
        ["Référence", tx.transaction_id],
        ["Date", new Date(tx.created_at).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })],
        ["Type", tx.purpose === "subscription" ? "Abonnement" : "Encaissement"],
        ["Pays", tx.country_code],
        ["Réseau", tx.payment_method],
      ]
    : [];
  const money: [string, string | null | undefined][] = tx
    ? [
        ["Montant", tx.amount != null ? `${fmt(tx.amount)} ${tx.currency_code}` : null],
        ["Frais", tx.processing_fee != null ? `${fmt(tx.processing_fee)} ${tx.currency_code}` : null],
        ["Net à recevoir", tx.net_payable != null ? `${fmt(tx.net_payable)} ${tx.currency_code}` : null],
      ]
    : [];
  const client: [string, string | null | undefined][] = tx
    ? [
        ["Nom", tx.customer_name],
        ["Téléphone", tx.customer_phone],
        ["E-mail", tx.customer_email],
      ]
    : [];

  const Rows = ({ items }: { items: [string, string | null | undefined][] }) => (
    <dl className="td-list" style={{ margin: 0 }}>
      {items.filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
        <div className="td-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
      ))}
    </dl>
  );

  // Rendue directement dans <body> : évite qu'un parent (transform, overflow) ne masque la feuille.
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <style>{CSS}</style>
      <div className="td-back" onClick={onClose} aria-hidden />
      <div className="td-sheet" role="dialog" aria-modal="true" aria-label="Détail de la transaction">
        <div className="td-grab" />
        {error && <p style={{ color: "#c8321a" }}>{error}</p>}
        {!tx && !error && <p style={{ color: "#8a8aa3" }}>Chargement…</p>}
        {tx && s && (
          <>
            <div className="td-head">
              <h2>{tx.purpose === "subscription" ? "Abonnement" : "Encaissement"}</h2>
              <button className="td-x" onClick={onClose} aria-label="Fermer">×</button>
            </div>
            <div className="td-amount">{fmt(tx.amount)} {tx.currency_code}</div>
            <span className="td-pill" style={{ background: s.bg, color: s.fg }}>{statusLabel[tx.status] ?? tx.status}</span>
            <div className="td-sec">Détails</div>
            <Rows items={rows} />
            <div className="td-sec">Montants</div>
            <Rows items={money} />
            <div className="td-sec">Client</div>
            <Rows items={client} />
            {tx?.status === "successful" && tx.transaction_id && (
              <a href={`/facture/${encodeURIComponent(tx.transaction_id)}`} target="_blank" rel="noopener" style={{ display: "block", marginTop: 16, textAlign: "center", minHeight: 46, lineHeight: "46px", borderRadius: 14, background: "#e8472a", color: "#fff", fontWeight: 700, textDecoration: "none" }}>
                Voir la facture
              </a>
            )}
          </>
        )}
      </div>
    </>,
    document.body
  );
}
