// Préréglages du Crayon (AN-4, docs/spec-mode-louange-forscore-2.md) : cinq traits prêts, réglables, retenus par compte
// sur l'appareil (`annot-prereglages-<uid>`), rien dans Firestore. Module pur (localStorage lu et écrit en essai).

import { normaliserHex } from "@/lib/performance/couleurIcones";

export type Prereglage = { outil: "pen" | "highlighter"; couleur: string; /** px, comme `SIZES` */ taille: number; alpha: number };

export const PREREGLAGES_DEFAUT: Prereglage[] = [
  { outil: "pen", couleur: "#2b2b2e", taille: 2, alpha: 1 }, // Graphite fin
  { outil: "pen", couleur: "#b8188c", taille: 3.5, alpha: 1 }, // Magenta moyen
  { outil: "pen", couleur: "#1d7a3e", taille: 3.5, alpha: 1 }, // Vert moyen
  { outil: "highlighter", couleur: "#ffd60a", taille: 20, alpha: 0.35 }, // Surligneur jaune
  { outil: "pen", couleur: "#2b2b2e", taille: 6, alpha: 1 }, // Graphite épais
];

/** Au téléphone : Graphite fin, Magenta moyen, Surligneur jaune. */
export const INDICES_TELEPHONE = [0, 1, 3];

/** Teintes prêtes du réglage (pas de blanc « correcteur » : le cercle le permet toujours). */
export const TEINTES_PRETES = ["#2b2b2e", "#b8188c", "#1d7a3e", "#ffd60a", "#6ee7a8" /* Menthe */, "#2563eb", "#dc2626", "#d97706"];

export const BORNES = { pen: [1, 12], highlighter: [8, 40], alpha: [0.1, 1] } as const;

const cle = (uid: string) => `annot-prereglages-${uid}`;
const dans = (n: unknown, [a, b]: readonly [number, number] | readonly number[]) => typeof n === "number" && Number.isFinite(n) && n >= a && n <= b;

/** Lecture tolérante : un élément invalide est remplacé par le défaut de sa place ; une liste invalide donne les défauts. */
export function lirePrereglages(uid: string | null): Prereglage[] {
  if (!uid) return PREREGLAGES_DEFAUT;
  try {
    const brut = JSON.parse(localStorage.getItem(cle(uid)) ?? "null");
    if (!Array.isArray(brut)) return PREREGLAGES_DEFAUT;
    return PREREGLAGES_DEFAUT.map((d, i) => {
      const p = brut[i];
      const couleur = normaliserHex(typeof p?.couleur === "string" ? p.couleur : "");
      const outil: unknown = p?.outil;
      if ((outil !== "pen" && outil !== "highlighter") || !couleur || !dans(p.taille, BORNES[outil]) || !dans(p.alpha, BORNES.alpha)) return d;
      return { outil, couleur, taille: p.taille, alpha: p.alpha };
    });
  } catch {
    return PREREGLAGES_DEFAUT;
  }
}

export function ecrirePrereglages(uid: string | null, liste: Prereglage[]) {
  if (!uid) return;
  try { localStorage.setItem(cle(uid), JSON.stringify(liste)); } catch { /* stockage refusé : réglage pour la séance seulement */ }
}
