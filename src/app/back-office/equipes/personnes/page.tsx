"use client";

// Équipes › Personnes : liste, fiche, pôles en lecture, droits (admins ; bloc de l'ancienne administration, table Q3).
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { Personnes } from "@/components/admin/Personnes";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/personnes" />;
  return <Personnes />;
}
