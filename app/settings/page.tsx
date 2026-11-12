import { redirect } from "next/navigation";

// Les paramètres se trouvent dans le tableau de bord (menu Paramètres → Sécurité).
export default function SettingsRedirect() {
  redirect("/dashboard");
}
