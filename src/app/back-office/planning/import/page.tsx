"use client";

// Planning › Import : import initial d'un planning depuis le Sheet, reprise des noms du petit déj (admins ; bloc de l'ancienne administration, table Q3).
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { ImportPlanning } from "@/components/admin/ImportPlanning";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/planning/import" />;
  return <ImportPlanning />;
}
