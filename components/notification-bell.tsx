"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Cloche de notifications : liste animée, détail au clic, suppression, temps réel.
type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string;
  reference: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_STYLE: Record<string, { bg: string; fg: string; icon: string }> = {
  subscription: { bg: "#efeafe", fg: "#5b3fd6", icon: "★" },
  collection: { bg: "#e7f7ef", fg: "#0f7a47", icon: "↓" },
  withdrawal: { bg: "#fff0ec", fg: "#e8472a", icon: "↑" },
  info: { bg: "#f4f1ff", fg: "#5b3fd6", icon: "i" },
};

const CSS = `
.nb{position:relative}
.nb-btn{width:44px;height:44px;border-radius:14px;border:1px solid #ebe7f6;background:#fff;display:grid;place-items:center;cursor:pointer;position:relative;transition:transform .2s ease,box-shadow .2s ease}
.nb-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(91,63,214,.12)}
.nb-dot{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 6px;border-radius:99px;background:#e8472a;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 2px #fff;animation:nb-pop .4s cubic-bezier(.2,.8,.2,1) both}
.nb-panel{position:absolute;right:0;top:54px;width:min(360px,calc(100vw - 32px));max-height:460px;overflow:hidden;display:flex;flex-direction:column;background:#fff;border:1px solid #ebe7f6;border-radius:22px;box-shadow:0 24px 60px rgba(30,20,70,.18);z-index:60;animation:nb-drop .3s cubic-bezier(.2,.8,.2,1) both}
.nb-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #f1eff7}
.nb-head strong{font-size:15px;color:#14142b}
.nb-link{border:0;background:none;color:#5b3fd6;font-size:12px;font-weight:700;cursor:pointer}
.nb-list{overflow-y:auto;padding:6px}
.nb-item{display:flex;gap:12px;align-items:flex-start;width:100%;padding:12px;border:0;border-radius:16px;background:transparent;text-align:left;cursor:pointer;transition:background .2s ease;animation:nb-rise .45s cubic-bezier(.2,.8,.2,1) both}
.nb-item:hover{background:#faf9fd}
.nb-ico{flex:none;width:36px;height:36px;border-radius:12px;display:grid;place-items:center;font-weight:800;font-size:15px}
.nb-txt{display:grid;gap:2px;min-width:0;flex:1}
.nb-txt strong{font-size:14px;color:#14142b;font-weight:700}
.nb-txt span{font-size:12px;color:#6b6c80;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nb-txt small{font-size:11px;color:#9a97b0}
.nb-new{width:8px;height:8px;border-radius:50%;background:#e8472a;margin-top:6px;flex:none}
.nb-empty{padding:34px 18px;text-align:center;color:#8a8aa3;font-size:14px}
.nb-back{position:fixed;inset:0;z-index:120;background:rgba(20,20,43,.35);backdrop-filter:blur(3px);animation:nb-fade .25s ease both}
.nb-sheet{position:fixed;left:0;right:0;bottom:0;z-index:130;background:#fff;border-radius:26px 26px 0 0;padding:14px 22px calc(26px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 50px rgba(20,20,43,.18);animation:nb-up .42s cubic-bezier(.2,.8,.2,1) both}
@media(min-width:720px){.nb-sheet{left:50%;right:auto;bottom:50%;width:min(480px,calc(100vw - 40px));border-radius:26px;transform:translate(-50%,50%);animation:nb-pop2 .3s cubic-bezier(.2,.8,.2,1) both}}
.nb-grab{width:40px;height:4px;margin:0 auto 14px;border-radius:99px;background:#e0ddea}
.nb-sh{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.nb-sh h2{margin:0;font-size:19px;color:#14142b;letter-spacing:-.01em}
.nb-sh p{margin:2px 0 0;font-size:12px;color:#8a8aa3}
.nb-x{margin-left:auto;width:36px;height:36px;border:0;border-radius:50%;background:#f4f1ff;color:#5b3fd6;font-size:20px;cursor:pointer}
.nb-rows{display:grid;gap:0;margin:8px 0 18px}
.nb-row{display:flex;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #f1eff7;font-size:14px}
.nb-row span{color:#8a8aa3}
.nb-row b{color:#14142b;font-weight:600;text-align:right;overflow-wrap:anywhere}
.nb-msg{margin:0 0 16px;padding:14px 16px;border-radius:16px;background:#faf9fd;color:#4a4a63;font-size:14px;line-height:1.5}
.nb-del{width:100%;height:50px;border:0;border-radius:16px;background:#fff0ec;color:#e8472a;font-size:15px;font-weight:700;cursor:pointer;transition:transform .2s ease,background .2s ease}
.nb-del:hover{background:#ffe2da;transform:translateY(-1px)}
@keyframes nb-drop{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}
@keyframes nb-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes nb-pop{from{transform:scale(.4)}to{transform:scale(1)}}
@keyframes nb-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes nb-pop2{from{opacity:0;transform:translate(-50%,50%) scale(.96)}to{opacity:1;transform:translate(-50%,50%)}}
@keyframes nb-fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.nb *{animation:none!important;transition:none!important}}
`;

const dateFmt = (v: string) =>
  new Date(v).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function NotificationBell() {
  const [items, setItems] = useState<Notice[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("user_notifications")
      .select("id, kind, title, body, reference, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data as Notice[]) ?? []));

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_notifications" },
        (payload) => setItems((prev) => [payload.new as Notice, ...prev])
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const unread = items.filter((i) => !i.read_at).length;

  async function markAllRead() {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    await createClient().from("user_notifications").update({ read_at: now }).in("id", ids);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? now })));
  }

  async function openItem(n: Notice) {
    setSelected(n);
    if (!n.read_at) {
      const now = new Date().toISOString();
      await createClient().from("user_notifications").update({ read_at: now }).eq("id", n.id);
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: now } : i)));
    }
  }

  async function remove(id: string) {
    setBusy(true);
    const { error } = await createClient().from("user_notifications").delete().eq("id", id);
    setBusy(false);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setSelected(null);
    }
  }

  return (
    <div className="nb">
      <style>{CSS}</style>
      <button
        type="button"
        className="nb-btn"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14142b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && <span className="nb-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="nb-panel" role="dialog" aria-label="Notifications">
          <div className="nb-head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="nb-link" onClick={() => void markAllRead()}>
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="nb-list">
            {items.length === 0 && <div className="nb-empty">Aucune notification pour le moment.</div>}
            {items.map((n, i) => {
              const s = KIND_STYLE[n.kind] ?? KIND_STYLE.info;
              return (
                <button
                  key={n.id}
                  type="button"
                  className="nb-item"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  onClick={() => void openItem(n)}
                >
                  <span className="nb-ico" style={{ background: s.bg, color: s.fg }}>{s.icon}</span>
                  <span className="nb-txt">
                    <strong>{n.title}</strong>
                    <span>{n.body}</span>
                    <small>{dateFmt(n.created_at)}</small>
                  </span>
                  {!n.read_at && <span className="nb-new" aria-label="Non lue" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <>
          <div className="nb-back" onClick={() => setSelected(null)} aria-hidden />
          <div className="nb-sheet" role="dialog" aria-modal="true" aria-label="Détail de la notification">
            <div className="nb-grab" />
            <div className="nb-sh">
              <span className="nb-ico" style={{ background: (KIND_STYLE[selected.kind] ?? KIND_STYLE.info).bg, color: (KIND_STYLE[selected.kind] ?? KIND_STYLE.info).fg }}>
                {(KIND_STYLE[selected.kind] ?? KIND_STYLE.info).icon}
              </span>
              <div>
                <h2>{selected.title}</h2>
                <p>{dateFmt(selected.created_at)}</p>
              </div>
              <button type="button" className="nb-x" onClick={() => setSelected(null)} aria-label="Fermer">×</button>
            </div>
            <p className="nb-msg">{selected.body}</p>
            <div className="nb-rows">
              <div className="nb-row"><span>Type</span><b>{selected.kind}</b></div>
              {selected.reference && <div className="nb-row"><span>Référence</span><b>{selected.reference}</b></div>}
              <div className="nb-row"><span>Reçue le</span><b>{new Date(selected.created_at).toLocaleString("fr-FR")}</b></div>
            </div>
            <button type="button" className="nb-del" disabled={busy} onClick={() => void remove(selected.id)}>
              {busy ? "Suppression…" : "Supprimer la notification"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
