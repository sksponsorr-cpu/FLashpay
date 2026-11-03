"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";

type ApiKeyRecord = {
  id: string;
  name: string;
  key_prefix: string;
  environment: "test";
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [keyName, setKeyName] = useState("Mon intégration");
  const [newKey, setNewKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function refreshKeys() {
    setLoading(true);
    try {
      const response = await fetch("/api/developer-keys", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de charger les clés.");
      setKeys(result.keys);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "La migration des clés de test doit être appliquée.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshKeys(); }, []);

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNewKey("");
    try {
      const response = await fetch("/api/developer-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de créer la clé.");
      setNewKey(result.key);
      await refreshKeys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer la clé de test.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Révoquer cette clé ? Les appels qui l’utilisent cesseront de fonctionner.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/developer-keys/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de révoquer cette clé.");
      setKeys((current) => current.map((item) => item.id === id ? { ...item, revoked_at: new Date().toISOString() } : item));
      if (newKey && keys.find((item) => item.id === id)?.key_prefix === newKey.slice(0, 15)) setNewKey("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de révoquer cette clé.");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return <section className="workspace-view">
    <div className="view-intro"><span className="view-icon"><KeyRound size={19} /></span><div><h2>Accès développeur</h2><p>Crée des clés de test et connecte ton application à la documentation FlashPay.</p></div></div>
    <div className="demo-banner"><span className="demo-pulse" /><strong>Environnement de test</strong><span>Les clés fp_test_ ne peuvent jamais déclencher un paiement réel.</span></div>
    {message && <div className="notice-bar" role="status"><ShieldCheck size={16} /><span>{message}</span><button aria-label="Fermer" onClick={() => setMessage("")}>×</button></div>}
    {newKey && <div className="new-key-reveal"><div><strong>Copie cette clé maintenant</strong><span>Elle ne sera plus affichée après avoir quitté cet écran.</span></div><code>{newKey}</code><button className="export-button" onClick={() => void copyKey()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copiée" : "Copier"}</button></div>}
    <article className="panel key-panel"><div className="panel-heading"><div><h2>Créer une clé de test</h2><p>Une clé test permet uniquement d’essayer l’API de démonstration.</p></div><span className="test-key-badge">TEST</span></div>
      <form className="key-create-form" onSubmit={createKey}><label htmlFor="api-key-name">Nom de l’intégration</label><div><input id="api-key-name" maxLength={60} onChange={(event) => setKeyName(event.target.value)} required value={keyName} /><button className="primary-button" disabled={busy} type="submit"><Plus size={16} />{busy ? "Création…" : "Créer une clé test"}</button></div></form>
      <div className="key-list-head"><strong>Clés de test</strong><button className="text-action" onClick={() => void refreshKeys()} type="button">Actualiser</button></div>
      {loading ? <p className="empty-keys">Chargement des clés…</p> : keys.length === 0 ? <p className="empty-keys">Aucune clé test pour le moment.</p> : <div className="key-list">{keys.map((item) => <div className="key-row" key={item.id}><span className="key-row-icon"><KeyRound size={16} /></span><div className="key-row-copy"><strong>{item.name}</strong><code>{item.key_prefix}••••••••••••</code></div><span className={item.revoked_at ? "key-status key-revoked" : "key-status"}>{item.revoked_at ? "Révoquée" : "Active · test"}</span>{!item.revoked_at && <button aria-label={`Révoquer ${item.name}`} className="key-revoke" disabled={busy} onClick={() => void revokeKey(item.id)}><Trash2 size={16} /></button>}</div>)}</div>}
    </article>
    <article className="production-key-lock"><div className="production-lock-icon"><ShieldCheck size={20} /></div><div><span className="production-lock-label">CLÉS DE PRODUCTION</span><h3>Disponibles après validation</h3><p>Les clés de production resteront verrouillées tant que FlashPay n’aura pas de vérification KYC sécurisée, de sous-comptes Swychr et d’accord écrit pour encaisser au nom de tiers.</p></div><span className="locked-pill">Verrouillé</span></article>
    <p className="security-note"><ShieldCheck size={15} /> FlashPay ne conserve jamais une clé en clair. Une clé test est montrée une seule fois puis stockée sous forme hachée.</p>
  </section>;
}
