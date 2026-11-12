"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Receipt = {
  transaction_id: string; amount: number; fee_amount: number | null; currency_code: string;
  payment_method: string | null; country_code: string; created_at: string; merchant_label: string;
};

// Reçu imprimable d'un paiement réussi (à enregistrer en PDF via « Imprimer »).
export default function ReceiptPage() {
  const { token } = useParams<{ token: string }>();
  const tx = useSearchParams().get("tx") ?? "";
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/pay/${encodeURIComponent(token)}/receipt?tx=${encodeURIComponent(tx)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); setReceipt(j.receipt); })
      .catch((e) => setError(e instanceof Error ? e.message : "Reçu indisponible."));
  }, [token, tx]);

  if (error) return <main style={{ padding: 24, fontFamily: "system-ui" }}><p>{error}</p></main>;
  if (!receipt) return <main style={{ padding: 24, fontFamily: "system-ui" }}><p>Chargement du reçu…</p></main>;

  const total = Number(receipt.amount) + Number(receipt.fee_amount ?? 0);
  const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui", color: "#17162b" }}>
      <p style={{ margin: 0, fontWeight: 800, color: "#5b3fd6" }}>flashpay</p>
      <h1 style={{ fontSize: 22, margin: "16px 0 4px" }}>Reçu de paiement</h1>
      <p style={{ margin: 0, color: "#7a7590", fontSize: 14 }}>{receipt.merchant_label}</p>
      <div style={{ marginTop: 18, borderTop: "1px solid #ebe7f6" }}>
        {[
          ["Date", new Date(receipt.created_at).toLocaleString("fr-FR")],
          ["Référence", receipt.transaction_id],
          ["Moyen de paiement", receipt.payment_method ?? "—"],
          ["Pays", receipt.country_code],
          ["Montant", `${fmt(Number(receipt.amount))} ${receipt.currency_code}`],
          ["Frais", `${fmt(Number(receipt.fee_amount ?? 0))} ${receipt.currency_code}`],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #ebe7f6", fontSize: 14 }}>
            <span style={{ color: "#7a7590" }}>{label}</span><strong style={{ textAlign: "right", overflowWrap: "anywhere" }}>{value}</strong>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 16 }}>
          <span>Total payé</span><strong style={{ color: "#5b3fd6" }}>{fmt(total)} {receipt.currency_code}</strong>
        </div>
      </div>
      <p style={{ marginTop: 18, color: "#2fbf7f", fontWeight: 700 }}>Paiement confirmé</p>
      <button onClick={() => window.print()} style={{ marginTop: 18, width: "100%", minHeight: 46, border: 0, borderRadius: 14, background: "#5b3fd6", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Imprimer / enregistrer en PDF</button>
    </main>
  );
}
