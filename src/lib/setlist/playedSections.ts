import type { SongContent } from "@/lib/api/songs";
import type { SetlistItem } from "@/types/setList";
import type { ChordProSection } from "@/types/chordPro";
import { itemAst } from "@/lib/chordpro/itemContent";
import { resolveStructureOverride } from "@/lib/chordpro/structure";

/** Sections d'un item de setlist dans l'ordre joué, reprises comprises — même
 *  ordre que la vue partitions. Fusion : structure mélangée, sinon chaque chant
 *  à la suite. Sert au déroulé et à la copie des paroles de la régie. */
export function playedSections(item: SetlistItem, contents: Record<string, SongContent>): ChordProSection[] {
  const resolve = (sections: ChordProSection[], structure: string[] | null | undefined) =>
    structure?.length ? resolveStructureOverride(sections, structure) : sections;

  if (item.type === "fusion" && item.fusionSongs) {
    if (item.mixedStructure?.length) {
      return item.mixedStructure.flatMap((ms) => {
        const section = contents[ms.songSlug]?.ast.sections.find((s) => s.id === ms.sectionId);
        return section ? [section] : [];
      });
    }
    return item.fusionSongs.flatMap((fs) => {
      const ast = contents[fs.songSlug]?.ast;
      return ast ? resolve(ast.sections, fs.structureOverride) : [];
    });
  }
  const ast = itemAst(item, contents[item.songSlug]);
  return ast ? resolve(ast.sections, item.structureOverride) : [];
}
