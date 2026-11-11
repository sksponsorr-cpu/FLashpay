"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Photo de profil : affichée en haut de l'écran.
export default function AvatarUpload({ current }: { current?: string | null }) {
  const [url, setUrl] = useState<string | null>(current ?? null);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File) {
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return; }
    const path = `${user.id}/avatar.${file.name.split(".").pop() ?? "png"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setUrl(publicUrl);
    }
    setBusy(false);
  }

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <span style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "#f1edff", display: "grid", placeItems: "center" }}>
        {url ? <img src={url} alt="Photo de profil" width={64} height={64} style={{ objectFit: "cover" }} /> : <span style={{ color: "#5b3fd6", fontWeight: 800 }}>+</span>}
      </span>
      <span style={{ fontSize: 14, color: "#55566a" }}>{busy ? "Envoi…" : "Changer la photo"}</span>
      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void onPick(e.target.files[0])} />
    </label>
  );
}
