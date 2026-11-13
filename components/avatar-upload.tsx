"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Photo de profil : affichée en haut de l'écran.
export default function AvatarUpload({ current }: { current?: string | null }) {
  const [url, setUrl] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      if (alive && data?.avatar_url) setUrl(data.avatar_url as string);
    })();
    return () => { alive = false; };
  }, []);

  async function onPick(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) { setError("Choisis une image (JPG, PNG ou WebP)."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image trop lourde (5 Mo maximum)."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Connecte-toi pour changer ta photo."); return; }
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) { setError("Envoi impossible. Réessaie dans un instant."); return; }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (dbErr) { setError("Photo envoyée, mais l’enregistrement a échoué. Réessaie."); return; }
      setUrl(publicUrl);
      window.dispatchEvent(new CustomEvent("fp:avatar", { detail: publicUrl }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "#fdeae5", display: "grid", placeItems: "center" }}>
        {url ? <img src={url} alt="Photo de profil" width={64} height={64} style={{ objectFit: "cover" }} /> : <span style={{ color: "#e8472a", fontWeight: 800 }}>+</span>}
      </span>
      <span style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 14, color: "#55566a" }}>{busy ? "Envoi en cours…" : "Changer la photo"}</span>
        {error && <span role="alert" style={{ fontSize: 12, color: "#c8321a", fontWeight: 600 }}>{error}</span>}
      </span>
      <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void onPick(f); }} />
    </label>
  );
}
