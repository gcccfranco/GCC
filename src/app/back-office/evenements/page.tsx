// Back-Office › Évènements : absorbé par le Calendrier (BO-C, BO8, docs/spec-back-office-piste-a.md).
// L'ancienne adresse mène à l'Agenda filtré sur les évènements ; les fiches gardent leurs adresses.
import { notFound, redirect } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";

export default function EvenementsPage() {
  if (!BACK_OFFICE) notFound();
  redirect("/back-office/calendrier?vue=agenda&filtre=evenements");
}
