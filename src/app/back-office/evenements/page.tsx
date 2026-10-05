"use client";

// Back-Office › Évènements › Évènements. Qui n'a que des réunions arrive sur Réunions.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/firebase/users";
import { sousPartiesEvenements } from "@/lib/access";
import { ListeGestion } from "./ListeGestion";

export default function EvenementsPage() {
  const router = useRouter();
  const { user, profile } = useProfile();
  const parties = sousPartiesEvenements(user, profile);
  const ailleurs = !parties.includes("evenements") && parties.includes("reunions");

  useEffect(() => {
    if (ailleurs) router.replace("/back-office/evenements/reunions");
  }, [ailleurs, router]);

  return ailleurs ? null : <ListeGestion reunions={false} />;
}
