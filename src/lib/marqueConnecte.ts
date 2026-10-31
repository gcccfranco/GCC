// Marque locale « était connecté » (lot CH, docs/spec-chargement.md, C1 et C5). Firebase met un instant à lire la
// session dans IndexedDB : sans cette marque, ce temps-là se dessine comme un visiteur (en-tête, barre du bas
// absente, « Chargement… »). La marque ne donne AUCUN droit : elle choisit seulement ce qu'on dessine pendant
// l'attente. Posée quand Firebase rend un compte, effacée quand il rend « personne » et à la déconnexion.
// Comme `barreLateralePref` : reflétée sur `<html data-connecte="1">`, posée avant le premier affichage par
// `SCRIPT_MARQUE_CONNECTE` (layout.tsx), ce qui laisse aussi le CSS masquer l'en-tête des visiteurs avant
// l'hydratation. Chaque accès au stockage est dans un try/catch : sans lui, la page se rend comme avant.
import { useSyncExternalStore } from "react";

import { CLE_MARQUE_CONNECTE as CLE } from "./marqueConnecteScript";

export function lireMarqueConnecte(): boolean {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

const abonnes = new Set<() => void>();

function suivre(changement: () => void) {
  abonnes.add(changement);
  return () => {
    abonnes.delete(changement);
  };
}

/** Pose ou efface la marque (stockage, `data-connecte` de `<html>`) et prévient les composants. */
export function poserMarqueConnecte(connecte: boolean) {
  try {
    if (connecte) localStorage.setItem(CLE, "1");
    else localStorage.removeItem(CLE);
  } catch { /* stockage indisponible : la marque ne sert qu'à l'attente */ }
  if (typeof document !== "undefined") {
    if (connecte) document.documentElement.dataset.connecte = "1";
    else delete document.documentElement.dataset.connecte;
  }
  abonnes.forEach((changement) => changement());
}

/** Vrai si la marque est présente. Rendu serveur : faux (le script et le CSS couvrent l'avant-hydratation). */
export function useMarqueConnecte(): boolean {
  return useSyncExternalStore(suivre, lireMarqueConnecte, () => false);
}

/** Ligne de script de l'en-tête : pose `data-connecte` avant le premier affichage. */
export { SCRIPT_MARQUE_CONNECTE } from "./marqueConnecteScript";
