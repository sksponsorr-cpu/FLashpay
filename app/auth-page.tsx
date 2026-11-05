"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const css = `
  .au { min-height: 100vh; background: #fff; color: #0d1712; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; position: relative; overflow: hidden; display: grid; place-items: center; padding: 26px 16px 40px; }
  .au * { box-sizing: border-box; }
  .au-bg { position: absolute; inset: 0; background: radial-gradient(circle at 50% -10%, rgba(255,106,61,.22), rgba(255,255,255,0) 60%), radial-gradient(circle at 90% 110%, rgba(232,64,31,.14), rgba(255,255,255,0) 55%); pointer-events: none; }
  .au-wrap { position: relative; width: 100%; max-width: 420px; display: grid; gap: 22px; }
  .au-brand { display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 800; font-size: 22px; text-decoration: none; color: #0d1712; }
  .au-logo { width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(145deg, #ff6a3d, #d93a1f); color: #fff; display: grid; place-items: center; font-weight: 900; box-shadow: 0 10px 22px -10px rgba(232,64,31,.9); }
  .au-brand span { color: #d93a1f; }
  .au-card { position: relative; background: #fff; border: 1px solid #f3e3dc; border-radius: 28px; padding: 26px; box-shadow: 0 40px 70px -40px rgba(120,40,20,.35); animation: au-up .8s cubic-bezier(.2,.8,.2,1) both; }
  .au-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 5px; border-radius: 16px; background: #fff7f4; border: 1px solid #f3e3dc; }
  .au-tab { height: 42px; border: 0; border-radius: 12px; background: transparent; color: #8a6b60; font-weight: 700; font-size: 14px; cursor: pointer; transition: background .3s ease, color .3s ease, box-shadow .3s ease; font-family: inherit; }
  .au-tab[aria-selected="true"] { background: #fff; color: #0d1712; box-shadow: 0 6px 16px -8px rgba(120,40,20,.35); }
  .au-title { margin: 24px 0 6px; font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
  .au-sub { margin: 0 0 22px; color: #6b5a52; font-size: 15px; line-height: 1.55; }
  .au-divider { display: flex; align-items: center; gap: 12px; color: #a8948b; font-size: 12px; margin: 4px 0 18px; }
  .au-divider::before, .au-divider::after { content: ""; flex: 1; height: 1px; background: #f3e3dc; }
  .au-form { display: grid; gap: 16px; }
  .au-label { display: grid; gap: 7px; font-size: 14px; font-weight: 600; color: #33463c; }
  .au-input { height: 52px; border-radius: 14px; border: 1px solid #efd9cf; background: #fffaf8; padding: 0 16px; font-size: 16px; color: #0d1712; outline: none; font-family: inherit; transition: border-color .25s ease, box-shadow .25s ease, background .25s ease; }
  .au-input::placeholder { color: #b9a59c; }
  .au-input:focus { border-color: #ff6a3d; background: #fff; box-shadow: 0 0 0 4px rgba(255,106,61,.16); }
  .au-row { display: flex; justify-content: flex-end; margin-top: -4px; }
  .au-link { color: #d93a1f; font-weight: 700; font-size: 14px; text-decoration: none; }
  .au-btn { position: relative; height: 54px; border: 0; border-radius: 16px; background: linear-gradient(180deg, #ff6a3d, #e8401f); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; overflow: hidden; box-shadow: 0 16px 30px -14px rgba(232,64,31,.9); transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease; font-family: inherit; }
  .au-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 22px 36px -14px rgba(232,64,31,.95); }
  .au-btn:disabled { opacity: .7; cursor: default; }
  .au-btn::after { content: ""; position: absolute; top: 0; bottom: 0; width: 60px; left: -90px; background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-20deg); animation: au-shine 3.4s ease-in-out infinite; }
  .au-notice { border-radius: 14px; padding: 12px 14px; font-size: 14px; line-height: 1.5; background: #ecfbf3; color: #17663f; border: 1px solid #c7efd9; }
  .au-notice.err { background: #fff0ed; color: #a8321a; border-color: #fbd0c6; }
  .au-foot { margin: 18px 0 0; text-align: center; color: #6b5a52; font-size: 14px; }
  .au-secure { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; color: #8a7068; font-size: 12px; }
  .au-toast { position: relative; z-index: 3; margin: -6px 18px 0 auto; width: fit-content; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 18px; background: #fff; border: 1px solid #f3e3dc; box-shadow: 0 26px 40px -22px rgba(120,40,20,.5); min-width: 240px; animation: au-float 6s ease-in-out infinite, au-up .9s .5s cubic-bezier(.2,.8,.2,1) both; }
  .au-toast-ic { width: 40px; height: 40px; border-radius: 14px; background: #ecfbf3; color: #17a466; display: grid; place-items: center; font-weight: 900; flex-shrink: 0; }
  .au-toast b { display: block; font-size: 14px; }
  .au-toast small { color: #8a7068; font-size: 12px; }
  .au-back { text-align: center; color: #6b5a52; font-size: 14px; }
  @keyframes au-up { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
  @keyframes au-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes au-shine { 0% { left: -90px; } 60%,100% { left: 110%; } }
  @media (max-width: 480px) {
    .au-card { padding: 22px 18px; border-radius: 24px; }
    .au-title { font-size: 24px; }
    .au-toast { margin-right: 4px; min-width: 210px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .au *, .au *::before, .au *::after { animation: none !important; }
  }
`;

export default function AuthPage({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: new URL("/auth/confirm", window.location.origin).toString() },
        });
        if (error) throw error;
        if (!data.session) {
          setMessageType("success");
          setMessage("Compte créé. Consulte ta boîte e-mail pour confirmer ton adresse avant de te connecter.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(error instanceof Error ? error.message : "Connexion impossible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <main className="au">
      <style>{css}</style>
      <div className="au-bg" />

      <div className="au-wrap">
        <Link href="/" className="au-brand"><span className="au-logo">f</span><div>flash<span>pay</span></div></Link>

        <section className="au-card">
          <div className="au-tabs" role="tablist" aria-label="Accès au compte">
            <button role="tab" type="button" aria-selected={isLogin} className="au-tab" onClick={() => { setMode("login"); setMessage(""); }}>Connexion</button>
            <button role="tab" type="button" aria-selected={!isLogin} className="au-tab" onClick={() => { setMode("signup"); setMessage(""); }}>Créer un compte</button>
          </div>

          <h1 className="au-title">{isLogin ? "Content de te revoir." : "Crée ton compte."}</h1>
          <p className="au-sub">{isLogin ? "Connecte-toi pour retrouver tes encaissements et ton solde." : "Quelques informations pour commencer à encaisser."}</p>

          <div className="au-divider">FlashPay</div>

          <form className="au-form" onSubmit={submit}>
            <label className="au-label" htmlFor="auth-email">Adresse e-mail
              <input id="auth-email" className="au-input" type="email" autoComplete="email" placeholder="toi@monsaas.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="au-label" htmlFor="auth-password">Mot de passe
              <input id="auth-password" className="au-input" type="password" autoComplete={isLogin ? "current-password" : "new-password"} placeholder="8 caractères minimum" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>

            {message && <div role="status" className={`au-notice ${messageType === "error" ? "err" : ""}`}>{message}</div>}

            <button className="au-btn" disabled={busy} type="submit">
              {busy ? "Patiente un instant…" : isLogin ? "Se connecter →" : "Créer mon compte →"}
            </button>
          </form>

          <p className="au-secure">🔒 Accès protégé. Les paiements réels s’activent après vérification de ton compte.</p>
        </section>

        <div className="au-toast" aria-hidden="true">
          <div className="au-toast-ic">✓</div>
          <div><b>Paiement reçu</b><small>Aïcha N. · 42 300 FCFA</small></div>
        </div>

        <p className="au-foot">
          {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
          <button type="button" className="au-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontFamily: "inherit" }} onClick={() => { setMode(isLogin ? "signup" : "login"); setMessage(""); }}>
            {isLogin ? "Créer un compte" : "Se connecter"}
          </button>
        </p>
        <Link href="/" className="au-back">← Retour à l’accueil</Link>
      </div>
    </main>
  );
}
