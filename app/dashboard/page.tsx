"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, Code2, LayoutDashboard, Link2, Menu, Percent, Settings, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ApiKeyManager from "@/components/api-key-manager";
import TransactionsList from "@/components/transactions-list";
import WalletOverview from "@/components/wallet-overview";
import TestFunds from "@/components/test-funds";
import WithdrawalsView from "@/components/withdrawals-view";
import PaymentLinksView from "@/components/payment-links-view";
import SettingsView from "@/components/settings-view";
import VerificationBanner from "@/components/verification-banner";

const sections = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "wallet", label: "Portefeuille", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ArrowDownLeft },
  { id: "links", label: "Liens de paiement", icon: Link2 },
  { id: "withdrawals", label: "Retraits", icon: Wallet },
  { id: "developers", label: "Développeurs", icon: Code2 },
  { id: "pricing", label: "Tarification", icon: Percent },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;
type Section = (typeof sections)[number]["id"];
type AppOption = { id: string; name: string };

const styles = `
.dashboard{min-height:100vh;background:#fffaf8;color:#17211b;font-family:inherit}.dashboard *{box-sizing:border-box;min-width:0}.dash-layout{min-height:100vh;display:grid;grid-template-columns:245px minmax(0,1fr)}.dash-side{background:#fff;border-right:1px solid #f3e3dc;padding:22px 14px;display:flex;flex-direction:column;gap:7px}.dash-brand{display:flex;align-items:center;gap:9px;padding:0 8px 20px;font-size:20px;font-weight:800}.dash-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff}.dash-nav{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:transparent;color:#536258;text-align:left;font:inherit;cursor:pointer}.dash-nav:hover,.dash-nav.active{background:#fff0eb;color:#d93a1f}.dash-main{min-width:0}.dash-top{position:sticky;top:0;z-index:5;min-height:68px;padding:10px 24px;display:flex;align-items:center;gap:12px;background:#fff;border-bottom:1px solid #f3e3dc}.dash-menu{display:none;border:1px solid #f3e3dc;background:#fff;border-radius:10px;padding:8px;color:#d93a1f}.dash-top-label{font-size:13px;color:#65736b}.dash-app-select{width:min(360px,100%);height:42px;padding:0 12px;border:1px solid #f3e3dc;border-radius:11px;background:#fffaf8;color:#17211b;font:inherit;font-weight:700}.dash-content{max-width:1100px;margin:auto;padding:26px;display:grid;gap:18px}.dash-card{padding:19px;border:1px solid #f3e3dc;border-radius:17px;background:#fff}.dash-head h1{margin:0;font-size:27px}.dash-muted{color:#718078;line-height:1.55}.dash-scrim{display:none}.workspace-view{display:grid;gap:16px}.view-intro{display:flex;align-items:center;gap:14px;padding:4px 0}.view-intro h2{margin:0;font-size:22px}.view-intro p{margin:4px 0 0;color:#718078}.view-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#fff0eb;color:#d93a1f;flex:none}.panel{padding:19px;border:1px solid #f3e3dc;border-radius:17px;background:#fff;display:grid;gap:12px}.panel-heading{font-weight:700;font-size:15px;color:#17211b}.key-create-form{display:grid;gap:12px}.key-create-form label,.key-create-form>div>label{font-size:13px;font-weight:700;color:#536258}.key-create-form input,.key-create-form select{height:44px;padding:0 12px;border:1px solid #f3e3dc;border-radius:12px;background:#fffaf8;color:#17211b;font:inherit}.primary-button{height:46px;padding:0 18px;border:0;border-radius:13px;background:#d93a1f;color:#fff;font:inherit;font-weight:700;box-shadow:0 8px 20px #d93a1f33}.primary-button:disabled{opacity:.5}.text-action{border:0;background:transparent;color:#d93a1f;font:inherit;font-weight:700}.notice-bar{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:#fff0eb;color:#8a2a14}.notice-bar button{margin-left:auto;border:0;background:transparent;font-size:18px;color:inherit}.new-key-reveal{display:grid;gap:10px;padding:16px;border-radius:17px;background:#fff;border:1px dashed #d93a1f66}.new-key-reveal code{display:block;padding:12px;border-radius:12px;background:#fffaf8;word-break:break-all;font-size:13px}.new-key-reveal button{justify-self:start;border:1px solid #f3e3dc;background:#fff;border-radius:11px;padding:8px 12px;font:inherit;font-weight:700;color:#d93a1f}.key-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #f3e3dc}.key-row code,.key-row-copy{font-size:13px;color:#718078}.empty-keys,.security-note,.production-key-lock{color:#718078;line-height:1.5;padding:12px;border-radius:13px;background:#fffaf8}.production-key-lock{border:1px dashed #f3e3dc}.test-funds{display:grid;gap:10px}.test-funds .row{display:grid;grid-template-columns:1fr 1fr auto;gap:10px}@media(max-width:600px){.test-funds .row{grid-template-columns:1fr}}.dashboard{background:#f8f7fc;color:#0f0f1a}.dash-side{background:#fff;border-right:1px solid #ececf4;padding:24px 16px}.dash-nav{font-size:15px;font-weight:600;color:#55566a;padding:12px 14px;border-radius:14px}.dash-nav:hover{background:#f3f2fb;color:#5b3fd6}.dash-nav.active{background:#5b3fd6;color:#fff;box-shadow:0 8px 20px #5b3fd64d}.dash-nav.active svg{color:#fff}.dash-card{border-radius:22px;border:1px solid #ececf4;background:#fff;box-shadow:0 8px 24px #1a1a3a0a}.dash-head h1,.dash-brand{color:#0f0f1a;font-weight:800;letter-spacing:-.02em}.dash-muted,.dash-top-label{color:#6b6c80}.primary-button{background:#5b3fd6;box-shadow:0 10px 24px #5b3fd640}.dash-app-select{background:#fff;border:1px solid #ececf4;border-radius:16px}.workspace-view h2,.workspace-view h3,.panel-heading,.view-intro h2,.new-key-reveal strong{color:#0f0f1a}.view-icon{background:#efeafd;color:#5b3fd6}.notice-bar{background:#efeafd;color:#4a2fb3}.test-funds select,.test-funds input,.key-create-form input,.key-create-form select{background:#f8f7fc;color:#0f0f1a;border:1px solid #ececf4}.new-key-reveal{background:#fff;border:1px dashed #5b3fd66b}.new-key-reveal code{background:#f8f7fc;color:#0f0f1a}.dash-nav.active{background:#fff0eb!important;color:#c8321a!important;box-shadow:inset 3px 0 0 #d93a1f!important}.fp-wallets{display:grid;gap:16px}.fp-wallet-grid{display:grid;gap:12px}.fp-wallet-card,.fp-card,.fp-empty-card{background:#fff!important;border:1px solid #ececf4!important;border-radius:22px!important;padding:18px;box-shadow:0 8px 24px #1a1a3a0a;color:#0f0f1a}.fp-wallet-head,.fp-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.fp-code{font-weight:800;font-size:13px;color:#5b3fd6;background:#efeafd;border-radius:10px;padding:4px 10px}.fp-small{font-size:12px;color:#6b6c80}.fp-wallet-balance{font-size:28px;font-weight:800;margin:10px 0 4px;color:#0f0f1a}.fp-wallet-balance small{font-size:14px;color:#6b6c80}.fp-wallet-meta,.fp-muted{font-size:13px;color:#6b6c80}.fp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.fp-btn{min-height:44px;padding:0 18px;border:0;border-radius:14px;background:#5b3fd6;color:#fff;font:inherit;font-weight:700;cursor:pointer}.fp-btn-ghost{background:#fff!important;color:#5b3fd6!important;border:1px solid #ececf4!important}.fp-form{display:grid;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #ececf4}.fp-input{min-height:44px;padding:0 12px;border:1px solid #ececf4;border-radius:12px;background:#f8f7fc;color:#0f0f1a;font:inherit}.fp-row{display:flex!important;justify-content:space-between;align-items:center;gap:12px;background:#fff!important;border:0!important;border-top:1px solid #ececf4!important;border-radius:0!important;padding:12px 0!important;color:#0f0f1a!important;opacity:1!important;transform:none!important;animation:none!important}.fp-row strong{color:#0f0f1a!important}.fp-row .fp-small{display:block}.fp-plus{color:#13a05a!important}.fp-notice{padding:12px 14px;border-radius:14px;background:#efeafd;color:#4a2fb3}.fp-empty-card strong{font-size:16px}.fp-modal-overlay{position:fixed;inset:0;z-index:60;background:#0f0f1a66;display:grid;place-items:end center;padding:16px}@media(min-width:640px){.fp-modal-overlay{place-items:center}}.fp-modal{width:100%;max-width:420px;background:#fff;border-radius:24px;padding:20px;box-shadow:0 30px 60px -20px #0f0f1a59;display:grid;gap:12px;animation:fadeUp .3s ease both}.fp-modal-head{display:flex;justify-content:space-between;align-items:center}.fp-modal-head strong{font-size:18px;color:#0f0f1a}.fp-close{width:36px;height:36px;border:0;border-radius:12px;background:#f3f2fb;font-size:20px;color:#55566a;cursor:pointer}.fp-field{display:grid;gap:6px}.fp-field span{font-size:13px;font-weight:700;color:#55566a}.fp-modal .fp-actions .fp-btn{flex:1}.pricing-wrap{display:grid;gap:16px}.plan-grid{display:grid;gap:12px;grid-template-columns:1fr}@media(min-width:640px){.plan-grid{grid-template-columns:repeat(3,1fr)}}.plan-card{display:grid;gap:8px}.plan-featured{border:1px solid #5b3fd6!important;box-shadow:0 12px 30px #5b3fd626!important}.plan-name{font-size:13px;font-weight:700;color:#5b3fd6;text-transform:uppercase;letter-spacing:.04em}.plan-rate{font-size:34px;font-weight:800;color:#0f0f1a;letter-spacing:-.02em}.plan-note{display:grid;gap:4px}.plan-note strong{color:#0f0f1a}.dev-wrap{display:grid;gap:16px}.dev-tabs{display:flex;gap:8px;flex-wrap:wrap}.dev-tab{min-height:44px;padding:0 18px;border:1px solid #ececf4;border-radius:14px;background:#fff;color:#55566a;font:inherit;font-weight:700;cursor:pointer}.wd-wrap{display:grid;gap:16px}.wd-card{display:grid;gap:12px}.wd-hint{margin:0}.wd-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #ececf4}.wd-row div{display:grid;gap:2px}.tx-wrap{display:grid;gap:12px}.tx-search{min-height:44px;padding:0 14px;border:1px solid #ececf4;border-radius:14px;background:#f8f7fc;color:#0f0f1a;font:inherit}.tx-pills{display:flex;gap:8px;flex-wrap:wrap}.tx-pill{min-height:36px;padding:0 14px;border:1px solid #ececf4;border-radius:999px;background:#fff;color:#55566a;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.tx-pill.on{background:#5b3fd6;border-color:#5b3fd6;color:#fff}.tx-row{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-top:1px solid #ececf4;flex-wrap:wrap}.tx-main{display:grid;gap:3px;min-width:0;flex:1 1 180px}.tx-main strong{color:#0f0f1a}.tx-ref{font-size:12px;color:#6b6c80;overflow-wrap:anywhere}.tx-date,.tx-net{font-size:12px;color:#6b6c80}.tx-side{display:grid;gap:4px;justify-items:end;text-align:right;white-space:nowrap}.tx-side strong{color:#0f0f1a}.tx-badge{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px}.tx-successful{background:#e6f7ee;color:#13a05a}.tx-pending{background:#fff4e0;color:#b76e00}.tx-failed{background:#fdecea;color:#c8321a}.tx-expired{background:#f1f1f5;color:#6b6c80}.tx-msg{font-size:14px;color:#6b6c80}.tx-error{color:#c8321a}.pl-wrap{display:grid;gap:16px}.pl-card{display:grid;gap:12px}.pl-field{display:grid;gap:6px}.pl-field span{font-size:13px;font-weight:700;color:#55566a}.pl-input{min-height:44px;padding:0 12px;border:1px solid #ececf4;border-radius:12px;background:#f8f7fc;color:#0f0f1a;font:inherit}.pl-two{display:grid;gap:12px;grid-template-columns:1fr}@media(min-width:640px){.pl-two{grid-template-columns:1fr 1fr}}.pl-row{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 0;border-top:1px solid #ececf4}.pl-main{display:grid;gap:3px;min-width:0;flex:1 1 200px}.pl-main strong{color:#0f0f1a}.pl-url{font-size:12px;color:#5b3fd6;overflow-wrap:anywhere}.pl-actions{display:flex;gap:8px;align-items:center}.pl-btn{min-height:38px;padding:0 14px;border:0;border-radius:12px;background:#5b3fd6;color:#fff;font:inherit;font-weight:700;cursor:pointer}.pl-btn-ghost{background:#fff;color:#5b3fd6;border:1px solid #ececf4}.set-wrap{display:grid;gap:16px}.set-card{display:grid;gap:12px}.set-field{display:grid;gap:6px}.set-field span{font-size:13px;font-weight:700;color:#55566a}.set-input{min-height:44px;padding:0 12px;border:1px solid #ececf4;border-radius:12px;background:#f8f7fc;color:#0f0f1a;font:inherit}.kyc-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 18px;border-radius:20px;background:#fff4e0;border:1px solid #f5d9a8;color:#7a4a00}.kyc-banner div{display:grid;gap:3px}.kyc-banner strong{color:#5b3a00}.kyc-banner span{font-size:13px;color:#8a6420}.kyc-btn{min-height:40px;padding:0 16px;border:0;border-radius:12px;background:#5b3fd6;color:#fff;font:inherit;font-weight:700;cursor:pointer}.dev-tab.on{background:#5b3fd6;border-color:#5b3fd6;color:#fff;box-shadow:0 8px 20px #5b3fd64d}
.dashboard{background:radial-gradient(1200px 600px at 10% -10%,#ffe3d9 0%,transparent 60%),#fffaf8}.dash-card,.panel,.new-key-reveal{border-radius:22px;border:1px solid #ececf4;background:#ffffff;box-shadow:0 10px 30px #17211b0d;transition:transform .25s ease,box-shadow .25s ease;animation:fadeUp .45s ease both}.dash-card:hover,.panel:hover{transform:translateY(-2px);box-shadow:0 16px 40px #17211b14}.dash-nav,.primary-button,.dash-app-select,.dash-menu,.notice-bar{transition:background .2s ease,color .2s ease,transform .15s ease}.dash-nav:active,.primary-button:active{transform:scale(.97)}.dash-nav.active{background:linear-gradient(90deg,#fff0eb,#ffe6dc);box-shadow:inset 3px 0 0 #d93a1f}.dash-side{background:#ffffffe6;backdrop-filter:blur(16px)}.dash-top{background:#ffffffcc;backdrop-filter:blur(16px)}.dash-brand,.dash-head h1{letter-spacing:-.02em}.dash-head h1{font-weight:800}.primary-button{min-height:44px;border-radius:16px}.dash-app-select,.key-create-form input,.key-create-form select,.test-funds select,.test-funds input{border-radius:14px;min-height:44px}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dash-card,.panel,.dash-nav{animation:none;transition:none}}@media(max-width:850px){.dash-layout{grid-template-columns:1fr}.dash-side{position:fixed;z-index:12;inset:0 auto 0 0;width:min(280px,85vw);transform:translateX(-105%);transition:transform .2s}.dash-side.open{transform:none;box-shadow:0 20px 60px #17211b33}.dash-scrim.open{display:block;position:fixed;inset:0;background:#17211b55;z-index:11}.dash-menu{display:grid;place-items:center}.dash-top{padding:10px 12px;flex-wrap:wrap}.dash-content{padding:18px 14px}.dash-app-select{flex:1;min-width:0}}@media(max-width:390px){.dash-content{padding:14px 11px}.dash-card{padding:14px}.dash-head h1{font-size:23px}}
`;

function DashboardContent() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("is_admin").single();
      if (alive && data?.is_admin === true) setIsAdmin(true);
    })();
    return () => { alive = false; };
  }, []);
  const [devTab, setDevTab] = useState<"keys"|"ip">("keys");
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
    <aside className={`dash-side ${menuOpen ? "open" : ""}`}><div className="dash-brand"><span className="dash-logo">f</span>flash<span style={{color:"#e8401f"}}>pay</span></div>{sections.map(({id,label,icon:Icon})=><button key={id} className={`dash-nav ${active===id?"active":""}`} onClick={()=>{setActive(id);setMenuOpen(false)}}><Icon size={18}/>{label}</button>)}<a className="dash-nav" href="/apps">← Mes applications</a>{isAdmin&&<a className="dash-nav" href="/admin" style={{marginTop:14}}>Bureau d’administration</a>}
    </aside>
    <div className={`dash-scrim ${menuOpen?"open":""}`} onClick={()=>setMenuOpen(false)}/><div className="dash-main">
      <header className="dash-top"><button className="dash-menu" aria-label="Ouvrir le menu" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><span className="dash-top-label">Application active</span><select className="dash-app-select" aria-label="Choisir une application" value={currentApp?.id ?? ""} disabled={!apps.length} onChange={(event)=>selectApp(event.target.value)}>{apps.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></header>
      <div className="dash-content"><header className="dash-head"><h1>{currentSection.label}</h1>{appsError&&<p role="alert" className="dash-muted">{appsError}</p>}</header>
        {active==="overview"&&<VerificationBanner onOpenSettings={()=>setActive("settings")}/>}
        {appId&&active==="overview"&&<><TestFunds appId={appId}/><WalletOverview appId={appId}/><section className="dash-card"><h2>Transactions récentes</h2><TransactionsList appId={appId}/></section></>}
        {appId&&active==="wallet"&&<><TestFunds appId={appId}/><WalletOverview appId={appId}/></>}
        {appId&&active==="transactions"&&<section className="dash-card"><h2>Toutes les transactions</h2><TransactionsList appId={appId}/></section>}
        {appId&&active==="withdrawals"&&<WithdrawalsView appId={appId} onNew={()=>setActive("wallet")}/>}
        {appId&&active==="developers"&&<section className="dev-wrap">
          <div className="view-intro"><div><h2>Développeur</h2><p className="dash-muted">Clés API, webhooks et sécurité des intégrations pour cette application.</p></div></div>
          <div className="dev-tabs" role="tablist">
            <button role="tab" aria-selected={devTab==="keys"} className={devTab==="keys"?"dev-tab on":"dev-tab"} onClick={()=>setDevTab("keys")}>Clés API</button>
            <button role="tab" aria-selected={devTab==="ip"} className={devTab==="ip"?"dev-tab on":"dev-tab"} onClick={()=>setDevTab("ip")}>IP Whitelist</button>
          </div>
          {devTab==="keys"&&<ApiKeyManager appId={appId}/>}
          {devTab==="ip"&&<div className="dash-card"><strong>Bientôt disponible</strong><p className="dash-muted">La liste blanche d’adresses IP n’est pas encore activée. Tes clés API fonctionnent sans cette restriction pour l’instant.</p></div>}
        </section>}
        {appId&&active==="links"&&<PaymentLinksView appId={appId}/>}
        {active==="pricing"&&<section className="pricing-wrap">
          <div className="view-intro"><div><h2>Tarification</h2><p className="dash-muted">Ce que tu paies sur chaque encaissement, selon ton abonnement.</p></div></div>
          <div className="plan-grid">
            <article className="dash-card plan-card"><span className="plan-name">Sans abonnement</span><strong className="plan-rate">6 %</strong><p className="dash-muted">Par encaissement, sans engagement.</p></article>
            <article className="dash-card plan-card plan-featured"><span className="plan-name">Basic</span><strong className="plan-rate">1 %</strong><p className="dash-muted">Sur les encaissements mensuels jusqu’à 200 000 FCFA, puis 6 %.</p></article>
            <article className="dash-card plan-card"><span className="plan-name">Premium</span><strong className="plan-rate">1 %</strong><p className="dash-muted">Jusqu’à 500 000 FCFA encaissés par mois, puis 6 %.</p></article>
          </div>
          <div className="dash-card plan-note"><strong>Le client paie 2,5 % en plus</strong><span className="dash-muted">Ce supplément est affiché à ton client au moment du paiement, il ne réduit pas ce que tu reçois.</span></div>
        </section>}
        {appId&&active==="settings"&&<SettingsView appId={appId}/>}
      </div>
    </div>
  </div></main>;
}

// useSearchParams doit être lu dans Suspense (exigé par cacheComponents).
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
