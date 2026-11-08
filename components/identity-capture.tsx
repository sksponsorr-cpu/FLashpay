"use client";
import { useEffect, useRef, useState } from "react";

// Vérification guidée, dans le site : 1) scanner la pièce, 2) selfie dans un cadre ovale.
type Step = "doc" | "selfie" | "done";

export default function IdentityCapture({ onChange }: { onChange: (doc: File | null, selfie: File | null) => void }) {
  const [step, setStep] = useState<Step>("doc");
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setLive(false);
  }
  useEffect(() => stop, []);

  // Attache le flux une fois la zone vidéo affichée
  useEffect(() => {
    if (live && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [live, step]);

  async function openCamera(facing: "environment" | "user") {
    setError("");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
      setLive(true);
    } catch {
      setError("Caméra indisponible. Autorise la caméra, ou choisis une photo.");
    }
  }

  function shoot(label: string, done: (file: File, url: string) => void) {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const ratio = Math.min(1, 1280 / v.videoWidth); // image réduite pour économiser la mémoire
    const c = document.createElement("canvas");
    c.width = Math.round(v.videoWidth * ratio);
    c.height = Math.round(v.videoHeight * ratio);
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) return;
      stop();
      done(new File([blob], `${label}.jpg`, { type: "image/jpeg" }), URL.createObjectURL(blob));
    }, "image/jpeg", 0.85);
  }

  function pickFile(file: File | null, done: (f: File, url: string) => void) {
    if (!file) return;
    done(file, URL.createObjectURL(file));
  }

  function retake(which: "doc" | "selfie") {
    if (which === "doc") { setDoc(null); setDocUrl(null); setStep("doc"); onChange(null, selfie); }
    else { setSelfie(null); setSelfieUrl(null); setStep("selfie"); onChange(doc, null); }
    setError("");
  }

  const stepNumber = step === "doc" ? 1 : step === "selfie" ? 2 : 2;

  return (
    <div className="idc">
      <style>{`
        .idc{background:#0d0e13;color:#fff;border-radius:24px;padding:16px;display:grid;gap:14px}
        .idc-head{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#c9cbd6}
        .idc-bar{height:4px;border-radius:4px;background:#2a2c36;overflow:hidden}
        .idc-bar i{display:block;height:100%;background:#ff6a3d;transition:width .4s ease}
        .idc-stage{position:relative;width:100%;aspect-ratio:3/4;border-radius:18px;overflow:hidden;background:#000}
        .idc-stage video,.idc-stage img{width:100%;height:100%;object-fit:cover;display:block}
        .idc-frame-doc{position:absolute;left:8%;right:8%;top:24%;height:52%;border-radius:14px;border:2px solid #ff6a3d;box-shadow:0 0 0 999px rgba(0,0,0,.45)}
        .idc-frame-oval{position:absolute;left:18%;right:18%;top:12%;bottom:22%;border-radius:50% / 58%;border:2px solid #ff6a3d;box-shadow:0 0 0 999px rgba(0,0,0,.45)}
        .idc-hint{text-align:center;color:#c9cbd6;font-size:14px;margin:0}
        .idc-shutter{justify-self:center;width:68px;height:68px;border-radius:50%;border:4px solid #fff;background:#ff6a3d;cursor:pointer;box-shadow:0 0 0 6px rgba(255,106,61,.25)}
        .idc-btn{min-height:46px;padding:0 16px;border:0;border-radius:14px;background:#ff6a3d;color:#fff;font-weight:800;cursor:pointer}
        .idc-btn.g{background:transparent;color:#ff6a3d;border:1px solid #3a3c4a}
        .idc-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
        .idc-ok{display:grid;justify-items:center;gap:8px;padding:18px;border-radius:18px;background:#14151c;text-align:center}
        .idc-check{width:56px;height:56px;border-radius:50%;background:#e6f7ee;color:#13a05a;display:grid;place-items:center;font-size:28px;font-weight:800}
        .idc-file{font-size:13px;color:#9ea0b2;display:grid;gap:4px}
        .idc-file input{color:#c9cbd6}
      `}</style>

      <div className="idc-head">
        <span>{step === "done" ? "Vérification prête" : `Étape ${stepNumber} sur 2`}</span>
        <span>{step === "doc" ? "Scanner la pièce" : step === "selfie" ? "Selfie" : "Terminé"}</span>
      </div>
      <div className="idc-bar"><i style={{ width: step === "doc" ? "50%" : "100%" }} /></div>

      {step === "doc" && (
        <>
          <p className="idc-hint">Place ta pièce d’identité dans le cadre, bien à plat, sans reflet.</p>
          <div className="idc-stage">
            {docUrl ? <img src={docUrl} alt="Pièce" /> : live ? <video ref={videoRef} playsInline muted /> : null}
            {!docUrl && live && <div className="idc-frame-doc" />}
          </div>
          {!docUrl && !live && (
            <div className="idc-row">
              <button type="button" className="idc-btn" onClick={() => void openCamera("environment")}>Ouvrir la caméra</button>
            </div>
          )}
          {live && !docUrl && <button type="button" className="idc-shutter" aria-label="Capturer" onClick={() => shoot("document", (f, u) => {
            setDoc(f); setDocUrl(u); onChange(f, selfie); setStep("selfie");
          })} />}
          {!docUrl && (
            <label className="idc-file">Ou choisir une photo de la pièce
              <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null, (f, u) => { setDoc(f); setDocUrl(u); onChange(f, selfie); setStep("selfie"); })} />
            </label>
          )}
        </>
      )}

      {step === "selfie" && (
        <>
          <p className="idc-hint">Regarde la caméra, garde ton visage dans l’ovale, et tiens ta pièce à côté de ton visage.</p>
          <div className="idc-stage">
            {selfieUrl ? <img src={selfieUrl} alt="Selfie" /> : live ? <video ref={videoRef} playsInline muted /> : null}
            {!selfieUrl && live && <div className="idc-frame-oval" />}
          </div>
          {!selfieUrl && !live && (
            <div className="idc-row">
              <button type="button" className="idc-btn" onClick={() => void openCamera("user")}>Ouvrir la caméra</button>
              <button type="button" className="idc-btn g" onClick={() => retake("doc")}>Revenir à la pièce</button>
            </div>
          )}
          {live && !selfieUrl && <button type="button" className="idc-shutter" aria-label="Capturer le selfie" onClick={() => shoot("selfie", (f, u) => {
            setSelfie(f); setSelfieUrl(u); onChange(doc, f); setStep("done");
          })} />}
          {!selfieUrl && (
            <label className="idc-file">Ou choisir une photo
              <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null, (f, u) => { setSelfie(f); setSelfieUrl(u); onChange(doc, f); setStep("done"); })} />
            </label>
          )}
        </>
      )}

      {step === "done" && (
        <div className="idc-ok">
          <span className="idc-check">✓</span>
          <strong>Identité prête à être envoyée</strong>
          <p className="idc-hint">Vérifie les deux photos, puis envoie ta demande.</p>
          <div className="idc-row">
            <button type="button" className="idc-btn g" onClick={() => retake("doc")}>Reprendre la pièce</button>
            <button type="button" className="idc-btn g" onClick={() => retake("selfie")}>Reprendre le selfie</button>
          </div>
        </div>
      )}

      {error && <p className="idc-hint" role="status">{error}</p>}
    </div>
  );
}
