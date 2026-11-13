import { Suspense } from "react";
import type { Metadata } from "next";
import { PageAccords } from "@/components/accords/PageAccords";

// Dictionnaire d'accords (lot DA, DA-2, docs/spec-dictionnaire-accords.md, Q7) : ouvert à tous, sans compte,
// ni derrière BACK_OFFICE ni derrière l'accès Harmonie. Aucune entrée de navigation (Q14 ouverte) : on y arrive
// par « Voir tout le dictionnaire » du panneau d'un accord.
export const metadata: Metadata = { title: "Accords" };

export default function AccordsPage() {
  return (
    <Suspense>
      <PageAccords />
    </Suspense>
  );
}
