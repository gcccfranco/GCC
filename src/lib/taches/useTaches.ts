"use client";

import { useCallback, useEffect, useState } from "react";
import { listTaches, type TacheAvecFois } from "@/lib/firebase/taches";
import type { TachePole } from "@/types/tache";

async function charger(key: string): Promise<TacheAvecFois[]> {
  const poles = key ? (key.split(",") as TachePole[]) : [];
  return (await Promise.all(poles.map((p) => listTaches(p)))).flat();
}

/** Tâches (et fois cochées) des pôles donnés ; `reload` après une écriture. */
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

  const reload = useCallback(async () => {
    setItems(await charger(key));
  }, [key]);

  return { items, loading, reload };
}
