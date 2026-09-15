import { redirect } from "next/navigation";

// Les annonces vivent dans le calendrier des évènements depuis le lot 6
// (docs/spec-evenements.md) : l'ancienne adresse y renvoie.
export default function AnnoncesPage() {
  redirect("/evenements");
}
