"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft, ArrowUpRight, Bell, Code2, LayoutDashboard, LifeBuoy, Link2, Menu, Moon, Percent,
  Receipt, Settings, ShieldAlert, Sun, TrendingUp, Users, Wallet, Webhook, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ApiKeyManager from "@/components/api-key-manager";
import TransactionsList from "@/components/transactions-list";
import WalletOverview from "@/components/wallet-overview";

const sections = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard, ready: true },
  { id: "wallet", label: "Wallet", icon: Wallet, ready: true },
  { id: "transactions", label: "Transactions", icon: ArrowDownLeft, ready: true },
  { id: "links", label: "Liens de paiement", icon: Link2, ready: true },
  { id: "checkout", label: "Sessions de checkout", icon: Receipt, ready: false },
  { id: "clients", label: "Clients", icon: Users, ready: false },
  { id: "stats", label: "Statistiques", icon: TrendingUp, ready: false },
  { id: "withdrawals", label: "Retraits", icon: ArrowUpRight, ready: false },
  { id: "developers", label: "Développeur", icon: Code2, ready: true },
  { id: "webhooks", label: "Webhooks", icon: Webhook, ready: false },
  { id: "disputes", label: "Litiges", icon: ShieldAlert, ready: false },
  { id: "pricing", label: "Tarification", icon: Percent, ready: true },
  { id: "support", label: "Support", icon: LifeBuoy, ready: false },
  { id: "settings", label: "Paramètres", icon: Settings, ready: true },
] as const;
type Section = (typeof sections)[number]["id"];
type AppOption = { id: string; name: string };

const styles = `
.fp{--bg:#f6f6fb;--surface:rgba(255,255,255,.78);--surface-solid:#fff;--text:#14142b;--muted:#6b6b85;--border:rgba(20,20,43,.08);--accent:#6366f1;--accent-soft:rgba(99,102,241,.12);--accent-text:#4f46e5;--shadow:0 1px 2px rgba(20,20,43,.04),0 10px 30px rgba(20,20,43,.06);min-height:100vh;background:var(--bg);color:var(--text);font-family:Inter,"SF Pro Display",system-ui,-apple-system,sans-serif;transition:background .3s ease,color .3s ease}
.fp.dark{--bg:#0b0f17;--surface:rgba(17,24,39,.7);--surface-solid:#111827;--text:#f4f5fa;--muted:#9aa3b8;--border:rgba(255,255,255,.1);--accent:#7c3aed;--accent-soft:rgba(124,58,237,.18);--accent-text:#c4b5fd;--shadow:0 10px 40px rgba(0,0,0,.35)}
.fp *{box-sizing:border-box;min-width:0}
.fp button{font:inherit;color:inherit;cursor:pointer}
.fp :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.fp-layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh}
.fp-side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:4px;padding:22px 14px;border-right:1px solid var(--border);background:var(--surface);backdrop-filter:blur(18px)}
.fp-brand{display:flex;align-items:center;gap:10px;padding:4px 10px 22px;font-size:19px;font-weight:700;letter-spacing:-.3px}
.fp-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:linear-gradient(145deg,#8b5cf6,#6366f1);color:#fff;font-weight:800;box-shadow:0 6px 16px rgba(99,102,241,.35)}
.fp-nav{display:flex;align-items:center;gap:11px;width:100%;min-height:44px;padding:10px 12px;border:0;border-radius:12px;background:transparent;color:var(--muted);text-align:left;font-size:14px;font-weight:500;transition:background .2s ease,color .2s ease,transform .2s ease;text-decoration:none}
.fp-nav:hover{background:var(--accent-soft);color:var(--text);transform:translateX(2px)}
.fp-nav.active{background:var(--accent-soft);color:var(--accent-text);font-weight:650}
.fp-nav.soon{opacity:.6}
.fp-tag{margin-left:auto;font-size:10px;padding:2px 6px;border-radius:6px;background:var(--border);color:var(--muted)}
.fp-side-foot{margin-top:auto;padding-top:14px;border-top:1px solid var(--border)}
.fp-main{min-width:0}
.fp-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;min-height:66px;padding:10px 28px;border-bottom:1px solid var(--border);background:var(--surface);backdrop-filter:blur(18px)}
.fp-icon-btn{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--border);border-radius:12px;background:var(--surface-solid);color:var(--text);transition:transform .15s ease,background .2s ease}
.fp-icon-btn:hover{transform:translateY(-1px)}
.fp-icon-btn:active{transform:scale(.96)}
.fp-menu{display:none}
.fp-app{flex:1;max-width:360px;height:42px;padding:0 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface-solid);color:var(--text);font-weight:600}
.fp-avatar{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:linear-gradient(145deg,#8b5cf6,#6366f1);color:#fff;font-size:13px;font-weight:700;margin-left:auto}
.fp-content{max-width:1120px;margin:auto;padding:30px 28px 48px;display:grid;gap:20px}
.fp-head h1{margin:0;font-size:clamp(24px,2.4vw,32px);font-weight:700;letter-spacing:-.6px}
.fp-head p{margin:6px 0 0;color:var(--muted);line-height:1.55}
.fp-card{padding:20px;border:1px solid var(--border);border-radius:24px;background:var(--surface-solid);box-shadow:var(--shadow);animation:fp-rise .5s cubic-bezier(.2,.8,.2,1) both}
.fp-card h2{margin:0 0 6px;font-size:17px;font-weight:650}
.fp-muted{color:var(--muted);line-height:1.6}
.fp-soon{display:grid;place-items:center;gap:8px;min-height:220px;text-align:center}
.fp-soon strong{font-size:17px}
.fp-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border:0;border-radius:14px;background:linear-gradient(145deg,#7c3aed,#6366f1);color:#fff;font-weight:600;box-shadow:0 8px 22px rgba(99,102,241,.3);transition:transform .15s ease,box-shadow .2s ease}
.fp-primary:hover{transform:translateY(-1px);box-shadow:0 12px 28px rgba(99,102,241,.38)}
.fp-primary:active{transform:scale(.98)}
.fp-scrim{display:none}
.fp-drawer-head{display:none}
@keyframes fp-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (max-width:900px){
  .fp-layout{grid-template-columns:1fr}
  .fp-side{position:fixed;z-index:40;inset:0 auto 0 0;width:min(300px,86vw);height:100dvh;transform:translateX(-105%);transition:transform .3s cubic-bezier(.2,.8,.2,1);box-shadow:none;overflow-y:auto}
  .fp-side.open{transform:none;box-shadow:0 24px 60px rgba(0,0,0,.3)}
  .fp-scrim.open{display:block;position:fixed;inset:0;z-index:35;background:rgba(10,12,20,.45);backdrop-filter:blur(3px);animation:fp-fade .25s ease both}
  .fp-menu{display:grid}
  .fp-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:4px 10px 14px}
  .fp-drawer-head+.fp-brand{display:none}
  .fp-top{padding:10px 14px}
  .fp-content{padding:20px 14px 36px}
}
@keyframes fp-fade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.fp *,.fp *::before,.fp *::after{animation:none!important;transition:none!important}}
`;

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const appId = params.get("app") ?? "";
  const [active, setActive] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [apps, setApps] = useState<AppOption[]>([]);
  const [appsError, setAppsError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login"); return; }
      const { data, error } = await supabase.from("apps").select("id,name").order("created_at", { ascending: true });
      if (!alive) return;
      if (error) { setAppsError("Impossible de charger les applications. Vérifie que la migration apps est appliquée."); return; }
      const list = (data ?? []) as AppOption[];
      setApps(list);
      if (!list.length) { router.replace("/apps"); return; }
      if (!appId || !list.some((item) => item.id === appId)) {
        router.replace(`${pathname}?app=${encodeURIComponent(list[0].id)}`);
      }
    })();
    return () => { alive = false; };
  }, [appId, pathname, router]);

  const currentApp = apps.find((item) => item.id === appId) ?? apps[0];
  const currentSection = sections.find((item) => item.id === active)!;
  function selectApp(nextId: string) { router.replace(`${pathname}?app=${encodeURIComponent(nextId)}`); }

  const initials = (currentApp?.name ?? "FP").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return <main className={`fp ${dark ? "dark" : ""}`}><style>{styles}</style>
    <div className="fp-layout">
      <aside className={`fp-side ${menuOpen ? "open" : ""}`} aria-label="Navigation principale">
        <div className="fp-drawer-head">
          <div className="fp-brand" style={{ padding: 0 }}><span className="fp-logo">f</span>flash<span style={{ color: "#8b5cf6" }}>pay</span></div>
          <button className="fp-icon-btn" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}><X size={18} /></button>
        </div>
        <div className="fp-brand"><span className="fp-logo">f</span>flash<span style={{ color: "#8b5cf6" }}>pay</span></div>
        {sections.map(({ id, label, icon: Icon, ready }) => (
          <button key={id} className={`fp-nav ${active === id ? "active" : ""} ${ready ? "" : "soon"}`}
            aria-current={active === id ? "page" : undefined}
            onClick={() => { setActive(id); setMenuOpen(false); }}>
            <Icon size={18} />{label}{!ready && <span className="fp-tag">Bientôt</span>}
          </button>
        ))}
        <a className="fp-nav" href="/apps" style={{ marginTop: 10 }}>← Mes applications</a>
      </aside>
      <div className={`fp-scrim ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(false)} />
      <div className="fp-main">
        <header className="fp-top">
          <button className="fp-icon-btn fp-menu" aria-label="Ouvrir le menu" onClick={() => setMenuOpen(true)}><Menu size={18} /></button>
          <select className="fp-app" aria-label="Choisir une application" value={currentApp?.id ?? ""} disabled={!apps.length} onChange={(e) => selectApp(e.target.value)}>
            {apps.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <button className="fp-icon-btn" aria-label="Notifications"><Bell size={18} /></button>
          <button className="fp-icon-btn" aria-label={dark ? "Passer en mode clair" : "Passer en mode sombre"} onClick={() => setDark((d) => !d)}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="fp-avatar" aria-hidden="true">{initials}</span>
        </header>
        <div className="fp-content">
          <header className="fp-head"><h1>{currentSection.label}</h1>{appsError && <p role="alert" className="fp-muted">{appsError}</p>}</header>
          {appId && active === "overview" && <><WalletOverview appId={appId} /><section className="fp-card"><h2>Transactions récentes</h2><TransactionsList appId={appId} /></section></>}
          {appId && active === "wallet" && <WalletOverview appId={appId} />}
          {appId && active === "transactions" && <section className="fp-card"><h2>Toutes les transactions</h2><TransactionsList appId={appId} /></section>}
          {appId && active === "developers" && <ApiKeyManager appId={appId} />}
          {active === "links" && <section className="fp-card"><h2>Créer une collecte</h2><p className="fp-muted">Crée une demande de collecte depuis l’API développeur. Les protections des paiements réels restent actives.</p><a href="/docs/api" style={{ color: "var(--accent-text)", fontWeight: 600 }}>Documentation API</a></section>}
          {active === "pricing" && <section className="fp-card"><h2>Tarification</h2><p className="fp-muted">Sans abonnement : 6 %. Basic : 1 % sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %. Premium : 1 % jusqu’à 500 000 FCFA, puis 6 %. Le client paie 2,5 % en plus.</p></section>}
          {active === "settings" && <section className="fp-card"><h2>Paramètres</h2><p className="fp-muted">Les paiements réels restent soumis à la vérification du compte et aux paramètres d’activation côté serveur.</p></section>}
          {!currentSection.ready && <section className="fp-card fp-soon"><strong>{currentSection.label} — bientôt disponible</strong><p className="fp-muted">Cette section n’est pas encore branchée aux données. Elle apparaît ici pour finaliser la navigation.</p></section>}
        </div>
      </div>
    </div>
  </main>;
}
