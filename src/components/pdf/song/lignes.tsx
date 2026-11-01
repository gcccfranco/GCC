import { Text, View } from "@react-pdf/renderer";
import type { ChordProSection, Token } from "@/types/chordPro";
import { formatSectionName } from "@/lib/chordpro/parser";
import { toSegments } from "@/lib/chordpro/segments";
import { isCJK } from "@/lib/cjk";
import frTranslations from "@/locales/fr.json";
import zhTranslations from "@/locales/zh-CN.json";
import { measureLyric, measureChord } from "@/lib/chordpro/measureText";

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = {
  accent: string;
  boxFill: string;
  boxBorder: string;
  /** Chiffres 简谱 (par défaut C.jianpu). */
  jianpu?: string;
};

/** Classique : une couleur par langue. Couleurs par section : cadre fin à la
 *  couleur du type de section, accords et 简谱 en noir, comme l'écran
 *  (SongView, getChartSectionStyle — docs/spec-export-pdf.md). */
export type PdfSectionStyle = "classic" | "colors";

// Encre des accords et du 简谱 en couleurs par section (--foreground clair).
export const INK = "#1c1c1e";

export const BLUE_THEME: Theme = {
  accent:    "#3f63cf",
  boxFill:   "#e2e7f7",
  boxBorder: "#c5cee8",
};

export const RED_THEME: Theme = {
  accent:    "#b3261d",
  boxFill:   "#fbeae9",
  boxBorder: "#e5c4c2",
};

// ─── Shared color palette ─────────────────────────────────────────────────────

export const C = {
  title:    "#1f3540",
  subtitle: "#5b6b73",
  lyric:    "#222b30",
  jianpu:   "#b3261d",
  footer:   "#8a9aa5",
  rule:     "#d0d8dd",
} as const;

// ─── Shared sizes ─────────────────────────────────────────────────────────────

export const CHORD_SIZE   = 13;    // ≈17px on screen (user spec)
export const CHORD_Q_SIZE = 10;    // quality suffix (m, sus4, /F#…)
export const LYRIC_FR     = 11;    // ≈15px
export const LYRIC_ZH     = 11;    // ≈15px on screen (user spec)
export const PINYIN_SIZE  = 8;
export const JIANPU_SIZE  = 11;
export const CHORD_H      = 16;    // reserved height for chord row

export const PAGE_CONTENT_W = 495; // A4 - 2×50pt margins

// ─── Section box type ─────────────────────────────────────────────────────────

export type BoxStyle = "filled" | "outline" | "leftbar" | "none";

export const SECTION_BOX: Record<string, BoxStyle> = {
  chorus:       "filled",
  prechorus:    "leftbar",
  postchorus:   "filled",
  intro:        "none",
  final:        "filled",
  coda:         "filled",
  bridge:       "outline",
  verse:        "none",
  outro:        "none",
  other:        "none",
  instrumental: "none",
  interlude:    "none",
  tag:          "none",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Split a chord into root note + quality suffix for sized rendering.
 *  Slash chords (e.g. Bb/C) keep both sides at the same size. */
export function chordParts(chord: string): [string, string] {
  if (chord.includes("/")) return [chord, ""];
  const m = chord.match(/^([A-G][b#]?)(.*)$/);
  if (!m) return [chord, ""];
  return [m[1], m[2]];
}

/** Largeur rendue (pt) d'un accord : racine @CHORD_SIZE + qualité @CHORD_Q_SIZE,
 *  exactement comme <ChordLabel> le dessine. */
export function chordWidthPt(chord: string): number {
  const [root, qual] = chordParts(chord);
  return measureChord(root, CHORD_SIZE) + measureChord(qual, CHORD_Q_SIZE);
}

// Écart minimal après un accord (≈ le padding-right 0.5em du rendu web) pour que
// deux accords successifs ne se touchent jamais.
export const CHORD_GAP = measureChord(" ", CHORD_SIZE);

/** LiberationSans (footers) n'a pas de glyphes CJK → police CJK si le libellé en contient. */
export function footerLabelFont(label: string): string {
  return /[一-鿿㐀-䶿]/.test(label) ? "SourceHanSansCN" : "LiberationSans";
}

export function sectionName(section: ChordProSection, uiLang: string): string {
  return formatSectionName(section, uiLang === "zh-CN" ? zhTranslations : frTranslations);
}

// ─── Chord label (root + smaller quality) ────────────────────────────────────
// Uses View (not Text) for the container so Yoga respects the fixed height.
// minHeight on <Text> is ignored by react-pdf's text engine — only View height works.

export function ChordLabel({ chord, theme }: { chord: string; theme: Theme }) {
  const [root, qual] = chordParts(chord);
  return (
    <View style={{ height: CHORD_H, flexDirection: "row", alignItems: "flex-end" }}>
      <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, color: theme.accent,
                     fontSize: CHORD_SIZE, lineHeight: 1 }}>
        {root}
      </Text>
      
      <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, color: theme.accent,
                      fontSize: CHORD_Q_SIZE, lineHeight: 1 }}>
        {qual ? qual : '\u00A0'}
      </Text>
      
    </View>
  );
}



// ─── French line ──────────────────────────────────────────────────────────────
// Uses explicit line-breaking (no flexWrap) to avoid Yoga's misalignment bug
// with wrapped flex items. Each visual line renders two flat rows: chord + lyric.

export function FrLine({ tokens, showChords, theme }: {
  tokens: Token[];
  showChords: boolean;
  theme: Theme;
}) {
  const segs = toSegments(tokens);
  const allEmpty = segs.every(s => !s.lyric?.trim() && !s.chord);
  if (allEmpty) return <View style={{ height: 2 }} />;

  // Largeur de cellule = max(largeur accord, largeur parole), MESURÉES (mêmes
  // métriques que le rendu réel) — plus de devinette nbChars × constante.
  const cellWidths = segs.map(seg => {
    const cw = showChords && seg.chord ? chordWidthPt(seg.chord) + CHORD_GAP : 0;
    const lw = measureLyric(seg.lyric, LYRIC_FR);
    return Math.max(cw, lw, 4);
  });

  // Split segments into visual lines so nothing overflows the page
  const visualLines: number[][] = [];
  let lineSegs: number[] = [];
  let lineW = 0;
  for (let i = 0; i < segs.length; i++) {
    if (lineW + cellWidths[i] > PAGE_CONTENT_W && lineSegs.length > 0) {
      visualLines.push(lineSegs);
      lineSegs = [i];
      lineW = cellWidths[i];
    } else {
      lineSegs.push(i);
      lineW += cellWidths[i];
    }
  }
  if (lineSegs.length) visualLines.push(lineSegs);
  return (
    <View style={{ marginBottom: 1 }}>
      {visualLines.map((indices, li) => {
        const lineHasChord = showChords && indices.some(i => segs[i].chord !== null);
        return (
          // <View key={li} style={{ marginBottom: li < visualLines.length - 1 ? 3 : 0 }}>
          <View key={li}>
            {/* Chord row — only when this visual line has at least one chord */}
            {lineHasChord && showChords && (
              <View style={{ flexDirection: "row"}}>
                {indices.map(i => (
                  <View key={i} style={showChords?{ minWidth: cellWidths[i] }:{}}>
                    {segs[i].chord
                      ? <ChordLabel chord={segs[i].chord!} theme={theme} />
                      : <View style={{ height: CHORD_H }}>
                        </View>}
                  </View>
                ))}
              </View>
            )}
            {/* Lyric row */}
            <View style={{ flexDirection: "row", alignItems: "flex-start"}}>
              {indices.map(i => {
                const lyric = (showChords ? segs[i].lyric : segs[i].lyric?.trimStart()) || "\u00A0";
                return (
                  <View key={i} style={showChords?{ minWidth: cellWidths[i]}:{}}>
                    <Text style={{ fontSize: LYRIC_FR, color: C.lyric, fontFamily: "Inter", fontWeight: 400, lineHeight: 1.25 }}>
                      {lyric}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Chinese line (chord / char / pinyin) ────────────────────────────────────

export function ZhLine({ tokens, pinyin, showChords, showPinyin, theme }: {
  tokens: Token[];
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
  theme: Theme;
}) {
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let pIdx = 0;

  type Col = { char: string; chord: string | null; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...(showChords ? seg.lyric : (seg.lyric?.trimStart() ?? ""))];
    if (chars.length === 0) {
      if (seg.chord && showChords) cols.push({ char: " ", chord: seg.chord, py: "" });
    } else {
      chars.forEach((ch, ci) => {
        cols.push({ char: ch, chord: ci === 0 ? seg.chord : null, py: isCJK(ch) ? (pyWords[pIdx++] ?? "") : "" });
      });
    }
  }

  // Largeur de cellule. Pour une colonne SANS caractère chinois (accord seul, p.ex.
  // suite « F#dim9 Dm7 Dm7(b5)/G »), on reproduit la réserve aérée du web
  // ((longueur·0.75 + 1)em ; ZH_CHORD_EM calé sur CJK 1.6em ↔ 16pt) pour ne pas
  // tasser les accords. Sous un caractère chinois : plancher 16, on s'élargit à
  // l'accord mesuré s'il est plus large.
  const ZH_CHORD_EM = 10;
  const cellWidth = (chord: string | null, charIsCJK: boolean): number => {
    const measured = chord ? chordWidthPt(chord) + CHORD_GAP : 0;
    const fromChord = !charIsCJK && chord
      ? Math.max((chord.length * 0.75 + 1) * ZH_CHORD_EM, measured)
      : measured;
    const fromChar = charIsCJK ? 16 : 8;
    return Math.max(fromChar, fromChord, 16);
  };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2 }}>
      {cols.map((col, i) => (
        
        <View key={i} style={{ minWidth: cellWidth(col.chord, isCJK(col.char)), flexDirection: "column", alignItems: "center" }}>
          <ChordSmall chord={showChords ? col.chord : null} theme={theme} />
          <Text style={{ fontSize: LYRIC_ZH, color: C.lyric, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
            {col.char}
          </Text>
          {showPinyin && (
            <Text style={{ fontSize: PINYIN_SIZE, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
              {col.py || " "}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Compact chord label for Chinese cell headers (smaller font). */
export function ChordSmall({ chord, theme }: { chord: string | null; theme: Theme }) {
  if (!chord) return <View style={{ height: 16 }} />;
  const [root, qual] = chordParts(chord);
  return (
    <View style={{ height: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>
      <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, color: theme.accent,
                     fontSize: 13, lineHeight: 1 }}>
        {root}
      </Text>
      {qual ? (
        <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, color: theme.accent,
                       fontSize: 10, lineHeight: 1 }}>
          {qual}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Jianpu line (chord / number / char / pinyin) ────────────────────────────

export const JP_CELL = 17;

export function JianpuLine({ tokens, jianpu, pinyin, showChords, showPinyin, theme }: {
  tokens: Token[];
  jianpu: string | null;
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
  theme: Theme;
}) {
  const jpNums = jianpu?.split(/\s+/).filter(Boolean) ?? [];
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let jIdx = 0, pIdx = 0;

  type Col = { char: string; chord: string | null; num: string; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...seg.lyric];
    if (chars.length === 0) {
      cols.push({ char: " ", chord: seg.chord, num: "", py: "" });
    } else {
      chars.forEach((ch, ci) => {
        const cjk = isCJK(ch);
        cols.push({ char: ch, chord: ci === 0 ? seg.chord : null,
                    num: cjk ? (jpNums[jIdx++] ?? "") : "",
                    py: cjk ? (pyWords[pIdx++] ?? "") : "" });
      });
    }
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end", marginBottom: 2 }}>
      {cols.map((col, i) => (
        <View key={i} style={{ width: JP_CELL, flexDirection: "column", alignItems: "center" }}>
          {showChords && <ChordSmall chord={col.chord} theme={theme} />}
          <Text style={{ fontSize: JIANPU_SIZE, color: theme.jianpu ?? C.jianpu, fontFamily: "SpaceGrotesk",
                         fontWeight: 300, textAlign: "center", minHeight: 14 }}>
            {col.num}
          </Text>
          <Text style={{ fontSize: 12, color: C.lyric, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
            {col.char}
          </Text>
          {showPinyin && (
            <Text style={{ fontSize: PINYIN_SIZE, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300, textAlign: "center" }}>
              {col.py || " "}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

