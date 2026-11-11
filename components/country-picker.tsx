"use client";
import { useEffect, useMemo, useState } from "react";

// Sélecteur à feuille animée avec recherche, à la place de la liste déroulante du navigateur.
export type PickOption = { value: string; label: string };

const CSS = `
.cp-trigger{width:100%;min-height:52px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 16px;border:1px solid #ebe8f7;border-radius:16px;background:#fbfaff;color:#14142b;font:inherit;font-size:15px;text-align:left;cursor:pointer;transition:border .2s ease,box-shadow .2s ease}
.cp-trigger:focus-visible,.cp-trigger:hover{border-color:#8f7ae8;box-shadow:0 0 0 4px #efeafe;outline:0}
.cp-trigger span.cp-ph{color:#9a95aa}
.cp-trigger i{font-style:normal;color:#5b3fd6;font-size:18px}
.cp-back{position:fixed;inset:0;z-index:130;background:rgba(20,20,43,.35);backdrop-filter:blur(3px);animation:cp-fade .25s ease both}
.cp-sheet{position:fixed;left:0;right:0;bottom:0;max-height:82vh;display:flex;flex-direction:column;background:#fff;border-radius:26px 26px 0 0;padding:14px 18px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 50px rgba(20,20,43,.18);animation:cp-up .42s cubic-bezier(.2,.8,.2,1) both}
@media(min-width:720px){.cp-sheet{left:50%;right:auto;bottom:50%;width:min(480px,calc(100vw - 40px));max-height:76vh;transform:translate(-50%,50%);border-radius:26px;animation:cp-pop .3s cubic-bezier(.2,.8,.2,1) both}}
.cp-grab{width:40px;height:4px;margin:0 auto 12px;border-radius:99px;background:#e0ddea}
.cp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.cp-head h3{margin:0;font-size:18px;color:#14142b}
.cp-x{width:34px;height:34px;border:0;border-radius:50%;background:#f4f1ff;color:#5b3fd6;font-size:19px;cursor:pointer}
.cp-search{width:100%;min-height:46px;padding:0 14px;border:1px solid #ebe8f7;border-radius:14px;background:#fbfaff;font:inherit;font-size:15px;outline:0;margin-bottom:10px}
.cp-search:focus{border-color:#8f7ae8;box-shadow:0 0 0 4px #efeafe}
.cp-list{overflow-y:auto;display:grid;gap:6px;margin:0;padding:0;list-style:none}
.cp-item{width:100%;min-height:50px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 14px;border:1px solid transparent;border-radius:14px;background:#faf9fd;color:#14142b;font:inherit;font-size:15px;text-align:left;cursor:pointer;transition:background .18s ease,border .18s ease,transform .15s ease}
.cp-item:hover{background:#f4f1ff}
.cp-item:active{transform:scale(.985)}
.cp-item.on{background:#f4f1ff;border-color:#8f7ae8;font-weight:700}
.cp-item b{color:#5b3fd6;font-size:16px;opacity:0;transition:opacity .2s ease}
.cp-item.on b{opacity:1}
.cp-empty{margin:8px 2px;color:#8a8aa3;font-size:14px}
@keyframes cp-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes cp-pop{from{opacity:0;transform:translate(-50%,50%) scale(.96)}to{opacity:1;transform:translate(-50%,50%)}}
@keyframes cp-fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.cp-back,.cp-sheet{animation:none!important}}
`;

export default function CountryPicker({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: PickOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <style>{CSS}</style>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#55566a" }}>{label}</span>
      <button type="button" className="cp-trigger" disabled={disabled} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {selected ? <strong style={{ fontWeight: 600 }}>{selected.label}</strong> : <span className="cp-ph">{placeholder}</span>}
        <i aria-hidden>⌄</i>
      </button>

      {open && (
        <>
          <div className="cp-back" onClick={() => setOpen(false)} aria-hidden />
          <div className="cp-sheet" role="dialog" aria-modal="true" aria-label={label}>
            <div className="cp-grab" />
            <div className="cp-head">
              <h3>{label}</h3>
              <button type="button" className="cp-x" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            </div>
            <input className="cp-search" placeholder="Rechercher…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
            {filtered.length === 0 && <p className="cp-empty">Aucun résultat pour cette recherche.</p>}
            <ul className="cp-list">
              {filtered.map((o) => (
                <li key={o.value}>
                  <button type="button" className={`cp-item${o.value === value ? " on" : ""}`} onClick={() => pick(o.value)}>
                    <span>{o.label}</span>
                    <b aria-hidden>✓</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
