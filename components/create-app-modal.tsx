"use client";

import { useState } from "react";
import type { FormEvent } from "react";

const categories = ["Paiements", "E-commerce", "Logiciel (SaaS)", "Services", "Autre"];

const css = `
  .cam-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(40,20,14,.45); display: grid; place-items: center; padding: 16px; animation: cam-fade .3s ease both; }
  .cam-sheet { position: relative; width: 100%; max-width: 420px; max-height: calc(100vh - 32px); overflow: auto; background: #fff; border-radius: 28px; padding: 30px 22px 24px; box-shadow: 0 50px 90px -40px rgba(40,20,14,.6); animation: cam-up .5s cubic-bezier(.2,.8,.2,1) both; color: #0d1712; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .cam-sheet * { box-sizing: border-box; }
  .cam-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 12px; border: 0; background: #fff7f4; color: #6b5a52; font-size: 20px; cursor: pointer; }
  .cam-title { margin: 6px 0 18px; text-align: center; font-size: 28px; line-height: 1.15; font-weight: 800; letter-spacing: -.02em; }
  .cam-info { display: flex; gap: 12px; padding: 16px; border-radius: 18px; background: #fff7f4; color: #6b5a52; font-size: 14px; line-height: 1.55; margin-bottom: 20px; }
  .cam-info i { font-style: normal; color: #d93a1f; font-weight: 800; }
  .cam-form { display: grid; gap: 16px; }
  .cam-label { display: grid; gap: 7px; font-size: 14px; font-weight: 700; color: #0d1712; }
  .cam-label em { font-style: normal; color: #e8401f; }
  .cam-input, .cam-select { height: 52px; border-radius: 14px; border: 1px solid #efd9cf; background: #fffaf8; padding: 0 16px; font-size: 16px; color: #0d1712; outline: none; font-family: inherit; transition: border-color .25s ease, box-shadow .25s ease; width: 100%; }
  .cam-input::placeholder { color: #b9a59c; }
  .cam-input:focus, .cam-select:focus { border-color: #ff6a3d; box-shadow: 0 0 0 4px rgba(255,106,61,.16); background: #fff; }
  .cam-error { color: #a8321a; font-size: 13px; margin: -6px 0 0; }
  .cam-btn { margin-top: 6px; height: 54px; border: 0; border-radius: 16px; background: linear-gradient(180deg, #ff6a3d, #e8401f); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer; font-family: inherit; box-shadow: 0 16px 30px -14px rgba(232,64,31,.9); transition: transform .2s ease; }
  .cam-btn:hover { transform: translateY(-2px); }
  .cam-note { margin: 4px 0 0; color: #8a7068; font-size: 13px; line-height: 1.5; text-align: center; }
  @keyframes cam-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cam-up { from { opacity: 0; transform: translateY(30px) scale(.98); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .cam-overlay, .cam-sheet { animation: none; } }
`;

export default function CreateAppModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !category) {
      setError("Renseigne le nom et la catégorie de ton application.");
      return;
    }
    setError("");
    setNotice("L’enregistrement des applications sera branché prochainement. Tes informations ne sont pas encore sauvegardées.");
  }

  return (
    <div className="cam-overlay" role="dialog" aria-modal="true" aria-labelledby="cam-title" onClick={onClose}>
      <style>{css}</style>
      <div className="cam-sheet" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="cam-close" aria-label="Fermer" onClick={onClose}>×</button>
        <h2 id="cam-title" className="cam-title">Crée ta première application</h2>

        <div className="cam-info">
          <i>i</i>
          <span>Une application représente une entreprise, un produit ou un service, avec ses propres encaissements et son équipe.</span>
        </div>

        <form className="cam-form" onSubmit={submit} noValidate>
          <label className="cam-label">Nom de l’application <em>*</em>
            <input className="cam-input" placeholder="Ex. Ma boutique" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="cam-label">URL du site web (optionnel)
            <input className="cam-input" type="url" placeholder="Ex. https://maboutique.com" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
          <label className="cam-label">Catégorie <em>*</em>
            <select className="cam-select" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">Choisir une catégorie</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>

          {error && <p className="cam-error" role="alert">{error}</p>}
          {notice && <p className="cam-note" role="status">{notice}</p>}

          <button className="cam-btn" type="submit">Créer une application</button>
        </form>
      </div>
    </div>
  );
}
