import { useState, useEffect, useMemo, useCallback } from "react";
import { type AnnotationData, ANCIEN_RAPPEL, recaler, serializeAnnotations, deserializeAnnotations } from "@/lib/annotations/strokes";
import { loadAnnotation, saveAnnotation } from "@/lib/firebase/annotations";
import { setTailleAnnotee, getTailleAnnotee } from "@/lib/performance/tailleAnnotee";
import { compter } from "@/lib/usage";

type Params = {
  user: { uid: string } | null;
  setlistId: string;
  currentPageKey: string | undefined;
  cleAncienne: string | null;
  /** Lot CV : sur une page `v2`, les clés de composition d'avant (lecture seule, pour le seul bandeau). */
  anciennesCompositions: string[];
  rappelEcran: number;
  affichageVu: string;
  fontScale: number;
  horsLigne: boolean;
  slugAnnote: string | undefined;
  /** Demi-page : clé de la page suivante (traits lus en lecture seule, sans repli sur les anciennes clés) et son rappel (px écran). */
  clePageSuivante?: string;
  rappelSuivantEcran?: number;
};

/** Traits de la page courante : chargement, recalage, enregistrement à chaque modification. */
export function useAnnotationsPage({
  user, setlistId, currentPageKey, cleAncienne, anciennesCompositions, rappelEcran, affichageVu, fontScale, horsLigne, slugAnnote, clePageSuivante, rappelSuivantEcran = 0,
}: Params) {
  // Les traits de la page n'ont pas pu être lus (réseau, 5xx) : page non initialisée, rien n'est enregistré.
  const [annotationsIndispo, setAnnotationsIndispo] = useState(false);
  // Lot CV : des traits existent sous une ancienne composition de la page, aucun sous la nouvelle.
  const [ancienneCompositionTraits, setAncienneCompositionTraits] = useState(false);
  const anciennesStr = anciennesCompositions.join("\n");
  const [pageAnnotations, setPageAnnotations] = useState<AnnotationData | null>(null);
  // Annotations d'avant le lot : Sections uniques avec rappel = ancienne réserve, sinon 0.
  const annotations = useMemo(
    () =>
      pageAnnotations
        ? recaler(pageAnnotations, rappelEcran, affichageVu === "unique" && rappelEcran > 0 ? ANCIEN_RAPPEL * fontScale : 0, window.innerHeight)
        : null,
    [pageAnnotations, rappelEcran, affichageVu, fontScale],
  );

  // Demi-page : traits de la page suivante, lus seulement (jamais enregistrés ni modifiés).
  const [suivante, setSuivante] = useState<AnnotationData | null>(null);
  useEffect(() => {
    setSuivante(null);
    if (!user || !clePageSuivante) return;
    let stale = false;
    const minuterie = setTimeout(() => {
      loadAnnotation(user.uid, setlistId, clePageSuivante)
        .then((raw) => { if (!stale && raw) setSuivante(deserializeAnnotations(raw)); })
        .catch(() => { /* lecture d'agrément : sans trait, la demi-page reste lisible */ });
    }, 150);
    return () => { stale = true; clearTimeout(minuterie); };
  }, [user, setlistId, clePageSuivante]);
  const annotationsSuivante = useMemo(
    () => (suivante ? recaler(suivante, rappelSuivantEcran, affichageVu === "unique" && rappelSuivantEcran > 0 ? ANCIEN_RAPPEL * fontScale : 0, window.innerHeight) : null),
    [suivante, rappelSuivantEcran, affichageVu, fontScale],
  );

  // Charger les traits de la page courante (toujours — affichage permanent)
  useEffect(() => {
    setAnnotationsIndispo(false);
    setAncienneCompositionTraits(false);
    if (!user || !currentPageKey) { setPageAnnotations(null); return; }
    let stale = false;
    setPageAnnotations(null);
    // Temporisé : glisser le curseur de page change la clé à chaque cran, une requête par page serait perdue.
    const minuterie = setTimeout(() => {
      loadAnnotation(user.uid, setlistId, currentPageKey).then(async (lu) => {
        let raw = lu;
        // Rien sous la nouvelle clé : l'annotation de l'ancienne page (jamais effacée) ; la première
        // modification l'enregistre sous la nouvelle clé.
        if (raw === null && cleAncienne) raw = await loadAnnotation(user.uid, setlistId, cleAncienne);
        return raw;
      }).then((raw) => {
        if (stale) return;
        const parsed = raw ? deserializeAnnotations(raw) : null;
        setPageAnnotations(
          parsed ?? { w: window.innerWidth, h: window.innerHeight, strokes: [] },
        );
        // Page `v2` sans trait : les anciens traits ne s'affichent pas, on sait seulement s'il en existe (lecture seule).
        // Lue après la publication des traits de la page : sur réseau lent, elle ne retarde ni l'affichage ni l'annotation.
        if (raw === null && anciennesStr) {
          void (async () => {
            for (const cle of anciennesStr.split("\n")) {
              if (stale) return;
              try {
                const ancien = await loadAnnotation(user.uid, setlistId, cle);
                if (ancien && (deserializeAnnotations(ancien)?.strokes.length ?? 0) > 0) {
                  if (!stale) setAncienneCompositionTraits(true);
                  return;
                }
              } catch {
                // Lecture d'information seulement : un échec ne rend pas la page indisponible.
              }
            }
          })();
        }
      }).catch(() => {
        // Lecture impossible ≠ page vide : sans calque, ni canvas ni enregistrement.
        if (!stale) setAnnotationsIndispo(true);
      });
    }, 150);
    return () => { stale = true; clearTimeout(minuterie); };
  }, [user, setlistId, currentPageKey, cleAncienne, anciennesStr]);

  // Chaque modification (trait fini, gomme, annuler) est sauvegardée aussitôt
  const handleAnnotationsChange = useCallback(
    (data: AnnotationData) => {
      // Un trait de plus, enregistré (ni gomme, ni annulation) : une annotation.
      if (user && currentPageKey && !horsLigne && data.strokes.length > (pageAnnotations?.strokes.length ?? 0)) compter("cmd.chant.annoter");
      setPageAnnotations(data);
      // L5 : au premier trait d'un chant, on retient la taille du texte à laquelle on annote.
      if (slugAnnote && data.strokes.length > 0 && getTailleAnnotee(user?.uid ?? null, setlistId, slugAnnote) === null) {
        setTailleAnnotee(user?.uid ?? null, setlistId, slugAnnote, fontScale);
      }
      if (user && currentPageKey && !horsLigne) {
        saveAnnotation(user.uid, setlistId, currentPageKey, serializeAnnotations(data));
      }
    },
    [user, setlistId, currentPageKey, horsLigne, slugAnnote, fontScale, pageAnnotations],
  );

  return { annotationsIndispo, annotations, annotationsSuivante, handleAnnotationsChange, ancienneCompositionTraits };
}
