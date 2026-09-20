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

/** Deux passages consécutifs d'une section se replient en « ×2 » quand rien ne
 *  les distingue : même libellé, même note, mêmes nuances, même modulation.
 *  Deux refrains dont l'un est mf et l'autre ff ne sont pas la même chose
 *  jouée deux fois (décision du 13/09/2026). */
export function isRepeatOf(
  a: { label: string; note?: string; nuance?: SectionNuance; targetKey?: string },
  b: { label: string; note?: string; nuance?: SectionNuance; targetKey?: string },
): boolean {
  const tags = (n?: SectionNuance) => (n?.tags ?? []).join(",");
  return (
    a.label === b.label &&
    (a.note ?? "") === (b.note ?? "") &&
    tags(a.nuance) === tags(b.nuance) &&
    (a.nuance?.note ?? "") === (b.nuance?.note ?? "") &&
    (a.targetKey ?? "") === (b.targetKey ?? "")
  );
}

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
