"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Bandeau affiché tant que l'identité du compte n'est pas vérifiée.
export default function VerificationBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("verification_status").single();
      if (alive) setStatus(data?.verification_status ?? null);
    })();
    return () => { alive = false; };
  }, []);

  if (status === null || status === "verified") return null;

  return (
    <div className="kyc-banner" role="status">
      <div>
        <strong>Vérifie ton identité pour passer en mode production</strong>
        <span>Une fois validée, tu pourras recevoir tes revenus en live.</span>
      </div>
      <button className="kyc-btn" onClick={onOpenSettings}>Vérifier</button>
    </div>
  );
}
