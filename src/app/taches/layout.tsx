import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BACK_OFFICE } from "@/lib/backOffice";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { SectionTaches } from "@/components/taches/SectionTaches";

// Back-office coupé (lot 18, docs/spec-mise-en-ligne.md) : les pages des tâches
// sont des composants client, c'est donc ce gabarit serveur qui répond 404.
// Lot U4 bis, B4 (Q2, Q8) : « À faire pour moi » vit ici, la fiche d'une tâche est la page
// de l'adresse (`/taches/[pole]/[id]`). La section lit `?date=` : Suspense pour le rendu statique.
export default function TachesLayout({ children }: { children: React.ReactNode }) {
  if (!BACK_OFFICE) notFound();
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <SectionTaches>{children}</SectionTaches>
      </Suspense>
    </RequireAuth>
  );
}
