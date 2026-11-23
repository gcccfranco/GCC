import type { SetlistItem } from "@/types/setList";

/** Chant ajouté depuis « Tous les chants » : local à cet appareil, le temps du mode louange (docs/spec-louange-tous-les-chants.md, Q1). */
export type AjoutLocal = { slug: string; position: number; jianpu: boolean };

/** Entre la position courante et la suivante plus grande (ou +1 s'il n'y en a pas). */
export function positionApres(items: SetlistItem[], positionCourante: number): number {
  const suivantes = items.map((i) => i.position).filter((p) => p > positionCourante);
  return suivantes.length ? (positionCourante + Math.min(...suivantes)) / 2 : positionCourante + 1;
}

export function itemsAvecAjouts(items: SetlistItem[], ajouts: AjoutLocal[]): SetlistItem[] {
  if (!ajouts.length) return items;
  return [
    ...items,
    ...ajouts.map((a): SetlistItem => ({
      songSlug: a.slug,
      position: a.position,
      keyOverride: null,
      showChords: true,
      showPinyin: true,
      useJianpu: false,
      jianpuSheet: a.jianpu,
      structureOverride: null,
      sectionNotes: {},
      notes: "",
    })),
  ];
}

export function choixScanDesAjouts(ajouts: AjoutLocal[]): Record<string, boolean> {
  return Object.fromEntries(ajouts.map((a) => [a.slug, a.jianpu]));
}
