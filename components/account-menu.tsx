"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Menu de compte en haut à droite : nom, e-mail, Paramètres, Support, Déconnexion.
// Un seul panneau à la fois : ouvrir ce menu ferme les notifications, et inversement.
export const POPOVER_EVENT = "fp:popover";

export default function AccountMenu({ onSettings }: { onSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  // Un autre panneau s'ouvre -> on ferme celui-ci.
  useEffect(() => {
    const onOther = (e: Event) => { if ((e as CustomEvent<string>).detail !== "account") setOpen(false); };
    window.addEventListener(POPOVER_EVENT, onOther);
    return () => window.removeEventListener(POPOVER_EVENT, onOther);
  }, []);

  // Clic extérieur ou touche Échap : fermeture.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) window.dispatchEvent(new CustomEvent(POPOVER_EVENT, { detail: "account" }));
      return next;
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const initials = (name || "?").slice(0, 2).toUpperCase();

  return (
    <div className="am-wrap" ref={wrapRef}>
      <button className="am-btn" onClick={toggle} aria-expanded={open} aria-label="Menu du compte">
        <span className="am-avatar" style={avatarBox(32)}>
          {avatar ? <img src={avatar} alt="" style={imgFill} /> : initials}
        </span>
        <span className="am-chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="am-pop" role="menu">
          <div className="am-head">
            <span className="am-avatar lg" style={avatarBox(44)}>
              {avatar ? <img src={avatar} alt="" style={imgFill} /> : initials}
            </span>
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

// Force la photo dans un cercle propre, sans débordement.
function avatarBox(size: number) {
  return { width: size, height: size, minWidth: size, borderRadius: "50%", overflow: "hidden", display: "grid", placeItems: "center", flexShrink: 0 } as const;
}
const imgFill = { width: "100%", height: "100%", objectFit: "cover", display: "block" } as const;
