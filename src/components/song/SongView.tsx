"use client";
import localFont from "next/font/local";
import { ChordLine } from "@/components/song/ChordLine";
import { JianpuLine } from "@/components/song/JianpuLine";
import type { ChordProAST, ChordProLine, ChordProSection, Token } from "@/types/chordPro";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import { handleLyricsCopy } from "@/components/song/copyLyrics";
import { MessageSquare } from "lucide-react";
import type { SectionNuance } from "@/types/setList";
import { nuanceLabel, nuanceFull } from "@/lib/setlist/nuances";

// ---------------------------------------------------------------------------
// Thèmes et styles de sections
// ---------------------------------------------------------------------------
type Seg = { chord: string | null; lyric: string };

const LANG_THEME = {
  fr: {
    accent: "var(--fr-accent)",
    boxFill: "var(--fr-box-fill)",
    boxBorder: "var(--fr-box-border)",
  },
  zh: {
    accent: "var(--zh-accent)",
    boxFill: "var(--zh-box-fill)",
    boxBorder: "var(--zh-box-border)",
  },
} as const;

const FILLED_BOX = new Set(["chorus", "final", "coda"]);
const OUTLINE_BOX = new Set(["bridge"]);
// Pré-refrain : barre d'accent à gauche seule (pas de cadre), pour le distinguer du pont.
const LEFT_BAR = new Set(["prechorus"]);

// Style « chart » (option du Mode Louange) : la couleur suit le TYPE de section
// (palette --sec-* de globals.css) et non la langue du chant.
const CHART_TYPE_COLOR: Record<string, string> = {
  intro: "var(--sec-intro)",
  verse: "var(--sec-verse)",
  prechorus: "var(--sec-prechorus)",
  chorus: "var(--sec-chorus)",
  final: "var(--sec-chorus)",
  bridge: "var(--sec-bridge)",
  outro: "var(--sec-outro)",
  coda: "var(--sec-coda)",
};

function getChartSectionStyle(type: string): React.CSSProperties {
  return {
    "--sec-c": CHART_TYPE_COLOR[type] ?? "var(--sec-other)",
    // Accords neutres : surcharge des variables héritées par ChordLine (FR) et ZhLine (ZH).
    "--chord-color": "hsl(var(--foreground))",
    "--jianpu-color": "hsl(var(--foreground))",
    border: "1px solid var(--sec-c)",
    borderRadius: 10,
    padding: "10px 16px 12px",
    marginBottom: 10,
  } as React.CSSProperties;
}

// Polices CJK volumineuses (KaiTi ~11 Mo, Han-source ~8 Mo) : preload désactivé
// pour ne pas les précharger sur toute page rendant une partition (y compris
// les chants FR). Elles se chargent à la demande quand un chant zh s'affiche.
const KaiTiFont = localFont({
  src: [{ path: "../../../public/fonts/KaiTi.ttf", weight: "400", style: "normal" }],
  preload: false,
});
const fr_lyric_font = localFont({ src: "../../../public/fonts/inter-latin-ext-400-normal.ttf" });
const zh_lyric_font = localFont({ src: "../../../public/fonts/Han-source.otf", preload: false });
const chord_font = localFont({
  src: [
    { path: "../../../public/fonts/SpaceGrotesk-Light.ttf", weight: "300" },
    { path: "../../../public/fonts/SpaceGrotesk-Bold.ttf",  weight: "700" },
  ],
});
// Police des accords des PDF exportés (typographie « pdf » du Mode Louange)
const liberation_font = localFont({
  src: [
    { path: "../../../public/fonts/LiberationSans-Regular.ttf", weight: "400" },
    { path: "../../../public/fonts/LiberationSans-Bold.ttf", weight: "700" },
  ],
});


function getSectionStyle(type: string, isZh: boolean): React.CSSProperties {
  const { accent, boxFill, boxBorder } = LANG_THEME[isZh ? "zh" : "fr"];

  const base: React.CSSProperties = {
    "--sec-c": accent,
    borderRadius: "0 8px 8px 0",
    padding: "10px 16px 12px",
    marginLeft: "-2px",
    marginBottom: "10px",
  } as React.CSSProperties;

  if (FILLED_BOX.has(type)) {
    return {
      ...base,
      background: boxFill,
      borderTop: `0.5px solid ${boxBorder}`,
      borderRight: `0.5px solid ${boxBorder}`,
      borderBottom: `0.5px solid ${boxBorder}`,
      borderLeft: `3px solid ${accent}`,
    };
  }

  if (OUTLINE_BOX.has(type)) {
    return {
      ...base,
      borderTop: `0.5px solid ${accent}`,
      borderRight: `0.5px solid ${accent}`,
      borderBottom: `0.5px solid ${accent}`,
      borderLeft: `3px solid ${accent}`,
    };
  }

  if (LEFT_BAR.has(type)) {
    return { ...base, borderRadius: 0, borderLeft: `3px solid ${accent}` };
  }

  // Pas de boîte pour les sections plain (verse, etc.)
  return { "--sec-c": accent } as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Rendu colonne par colonne pour le chinois
// ---------------------------------------------------------------------------

function isCJK(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);
}

interface ZhLineProps {
  tokens: Token[];
  pinyin: string | null;
  showChords: boolean;
  showPinyin: boolean;
  /** Masque caractères + pinyin tout en gardant la largeur (accords positionnés). */
  hideLyrics?: boolean;
  chord_font: ReturnType<typeof localFont>;
  zh_lyric_font: ReturnType<typeof localFont>;
  typography?: "web" | "pdf";
}

function toSegments(tokens: Token[]): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "chord") {
      const chord = tok.value;
      let lyric = "";
      i++;
      while (i < tokens.length && tokens[i].type === "lyric") {
        lyric += tokens[i].value;
        i++;
      }
      const sp = lyric.search(/\s/);
      if (sp === -1 || sp === lyric.length - 1) {
        out.push({ chord, lyric });
      } else {
        out.push({ chord, lyric: lyric.slice(0, sp + 1) });
        lyric.slice(sp + 1).split(/(?<=\s)/).forEach(w => w && out.push({ chord: null, lyric: w }));
      }
    } else {
      tok.value.split(/(?<=\s)/).forEach(w => w && out.push({ chord: null, lyric: w }));
      i++;
    }
  }
  return out;
}

function ZhLine({ tokens, pinyin, showChords, showPinyin, hideLyrics = false, chord_font, zh_lyric_font, typography = "web" }: ZhLineProps) {
  // Typographie « pdf » : tailles des PDF exportés (accords 17px, chars 15px, pinyin 10.5px)
  const isPdfTypo = typography === "pdf";
  const baseSize = isPdfTypo ? "0.9375rem" : "0.88rem";
  const chordEm = isPdfTypo ? "1.13em" : "0.9em";
  const charEm = isPdfTypo ? "1em" : "1.2em";
  const pinyinEm = isPdfTypo ? "0.7em" : "0.6em";
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let pIdx = 0;

  type Col = { char: string; chord: string | null; py: string };
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...(showChords ? seg.lyric : (seg.lyric?.trimStart() ?? ""))];
    if (chars.length === 0) {
      if (seg.chord) cols.push({ char: " ", chord: seg.chord, py: "" });
    } else {
      chars.forEach((ch, ci) => {
        cols.push({
          char: ch,
          chord: ci === 0 ? seg.chord : null,
          py: isCJK(ch) ? (pyWords[pIdx++] ?? "") : "",
        });
      });
    }
  }

  const hasAnyChord = showChords && cols.some((c) => c.chord !== null);

  const cellMinWidth = (col: Col): string | undefined => {
    if (isCJK(col.char)) return "1.6em";
    if (col.chord) return `${col.chord.length * 0.75 + 1}em`;
    return undefined;
  };

  return (
    <div
      data-copy-line
      className="flex flex-wrap items-start mb-[3px]"
      style={{
        fontSize: baseSize,
        // Air au-dessus de la ligne quand elle porte des accords : sinon
        // l'accord (haut de colonne) vient « manger » le pinyin de la ligne
        // précédente (bas de colonne).
        marginTop: hasAnyChord ? (isPdfTypo ? "0.2em" : "0.35em") : undefined,
      }}
    >
      {cols.map((col, i) => {
        if (!showChords && col.char === " " && col.chord !== null) return null;
        return (
          <span
            key={i}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              minWidth: cellMinWidth(col),
            }}
          >
            {showChords && (
              <span
                data-copy-ignore
                style={{
                  fontWeight: 700,
                  fontSize: chordEm,
                  lineHeight: "0.7",
                  minHeight: hasAnyChord ? "1.1em" : undefined,
                  color: "var(--jianpu-color, #b3261d)",
                  visibility: col.chord ? "visible" : "hidden",
                  whiteSpace: "nowrap",
                }}
                className={chord_font.className}
              >
                {col.chord ?? "x"}
              </span>
            )}
            <span
              className={zh_lyric_font.className}
              style={{ fontSize: charEm, lineHeight: 1.35, visibility: hideLyrics ? "hidden" : undefined }}
            >
              {col.char}
            </span>
            {showPinyin && !hideLyrics && (
              <span
                data-copy-ignore
                style={{
                  fontSize: pinyinEm,
                  lineHeight: 1.2,
                  color: "var(--muted-foreground)",
                  whiteSpace: "nowrap",
                }}
              >
                {col.py || " "}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TransitionNote — bloc affiché entre deux sections
// ---------------------------------------------------------------------------

export function TransitionNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 my-1 mb-4 px-3 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border border-dashed border-amber-300/70 dark:border-amber-700/50 rounded-lg print:border-amber-400/50">
      <MessageSquare className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5 print:hidden" />
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionView
// ---------------------------------------------------------------------------

/** Badge de nuances (dynamiques + expression voulues par la présidence). */
export function NuanceBadge({ nuance }: { nuance?: SectionNuance }) {
  if (!nuance || (nuance.tags.length === 0 && !nuance.note)) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {nuance.tags.map((id) => (
        <span
          key={id}
          title={nuanceFull(id)}
          className="text-[10px] font-semibold leading-none normal-case tracking-normal px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
        >
          {nuanceLabel(id)}
        </span>
      ))}
      {nuance.note && (
        <span className="text-[11px] normal-case font-normal tracking-normal text-violet-700 dark:text-violet-300">
          {nuance.note}
        </span>
      )}
    </span>
  );
}

export interface SectionViewProps {
  section: ChordProSection;
  language: "fr" | "zh";
  showChords: boolean;
  showPinyin: boolean;
  useJianpu: boolean;
  /** Mode Louange : masque les paroles (ossature seule si les accords sont aussi masqués). */
  hideLyrics?: boolean;
  note?: string;
  nuance?: SectionNuance;
  songSourceLabel?: string;
  /** « pdf » = typographie des PDF exportés (Mode Louange) ; « web » = défaut. */
  typography?: "web" | "pdf";
  /** Style « chart » : couleur par type de section, cadre gris fin, accords neutres. */
  chartStyle?: boolean;
  /** Mode édition setlist : rend chaque ligne tappable (ouvre la sheet d'édition). */
  onLineSelect?: (line: ChordProLine, sectionUid?: string) => void;
}

export function SectionView({ section, language, showChords, showPinyin, useJianpu, hideLyrics = false, note, nuance, songSourceLabel, typography = "web", chartStyle = false, onLineSelect }: SectionViewProps) {
  const isPdfTypo = typography === "pdf";
  const { t, i18n } = useTranslation();
  const isZh = language === "zh";
  const uiIsZh = i18n.language === "zh-CN";
  const label = formatSectionName(section, t);
  return (
    <div className="mb-5 print:mb-4" onCopy={handleLyricsCopy} style={{ breakInside: "avoid", ...(chartStyle ? getChartSectionStyle(section.type) : getSectionStyle(section.type, isZh)) }}>
      {/* Label de section */}
      <div className="mb-1.5" style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span
          aria-hidden="true"
          style={{
            width: 16,
            height: 2,
            background: "var(--sec-c, currentColor)",
            borderRadius: 2,
            flexShrink: 0,
            display: "inline-block",
          }}
        />
        <span className={`text-[0.75rem] font-bold uppercase tracking-[0.1em] ${uiIsZh ? zh_lyric_font.className : chord_font.className}`}
              style={{ color: "var(--sec-c, #6b7080)" }}>
          {label}
          {songSourceLabel && (
            <span className="ml-2 text-[10px] font-normal normal-case tracking-normal" style={{ color: "var(--sec-c, currentColor)", opacity: 0.7 }}>
              · {songSourceLabel}
            </span>
          )}
          {note && (
            <span className="ml-2 normal-case font-normal text-muted-foreground tracking-normal text-xs">
              — {note}
            </span>
          )}
          {nuance && (nuance.tags.length > 0 || nuance.note) && (
            <span className="ml-2">
              <NuanceBadge nuance={nuance} />
            </span>
          )}
        </span>
      </div>

      {/* Lignes — corps vide quand paroles ET accords masqués (ossature seule). */}
      {!(hideLyrics && !showChords) && (
        <div>
          {section.lines.map((line, i) => {
            if (line.tokens.length === 0 && !line.jianpu) {
              return <div key={i} data-copy-line className="h-5" />;
            }

            let rendered: React.ReactNode;
            if (isZh && useJianpu) {
              rendered = <JianpuLine line={line} showChords={showChords} showPinyin={showPinyin} />;
            } else if (isZh) {
              rendered = (
                <ZhLine
                  tokens={line.tokens}
                  pinyin={line.pinyin ?? null}
                  showChords={showChords}
                  showPinyin={showPinyin}
                  hideLyrics={hideLyrics}
                  chord_font={isPdfTypo ? liberation_font : chord_font}
                  zh_lyric_font={zh_lyric_font}
                  typography={typography}
                />
              );
            } else {
              rendered = (
                <ChordLine
                  tokens={line.tokens}
                  showChords={showChords}
                  hideLyrics={hideLyrics}
                  chord_font={isPdfTypo ? liberation_font : chord_font}
                  fr_lyric_font={fr_lyric_font}
                  fontSize={isPdfTypo ? 0.9375 : undefined}
                  chordEm={isPdfTypo ? 1.13 : undefined}
                />
              );
            }

            // Mode édition : la ligne devient une cible tactile qui ouvre la sheet.
            if (onLineSelect && line.srcLine !== undefined) {
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => onLineSelect(line, section.uid)}
                  onKeyDown={(e) => e.key === "Enter" && onLineSelect(line, section.uid)}
                  className="cursor-pointer rounded-md -mx-1.5 px-1.5 border border-dashed border-primary/25 hover:border-primary/60 hover:bg-primary/5 active:bg-primary/10 transition-colors my-0.5 print:border-transparent print:bg-transparent print:mx-0 print:px-0 print:my-0"
                >
                  {rendered}
                </div>
              );
            }
            return <div key={i}>{rendered}</div>;
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SongView
// ---------------------------------------------------------------------------

export interface SongViewProps {
  ast: ChordProAST;
  showChords?: boolean;
  showPinyin?: boolean;
  useJianpu?: boolean;
  structureOverride?: string[] | null;
  sectionNotes?: Record<string, string>;
  sectionTransitions?: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Mode édition setlist : rend chaque ligne tappable (ouvre la sheet d'édition). */
  onLineSelect?: (line: ChordProLine, sectionUid?: string) => void;
}

export function SongView({
  ast,
  showChords = true,
  showPinyin = false,
  useJianpu = false,
  structureOverride = null,
  sectionNotes = {},
  sectionTransitions = {},
  sectionNuances = {},
  onLineSelect,
}: SongViewProps) {
  const { t } = useTranslation();
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;
  const langAccent = isZh ? "var(--jianpu-color)" : "var(--chord-color)";
  const sections =
    structureOverride && structureOverride.length > 0 && !canUseJianpu
      ? resolveStructureOverride(ast.sections, structureOverride)
      : ast.sections;
  return (
    <div className="max-w-2xl print:max-w-none" onCopy={handleLyricsCopy}>
      {/* En-tête */}
      <div className="mb-0 pb-3 print:mb-3 border-b border-border">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className={`text-[26px] font-bold text-foreground leading-[1.05] tracking-[-0.4px] uppercase ${isZh ? KaiTiFont.className : chord_font.className}`}>
              {ast.metadata.title}
            </h1>
            {ast.metadata.titlePinyin && (
              <p className={`text-muted-foreground text-[13px] mt-1 ${zh_lyric_font.className}`}>
                {ast.metadata.titlePinyin}
              </p>
            )}
            <p className={`text-muted-foreground text-[13px] mt-1 ${isZh ? zh_lyric_font.className : chord_font.className}`}>
              {ast.metadata.artist}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
            {ast.metadata.key && (
              <span
                className={`text-[14px] font-bold rounded-full px-3 py-[3px] border-[1.5px] leading-none ${chord_font.className}`}
                style={{ color: langAccent, borderColor: langAccent }}
              >
                {canUseJianpu ? ast.metadata.jianpuKey ?? `1=${ast.metadata.key}` : ast.metadata.key}
              </span>
            )}
            {ast.metadata.tempo && (
              <span className="text-muted-foreground text-[11px] font-medium flex items-baseline gap-0.5">
                <span className="text-foreground/70 text-[15px] leading-none">♩</span>
                {` = ${ast.metadata.tempo}`}
              </span>
            )}
          </div>
        </div>

        {canUseJianpu && structureOverride && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
            {t("songs.view.jianpuWarning")}
          </p>
        )}
      </div>

      {/* Ligne ORDRE */}
      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 pt-2 pb-3">
        <span
          className={`text-[8px] font-bold tracking-[1.4px] uppercase mr-1.5 shrink-0 ${chord_font.className}`}
          style={{ color: langAccent }}
        >
          ORDRE
        </span>
        {sections.map((section, i) => (
          <span key={`ord-${section.id}-${i}`} className={`text-[11px] text-muted-foreground ${isZh ? zh_lyric_font.className : chord_font.className}`}>
            {i > 0 && <span className="mx-0.5 opacity-40">·</span>}
            {formatSectionName(section, t)}
          </span>
        ))}
      </div>

      {/* Corps */}
      <div>
        {(() => {
          const occ: Record<string, number> = {};
          return sections.map((section, i) => {
            const idx = occ[section.id] ?? 0;
            occ[section.id] = idx + 1;
            const key = idx === 0 ? section.id : `${section.id}:${idx}`;
            const note = sectionNotes[section.uid] ?? sectionNotes[key] ?? sectionNotes[section.id] ?? "";
            const transition = sectionTransitions?.[section.uid] ?? sectionTransitions?.[key] ?? sectionTransitions?.[section.id] ?? "";
            const nuance = sectionNuances[section.uid] ?? sectionNuances[key] ?? sectionNuances[section.id];
            return (
              <div key={`${section.uid ?? section.id}-${i}`}>
                <SectionView
                  section={section}
                  language={ast.metadata.language}
                  showChords={showChords}
                  showPinyin={isZh ? showPinyin : false}
                  useJianpu={canUseJianpu}
                  note={note}
                  nuance={nuance}
                  onLineSelect={onLineSelect}
                />
                {transition && <TransitionNote text={transition} />}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}