"use client";
import { useEffect, useState } from "react";

// Bascule entre les fournisseurs de paiement. Les nouveaux paiements suivent le choix actif.
const labels: Record<string, { title: string; text: string }> = {
  swychr: { title: "Swychr / AccountPe", text: "Lien de paiement hébergé : le client est redirigé." },
  saspay: { title: "SasPay", text: "Paiement direct : le client valide sur son téléphone, sans quitter FlashPay." },
};

export default function PaymentProviderSwitch() {
  const [active, setActive] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    (async () => {
      const response = await fetch("/api/admin/payment-provider", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) setActive(result.provider);
      else setNotice(result.message ?? "Impossible de charger le réglage.");
    })();
  }, []);

  async function choose(provider: string) {
    if (provider === active || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/payment-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Action refusée.");
      setActive(result.provider);
      setNotice(`Fournisseur actif : ${labels[provider]?.title ?? provider}. Les nouveaux paiements l’utiliseront.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Action refusée.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 12, padding: 16, borderRadius: 16, background: "#fff", border: "1px solid #ebe8f7" }}>
      <strong>Fournisseur de paiement</strong>
      <p style={{ margin: 0, fontSize: 13, color: "#6b6c80" }}>
        Choisis le fournisseur qui traite les nouveaux paiements. Les paiements déjà lancés ne changent pas.
      </p>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        {Object.entries(labels).map(([id, info]) => (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => void choose(id)}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: 14,
              cursor: busy ? "wait" : "pointer",
              border: active === id ? "2px solid #5b3fd6" : "1px solid #ebe8f7",
              background: active === id ? "#f8f6ff" : "#fff",
            }}
          >
            <strong style={{ display: "block", fontSize: 14 }}>
              {info.title} {active === id ? "· actif" : ""}
            </strong>
            <span style={{ fontSize: 12, color: "#6b6c80" }}>{info.text}</span>
          </button>
        ))}
      </div>
      {notice && <p role="status" style={{ margin: 0, fontSize: 13, color: "#55566a" }}>{notice}</p>}
    </section>
  );
}
