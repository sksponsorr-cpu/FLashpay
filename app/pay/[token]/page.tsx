"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Link = { label: string; amount: number; currency_code: string; country_name: string; is_active: boolean };
const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

function PayContent() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [link, setLink] = useState<Link | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
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

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("pay_payment_link", { p_token: token, p_name: name, p_mobile: mobile });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("LINK_INACTIVE") ? "Ce lien n’est plus actif." :
        msg.includes("PAYER_REQUIRED") ? "Indique ton nom et ton numéro mobile." :
        "Le paiement n’a pas pu être effectué."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="pay-page">
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
                <label className="pay-field"><span>Nom</span>
                  <input className="pay-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label className="pay-field"><span>Numéro mobile</span>
                  <input className="pay-input" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                </label>
                {error && <p className="pay-error">{error}</p>}
                <button className="pay-btn" disabled={busy}>{busy ? "Paiement…" : `Payer ${fmt(link.amount)} ${link.currency_code}`}</button>
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

// useParams doit être lu dans Suspense (exigé par cacheComponents).
export default function PayPage() {
  return (
    <Suspense fallback={<main className="pay-page" />}>
      <PayContent />
    </Suspense>
  );
}
