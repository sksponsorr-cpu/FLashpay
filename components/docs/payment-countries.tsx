// Liste des pays pour la documentation : générée depuis lib/payment-routing.ts
// pour rester alignée sur le routage réel.
import { SASPAY_COUNTRIES, SWYCHR_COUNTRIES } from "@/lib/payment-routing";

const NAMES: Record<string, string> = {
  BF: "Burkina Faso", BJ: "Bénin", CD: "RD Congo", CI: "Côte d'Ivoire", CM: "Cameroun",
  GH: "Ghana", GN: "Guinée", KE: "Kenya", ML: "Mali", MW: "Malawi", NE: "Niger", NG: "Nigeria",
  RW: "Rwanda", SN: "Sénégal", TG: "Togo", TZ: "Tanzanie", UG: "Ouganda", ZM: "Zambie",
};

const name = (c: string) => `${NAMES[c] ?? c} (${c})`;

export default function PaymentCountries() {
  const direct = [...SASPAY_COUNTRIES].filter((c) => !SWYCHR_COUNTRIES.has(c)).sort();
  const redirect = [...SWYCHR_COUNTRIES].sort();

  return (
    <section>
      <h3>Paiement direct (le client reste dans ton application)</h3>
      <p>{direct.map(name).join(", ")}</p>

      <h3>Redirection (le client est envoyé sur la page de paiement, puis revient chez toi)</h3>
      <p>{redirect.map(name).join(", ")}</p>

      <p>
        Indique toujours le pays du payeur. Un pays absent de ces listes n’est pas garanti :
        ne le propose pas à tes clients.
      </p>
    </section>
  );
}
