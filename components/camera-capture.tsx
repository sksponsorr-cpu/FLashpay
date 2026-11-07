"use client";
import { useEffect, useRef, useState } from "react";

// Prise de photo DANS le site (sans quitter la page), pour éviter la perte de la page sur mobile.
export default function CameraCapture({ label, onCapture }: { label: string; onCapture: (file: File) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setActive(false);
  }

  useEffect(() => stop, []); // coupe la caméra si on quitte l'écran

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
    } catch {
      setError("Caméra indisponible. Autorise l’accès à la caméra, ou choisis une photo ci-dessous.");
    }
  }

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const ratio = Math.min(1, 1280 / video.videoWidth); // image réduite : moins de mémoire
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onCapture(new File([blob], `${label}.jpg`, { type: "image/jpeg" }));
      setPreview(URL.createObjectURL(blob));
      stop();
    }, "image/jpeg", 0.85);
  }

  function fromFile(file: File | null) {
    if (!file) return;
    onCapture(file);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div className="cam">
      <span className="set-field"><span>{label}</span></span>
      {preview && <img src={preview} alt={label} className="cam-preview" />}
      {active && <video ref={videoRef} className="cam-video" playsInline muted />}
      <div className="cam-row">
        {!active && <button type="button" className="primary-button" onClick={() => void start()}>{preview ? "Reprendre la photo" : "Prendre la photo"}</button>}
        {active && <button type="button" className="primary-button" onClick={snap}>Capturer</button>}
        {active && <button type="button" className="kyc-btn-ghost" onClick={stop}>Annuler</button>}
      </div>
      {error && <p className="dash-muted" role="status">{error}</p>}
      <label className="cam-file">Ou choisir une photo existante
        <input type="file" accept="image/*" onChange={(e) => fromFile(e.target.files?.[0] ?? null)} />
      </label>
    </div>
  );
}
