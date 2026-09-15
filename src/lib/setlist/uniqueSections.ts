import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";

export type UniqueSection = { step: SectionOccurrence; uids: string[] };

/** Sections uniques (coup d'œil, docs/spec-coup-d-oeil.md) : chaque section
 *  imprimée une seule fois — sa première occurrence —, sauf quand elle est
 *  rejouée dans une autre tonalité (modulation) : une impression par
 *  (section, tonalité effective). `uids` = occurrences que l'impression
 *  représente, pour le sommaire. Notes, nuances et transitions d'occurrence
 *  ne sont pas reprises : le bandeau les porte. */
export function uniqueSections(steps: SectionOccurrence[], songKey?: string): UniqueSection[] {
  const out: UniqueSection[] = [];
  const byKey = new Map<string, UniqueSection>();
  for (const step of steps) {
    const key = step.targetKey && step.targetKey !== songKey ? step.targetKey : "";
    const id = `${step.section.id}|${key}`;
    const hit = byKey.get(id);
    if (hit) {
      hit.uids.push(step.section.uid);
    } else {
      const unique = { step, uids: [step.section.uid] };
      byKey.set(id, unique);
      out.push(unique);
    }
  }
  return out;
}
