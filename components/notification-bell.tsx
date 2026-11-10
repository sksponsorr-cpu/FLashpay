"use client";
import { useEffect, useRef, useState } from "react";

type Item = { id: string; kind: string; title: string; body: string; read_at: string | null; created_at: string };

const css = `
.nb{position:relative}
.nb-btn{position:relative;width:46px;height:46px;border-radius:14px;border:1px solid #ebe6f3;background:#fff;font-size:18px;cursor:pointer;display:grid;place-items:center}
.nb-badge{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#6236d6;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
.nb-pop{position:absolute;right:0;top:54px;width:min(340px,88vw);max-height:420px;overflow:auto;background:#fff;border:1px solid #ebe6f3;border-radius:18px;box-shadow:0 24px 50px -24px rgba(40,20,90,.35);z-index:50}
.nb-head{padding:14px 16px;border-bottom:1px solid #f1edf7;color:#1d1530}
.nb-empty{margin:0;padding:22px 16px;color:#6f6a7d;font-size:14px}
.nb-item{display:grid;gap:3px;padding:12px 16px;border-bottom:1px solid #f6f3fa;color:#1d1530;font-size:14px}
.nb-item span{color:#5b5670;font-size:13px}
.nb-item small{color:#9a95aa;font-size:12px}
.nb-new{background:#f7f3ff}
`;

export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { notifications: Item[]; unread: number };
      setItems(j.notifications);
      setUnread(j.unread);
    } catch {
      /* réseau indisponible : on réessaie au prochain cycle */
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
      setUnread(0);
      setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  return (
    <div className="nb" ref={ref}>
      <style>{css}</style>
      <button className="nb-btn" aria-label="Notifications" onClick={() => void toggle()}>
        🔔
        {unread > 0 && <span className="nb-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="nb-pop" role="status">
          <div className="nb-head"><strong>Notifications</strong></div>
          {items.length === 0 ? (
            <p className="nb-empty">Aucune notification pour l’instant.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`nb-item ${n.read_at ? "" : "nb-new"}`}>
                <strong>{n.title}</strong>
                <span>{n.body}</span>
                <small>{new Date(n.created_at).toLocaleString("fr-FR")}</small>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
