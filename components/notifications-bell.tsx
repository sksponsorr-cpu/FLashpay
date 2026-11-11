"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Cloche de notifications : visible dans l'en-tête, liste déroulante avec les dernières notifications.
type Notice = { id: string; title: string; body: string; read_at: string | null; created_at: string };

export default function NotificationsBell() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    createClient()
      .from("user_notifications")
      .select("id, title, body, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setItems((data as Notice[]) ?? []));
  }, []);

  const unread = items.filter((i) => !i.read_at).length;

  async function markAllRead() {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    await createClient().from("user_notifications").update({ read_at: now }).in("id", ids);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? now })));
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) void markAllRead();
        }}
        style={{ position: "relative", width: 44, height: 44, borderRadius: 14, border: "1px solid #ebe8f7", background: "#fff", cursor: "pointer" }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: "#5b3fd6", color: "#fff", fontSize: 11, display: "grid", placeItems: "center" }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" style={{ position: "absolute", right: 0, top: "110%", width: 320, maxHeight: 380, overflowY: "auto", background: "#fff", borderRadius: 16, boxShadow: "0 20px 50px rgba(20,20,43,.15)", padding: 12, zIndex: 60 }}>
          {items.length === 0 && <p style={{ margin: 8, color: "#6b6c80" }}>Aucune notification.</p>}
          {items.map((i) => (
            <div key={i.id} style={{ padding: "10px 6px", borderBottom: "1px solid #f0eef8" }}>
              <strong style={{ fontSize: 14 }}>{i.title}</strong>
              <div style={{ fontSize: 13, color: "#6b6c80", marginTop: 2 }}>{i.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
