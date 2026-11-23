// Liste « Qui » des fêtes (docs/spec-chants-fetes.md, décision 34, CF5, CF16). Fonctions pures.

import type { Language } from "@/types/common";
import { QUI, QUI_RETIRES } from "@/types/programme";

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
  if (qui === "Intergroupe" && langue === "zh") return "联合聚会";
  if (qui === "Interfranco" && langue === "zh") return "法语联合聚会";
  if (langue === "zh" && GROUPES_ZH[qui]) return GROUPES_ZH[qui];
  return qui;
}

/** Une valeur ni de la liste ni retirée : texte libre (« Autre… », SQ-R7). */
export const estQuiLibre = (q: string): boolean =>
  !(QUI as readonly string[]).includes(q) && !(QUI_RETIRES as readonly string[]).includes(q);

/** Texte libre d'« Autre… » : rogné, 40 caractères ; égal (casse ignorée) à une valeur de QUI ou à son libellé
 *  FR ou 中文 → cette valeur. */
export function normaliserQui(texte: string): string {
  const t = texte.trim().slice(0, 40).trim();
  const bas = t.toLowerCase();
  return QUI.find((q) => [q, libelleQui(q, "fr"), libelleQui(q, "zh")].some((x) => x.toLowerCase() === bas)) ?? t;
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
