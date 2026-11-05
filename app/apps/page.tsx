"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

const categories = ["Paiements", "E-commerce", "Logiciel (SaaS)", "Services", "Autre"];

const plans = [
  {
    key: "basic",
    name: "Basic",
    price: "10 000 FCFA / mois",
    fees: [
      { label: "Commission encaissement", value: "1 % jusqu’à 200 000 FCFA, puis 6 %" },
      { label: "Retrait", value: "5 %" },
      { label: "Conversion", value: "1 %" },
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "25 000 FCFA / mois",
    featured: true,
    fees: [
      { label: "Commission encaissement", value: "1 % jusqu’à 500 000 FCFA, puis 6 %" },
      { label: "Retrait", value: "0 %" },
      { label: "Conversion", value: "1 %" },
    ],
  },
];

const freeFees = [
  { label: "Commission encaissement", value: "6 %" },
  { label: "Retrait", value: "5 %" },
  { label: "Conversion", value: "4,5 %" },
];

const css = `
  .ap { min-height: 100vh; background: #fff; color: #0d1712; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; position: relative; overflow: hidden; display: grid; place-items: start center; padding: 26px 16px 40px; }
  .ap * { box-sizing: border-box; }
  .ap-bg { position: absolute; inset: 0; background: radial-gradient(circle at 50% -10%, rgba(255,106,61,.22), rgba(255,255,255,0) 60%), radial-gradient(circle at 90% 110%, rgba(232,64,31,.14), rgba(255,255,255,0) 55%); pointer-events: none; }
  .ap-wrap { position: relative; width: 100%; max-width: 440px; display: grid; gap: 22px; }
  .ap-brand { display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 800; font-size: 22px; color: #0d1712; }
  .ap-logo { width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(145deg, #ff6a3d, #d93a1f); color: #fff; display: grid; place-items: center; font-weight: 900; box-shadow: 0 10px 22px -10px rgba(232,64,31,.9); }
  .ap-brand span { color: #d93a1f; }
  .ap-steps { display: flex; justify-content: center; gap: 8px; }
  .ap-steps i { width: 36px; height: 6px; border-radius: 99px; background: #f3e3dc; }
  .ap-steps i.on { background: linear-gradient(90deg, #ff6a3d, #e8401f); }
  .ap-card { background: #fff; border: 1px solid #f3e3dc; border-radius: 28px; padding: 26px 22px; box-shadow: 0 40px 70px -40px rgba(120,40,20,.35); animation: ap-up .7s cubic-bezier(.2,.8,.2,1) both; display: grid; gap: 18px; }
  .ap-title { margin: 0; text-align: center; font-size: 28px; line-height: 1.15; font-weight: 800; letter-spacing: -.02em; }
  .ap-sub { margin: -8px 0 0; text-align: center; color: #6b5a52; font-size: 15px; line-height: 1.55; }
  .ap-info { display: flex; gap: 12px; padding: 16px; border-radius: 18px; background: #fff7f4; color: #6b5a52; font-size: 14px; line-height: 1.55; }
  .ap-info i { font-style: normal; color: #d93a1f; font-weight: 800; }
  .ap-form { display: grid; gap: 16px; }
  .ap-label { display: grid; gap: 7px; font-size: 14px; font-weight: 700; color: #0d1712; }
  .ap-label em { font-style: normal; color: #e8401f; }
  .ap-input, .ap-select { height: 52px; border-radius: 14px; border: 1px solid #efd9cf; background: #fffaf8; padding: 0 16px; font-size: 16px; color: #0d1712; outline: none; font-family: inherit; transition: border-color .25s ease, box-shadow .25s ease; width: 100%; }
  .ap-input::placeholder { color: #b9a59c; }
  .ap-input:focus, .ap-select:focus { border-color: #ff6a3d; box-shadow: 0 0 0 4px rgba(255,106,61,.16); background: #fff; }
  .ap-error { color: #a8321a; font-size: 13px; margin: -6px 0 0; }
  .ap-btn { position: relative; height: 54px; border: 0; border-radius: 16px; background: linear-gradient(180deg, #ff6a3d, #e8401f); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; font-family: inherit; box-shadow: 0 16px 30px -14px rgba(232,64,31,.9); transition: transform .2s ease; text-align: center; display: flex; align-items: center; justify-content: center; text-decoration: none; overflow: hidden; }
  .ap-btn:hover { transform: translateY(-2px); }
  .ap-btn::after { content: ""; position: absolute; top: 0; bottom: 0; width: 60px; left: -90px; background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent); transform: skewX(-20deg); animation: ap-shine 3.4s ease-in-out infinite; }
  .ap-btn.dark { background: #0d1712; box-shadow: 0 16px 30px -14px rgba(13,23,18,.6); }
  .ap-free { position: relative; border-radius: 22px; padding: 22px; background: #0d1712; color: #fff; overflow: hidden; animation: ap-up .6s .1s cubic-bezier(.2,.8,.2,1) both; }
  .ap-free::before { content: ""; position: absolute; width: 220px; height: 220px; right: -80px; top: -80px; border-radius: 50%; background: radial-gradient(circle, rgba(255,106,61,.45), transparent 70%); }
  .ap-free-tag { position: relative; display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #0d1712; background: #ffb38a; padding: 5px 10px; border-radius: 99px; }
  .ap-free h3 { position: relative; margin: 12px 0 4px; font-size: 22px; font-weight: 800; }
  .ap-free p { position: relative; margin: 0 0 14px; color: #e7c4b8; font-size: 14px; line-height: 1.5; }
  .ap-plans { display: grid; gap: 12px; }
  .ap-plan { border: 1px solid #f3e3dc; border-radius: 20px; padding: 18px; background: #fff; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; animation: ap-up .6s cubic-bezier(.2,.8,.2,1) both; }
  .ap-plan:hover { transform: translateY(-2px); box-shadow: 0 18px 30px -22px rgba(120,40,20,.5); }
  .ap-plan.featured { border-color: #ff6a3d; background: linear-gradient(180deg, #fff7f4, #fff); }
  .ap-plan-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .ap-plan h3 { margin: 0; font-size: 18px; font-weight: 800; }
  .ap-badge { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #fff; background: linear-gradient(180deg, #ff6a3d, #e8401f); padding: 5px 10px; border-radius: 99px; }
  .ap-price { margin: 6px 0 12px; font-size: 20px; font-weight: 800; color: #d93a1f; }
  .ap-fees { display: grid; gap: 0; border-top: 1px solid #f3e3dc; }
  .ap-fee { display: flex; justify-content: space-between; gap: 10px; padding: 9px 0; border-bottom: 1px solid #f3e3dc; font-size: 14px; color: #4a3d37; }
  .ap-fee b { color: #0d1712; font-weight: 800; }
  .ap-fees-free .ap-fee { border-color: rgba(255,255,255,.12); color: #e7c4b8; }
  .ap-fees-free .ap-fee b { color: #fff; }
  .ap-note { margin: 0; color: #8a7068; font-size: 12px; line-height: 1.5; text-align: center; }
  @keyframes ap-up { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
  @keyframes ap-shine { 0% { left: -90px; } 60%,100% { left: 110%; } }
  @media (prefers-reduced-motion: reduce) { .ap *, .ap *::before, .ap *::after { animation: none !important; } }
`;

export default function AppsPage() {
  const [step, setStep] = useState<"create" | "plan">("create");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  function createApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !category) {
      setError("Renseigne le nom et la catégorie de ton application.");
      return;
    }
    setError("");
    setStep("plan");
  }

  return (
    <main className="ap">
      <style>{css}</style>
      <div className="ap-bg" />
      <div className="ap-wrap">
        <Link href="/" className="ap-brand"><span className="ap-logo">f</span><div>flash<span>pay</span></div></Link>

        <div className="ap-steps" aria-label="Étapes">
          <i className="on" />
          <i className={step === "plan" ? "on" : ""} />
        </div>

        {step === "create" && (
          <section className="ap-card">
            <h1 className="ap-title">Crée ta première application</h1>
            <p className="ap-sub">Ton espace est vide pour l’instant. Commence par créer ton application.</p>

            <div className="ap-info">
              <i>i</i>
              <span>Une application représente une entreprise, un produit ou un service, avec ses propres encaissements et son équipe.</span>
            </div>

            <form className="ap-form" onSubmit={createApp} noValidate>
              <label className="ap-label">Nom de l’application <em>*</em>
                <input className="ap-input" placeholder="Ex. Ma boutique" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="ap-label">URL du site web (optionnel)
                <input className="ap-input" type="url" placeholder="Ex. https://maboutique.com" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </label>
              <label className="ap-label">Catégorie <em>*</em>
                <select className="ap-select" value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">Choisir une catégorie</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              {error && <p className="ap-error" role="alert">{error}</p>}

              <button className="ap-btn" type="submit">Créer mon application</button>
            </form>
          </section>
        )}

        {step === "plan" && (
          <section className="ap-card">
            <h1 className="ap-title">Choisis ton abonnement</h1>
            <p className="ap-sub">« {name.trim()} » est créée. Tu peux commencer sans abonnement et changer quand tu veux.</p>

            <article className="ap-free">
              <span className="ap-free-tag">Le plus simple</span>
              <h3>Sans abonnement</h3>
              <p>0 FCFA par mois. Aucun engagement, tu paies seulement quand tu encaisses.</p>
              <div className="ap-fees ap-fees-free">
                {freeFees.map((f) => (
                  <div className="ap-fee" key={f.label}><span>{f.label}</span><b>{f.value}</b></div>
                ))}
              </div>
              <div style={{ height: 16 }} />
              <Link href="/dashboard" className="ap-btn">Commencer sans abonnement →</Link>
            </article>

            <div className="ap-plans">
              {plans.map((plan) => (
                <article key={plan.key} className={`ap-plan ${plan.featured ? "featured" : ""}`}>
                  <div className="ap-plan-head">
                    <h3>{plan.name}</h3>
                    {plan.featured && <span className="ap-badge">Recommandé</span>}
                  </div>
                  <div className="ap-price">{plan.price}</div>
                  <div className="ap-fees">
                    {plan.fees.map((f) => (
                      <div className="ap-fee" key={f.label}><span>{f.label}</span><b>{f.value}</b></div>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            <Link href="/wallet" className="ap-btn dark">Voir les abonnements</Link>
            <p className="ap-note">Sans abonnement, la commission est de 6 %. Les abonnés paient 1 % jusqu’à leur plafond mensuel, puis 6 %. Le client paie 2,5 % de frais en plus du montant demandé.</p>
          </section>
        )}
      </div>
    </main>
  );
}
