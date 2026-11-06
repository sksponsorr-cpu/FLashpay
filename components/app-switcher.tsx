"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type App = { id: string; name: string; category: string };

// Carte de sélection d'application, dans le menu latéral (comme SasPay).
export default function AppSwitcher({ currentId, onChange }: { currentId: string; onChange: (id: string) => void }) {
  const [apps, setApps] = useState<App[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("apps").select("id,name,category").order("created_at", { ascending: true });
      if (alive && data) setApps(data as App[]);
    })();
    return () => { alive = false; };
  }, []);

  const current = apps.find((a) => a.id === currentId) ?? apps[0];
  if (!current) return null;
  const initials = current.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="as-wrap">
      <button className="as-current" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="as-avatar">{initials}</span>
        <span className="as-text"><strong>{current.name}</strong><small>{current.category}</small></span>
        <span className="as-chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="as-list">
          {apps.map((a) => (
            <button key={a.id} className={a.id === current.id ? "as-item on" : "as-item"} onClick={() => { setOpen(false); onChange(a.id); }}>
              <span className="as-avatar sm">{a.name.slice(0, 2).toUpperCase()}</span>
              <span className="as-text"><strong>{a.name}</strong><small>{a.category}</small></span>
              {a.id === current.id && <span className="as-dot" />}
            </button>
          ))}
          <Link className="as-manage" href="/apps">+ Gérer mes apps</Link>
        </div>
      )}
    </div>
  );
}
