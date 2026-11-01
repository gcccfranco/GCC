import { useState, useEffect, useMemo, useCallback } from "react";
import { type AnnotationData, ANCIEN_RAPPEL, recaler, serializeAnnotations, deserializeAnnotations } from "@/lib/annotations/strokes";
import { loadAnnotation, saveAnnotation } from "@/lib/firebase/annotations";
import { setTailleAnnotee, getTailleAnnotee } from "@/lib/performance/tailleAnnotee";

type Params = {
  user: { uid: string } | null;
  setlistId: string;
  currentPageKey: string | undefined;
  cleAncienne: string | null;
  rappelEcran: number;
  affichageVu: string;
  fontScale: number;
  horsLigne: boolean;
  slugAnnote: string | undefined;
};

/** Traits de la page courante : chargement, recalage, enregistrement à chaque modification. */
export function useAnnotationsPage({
  user, setlistId, currentPageKey, cleAncienne, rappelEcran, affichageVu, fontScale, horsLigne, slugAnnote,
}: Params) {
  // Les traits de la page n'ont pas pu être lus (réseau, 5xx) : page non initialisée, rien n'est enregistré.
  const [annotationsIndispo, setAnnotationsIndispo] = useState(false);
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationData | null>(null);
  // Annotations d'avant le lot : Sections uniques avec rappel = ancienne réserve, sinon 0.
  const annotations = useMemo(
    () =>
      pageAnnotations
        ? recaler(pageAnnotations, rappelEcran, affichageVu === "unique" && rappelEcran > 0 ? ANCIEN_RAPPEL * fontScale : 0, window.innerHeight)
        : null,
    [pageAnnotations, rappelEcran, affichageVu, fontScale],
  );

  // Charger les traits de la page courante (toujours — affichage permanent)
  useEffect(() => {
    setAnnotationsIndispo(false);
    if (!user || !currentPageKey) { setPageAnnotations(null); return; }
    let stale = false;
    setPageAnnotations(null);
    // Temporisé : glisser le curseur de page change la clé à chaque cran, une requête par page serait perdue.
    const minuterie = setTimeout(() => {
      loadAnnotation(user.uid, setlistId, currentPageKey).then((raw) =>
        // Rien sous la nouvelle clé : l'annotation de l'ancienne page (jamais effacée) ; la première
        // modification l'enregistre sous la nouvelle clé.
        raw === null && cleAncienne ? loadAnnotation(user.uid, setlistId, cleAncienne) : raw,
      ).then((raw) => {
        if (stale) return;
        const parsed = raw ? deserializeAnnotations(raw) : null;
        setPageAnnotations(
          parsed ?? { w: window.innerWidth, h: window.innerHeight, strokes: [] },
        );
      }).catch(() => {
        // Lecture impossible ≠ page vide : sans calque, ni canvas ni enregistrement.
        if (!stale) setAnnotationsIndispo(true);
      });
    }, 150);
    return () => { stale = true; clearTimeout(minuterie); };
  }, [user, setlistId, currentPageKey, cleAncienne]);

  // Chaque modification (trait fini, gomme, annuler) est sauvegardée aussitôt
  const handleAnnotationsChange = useCallback(
    (data: AnnotationData) => {
      setPageAnnotations(data);
      // L5 : au premier trait d'un chant, on retient la taille du texte à laquelle on annote.
      if (slugAnnote && data.strokes.length > 0 && getTailleAnnotee(setlistId, slugAnnote) === null) {
        setTailleAnnotee(setlistId, slugAnnote, fontScale);
      }
      if (user && currentPageKey && !horsLigne) {
        saveAnnotation(user.uid, setlistId, currentPageKey, serializeAnnotations(data));
      }
    },
    [user, setlistId, currentPageKey, horsLigne, slugAnnote, fontScale],
  );

  return { annotationsIndispo, annotations, handleAnnotationsChange };
}
