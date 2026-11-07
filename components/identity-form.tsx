"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Country = { code: string; name: string };
const docTypes: { value: string; label: string }[] = [
  { value: "cni", label: "Carte nationale d’identité" },
  { value: "passeport", label: "Passeport" },
  { value: "permis", label: "Permis de conduire" },
];
const validImage = (f: File | null) => !!f && f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024;

// Formulaire de vérification : pièce d'identité + selfie tenant la pièce.
export default function IdentityForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("CM");
  const [docType, setDocType] = useState("cni");
  const [docNumber, setDocNumber] = useState("");
  const [doc, setDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    createClient().from("supported_countries").select("code,name").order("name").then(({ data }) => {
      if (data) setCountries(data as Country[]);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!name.trim() || !docNumber.trim()) { setMessage("Remplis ton nom et le numéro de ta pièce."); return; }
    if (!validImage(doc) || !validImage(selfie)) { setMessage("Ajoute deux photos (JPEG ou PNG, 5 Mo maximum chacune)."); return; }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Connecte-toi pour envoyer ta demande.");

      const stamp = Date.now();
      const docPath = `${user.id}/${stamp}-document`;
      const selfiePath = `${user.id}/${stamp}-selfie`;
      const up1 = await supabase.storage.from("identity-documents").upload(docPath, doc!, { contentType: doc!.type, upsert: false });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from("identity-documents").upload(selfiePath, selfie!, { contentType: selfie!.type, upsert: false });
      if (up2.error) throw up2.error;

      const { data, error } = await supabase.rpc("submit_identity_verification", {
        p_name: name.trim(), p_country: country, p_doc_type: docType, p_doc_number: docNumber.trim(),
        p_doc_path: docPath, p_selfie_path: selfiePath,
      });
      if (error) throw error;
      if (data === "ALREADY_PENDING") setMessage("Une demande est déjà en cours d’examen.");
      else if (data === "ALREADY_VERIFIED") setMessage("Ton identité est déjà vérifiée.");
      else { setMessage("Demande envoyée. Elle est en cours d’examen."); onSubmitted(); }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Envoi impossible. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="idf" onSubmit={submit}>
      <label className="set-field"><span>Nom complet</span>
        <input className="set-input" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="set-field"><span>Pays</span>
        <select className="set-input" value={country} onChange={(e) => setCountry(e.target.value)}>
          {countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>
      <label className="set-field"><span>Type de pièce</span>
        <select className="set-input" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {docTypes.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </label>
      <label className="set-field"><span>Numéro de la pièce</span>
        <input className="set-input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} required />
      </label>
      <label className="set-field"><span>Photo de ta pièce (recto)</span>
        <input className="set-input" type="file" accept="image/*" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} required />
      </label>
      <label className="set-field"><span>Ta photo, tenant ta pièce à côté du visage</span>
        <input className="set-input" type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} required />
      </label>
      <p className="dash-muted">Ces documents sont privés. Seule l’équipe FlashPay peut les consulter, pour vérifier ton identité.</p>
      {message && <p className="dash-muted" role="status">{message}</p>}
      <button className="primary-button" disabled={busy}>{busy ? "Envoi…" : "Envoyer ma demande"}</button>
    </form>
  );
}
