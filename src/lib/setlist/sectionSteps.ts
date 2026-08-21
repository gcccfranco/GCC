import type { SetlistItem, SectionNuance } from "@/types/setList";
import type { ChordProSection } from "@/types/chordPro";

/** Une occurrence de section dans la structure jouée d'un item, avec ce que
 *  le responsable y a attaché. */
export type SectionOccurrence = {
  section: ChordProSection;
  note: string;
  transition: string;
  nuance?: SectionNuance;
  /** Modulation (升调) : tonalité cible, telle que saisie (non comparée à la
   *  tonalité jouée — c'est à l'appelant de décider si elle change quelque
   *  chose). */
  targetKey?: string;
};

/** Notes, nuances, transitions et modulations sont mémorisées tantôt par uid
 *  de section, tantôt par occurrence (`id:n`), tantôt par id — selon l'âge de
 *  la setlist. Les trois clés sont essayées dans cet ordre, une seule fois
 *  ici plutôt qu'à chaque endroit qui parcourt une structure. */
export function resolveSectionOccurrences(
  sections: ChordProSection[],
  item: Pick<SetlistItem, "sectionNotes" | "sectionTransitions" | "sectionNuances" | "sectionKeys">,
): SectionOccurrence[] {
  const occ: Record<string, number> = {};
  return sections.map((section) => {
    const i = occ[section.id] ?? 0;
    occ[section.id] = i + 1;
    const occKey = i === 0 ? section.id : `${section.id}:${i}`;
    const pick = <T,>(map: Record<string, T> | undefined): T | undefined =>
      map?.[section.uid] ?? map?.[occKey] ?? map?.[section.id];
    return {
      section,
      note: pick(item.sectionNotes) ?? "",
      transition: pick(item.sectionTransitions) ?? "",
      nuance: pick(item.sectionNuances),
      targetKey: pick(item.sectionKeys),
    };
  });
}
