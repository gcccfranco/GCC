import { transposeChord } from "@/lib/transpose";
import type { ChordProAST, ChordProSection, Token } from "@/types/chordPro";

function transposeTokens(tokens: Token[], semitones: number, targetKey: string): Token[] {
  return tokens.map((t) =>
    t.type === "chord"
      ? { ...t, value: transposeChord(t.value, semitones, targetKey) }
      : t
  );
}

/** Retourne une copie de la section avec tous ses accords transposés
 *  (modulation par section — sectionKeys d'un item de setlist). */
export function transposeSection<T extends ChordProSection>(
  section: T,
  semitones: number,
  targetKey: string
): T {
  if (semitones === 0) return section;
  return {
    ...section,
    lines: section.lines.map((line) => ({
      ...line,
      tokens: transposeTokens(line.tokens, semitones, targetKey),
    })),
  };
}

/**
 * Return a new AST with all chord tokens transposed.
 * The metadata.key is updated to reflect the new key.
 */
export function transposeAST(ast: ChordProAST, semitones: number, targetKey: string): ChordProAST {
  if (semitones === 0) return ast;

  return {
    metadata: { ...ast.metadata, key: targetKey },
    sections: ast.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        tokens: transposeTokens(line.tokens, semitones, targetKey),
      })),
    })),
  };
}
