// Animation de chargement FlashPay : le logo « f » respire, un anneau tourne autour.
// Réutilisable : <BrandLoader />, ou <BrandLoader fullscreen /> pour une page entière.
export default function BrandLoader({ fullscreen = false, size = 64 }: { fullscreen?: boolean; size?: number }) {
  return (
    <div
      role="status"
      aria-label="Chargement en cours"
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: fullscreen ? "100vh" : undefined,
        width: fullscreen ? "100%" : undefined,
        background: fullscreen ? "#fffaf8" : "transparent",
      }}
    >
      <style>{`
        @keyframes fp-ring { to { transform: rotate(360deg); } }
        @keyframes fp-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes fp-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .fp-load * { animation: none !important; } }
      `}</style>
      <div className="fp-load" style={{ position: "relative", width: size + 24, height: size + 24, display: "grid", placeItems: "center" }}>
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid #efeafe",
            borderTopColor: "#5b3fd6",
            animation: "fp-ring 1s linear infinite",
          }}
        />
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: size,
            height: size,
            borderRadius: size * 0.3,
            background: "linear-gradient(145deg,#7c5be6,#5b3fd6)",
            color: "#fff",
            fontWeight: 800,
            fontSize: size * 0.52,
            boxShadow: "0 14px 30px -12px rgba(91,63,214,.7)",
            animation: "fp-breathe 1.6s ease-in-out infinite",
          }}
        >
          f
        </span>
      </div>
      <p style={{ marginTop: 14, fontSize: 13, color: "#8a8aa3", fontWeight: 600, animation: "fp-fade .6s ease both" }}>
        Chargement…
      </p>
    </div>
  );
}
