"use client";

// Pastilles du Back-Office (lot U6, Q15) : depuis la piste A (BO2), Messages seul en portait une ;
// BO-B : À faire porte le nombre de ses lignes, Messages les signalements et propositions de chants en attente (admins). Comptée pour l'entrée donnée
// seulement : la barre latérale ou l'icône de l'en-tête.
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { todayIso } from "@/lib/scene/dimanches";
import { nowIsoParis } from "@/lib/evenements/agenda";
import { lireAFaire, lireEnAttente } from "./lecture";
import type { Entree } from "@/types/backOffice";

/** Signalements et propositions de chants en attente (admins) : seuls ceux-là sont lus. */
function useEnAttente(actif: boolean): number {
  const { user } = useProfile();
  const uid = user?.uid ?? "";
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    lireEnAttente(uid).then(
      ({ signalements, propositions }) => { if (vivant) setN(signalements + propositions); },
      () => {},
    );
    return () => { vivant = false; };
  }, [actif, uid]);
  return actif ? n : 0;
}

/** Le nombre de lignes de À faire (filtre « Tout »), lu une fois avec la page (`lireAFaire` est gardée). */
function useAFaire(actif: boolean): number {
  const { user, profile, loading } = useProfile();
  const uid = user?.uid;
  const [n, setN] = useState<{ cle: string; total: number } | null>(null);
  const cle = `${uid}|${todayIso()}`;
  useEffect(() => {
    if (!actif || !user || loading) return;
    let vivant = true;
    lireAFaire(user, profile, todayIso(), nowIsoParis()).then(
      (l) => { if (vivant) setN({ cle, total: l.resultat.total }); },
      () => {},
    );
    return () => { vivant = false; };
    // `user` et `profile` changent d'objet sans changer de compte : `cle` dit ce qui est lu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, cle, loading, !!profile]);
  return actif && n?.cle === cle ? n.total : 0;
}

/** Les pastilles des entrées `entrees` (0 = pas de pastille). Lues au montage, puis quand
 *  la liste change ; une entrée absente n'est pas lue. */
export function usePastilles(entrees: readonly Entree[]): Partial<Record<Entree, number>> {
  const { user } = useProfile();
  const enAttente = useEnAttente(isAdminUser(user) && entrees.includes("messages"));
  const afaire = useAFaire(entrees.includes("afaire"));
  return { messages: enAttente, afaire };
}
