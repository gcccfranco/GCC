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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    charger(key).then((next) => {
      if (!alive) return;
      setItems(next);
      setLoading(false);
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
