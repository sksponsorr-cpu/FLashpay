"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Copy, KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import WebhookSettings from "@/components/webhook-settings";

type ApiKeyRecord = {
  id: string;
  name: string;
  key_prefix: string;
  environment: "test" | "live";
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type LiveStatus = { enabled: boolean; verified: boolean };
type Environment = "test" | "live";

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [live, setLive] = useState<LiveStatus>({ enabled: false, verified: false });
  const [keyName, setKeyName] = useState("Mon intégration");
  const [liveName, setLiveName] = useState("Production");
  const [newKey, setNewKey] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const canCreateLive = live.enabled && live.verified;

  async function refreshKeys() {
    setLoading(true);
    try {
      const response = await fetch("/api/developer-keys", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de charger les clés.");
      setKeys(result.keys);
      setLive(result.live ?? { enabled: false, verified: false });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de charger les clés.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshKeys(); }, []);

  async function createKey(event: FormEvent<HTMLFormElement>, environment: Environment, name: string) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNewKey("");
    try {
      const response = await fetch("/api/developer-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, environment }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de créer la clé.");
      setNewKey(result.key);
      await refreshKeys();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer la clé.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Révoquer cette clé ? Les appels qui l’utilisent cesseront de fonctionner immédiatement.")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/developer-keys/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Impossible de révoquer cette clé.");
      setKeys((current) => current.map((item) => item.id === id ? { ...item, revoked_at: new Date().toISOString() } : item));
      setNewKey("");
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

  const lockReason = !live.enabled
    ? "Les clés live ne sont pas encore activées sur FlashPay."
    : "Ton compte doit être vérifié par FlashPay avant de créer une clé live.";

  return <section className="workspace-view">
    <div className="view-intro"><span className="view-icon"><KeyRound size={19} /></span><div><h2>Accès développeur</h2><p>Crée des clés pour connecter ton application à FlashPay.</p></div></div>
    {message && <div className="notice-bar" role="status"><ShieldCheck size={16} /><span>{message}</span><button aria-label="Fermer" onClick={() => setMessage("")}>×</button></div>}
    {newKey && <div className="new-key-reveal"><div><strong>Copie cette clé maintenant</strong><span>Elle ne sera plus affichée après avoir quitté cet écran.</span></div><code>{newKey}</code><button className="export-button" onClick={() => void copyKey()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copiée" : "Copier"}</button></div>}

    <article className="panel key-panel"><div className="panel-heading"><div><h2>Créer une clé de test</h2><p>Une clé test permet uniquement d’essayer l’API. Aucun paiement réel n’est déclenché.</p></div><span className="test-key-badge">TEST</span></div>
      <form className="key-create-form" onSubmit={(event) => void createKey(event, "test", keyName)}><label htmlFor="api-key-name">Nom de l’intégration</label><div><input id="api-key-name" maxLength={60} onChange={(event) => setKeyName(event.target.value)} required value={keyName} /><button className="primary-button" disabled={busy} type="submit"><Plus size={16} />{busy ? "Création…" : "Créer une clé test"}</button></div></form>
    </article>

    {canCreateLive ? (
      <article className="panel key-panel"><div className="panel-heading"><div><h2>Créer une clé live</h2><p>Une clé live encaisse de vrais paiements. Garde-la secrète et ne la mets jamais dans du code côté navigateur.</p></div><span className="locked-pill">LIVE</span></div>
        <form className="key-create-form" onSubmit={(event) => void createKey(event, "live", liveName)}><label htmlFor="live-key-name">Nom de l’intégration</label><div><input id="live-key-name" maxLength={60} onChange={(event) => setLiveName(event.target.value)} required value={liveName} /><button className="primary-button" disabled={busy} type="submit"><Plus size={16} />{busy ? "Création…" : "Créer une clé live"}</button></div></form>
      </article>
    ) : (
      <article className="production-key-lock"><div className="production-lock-icon"><ShieldCheck size={20} /></div><div><span className="production-lock-label">CLÉS LIVE</span><h3>Pas encore disponibles</h3><p>{lockReason}</p></div><span className="locked-pill">Verrouillé</span></article>
    )}

    <article className="panel key-panel">
      <div className="key-list-head"><strong>Mes clés</strong><button className="text-action" onClick={() => void refreshKeys()} type="button">Actualiser</button></div>
      {loading ? <p className="empty-keys">Chargement des clés…</p> : keys.length === 0 ? <p className="empty-keys">Aucune clé pour le moment.</p> : <div className="key-list">{keys.map((item) => <div className="key-row" key={item.id}><span className="key-row-icon"><KeyRound size={16} /></span><div className="key-row-copy"><strong>{item.name}</strong><code>{item.key_prefix}••••••••••••</code></div><span className={item.revoked_at ? "key-status key-revoked" : "key-status"}>{item.revoked_at ? "Révoquée" : `Active · ${item.environment}`}</span>{!item.revoked_at && <button aria-label={`Révoquer ${item.name}`} className="key-revoke" disabled={busy} onClick={() => void revokeKey(item.id)}><Trash2 size={16} /></button>}</div>)}</div>}
    </article>

    <WebhookSettings />
    <p className="security-note"><ShieldCheck size={15} /> FlashPay ne conserve jamais une clé en clair. Chaque clé est montrée une seule fois puis stockée sous forme hachée.</p>
  </section>;
}
