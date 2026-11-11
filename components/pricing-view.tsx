"use client";

import { useState } from "react";
import { FEE_SCHEDULE, clientRate } from "@/lib/fee-schedule";
import { routeProvider } from "@/lib/payment-routing";

// Code pays ISO pour chaque nom affiché, afin d'appliquer le même routage que les liens de paiement.
const ISO_BY_NAME: Record<string, string> = {
  "République démocratique du Congo": "CD",
  "Congo-Brazzaville": "CG",
  Cameroun: "CM",
  "Côte d’Ivoire": "CI",
  "Burkina Faso": "BF",
  Bénin: "BJ",
  Mali: "ML",
  Ghana: "GH",
  Kenya: "KE",
  Nigeria: "NG",
  Rwanda: "RW",
  Sénégal: "SN",
  Tanzanie: "TZ",
  Ouganda: "UG",
  "Sierra Leone": "SL",
  Togo: "TG",
  Zambie: "ZM",
};

function modeLabel(countryName: string): string {
  const iso = ISO_BY_NAME[countryName];
  if (!iso) return "Lien de paiement";
  return routeProvider(iso) === "saspay" ? "Paiement direct" : "Lien de paiement";
}

export default function PricingView() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "grid", gap: 4 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#14142b", letterSpacing: "-.01em" }}>Frais par pays et par réseau</h2>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#8a8aa3", lineHeight: 1.5 }}>
          Frais appliqués à chaque encaissement selon le pays et le réseau de paiement.
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
                  <span style={{ fontSize: 12, color: "#8a8aa3" }}>{c.currency} · {c.networks.length} réseau{c.networks.length > 1 ? "x" : ""} · {modeLabel(c.country)}</span>
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
                        {n.minimum ? <span style={{ fontSize: 12, color: "#8a8aa3" }}>Frais minimum : {n.minimum}</span> : <span />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
