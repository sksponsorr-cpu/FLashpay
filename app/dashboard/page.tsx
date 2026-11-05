"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownLeft, Code2, LayoutDashboard, Link2, Menu, Percent, Settings, Wallet } from "lucide-react";
import ApiKeyManager from "@/components/api-key-manager";
import TransactionsList from "@/components/transactions-list";
import WalletOverview from "@/components/wallet-overview";

const sections = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "wallet", label: "Portefeuilles", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ArrowDownLeft },
  { id: "links", label: "Liens de paiement", icon: Link2 },
  { id: "developers", label: "Développeurs", icon: Code2 },
  { id: "pricing", label: "Tarifs", icon: Percent },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;

type Section = (typeof sections)[number]["id"];

const styles = `
.dashboard { min-height:100vh; background:#fffaf8; color:#17211b; font-family:inherit; }
.dashboard * { box-sizing:border-box; }
.dash-layout { min-height:100vh; display:grid; grid-template-columns:250px minmax(0,1fr); }
.dash-side { background:#fff; border-right:1px solid #f3e3dc; padding:24px 16px; display:flex; flex-direction:column; gap:8px; }
.dash-brand { display:flex; align-items:center; gap:10px; padding:0 8px 22px; font-size:20px; font-weight:800; }
.dash-logo { width:36px;height:36px;border-radius:12px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff;display:grid;place-items:center; }
.dash-nav { display:flex;align-items:center;gap:11px;width:100%;border:0;background:transparent;color:#536258;padding:12px;border-radius:12px;text-align:left;font:inherit;cursor:pointer; }
.dash-nav:hover,.dash-nav.active { background:#fff0eb;color:#d93a1f; }
.dash-main { min-width:0; }
.dash-top { height:66px;background:#fff;border-bottom:1px solid #f3e3dc;display:flex;align-items:center;gap:12px;padding:0 28px;position:sticky;top:0;z-index:5; }
.dash-menu { display:none;border:1px solid #f3e3dc;background:#fff;border-radius:10px;padding:8px;color:#d93a1f; }
.dash-content { max-width:1100px;margin:auto;padding:28px;display:grid;gap:20px; }
.dash-heading h1 { margin:0;font-size:28px;letter-spacing:-.03em; }
.dash-heading p,.dash-muted { color:#718078;margin:6px 0 0;line-height:1.55; }
.dash-card { background:#fff;border:1px solid #f3e3dc;border-radius:18px;padding:20px;min-width:0; }
.dash-card h2,.dash-card h3 { margin:0 0 14px;font-size:18px; }
.dash-actions { display:flex;gap:10px;flex-wrap:wrap; }
.dash-btn { display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 15px;border:0;border-radius:11px;background:linear-gradient(180deg,#ff6a3d,#e8401f);color:#fff;font-weight:700;cursor:pointer;text-decoration:none; }
.dash-btn.secondary { background:#fff0eb;color:#d93a1f;border:1px solid #f3e3dc; }
.dash-table-wrap { overflow-x:auto; }
.dash-table { border-collapse:collapse;width:100%;font-size:14px; }
.dash-table th,.dash-table td { text-align:left;padding:12px 8px;border-top:1px solid #f3e3dc; }
.dash-table th { color:#718078;font-size:12px; }
.dash-scrim { display:none; }
@media(max-width:850px){.dash-layout{grid-template-columns:1fr}.dash-side{position:fixed;z-index:12;inset:0 auto 0 0;width:min(280px,85vw);transform:translateX(-105%);transition:transform .2s}.dash-side.open{transform:none;box-shadow:0 20px 60px #17211b33}.dash-menu{display:grid;place-items:center}.dash-scrim.open{display:block;position:fixed;inset:0;background:#17211b55;z-index:11}.dash-top{padding:0 16px}.dash-content{padding:20px 16px}}
@media(max-width:390px){.dash-content{padding:16px 12px}.dash-card{padding:15px}.dash-heading h1{font-size:24px}}
`;

export default function DashboardPage() {
  const [active, setActive] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchParams = useSearchParams();
  const appId = searchParams.get("app");
  const current = sections.find((section) => section.id === active)!;
  return <main className="dashboard">
    <style>{styles}</style>
    <div className="dash-layout">
      <aside className={`dash-side ${menuOpen ? "open" : ""}`}>
        <div className="dash-brand"><span className="dash-logo">f</span>flash<span style={{color:"#e8401f"}}>pay</span></div>
        {sections.map(({id,label,icon:Icon}) => <button key={id} className={`dash-nav ${active===id?"active":""}`} onClick={()=>{setActive(id);setMenuOpen(false)}}><Icon size={18}/>{label}</button>)}
        <a className="dash-nav" href="/apps">← Mes applications</a>
      </aside>
      <div className={`dash-scrim ${menuOpen?"open":""}`} onClick={()=>setMenuOpen(false)}/>
      <div className="dash-main">
        <header className="dash-top"><button className="dash-menu" aria-label="Ouvrir le menu" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><span>FlashPay / <strong>{current.label}</strong></span></header>
        <div className="dash-content">
          <header className="dash-heading"><h1>{active === "overview" ? "Tableau de bord" : current.label}</h1><p>{appId ? `Application sélectionnée : ${appId}` : "Sélectionne une application depuis Mes applications."}</p></header>
          {active === "overview" && <><WalletOverview/><section className="dash-card"><h2>Transactions récentes</h2><TransactionsList/></section></>}
          {active === "wallet" && <WalletOverview/>}
          {active === "transactions" && <section className="dash-card"><h2>Toutes les transactions</h2><TransactionsList/></section>}
          {active === "developers" && <ApiKeyManager/>}
          {active === "links" && <section className="dash-card"><h2>Créer une collecte</h2><p className="dash-muted">Les demandes de paiement réelles restent soumises aux protections et à l’activation serveur existantes.</p><a className="dash-btn" href="/docs/api">Consulter l’API</a></section>}
          {active === "pricing" && <section className="dash-card"><h2>Tarification</h2><p className="dash-muted">Sans abonnement : 6 %. Basic : 1 % jusqu’à 200 000 FCFA encaissés par mois, puis 6 %. Premium : 1 % jusqu’à 500 000 FCFA, puis 6 %. Le client paie 2,5 % en plus.</p></section>}
          {active === "settings" && <section className="dash-card"><h2>Paramètres</h2><p className="dash-muted">Les paiements réels restent verrouillés jusqu’à vérification et activation.</p></section>}
        </div>
      </div>
    </div>
  </main>;
}
