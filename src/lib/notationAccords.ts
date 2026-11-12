// Notation des accords au choix de chacun (lot Harmonie H7) — lettres ou chiffres (degrés), par compte sur l'appareil.
// `accords-notation-<uid>` (compte) ou `accords-notation` (sans compte) : "lettres" (défaut) | "chiffres" ; rien dans Firestore.
// Stockage indisponible ou valeur illisible = lettres, sans exception ; un choix qui ne peut pas s'enregistrer reste en
// mémoire pour la séance. Les abonnés (useSyncExternalStore) se mettent à jour sans rechargement.
import { createContext, useSyncExternalStore } from "react";

export type NotationAccords = "lettres" | "chiffres";

const cle = (uid: string | null) => (uid ? `accords-notation-${uid}` : "accords-notation");
const memoire = new Map<string, NotationAccords>();
const abonnes = new Set<() => void>();

function lire(k: string): NotationAccords {
  try {
    return localStorage.getItem(k) === "chiffres" ? "chiffres" : "lettres";
  } catch {
    return "lettres";
  }
}

export function getNotationAccords(uid: string | null): NotationAccords {
  const k = cle(uid);
  let n = memoire.get(k);
  if (!n) memoire.set(k, (n = lire(k)));
  return n;
}

export function setNotationAccords(uid: string | null, notation: NotationAccords) {
  const k = cle(uid);
  memoire.set(k, notation);
  try { localStorage.setItem(k, notation); } catch { /* stockage indisponible : le choix vaut pour la séance */ }
  abonnes.forEach((f) => f());
}

const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };

/** Choix en cours ; `uid` undefined = authentification en cours : lettres. */
export function useNotationAccords(uid: string | null | undefined): NotationAccords {
  return useSyncExternalStore(abonner, () => (uid === undefined ? "lettres" : getNotationAccords(uid)), () => "lettres");
}

/** Ce que les accords d'une partition affichent : la notation et la tonalité des étiquettes. Hors fournisseur : lettres. */
export const NotationAccordsContext = createContext<{ notation: NotationAccords; tonalite?: string }>({ notation: "lettres" });
