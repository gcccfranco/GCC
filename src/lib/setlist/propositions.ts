// Chant hors répertoire d'une setlist de fête (docs/spec-chants-fetes.md, décision 31, CF21) :
// un élément « proposition » attend qu'un `.cho` porte `{proposition: <id>}`, puis devient le chant.
// Fonctions pures.

import type { SetlistItem } from "@/types/setList";

/** Ce que la résolution lit de l'index des chants. */
export type ChantIndexe = { slug: string; proposition?: string | null };

/** Un élément qui est un chant (simple ou fusion) : ni une transition, ni une proposition en attente.
 *  Les comptes « n chants » gardent `type !== "transition"` (une proposition compte, CF21). */
export function estUnChant(item: Pick<SetlistItem, "type">): boolean {
  return item.type !== "transition" && item.type !== "proposition";
}

/** Remplace tout élément « proposition » dont l'`id` figure dans l'index par un élément de chant
 *  ordinaire (même position, tonalité d'origine, structure par défaut). Rend la liste reçue telle
 *  quelle quand rien ne change. */
export function resoudrePropositions(items: SetlistItem[], index: readonly ChantIndexe[]): SetlistItem[] {
  const parId = new Map<string, string>();
  for (const c of index) if (c.proposition) parId.set(c.proposition, c.slug);
  if (!items.some((i) => i.type === "proposition" && i.proposition && parId.has(i.proposition.id))) return items;
  return items.map((i): SetlistItem => {
    const slug = i.type === "proposition" && i.proposition ? parId.get(i.proposition.id) : undefined;
    if (!slug) return i;
    return {
      songSlug: slug,
      position: i.position,
      keyOverride: null,
      showChords: true,
      showPinyin: false,
      useJianpu: false,
      structureOverride: null,
      sectionNotes: {},
      notes: i.notes,
    };
  });
}
