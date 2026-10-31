import type { parseChordPro } from "@/lib/chordpro/parser";
import type { SectionItem } from "@/types/song";
import { idDeSection } from "@/lib/setlist/sectionOrigins";

/**
 * Résout un structureOverride (liste d'UIDs `<sectionId>-<n>`, ou d'IDs de
 * section pour les anciennes setlists) vers les sections correspondantes,
 * avec un uid propre par occurrence.
 */
export function resolveStructureOverride<T extends { id: string; uid: string }>(
  sections: T[],
  structureOverride: string[],
): T[] {
  return structureOverride.flatMap((ov, index) => {
    const baseId = idDeSection(ov);
    const section = sections.find((s) => s.uid === ov || s.id === ov || s.id === baseId);
    if (!section) return [];
    const uid = /-\d+$/.test(ov) ? ov : `${baseId}-${index}`;
    return [{ ...section, uid }];
  });
}

/** Sections dans l'ordre joué : la structure propre à l'item si elle existe (non vide), sinon celles du chant. */
export function ordreJoue<T extends { id: string; uid: string }>(
  sections: T[],
  structure: string[] | null | undefined,
): T[] {
  return structure?.length ? resolveStructureOverride(sections, structure) : sections;
}

export function buildDefaultStructure(sections: ReturnType<typeof parseChordPro>["sections"]): SectionItem[] {
  return sections.map((s, i) => ({
    uid: `${s.id}-${i}`,
    sectionId: s.id,
    name: s.name || s.type,
    note: "",
  }));
}