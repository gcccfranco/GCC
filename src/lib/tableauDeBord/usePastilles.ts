"use client";

// Pastilles du Back-Office (lot U6, Q15) : depuis la piste A (BO2), Messages seul en porte une =
// signalements et propositions de chants en attente (admins). Comptée pour l'entrée donnée
// seulement : la barre latérale ou l'icône de l'en-tête.
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { compterEnAttente } from "@/lib/firebase/reports";
import type { Entree } from "@/types/backOffice";

/** Signalements et propositions de chants en attente (admins) : seuls ceux-là sont lus. */
function useEnAttente(actif: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    Promise.all([compterEnAttente("reports"), compterEnAttente("songProposals")]).then(
      ([r, p]) => { if (vivant) setN(r + p); },
      () => {},
    );
    return () => { vivant = false; };
  }, [actif]);
  return actif ? n : 0;
}

/** Les pastilles des entrées `entrees` (0 = pas de pastille). Lues au montage, puis quand
 *  la liste change ; une entrée absente n'est pas lue. */
export function usePastilles(entrees: readonly Entree[]): Partial<Record<Entree, number>> {
  const { user } = useProfile();
  const enAttente = useEnAttente(isAdminUser(user) && entrees.includes("messages"));
  return { messages: enAttente };
}
