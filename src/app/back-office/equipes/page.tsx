"use client";

// Équipes › Organigramme : les 13 équipes, modifiables par qui a le droit Équipes ;
// au bas, « Recalculer depuis l'organigramme » pour les admins (retours du 06/10/2026).
import { useProfile } from "@/lib/firebase/users";
import { canEditerEquipes, isAdminUser } from "@/lib/access";
import { EquipesClient } from "@/app/equipes/EquipesClient";
import { RecalculerOrganigramme } from "@/components/equipes/RecalculerOrganigramme";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function OrganigrammePage() {
  const { user, profile } = useProfile();
  if (!canEditerEquipes(user, profile)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes" />;
  return (
    <>
      <EquipesClient gestion />
      {isAdminUser(user) && <RecalculerOrganigramme />}
    </>
  );
}
