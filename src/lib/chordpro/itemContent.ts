import { parseChordPro } from "@/lib/chordpro/parser";
import type { ChordProAST } from "@/types/chordPro";

/** AST à afficher pour un item de setlist : la version modifiée pour cette
 *  setlist (contentOverride) si elle existe, sinon le chant original. */
export function itemAst(
  item: { contentOverride?: string | null },
  content: { ast: ChordProAST } | undefined
): ChordProAST | undefined {
  if (item.contentOverride) return parseChordPro(item.contentOverride);
  return content?.ast;
}
