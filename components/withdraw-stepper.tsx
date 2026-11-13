"use client";

import { useState } from "react";
import CountryPicker from "@/components/country-picker";
import { callingCodeFor } from "@/lib/calling-codes";

type Dest = {
  country_code: string;
  operator: string;
  mobile: string;
  name: string;
};

type Props = {
  currency: string;
  minimum: number;
  available: number;
  onSubmit: (
    amount: number,
    dest: Dest
  ) => Promise<void>;
};

const STEPS = [
  "Pays",
  "Mobile money",
  "Montant",
  "Confirmation",
];

const COUNTRIES = [
  { code: "CD", name: "République démocratique du Congo" },
  { code: "CG", name: "Congo-Brazzaville" },
  { code: "CM", name: "Cameroun" },
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BJ", name: "Bénin" },
  { code: "TG", name: "Togo" },
  { code: "ML", name: "Mali" },
  { code: "RW", name: "Rwanda" },
  { code: "KE", name: "Kenya" },
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
];

const OPERATORS: Record<string, string[]> = {
  CD: [
    "Airtel Money",
    "Orange Money",
    "M-Pesa",
    "Africell Money",
  ],
  CG: ["MTN MoMo", "Airtel Money"],
  CM: ["MTN MoMo", "Orange Money", "Airtel Money"],
  SN: ["Orange Money", "Wave"],
  CI: ["Orange Money", "MTN MoMo", "Moov Money", "Wave"],
  BF: ["Orange Money", "Moov Money"],
  BJ: ["MTN MoMo", "Moov Money"],
  TG: ["Moov Money"],
  ML: ["Orange Money", "Moov Money"],
  RW: ["MTN MoMo", "Airtel Money"],
  KE: ["M-Pesa", "Airtel Money"],
  GH: ["MTN MoMo", "Vodafone Cash"],
  NG: ["Bank transfer"],
};

export default function WithdrawStepper({
  currency,
  minimum,
  available,
  onSubmit,
}: Props) {
  const [step, setStep] = useState(0);

  const [dest, setDest] = useState<Dest>({
    country_code: "",
    operator: "",
    mobile: "",
    name: "",
  });

  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const n = Number(amount);

  const fee = n * 0.05;
  const net = n - fee;

  const canNext = [
    !!dest.country_code,
    !!dest.operator &&
      !!dest.mobile.trim() &&
      !!dest.name.trim(),
    Number.isFinite(n) &&
      n >= minimum &&
      n <= available &&
      n > 0,
    true,
  ][step];

  async function submit() {
    setBusy(true);
    setErr("");

    try {
      await onSubmit(n, dest);
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : "Demande refusée."
      );
    } finally {
      setBusy(false);
    }
  }

  const field: React.CSSProperties = {
    width: "100%",
    padding: "14px",
    borderRadius: 14,
    border: "1px solid #ebe8f7",
    background: "#fbfaff",
    font: "inherit",
    boxSizing: "border-box",
  };

  const primary: React.CSSProperties = {
    flex: 1,
    padding: "14px",
    borderRadius: 14,
    border: 0,
    background: "linear-gradient(145deg,#f0593f,#e8472a)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  };

  const ghost: React.CSSProperties = {
    padding: "14px 18px",
    borderRadius: 14,
    border: "1px solid #ebe8f7",
    background: "#fff",
    color: "#e8472a",
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          height: 6,
          background: "#ebe8f7",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((step + 1) / STEPS.length) * 100}%`,
            background: "linear-gradient(90deg,#f0593f,#e8472a)",
            transition: "width .45s",
          }}
        />
      </div>

      <div style={{ fontSize: 13, color: "#6b6c80" }}>
        Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
      </div>

      {step === 0 && (
        <div style={{ display: "grid", gap: 10 }}>

          <CountryPicker
            label="Pays de destination"
            placeholder="Choisir un pays"
            value={dest.country_code}
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))}
            onChange={(v) => setDest({ ...dest, country_code: v, operator: "" })}
          />
        </div>
      )}

      {step === 1 && (
        <div style={{ display: "grid", gap: 10 }}>

          <CountryPicker
            label="Réseau de paiement"
            placeholder="Choisir un réseau"
            value={dest.operator}
            options={(OPERATORS[dest.country_code] ?? []).map((o) => ({ value: o, label: o }))}
            onChange={(v) => setDest({ ...dest, operator: v })}
          />

          <label>Numéro de réception</label>

          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#8a8aa3" }}>
            {dest.country_code
              ? `Saisis le numéro sans l’indicatif. Ex. : 812345678 (préfixe ${callingCodeFor(dest.country_code) || "du pays"} ajouté automatiquement).`
              : "Choisis d’abord le pays pour voir le format attendu."}
          </p>

          <input
            placeholder="Numéro Mobile Money"
            inputMode="tel"
            value={dest.mobile}
            onChange={(e) =>
              setDest({
                ...dest,
                mobile: e.target.value,
              })
            }
            style={field}
          />

          <label>Nom du bénéficiaire</label>

          <input
            placeholder="Nom complet"
            value={dest.name}
            onChange={(e) =>
              setDest({
                ...dest,
                name: e.target.value,
              })
            }
            style={field}
          />
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "grid", gap: 10 }}>
          <label>Montant du retrait</label>

          <input
            type="number"
            min={minimum}
            max={available}
            step="any"
            placeholder={`Montant en ${currency}`}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={field}
          />

          <small>
            Minimum : {minimum.toLocaleString("fr-FR")} {currency}
          </small>

          <small>
            Disponible : {available.toLocaleString("fr-FR")} {currency}
          </small>

          <div
            style={{
              background: "#f7f5ff",
              borderRadius: 14,
              padding: 15,
              display: "grid",
              gap: 10,
            }}
          >
            <div>
              Montant demandé :{" "}
              <strong>
                {n.toLocaleString("fr-FR")} {currency}
              </strong>
            </div>

            <div>
              Frais estimés (5 %) :{" "}
              <strong>
                {fee.toLocaleString("fr-FR")} {currency}
              </strong>
            </div>

            <div>
              Montant net estimé :{" "}
              <strong>
                {net.toLocaleString("fr-FR")} {currency}
              </strong>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div
          style={{
            display: "grid",
            gap: 12,
            background: "#f7f5ff",
            padding: 16,
            borderRadius: 14,
          }}
        >
          <h3>Vérification du retrait</h3>

          <div>
            Pays :{" "}
            <strong>
              {COUNTRIES.find(
                (c) => c.code === dest.country_code
              )?.name}
            </strong>
          </div>

          <div>
            Réseau : <strong>{dest.operator}</strong>
          </div>

          <div>
            Numéro : <strong>{dest.mobile}</strong>
          </div>

          <div>
            Bénéficiaire : <strong>{dest.name}</strong>
          </div>

          <div>
            Montant :{" "}
            <strong>
              {n.toLocaleString("fr-FR")} {currency}
            </strong>
          </div>

          <div>
            Frais estimés :{" "}
            <strong>
              {fee.toLocaleString("fr-FR")} {currency}
            </strong>
          </div>

          <div>
            Net estimé :{" "}
            <strong>
              {net.toLocaleString("fr-FR")} {currency}
            </strong>
          </div>
        </div>
      )}

      {err && (
        <p role="alert" style={{ color: "#c8321a" }}>
          {err}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            style={ghost}
          >
            Retour
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            style={{
              ...primary,
              opacity: canNext ? 1 : 0.5,
            }}
          >
            Continuer
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            style={{
              ...primary,
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "Envoi…" : "Confirmer le retrait"}
          </button>
        )}
      </div>
    </div>
  );
}
