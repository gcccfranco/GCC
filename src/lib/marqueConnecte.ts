// Marque locale « était connecté » (lot CH, docs/spec-chargement.md, C1 et C5). Firebase met un instant à lire la
// session dans IndexedDB : sans cette marque, ce temps-là se dessine comme un visiteur (en-tête, barre du bas
// absente, « Chargement… »). La marque ne donne AUCUN droit : elle choisit seulement ce qu'on dessine pendant
// l'attente. Posée quand Firebase rend un compte, effacée quand il rend « personne » et à la déconnexion.
// Comme `barreLateralePref` : reflétée sur `<html data-connecte="1">`, posée avant le premier affichage par
// `SCRIPT_MARQUE_CONNECTE` (layout.tsx), ce qui laisse aussi le CSS masquer l'en-tête des visiteurs avant
// l'hydratation. Chaque accès au stockage est dans un try/catch : sans lui, la page se rend comme avant.
import { useSyncExternalStore } from "react";

import { CLE_FORME as CLE_FORME_RETENUE, CLE_MARQUE_CONNECTE as CLE } from "./marqueConnecteScript";
import { ENTREES, type Entree } from "@/types/backOffice";

function lireMarqueConnecte(): boolean {
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
    else {
      localStorage.removeItem(CLE);
      localStorage.removeItem(CLE_FORME_RETENUE);
    }
  } catch { /* stockage indisponible : la marque ne sert qu'à l'attente */ }
  if (typeof document !== "undefined") {
    if (connecte) document.documentElement.dataset.connecte = "1";
    else {
      delete document.documentElement.dataset.connecte;
      delete document.documentElement.dataset.responsable;
    }
  }
  abonnes.forEach((changement) => changement());
}

/** Vrai si la marque est présente. Rendu serveur : faux (le script et le CSS couvrent l'avant-hydratation). */
export function useMarqueConnecte(): boolean {
  return useSyncExternalStore(suivre, lireMarqueConnecte, () => false);
}

// Lot CH, C6 : la forme que le profil a fait dessiner la dernière fois. Comme la marque : aucun droit, seulement
// ce qu'on dessine pendant l'attente (sélecteur App · Back-Office, icône Messages, entrées du Back-Office et de sa
// barre du bas, qui en dérive par `ongletsBackOffice`). Une valeur illisible ou incohérente = pas de forme retenue.
type FormeRetenue = { responsable: boolean; messages: boolean; entreesBackOffice: Entree[] };

function lireFormeBrute(brut: string | null): FormeRetenue | null {
  if (!brut) return null;
  try {
    const v = JSON.parse(brut) as Partial<FormeRetenue> | null;
    if (!v || typeof v.responsable !== "boolean" || typeof v.messages !== "boolean" || !Array.isArray(v.entreesBackOffice)) return null;
    const entrees = v.entreesBackOffice;
    if (!entrees.every((e): e is Entree => (ENTREES as readonly unknown[]).includes(e))) return null;
    if (v.responsable !== entrees.length > 0 || v.messages !== entrees.includes("messages")) return null;
    return { responsable: v.responsable, messages: v.messages, entreesBackOffice: entrees };
  } catch {
    return null;
  }
}

// `useSyncExternalStore` veut la même référence tant que la valeur ne change pas : une seule lecture par texte.
let formeBrute: string | null | undefined;
let formeLue: FormeRetenue | null = null;

function lireFormeRetenue(): FormeRetenue | null {
  let brut: string | null = null;
  try {
    brut = localStorage.getItem(CLE_FORME_RETENUE);
  } catch { /* stockage indisponible : pas de forme retenue */ }
  if (brut !== formeBrute) {
    formeBrute = brut;
    formeLue = lireFormeBrute(brut);
  }
  return formeLue;
}

/** Retient la forme (et la reflète sur `<html data-responsable>`) ; sans effet si elle n'a pas changé. */
export function poserFormeRetenue(forme: FormeRetenue) {
  const brut = JSON.stringify(forme);
  try {
    if (localStorage.getItem(CLE_FORME_RETENUE) === brut) return;
    localStorage.setItem(CLE_FORME_RETENUE, brut);
  } catch { /* stockage indisponible : rien n'est retenu */ }
  if (typeof document !== "undefined") {
    if (forme.responsable) document.documentElement.dataset.responsable = "1";
    else delete document.documentElement.dataset.responsable;
  }
  abonnes.forEach((changement) => changement());
}

/** La forme retenue, ou null. Rendu serveur : null. */
export function useFormeRetenue(): FormeRetenue | null {
  return useSyncExternalStore(suivre, lireFormeRetenue, () => null);
}
