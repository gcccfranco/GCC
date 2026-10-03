"use client";

// Cours d'Harmonie (docs/spec-cours-harmonie.md) : charger la liste des
// chapitres et un chapitre, construits au build dans `public/harmonie-cours/`.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/firebase/auth";
import { getCoursProgres, marquerChapitre, type Progres } from "@/lib/firebase/coursProgres";
import type { Chapitre, ChapitreResume, CoursIndex } from "@/types/cours";

export function useCoursIndex(): { chapitres: ChapitreResume[]; chargement: boolean } {
  const [index, setIndex] = useState<CoursIndex | null>(null);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    let vivant = true;
    fetch("/harmonie-cours/index.json")
      .then((r) => r.json())
      .then((d: CoursIndex) => { if (vivant) setIndex(d); })
      .catch(() => { /* pas de cours : la page le dit */ })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, []);
  return { chapitres: index?.chapitres ?? [], chargement };
}

export function useChapitre(id: string): { chapitre: Chapitre | null; chargement: boolean } {
  const [chapitre, setChapitre] = useState<Chapitre | null>(null);
  const [chargement, setChargement] = useState(true);
  useEffect(() => {
    let vivant = true;
    setChargement(true);
    fetch(`/harmonie-cours/${encodeURIComponent(id)}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Chapitre | null) => { if (vivant) setChapitre(d); })
      .catch(() => { if (vivant) setChapitre(null); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [id]);
  return { chapitre, chargement };
}

/** Les chapitres finis par la personne connectée, et de quoi cocher / décocher
 *  (affiché tout de suite, écrit ensuite ; relu si l'écriture échoue). */
export function useCoursProgres(): { fini: Progres; chargement: boolean; marquer: (id: string, fait: boolean) => Promise<void> } {
  const { user, loading } = useAuth();
  const [fini, setFini] = useState<Progres>({});
  const [chargement, setChargement] = useState(true);
  const uid = user?.uid;

  useEffect(() => {
    if (loading) return;
    if (!uid) { setChargement(false); return; }
    let vivant = true;
    getCoursProgres(uid)
      .then((p) => { if (vivant) setFini(p); })
      .catch(() => { /* rien de fini à montrer */ })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [uid, loading]);

  const marquer = useCallback(async (id: string, fait: boolean) => {
    if (!uid) return;
    const date = fait ? new Date().toISOString() : null;
    setFini((p) => {
      const suite = { ...p };
      if (date) suite[id] = date;
      else delete suite[id];
      return suite;
    });
    try {
      await marquerChapitre(uid, id, date);
    } catch {
      setFini(await getCoursProgres(uid).catch(() => ({})));
    }
  }, [uid]);

  return { fini, chargement, marquer };
}

/** Chapitres à cocher, dans l'ordre conseillé : par niveau, puis par numéro. */
export function leconsDansLOrdre(chapitres: ChapitreResume[]): ChapitreResume[] {
  return chapitres
    .filter((c) => c.niveau !== null)
    .sort((a, b) => a.niveau! - b.niveau! || (a.numero ?? 0) - (b.numero ?? 0));
}

