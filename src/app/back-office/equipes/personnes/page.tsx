"use client";

// Équipes › Personnes (agencement v18, B9) : en tête, l'ouverture des comptes (ancien onglet
// Inscriptions, fusionné ici le 06/10/2026) ; puis la liste et la personne en deux volets
// (`PersonnesVolets`). Admins seuls (users/{uid}, config/app).
import { Suspense } from "react";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { PersonnesVolets } from "@/components/admin/PersonnesVolets";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/personnes" />;
  // `?uid=` (la personne choisie) se lit par `useSearchParams` : sous une frontière Suspense.
  return (
    <Suspense>
      <PersonnesVolets />
    </Suspense>
  );
}
