"use client";

import { useSyncExternalStore } from "react";
import { getBarreReduite, suivreBarreReduite } from "@/lib/barreLateralePref";

// Éditeur de setlist en deux colonnes (lot U5 bis, docs/spec-editeur-setlist.md, Q2 et Q6) :
// dans les dispositions « ordinateur » et « tablette paysage » de U4, avec au moins 806 px
// pour l'éditeur (setlist 400 + réglages 406). Tablette paysage (barre de 68 px) et
// ordinateur barre réduite : toujours ; barre dépliée (248 px) : dès 1 054 px de fenêtre.
// Mêmes requêtes que le bloc « Lot U4 » de globals.css, jamais l'agent utilisateur.

const ORDINATEUR = "(pointer: fine) and (min-width: 1024px)";
const TABLETTE_PAYSAGE = "(pointer: coarse) and (orientation: landscape) and (min-width: 1024px)";
/** 806 px d'éditeur à côté de la barre dépliée (248 px). */
const ORDINATEUR_LARGE = "(pointer: fine) and (min-width: 1054px)";

const REQUETES = [ORDINATEUR, TABLETTE_PAYSAGE, ORDINATEUR_LARGE];

function maintenant(): boolean {
  const m = (q: string) => window.matchMedia(q).matches;
  if (m(TABLETTE_PAYSAGE)) return true;
  if (!m(ORDINATEUR)) return false;
  return getBarreReduite() || m(ORDINATEUR_LARGE);
}

function suivre(changement: () => void) {
  const listes = REQUETES.map((q) => window.matchMedia(q));
  listes.forEach((l) => l.addEventListener("change", changement));
  const finBarre = suivreBarreReduite(changement);
  return () => {
    listes.forEach((l) => l.removeEventListener("change", changement));
    finBarre();
  };
}

/** Vrai quand l'éditeur se pose en deux colonnes ; suit la fenêtre et la barre. */
export function useEditeurDeuxColonnes(): boolean {
  return useSyncExternalStore(suivre, maintenant, () => false);
}

function suivreOrdinateur(changement: () => void) {
  const liste = window.matchMedia(ORDINATEUR);
  liste.addEventListener("change", changement);
  return () => liste.removeEventListener("change", changement);
}

/** Vrai dans la disposition « ordinateur » de U4 (pas la tablette couchée) : le « + »
 *  entre deux éléments de la setlist lui est réservé (spec, « Tablette paysage »). */
export function useEditeurOrdinateur(): boolean {
  return useSyncExternalStore(suivreOrdinateur, () => window.matchMedia(ORDINATEUR).matches, () => false);
}
