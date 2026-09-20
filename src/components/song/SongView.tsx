"use client";
import localFont from "next/font/local";
import { ChordLine } from "@/components/song/ChordLine";
import { JianpuLine } from "@/components/song/JianpuLine";
import { pinyin_font } from "@/components/song/pinyinFont";
import type { ChordProAST, ChordProLine, ChordProSection, Token } from "@/types/chordPro";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { isRepeatOf, resolveSectionOccurrences, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { uniqueSections } from "@/lib/setlist/uniqueSections";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import { semitonesTo } from "@/lib/transpose";
import { transposeSection } from "@/lib/transposeAST";
import {
  ArrowDownRight,
  ArrowUpRight,
  Guitar,
  MessageSquare,
  MicVocal,
  Pause,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { SectionNuance } from "@/types/setList";
import { nuanceDef, nuanceLabel, nuanceFull } from "@/lib/setlist/nuances";

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

const FILLED_BOX = new Set(["chorus", "postchorus", "final", "coda"]);
const OUTLINE_BOX = new Set(["bridge"]);
// Pré-refrain : barre d'accent à gauche seule (pas de cadre), pour le distinguer du pont.
const LEFT_BAR = new Set(["prechorus"]);

// Style « chart » (option du Mode Louange) : la couleur suit le TYPE de section
// (palette --sec-* de globals.css) et non la langue du chant.
export const CHART_TYPE_COLOR: Record<string, string> = {
  intro: "var(--sec-intro)",
  verse: "var(--sec-verse)",
  prechorus: "var(--sec-prechorus)",
  chorus: "var(--sec-chorus)",
  postchorus: "var(--sec-chorus)",
  final: "var(--sec-chorus)",
  bridge: "var(--sec-bridge)",
  outro: "var(--sec-outro)",
  coda: "var(--sec-coda)",
};

// Clé --sec-* d'un type de section (mêmes correspondances que CHART_TYPE_COLOR).
export const SECTION_PALETTE_KEY: Record<string, string> = {
  intro: "intro",
  verse: "verse",
  prechorus: "prechorus",
  chorus: "chorus",
  postchorus: "chorus",
  final: "chorus",
  bridge: "bridge",
  outro: "outro",
  coda: "coda",
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

// Polices CJK volumineuses (KaiTi ~11 Mo, Source Han Sans ~8 Mo) : preload désactivé
// pour ne pas les précharger sur toute page rendant une partition (y compris
// les chants FR). Elles se chargent à la demande quand un chant zh s'affiche.
const KaiTiFont = localFont({
  src: [{ path: "../../../public/fonts/KaiTi.ttf", weight: "400", style: "normal" }],
  preload: false,
});
// Paroles FR, accords et libellés : Atkinson Hyperlegible Next (OFL), dessinée
// pour qu'aucune lettre ne se confonde — lisible de loin sur le pupitre. Choisie
// par Timothée le 13/09/2026 sur captures (docs/spec-mode-louange.md). Le PDF
// garde ses propres polices (SongPDF).
const fr_lyric_font = localFont({ src: "../../../public/fonts/AtkinsonHyperlegibleNext-Regular.woff2" });
// Caractères chinois : Source Han Sans CN Medium (auparavant Light, trop fine
// de loin) — choisie par Timothée le 13/09/2026 sur captures.
const zh_lyric_font = localFont({ src: "../../../public/fonts/SourceHanSansCN-Medium.otf", preload: false });
const chord_font = localFont({
  src: [
    { path: "../../../public/fonts/AtkinsonHyperlegibleNext-Regular.woff2", weight: "400" },
    { path: "../../../public/fonts/AtkinsonHyperlegibleNext-Bold.woff2", weight: "700" },
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

const ZH_PUNCTUATION = /^[，。、；：！？」』）…,.;:!?)]$/;

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
  const baseSize = isPdfTypo ? "0.9375rem" : "var(--lyric-size)";
  const chordEm = isPdfTypo ? "1.13em" : "0.9em";
  const charEm = isPdfTypo ? "1em" : "1.2em";
  // Pinyin un peu plus grand à l'écran (0,6 → 0,7), décision du 13/09/2026.
  const pinyinEm = "0.7em";
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
  // Air au-dessus de la ligne quand elle porte des accords : sinon
  // l'accord (haut de colonne) vient « manger » le pinyin de la ligne
  // précédente (bas de colonne).
  const chordAir = hasAnyChord ? (isPdfTypo ? "0.2em" : "0.35em") : undefined;

  // Une ligne trop longue passe à la ligne colonne par colonne. Ce qui n'a pas
  // de caractère à soi (accord seul, espace) et la ponctuation restent collés
  // au caractère qui précède : sinon, sur téléphone, un accord de fin de ligne
  // ou une virgule ouvrait seul la rangée suivante, sous les paroles.
  const groups: { cols: Col[]; lyric: boolean }[] = [];
  for (const col of cols) {
    const lyric = col.char.trim() !== "" && !ZH_PUNCTUATION.test(col.char);
    const last = groups[groups.length - 1];
    if (last?.lyric && !lyric) last.cols.push(col);
    else groups.push({ cols: [col], lyric });
  }

  const cellMinWidth = (col: Col): string | undefined => {
    if (isCJK(col.char)) return "1.6em";
    if (col.chord) return `${col.chord.length * 0.75 + 1}em`;
    return undefined;
  };

  return (
    <div
      data-copy-line
      data-copy-pinyin={pinyin ?? undefined}
      className="flex flex-wrap items-start mb-[3px]"
      style={{
        fontSize: baseSize,
        marginTop: chordAir,
        // Entre les rangées d'une ligne coupée, le même air qu'entre deux
        // lignes (la marge du bas se fond dans celle du haut).
        rowGap: chordAir,
      }}
    >
      {groups.map((group, gi) => (
        <span key={gi} style={{ display: "inline-flex", alignItems: "flex-start" }}>
          {group.cols.map((col, i) => {
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
                    className={pinyin_font.className}
                    style={{
                      fontSize: pinyinEm,
                      lineHeight: 1.2,
                      color: "var(--muted-foreground)",
                      whiteSpace: "nowrap",
                      // Une syllabe plus large que la colonne (« chuàng ») l'élargit :
                      // cette marge garde un espace avec sa voisine.
                      paddingInline: "0.15em",
                    }}
                  >
                    {col.py || " "}
                  </span>
                )}
              </span>
            );
          })}
        </span>
      ))}
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

// Nuancier : neutre, trois intensités — le fond fonce du doux au fort, comme
// les nuances imprimées d'une partition. Sans teinte : la couleur est réservée
// aux sections (le violet se confondait avec le pont, décision du 14/09/2026).
// Les indications (a cappella, break…) : contour seul, avec une icône.
const NUANCE_INTENSITY_CLASS = {
  1: "bg-stone-200 text-stone-700 dark:bg-stone-600/40 dark:text-stone-200",
  2: "bg-stone-400/80 text-stone-950 dark:bg-stone-500/70 dark:text-white",
  3: "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900",
} as const;
const NUANCE_NEUTRAL_CLASS = "border border-stone-400/80 text-stone-700 dark:border-stone-500 dark:text-stone-200";
const NUANCE_ICON: Record<string, LucideIcon> = {
  cresc: ArrowUpRight,
  decresc: ArrowDownRight,
  acappella: MicVocal,
  instrumental: Guitar,
  solo: User,
  tutti: Users,
  spontane: Sparkles,
  break: Pause,
};

// Bandeau de structure : la nuance en texte seul, sans fond — la structure
// doit rester ce qu'on voit d'abord ; la noirceur suit le nuancier.
const NUANCE_TEXT_INTENSITY_CLASS = {
  1: "text-stone-500 dark:text-stone-400",
  2: "text-stone-700 dark:text-stone-200",
  3: "text-stone-950 font-bold dark:text-white",
} as const;
const NUANCE_TEXT_NEUTRAL_CLASS = "text-stone-600 dark:text-stone-300";

/** Badge de nuances (dynamiques + expression voulues par la présidence).
 *  `lg` : mode louange, lu de plus loin ; `variant="text"` : bandeau de
 *  structure, texte discret sous l'abréviation. */
export function NuanceBadge({ nuance, size = "sm", variant = "badge" }: { nuance?: SectionNuance; size?: "sm" | "lg"; variant?: "badge" | "text" }) {
  if (!nuance || (nuance.tags.length === 0 && !nuance.note)) return null;
  const lg = size === "lg";
  const text = variant === "text";
  return (
    <span className={`inline-flex flex-wrap items-center align-middle ${lg ? "gap-1.5" : "gap-1"}`}>
      {nuance.tags.map((id) => {
        const def = nuanceDef(id);
        const Icon = NUANCE_ICON[id];
        // Bandeau : crescendo et decrescendo se lisent à leur seule flèche.
        const arrowOnly = text && !!def?.trend && !!Icon;
        return (
          <span
            key={id}
            data-nuance
            title={nuanceFull(id)}
            aria-label={arrowOnly ? nuanceLabel(id) : undefined}
            className={`inline-flex items-center gap-[0.25em] leading-none normal-case tracking-normal ${
              text
                ? `text-[14px] font-semibold ${def?.intensity ? NUANCE_TEXT_INTENSITY_CLASS[def.intensity] : NUANCE_TEXT_NEUTRAL_CLASS}`
                : `${lg ? "text-[0.8125rem] font-bold px-2 py-1 rounded-md" : "text-[10px] font-semibold px-1.5 py-0.5 rounded"} ${def?.intensity ? NUANCE_INTENSITY_CLASS[def.intensity] : NUANCE_NEUTRAL_CLASS}`
            }`}
          >
            {Icon && <Icon aria-hidden="true" className={arrowOnly ? "h-[1.5em] w-[1.5em] shrink-0" : "h-[1.1em] w-[1.1em] shrink-0"} strokeWidth={2.5} />}
            {!arrowOnly && nuanceLabel(id)}
          </span>
        );
      })}
      {nuance.note && (
        <span className={`normal-case tracking-normal text-stone-600 dark:text-stone-300 ${text ? "text-[13px] font-normal" : lg ? "text-[0.8125rem] font-semibold" : "text-[11px] font-normal"}`}>
          {nuance.note}
        </span>
      )}
    </span>
  );
}

/** Bandeau de structure (« coup d'œil ») : la structure jouée en abrégé, la
 *  nuance sous chaque étape, les reprises identiques repliées en « ×2 » (même
 *  règle que la vue structure du mode louange). Remplace la ligne ORDRE.
 *  Notes et transitions passent sous le bandeau (`details`) quand le corps ne
 *  peut pas les porter : scan 简谱, sections uniques, structure seule. */
export function StructureStrip({
  steps,
  position,
  capo,
  songKey,
  details = false,
  className = "",
  children,
}: {
  steps: SectionOccurrence[];
  /** Numéro du chant dans la setlist, quand le bandeau tient lieu d'en-tête. */
  position?: number;
  capo?: number;
  /** Tonalité jouée : une « modulation » vers elle n'en est pas une. */
  songKey?: string;
  details?: boolean;
  className?: string;
  /** Badges d'état propres au contexte (copie des paroles, version modifiée…). */
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const groups: { step: SectionOccurrence; abbr: string; full: string; repeat: number }[] = [];
  for (const step of steps) {
    const full = formatSectionName(step.section, t);
    const last = groups[groups.length - 1];
    if (last && isRepeatOf({ ...last.step, label: last.full }, { ...step, label: full })) {
      last.repeat++;
      continue;
    }
    groups.push({ step, abbr: abbreviateSection(step.section), full, repeat: 1 });
  }
  // Pastille aux couleurs de la section (palette --sec-* de globals.css) :
  // fond clair, lettre en couleur — les mêmes teintes que les cadres du corps.
  const secKey = (type: string) => SECTION_PALETTE_KEY[type] ?? "other";
  const colorOf = (type: string) => `var(--sec-${secKey(type)})`;
  const tintOf = (type: string) => `var(--sec-${secKey(type)}-tint)`;
  // Notes et transitions : un numéro noir accroché à la pastille, repris
  // dans la liste sous le bandeau (quand le corps ne les porte pas).
  const notes = details ? groups.filter((g) => g.step.note || g.step.transition) : [];
  const noteNumber = new Map(notes.map((g, i) => [g, i + 1]));
  const numberBadge = "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-bold leading-none text-background";
  return (
    <div className={className}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {position !== undefined && (
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
            {position}
          </span>
        )}
        {capo ? (
          <span className="text-[10px] font-bold font-mono border border-border rounded-full px-1.5 py-0.5 text-muted-foreground">
            {t("performance.capoBadge", { n: capo })}
          </span>
        ) : null}
        {/* Pastilles rondes ; la taille suit l'écran : 32 px sous 640 px (neuf étapes
            sur une rangée à 390 px), 44 px au-delà. Non cliquables : pas de plancher tactile. */}
        <ol aria-label={t("songs.view.structure")} className="flex flex-wrap items-start gap-x-1.5 gap-y-2 sm:gap-x-3 sm:gap-y-3">
          {groups.map((g, i) => {
            const targetKey = g.step.targetKey && g.step.targetKey !== songKey ? g.step.targetKey : undefined;
            const n = noteNumber.get(g);
            return (
              <li key={i} className="flex flex-col items-center gap-1.5">
                <span className="relative inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 sm:h-11 sm:min-w-11 sm:px-2.5" style={{ background: tintOf(g.step.section.type), color: colorOf(g.step.section.type) }}>
                  <span className="inline-flex items-baseline text-[14px] font-bold leading-none tracking-[0.02em] sm:text-[17px]">
                    <abbr title={g.full} className="no-underline [text-decoration:none]">{g.abbr}</abbr>
                    {g.repeat > 1 && <span className="ml-px text-[11px] font-semibold sm:text-[13px]">×{g.repeat}</span>}
                  </span>
                  {n !== undefined && (
                    <span aria-label={`${n}`} className={`absolute -right-1 -top-1 max-sm:h-4 max-sm:min-w-4 ${numberBadge}`}>{n}</span>
                  )}
                </span>
                {targetKey && <span className="font-mono text-[12px] leading-none text-muted-foreground">→ {targetKey}</span>}
                <NuanceBadge nuance={g.step.nuance} variant="text" />
              </li>
            );
          })}
        </ol>
        {children && <span className="ml-auto inline-flex flex-wrap items-center gap-2">{children}</span>}
      </div>
      {notes.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-t border-border pt-3 text-[14px] text-foreground/80">
          {notes.map((g, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`${numberBadge} mt-px shrink-0`}>{i + 1}</span>
              <span>{[g.step.note, g.step.transition && `→ ${g.step.transition}`].filter(Boolean).join(" ")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
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
  /** Modulation (升调) : tonalité cible affichée en badge à côté du label. */
  keyChange?: string;
  songSourceLabel?: string;
  /** « pdf » = typographie des PDF exportés (Mode Louange) ; « web » = défaut. */
  typography?: "web" | "pdf";
  /** Style « chart » : couleur par type de section, cadre gris fin, accords neutres. */
  chartStyle?: boolean;
  /** Mode édition setlist : rend chaque ligne tappable (ouvre la sheet d'édition). */
  onLineSelect?: (line: ChordProLine, sectionUid?: string) => void;
  /** Taille des badges de nuances (« lg » en mode louange). */
  nuanceSize?: "sm" | "lg";
  /** Vue structure : passages identiques repliés (« Refrain ×2 »). */
  repeat?: number;
  /** Occurrences de la structure jouée que cette impression représente
   *  (`data-section-uids`) : le sommaire s'en sert pour y aller et se marquer. */
  occurrenceUids?: string[];
}

export function SectionView({ section, language, showChords, showPinyin, useJianpu, hideLyrics = false, note, nuance, keyChange, songSourceLabel, typography = "web", chartStyle = false, onLineSelect, nuanceSize = "sm", repeat = 1, occurrenceUids }: SectionViewProps) {
  const isPdfTypo = typography === "pdf";
  const { t, i18n } = useTranslation();
  const isZh = language === "zh";
  const uiIsZh = i18n.language === "zh-CN";
  const label = formatSectionName(section, t);
  // Ossature seule (paroles ET accords masqués) : pas de corps, donc ni marge
  // sous le libellé ni padding bas plus grand que le haut — le libellé reste
  // centré dans son cadre, même agrandi en vue structure.
  const bodyHidden = hideLyrics && !showChords;
  return (
    <div data-section data-section-uids={occurrenceUids?.join(" ")} className="mb-5 print:mb-4" style={{ breakInside: "avoid", ...(chartStyle ? getChartSectionStyle(section.type) : getSectionStyle(section.type, isZh)), ...(bodyHidden ? { paddingBottom: 10 } : null) }}>
      {/* Label de section — hors copie : la régie colle les paroles seules. */}
      <div data-copy-ignore className={bodyHidden ? undefined : "mb-1.5"} style={{ display: "flex", alignItems: "center", gap: 9 }}>
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
          {repeat > 1 && <span className="ml-1 normal-case">×{repeat}</span>}
          {keyChange && (
            <span className="ml-2 normal-case tracking-normal text-xs font-bold" style={{ color: "var(--sec-c, currentColor)" }}>
              {t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange })}
            </span>
          )}
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
              <NuanceBadge nuance={nuance} size={nuanceSize} />
            </span>
          )}
        </span>
      </div>

      {/* Lignes — corps vide quand paroles ET accords masqués (ossature seule). */}
      {!bodyHidden && (
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
  /** Modulation (升调) par section : uid → tonalité cible d'affichage. */
  sectionKeys?: Record<string, string>;
  /** Style « chart » : couleurs par type de section + accords neutres. */
  chartStyle?: boolean;
  /** Mode édition setlist : rend chaque ligne tappable (ouvre la sheet d'édition). */
  onLineSelect?: (line: ChordProLine, sectionUid?: string) => void;
  /** Coup d'œil : ordre joué (défaut), chaque section une fois, ou bandeau seul. */
  layout?: PartitionLayout;
  /** Structure perso (docs/spec-version-perso.md) : le corps la suit telle
   *  quelle, sans notes ni transitions d'occurrence ; le bandeau garde la
   *  structure jouée. */
  bodyStructure?: string[] | null;
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
  sectionKeys = {},
  chartStyle = false,
  onLineSelect,
  layout = "played",
  bodyStructure = null,
}: SongViewProps) {
  const { t } = useTranslation();
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;
  const langAccent = isZh ? "var(--jianpu-color)" : "var(--chord-color)";
  const sections =
    structureOverride && structureOverride.length > 0 && !canUseJianpu
      ? resolveStructureOverride(ast.sections, structureOverride)
      : ast.sections;
  const steps = resolveSectionOccurrences(sections, { sectionNotes, sectionTransitions, sectionNuances, sectionKeys });
  const personalSteps =
    bodyStructure && bodyStructure.length > 0 && !canUseJianpu
      ? resolveSectionOccurrences(resolveStructureOverride(ast.sections, bodyStructure), { sectionNotes: {}, sectionKeys })
      : null;
  const shown: { step: SectionOccurrence; uids: string[]; withDetails: boolean }[] =
    layout === "structure"
      ? []
      : personalSteps
        ? personalSteps.map((step) => ({ step, uids: [step.section.uid], withDetails: false }))
        : layout === "unique"
          ? uniqueSections(steps, ast.metadata.key).map((u) => ({ ...u, withDetails: false }))
          : steps.map((step) => ({ step, uids: [step.section.uid], withDetails: true }));
  return (
    <div className="max-w-2xl print:max-w-none">
      {/* En-tête */}
      <div className="mb-0 pb-3 print:mb-3 border-b border-border">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className={`text-[26px] font-bold text-foreground leading-[1.05] tracking-[-0.4px] uppercase ${isZh ? KaiTiFont.className : chord_font.className}`}>
              {ast.metadata.title}
            </h1>
            {ast.metadata.titlePinyin && (
              <p className={`text-muted-foreground text-[13px] mt-1 ${pinyin_font.className}`}>
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

      {/* Bandeau de structure (coup d'œil) : notes et transitions y passent
          dès que le corps ne les porte plus (sections uniques, structure seule). */}
      <StructureStrip steps={steps} songKey={ast.metadata.key} details={layout !== "played"} className="pt-2 pb-3" />

      {/* Corps : ordre joué, ou chaque section une fois (les réglages
          d'occurrence restent dans le bandeau), ou rien du tout. */}
      <div>
        {shown.map(({ step, uids, withDetails }, i) => {
          const { section } = step;
          // Modulation (升调) : la section s'affiche transposée dans sa tonalité cible.
          const keyChange = step.targetKey && step.targetKey !== ast.metadata.key ? step.targetKey : undefined;
          const shownSection = keyChange && ast.metadata.key
            ? transposeSection(section, semitonesTo(ast.metadata.key, keyChange), keyChange)
            : section;
          return (
            <div key={`${section.uid ?? section.id}-${i}`}>
              <SectionView
                section={shownSection}
                language={ast.metadata.language}
                showChords={showChords}
                showPinyin={isZh ? showPinyin : false}
                useJianpu={canUseJianpu}
                note={withDetails ? step.note : undefined}
                nuance={withDetails ? step.nuance : undefined}
                keyChange={keyChange}
                chartStyle={chartStyle}
                onLineSelect={onLineSelect}
                occurrenceUids={uids}
              />
              {withDetails && step.transition && <TransitionNote text={step.transition} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}