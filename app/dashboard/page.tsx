"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, Code2, LayoutDashboard, Link2, Menu, Percent, Settings, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ApiKeyManager from "@/components/api-key-manager";
import TransactionsList from "@/components/transactions-list";
import WalletOverview from "@/components/wallet-overview";

const sections = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "wallet", label: "Portefeuille", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ArrowDownLeft },
  { id: "links", label: "Liens de paiement", icon: Link2 },
  { id: "developers", label: "Développeurs", icon: Code2 },
  { id: "pricing", label: "Tarification", icon: Percent },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;
type Section = (typeof sections)[number]["id"];
type AppOption = { id: string; name: string };

const styles = `
.dashboard{min-height:100vh;background:#fffaf8;color:#17211b;font-family:inherit}.dashboard *{box-sizing:border-box;min-width:0}.dash-layout{min-height:100vh;display:grid;grid-template-columns:245px minmax(0,1fr)}.dash-side{background:#fff;border-right:1px solid #f3e3dc;padding:22px 14px;display:flex;flex-direction:column;gap:7px}.dash-brand{display:flex;align-items:center;gap:9px;padding:0 8px 20px;font-size:20px;font-weight:800}.dash-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff}.dash-nav{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:transparent;color:#536258;text-align:left;font:inherit;cursor:pointer}.dash-nav:hover,.dash-nav.active{background:#fff0eb;color:#d93a1f}.dash-main{min-width:0}.dash-top{position:sticky;top:0;z-index:5;min-height:68px;padding:10px 24px;display:flex;align-items:center;gap:12px;background:#fff;border-bottom:1px solid #f3e3dc}.dash-menu{display:none;border:1px solid #f3e3dc;background:#fff;border-radius:10px;padding:8px;color:#d93a1f}.dash-top-label{font-size:13px;color:#65736b}.dash-app-select{width:min(360px,100%);height:42px;padding:0 12px;border:1px solid #f3e3dc;border-radius:11px;background:#fffaf8;color:#17211b;font:inherit;font-weight:700}.dash-content{max-width:1100px;margin:auto;padding:26px;display:grid;gap:18px}.dash-card{padding:19px;border:1px solid #f3e3dc;border-radius:17px;background:#fff}.dash-head h1{margin:0;font-size:27px}.dash-muted{color:#718078;line-height:1.55}.dash-scrim{display:none}@media(max-width:850px){.dash-layout{grid-template-columns:1fr}.dash-side{position:fixed;z-index:12;inset:0 auto 0 0;width:min(280px,85vw);transform:translateX(-105%);transition:transform .2s}.dash-side.open{transform:none;box-shadow:0 20px 60px #17211b33}.dash-scrim.open{display:block;position:fixed;inset:0;background:#17211b55;z-index:11}.dash-menu{display:grid;place-items:center}.dash-top{padding:10px 12px;flex-wrap:wrap}.dash-content{padding:18px 14px}.dash-app-select{flex:1;min-width:0}}@media(max-width:390px){.dash-content{padding:14px 11px}.dash-card{padding:14px}.dash-head h1{font-size:23px}}
`;

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const appId = params.get("app") ?? "";
  const [active, setActive] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
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

  return <main className="dashboard"><style>{styles}</style><div className="dash-layout">
    <aside className={`dash-side ${menuOpen ? "open" : ""}`}><div className="dash-brand"><span className="dash-logo">f</span>flash<span style={{color:"#e8401f"}}>pay</span></div>{sections.map(({id,label,icon:Icon})=><button key={id} className={`dash-nav ${active===id?"active":""}`} onClick={()=>{setActive(id);setMenuOpen(false)}}><Icon size={18}/>{label}</button>)}<a className="dash-nav" href="/apps">← Mes applications</a></aside>
    <div className={`dash-scrim ${menuOpen?"open":""}`} onClick={()=>setMenuOpen(false)}/><div className="dash-main">
      <header className="dash-top"><button className="dash-menu" aria-label="Ouvrir le menu" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><span className="dash-top-label">Application active</span><select className="dash-app-select" aria-label="Choisir une application" value={currentApp?.id ?? ""} disabled={!apps.length} onChange={(event)=>selectApp(event.target.value)}>{apps.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></header>
      <div className="dash-content"><header className="dash-head"><h1>{currentSection.label}</h1>{appsError&&<p role="alert" className="dash-muted">{appsError}</p>}</header>
        {appId&&active==="overview"&&<><WalletOverview appId={appId}/><section className="dash-card"><h2>Transactions récentes</h2><TransactionsList appId={appId}/></section></>}
        {appId&&active==="wallet"&&<WalletOverview appId={appId}/>}
        {appId&&active==="transactions"&&<section className="dash-card"><h2>Toutes les transactions</h2><TransactionsList appId={appId}/></section>}
        {appId&&active==="developers"&&<ApiKeyManager appId={appId}/>}
        {active==="links"&&<section className="dash-card"><h2>Créer une collecte</h2><p className="dash-muted">Crée une demande de collecte depuis l’API développeur. Les protections des paiements réels restent actives.</p><a href="/docs/api">Documentation API</a></section>}
        {active==="pricing"&&<section className="dash-card"><h2>Tarification</h2><p className="dash-muted">Sans abonnement : 6 %. Basic : 1 % sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %. Premium : 1 % jusqu’à 500 000 FCFA, puis 6 %. Le client paie 2,5 % en plus.</p></section>}
        {active==="settings"&&<section className="dash-card"><h2>Paramètres</h2><p className="dash-muted">Les paiements réels restent soumis à la vérification du compte et aux paramètres d’activation côté serveur.</p></section>}
      </div>
    </div>
  </div></main>;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
                                                                                  }
