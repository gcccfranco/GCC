// Ancienne adresse de Back-Office › Évènements › Réunions : mène à l'Agenda filtré sur les réunions
// (BO-C, BO8, docs/spec-back-office-piste-a.md).
import { notFound, redirect } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";

export default function AncienneListeReunions() {
  if (!BACK_OFFICE) notFound();
  redirect("/back-office/calendrier?vue=agenda&filtre=reunions");
}
