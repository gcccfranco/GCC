// Harmonie (lot 9, H2, famille 8) — « Appliquer à la setlist ».
//
// Une modulation ne se pose pas comme les autres idées : elle se sert du 升调
// qui existe déjà (`SetlistItem.sectionKeys`, une tonalité par occurrence) et
// ajoute, à la fin de la section précédente, l'accord qui amène l'oreille.
// Ici, seulement le calcul ; la setlist écrit.

import { getTransposedKey, noteToIndex } from "@/lib/transpose";
import type { ChordProSection } from "@/types/chordPro";
import { etiquetteDuPas } from "./suggestions";
import { typeDeSection, type Endroit } from "./motifs";
import type { Modulation } from "./regles";

export interface ModulationProposee {
  /** Occurrence qui monte : le dernier refrain. */
  sectionUid: string;
  sectionNom: string;
  /** Tonalité de cette section après la montée. */
  tonaliteCible: string;
  /** Accords d'approche, dans la tonalité d'arrivée ; vide pour la modulation directe. */
  approche: string[];
  /** Où poser l'approche : la fin de la section d'avant. `null` s'il n'y en a pas. */
  endroitApproche: Endroit | null;
}

/** Le dernier refrain d'un chant, ou à défaut sa dernière section. */
function dernierRefrain(sections: ChordProSection[]): number {
  for (let i = sections.length - 1; i >= 0; i--) if (typeDeSection(sections[i]) === "chorus") return i;
  return sections.length - 1;
}

/** La fin de la section : sa dernière ligne qui porte des accords. */
function finDeSection(section: ChordProSection, index: number): Endroit | null {
  for (let l = section.lines.length - 1; l >= 0; l--) {
    const accords = section.lines[l].tokens.filter((t) => t.type === "chord");
    if (!accords.length) continue;
    return {
      sectionUid: section.uid,
      sectionNom: section.name || section.type,
      section: index,
      ligne: l,
      accord: accords.length - 1,
      accords: [accords[accords.length - 1].value],
      places: [{ ligne: l, srcLine: section.lines[l].srcLine, accord: accords.length - 1 }],
      variante: 0,
    };
  }
  return null;
}

/**
 * Ce qu'une fiche de modulation ferait sur ce chant : quelle section monte, de
 * combien, et quel accord poser avant. `null` si le chant n'a pas de quoi (pas
 * de section, ou rien avant le dernier refrain).
 */
export function modulationProposee(
  sections: ChordProSection[],
  tonalite: string,
  modulation: Modulation,
): ModulationProposee | null {
  if (!sections.length) return null;
  const i = dernierRefrain(sections);
  const section = sections[i];
  if (!section) return null;

  // Une tonalité mineure s'écrit « Am » : la tonique est A. Sans ça,
  // `getTransposedKey` rendait « Am » pour tout, et l'approche devenait
  // « Am/Am ».
  const tonique = tonalite.replace(/m$/, "");
  if (noteToIndex(tonique) < 0) return null;
  const tonaliteCible = getTransposedKey(tonique, modulation.demiTons);
  // Les pas d'approche sont écrits en degrés de la **nouvelle** tonalité.
  const approche = modulation.approche.map((pas) => etiquetteDuPas(pas, tonaliteCible));

  return {
    sectionUid: section.uid,
    sectionNom: section.name || section.type,
    tonaliteCible,
    approche,
    endroitApproche: i > 0 ? finDeSection(sections[i - 1], i - 1) : null,
  };
}
