// Harmonie (lot 9, H4) — passer d'un chant au suivant.
//
// Dans une setlist, les « Idées d'harmonie » d'un chant proposent **toujours**
// une transition vers le chant suivant : modulation si les tonalités diffèrent,
// enchaînement sans couper si c'est la même. En lecture seule — on ne touche
// pas à la setlist depuis ici.

import { noteToIndex, transposeChord } from "@/lib/transpose";
import type { Fiche } from "@/types/harmonie";

export interface Transition {
  ficheId: string;
  /** Demi-tons entre les deux chants, de 0 à 11. */
  ecart: number;
  /** Accord d'approche à jouer avant le chant suivant, dans sa tonalité. */
  approche: string | null;
}

/** La fiche de transition qui correspond à l'écart des deux tonalités. */
export function transitionEntre(de: string, vers: string): Transition | null {
  const a = noteToIndex(de.replace(/m$/, ""));
  const b = noteToIndex(vers.replace(/m$/, ""));
  if (a < 0 || b < 0) return null;
  const ecart = (b - a + 12) % 12;
  // Le 5 de la tonalité d'arrivée amène l'oreille ; à tonalité égale, rien à
  // amener, on enchaîne.
  const cinq = transposeChord(vers, 7, vers);
  switch (ecart) {
    case 0: return { ficheId: "transitions/meme-tonalite", ecart, approche: null };
    case 5: return { ficheId: "transitions/vers-le-4", ecart, approche: cinq };
    case 7: return { ficheId: "transitions/vers-le-5", ecart, approche: cinq };
    case 2: return { ficheId: "transitions/ton-plus-haut", ecart, approche: cinq };
    case 10: return { ficheId: "transitions/ton-plus-bas", ecart, approche: cinq };
    default: return { ficheId: "transitions/note-commune", ecart, approche: cinq };
  }
}

/** La fiche du catalogue qui va avec la transition. */
export function ficheDeLaTransition(transition: Transition, fiches: Fiche[]): Fiche | undefined {
  return fiches.find((f) => f.id === transition.ficheId);
}
