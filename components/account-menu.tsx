"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Menu de compte en haut à droite (comme SasPay) : nom, e-mail, Paramètres, Support, Déconnexion.
export default function AccountMenu({ onSettings }: { onSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!alive || !data.user) return;
      const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", data.user.id).maybeSingle();
      if (alive && prof?.avatar_url) setAvatar(prof.avatar_url as string);
      setEmail(data.user.email ?? "");
      const meta = data.user.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name ?? (data.user.email ?? "").split("@")[0]);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onAvatar = (e: Event) => setAvatar((e as CustomEvent<string>).detail);
    window.addEventListener("fp:avatar", onAvatar);
    return () => window.removeEventListener("fp:avatar", onAvatar);
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const initials = (name || "?").slice(0, 2).toUpperCase();

  return (
    <div className="am-wrap">
      <button className="am-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="am-avatar">{avatar ? <img src={avatar} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : initials}</span>
        <span className="am-chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="am-pop" role="menu">
          <div className="am-head">
            <span className="am-avatar lg">{initials}</span>
            <span className="am-id"><strong>{name}</strong><small>{email}</small></span>
          </div>
          <button className="am-item" onClick={() => { setOpen(false); onSettings(); }}>Paramètres</button>
          <a className="am-item" href="/support">Support</a>
          <button className="am-item am-danger" onClick={() => void signOut()}>Déconnexion</button>
        </div>
      )}
    </div>
  );
}
