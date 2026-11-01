import { Text, View } from "@react-pdf/renderer";
import type { ChordProSection } from "@/types/chordPro";
import { semitonesTo } from "@/lib/transpose";
import { transposeSection } from "@/lib/transposeAST";
import type { SectionNuance } from "@/types/setList";
import { nuanceLabel } from "@/lib/setlist/nuances";
import { nuancePdfColors, sectionPdfPalette } from "@/lib/pdf/colors";
import { compactPlan, stripGroups } from "@/lib/pdf/compact";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { StructureStripPDF, estimateStripHeight } from "@/components/pdf/StructureStripPDF";
import { type Theme, type PdfSectionStyle, INK, C, type BoxStyle, SECTION_BOX, sectionName, FrLine, ZhLine, JianpuLine } from "@/components/pdf/song/lignes";

// ─── Section ──────────────────────────────────────────────────────────────────

export function TransitionPDFBlock({ text, marginTop = -4 }: { text: string; marginTop?: number }) {
  const hasCJK = /[一-鿿㐀-䶿]/.test(text);
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "flex-start",
      marginTop,
      marginBottom: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      backgroundColor: "#fffbeb",
      borderWidth: 0.5,
      borderColor: "#f59e0b",
      borderStyle: "dashed",
      borderRadius: 4,
    }}>
      <Text style={{ fontSize: 8.5, color: C.lyric, fontFamily: hasCJK ? "SourceHanSansCN" : "SpaceGrotesk", fontWeight: 300 }}>
        {"→ "}{text}
      </Text>
    </View>
  );
}

export function SectionBlock({ section, isZh, useJianpu, showChords, showPinyin, note, nuance, keyChange, theme, uiLang, sourceLabel, sourceLabelFont, sectionStyle = "classic" }: {
  section: ChordProSection;
  isZh: boolean;
  useJianpu: boolean;
  showChords: boolean;
  showPinyin: boolean;
  note?: string;
  nuance?: SectionNuance;
  /** Modulation (升调) : tonalité cible affichée à côté du label. */
  keyChange?: string;
  theme: Theme;
  uiLang: string;
  sourceLabel?: string;
  sourceLabelFont?: string;
  sectionStyle?: PdfSectionStyle;
}) {
  const labelFont = isZh && uiLang === "zh-CN" ? "SourceHanSansCN" : "SpaceGrotesk";
  const label = sectionName(section, uiLang).toUpperCase();
  const boxType: BoxStyle = SECTION_BOX[section.type] ?? "none";
  const colors = sectionStyle === "colors";
  const labelColor = colors ? sectionPdfPalette(section.type).color : theme.accent;
  const lineTheme: Theme = colors ? { ...theme, accent: INK, jianpu: INK } : theme;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxView: any = colors
    ? {
        borderWidth: 1, borderColor: labelColor, borderRadius: 8,
        paddingTop: 8, paddingBottom: 9, paddingHorizontal: 12,
        marginBottom: 8,
      }
    : boxType === "filled"
    ? {
        borderTopWidth: 0.5,   borderTopColor: theme.boxBorder,
        borderRightWidth: 0.5, borderRightColor: theme.boxBorder,
        borderBottomWidth: 0.5,borderBottomColor: theme.boxBorder,
        borderLeftWidth: 3,    borderLeftColor: theme.accent,
        borderRadius: 6,
        backgroundColor: theme.boxFill,
        padding: 10,
        paddingLeft: 12,
        marginBottom: 10,
      }
    : boxType === "outline"
      ? {
          borderTopWidth: 0.5,   borderTopColor: theme.accent,
          borderRightWidth: 0.5, borderRightColor: theme.accent,
          borderBottomWidth: 0.5,borderBottomColor: theme.accent,
          borderLeftWidth: 3,    borderLeftColor: theme.accent,
          borderRadius: 6,
          padding: 10,
          paddingLeft: 12,
          marginBottom: 10,
        }
      : boxType === "leftbar"
        ? {
            borderLeftWidth: 3, borderLeftColor: theme.accent,
            paddingLeft: 12,
            marginBottom: 10,
          }
        : { marginBottom: 9 };

  return (
    <View style={boxView} wrap={false}>
      {/* Section label row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                     marginBottom: 5 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View style={{ width: 11, height: 1.5, backgroundColor: labelColor }} />
          <Text style={{ fontSize: 7.5, fontWeight: 700, color: labelColor, fontFamily: labelFont,
                         letterSpacing: 1.4 }}>
            {label}
          </Text>
          {keyChange ? (
            <Text style={{ fontSize: 8, fontWeight: 700, color: labelColor,
                           fontFamily: uiLang === "zh-CN" ? "SourceHanSansCN" : "SpaceGrotesk" }}>
              {uiLang === "zh-CN" ? `升调（${keyChange}）` : `Modulation (${keyChange})`}
            </Text>
          ) : null}
          {sourceLabel ? (
            <Text style={{ fontSize: 7.5, color: C.subtitle, fontFamily: sourceLabelFont ?? "SpaceGrotesk",
                           fontWeight: 300 }}>
              {sourceLabel}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {/* Nuancier gris de l'écran : fond du clair au foncé selon l'intensité,
              indications en contour (docs/spec-export-pdf.md, Q2). */}
          {nuance?.tags.map((id) => {
            const c = nuancePdfColors(id);
            return (
              <Text
                key={id}
                style={{ fontSize: 7.5, color: c.color, fontFamily: "LiberationSans", fontWeight: 700,
                         borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1,
                         ...("background" in c
                           ? { backgroundColor: c.background }
                           : { borderWidth: 0.5, borderColor: c.border }) }}
              >
                {nuanceLabel(id)}
              </Text>
            );
          })}
          {nuance?.note ? (
            <Text style={{ fontSize: 8, color: "#57534e", fontFamily: labelFont, fontWeight: 400 }}>
              {nuance.note}
            </Text>
          ) : null}
          {note ? (
            <Text style={{ fontSize: 8.5, color: C.subtitle, fontFamily: labelFont, fontWeight: 300 }}>
              {note}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Lines */}
      <View>
        {section.lines.map((line, li) => {
          if (line.tokens.length === 0 && !line.jianpu) {
            return <View key={li} style={{ height: 5 }} />;
          }
          if (isZh && useJianpu) {
            return (
              <JianpuLine key={li} tokens={line.tokens} jianpu={line.jianpu} pinyin={line.pinyin}
                          showChords={showChords} showPinyin={showPinyin} theme={lineTheme} />
            );
          }
          if (isZh) {
            return (
              <ZhLine key={li} tokens={line.tokens} pinyin={line.pinyin}
                      showChords={showChords} showPinyin={showPinyin} theme={lineTheme} />
            );
          }
          return <FrLine key={li} tokens={line.tokens} showChords={showChords} theme={lineTheme} />;
        })}
      </View>
    </View>
  );
}

// ─── ORDRE line ───────────────────────────────────────────────────────────────

export function OrdreLine({ sections, theme, uiLang, isZh }: {
  sections: ChordProSection[];
  theme: Theme;
  uiLang: string;
  isZh: boolean;
}) {
  const labelFont = isZh && uiLang === "zh-CN" ? "SourceHanSansCN" : "SpaceGrotesk";
  const names = sections.map(s => sectionName(s, uiLang));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline",
                   marginBottom: 12, marginTop: 2 }}>
      <Text style={{ fontSize: 7.5, fontWeight: 700, color: theme.accent, fontFamily: "SpaceGrotesk",
                     letterSpacing: 1, marginRight: 7, paddingHorizontal: 2 }}>
        ORDRE
      </Text>
      {names.map((name, i) => (
        <Text key={i} style={{ fontSize: 8.5, color: C.subtitle, fontFamily: labelFont, fontWeight: 300 }}>
          {i > 0 ? " · " : ""}{name}
        </Text>
      ))}
    </View>
  );
}

// ─── Compact : bandeau + sections uniques ────────────────────────────────────

/** Bandeau du compact : étapes repliées (« ×2 ») avec les libellés de la
 *  langue de l'interface, comme à l'écran. */
export function CompactStrip({ steps, songKey, uiLang, details }: {
  steps: SectionOccurrence[];
  songKey?: string;
  uiLang: string;
  details: boolean;
}) {
  return (
    <StructureStripPDF
      groups={stripGroups(steps, (section) => sectionName(section, uiLang))}
      songKey={songKey}
      details={details}
    />
  );
}

/** Hauteur à réserver au bandeau au-dessus d'un scan 简谱. */
export function compactStripHeight(steps: SectionOccurrence[], uiLang: string): number {
  return estimateStripHeight(stripGroups(steps, (section) => sectionName(section, uiLang)), true);
}

export function CompactBody({ sections, item, songKey, isZh, useJianpu, showChords, showPinyin, theme, uiLang, sectionStyle }: {
  sections: ChordProSection[];
  item: Parameters<typeof compactPlan>[1];
  songKey?: string;
  isZh: boolean;
  useJianpu: boolean;
  showChords: boolean;
  showPinyin: boolean;
  theme: Theme;
  uiLang: string;
  sectionStyle: PdfSectionStyle;
}) {
  const { steps, prints } = compactPlan(sections, item, songKey);
  return (
    <>
      <CompactStrip steps={steps} songKey={songKey} uiLang={uiLang} details />
      {/* Chaque section une fois : notes, nuances et transitions d'occurrence
          sont dans le bandeau, pas dans le corps. */}
      {prints.map(({ step }, i) => {
        const keyChange = step.targetKey && step.targetKey !== songKey ? step.targetKey : undefined;
        const shownSection = keyChange && songKey
          ? transposeSection(step.section, semitonesTo(songKey, keyChange), keyChange)
          : step.section;
        return (
          <SectionBlock
            key={`${step.section.uid ?? step.section.id}-${i}`}
            section={shownSection}
            isZh={isZh}
            useJianpu={useJianpu}
            showChords={showChords}
            showPinyin={showPinyin}
            keyChange={keyChange}
            theme={theme}
            uiLang={uiLang}
            sectionStyle={sectionStyle}
          />
        );
      })}
    </>
  );
}

