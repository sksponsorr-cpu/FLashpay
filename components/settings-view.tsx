"use client";
import { useEffect, useState } from "react";
import IdentityForm from "@/components/identity-form";
import { createClient } from "@/lib/supabase/client";

type App = { id: string; name: string; website: string | null; category: string };

const categories = ["Éducation", "Commerce", "Services", "Santé", "Transport", "Autre"];
const verifLabel: Record<string, string> = {
  pending: "En attente de vérification",
  under_review: "En cours d’examen",
  verified: "Vérifié",
  rejected: "Refusé",
};

import AvatarUpload from "@/components/avatar-upload";

export default function SettingsView({ appId, initialTab = "app" }: { appId: string; initialTab?: "app" | "verif" | "security" }) {
  const [tab, setTab] = useState<"app" | "verif" | "security">(initialTab);
  const [app, setApp] = useState<App | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("Autre");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("apps").select("id,name,website,category").eq("id", appId).single();
      if (alive && data) {
        const a = data as App;
        setApp(a);
        setName(a.name);
        setWebsite(a.website ?? "");
        setCategory(a.category);
      }
      const { data: profile } = await supabase.from("profiles").select("verification_status").single();
      if (alive) setStatus(profile?.verification_status ?? null);
      // Dernière demande : si elle a été rejetée, on affiche le motif
      const { data: last } = await supabase.from("identity_verifications").select("status,rejection_reason").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (alive && last?.status === "rejected") setRejection(last.rejection_reason ?? "Documents non conformes.");
    })();
    return () => { alive = false; };
  }, [appId]);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      if (!name.trim()) throw new Error("Le nom de l’application est requis.");
      const supabase = createClient();
      const { error } = await supabase
        .from("apps")
        .update({ name: name.trim(), website: website.trim() || null, category })
        .eq("id", appId);
      if (error) throw error;
      setMessage("Modifications enregistrées.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible d’enregistrer.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <section className="set-wrap">
      <AvatarUpload />

      <div className="dev-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "app"} className={tab === "app" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("app")}>Application</button>
        <button role="tab" aria-selected={tab === "verif"} className={tab === "verif" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("verif")}>Vérification</button>
        <button role="tab" aria-selected={tab === "security"} className={tab === "security" ? "dev-tab on" : "dev-tab"} onClick={() => setTab("security")}>Sécurité</button>
      </div>

      {tab === "app" && (
        <div className="dash-card set-card">
          {!app && <p className="dash-muted">Chargement…</p>}
          {app && (
            <>
              <label className="set-field"><span>Nom de l’application</span>
                <input className="set-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="set-field"><span>Site web</span>
                <input className="set-input" inputMode="url" placeholder="https://monsite.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </label>
              <label className="set-field"><span>Catégorie</span>
                <select className="set-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <button className="primary-button" disabled={busy} onClick={() => void save()}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
              {message && <p className="dash-muted" role="status">{message}</p>}
            </>
          )}
        </div>
      )}

      {tab === "verif" && (
        <div className="dash-card set-card">
          <strong>Vérification d’identité</strong>
          {status === "verified" && <p className="dash-muted">Statut : <b>Vérifié</b>. Ton identité est confirmée.</p>}
          {status === "under_review" && <p className="dash-muted">Statut : <b>En cours d’examen</b>. Nous revenons vers toi après vérification.</p>}
          {status !== "verified" && status !== "under_review" && (
            <>
              {rejection && <p className="dash-muted" style={{ color: "#c8321a" }}>Ta dernière demande a été rejetée : <b>{rejection}</b>. Corrige les informations puis renvoie-la.</p>}
              <p className="dash-muted">Statut : <b>{status ? (verifLabel[status] ?? status) : "Non vérifié"}</b>. Envoie les informations ci-dessous pour passer en mode production.</p>
              <IdentityForm onSubmitted={() => { setRejection(null); setStatus("under_review"); }} />
            </>
          )}
        </div>
      )}

      {tab === "security" && (
        <div className="dash-card set-card">
          <strong>Session</strong>
          <p className="dash-muted">Déconnecte-toi de cet appareil.</p>
          <button className="pl-btn pl-btn-ghost" onClick={() => void signOut()}>Se déconnecter</button>
        </div>
      )}
    </section>
  );
}
