"use client";

import { useSyncExternalStore } from "react";
import { dispositionMaintenant, suivreDisposition } from "@/lib/deuxVolets";

// Deux volets (lot U5, docs/spec-deux-volets.md, Q1) : dans les dispositions
// « ordinateur » et « tablette paysage » de U4, avec au moins 900 px de largeur
// utile (fenêtre moins la barre latérale). Tablette paysage (barre de 68 px) et
// ordinateur barre réduite : toujours ; barre dépliée (248 px) : dès 1 148 px.
// Mêmes requêtes que le bloc « Lot U4 » de globals.css, jamais l'agent utilisateur.

/** 900 px utiles à côté de la barre dépliée (248 px). */
const ORDINATEUR_LARGE = "(pointer: fine) and (min-width: 1148px)";

export function deuxVoletsMaintenant(): boolean {
  return dispositionMaintenant(ORDINATEUR_LARGE);
}

function suivre(changement: () => void) {
  return suivreDisposition(ORDINATEUR_LARGE, changement);
}

/** Vrai quand la page doit se poser en deux volets ; suit la fenêtre et la barre. */
export function useDeuxVolets(): boolean {
  return useSyncExternalStore(suivre, deuxVoletsMaintenant, () => false);
}
