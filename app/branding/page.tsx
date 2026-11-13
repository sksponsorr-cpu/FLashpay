"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Identité du checkout : galerie de modèles avec aperçu, logo, couleur, animation et position du logo.
type TemplateId = "classic" | "split" | "minimal" | "glass" | "feed" | "oreo" | "make";
type AppRow = {
  id: string;
  name: string;
  brand_logo_url: string | null;
  brand_cover_url: string | null;
  brand_color: string | null;
  brand_template: string | null;
  brand_animation: string | null;
  brand_logo_position: string | null;
};

const TEMPLATES: { id: TemplateId; name: string; hint: string }[] = [
  { id: "classic", name: "Classique", hint: "Carte blanche, ombre douce" },
  { id: "split", name: "Bandeau", hint: "Bande de couleur en haut" },
  { id: "minimal", name: "Épuré", hint: "Bordure fine, sans ombre" },
  { id: "glass", name: "Verre", hint: "Fond dégradé, carte translucide" },
  { id: "feed", name: "Feed", hint: "Image à côté du titre" },
  { id: "oreo", name: "Oreo", hint: "Grande image en haut" },
  { id: "make", name: "Make", hint: "Bandeau sombre avec l’offre" },
];

// Aperçu dessiné en CSS : reproduit la structure réelle de la page de paiement.
function Mockup({ template, color, logo, cover, position, animated }: { template: TemplateId; color: string; logo: string; cover: string; position: string; animated: boolean }) {
  const isGlass = template === "glass";
  const outer: React.CSSProperties = {
    background: isGlass ? `linear-gradient(160deg, ${color} 0%, #14142b 100%)` : "#f4f2ff",
    borderRadius: 16,
    padding: 12,
    height: "100%",
    boxSizing: "border-box",
  };
  const card: React.CSSProperties = {
    background: isGlass ? "rgba(255,255,255,.8)" : "#fff",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 8,
    boxSizing: "border-box",
    border: template === "minimal" ? "1px solid #ebe8f7" : "1px solid rgba(255,255,255,.6)",
    boxShadow: template === "classic" ? "0 14px 30px -16px rgba(40,30,110,.45)" : isGlass ? "0 20px 40px -20px rgba(0,0,0,.45)" : "none",
    borderTop: template === "split" ? `6px solid ${color}` : undefined,
    animation: animated ? "fpMockIn .9s cubic-bezier(.2,.8,.2,1) both" : undefined,
  };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, justifyContent: position === "center" ? "center" : "flex-start" };
  return (
    <div style={outer}>
      <style>{`@keyframes fpMockIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      {template === "oreo" && <div style={{ height: 56, borderRadius: 10, background: cover ? `center/cover url(${cover})` : "linear-gradient(135deg,#f0593f,#e8472a)" }} />}
      {template === "make" && (
        <div style={{ background: "#14142b", color: "#fff", borderRadius: 10, padding: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: cover ? `center/cover url(${cover})` : color, flex: "none" }} />
          <span style={{ height: 6, width: "60%", borderRadius: 3, background: "rgba(255,255,255,.8)" }} />
        </div>
      )}
      <div style={card}>
        {template === "feed" && (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: cover ? `center/cover url(${cover})` : color, flex: "none" }} />
            <span style={{ height: 6, width: "60%", borderRadius: 3, background: "#e4e1ef" }} />
          </div>
        )}
        <div style={row}>
          <span style={{ width: 16, height: 16, borderRadius: 5, background: color }} />
          {logo ? <span style={{ fontSize: 9, fontWeight: 700, color: "#14142b" }}>Logo</span> : <span style={{ height: 6, width: 42, borderRadius: 3, background: "#e4e1ef" }} />}
        </div>
        <div style={{ height: 8, width: "70%", borderRadius: 4, background: "#e4e1ef" }} />
        <div style={{ height: 14, width: "45%", borderRadius: 4, background: "#17162b" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          <span style={{ height: 14, borderRadius: 6, border: `1px solid ${color}`, background: `${color}14` }} />
          <span style={{ height: 14, borderRadius: 6, border: "1px solid #e4e1ef" }} />
        </div>
        <div style={{ height: 18, borderRadius: 999, background: color, marginTop: 2 }} />
      </div>
    </div>
  );
}

export default function BrandingPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [template, setTemplate] = useState<TemplateId>("classic");
  const [animation, setAnimation] = useState("fade");
  const [logoPosition, setLogoPosition] = useState("left");
  const [appId, setAppId] = useState("");
  const [logo, setLogo] = useState("");
  const [cover, setCover] = useState("");
  const [color, setColor] = useState("#e8472a");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    createClient().from("apps").select("id,name,brand_logo_url,brand_cover_url,brand_color,brand_template,brand_animation,brand_logo_position").order("created_at", { ascending: true })
      .then(({ data }) => {
        const list = (data as AppRow[]) ?? [];
        setApps(list);
        if (list[0]) load(list[0]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load(a: AppRow) {
    setAppId(a.id);
    setLogo(a.brand_logo_url ?? "");
    setCover(a.brand_cover_url ?? "");
    setColor(a.brand_color ?? "#e8472a");
    setTemplate(((a.brand_template as TemplateId) ?? "classic"));
    setAnimation(a.brand_animation ?? "fade");
    setLogoPosition(a.brand_logo_position ?? "left");
  }

  function pick(id: string) {
    const a = apps.find((x) => x.id === id);
    if (a) load(a);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (logo && !/^https:\/\//.test(logo)) { setNotice({ ok: false, text: "Le logo doit être une adresse https://." }); return; }
    if (cover && !/^https:\/\//.test(cover)) { setNotice({ ok: false, text: "L’image doit être une adresse https://." }); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { setNotice({ ok: false, text: "Couleur invalide." }); return; }
    setBusy(true); setNotice(null);
    const { error } = await createClient().from("apps").update({ brand_logo_url: logo || null, brand_cover_url: cover || null, brand_color: color, brand_template: template, brand_animation: animation, brand_logo_position: logoPosition }).eq("id", appId);
    setBusy(false);
    setNotice(error ? { ok: false, text: "Enregistrement impossible. Vérifie que tu es le propriétaire." } : { ok: true, text: "Modèle enregistré. Ta page de paiement est mise à jour." });
  }

  const current = TEMPLATES.find((t) => t.id === template) ?? TEMPLATES[0];

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "24px 18px 120px", color: "#17162b" }}>
      <Link href="/dashboard" style={{ color: "#e8472a", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Retour au tableau de bord</Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 6px" }}>Checkout</h1>
      <p style={{ color: "#7a7590", fontSize: 14, marginBottom: 18 }}>Choisis le modèle de ta page de paiement. Il s’applique à tous tes liens de paiement.</p>

      {apps.length > 1 && (
        <select value={appId} onChange={(e) => pick(e.target.value)} style={{ width: "100%", minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 12px", font: "inherit", background: "#fff", marginBottom: 14 }}>
          {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}

      <form onSubmit={save} style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {TEMPLATES.map((t) => {
            const selected = template === t.id;
            return (
              <div key={t.id} style={{ position: "relative", borderRadius: 20, padding: 8, background: selected ? "#14142b" : "#fff", border: selected ? "1px solid #14142b" : "1px solid #ebe7f6", transition: "background .25s ease, transform .25s ease", transform: selected ? "translateY(-2px)" : "none" }}>
                <button type="button" onClick={() => setTemplate(t.id)} aria-pressed={selected} aria-label={`Modèle ${t.name}`} style={{ display: "block", width: "100%", border: 0, padding: 0, background: "transparent", cursor: "pointer", textAlign: "left", font: "inherit" }}>
                  <div style={{ height: 150, borderRadius: 14, overflow: "hidden" }}>
                    <Mockup template={t.id} color={color} logo={logo} cover={cover} position={logoPosition} animated={false} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 4px 2px", color: selected ? "#fff" : "#17162b" }}>
                    <span>
                      <strong style={{ display: "block", fontSize: 15 }}>{t.name}</strong>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>{t.hint}</span>
                    </span>
                    <span aria-hidden style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: selected ? color : "transparent", border: selected ? "none" : "1.5px solid #c9c6d8", color: "#fff", fontSize: 14, fontWeight: 700, flex: "none" }}>
                      {selected ? "✓" : ""}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 18 }}>
          <input placeholder="Logo (adresse https://…)" value={logo} onChange={(e) => setLogo(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
          <input placeholder="Image du produit ou de l’offre (adresse https://…)" value={cover} onChange={(e) => setCover(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>Couleur principale <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 56, height: 40, border: 0, background: "none" }} /></label>
          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>Animation d’apparition
            <select value={animation} onChange={(e) => setAnimation(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 12px", font: "inherit", background: "#fff" }}>
              <option value="none">Aucune</option>
              <option value="fade">Fondu</option>
              <option value="rise">Remontée</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, fontWeight: 600, fontSize: 14 }}>Position du logo
            <select value={logoPosition} onChange={(e) => setLogoPosition(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 12px", font: "inherit", background: "#fff" }}>
              <option value="left">À gauche</option>
              <option value="center">Centré</option>
            </select>
          </label>
        </div>

        {notice && <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: notice.ok ? "#0f7a47" : "#c8321a" }}>{notice.text}</p>}

        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: "14px 18px calc(14px + env(safe-area-inset-bottom,0px))", background: "rgba(255,255,255,.92)", backdropFilter: "blur(14px)", borderTop: "1px solid #ebe7f6", display: "flex", gap: 10, justifyContent: "center" }}>
          <button type="button" onClick={() => setPreviewOpen(true)} style={{ flex: 1, maxWidth: 220, minHeight: 50, borderRadius: 15, border: "1px solid #e4e1ef", background: "#fff", color: "#17162b", fontWeight: 700, font: "inherit", cursor: "pointer" }}>Aperçu</button>
          <button type="submit" disabled={busy || !appId} style={{ flex: 1, maxWidth: 320, minHeight: 50, borderRadius: 15, border: 0, background: color, color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>

      {previewOpen && (
        <div role="dialog" aria-modal="true" aria-label="Aperçu du modèle" onClick={() => setPreviewOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,20,43,.45)", display: "grid", placeItems: "center", padding: 18, zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(400px, 100%)", background: "#fff", borderRadius: 26, padding: 14, boxShadow: "0 30px 70px -20px rgba(0,0,0,.4)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 6px 12px" }}>
              <strong>Aperçu : {current.name}</strong>
              <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Fermer" style={{ width: 34, height: 34, borderRadius: 999, border: 0, background: "#f4f2fb", cursor: "pointer" }}>×</button>
            </div>
            <div style={{ height: 420, borderRadius: 18, overflow: "hidden" }}>
              <Mockup template={template} color={color} logo={logo} cover={cover} position={logoPosition} animated={animation !== "none"} />
            </div>
            <p style={{ margin: "10px 6px 0", fontSize: 12, color: "#7a7590" }}>Aperçu indicatif. La page réelle s’affiche avec ton montant et tes réseaux de paiement.</p>
          </div>
        </div>
      )}
    </main>
  );
}
