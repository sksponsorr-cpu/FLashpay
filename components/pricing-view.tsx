"use client";

// Tarification : formules et frais, mise en page compacte et autonome.
const plans = [
  { name: "Sans abonnement", rate: "6 %", note: "Par encaissement, sans engagement." },
  { name: "Basic", rate: "1 %", note: "Sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %.", featured: true },
  { name: "Premium", rate: "1 %", note: "Jusqu’à 500 000 FCFA encaissés par mois, puis 6 %." },
];

export default function PricingView() {
  return (
    <div style={{ display: "grid", gap: 18 }}>
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
      <div style={{ background: "#f4f1ff", borderRadius: 18, padding: "16px 20px", display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 15, color: "#14142b" }}>Le client paie 2,5 % en plus</strong>
        <span style={{ fontSize: 14, color: "#6b6c80", lineHeight: 1.5 }}>
          Ce supplément est affiché à ton client au moment du paiement. Il ne réduit pas ce que tu reçois.
        </span>
      </div>
    </div>
  );
}
