"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Menu de compte en haut à droite (comme SasPay) : nom, e-mail, Paramètres, Support, Déconnexion.
export default function AccountMenu({ onSettings }: { onSettings: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!alive || !data.user) return;
      setEmail(data.user.email ?? "");
      const meta = data.user.user_metadata as { full_name?: string } | undefined;
      setName(meta?.full_name ?? (data.user.email ?? "").split("@")[0]);
    })();
    return () => { alive = false; };
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
        <span className="am-avatar">{initials}</span>
        <span className="am-chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="am-pop" role="menu">
          <div className="am-head">
            <span className="am-avatar lg">{initials}</span>
            <span className="am-id"><strong>{name}</strong><small>{email}</small></span>
          </div>
          <button className="am-item" onClick={() => { setOpen(false); onSettings(); }}>Paramètres</button>
          <a className="am-item" href="/docs/api">Support</a>
          <button className="am-item am-danger" onClick={() => void signOut()}>Déconnexion</button>
        </div>
      )}
    </div>
  );
}
