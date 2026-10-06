"use client";

// Équipes › Personnes : en tête, l'ouverture des comptes (ancien onglet Inscriptions,
// fusionné ici le 06/10/2026) ; puis liste, fiche, pôles en lecture, droits (admins ;
// blocs de l'ancienne administration, table Q3).
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { InscriptionsComptes } from "@/components/admin/InscriptionsComptes";
import { Personnes } from "@/components/admin/Personnes";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/personnes" />;
  return (
    <div className="space-y-5">
      <InscriptionsComptes />
      <Personnes />
    </div>
  );
}
