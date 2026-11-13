"use client";

// Équipes › Responsabilités (lot RS, RS-C) : qui gère quoi — plannings, Comité Orga, référents. Admins seuls
// (users/{uid} s'écrit par les admins). Interrupteur coupé : le layout du back-office répond déjà 404.
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { Responsabilites } from "@/components/admin/Responsabilites";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function Page() {
  const { user } = useProfile();
  if (!isAdminUser(user)) return <ReserveAuxAdmins connecte={!!user} retour="/back-office/equipes/responsabilites" />;
  return <Responsabilites />;
}
