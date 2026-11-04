"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
    <div className="au">
      <style>{`
        .au { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; background: #f4f7f5; color: #14241c; font-family: inherit; }
        .au * { box-sizing: border-box; }
        .au-side { position: relative; overflow: hidden; background: #14241c; color: #e9f3ee; padding: 40px; display: flex; flex-direction: column; justify-content: space-between; }
        .au-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; color: #fff; text-decoration: none; position: relative; z-index: 2; }
        .au-logo { width: 34px; height: 34px; border-radius: 10px; background: #2f9a6c; color: #fff; display: grid; place-items: center; }
        .au-brand span { color: #6fcf9d; }
        .au-copy { position: relative; z-index: 2; max-width: 440px; }
        .au-kicker { font-size: 12px; font-weight: 700; letter-spacing: .08em; color: #6fcf9d; }
        .au-copy h1 { font-size: 44px; line-height: 1.06; letter-spacing: -.03em; margin: 14px 0 14px; color: #fff; }
        .au-copy p { color: #bcd0c5; font-size: 16px; line-height: 1.6; margin: 0; }
        .au-proof { margin-top: 26px; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #bcd0c5; }
        .au-orb { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(111,207,157,.35), rgba(111,207,157,0) 70%); animation: au-drift 12s ease-in-out infinite; }
        .au-orb.a { width: 420px; height: 420px; right: -120px; top: -100px; }
        .au-orb.b { width: 300px; height: 300px; left: -100px; bottom: -80px; animation-delay: -6s; }
        .au-form { display: grid; place-items: center; padding: 40px 24px; }
        .au-wrap { width: 100%; max-width: 400px; }
        .au-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .08em; color: #2f9a6c; }
        .au-wrap h2 { font-size: 30px; letter-spacing: -.02em; margin: 10px 0 6px; }
        .au-desc { color: #5e7267; font-size: 15px; margin: 0 0 22px; }
        .au-tabs { display: grid; grid-template-columns: 1fr 1fr; background: #e8efeb; border-radius: 14px; padding: 4px; margin-bottom: 22px; }
        .au-tab { border: 0; background: transparent; padding: 11px; border-radius: 11px; font-weight: 700; font-size: 14px; color: #5e7267; cursor: pointer; font-family: inherit; }
        .au-tab.on { background: #fff; color: #14241c; box-shadow: 0 1px 2px rgba(20,36,28,.08); }
        .au-form-fields { display: grid; gap: 8px; }
        .au-form-fields label { font-size: 13px; font-weight: 600; color: #3d5249; margin-top: 8px; }
        .au-form-fields input { width: 100%; padding: 13px 14px; border-radius: 12px; border: 1px solid #dbe5df; font-size: 15px; background: #fff; font-family: inherit; color: inherit; }
        .au-form-fields input:focus { outline: 2px solid #9fd4b8; border-color: #2f9a6c; }
        .au-msg { border-radius: 12px; padding: 11px 13px; font-size: 14px; margin-top: 10px; }
        .au-msg-success { background: #e4f1ea; color: #1f6b4c; }
        .au-msg-error { background: #fdecea; color: #9b2c2c; }
        .au-submit { margin-top: 14px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: #1f6b4c; color: #fff; border: 0; border-radius: 13px; padding: 14px; font-size: 15px; font-weight: 700; min-height: 50px; cursor: pointer; font-family: inherit; }
        .au-submit:disabled { opacity: .6; cursor: not-allowed; }
        .au-note { margin-top: 16px; display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: #6b7f74; line-height: 1.5; }
        .au-back { display: inline-block; margin-top: 22px; font-size: 13px; color: #1f6b4c; font-weight: 600; text-decoration: none; }
        @keyframes au-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(18px,-14px); } }
        @media (max-width: 900px) {
          .au { grid-template-columns: 1fr; }
          .au-side { padding: 26px 22px; }
          .au-copy h1 { font-size: 30px; }
          .au-copy p { font-size: 14px; }
          .au-side .au-proof { display: none; }
        }
        @media (max-width: 620px) {
          .au-side { display: none; }
          .au-form { padding: 28px 16px; place-items: start center; }
          .au-wrap h2 { font-size: 26px; }
        }
      `}</style>

      <section className="au-side" aria-hidden={false}>
        <div className="au-orb a" />
        <div className="au-orb b" />
        <Link href="/" className="au-brand"><span className="au-logo">f</span><div>flash<span>pay</span></div></Link>
        <div className="au-copy">
          <span className="au-kicker">PAIEMENTS, SIMPLIFIÉS</span>
          <h1>Ton activité.<br />Ton rythme.</h1>
          <p>Un espace personnel pour suivre tes encaissements, tes portefeuilles par devise et tes retraits.</p>
          <div className="au-proof"><ShieldCheck size={17} /><span>Accès protégé et chiffré</span></div>
        </div>
        <div className="au-kicker" style={{ position: "relative", zIndex: 2 }}>© 2026 FlashPay</div>
      </section>

      <section className="au-form">
        <div className="au-wrap">
          <span className="au-eyebrow">BIENVENUE SUR FLASHPAY</span>
          <h2>{isLogin ? "Content de te revoir." : "Créer ton compte."}</h2>
          <p className="au-desc">{isLogin ? "Connecte-toi pour retrouver ton espace personnel." : "Quelques informations pour commencer."}</p>

          <div className="au-tabs" role="tablist" aria-label="Accès au compte">
            <button role="tab" type="button" aria-selected={isLogin} className={`au-tab ${isLogin ? "on" : ""}`} onClick={() => { setMode("login"); setMessage(""); }}>Connexion</button>
            <button role="tab" type="button" aria-selected={!isLogin} className={`au-tab ${!isLogin ? "on" : ""}`} onClick={() => { setMode("signup"); setMessage(""); }}>Créer un compte</button>
          </div>

          <form className="au-form-fields" onSubmit={submit}>
            <label htmlFor="auth-email">Adresse e-mail</label>
            <input id="auth-email" type="email" autoComplete="email" placeholder="nom@exemple.com" required value={email} onChange={(event) => setEmail(event.target.value)} />

            <label htmlFor="auth-password">Mot de passe</label>
            <input id="auth-password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} placeholder="8 caractères minimum" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />

            {message && <div role="status" className={`au-msg au-msg-${messageType}`}>{message}</div>}

            <button className="au-submit" disabled={busy} type="submit">
              <span>{busy ? "Patiente un instant…" : isLogin ? "Se connecter" : "Créer mon compte"}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="au-note"><ShieldCheck size={14} /> Ton mot de passe est géré de façon sécurisée. Les paiements réels s’activent après vérification de ton compte.</p>
          <Link href="/" className="au-back">← Retour à l’accueil</Link>
        </div>
      </section>
    </div>
  );
}
