// PDF « compact » (lot 5, docs/spec-export-pdf.md) : la vue partitions en
// « Sections uniques », imprimée. Mêmes règles que l'écran (SongView,
// StructureStrip) — fonctions pures, partagées avec les tests.

import type { ChordProSection } from "@/types/chordPro";
import type { SetlistItem } from "@/types/setList";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { isRepeatOf, resolveSectionOccurrences, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { uniqueSections, type UniqueSection } from "@/lib/setlist/uniqueSections";

/** Étapes du bandeau (ordre joué) et sections à imprimer (chacune une fois,
 *  réimprimée seulement si elle est rejouée dans une autre tonalité). */
export function compactPlan(
  playedSections: ChordProSection[],
  item: Pick<SetlistItem, "sectionNotes" | "sectionTransitions" | "sectionNuances" | "sectionKeys">,
  songKey?: string,
): { steps: SectionOccurrence[]; prints: UniqueSection[] } {
  const steps = resolveSectionOccurrences(playedSections, item);
  return { steps, prints: uniqueSections(steps, songKey) };
}

export type StripGroup = { step: SectionOccurrence; abbr: string; full: string; repeat: number };

/** Étapes du bandeau : deux passages consécutifs que rien ne distingue se
 *  replient en « ×2 » (même règle que StructureStrip à l'écran). */
export function stripGroups(steps: SectionOccurrence[], labelOf: (section: ChordProSection) => string): StripGroup[] {
  const groups: StripGroup[] = [];
  for (const step of steps) {
    const full = labelOf(step.section);
    const last = groups[groups.length - 1];
    if (last && isRepeatOf({ ...last.step, label: last.full }, { ...step, label: full })) {
      last.repeat++;
      continue;
    }
    groups.push({ step, abbr: abbreviateSection(step.section), full, repeat: 1 });
  }
  return groups;
}

/** Transitions de la setlist dans le compact : imprimées en bas de la page du
 *  chant qui les précède (`attached`, par index de ce chant) ; une transition
 *  sans chant avant elle garde sa page (`standalone`, par son propre index).
 *  `items` est trié par position ; les transitions vides sont ignorées. */
export function compactTransitions(
  items: Pick<SetlistItem, "type" | "transitionText">[],
): { attached: Map<number, string>; standalone: Set<number> } {
  const attached = new Map<number, string>();
  const standalone = new Set<number>();
  let lastSong = -1;
  items.forEach((it, i) => {
    if (it.type !== "transition") {
      lastSong = i;
      return;
    }
    if (!it.transitionText) return;
    if (lastSong < 0) {
      standalone.add(i);
      return;
    }
    const before = attached.get(lastSong);
    attached.set(lastSong, before ? `${before} · ${it.transitionText}` : it.transitionText);
  });
  return { attached, standalone };
}
