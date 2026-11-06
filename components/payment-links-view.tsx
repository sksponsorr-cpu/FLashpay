"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Country = { code: string; name: string; currency_code: string };
type Link = { id: string; label: string; amount: number; currency_code: string; token: string; is_active: boolean; created_at: string };

const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);

function makeToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PaymentLinksView({ appId }: { appId: string }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [country, setCountry] = useState("CM");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");

  async function loadLinks() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("payment_links")
      .select("id,label,amount,currency_code,token,is_active,created_at")
      .eq("app_id", appId)
      .order("created_at", { ascending: false });
    if (error) setMessage("Impossible de charger les liens de paiement.");
    else setLinks((data ?? []) as Link[]);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.from("supported_countries").select("code,name,currency_code").order("name").then(({ data }) => {
      if (data) setCountries(data as Country[]);
    });
    void loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  async function create() {
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Connecte-toi pour créer un lien.");
      const chosen = countries.find((c) => c.code === country);
      if (!chosen) throw new Error("Choisis un pays.");
      const value = Number(amount);
      if (!label.trim()) throw new Error("Donne un libellé au lien.");
      if (!(value > 0)) throw new Error("Le montant doit être supérieur à zéro.");
      const { error } = await supabase.from("payment_links").insert({
        owner_id: user.id,
        app_id: appId,
        label: label.trim(),
        amount: value,
        currency_code: chosen.currency_code,
        country_code: chosen.code,
        token: makeToken(),
        mode: "test",
      });
      if (error) throw error;
      setLabel("");
      setAmount("");
      setMessage("Lien créé. Il est en mode test : aucun paiement réel.");
      await loadLinks();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible de créer le lien.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(link: Link) {
    const supabase = createClient();
    const { error } = await supabase.from("payment_links").update({ is_active: !link.is_active }).eq("id", link.id);
    if (error) setMessage("Impossible de modifier ce lien.");
    else await loadLinks();
  }

  function urlFor(token: string) {
    return `${window.location.origin}/pay/${token}`;
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    setCopied(token);
    setTimeout(() => setCopied(""), 1800);
  }

  return (
    <section className="pl-wrap">
      <div className="dash-card pl-card">
        <strong>Nouveau lien de paiement</strong>
        <label className="pl-field"><span>Libellé</span>
          <input className="pl-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex. Inscription formation" />
        </label>
        <div className="pl-two">
          <label className="pl-field"><span>Montant</span>
            <input className="pl-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </label>
          <label className="pl-field"><span>Pays</span>
            <select className="pl-input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.currency_code})</option>)}
            </select>
          </label>
        </div>
        <button className="primary-button" disabled={busy} onClick={() => void create()}>{busy ? "Création…" : "Créer le lien"}</button>
        {message && <p className="dash-muted" role="status">{message}</p>}
      </div>

      <div className="dash-card pl-card">
        <strong>Mes liens</strong>
        {!links.length && <p className="dash-muted">Aucun lien pour cette application.</p>}
        {links.map((link) => (
          <div className="pl-row" key={link.id}>
            <div className="pl-main">
              <strong>{link.label}</strong>
              <span className="dash-muted">{fmt(link.amount)} {link.currency_code} · {link.is_active ? "Actif" : "Désactivé"}</span>
              <span className="pl-url">{urlFor(link.token)}</span>
            </div>
            <div className="pl-actions">
              <button className="pl-btn" onClick={() => void copy(link.token)}>{copied === link.token ? "Copié" : "Copier"}</button>
              <button className="pl-btn pl-btn-ghost" onClick={() => void toggle(link)}>{link.is_active ? "Désactiver" : "Activer"}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
