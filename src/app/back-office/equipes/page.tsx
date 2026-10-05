"use client";

// Équipes › Organigramme : les 13 équipes, modifiables par qui a le droit Équipes.
import { useProfile } from "@/lib/firebase/users";
import { canEditerEquipes } from "@/lib/access";
import { EquipesClient } from "@/app/equipes/EquipesClient";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function OrganigrammePage() {
  const { user, profile } = useProfile();
  if (!canEditerEquipes(user, profile)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes" />;
  return <EquipesClient gestion />;
}
