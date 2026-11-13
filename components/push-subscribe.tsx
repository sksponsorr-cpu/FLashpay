"use client";
import { useEffect, useState } from "react";

// Bouton « Activer les notifications » : demande l'autorisation puis enregistre l'appareil.
function b64ToUint8(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushSubscribe() {
  const [state, setState] = useState<"checking" | "unsupported" | "off" | "on" | "denied">("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    setMsg("");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) { setMsg("Notifications push non configurées sur le serveur."); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) as BufferSource });
    const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    setState(res.ok ? "on" : "off");
    if (!res.ok) setMsg("Activation impossible, réessaie.");
  }

  async function disable() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off");
  }

  if (state === "unsupported") return <p style={{ fontSize: 13, color: "#8a8aa3" }}>Ton navigateur ne prend pas en charge les notifications push. Utilise Chrome.</p>;
  if (state === "denied") return <p style={{ fontSize: 13, color: "#8a8aa3" }}>Les notifications sont bloquées. Autorise-les dans les réglages du site.</p>;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {state === "on"
        ? <button type="button" className="primary-button" onClick={() => void disable()}>Désactiver les notifications push</button>
        : <button type="button" className="primary-button" disabled={state === "checking"} onClick={() => void enable()}>Activer les notifications push</button>}
      {msg && <span role="alert" style={{ fontSize: 12, color: "#c8321a" }}>{msg}</span>}
    </div>
  );
}
