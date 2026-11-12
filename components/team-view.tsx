"use client";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; email: string; role: "viewer" | "manager"; created_at: string };
const ROLE_LABEL: Record<Member["role"], string> = {
  viewer: "Lecture seule : voit tout, ne modifie rien",
  manager: "Gestion : agit sur l’application",
};

// Équipe d'une application. Un membre n'accède qu'à l'application invitée.
export default function TeamView() {
  const [appId, setAppId] = useState("");
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("viewer");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    createClient().from("apps").select("id,name").order("created_at", { ascending: true })
      .then(({ data }) => {
        const list = (data as { id: string; name: string }[]) ?? [];
        setApps(list);
        if (list[0]) setAppId(list[0].id);
      });
  }, []);

  async function load(id: string) {
    if (!id) return;
    const r = await fetch(`/api/team?app_id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const j = await r.json();
    setMembers(r.ok ? (j.members as Member[]) : []);
  }
  useEffect(() => { void load(appId); }, [appId]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const r = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ app_id: appId, email, role }) });
    const j = await r.json();
    if (!r.ok) { setNotice({ ok: false, text: j.message ?? "Invitation impossible." }); return; }
    setEmail(""); setNotice({ ok: true, text: "Invitation enregistrée." });
    void load(appId);
  }

  async function remove(id: string) {
    await fetch(`/api/team?app_id=${encodeURIComponent(appId)}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    void load(appId);
  }

  return (
    <div style={{ color: "#17162b" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "18px 0 6px" }}>Équipe</h1>
      <p style={{ color: "#7a7590", fontSize: 14, marginBottom: 18 }}>Invite des membres sur une application précise. Ils n’ont accès qu’à celle-là.</p>

      <select value={appId} onChange={(e) => setAppId(e.target.value)} style={{ width: "100%", minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 12px", font: "inherit", marginBottom: 14, background: "#fff" }}>
        {apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      <form onSubmit={invite} style={{ display: "grid", gap: 10, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 22, padding: 20, marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Inviter un membre</h2>
        <input type="email" placeholder="E-mail du membre" value={email} onChange={(e) => setEmail(e.target.value)} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 14px", font: "inherit" }} />
        <select value={role} onChange={(e) => setRole(e.target.value as Member["role"])} style={{ minHeight: 46, border: "1px solid #e4e1ef", borderRadius: 15, padding: "0 12px", font: "inherit", background: "#fff" }}>
          <option value="viewer">{ROLE_LABEL.viewer}</option>
          <option value="manager">{ROLE_LABEL.manager}</option>
        </select>
        {notice && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: notice.ok ? "#0f7a47" : "#c8321a" }}>{notice.text}</p>}
        <button type="submit" disabled={!appId || !email} style={{ minHeight: 48, border: 0, borderRadius: 15, background: "#e8472a", color: "#fff", fontWeight: 700, font: "inherit", cursor: "pointer", opacity: !appId || !email ? 0.5 : 1 }}>Inviter</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {members.length === 0 && <p style={{ color: "#8a8aa3", fontSize: 14 }}>Aucun membre sur cette application.</p>}
        {members.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #ebe7f6", borderRadius: 18, padding: 14 }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>{m.email}</strong>
              <span style={{ fontSize: 12, color: "#8a8aa3" }}>{ROLE_LABEL[m.role]}</span>
            </div>
            <button onClick={() => void remove(m.id)} style={{ border: 0, background: "#fff0ee", color: "#e8472a", borderRadius: 12, padding: "8px 12px", fontWeight: 700, cursor: "pointer" }}>Retirer</button>
          </div>
        ))}
      </div>
    </div>
  );
}
