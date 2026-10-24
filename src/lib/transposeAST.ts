import { keyLike, spellingKey, transposeLabel } from "@/lib/transpose";
import type { ChordProAST, ChordProSection, Token } from "@/types/chordPro";

function transposeTokens(tokens: Token[], semitones: number, targetKey: string): Token[] {
  return tokens.map((t) =>
    t.type === "chord"
      ? // `transposeLabel`, pas `transposeChord` : une alternative `[D (Bm)]` (01)
        // se transpose en entier — le second accord restait dans l'ancienne tonalité.
        { ...t, value: transposeLabel(t.value, semitones, targetKey) }
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
  // Une tonalité majeure demandée pour un chant mineur (keyOverride d'une setlist : C sur un chant en Am) se lit
  // comme son relatif mineur, comme le fait semitonesTo : la page, le mode Louange et le PDF affichent « Am ».
  targetKey = keyLike(ast.metadata.key, targetKey);
  if (semitones === 0) {
    // Même hauteur, autre orthographe choisie (Ab pour un chant en G#) : on
    // ré-épelle les accords vers la tonalité cible (+12 = même hauteur).
    if (spellingKey(targetKey) === spellingKey(ast.metadata.key)) return ast;
    semitones = 12;
  }

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
