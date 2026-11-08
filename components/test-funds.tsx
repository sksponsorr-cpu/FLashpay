"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Ajout de fonds de TEST : visible uniquement pour un compte NON vérifié.
// Aucun argent réel n'est impliqué.
type Country = { code: string; name: string; currency_code: string };

export default function TestFunds({ appId }: { appId: string }) {
  const [checked, setChecked] = useState(false); // statut du compte connu ?
  const [verified, setVerified] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState("CM");
  const [amount, setAmount] = useState("5000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: prof } = await supabase.from("profiles").select("verification_status").maybeSingle();
      if (!alive) return;
      setVerified(prof?.verification_status === "verified");
      setChecked(true);
      if (prof?.verification_status === "verified") return;
      const { data } = await supabase.from("supported_countries").select("code,name,currency_code").order("name");
      if (alive && data) setCountries(data as Country[]);
    })();
    return () => { alive = false; };
  }, []);

  async function addFunds() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("add_test_funds", { p_app_id: appId, p_country: country, p_amount: Number(amount) });
      if (error) throw error;
      setMessage("Fonds de test ajoutés. Le portefeuille est mis à jour.");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible d'ajouter les fonds de test.");
    } finally {
      setBusy(false);
    }
  }

  // Tant que le statut n'est pas connu, on n'affiche rien : évite le clignotement.
  if (!checked || verified) return null;

  return (
    <section className="dash-card test-funds">
      <div>
        <h2>Fonds de test</h2>
        <p className="dash-muted">Simule un encaissement réussi pour voir ton portefeuille. Aucun paiement réel.</p>
      </div>
      <div className="row">
        <select aria-label="Pays" value={country} onChange={(e) => setCountry(e.target.value)}>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.currency_code})</option>)}
        </select>
        <input aria-label="Montant" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button className="primary-button" disabled={busy} onClick={() => void addFunds()}>Ajouter</button>
      </div>
      {message && <p className="dash-muted" role="status">{message}</p>}
    </section>
  );
}
