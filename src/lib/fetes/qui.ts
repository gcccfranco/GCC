// Liste « Qui » des fêtes (docs/spec-chants-fetes.md, décision 34, CF5, CF16). Fonctions pures.

import type { Language } from "@/types/common";

/** Les groupes en chinois : les mêmes caractères que `categories.Groupe …` de `zh-CN.json` (un test les compare). */
export const GROUPES_ZH: Record<string, string> = {
  "Gp Paix": "和平团契",
  "Gp Fidélité": "信实团契",
  "Gp Bonté": "恩慈团契",
  "Gp Amour": "仁爱团契",
  "Gp Joie": "喜乐团契",
};

/** Libellé d'un « Qui » à l'écran. La valeur stockée « Franco » s'affiche « Culte Francophone »
 *  (法语崇拜, la catégorie existante) ; en chinois, « Gp Joie » s'affiche 喜乐团契 (bo-evenements-9) ;
 *  décision 45 : libellé seulement, aucune donnée réécrite. */
export function libelleQui(qui: string, langue: Language = "fr"): string {
  if (qui === "Franco") return langue === "zh" ? "法语崇拜" : "Culte Francophone";
  if (langue === "zh" && GROUPES_ZH[qui]) return GROUPES_ZH[qui];
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
