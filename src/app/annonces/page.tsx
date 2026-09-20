import { notFound, redirect } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";

// Les annonces vivent dans le calendrier des évènements depuis le lot 6
// (docs/spec-evenements.md) : l'ancienne adresse y renvoie.
export default function AnnoncesPage() {
  if (!BACK_OFFICE) notFound();
  redirect("/evenements");
}
