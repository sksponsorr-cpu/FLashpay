"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, Link2, ShieldCheck, Trash2 } from "lucide-react";

export default function WebhookSettings() {
  const [configured, setConfigured] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [customSecret, setCustomSecret] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const response = await fetch("/api/developer-webhook", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de charger les notifications.");
      setConfigured(result.configured);
      setCurrentUrl(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les notifications.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNewSecret("");
    try {
      const response = await fetch("/api/developer-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, secret: customSecret.trim() || undefined }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible d’enregistrer l’adresse.");
      setNewSecret(result.secret);
      setCurrentUrl(result.url);
      setConfigured(true);
      setUrl("");
      setCustomSecret("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d’enregistrer l’adresse.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Supprimer l’adresse de notification ? Ton application ne recevra plus les confirmations de paiement.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/developer-webhook", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de supprimer l’adresse.");
      setConfigured(false);
      setCurrentUrl(null);
      setNewSecret("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer l’adresse.");
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    await navigator.clipboard.writeText(newSecret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <article className="panel key-panel">
    <div className="panel-heading"><div><h2>Notifications vers ton application</h2><p>FlashPay envoie une notification signée à cette adresse quand un paiement est réussi.</p></div><span className="test-key-badge">WEBHOOK</span></div>
    {message && <div className="notice-bar" role="status"><ShieldCheck size={16} /><span>{message}</span><button aria-label="Fermer" onClick={() => setMessage("")}>×</button></div>}
    {newSecret && <div className="new-key-reveal"><div><strong>Copie ce secret maintenant</strong><span>Il sert à vérifier les notifications. Il ne sera plus affiché.</span></div><code>{newSecret}</code><button className="export-button" onClick={() => void copySecret()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copié" : "Copier"}</button></div>}
    {configured && currentUrl && <div className="key-row"><span className="key-row-icon"><Link2 size={16} /></span><div className="key-row-copy"><strong>Adresse enregistrée</strong><code>{currentUrl}</code></div><button aria-label="Supprimer l’adresse" className="key-revoke" disabled={busy} onClick={() => void remove()}><Trash2 size={16} /></button></div>}
    <form className="key-create-form" onSubmit={(event) => void save(event)}>
      <label htmlFor="webhook-url">Adresse https de ton application</label>
      <input id="webhook-url" onChange={(event) => setUrl(event.target.value)} placeholder="https://monsaas.com/webhooks/flashpay" required type="url" value={url} />
      <label htmlFor="webhook-secret">Secret personnalisé (facultatif)</label>
      <input id="webhook-secret" autoComplete="new-password" minLength={24} onChange={(event) => setCustomSecret(event.target.value)} placeholder="Laisser vide pour générer automatiquement" type="password" value={customSecret} />
      <button className="primary-button" disabled={busy} type="submit">{busy ? "Enregistrement…" : configured ? "Enregistrer les modifications" : "Enregistrer le webhook"}</button>
    </form>
    <p className="security-note"><ShieldCheck size={15} /> Tu peux fournir un secret d’au moins 24 caractères ou laisser FlashPay en générer un. Le secret est affiché une seule fois.</p>
  </article>;
}
