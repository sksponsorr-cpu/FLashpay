"use client";

import BrandLoader from "@/components/brand-loader";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, Code2, LayoutDashboard, Link2, Menu, Percent, Settings, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ApiKeyManager from "@/components/api-key-manager";
import TransactionsList from "@/components/transactions-list";
import StatsView from "@/components/stats-view";
import PricingView from "@/components/pricing-view";
import WebhookJournalView from "@/components/webhook-journal-view";
import DisputesView from "@/components/disputes-view";
import WalletOverview from "@/components/wallet-overview";
import TestFunds from "@/components/test-funds";
import WithdrawalsView from "@/components/withdrawals-view";
import PaymentLinksView from "@/components/payment-links-view";
import SettingsView from "@/components/settings-view";
import VerificationBanner from "@/components/verification-banner";
import AppSwitcher from "@/components/app-switcher";
import SubscriptionsView from "@/components/subscriptions-view";
import AccountMenu from "@/components/account-menu";
import NotificationBell from "@/components/notification-bell";

const sections = [
  { id: "overview", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "wallet", label: "Portefeuille", icon: Wallet },
  { id: "transactions", label: "Transactions", icon: ArrowDownLeft },
  { id: "links", label: "Liens de paiement", icon: Link2 },
  { id: "stats", label: "Statistiques", icon: TrendingUp },
  { id: "webhook-journal", label: "Journal des webhooks", icon: Code2 },
  { id: "disputes", label: "Litiges", icon: Percent },
  { id: "withdrawals", label: "Retraits", icon: Wallet },
  { id: "developers", label: "Développeurs", icon: Code2 },
  { id: "pricing", label: "Tarification", icon: Percent }, { id: "subs", label: "Abonnements", icon: Percent },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;
type Section = (typeof sections)[number]["id"];
type AppOption = { id: string; name: string };

const styles = `
.dashboard{min-height:100vh;background:#fffaf8;color:#17211b;font-family:inherit}.dashboard *{box-sizing:border-box;min-width:0}.dash-layout{min-height:100vh;display:grid;grid-template-columns:245px minmax(0,1fr)}.dash-side{background:#fff;border-right:1px solid #f3e3dc;padding:22px 14px;display:flex;flex-direction:column;gap:7px;position:sticky;top:0;height:100vh;overflow-y:auto;overscroll-behavior:contain}.dash-brand{display:flex;align-items:center;gap:9px;padding:0 8px 20px;font-size:20px;font-weight:800}.dash-logo{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff}.dash-nav{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:transparent;color:#536258;text-align:left;font:inherit;cursor:pointer}.dash-nav:hover,.dash-nav.active{background:#fff0eb;color:#d93a1f}.dash-main{min-width:0}.dash-top{position:sticky;top:0;z-index:5;min-height:68px;padding:10px 24px;display:flex;align-items:center;gap:12px;background:#fff;border-bottom:1px solid #f3e3dc}.dash-menu{display:none;border:1px solid #f3e3dc;background:#fff;border-radius:10px;padding:8px;color:#d93a1f}.dash-top-label{font-size:13px;color:#65736b}.dash-app-select{width:min(360px,100%);height:42px;padding:0 12px;border:1px solid #f3e3dc;border-radius:11px;background:#fffaf8;color:#17211b;font:inherit;font-weight:700}.dash-content{max-width:1100px;margin:auto;padding:26px;display:grid;gap:18px}.dash-card{padding:19px;border:1px solid #f3e3dc;border-radius:17px;background:#fff}.dash-head h1{margin:0;font-size:27px}.dash-muted{color:#718078;line-height:1.55}.dash-scrim{display:none}.workspace-view{display:grid;gap:16px}.view-intro{display:flex;align-items:center;gap:14px;padding:4px 0}.view-intro h2{margin:0;font-size:22px}.view-intro p{margin:4px 0 0;color:#718078}.view-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:#fff0eb;color:#d93a1f;flex:none}.panel{padding:19px;border:1px solid #f3e3dc;border-radius:17px;background:#fff;display:grid;gap:12px}.panel-heading{font-weight:700;font-size:15px;color:#17211b}.key-create-form{display:grid;gap:12px}.key-create-form label,.key-create-form>div>label{font-size:13px;font-weight:700;color:#536258}.key-create-form input,.key-create-form select{height:44px;padding:0 12px;border:1px solid #f3e3dc;border-radius:12px;background:#fffaf8;color:#17211b;font:inherit}.primary-button{height:46px;padding:0 18px;border:0;border-radius:13px;background:#d93a1f;color:#fff;font:inherit;font-weight:700;box-shadow:0 8px 20px #d93a1f33}.primary-button:disabled{opacity:.5}.text-action{border:0;background:transparent;color:#d93a1f;font:inherit;font-weight:700}.notice-bar{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:13px;background:#fff0eb;color:#8a2a14}.notice-bar button{margin-left:auto;border:0;background:transparent;font-size:18px;color:inherit}.new-key-reveal{display:grid;gap:10px;padding:16px;border-radius:17px;background:#fff;border:1px dashed #d93a1f66}.new-key-reveal code{display:block;padding:12px;border-radius:12px;background:#fffaf8;word-break:break-all;font-size:13px}.new-key-reveal button{justify-self:start;border:1px solid #f3e3dc;background:#fff;border-radius:11px;padding:8px 12px;font:inherit;font-weight:700;color:#d93a1f}.key-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #f3e3dc}.key-row code,.key-row-copy{font-size:13px;color:#718078}.empty-keys,.security-note,.production-key-lock{color:#718078;line-height:1.5;padding:12px;border-radius:13px;background:#fffaf8}.production-key-lock{border:1px dashed #f3e3dc}.test-funds{display:grid;gap:10px}.test-funds .row{display:grid;grid-template-columns:1fr 1fr auto;gap:10px}@media(max-width:600px){.test-funds .row{grid-template-columns:1fr}}.dashboard{background:#f8f7fc;color:#0f0f1a}.dash-side{background:#fff;border-right:1px solid #ececf4;padding:24px 16px}.dash-nav{font-size:15px;font-weight:600;color:#55566a;padding:12px 14px;border-radius:14px}.dash-nav:hover{background:#f3f2fb;color:#e8401f}.dash-nav.active{background:#e8401f;color:#fff;box-shadow:0 8px 20px #e8401f4d}.dash-nav.active svg{color:#fff}.dash-card{border-radius:22px;border:1px solid #ececf4;background:#fff;box-shadow:0 8px 24px #1a1a3a0a}.dash-head h1,.dash-brand{color:#0f0f1a;font-weight:800;letter-spacing:-.02em}.dash-muted,.dash-top-label{color:#6b6c80}.primary-button{background:#e8401f;box-shadow:0 10px 24px #e8401f40}.dash-app-select{background:#fff;border:1px solid #ececf4;border-radius:16px}.workspace-view h2,.workspace-view h3,.panel-heading,.view-intro h2,.new-key-reveal strong{color:#0f0f1a}.view-icon{background:#fff0eb;color:#e8401f}.notice-bar{background:#fff0eb;color:#b8321a}.test-funds select,.test-funds input,.key-create-form input,.key-create-form select{background:#f8f7fc;color:#0f0f1a;border:1px solid #ececf4}.new-key-reveal{background:#fff;border:1px dashed #e8401f6b}.new-key-reveal code{background:#f8f7fc;color:#0f0f1a}.dash-nav.active{background:#fff0eb!important;color:#c8321a!important;box-shadow:inset 3px 0 0 #d93a1f!important}.fp-wallets{display:grid;gap:16px}.fp-wallet-grid{display:grid;gap:12px}.fp-wallet-card,.fp-card,.fp-empty-card{background:#fff!important;border:1px solid #ececf4!important;border-radius:22px!important;padding:18px;box-shadow:0 8px 24px #1a1a3a0a;color:#0f0f1a}.fp-wallet-head,.fp-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.fp-code{font-weight:800;font-size:13px;color:#e8401f;background:#fff0eb;border-radius:10px;padding:4px 10px}.fp-small{font-size:12px;color:#6b6c80}.fp-wallet-balance{font-size:28px;font-weight:800;margin:10px 0 4px;color:#0f0f1a}.fp-wallet-balance small{font-size:14px;color:#6b6c80}.fp-wallet-meta,.fp-muted{font-size:13px;color:#6b6c80}.fp-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.fp-btn{min-height:44px;padding:0 18px;border:0;border-radius:14px;background:#e8401f;color:#fff;font:inherit;font-weight:700;cursor:pointer}.fp-btn-ghost{background:#fff!important;color:#e8401f!important;border:1px solid #ececf4!important}.fp-form{display:grid;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid #ececf4}.fp-input{min-height:44px;padding:0 12px;border:1px solid #ececf4;border-radius:12px;background:#f8f7fc;color:#0f0f1a;font:inherit}.fp-row{display:flex!important;justify-content:space-between;align-items:center;gap:12px;background:#fff!important;border:0!important;border-top:1px solid #ececf4!important;border-radius:0!important;padding:12px 0!important;color:#0f0f1a!important;opacity:1!important;transform:none!important;animation:none!important}.fp-row strong{color:#0f0f1a!important}.fp-row .fp-small{display:block}.fp-plus{color:#13a05a!important}.fp-notice{padding:12px 14px;border-radius:14px;background:#fff0eb;color:#b8321a}.fp-empty-card strong{font-size:16px}.fp-modal-overlay{position:fixed;inset:0;z-index:60;background:#0f0f1a66;display:grid;place-items:end center;padding:16px}@media(min-width:640px){.fp-modal-overlay{place-items:center;background:rgba(20,20,43,.35);backdrop-filter:blur(3px)}
@media(max-width:719px){.fp-modal-overlay{place-items:end center;padding:0}.fp-modal{max-width:none;border-radius:26px 26px 0 0;max-height:88vh;overflow-y:auto}}}.fp-modal{width:100%;max-width:420px;background:#fff;border-radius:24px;padding:20px;box-shadow:0 30px 60px -20px #0f0f1a59;display:grid;gap:12px;animation:fadeUp .3s ease both}.fp-modal-head{display:flex;justify-content:space-between;align-items:center}.fp-modal-head strong{font-size:18px;color:#0f0f1a}.fp-close{width:36px;height:36px;border:0;border-radius:12px;background:#f3f2fb;font-size:20px;color:#55566a;cursor:pointer}.fp-field{display:grid;gap:6px}.fp-field span{font-size:13px;font-weight:700;color:#55566a}.fp-modal .fp-actions .fp-btn{flex:1}.pricing-wrap{display:grid;gap:16px}.plan-grid{display:grid;gap:12px;grid-template-columns:1fr}@media(min-width:640px){.plan-grid{grid-template-columns:repeat(3,1fr)}}.plan-card{display:grid;gap:8px}.plan-featured{border:1px solid #e8401f!important;box-shadow:0 12px 30px #e8401f26!important}.plan-name{font-size:13px;font-weight:700;color:#e8401f;text-transform:uppercase;letter-spacing:.04em}.plan-rate{font-size:34px;font-weight:800;color:#0f0f1a;letter-spacing:-.02em}.plan-note{display:grid;gap:4px}.plan-note strong{color:#0f0f1a}.dev-wrap{display:grid;gap:16px}.dev-tabs{display:flex;gap:8px;flex-wrap:wrap}.dev-tab{min-height:44px;padding:0 18px;border:1px solid #ececf4;border-radius:14px;background:#fff;color:#55566a;font:inherit;font-weight:700;cursor:pointer}.wd-wrap{display:grid;gap:16px}.wd-card{display:grid;gap:12px}.wd-hint{margin:0}.wd-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #ececf4}.wd-row div{display:grid;gap:2px}.tx-wrap{display:grid;gap:12px}.tx-search{min-height:44px;padding:0 14px;border:1px solid #ececf4;border-radius:14px;background:#f8f7fc;color:#0f0f1a;font:inherit}.tx-pills{display:flex;gap:8px;flex-wrap:wrap}.tx-pill{min-height:36px;padding:0 14px;border:1px solid #ececf4;border-radius:999px;background:#fff;color:#55566a;font:inherit;font-size:14px;font-weight:600;cursor:pointer}.tx-pill.on{background:#e8401f;border-color:#e8401f;color:#fff}.tx-row{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-top:1px solid #ececf4;flex-wrap:wrap}.tx-main{display:grid;gap:3px;min-width:0;flex:1 1 180px}.tx-main strong{color:#0f0f1a}.tx-ref{font-size:12px;color:#6b6c80;overflow-wrap:anywhere}.tx-date,.tx-net{font-size:12px;color:#6b6c80}.tx-side{display:grid;gap:4px;justify-items:end;text-align:right;white-space:nowrap}.tx-side strong{color:#0f0f1a}.tx-badge{font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px}.tx-successful{background:#e6f7ee;color:#13a05a}.tx-pending{background:#fff4e0;color:#b76e00}.tx-failed{background:#fdecea;color:#c8321a}.tx-expired{background:#f1f1f5;color:#6b6c80}.tx-msg{font-size:14px;color:#6b6c80}.tx-error{color:#c8321a}.pl-wrap{display:grid;gap:16px}.pl-card{display:grid;gap:12px}.pl-field{display:grid;gap:6px}.pl-field span{font-size:13px;font-weight:700;color:#55566a}.pl-input{min-height:44px;padding:0 12px;border:1px solid #ececf4;border-radius:12px;background:#f8f7fc;color:#0f0f1a;font:inherit}.pl-two{display:grid;gap:12px;grid-template-columns:1fr}@media(min-width:640px){.pl-two{grid-template-columns:1fr 1fr}}.pl-row{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 0;border-top:1px solid #ececf4}.pl-main{display:grid;gap:3px;min-width:0;flex:1 1 200px}.pl-main strong{color:#0f0f1a}.pl-url{font-size:12px;color:#e8401f;overflow-wrap:anywhere}.pl-actions{display:flex;gap:8px;align-items:center}.pl-btn{min-height:38px;padding:0 14px;border:0;border-radius:12px;background:#e8401f;color:#fff;font:inherit;font-weight:700;cursor:pointer}.pl-btn-ghost{background:#fff;color:#e8401f;border:1px solid #ececf4}.set-wrap{display:grid;gap:16px}.set-card{display:grid;gap:12px}.set-field{display:grid;gap:6px}.set-field span{font-size:13px;font-weight:700;color:#55566a}.set-input{min-height:44px;padding:0 12px;border:1px solid #ececf4;border-radius:12px;background:#f8f7fc;color:#0f0f1a;font:inherit}.kyc-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 18px;border-radius:20px;background:#fff4e0;border:1px solid #f5d9a8;color:#7a4a00}.kyc-banner div{display:grid;gap:3px}.kyc-banner strong{color:#5b3a00}.kyc-banner span{font-size:13px;color:#8a6420}.kyc-btn{min-height:40px;padding:0 16px;border:0;border-radius:12px;background:#e8401f;color:#fff;font:inherit;font-weight:700;cursor:pointer}.dash-bell{position:relative;width:44px;height:44px;border:1px solid #ececf4;border-radius:14px;background:#fff;font-size:18px;cursor:pointer}.dash-bell-pop{position:absolute;right:16px;top:70px;z-index:30;padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #ececf4;box-shadow:0 14px 34px #0f0f1a1f;font-size:13px;color:#55566a}.as-wrap{position:relative;margin-bottom:14px}.as-current,.as-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid #ececf4;border-radius:18px;background:#fff;font:inherit;text-align:left;cursor:pointer;color:#0f0f1a}.as-text{display:grid;gap:2px;min-width:0;flex:1}.as-text strong{font-size:15px}.as-text small{font-size:12px;color:#6b6c80}.as-avatar{display:grid;place-items:center;width:40px;height:40px;border-radius:14px;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff;font-weight:800;font-size:14px;flex:none}.as-avatar.sm{width:34px;height:34px;border-radius:11px;font-size:12px}.as-chev{color:#6b6c80}.as-list{margin-top:8px;padding:8px;border:1px solid #ececf4;border-radius:18px;background:#fff;box-shadow:0 14px 34px #0f0f1a1f;display:grid;gap:6px}.as-item{border:0;box-shadow:none;padding:10px}.as-item.on{background:#fff4ef}.as-dot{width:9px;height:9px;border-radius:50%;background:#e8401f}.as-manage{display:block;padding:12px;border-radius:14px;border:1px dashed #e8401f66;color:#e8401f;font-weight:700;text-decoration:none;text-align:center}.am-wrap{position:relative}.am-btn{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;min-height:44px;border:1px solid #ececf4;border-radius:999px;background:#fff;cursor:pointer;font:inherit}.am-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:linear-gradient(145deg,#ff6a3d,#e8401f);color:#fff;font-weight:800;font-size:13px}.am-avatar.lg{width:44px;height:44px;border-radius:14px;font-size:15px}.am-chev{color:#6b6c80;font-size:12px}.am-pop{position:fixed;right:12px;top:74px;z-index:40;width:270px;background:#fff;border:1px solid #ececf4;border-radius:20px;box-shadow:0 18px 40px #0f0f1a24;padding:8px;display:grid;gap:2px}.am-head{display:flex;gap:12px;align-items:center;padding:10px}.am-id{display:grid;gap:2px;min-width:0}.am-id strong{color:#0f0f1a;font-size:15px}.am-id small{color:#6b6c80;font-size:12px;overflow-wrap:anywhere}.am-item{display:block;width:100%;padding:12px 14px;border:0;border-radius:12px;background:transparent;text-align:left;color:#0f0f1a;font:inherit;font-size:15px;text-decoration:none;cursor:pointer}.am-item:hover{background:#fff7f3}.am-danger{color:#e0233d}:root{color-scheme:light}html,body{background:#fffaf8}.dash-top{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:1px solid #ececf4}.dash-top .dash-app-select{margin-left:auto;min-height:44px;border-radius:14px;padding:0 12px;font-weight:700;max-width:180px}.dash-head h1{font-size:26px;font-weight:800;letter-spacing:-.02em;margin:4px 0}.dash-head p,.dash-head .dash-sub{font-size:14px;color:#6b6c80;margin:0 0 14px}.dash-card{border-radius:22px}.dash-main{padding:18px 16px 30px}.dash-plan{min-height:40px;padding:0 12px;border:1px solid #ececf4;border-radius:999px;background:#fff8f5;color:#c8321a;font:inherit;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}.sub-wrap{display:grid;gap:14px}.sub-title{font-size:26px;font-weight:800;margin:4px 0}.sub-card{display:grid;gap:8px}.sub-card.on{border:1px solid #e8401f}.sub-name{font-size:13px;font-weight:800;color:#e8401f;text-transform:uppercase;letter-spacing:.04em}.sub-rate{font-size:34px;font-weight:800}.sub-badge{justify-self:start;font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;background:#fff0eb;color:#c8321a}.kyc-btn-ghost{min-height:44px;padding:0 16px;border:1px solid #efd9cf;border-radius:14px;background:#fff;color:#e8401f;font:inherit;font-weight:700}.cam{display:grid;gap:8px}.cam-video,.cam-preview{width:100%;border-radius:14px;background:#000}.cam-row{display:flex;gap:8px;flex-wrap:wrap}.cam-file{font-size:13px;color:#6b6c80;display:grid;gap:4px}.fp-steps{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 10px}.fp-step{font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;background:#f3f0fd;color:#6b6c80}.fp-step.on{background:#e8401f;color:#fff}.fp-step.done{background:#e6f7ee;color:#13a05a}.fp-recap{display:grid;gap:4px}.fp-recap .fp-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #ececf4;font-size:14px}.dev-tab.on{background:#e8401f;border-color:#e8401f;color:#fff;box-shadow:0 8px 20px #e8401f4d}
.dashboard{background:radial-gradient(1200px 600px at 10% -10%,#ffe3d9 0%,transparent 60%),#fffaf8}.dash-card,.panel,.new-key-reveal{border-radius:22px;border:1px solid #ececf4;background:#ffffff;box-shadow:0 10px 30px #17211b0d;transition:transform .25s ease,box-shadow .25s ease;animation:fadeUp .45s ease both}.dash-card:hover,.panel:hover{transform:translateY(-2px);box-shadow:0 16px 40px #17211b14}.dash-nav,.primary-button,.dash-app-select,.dash-menu,.notice-bar{transition:background .2s ease,color .2s ease,transform .15s ease}.dash-nav:active,.primary-button:active{transform:scale(.97)}.dash-nav.active{background:linear-gradient(90deg,#fff0eb,#ffe6dc);box-shadow:inset 3px 0 0 #d93a1f}.dash-side{background:#ffffffe6;backdrop-filter:blur(16px)}.dash-top{background:#ffffffcc;backdrop-filter:blur(16px)}.dash-brand,.dash-head h1{letter-spacing:-.02em}.dash-head h1{font-weight:800}.primary-button{min-height:44px;border-radius:16px}.dash-app-select,.key-create-form input,.key-create-form select,.test-funds select,.test-funds input{border-radius:14px;min-height:44px}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.dash-card,.panel,.dash-nav{animation:none;transition:none}}@media(max-width:850px){.dash-layout{grid-template-columns:1fr}.dash-side{position:fixed;z-index:12;inset:0 auto 0 0;width:min(280px,85vw);transform:translateX(-105%);transition:transform .2s}.dash-side.open{transform:none;box-shadow:0 20px 60px #17211b33}.dash-scrim.open{display:block;position:fixed;inset:0;background:#17211b55;z-index:11}.dash-menu{display:grid;place-items:center}.dash-top{padding:10px 12px;flex-wrap:wrap}.dash-content{padding:18px 14px}.dash-app-select{flex:1;min-width:0}}@media(max-width:390px){.dash-content{padding:14px 11px}.dash-card{padding:14px}.dash-head h1{font-size:23px}}
`;

function DashboardContent() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"app"|"verif"|"security">("app");
  const [autoWithdraw, setAutoWithdraw] = useState(false);

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
  const [plan, setPlan] = useState<string | null>(null);
  useEffect(() => {
    if (!appId) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/wallet?app=${encodeURIComponent(appId)}`, { cache: "no-store" });
        const j = await r.json();
        if (alive) setPlan(j.plan ?? null);
      } catch { /* plan non disponible */ }
    })();
    return () => { alive = false; };
  }, [appId]);
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
    if (appId) localStorage.setItem("fp_last_app", appId);
  }, [appId, pathname, router]);

  const currentApp = apps.find((item) => item.id === appId) ?? apps[0];
  const currentSection = sections.find((item) => item.id === active)!;
  function selectApp(nextId: string) { router.replace(`${pathname}?app=${encodeURIComponent(nextId)}`); }

  // Logo F tant que les applications ne sont pas chargées (évite un écran vide).
  if (apps.length === 0 && !appsError) return <BrandLoader fullscreen />;

  return <main className="dashboard"><style>{styles}</style><div className="dash-layout">
    <aside className={`dash-side ${menuOpen ? "open" : ""}`}><div className="dash-brand"><span className="dash-logo">f</span>flash<span style={{color:"#e8401f"}}>pay</span></div>{appId&&<AppSwitcher currentId={appId} onChange={(id)=>router.push(`${pathname}?app=${encodeURIComponent(id)}`)}/>}{isAdmin&&<a className="dash-nav" href="/admin" style={{marginBottom:10}}>Bureau d’administration</a>}{sections.map(({id,label,icon:Icon})=><button key={id} className={`dash-nav ${active===id?"active":""}`} onClick={()=>{setActive(id);setMenuOpen(false)}}><Icon size={18}/>{label}</button>)}<a className="dash-nav" href="/apps">← Mes applications</a>
    </aside>
    <div className={`dash-scrim ${menuOpen?"open":""}`} onClick={()=>setMenuOpen(false)}/><div className="dash-main">
      <header className="dash-top"><button className="dash-menu" aria-label="Ouvrir le menu" onClick={()=>setMenuOpen(true)}><Menu size={20}/></button><NotificationBell/><AccountMenu onSettings={()=>setActive("settings")}/><button className="dash-plan" onClick={()=>setActive("subs")} aria-label="Voir les abonnements">Abonnements : {plan ? (plan.charAt(0).toUpperCase()+plan.slice(1)) : "aucun"}</button></header>
      <div className="dash-content"><header className="dash-head"><h1>{currentSection.label}</h1>{appsError&&<p role="alert" className="dash-muted">{appsError}</p>}</header>
        {active==="overview"&&<VerificationBanner onOpenSettings={()=>{setSettingsTab("verif");setActive("settings")}}/>}
        {appId&&active==="overview"&&<><TestFunds appId={appId}/><WalletOverview appId={appId} autoWithdraw={false} onSubmitted={()=>setActive("withdrawals")}/></>}
        {appId&&active==="wallet"&&<><TestFunds appId={appId}/><WalletOverview appId={appId} autoWithdraw={autoWithdraw} onSubmitted={(mode)=>setActive(mode==="withdraw"?"withdrawals":"wallet")}/></>}
        {appId&&active==="transactions"&&<section className="dash-card"><h2>Toutes les transactions</h2><TransactionsList appId={appId}/></section>}
        {appId&&active==="stats"&&<section className="dash-card"><h2>Statistiques</h2><StatsView appId={appId}/></section>}
        {appId&&active==="webhook-journal"&&<section className="dash-card"><h2>Journal des webhooks</h2><WebhookJournalView/></section>}
        {appId&&active==="disputes"&&<section className="dash-card"><h2>Litiges</h2><DisputesView appId={appId}/></section>}
        {appId&&active==="withdrawals"&&<WithdrawalsView appId={appId} onNew={()=>{setAutoWithdraw(true);setActive("wallet")}}/>}
        {appId&&active==="developers"&&<section className="dev-wrap">
          <div className="dev-tabs" role="tablist">
            <button role="tab" aria-selected={devTab==="keys"} className={devTab==="keys"?"dev-tab on":"dev-tab"} onClick={()=>setDevTab("keys")}>Clés API</button>
            <button role="tab" aria-selected={devTab==="ip"} className={devTab==="ip"?"dev-tab on":"dev-tab"} onClick={()=>setDevTab("ip")}>IP Whitelist</button>
          </div>
          {devTab==="keys"&&<ApiKeyManager appId={appId}/>}
          {devTab==="ip"&&<div className="dash-card"><strong>Bientôt disponible</strong><p className="dash-muted">La liste blanche d’adresses IP n’est pas encore activée. Tes clés API fonctionnent sans cette restriction pour l’instant.</p></div>}
        </section>}
        {appId&&active==="subs"&&<SubscriptionsView plan={plan}/>}
        {appId&&active==="links"&&<PaymentLinksView appId={appId}/>}
        {active==="pricing"&&<PricingView/>}
        {appId&&active==="settings"&&<SettingsView appId={appId} initialTab={settingsTab}/>}
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
