// Édition d'un source ChordPro ligne par ligne (mode « adapter le chant » des
// setlists). Modèle : une ligne = texte de paroles + ancres d'accords (offset
// en caractères dans le texte). La sérialisation réinsère les [accords] aux
// offsets, et ré-accroche le pinyin (zh) derrière 3 espaces.
import { parseLyricLine } from "@/lib/chordpro/parser";

export type ChordAnchor = { offset: number; chord: string };

export type EditableLine = {
  /** Paroles sans les accords (partie caractères seule pour le chinois). */
  text: string;
  /** Accords triés par offset croissant dans `text`. */
  anchors: ChordAnchor[];
  /** Pinyin (zh) — sérialisé derrière 3 espaces sur la même ligne. */
  pinyin: string | null;
};

// ─── Ligne brute ↔ modèle éditable ───────────────────────────────────────────

export function parseEditableLine(raw: string, language: string): EditableLine {
  const { tokens, pinyin } = parseLyricLine(raw.trim(), language);
  let text = "";
  const anchors: ChordAnchor[] = [];
  for (const tok of tokens) {
    if (tok.type === "chord") anchors.push({ offset: text.length, chord: tok.value });
    else text += tok.value;
  }
  return { text, anchors, pinyin };
}

export function serializeEditableLine(line: EditableLine): string {
  let out = line.text;
  // Insertion en partant de la fin pour ne pas décaler les offsets suivants ;
  // tri croissant STABLE puis parcours inversé, pour que deux accords au même
  // offset (ex. `[D][ ]` en chinois) gardent leur ordre d'origine.
  const asc = [...line.anchors].sort((x, y) => x.offset - y.offset);
  for (let i = asc.length - 1; i >= 0; i--) {
    const a = asc[i];
    const at = Math.min(Math.max(a.offset, 0), out.length);
    out = out.slice(0, at) + `[${a.chord}]` + out.slice(at);
  }
  if (line.pinyin) out = `${out.trimEnd()}   ${line.pinyin}`;
  return out;
}

// ─── Opérations sur les accords ───────────────────────────────────────────────

function sorted(anchors: ChordAnchor[]): ChordAnchor[] {
  return [...anchors].sort((a, b) => a.offset - b.offset);
}

export function addChord(line: EditableLine, offset: number, chord: string): EditableLine {
  const at = Math.min(Math.max(offset, 0), line.text.length);
  return { ...line, anchors: sorted([...line.anchors, { offset: at, chord }]) };
}

export function replaceChord(line: EditableLine, index: number, chord: string): EditableLine {
  return { ...line, anchors: line.anchors.map((a, i) => (i === index ? { ...a, chord } : a)) };
}

export function removeChord(line: EditableLine, index: number): EditableLine {
  return { ...line, anchors: line.anchors.filter((_, i) => i !== index) };
}

/** Décale un accord de `delta` caractères (boutons ◀ ▶ de la sheet).
 *  Renvoie aussi le nouvel index de l'ancre déplacée : le tri peut la faire
 *  changer de place quand elle croise un autre accord. */
export function moveChord(
  line: EditableLine,
  index: number,
  delta: number
): { line: EditableLine; index: number } {
  const moved = line.anchors.map((a, i) =>
    i === index
      ? { ...a, offset: Math.min(Math.max(a.offset + delta, 0), line.text.length) }
      : a
  );
  const target = moved[index];
  const anchors = sorted(moved);
  return { line: { ...line, anchors }, index: anchors.indexOf(target) };
}

// ─── Édition des paroles avec ré-ancrage des accords ─────────────────────────

function wordRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ranges.push({ start: m.index, end: m.index + m[0].length });
  return ranges;
}

/** Alignement LCS entre deux listes de mots : map index ancien → index nouveau
 *  pour les mots inchangés. Les lignes de chant sont courtes (< 20 mots), le
 *  DP quadratique est négligeable. */
function lcsWordMap(oldWords: string[], newWords: string[]): Map<number, number> {
  const n = oldWords.length;
  const m = newWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        oldWords[i] === newWords[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const map = new Map<number, number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldWords[i] === newWords[j]) {
      map.set(i, j);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return map;
}

/** Remplace les paroles en ré-ancrant les accords : par alignement des mots
 *  inchangés (fr — ajouter/supprimer un mot ne décale pas les accords des
 *  autres mots), par index de caractère borné (zh, pas d'espaces). */
export function setLyrics(line: EditableLine, newText: string, language: string): EditableLine {
  if (language === "zh") {
    const anchors = line.anchors.map((a) => ({
      ...a,
      offset: Math.min(a.offset, newText.length),
    }));
    return { ...line, text: newText, anchors: sorted(anchors) };
  }

  const oldWords = wordRanges(line.text);
  const newWords = wordRanges(newText);
  if (newWords.length === 0) return { ...line, text: newText, anchors: [] };

  const map = lcsWordMap(
    oldWords.map((w) => line.text.slice(w.start, w.end)),
    newWords.map((w) => newText.slice(w.start, w.end))
  );

  /** Index du nouveau mot porteur pour un ancien index : le mot aligné s'il a
   *  survécu, sinon extrapolation depuis le mot aligné le plus proche. */
  const targetWord = (wi: number): number => {
    const direct = map.get(wi);
    if (direct !== undefined) return direct;
    for (let d = 1; d < oldWords.length; d++) {
      const before = map.get(wi - d);
      if (before !== undefined) return Math.min(before + d, newWords.length - 1);
      const after = map.get(wi + d);
      if (after !== undefined) return Math.max(after - d, 0);
    }
    return Math.min(wi, newWords.length - 1);
  };

  const anchors = line.anchors.map((a) => {
    // Mot porteur : celui qui contient l'offset, sinon le mot suivant.
    let wi = oldWords.findIndex((w) => a.offset < w.end);
    if (wi === -1) wi = oldWords.length - 1;
    const inWord = Math.max(0, a.offset - (oldWords[wi]?.start ?? 0));
    const nw = newWords[targetWord(wi)];
    return { ...a, offset: nw.start + Math.min(inWord, nw.end - nw.start) };
  });
  return { ...line, text: newText, anchors: sorted(anchors) };
}

// ─── Lignes instrumentales ────────────────────────────────────────────────────
// Format : `(annotation) [C] [G] [Am]` — l'annotation entre parenthèses est du
// texte ordinaire, les accords sont séparés par une espace chacun.

export function isInstrumentalLine(line: EditableLine): boolean {
  return line.anchors.length > 0 && /^\s*(\([^)]*\)\s*)?$/.test(line.text);
}

export function instrumentalParts(line: EditableLine): { annotation: string; chords: string[] } {
  const annotation = line.text.match(/\(([^)]*)\)/)?.[1] ?? "";
  return { annotation, chords: line.anchors.map((a) => a.chord) };
}

export function makeInstrumentalLine(annotation: string, chords: string[]): EditableLine {
  const prefix = annotation.trim() ? `(${annotation.trim()}) ` : "";
  const anchors = chords.map((chord, i) => ({ offset: prefix.length + i, chord }));
  return { text: prefix + " ".repeat(chords.length), anchors, pinyin: null };
}

// ─── Opérations sur le source complet ────────────────────────────────────────

export function replaceSourceLine(source: string, index: number, raw: string): string {
  const lines = source.split("\n");
  lines[index] = raw;
  return lines.join("\n");
}

export function insertSourceLineAfter(source: string, index: number, raw: string): string {
  const lines = source.split("\n");
  lines.splice(index + 1, 0, raw);
  return lines.join("\n");
}

/** Supprime plusieurs lignes (indices dans le source d'origine). */
export function deleteSourceLines(source: string, indices: number[]): string {
  const toDelete = new Set(indices);
  return source
    .split("\n")
    .filter((_, i) => !toDelete.has(i))
    .join("\n");
}

/** Duplique à la fin du source le bloc `{start_of_X…}` … `{end_of_X}` de la
 *  section `sectionId` (format `<type>-<n>`, n = rang du start_of_ dans le
 *  source — même convention que le parseur). Mode Adapter : quand une section
 *  est répétée par la structure d'une setlist, l'occurrence éditée doit
 *  devenir sa propre copie au lieu de modifier toutes les répétitions.
 *  Les lignes de la copie sont aux index d'origine + `lineOffset`. */
export function materializeSectionCopy(
  source: string,
  sectionId: string
): { source: string; newSectionId: string; lineOffset: number } | null {
  const m = sectionId.match(/-(\d+)$/);
  if (!m) return null;
  const counter = parseInt(m[1], 10);
  const lines = source.split("\n");
  let total = 0;
  let typeKey = "";
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const start = t.match(/^\{start_of_([a-z0-9_]+)\s*(?::[^}]*)?\}$/i);
    if (start) {
      total++;
      if (total === counter) {
        startIdx = i;
        typeKey = start[1];
      }
      continue;
    }
    if (startIdx !== -1 && endIdx === -1 && /^\{end_of_/i.test(t)) endIdx = i;
  }
  if (startIdx === -1) return null;
  if (endIdx === -1) endIdx = lines.length - 1;
  const block = lines.slice(startIdx, endIdx + 1);
  return {
    source: [...lines, "", ...block].join("\n"),
    newSectionId: `${typeKey}-${total + 1}`,
    lineOffset: lines.length + 1 - startIdx,
  };
}
