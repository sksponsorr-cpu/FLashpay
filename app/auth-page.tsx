"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
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

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-lockup"><div className="brand-mark"><span>f</span><i /></div><div className="brand-name">flash<span>pay</span><small>ESPACE PERSONNEL</small></div></div>
        <div className="auth-brand-copy"><span className="auth-overline">PAIEMENTS, SIMPLIFIÉS</span><h1>Votre activité.<br />À votre rythme.</h1><p>Un espace personnel pour suivre vos encaissements et vos bénéficiaires.</p><div className="auth-proof"><ShieldCheck size={17} /><span>Accès protégé par Supabase</span></div></div>
  <div className="auth-art" aria-hidden="true"><div className="auth-art-ring ring-a" /><div className="auth-art-ring ring-b" /><div className="auth-art-sun" /><div className="auth-art-line line-a" /><div className="auth-art-line line-b" /></div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="auth-form-eyebrow">BIENVENUE SUR FLASHPAY</span>
          <h2>{mode === "login" ? "Content de te revoir." : "Créer ton compte."}</h2>
          <p className="auth-form-description">{mode === "login" ? "Connecte-toi pour retrouver ton espace personnel." : "Quelques informations pour commencer."}</p>
          <div className="auth-tabs" role="tablist" aria-label="Accès au compte"><button aria-selected={mode === "login"} className={mode === "login" ? "auth-tab auth-tab-active" : "auth-tab"} onClick={() => { setMode("login"); setMessage(""); }} role="tab" type="button">Connexion</button><button aria-selected={mode === "signup"} className={mode === "signup" ? "auth-tab auth-tab-active" : "auth-tab"} onClick={() => { setMode("signup"); setMessage(""); }} role="tab" type="button">Créer un compte</button></div>
          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="auth-email">Adresse e-mail</label><input autoComplete="email" id="auth-email" onChange={(event) => setEmail(event.target.value)} placeholder="nom@exemple.com" required type="email" value={email} />
            <label htmlFor="auth-password">Mot de passe</label><input autoComplete={mode === "login" ? "current-password" : "new-password"} id="auth-password" minLength={8} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" required type="password" value={password} />
            {message && <div className={`auth-message auth-message-${messageType}`} role="status">{message}</div>}
            <button className="primary-button auth-submit" disabled={busy} type="submit"><span>{busy ? "Patiente un instant…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</span><ArrowRight size={17} /></button>
          </form>
          <p className="auth-privacy"><ShieldCheck size={14} /> Ton mot de passe est géré de façon sécurisée par Supabase.</p>
          <p className="auth-demo-note">FlashPay est encore en démonstration. Aucun paiement réel n’est activé.</p>
  </div>
      </section>
    </main>
  );
}
