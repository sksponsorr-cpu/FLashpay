// Styles partagés des composants FlashPay (wallets, clés API).
// Les variables viennent du tableau de bord (.fp / .fp.dark) ; valeurs de repli ici.
export default function FpUiStyles() {
  return <style>{`
.fp-ui{--text:#14142b;--muted:#6b6b85;--border:rgba(20,20,43,.08);--surface:#fff;--accent:#6366f1;--accent-soft:rgba(99,102,241,.12);--accent-text:#4f46e5;--shadow:0 1px 2px rgba(20,20,43,.04),0 10px 30px rgba(20,20,43,.06);color:var(--text);font-family:inherit}
.fp.dark .fp-ui,.dark .fp-ui{--text:#f4f5fa;--muted:#9aa3b8;--border:rgba(255,255,255,.1);--surface:#111827;--accent:#7c3aed;--accent-soft:rgba(124,58,237,.18);--accent-text:#c4b5fd}
.fp-ui *{box-sizing:border-box;min-width:0}
.fp-ui button{font:inherit;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease,background .2s ease}
.fp-ui button:active:not(:disabled){transform:scale(.97)}
.fp-ui button:disabled{opacity:.55;cursor:not-allowed}
.fp-ui :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.fp-ui .fp-muted{color:var(--muted);line-height:1.6;margin:0}
.fp-ui .fp-small{color:var(--muted);font-size:13px}
.fp-ui .fp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.fp-ui .fp-tile{display:grid;gap:10px;padding:20px;border:1px solid var(--border);border-radius:22px;background:var(--surface);box-shadow:var(--shadow);animation:fp-ui-rise .45s cubic-bezier(.2,.8,.2,1) both}
.fp-ui .fp-tile-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.fp-ui .fp-chip{display:inline-flex;align-items:center;min-height:26px;padding:0 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);font-size:12px;font-weight:700}
.fp-ui .fp-balance{font-size:clamp(22px,2.4vw,28px);font-weight:700;letter-spacing:-.5px}
.fp-ui .fp-balance small{font-size:13px;color:var(--muted);font-weight:600;margin-left:4px}
.fp-ui .fp-actions{display:flex;flex-wrap:wrap;gap:8px}
.fp-ui .fp-btn{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border:0;border-radius:14px;background:linear-gradient(145deg,#7c3aed,#6366f1);color:#fff;font-weight:600;box-shadow:0 6px 18px rgba(99,102,241,.25)}
.fp-ui .fp-btn-ghost{background:var(--surface);color:var(--accent-text);border:1px solid var(--border);box-shadow:none}
.fp-ui .fp-form{display:grid;gap:10px;margin-top:4px;padding:14px;border:1px solid var(--border);border-radius:16px;background:var(--accent-soft);animation:fp-ui-rise .25s ease both}
.fp-ui .fp-input{width:100%;min-height:44px;padding:0 12px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);font:inherit}
.fp-ui .fp-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft);outline:0}
.fp-ui .fp-card{padding:20px;border:1px solid var(--border);border-radius:24px;background:var(--surface);box-shadow:var(--shadow)}
.fp-ui .fp-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.fp-ui .fp-card h3{margin:0;font-size:16px;font-weight:650}
.fp-ui .fp-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--border)}
.fp-ui .fp-row>div{display:grid;gap:3px}
.fp-ui .fp-plus{color:#16a34a}
.fp-ui .fp-notice{margin:0;padding:12px 14px;border-radius:14px;background:var(--accent-soft);color:var(--accent-text);font-weight:600}
.fp-ui .fp-empty{padding:22px;border:1px dashed var(--border);border-radius:20px;text-align:center;color:var(--muted)}
.fp-ui .fp-key{display:grid;gap:12px;padding:20px;border:1px solid var(--border);border-radius:24px;background:var(--surface);box-shadow:var(--shadow)}
.fp-ui .fp-key h2{margin:0;font-size:17px;font-weight:650}
.fp-ui .fp-key-form{display:grid;gap:8px}
.fp-ui .fp-key-form label{font-size:13px;color:var(--muted);font-weight:600}
.fp-ui .fp-key-form>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
.fp-ui .fp-key-reveal{display:grid;gap:10px;padding:16px;border-radius:18px;background:var(--accent-soft);border:1px solid var(--border)}
.fp-ui .fp-key-reveal code{overflow-wrap:anywhere;padding:10px;border-radius:12px;background:var(--surface);font-size:13px}
.fp-ui .fp-key-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid var(--border)}
.fp-ui .fp-key-row>div{display:grid;gap:4px;min-width:0}
.fp-ui .fp-key-row code{font-size:12px;color:var(--muted)}
.fp-ui .fp-key-row span{font-size:12px;color:var(--muted)}
.fp-ui .fp-danger{width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:#dc2626}
.fp-ui .fp-lock{display:grid;gap:6px;padding:20px;border-radius:24px;border:1px dashed var(--border);color:var(--muted)}
.fp-ui .fp-lock h3{margin:0;color:var(--text);font-size:16px}
.fp-ui .fp-text-action{border:0;background:transparent;color:var(--accent-text);font-weight:600;padding:6px 8px;border-radius:10px}
@keyframes fp-ui-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.fp-ui *{animation:none!important;transition:none!important}}
@media (max-width:520px){.fp-ui .fp-key-form>div{grid-template-columns:1fr}.fp-ui .fp-grid{grid-template-columns:1fr}}
`}</style>;
}
