import type { SetlistItem } from "@/types/setList";

/** Lien vers la page du chant : ses réglages, la setlist et la position de
 *  l'élément — la page y relit la version adaptée (Dernière phrase, mode
 *  Adapter). Un chant peut revenir deux fois : la position les distingue.
 *  Paramètres en JSON (`?key=%22F%22`), comme les lit la page du chant. */
export function songHref(
  slug: string,
  s: Pick<SetlistItem, "structureOverride" | "sectionNotes" | "sectionNuances" | "keyOverride" | "sectionKeys">,
  setlistId: string,
  position: number,
) {
  return {
    pathname: `/songs/${encodeURIComponent(slug)}`,
    query: {
      ...(s.structureOverride && {
        structure: JSON.stringify(s.structureOverride),
      }),
      ...(s.sectionNotes && {
        sectionNotes: JSON.stringify(s.sectionNotes),
      }),
      ...(s.sectionNuances && Object.keys(s.sectionNuances).length > 0 && {
        sectionNuances: JSON.stringify(s.sectionNuances),
      }),
      ...(s.keyOverride && {
        key: JSON.stringify(s.keyOverride)
      }),
      ...(s.sectionKeys && {
        sectionKeys: JSON.stringify(s.sectionKeys)
      }),
      setlist: JSON.stringify(setlistId),
      item: JSON.stringify(position),
    },
  };
}
