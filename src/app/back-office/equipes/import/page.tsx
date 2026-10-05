"use client";

// Équipes › Import : organigramme du Sheet, « Recalculer depuis l'organigramme » (admins ; bloc de l'ancienne administration, table Q3).
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { ImportEquipes } from "@/components/admin/ImportEquipes";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/import" />;
  return <ImportEquipes />;
}
