"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Ajout manuel d'un portefeuille pour une application et une devise.
const CURRENCIES = ["XOF", "XAF", "CDF", "NGN", "GHS", "KES", "RWF", "USD"];

export default function AddWallet({ appId, onAdded }: { appId: string; onAdded?: () => void }) {
  const [currency, setCurrency] = useState("XOF");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function add() {
    setBusy(true); setMsg("");
    const { error } = await createClient().rpc("add_wallet", { p_app_id: appId, p_currency: currency });
    setBusy(false);
    if (error) return setMsg("Impossible d’ajouter ce portefeuille.");
    setMsg("Portefeuille ajouté.");
    onAdded?.();
  }

  return (
    <section style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Devise" style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ebe8f7" }}>
        {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <button type="button" onClick={() => void add()} disabled={busy} style={{ padding: "10px 16px", borderRadius: 12, border: 0, background: "#5b3fd6", color: "#fff", fontWeight: 700 }}>
        Ajouter un portefeuille
      </button>
      {msg && <span role="status" style={{ fontSize: 13, color: "#55566a" }}>{msg}</span>}
    </section>
  );
}
