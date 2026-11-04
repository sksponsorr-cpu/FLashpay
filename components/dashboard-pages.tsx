"use client";

import { useState } from "react";
import { Download, Percent, Search } from "lucide-react";
import { SUPPORTED_COUNTRIES } from "@/lib/countries";

// Tarification : frais FlashPay tels qu'annoncés sur l'accueil.
export function TarificationView() {
  const [query, setQuery] = useState("");
  const rows = SUPPORTED_COUNTRIES.filter((c) =>
    `${c.name} ${c.code} ${c.currency}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <section className="workspace-view">
      <div className="view-intro"><span className="view-icon"><Percent size={19} /></span><div><h2>Tarification</h2><p>Les frais appliqués par pays.</p></div></div>
      <div className="page-search"><Search size={18} /><input type="search" placeholder="Rechercher un pays…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <article className="panel">
        <div className="table-scroll"><table>
          <thead><tr><th>Pays</th><th>Devise</th><th>Encaissement</th><th>Décaissement</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code}><td>{c.name}</td><td>{c.currency}</td><td>6 % + 2,5 % de traitement</td><td>Commission 6 %</td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4}>Aucun pays trouvé.</td></tr>}
          </tbody>
        </table></div>
      </article>
    </section>
  );
}

// Retraits : demandes de retrait du marchand.
export function RetraitsView() {
  const [query, setQuery] = useState("");
  const withdrawals: { reference: string; date: string; amount: number; status: string }[] = [];
  const shown = withdrawals.filter((w) => w.reference.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section className="workspace-view">
      <div className="view-intro"><span className="view-icon"><Download size={19} /></span><div><h2>Retraits</h2><p>Retire le solde de ton portefeuille vers un compte bancaire ou mobile money.</p></div></div>
      <button className="primary-button page-primary" type="button">+ Demander un retrait</button>
      <div className="page-search"><Search size={18} /><input type="search" placeholder="Rechercher par référence…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <article className="panel">
        <div className="table-scroll"><table>
          <thead><tr><th>Référence</th><th>Demandé le</th><th>Montant</th><th>Statut</th></tr></thead>
          <tbody>
            {shown.map((w) => (
              <tr key={w.reference}><td>{w.reference}</td><td>{w.date}</td><td>{w.amount} FCFA</td><td>{w.status}</td></tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={4}>Aucun retrait pour le moment.</td></tr>}
          </tbody>
        </table></div>
      </article>
    </section>
  );
}
