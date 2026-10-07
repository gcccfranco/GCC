"use client";

import { useCallback, useEffect, useState } from "react";
import { listTaches, type TacheAvecFois } from "@/lib/firebase/taches";
import type { TachePole } from "@/types/tache";

async function charger(key: string): Promise<TacheAvecFois[]> {
  const poles = key ? (key.split(",") as TachePole[]) : [];
  return (await Promise.all(poles.map((p) => listTaches(p)))).flat();
}

/** Tâches (et fois cochées) des pôles donnés ; `reload` après une écriture, `reload(pôle)` ne relit
 *  que le pôle touché (une requête « fois » par tâche : ne pas relire les autres). */
export function useTaches(poles: TachePole[]) {
  const key = poles.join(",");
  const [items, setItems] = useState<TacheAvecFois[]>([]);
  // Les pôles dont `items` est la lecture : d'autres pôles (le profil vient d'arriver) remettent
  // `loading` le temps de les lire, et la page ne dit pas « introuvable » entre deux.
  const [lus, setLus] = useState<string | null>(null);
  const loading = lus !== key;

  useEffect(() => {
    let alive = true;
    charger(key).then((next) => {
      if (!alive) return;
      setItems(next);
      setLus(key);
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const reload = useCallback(async (pole?: TachePole) => {
    if (!pole) return setItems(await charger(key));
    const frais = await listTaches(pole);
    // Dans l'ordre des pôles, comme une lecture complète.
    setItems((avant) => key.split(",").flatMap((p) => (p === pole ? frais : avant.filter((x) => x.tache.pole === p))));
  }, [key]);

  return { items, loading, reload };
}
