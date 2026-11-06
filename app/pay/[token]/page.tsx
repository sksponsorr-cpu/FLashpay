"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Link = { label: string; amount: number; currency_code: string; country_name: string; is_active: boolean };

// Opérateurs proposés selon la devise du lien (à valider avec les opérateurs réellement activés).
const operatorsByCurrency: Record<string, string[]> = {
  XAF: ["MTN MoMo", "Orange Money", "Airtel Money"],
  XOF: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"],
  CDF: ["Airtel Money", "Orange Money", "M-Pesa", "Africell Money"],
  KES: ["M-Pesa", "Airtel Money"],
  RWF: ["MTN MoMo", "Airtel Money"],
  GHS: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"],
  NGN: ["Carte bancaire"],
  USD: ["Carte bancaire"],
};

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

const payCss = `
:root{color-scheme:light}
html,body{background:#fffaf8}
.pay-page{min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:radial-gradient(900px 500px at 10% -10%,#ffe3d9 0%,transparent 60%),#fffaf8;color:#17211b}
.pay-card{width:100%;max-width:420px;background:#fff;border:1px solid #f3e3dc;border-radius:24px;padding:26px 22px;box-shadow:0 20px 50px -24px #17211b40;display:grid;gap:14px}
.pay-brand{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:800}
.pay-logo{display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff}
.pay-brand b{color:#e8401f}
.pay-test{justify-self:start;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:#fff4e0;color:#8a5a00}
.pay-card h1{margin:0;font-size:24px;letter-spacing:-.02em;color:#17211b}
.pay-amount{font-size:34px;font-weight:800;color:#17211b}
.pay-amount small{font-size:16px;color:#6b7f74}
.pay-country,.pay-msg{margin:0;color:#6b7f74;font-size:14px}
.pay-form{display:grid;gap:12px;margin-top:6px}
.pay-field{display:grid;gap:6px}
.pay-field span{font-size:13px;font-weight:700;color:#55566a}
.pay-input{min-height:46px;padding:0 14px;border:1px solid #efd9cf;border-radius:14px;background:#fffaf8;color:#17211b;font:inherit}
.pay-btn{min-height:50px;border:0;border-radius:16px;background:#e8401f;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 12px 26px -10px #e8401f99}
.pay-btn:disabled{opacity:.6}
.pay-error{margin:0;color:#c8321a;font-size:14px;font-weight:600}
`;

function PayContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [link, setLink] = useState<Link | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [operator, setOperator] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_payment_link", { p_token: token });
      if (error || !data || data.length === 0) setNotFound(true);
      else setLink(data[0] as Link);
    })();
  }, [token]);

  const operators = link ? (operatorsByCurrency[link.currency_code] ?? []) : [];

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("pay_payment_link", { p_token: token, p_name: name, p_mobile: mobile, p_operator: operator });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("LINK_INACTIVE") ? "Ce lien n’est plus actif." :
        msg.includes("PAYER_REQUIRED") ? "Choisis ton opérateur et indique ton nom et ton numéro." :
        "Le paiement n’a pas pu être effectué."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pay-page">
      <style>{payCss}</style>
      <div className="pay-card">
        <div className="pay-brand"><span className="pay-logo">f</span><span>flash<b>pay</b></span></div>
        {notFound && <p className="pay-msg">Ce lien de paiement n’existe pas.</p>}
        {!notFound && !link && <p className="pay-msg">Chargement…</p>}
        {link && !done && (
          <>
            <span className="pay-test">Mode test · aucun paiement réel</span>
            <h1>{link.label}</h1>
            <div className="pay-amount">{fmt(link.amount)} <small>{link.currency_code}</small></div>
            <p className="pay-country">{link.country_name}</p>
            {!link.is_active ? (
              <p className="pay-msg">Ce lien n’est plus actif.</p>
            ) : (
              <form className="pay-form" onSubmit={pay}>
                <label className="pay-field"><span>Opérateur</span>
                  <select className="pay-input" value={operator} onChange={(e) => setOperator(e.target.value)} required>
                    <option value="">Choisis ton moyen de paiement</option>
                    {operators.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
                <label className="pay-field"><span>Nom</span>
                  <input className="pay-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label className="pay-field"><span>Numéro mobile</span>
                  <input className="pay-input" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                </label>
                {error && <p className="pay-error">{error}</p>}
                <button className="pay-btn" disabled={busy || !operator}>{busy ? "Paiement…" : `Payer ${fmt(link.amount)} ${link.currency_code}`}</button>
              </form>
            )}
          </>
        )}
        {done && (
          <>
            <h1>Paiement enregistré</h1>
            <p className="pay-msg">Le paiement de test a été enregistré. Aucun argent réel n’a été débité.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<main className="pay-page" />}>
      <PayContent />
    </Suspense>
  );
}
