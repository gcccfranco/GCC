// Liste « Qui » des fêtes (docs/spec-chants-fetes.md, décision 34, CF5, CF16). Fonctions pures.

import type { Language } from "@/types/common";

/** Libellé d'un « Qui » à l'écran. La valeur stockée « Franco » s'affiche « Culte Francophone »
 *  (法语崇拜, la catégorie existante) ; décision 45 : libellé seulement, aucune donnée réécrite. */
export function libelleQui(qui: string, langue: Language = "fr"): string {
  if (qui === "Franco") return langue === "zh" ? "法语崇拜" : "Culte Francophone";
  return qui;
}

const GROUPES: Record<string, string> = {
  "Gp Paix": "paix",
  "Gp Fidélité": "fidelite",
  "Gp Bonté": "bonte",
  "Gp Amour": "amour",
  "Gp Joie": "joie",
};

/** L'id du document `groupes/{id}` (lot 2) d'un « Qui » de groupe, sinon `null`. */
export function groupeDuQui(qui: string): string | null {
  return GROUPES[qui] ?? null;
}
