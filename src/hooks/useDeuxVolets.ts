"use client";

import { useSyncExternalStore } from "react";
import { getBarreReduite, suivreBarreReduite } from "@/lib/barreLateralePref";

// Deux volets (lot U5, docs/spec-deux-volets.md, Q1) : dans les dispositions
// « ordinateur » et « tablette paysage » de U4, avec au moins 900 px de largeur
// utile (fenêtre moins la barre latérale). Tablette paysage (barre de 68 px) et
// ordinateur barre réduite : toujours ; barre dépliée (248 px) : dès 1 148 px.
// Mêmes requêtes que le bloc « Lot U4 » de globals.css, jamais l'agent utilisateur.

const ORDINATEUR = "(pointer: fine) and (min-width: 1024px)";
const TABLETTE_PAYSAGE = "(pointer: coarse) and (orientation: landscape) and (min-width: 1024px)";
/** 900 px utiles à côté de la barre dépliée (248 px). */
const ORDINATEUR_LARGE = "(pointer: fine) and (min-width: 1148px)";

const REQUETES = [ORDINATEUR, TABLETTE_PAYSAGE, ORDINATEUR_LARGE];

export function deuxVoletsMaintenant(): boolean {
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

/** Vrai quand la page doit se poser en deux volets ; suit la fenêtre et la barre. */
export function useDeuxVolets(): boolean {
  return useSyncExternalStore(suivre, deuxVoletsMaintenant, () => false);
}
