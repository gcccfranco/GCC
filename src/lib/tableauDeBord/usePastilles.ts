"use client";

// Pastilles du Back-Office (lot U6, Q15) : Tâches = à faire pour moi (le compte de « Mes
// tâches »), Messages = signalements et propositions de chants en attente (admins). Comptées
// pour les entrées données seulement : celles de « Plus » (B6) ou de la barre latérale.
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/firebase/users";
import { equipesDesTaches, isAdminUser } from "@/lib/access";
import { useTaches } from "@/lib/taches/useTaches";
import { aFairePour, lignesDeTache } from "@/lib/taches/echeances";
import { todayIso } from "@/lib/scene/dimanches";
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
  const { user, profile } = useProfile();
  const admin = isAdminUser(user);
  const avecTaches = entrees.includes("taches");
  // `useTaches` relit selon la liste des équipes (en texte) : un nouveau tableau à chaque rendu ne relance rien.
  const { items } = useTaches(avecTaches ? equipesDesTaches(user, profile) : []);
  const today = todayIso();
  // « À moi » (EQ15) : une tâche « toute l'équipe » ne compte que pour ses référents.
  const aFaire = avecTaches
    ? aFairePour(items.flatMap(({ tache, fois }) => lignesDeTache(tache, fois, today)), user, profile).length
    : 0;
  const enAttente = useEnAttente(admin && entrees.includes("messages"));
  return { taches: aFaire, messages: enAttente };
}
