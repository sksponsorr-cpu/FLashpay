"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Invoice = { number: string; issued_at: string; seller: string; seller_website: string | null; transaction_id: string; payment_method: string | null; country_code: string; amount: number; fee_amount: number | null; currency_code: string };

// Facture imprimable (Imprimer → PDF). Visible par le propriétaire et les membres de l'application.
export default function InvoicePage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invoices/${encodeURIComponent(transactionId)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.message); setInvoice(j.invoice); })
      .catch((e) => setError(e instanceof Error ? e.message : "Facture indisponible."));
  }, [transactionId]);

  if (error) return <main style={{ padding: 24, fontFamily: "system-ui" }}><p>{error}</p></main>;
  if (!invoice) return <main style={{ padding: 24, fontFamily: "system-ui" }}><p>Chargement de la facture…</p></main>;

  const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: 32, fontFamily: "system-ui", color: "#17162b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div><strong style={{ fontSize: 20 }}>{invoice.seller}</strong>{invoice.seller_website && <div style={{ color: "#7a7590", fontSize: 14 }}>{invoice.seller_website}</div>}</div>
        <div style={{ textAlign: "right" }}><strong style={{ fontSize: 20 }}>Facture</strong><div style={{ fontSize: 14 }}>{invoice.number}</div><div style={{ color: "#7a7590", fontSize: 13 }}>{new Date(invoice.issued_at).toLocaleDateString("fr-FR")}</div></div>
      </div>
      <table style={{ width: "100%", marginTop: 28, borderCollapse: "collapse", fontSize: 14 }}>
        <thead><tr style={{ textAlign: "left", borderBottom: "1px solid #ebe7f6", color: "#7a7590" }}><th style={{ padding: "10px 0" }}>Description</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #ebe7f6" }}><td style={{ padding: "12px 0" }}>Paiement — {invoice.payment_method ?? "mobile money"} ({invoice.country_code})<div style={{ color: "#7a7590", fontSize: 12 }}>Réf. {invoice.transaction_id}</div></td><td style={{ textAlign: "right" }}>{fmt(Number(invoice.amount))} {invoice.currency_code}</td></tr>
          {Number(invoice.fee_amount ?? 0) > 0 && <tr style={{ borderBottom: "1px solid #ebe7f6" }}><td style={{ padding: "12px 0" }}>Frais</td><td style={{ textAlign: "right" }}>{fmt(Number(invoice.fee_amount))} {invoice.currency_code}</td></tr>}
        </tbody>
      </table>
      <p style={{ marginTop: 18, textAlign: "right", fontSize: 16 }}><strong>Total : {fmt(Number(invoice.amount) + Number(invoice.fee_amount ?? 0))} {invoice.currency_code}</strong></p>
      <p style={{ marginTop: 24, color: "#2fbf7f", fontWeight: 700 }}>Paiement confirmé</p>
      <button onClick={() => window.print()} style={{ marginTop: 18, width: "100%", minHeight: 46, border: 0, borderRadius: 14, background: "#5b3fd6", color: "#fff", fontWeight: 700, cursor: "pointer" }}>Imprimer / enregistrer en PDF</button>
    </main>
  );
}
