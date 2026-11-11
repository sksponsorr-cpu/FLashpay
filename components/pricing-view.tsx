"use client";

import { useState } from "react";
import { FEE_SCHEDULE, FLASHPAY_MARGIN_POINTS, clientRate } from "@/lib/fee-schedule";

// Formules Flash Pay (inchangées).
const plans = [
  { name: "Sans abonnement", rate: "6 %", note: "Par encaissement, sans engagement." },
  { name: "Basic", rate: "1 %", note: "Sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %.", featured: true },
  { name: "Premium", rate: "1 %", note: "Jusqu’à 500 000 FCFA encaissés par mois, puis 6 %." },
];

export default function PricingView() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              background: "#fff",
              borderRadius: 22,
              padding: "20px 22px",
              border: p.featured ? "1.5px solid #5b3fd6" : "1px solid #f0eef8",
              boxShadow: p.featured ? "0 14px 34px rgba(91,63,214,.14)" : "0 1px 0 rgba(20,20,43,.04), 0 10px 28px rgba(20,20,43,.05)",
              display: "grid",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: p.featured ? "#5b3fd6" : "#8a8aa3", letterSpacing: ".04em", textTransform: "uppercase" }}>{p.name}</span>
            <strong style={{ fontSize: 32, fontWeight: 700, color: "#14142b", letterSpacing: "-.02em" }}>{p.rate}</strong>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#6b6c80" }}>{p.note}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#14142b", letterSpacing: "-.01em" }}>Frais par pays et par réseau</h2>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#8a8aa3", lineHeight: 1.5 }}>
          Le client paie ces frais en plus du montant. Marge Flash Pay incluse : +{FLASHPAY_MARGIN_POINTS} point.
        </p>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {FEE_SCHEDULE.map((c, i) => {
          const isOpen = open === i;
          return (
            <div
              key={`${c.country}-${c.currency}`}
              style={{
                background: "#fff",
                borderRadius: 18,
                border: "1px solid #f0eef8",
                boxShadow: "0 1px 0 rgba(20,20,43,.04), 0 10px 28px rgba(20,20,43,.05)",
                overflow: "hidden",
                transition: "box-shadow .35s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "16px 20px",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "grid", gap: 2 }}>
                  <strong style={{ fontSize: 15, color: "#14142b" }}>{c.country}</strong>
                  <span style={{ fontSize: 12, color: "#8a8aa3" }}>{c.currency} · {c.networks.length} réseau{c.networks.length > 1 ? "x" : ""}</span>
                </span>
                <span
                  aria-hidden
                  style={{
                    display: "grid",
                    width: 28,
                    height: 28,
                    placeItems: "center",
                    borderRadius: "50%",
                    background: "#f4f1ff",
                    color: "#5b3fd6",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    transition: "transform .4s cubic-bezier(.2,.8,.2,1)",
                  }}
                >
                  ▾
                </span>
              </button>

              <div
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows .45s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div style={{ overflow: "hidden" }}>
                  <div style={{ padding: "0 20px 16px", display: "grid", gap: 8 }}>
                    {c.networks.map((n) => (
                      <div
                        key={n.network}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 4,
                          alignItems: "center",
                          padding: "12px 14px",
                          borderRadius: 14,
                          background: "#faf9fd",
                        }}
                      >
                        <span style={{ fontSize: 14, color: "#14142b", fontWeight: 600 }}>{n.network}</span>
                        <strong style={{ fontSize: 15, color: "#5b3fd6", textAlign: "right" }}>
                          {clientRate(n.percent)}
                          {n.extra ? <span style={{ color: "#6b6c80", fontWeight: 500 }}> {n.extra}</span> : null}
                        </strong>
                        <span style={{ fontSize: 12, color: "#8a8aa3" }}>Frais minimum : {n.minimum}</span>
                        <span style={{ fontSize: 12, color: "#8a8aa3", textAlign: "right" }}>SasPay {n.percent.toString().replace(".", ",")} %{n.extra ? ` ${n.extra}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#f4f1ff", borderRadius: 18, padding: "16px 20px", display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 15, color: "#14142b" }}>Le client paie les frais en plus</strong>
        <span style={{ fontSize: 14, color: "#6b6c80", lineHeight: 1.5 }}>
          Ce supplément est affiché à ton client au moment du paiement. Il ne réduit pas ce que tu reçois.
        </span>
      </div>
    </div>
  );
}
