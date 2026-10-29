"use client";

import { useCallback, useEffect, useState } from "react";
import { listTaches, type TacheAvecFois } from "@/lib/firebase/taches";

async function charger(key: string): Promise<TacheAvecFois[]> {
  const equipes = key ? key.split(",") : [];
  return (await Promise.all(equipes.map((e) => listTaches(e)))).flat();
}

/** Tâches (et fois cochées) des équipes données ; `reload` après une écriture, `reload(équipe)` ne
 *  relit que l'équipe touchée (une requête « fois » par tâche : ne pas relire les autres). */
export function useTaches(equipes: string[]) {
  const key = equipes.join(",");
  const [items, setItems] = useState<TacheAvecFois[]>([]);
  // Les équipes dont `items` est la lecture : d'autres équipes (le profil vient d'arriver) remettent
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

  const reload = useCallback(async (equipe?: string) => {
    if (!equipe) return setItems(await charger(key));
    const frais = await listTaches(equipe);
    // Dans l'ordre des équipes, comme une lecture complète.
    setItems((avant) => key.split(",").flatMap((e) => (e === equipe ? frais : avant.filter((x) => x.tache.equipe === e))));
  }, [key]);

  return { items, loading, reload };
}
