"use client";

// Équipes › Inscriptions : ouvrir ou fermer la création de comptes (admins ; bloc de l'ancienne administration, table Q3).
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { InscriptionsComptes } from "@/components/admin/InscriptionsComptes";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/inscriptions" />;
  return <InscriptionsComptes />;
}
