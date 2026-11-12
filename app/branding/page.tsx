"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Identité du checkout : logo et couleur du bouton de paiement, par application.
export default function BrandingPage() {
  const [apps, setApps] = useState<{ id: string; name: string; brand_logo_url: string | null; brand_color: string | null }[]>([]);
  const [appId, setAppId] = useState("");
  const [logo, setLogo] = useState("");
  const [color, setColor] = useState("#5b3fd6");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    createClient().from("apps").select("id,name,brand_logo_url,brand_color").order("created_at", { ascending: true })
      .then(({ data }) => {
        const list = (data as typeof apps) ?? [];
        setApps(list);
        if (list[0]) { setAppId(list[0].id); setLogo(list[0].brand_logo_url ?? ""); setColor(list[0].brand_color ?? "#5b3fd6"); }
      });
  }, []);

  function pick(id: string) {
    setAppId(id);
    const a = apps.find((x) => x.id === id);
    setLogo(a?.brand_logo_url ?? ""); setColor(a?.brand_color ?? "#5b3fd6");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (logo && !/^https:\/\//.test(logo)) { setNotice({ ok: false, text: "Le logo doit être une adresse https://." }); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { setNotice({ ok: false, text: "Couleur invalide." }); return; }
    setBusy(true); setNotice(null);
    const { error } = await createClient().from("apps").update({ brand_logo_url: logo || null, brand_color: color }).eq("id", appId);
    setBusy(false);
    setNotice(error ? { ok: false, text: "Enregistrement impossible. Vérifie que tu es le propriétaire." } : { ok: true, text: "Identité du checkout enregistrée." });
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "24px 18px 60px", color: "#17162b" }}>
      <Link href="/dashboard" style={{ color: "#5b3fd6", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>← Retour au tableau de bord</Link>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 6px" }}>Checkout</h1>
      <p style={{ color: "#7a7590", fontSize: 14, marginBottom: 18 }}>Logo et couleur de la page de paiement de tes clients.</p>
      <form onSubmit={save} style={{ display: "grid", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 20 }}>
        <select value={appId} onChange={(e) => pick(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 12px", font: "inherit", background: "#fff" }}>
          {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input placeholder="Logo (adresse https://…)" value={logo} onChange={(e) => setLogo(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
        <label style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>Couleur du bouton <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 56, height: 40, border: 0, background: "none" }} /></label>
        {notice && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: notice.ok ? "#0f7a47" : "#c8321a" }}>{notice.text}</p>}
        <button type="submit" disabled={busy || !appId} style={{ minHeight: 48, border: 0, borderRadius: 15, background: "#5b3fd6", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: busy ? 0.6 : 1 }}>Enregistrer</button>
      </form>
    </main>
  );
}
