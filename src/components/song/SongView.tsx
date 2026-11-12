"use client";
import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import localFont from "next/font/local";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/firebase/auth";
import { useCouleursAccords } from "@/lib/couleurAccords";
import Link, { type LinkProps } from "next/link";
import { ChordLine } from "@/components/song/ChordLine";
import { ConteneurCoupure, LargeurCoupureContext, CoupureMesureContext, bordCoupure } from "@/components/song/LargeurCoupure";
import type { Disposition } from "@/lib/dispositionPref";
import { signalerCoupure } from "@/lib/song/coupureSignal";
import { choisirCoupureZh, DEBORD, type UniteZh } from "@/lib/song/coupure";
import { motsDuTexte, type MotZh } from "@/lib/song/motsChinois";
import { JianpuLine } from "@/components/song/JianpuLine";
import { AccordsInactifs } from "@/components/accords/AccordsProvider";
import { AccordTouchable } from "@/components/accords/AccordTouchable";
import { pinyin_font } from "@/components/song/pinyinFont";
import type { ChordProAST, ChordProLine, ChordProSection, Token } from "@/types/chordPro";
import { useTranslation } from "react-i18next";
import { formatSectionName } from "@/lib/chordpro/parser";
import { abbreviateSection } from "@/lib/chordpro/abbreviations";
import { resolveSectionOccurrences, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { SECTION_PALETTE_KEY, sectionColorKind } from "@/lib/sectionPalette";
import { dpFullName, groupSteps, paletteKeyOf } from "@/lib/setlist/dp";
import { uniqueSections } from "@/lib/setlist/uniqueSections";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import { ordreJoue, resolveStructureOverride } from "@/lib/chordpro/structure";
import { toSegments } from "@/lib/chordpro/segments";
import { isCJK } from "@/lib/cjk";
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
import { TempoPartition } from "@/components/song/NoteNoire";
import type { Marques } from "@/lib/partition/lecture";
import { TOUCHER_44 } from "@/lib/toucher44";

// ---------------------------------------------------------------------------
// Thèmes et styles de sections
// ---------------------------------------------------------------------------
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
const CHART_TYPE_COLOR: Record<string, string> = {
  intro: "var(--sec-intro)",
  verse: "var(--sec-verse)",
  prechorus: "var(--sec-prechorus)",
  chorus: "var(--sec-chorus)",
  postchorus: "var(--sec-chorus)",
  final: "var(--sec-chorus)",
  bridge: "var(--sec-bridge)",
  outro: "var(--sec-outro)",
  coda: "var(--sec-coda)",
  tag: "var(--sec-tag)",
};

// Clé --sec-* d'un type de section : voir src/lib/sectionPalette.ts.
export { SECTION_PALETTE_KEY };

export function getChartSectionStyle(type: string): React.CSSProperties {
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

// Polices CJK : sous-ensembles woff2 (scripts/build-fonts.py ; originaux KaiTi ~11 Mo, Source Han Sans ~8 Mo) : preload désactivé
// pour ne pas les précharger sur toute page rendant une partition (y compris
// les chants FR). Elles se chargent à la demande quand un chant zh s'affiche.
export const KaiTiFont = localFont({
  src: [{ path: "../../../public/fonts/KaiTi-titres.woff2", weight: "400", style: "normal" }],
  preload: false,
});
// Gelasio (OFL) : le serif des titres de la disposition Partition (lot DP-D) ; sous-ensemble latin en woff2, les .ttf
// restent pour le PDF. Chargée à la demande, seule cette disposition s'en sert.
export const gelasio_font = localFont({
  src: [
    { path: "../../../public/fonts/Gelasio-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../../public/fonts/Gelasio-Bold.woff2", weight: "700", style: "normal" },
    { path: "../../../public/fonts/Gelasio-Italic.woff2", weight: "400", style: "italic" },
  ],
  display: "swap",
  preload: false,
});
// Paroles FR, accords et libellés : Atkinson Hyperlegible Next (OFL), dessinée
// pour qu'aucune lettre ne se confonde — lisible de loin sur le pupitre. Choisie
// par Timothée le 13/09/2026 sur captures (docs/spec-mode-louange.md). Le PDF
// garde ses propres polices (SongPDF).
const fr_lyric_font = localFont({ src: "../../../public/fonts/AtkinsonHyperlegibleNext-Regular.woff2" });
// Caractères chinois : Source Han Sans CN Medium (auparavant Light, trop fine
// de loin) — choisie par Timothée le 13/09/2026 sur captures.
export const zh_lyric_font = localFont({ src: "../../../public/fonts/SourceHanSansCN-Medium-sub.woff2", preload: false });
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
  preload: false,
});


export function getSectionStyle(type: string, isZh: boolean): React.CSSProperties {
  const l = isZh ? "zh" : "fr";
  // Sans couleur d'accords choisie, les variables n'existent pas : les replis redonnent LANG_THEME.
  const accent = `var(--accord-${l}, ${LANG_THEME[l].accent})`;
  const boxFill = `var(--classique-fond-${l}, ${LANG_THEME[l].boxFill})`;
  const boxBorder = `var(--classique-bord-${l}, ${LANG_THEME[l].boxBorder})`;

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

// Le guillemet fermant « ” » y est depuis le 27/09/2026 : sur 你的同在 (téléphone),
// « 你。”[A] » coupait entre 。 et ”, qui ouvrait seul la rangée suivante avec son accord.
const ZH_PUNCTUATION = /^[，。、；：！？」』）”…,.;:!?)]$/;

const aDesParoles = (tokens: Token[] | undefined) =>
  tokens?.some((t) => t.type === "lyric" && t.value.trim() !== "") ?? false;
/** Rangée d'accords seule (aucune parole) : la ligne reste à line-height 0 dans ChordLine. */
const sansParoles = (tokens: Token[]) => tokens.some((t) => t.type === "chord") && !aDesParoles(tokens);
const avecParoles = aDesParoles;

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
  /** Slug du chant : les exceptions de mots (motsChinois.ts) en dépendent. Absent : segmentation seule. */
  slug?: string;
}

/** Finit par une ponctuation de pause : la coupure est naturelle juste après (R1). */
const ZH_PAUSE = /[，。；：！？、,;:!?]$/;

type ZhCol = { char: string; chord: string | null; py: string; seul: boolean };
type ZhCoupe = { coupures: number[]; etat: string; relache: string[]; retrait: number | null };
const UNE_RANGEE_ZH: ZhCoupe = { coupures: [], etat: "une", relache: [], retrait: null };

function ZhLine({ tokens, pinyin, showChords, showPinyin, hideLyrics = false, chord_font, zh_lyric_font, typography = "web", slug }: ZhLineProps) {
  // Typographie « pdf » : tailles des PDF exportés (accords 17px, chars 15px, pinyin 10.5px)
  const isPdfTypo = typography === "pdf";
  const baseSize = isPdfTypo ? "0.9375rem" : "var(--lyric-size)";
  const chordEm = isPdfTypo ? "1.13em" : "0.9em";
  const charEm = isPdfTypo ? "1em" : "1.2em";
  // Pinyin un peu plus grand à l'écran (0,6 → 0,7), décision du 13/09/2026.
  const pinyinEm = "0.7em";
  const pyWords = pinyin?.split(/\s+/).filter(Boolean) ?? [];
  let pIdx = 0;

  type Col = ZhCol;
  const cols: Col[] = [];

  for (const seg of toSegments(tokens)) {
    const chars = [...(showChords ? seg.lyric : (seg.lyric?.trimStart() ?? ""))];
    if (chars.length === 0) {
      if (seg.chord) cols.push({ char: " ", chord: seg.chord, py: "", seul: true });
    } else {
      chars.forEach((ch, ci) => {
        cols.push({
          char: ch,
          chord: ci === 0 ? seg.chord : null,
          py: isCJK(ch) ? (pyWords[pIdx++] ?? "") : "",
          seul: false,
        });
      });
    }
  }

  const hasAnyChord = showChords && cols.some((c) => c.chord !== null);
  // Aucune parole (que des accords) : ni caractère ni pinyin vide sous les accords (R2).
  const aucuneParole = !cols.some((c) => c.char.trim() !== "");
  // Air au-dessus de la ligne quand elle porte des accords : sinon
  // l'accord (haut de colonne) vient « manger » le pinyin de la ligne
  // précédente (bas de colonne).
  const chordAir = hasAnyChord ? (isPdfTypo ? "0.2em" : "0.35em") : undefined;

  // Une ligne trop longue passe à la ligne par unités insécables. D'abord les groupes : ce qui n'a pas
  // de caractère à soi (accord seul, espace) et la ponctuation restent collés
  // au caractère qui précède : sinon, sur téléphone, un accord de fin de ligne
  // ou une virgule ouvrait seul la rangée suivante, sous les paroles.
  // Les lettres d'un mot latin (« So we say, "Merry Christmas" ») restent
  // ensemble : la ligne ne se coupe qu'entre deux mots.
  const latin = (ch: string) => ch.trim() !== "" && !isCJK(ch) && !ZH_PUNCTUATION.test(ch);
  const groups: { cols: Col[]; lyric: boolean }[] = [];
  for (const col of cols) {
    const lyric = col.char.trim() !== "" && !ZH_PUNCTUATION.test(col.char);
    const last = groups[groups.length - 1];
    const prev = last?.cols[last.cols.length - 1];
    if (last?.lyric && !lyric) last.cols.push(col);
    else if (prev && latin(col.char) && latin(prev.char)) last!.cols.push(col);
    else groups.push({ cols: [col], lyric });
  }

  // Puis les mots (lot CV, R1) : les groupes d'un même mot de 2 à 4 caractères forment une seule unité.
  // Les accords seuls en fin de ligne restent collés à la dernière unité (ils sont dans son groupe).
  // Sans les espaces : « 释[E2/G#] 放 » (accord posé sur une espace) reste le mot 释放 pour le segmenteur.
  const texte = groups.map((g) => g.cols.filter((c) => !c.seul && c.char.trim() !== "").map((c) => c.char).join(""));
  const debuts = texte.reduce<number[]>((acc, t, i) => (acc.push(i ? acc[i - 1] + texte[i - 1].length : 0), acc), []);
  const mots = motsDuTexte(texte.join(""), slug);
  const unites: { cols: Col[]; mot: MotZh | null }[] = [];
  {
    let m = 0;
    groups.forEach((group, gi) => {
      while (m < mots.length && mots[m].fin <= debuts[gi]) m++;
      const mot = mots[m] && mots[m].debut <= debuts[gi] && texte[gi] ? mots[m] : null;
      const derniere = unites[unites.length - 1];
      if (mot && derniere?.mot === mot) derniere.cols.push(...group.cols);
      else unites.push({ cols: [...group.cols], mot });
    });
  }
  const cle = unites.map((u) => u.cols.map((c) => `${c.chord ?? ""}|${c.char}|${c.py}`).join("¦")).join("§");

  const ligne = useRef<HTMLDivElement>(null);
  const uniteRefs = useRef<(HTMLElement | null)[]>([]);
  const derniere = useRef("");
  const [coupe, setCoupe] = useState<ZhCoupe>(UNE_RANGEE_ZH);
  // Une coupure qui change déplace les hauteurs : le mode louange refait sa pagination (rien au premier rendu).
  const coupePrec = useRef(coupe);
  const copieMesure = useContext(CoupureMesureContext);
  useLayoutEffect(() => {
    if (coupePrec.current === coupe) return;
    coupePrec.current = coupe;
    signalerCoupure(copieMesure);
  }, [coupe, copieMesure]);
  const [polices, setPolices] = useState(0);
  const [propre, setPropre] = useState(0);
  const version = useContext(LargeurCoupureContext);

  // Sans conteneur de chant, la ligne observe sa propre largeur.
  useLayoutEffect(() => {
    const el = ligne.current;
    if (version !== null || !el) return;
    let largeur = el.clientWidth;
    const obs = new ResizeObserver(() => {
      if (el.clientWidth === largeur) return;
      largeur = el.clientWidth;
      setPropre((v) => v + 1);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [version]);

  // Les largeurs changent quand la police arrive.
  useLayoutEffect(() => {
    let vivant = true;
    document.fonts?.ready.then(() => vivant && setPolices((v) => v + 1));
    return () => {
      vivant = false;
    };
  }, []);

  // Après chaque rendu : on ne mesure que si la largeur, le corps ou le contenu ont changé (aucune boucle).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sans liste volontairement : l'empreinte ci-dessous évite toute boucle
  useLayoutEffect(() => {
    const el = ligne.current;
    if (!el) return;
    // La réserve de droite (ci-dessous) est comptée dans clientWidth : on la retire pour retrouver la largeur de la colonne.
    const largeur = el.clientWidth - (parseFloat(el.style.paddingRight) || 0);
    if (!largeur) return;
    const em = parseFloat(getComputedStyle(el).fontSize);
    const empreinte = [largeur, em, cle, showChords, showPinyin, hideLyrics, isPdfTypo, version, propre, polices].join("/");
    if (empreinte === derniere.current) return;
    derniere.current = empreinte;
    el.style.paddingRight = "";
    el.style.marginRight = "";
    const rect = el.getBoundingClientRect();
    const echelle = rect.width / (el.offsetWidth || 1) || 1;
    // Jusqu'au bord du cadre de zoom (ou de la fenêtre) : rien ne doit élargir ni la page ni ce cadre.
    const bord = bordCoupure(el);
    const place = (bord - rect.right) / echelle - 4;
    const mesures: UniteZh[] = unites.map((u, i) => {
      const noeud = uniteRefs.current[i];
      const lettres = u.cols.filter((c) => c.char.trim() !== "");
      return {
        largeur: noeud ? noeud.getBoundingClientRect().width / echelle : 0,
        caracteres: lettres.length,
        ponctue: ZH_PAUSE.test(lettres[lettres.length - 1]?.char ?? ""),
      };
    });
    // R5 : retrait de 1 em par rapport au premier caractère de la première rangée (qui n'a pas de retrait).
    const premiere = el.querySelector<HTMLElement>("[data-rangee]");
    let debut = 0;
    for (const c of premiere?.querySelectorAll<HTMLElement>("[data-car]") ?? []) {
      if (!c.textContent?.trim()) continue;
      debut = (c.getBoundingClientRect().left - premiere!.getBoundingClientRect().left) / echelle;
      break;
    }
    let retrait = em + (debut > 0 ? Math.round(debut * 100) / 100 : 0);
    const debordPermis = Math.max(0, Math.min(DEBORD, place));
    let r = choisirCoupureZh(mesures, { largeur, em, retrait, debord: debordPermis });
    // Colonne très étroite : plutôt que déborder, on retombe sur le retrait d'un em.
    if (r.etat === "deborde" && retrait > em) {
      retrait = em;
      r = choisirCoupureZh(mesures, { largeur, em, retrait, debord: debordPermis });
    }
    // Ce qui dépasse dans la marge reste dans le cadre de la ligne (padding compensé par une marge négative).
    const reserve = Math.max(0, Math.min(20, place));
    if (reserve > 0) {
      el.style.paddingRight = `${reserve}px`;
      el.style.marginRight = `-${reserve}px`;
    }
    setCoupe((avant) =>
      avant.etat === r.etat && avant.coupures.join() === r.coupures.join() && avant.relache.join() === r.relache.join() && avant.retrait === retrait
        ? avant
        : { coupures: r.coupures, etat: r.etat, relache: r.relache, retrait },
    );
  });

  const rangees: { unites: typeof unites; depart: number }[] = [];
  {
    let depart = 0;
    for (const fin of unites.length ? [...coupe.coupures, unites.length - 1] : []) {
      rangees.push({ unites: unites.slice(depart, fin + 1), depart });
      depart = fin + 1;
    }
  }

  const cellMinWidth = (col: Col): string | undefined => {
    if (isCJK(col.char)) return "1.6em";
    // Un accord seul (sans caractère) prend la largeur de son étiquette : avec
    // une largeur minimale, les accords qui suivent la dernière parole
    // (« 弃[(Bm/D)] [(G#/C)] [(Am/C)] … », 奔跑不放弃) formaient un groupe plus
    // large que l'écran du téléphone, et dépassaient le bord.
    if (col.chord && col.char.trim() !== "") return `${col.chord.length * 0.75 + 1}em`;
    return undefined;
  };

  return (
    <div
      ref={ligne}
      data-copy-line
      data-copy-pinyin={pinyin ?? undefined}
      data-coupe={coupe.etat + (coupe.relache.length ? `:${coupe.relache.join(", ")}` : "")}
      className="flex flex-col items-start mb-[3px]"
      style={{
        fontSize: baseSize,
        marginTop: chordAir,
        // Entre les rangées d'une ligne coupée, le même air qu'entre deux
        // lignes (la marge du bas se fond dans celle du haut).
        rowGap: chordAir,
      }}
    >
      {rangees.map(({ unites: rangee, depart }, r) => {
        // R2 : une rangée sans accord ne réserve pas la bande d'accords.
        const rangeeAvecAccord = showChords && rangee.some((u) => u.cols.some((c) => c.chord !== null));
        // `span` et non `div` : la copie (copyLyrics.ts) met un retour à la ligne après chaque bloc. R5 : retrait en padding.
        return (
          <span
            key={depart}
            data-rangee
            style={{ display: "flex", flexWrap: "nowrap", alignItems: "flex-start", whiteSpace: "nowrap", paddingLeft: r > 0 ? (coupe.retrait === null ? "1em" : `${coupe.retrait}px`) : undefined }}
          >
            {rangee.map((unite, ui) => (
              <span key={depart + ui} ref={(n) => { uniteRefs.current[depart + ui] = n; }} style={{ display: "inline-flex", alignItems: "flex-start" }}>
                {unite.cols.map((col, i) => {
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
                      {rangeeAvecAccord && (
                        <span
                          data-copy-ignore
                          data-accord
                          style={{
                            fontWeight: 700,
                            fontSize: chordEm,
                            lineHeight: "0.7",
                            minHeight: "1.1em",
                            color: "var(--accord-zh, var(--jianpu-color, #b3261d))",
                            visibility: col.chord ? "visible" : "hidden",
                            whiteSpace: "nowrap",
                            // Deux accords longs sur deux caractères voisins se touchaient
                            // (« Am7/EDsus4 », relevé le 26/09/2026 sur 向主欢呼) : la colonne
                            // s'élargit bien à l'accord, mais rien ne séparait deux étiquettes.
                            // Symétrique, pour que l'accord reste centré sur son caractère.
                            paddingInline: "0.25em",
                          }}
                          className={chord_font.className}
                        >
                          {col.chord ? <AccordTouchable etiquette={col.chord} /> : "x"}
                        </span>
                      )}
                      {!aucuneParole && (
                        <span
                          data-car
                          className={zh_lyric_font.className}
                          style={{ fontSize: charEm, lineHeight: 1.35, visibility: hideLyrics ? "hidden" : undefined }}
                        >
                          {col.char}
                        </span>
                      )}
                      {showPinyin && !hideLyrics && !aucuneParole && (
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
 *  structure, texte discret sous l'abréviation. Notation de la partition : ses
 *  tailles en px restent hors de l'échelle de texte B et de son plancher (lot CD,
 *  T4a), pour garder le badge du mode louange nettement plus grand. */
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
  songKey,
  details = false,
  compacte = false,
  colonne = false,
  pleines,
  rappel = "unique",
  disposition = "classique",
  className = "",
  children,
}: {
  steps: SectionOccurrence[];
  /** Tonalité jouée : une « modulation » vers elle n'en est pas une. */
  songKey?: string;
  details?: boolean;
  /** Rappel du mode louange (pages suivantes d'un chant en Sections uniques) :
   *  pastilles de 30 px (26 px sous 640 px), sans modulation ni détails ; nuance
   *  sous les seules pastilles pleines. Mode louange : ses tailles en px restent hors
   *  de l'échelle de texte B (lot CD, T4a). */
  compacte?: boolean;
  /** Colonne de la marge du mode louange (page de scan en paysage) : pastilles
   *  empilées, chacune suivie de son nom, de « → X » et de sa nuance. */
  colonne?: boolean;
  /** Rappel (compacte) : uids des occurrences imprimées sur la page. Chaque passage
   *  qui en contient un est plein (fond de la section, nuance dessous) ; les autres
   *  sont claires, et disparaissent sous 640 px. */
  pleines?: ReadonlySet<string>;
  /** Rappel (compacte) : « unique » = Sections uniques (pleines et claires, claires cachées
   *  au téléphone) ; « joue » = Ordre joué : points (déjà joué), pleines (sur la page),
   *  claires (à venir), tout gardé au téléphone. */
  rappel?: "joue" | "unique";
  /** Partition (lot DP-D) : repères encadrés (lettre à l'encre, cadre de la couleur de section) à la place des pastilles rondes. */
  disposition?: Disposition;
  className?: string;
  /** Badges d'état propres au contexte (copie des paroles, version modifiée…). */
  children?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const groups = groupSteps(steps, (section) => formatSectionName(section, t));
  const pleine = new Set(groups.flatMap((g, i) => (g.uids.some((uid) => pleines?.has(uid)) ? [i] : [])));
  // Ordre joué : les groupes tout entiers avant la 1re étape de la page sont des points.
  const rangDe = new Map(steps.map((st, k) => [st.section.uid, k]));
  const debutPage = Math.min(...[...(pleines ?? [])].map((uid) => rangDe.get(uid) ?? Infinity));
  const point = new Set(
    rappel === "joue" && compacte && Number.isFinite(debutPage)
      ? groups.flatMap((g, i) => (!pleine.has(i) && Math.max(...g.uids.map((uid) => rangDe.get(uid) ?? -1)) < debutPage ? [i] : []))
      : [],
  );
  // Pastille aux couleurs de la section (palette --sec-* de globals.css) :
  // fond clair, lettre en couleur — les mêmes teintes que les cadres du corps.
  // Un Dp prend la couleur de sa section d'origine (« – R » : orange du refrain).
  const colorOf = (section: ChordProSection) => `var(--sec-${paletteKeyOf(section)})`;
  const tintOf = (section: ChordProSection) => `var(--sec-${paletteKeyOf(section)}-tint)`;
  // Nuances d'un groupe (plusieurs pour un Dp ×n), dans l'ordre : « mp ↗ → mf ».
  const nuancesOf = (g: { nuances: SectionNuance[] }) =>
    g.nuances.map((n, k) => (
      <Fragment key={k}>
        {k > 0 && <span aria-hidden="true" className="text-sm font-semibold leading-none text-muted-foreground">→</span>}
        <NuanceBadge nuance={n} variant="text" />
      </Fragment>
    ));
  // Notes et transitions : un numéro noir accroché à la pastille, repris
  // dans la liste sous le bandeau (quand le corps ne les porte pas).
  const notes = details ? groups.filter((g) => g.step.note || g.step.transition) : [];
  const noteNumber = new Map(notes.map((g, i) => [g, i + 1]));
  // Partition : la feuille de route de tête a la cote unique des repères de section (carré de 32 px, 30 au téléphone, trait de 2 px)
  // et leur police ; la taille du rappel compact (26 / 30 px) ne vaut que pour lui.
  const enPartition = disposition === "partition";
  // Feuille de route de tête (pas le rappel compact, pas la vue structure) : au bord du texte, comme les noms de section.
  const routePartition = enPartition && !compacte && !colonne;
  const petit = compacte;
  const policePartition = i18n.language === "zh-CN" ? zh_lyric_font.className : chord_font.className;
  const numberBadge = "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-xs font-bold leading-none text-background";
  return (
    <div
      className={`${className ?? ""} ${routePartition ? COLONNE_REPERES : ""}`}
      style={routePartition ? { paddingLeft: RETRAIT_PARTITION } : undefined}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        {/* Pastilles rondes ; la taille suit l'écran : 32 px sous 640 px (neuf étapes
            sur une rangée à 390 px), 44 px au-delà ; 24 px dans le rappel du mode
            louange. Non cliquables : pas de plancher tactile. */}
        <ol aria-label={t("songs.view.structure")} className={colonne ? "flex flex-col gap-2" : compacte || enPartition ? "flex flex-wrap items-start gap-1.5" : "flex flex-wrap items-start gap-x-1.5 gap-y-2 sm:gap-x-3 sm:gap-y-3"}>
          {groups.map((g, i) => {
            const targetKey = g.step.targetKey && g.step.targetKey !== songKey ? g.step.targetKey : undefined;
            const n = noteNumber.get(g);
            if (point.has(i)) {
              return (
                <li key={i} className="flex h-[26px] items-center px-[3px] sm:h-[30px]">
                  <span data-point title={g.full} className="block h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(g.step.section), opacity: 0.45 }} />
                </li>
              );
            }
            return (
              <li key={i} className={colonne ? "flex items-center gap-3" : `flex flex-col items-center ${compacte ? `gap-1 ${pleines && rappel === "unique" && !pleine.has(i) ? "max-sm:hidden" : ""}` : "gap-1.5"}`}>
                <span
                  data-pleine={pleine.has(i) || undefined}
                  data-repere-encadre={disposition === "partition" || undefined}
                  className={`relative inline-flex items-center justify-center ${enPartition ? `rounded-[5px] border-2 ${policePartition}` : "rounded-full"} ${
                    enPartition
                      ? "h-[30px] w-[30px] md:h-8 md:w-8"
                      : petit ? "h-[26px] min-w-[26px] px-1.5 sm:h-[30px] sm:min-w-[30px]" : "h-8 min-w-8 px-2 sm:h-11 sm:min-w-11 sm:px-2.5"
                  }`}
                  style={
                    disposition === "partition"
                      ? { borderColor: colorOf(g.step.section), color: "hsl(var(--foreground))", background: pleine.has(i) ? tintOf(g.step.section) : "transparent" }
                      : pleine.has(i)
                        ? { background: colorOf(g.step.section), color: "hsl(var(--background))" }
                        : { background: tintOf(g.step.section), color: colorOf(g.step.section) }
                  }
                >
                  {enPartition ? (
                    // Même cadre que les repères de section : au-delà de deux signes le corps baisse (11 / 12 px), plus long une ellipse.
                    <span className={`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-px font-bold leading-none ${g.abbr.length > 2 ? "text-[11px] md:text-xs" : "text-sm md:text-[15px]"}`}>
                      <abbr title={g.full} className="no-underline [text-decoration:none]">{g.abbr}</abbr>
                    </span>
                  ) : (
                    <span className={`inline-flex items-baseline font-bold leading-none tracking-[0.02em] ${petit ? "text-[13px] sm:text-[14px]" : "text-sm sm:text-lg"}`}>
                      <abbr title={g.full} className="no-underline [text-decoration:none]">{g.abbr}</abbr>
                      {g.repeat > 1 && <span className={`ml-px font-semibold leading-none ${petit ? "text-[10px]" : "text-xs sm:text-sm"}`}>×{g.repeat}</span>}
                    </span>
                  )}
                  {n !== undefined && (
                    <span aria-label={`${n}`} className={`absolute -right-1 -top-1 max-sm:h-4 max-sm:min-w-4 ${numberBadge}`}>{n}</span>
                  )}
                </span>
                {enPartition && g.repeat > 1 && <span className="text-[11px] font-semibold leading-none text-muted-foreground md:text-xs">×{g.repeat}</span>}
                {colonne ? (
                  // Nom, modulation et nuance passent à la ligne dans la largeur de la colonne.
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-semibold leading-tight text-foreground">{dpFullName(g.step.section, t) ?? g.full}</span>
                    {targetKey && <span className="font-mono text-xs leading-none text-muted-foreground">→ {targetKey}</span>}
                    {nuancesOf(g)}
                  </span>
                ) : (
                  <>
                    {targetKey && !compacte && <span className="font-mono text-xs leading-none text-muted-foreground">→ {targetKey}</span>}
                    {!compacte && g.nuances.length > 0 && <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5">{nuancesOf(g)}</span>}
                    {compacte && pleine.has(i) && g.nuances.length > 0 && (
                      <span className="inline-flex flex-wrap items-center justify-center gap-x-1 [&_span]:!text-[12px] [&_span]:!font-bold">{nuancesOf(g)}</span>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
        {children && <span className="ml-auto inline-flex flex-wrap items-center gap-2">{children}</span>}
      </div>
      {notes.length > 0 && (
        <ol className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm text-foreground/80">
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

// Repères (lot DP-B, finitions DP-E) : sigle de la section dans une pastille de sa couleur, « ×2 » dessous, filet vertical le
// long de la section. Gouttière FIXE pour toutes les sections d'un chant : 36 px au téléphone (pastille ronde de 24, filet à
// 3 px, texte à 6 px du filet), 56 px à partir de la tablette (pastille gélule de 44 × 38, sigle de 21 px, filet centré
// dessous). Au-delà de deux signes (« Int », « Inst »), le sigle passe à 11 px (15 px dès la tablette) au lieu d'élargir la
// pastille. Dès la tablette le filet ne se montre que s'il couvre au moins 24 px (jamais un bout isolé sous une section d'une
// rangée). Au-delà de trois signes (« Bénédiction », « 尾声 » écrits tels quels) le sigle est coupé par une ellipse dans la pastille. Au toucher la pastille ouvre le nom complet dans une petite bulle (cible de 44 × 44).
// Partition : retrait du texte = colonne de repères (`--rep-col`) moins ce qui se suspend dans la marge de la page (marge moins
// 8 px d'air avant le bord). `--marge-rep` force la marge : dans le mode louange, sa part hors encoche (1,5 rem, jamais sous
// l'encoche en paysage) ; 0 dans l'aperçu de la page suivante, qui coupe ce qui dépasse.
const RETRAIT_PARTITION = "max(0px, calc(var(--rep-col) - max(0px, var(--marge-rep, var(--marge-bande-g, var(--marge-bande, 0px))) - 8px)))";
// Cotes de la colonne de repères (planche `.mk28`) : 44 px (38 au téléphone) ; aperçu de la page suivante : rien de suspendu.
const COLONNE_REPERES = "[--rep-col:38px] md:[--rep-col:44px] [[data-apercu-suivant]_&]:[--marge-rep:0px]";
const FILET_EPAIS = new Set(["chorus", "postchorus", "outro", "final", "coda"]);
// Encre du sigle : celle qui contraste le plus avec la pastille (≥ 4,5:1). En clair, le pont (#7a5bcb), la fin et la
// coda (#4f6477), le tag (#bd476a) et le gris « autre » (#6b7280) prennent le blanc ; les autres et tout le thème sombre, l'encre #0e0e10.
const PASTILLE_FONCEE = new Set(["var(--sec-bridge)", "var(--sec-outro)", "var(--sec-coda)", "var(--sec-tag)", "var(--sec-other)"]);

/** Bulle du nom d'une section (Repères, Scène sous la tablette) : ouverte au toucher, fermée par un toucher dehors ou Échap. */
function useBulleNom() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOuvert(false); };
    // preventDefault : le mode louange (qui écoute window) ne doit pas se fermer sur cet Échap-là ; le second le ferme.
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setOuvert(false); } };
    document.addEventListener("pointerdown", dehors);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("pointerdown", dehors); document.removeEventListener("keydown", echap); };
  }, [ouvert]);
  return { ouvert, setOuvert, ref };
}

function GouttiereReperes({ sigle, nom, epais, repeat, sansFilet, fontClass }: { sigle: string; nom: string; epais: boolean; repeat: number; sansFilet: boolean; fontClass: string }) {
  const { ouvert, setOuvert, ref } = useBulleNom();
  const long = sigle.length > 2;
  return (
    <div
      ref={ref}
      data-copy-ignore
      data-repere-gouttiere
      className="relative"
      // Début du filet dès la tablette : sous la pastille (38 px) et, s'il y a un « ×2 », sous lui (16 px), 6 px d'air.
      style={{ "--filet-haut": repeat > 1 ? "60px" : "44px" } as React.CSSProperties}
    >
      <div className="flex w-6 flex-col items-center md:w-11">
        <button
          type="button"
          title={nom}
          onClick={() => setOuvert((o) => !o)}
          data-repere-pastille
          // Cible de toucher de 44 × 44 : un pseudo-élément transparent centré sur la pastille.
          className={`relative inline-flex h-6 w-6 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-full font-bold leading-none before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] md:h-[38px] md:w-11 ${long ? "text-[11px] md:text-[15px]" : "text-[14px] md:text-[21px]"} ${fontClass}`}
          style={{ background: "var(--rep-c)", color: "var(--rep-encre)" }}
        >
          <span aria-hidden="true" data-repere-sigle className={sigle.length > 3 ? "min-w-0 max-w-full overflow-hidden text-ellipsis" : undefined}>{sigle}</span>
          <span className="sr-only">{nom}</span>
        </button>
        {repeat > 1 && (
          <span aria-hidden="true" data-repere-repeat className="mt-0.5 text-[13px] font-semibold leading-none text-foreground md:text-sm">×{repeat}</span>
        )}
      </div>
      {!sansFilet && (
        <span
          aria-hidden="true"
          data-repere-filet
          // Téléphone : à droite de la pastille, de haut en bas (texte à 6 px du filet, 3 ou 5 px). Tablette : centré sous elle,
          // et masqué tant que la section ne lui laisse pas 24 px (la hauteur s'annule sous ce seuil).
          className={`absolute bottom-1 top-0 rounded-[3px] md:bottom-auto md:top-[var(--filet-haut)] md:h-[clamp(0px,calc((100%-var(--filet-haut)-28px)*1000),calc(100%-var(--filet-haut)-4px))] ${epais ? "left-[25px] w-[5px] md:left-[19.5px]" : "left-[27px] w-[3px] md:left-[20.5px]"}`}
          style={{ background: "var(--rep-c)" }}
        />
      )}
      {ouvert && (
        <span aria-hidden="true" data-repere-bulle className="absolute left-full top-0 z-30 ml-1 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md">
          {nom}
        </span>
      )}
    </div>
  );
}

/** Colonne de gauche d'une bande de la disposition Scène : grande lettre (26 px, 32 px dès la tablette ; 20 / 26 px pour trois
 *  signes ; 16 / 20 px au-delà, coupée par une ellipse si elle ne tient pas dans la colonne), « ×2 » dessous, puis le nom de la section (dès la tablette seulement ; en dessous,
 *  un toucher sur la lettre l'ouvre dans la même bulle que les Repères). */
function ColonneScene({ sigle, label, nomComplet, repeat, nomVisible, police }: { sigle: string; label: string; nomComplet: string; repeat: number; nomVisible: boolean; police: string }) {
  const { ouvert, setOuvert, ref } = useBulleNom();
  const bouton = useRef<HTMLButtonElement>(null);
  // Cotes larges : la lettre n'est plus qu'une étiquette (CSS : pointer-events none) ; elle sort alors de la tabulation. L'état est
  // lu sur le rendu (la bande est un conteneur : sa largeur décide), jamais recalculé à part.
  const [inerte, setInerte] = useState(false);
  useLayoutEffect(() => {
    const cadre = ref.current?.closest("[data-scene-cadre]");
    if (!cadre) return;
    const lire = () => setInerte(!!bouton.current && getComputedStyle(bouton.current).pointerEvents === "none");
    lire();
    const obs = new ResizeObserver(lire);
    obs.observe(cadre);
    return () => obs.disconnect();
  }, [ref]);
  const taille = sigle.length > 3 ? "overflow-hidden text-ellipsis text-[16px] scene-large:text-[20px]" : sigle.length > 2 ? "text-[20px] scene-large:text-[26px]" : "text-[26px] scene-large:text-[32px]";
  return (
    <div ref={ref} data-copy-ignore data-scene-colonne title={nomComplet} className="relative min-w-0">
      <button ref={bouton} type="button" data-scene-bouton disabled={inerte} onClick={() => setOuvert((o) => !o)} className="relative block max-w-full text-left leading-none before:absolute before:left-1/2 before:top-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 scene-large:pointer-events-none scene-large:cursor-default scene-large:before:hidden">
        <span aria-hidden="true" data-scene-lettre className={`block whitespace-nowrap font-bold leading-none ${taille} ${police}`} style={{ color: "var(--scene-lettre)" }}>{sigle}</span>
        {repeat > 1 && <span aria-hidden="true" data-scene-repeat className="mt-1 block text-[13px] font-semibold leading-none scene-large:text-sm" style={{ color: "var(--scene-nom)" }}>×{repeat}</span>}
        <span className="sr-only">{nomComplet}</span>
      </button>
      {nomVisible && (
        <span aria-hidden="true" data-scene-nom className={`mt-[5px] hidden text-xs leading-tight scene-large:block ${police}`} style={{ color: "var(--scene-nom)" }}>{label}</span>
      )}
      {ouvert && (
        <span aria-hidden="true" data-repere-bulle className="absolute left-full top-0 z-30 ml-1 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md scene-large:hidden">
          {nomComplet}
        </span>
      )}
    </div>
  );
}

interface SectionViewProps {
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
  /** Disposition de la partition (dispositionPref.ts) : « sections » = couleur par type de section, cadre gris fin,
   *  accords neutres ; « reperes » = pastille et filet dans une gouttière, sans cadre ; « classique » = cadre de la
   *  couleur de langue. Partition : rendu classique en attendant sa tranche. */
  disposition?: Disposition;
  /** Mode édition setlist : rend chaque ligne tappable (ouvre la sheet d'édition). */
  onLineSelect?: (line: ChordProLine, sectionUid?: string) => void;
  /** Taille des badges de nuances (« lg » en mode louange). */
  nuanceSize?: "sm" | "lg";
  /** Vue structure : passages identiques repliés (« Refrain ×2 »). */
  repeat?: number;
  /** Occurrences de la structure jouée que cette impression représente
   *  (`data-section-uids`) : le sommaire s'en sert pour y aller et se marquer. */
  occurrenceUids?: string[];
  /** Sorte de section dont le bloc emprunte la couleur du cadre (un Dp prend
   *  celle de son origine, en Structure seule du mode louange). */
  couleurDe?: string;
  /** Slug du chant (exceptions de mots chinois, motsChinois.ts) ; absent : segmentation seule. */
  slug?: string;
  /** Ma partition : signes des lignes, par `srcLine` (`data-marque` sur la ligne). */
  marques?: Marques;
  /** Conflit « Le chant a changé ici » : sans elle, les deux versions se montrent sans boutons. */
  onConflit?: (index: number, choix: "mienne" | "chant") => void;
  /** Crayon, pour qui règle le culte : « Passer au culte » sous chaque ligne que j'ai retouchée (`srcLine`). */
  onPasserAuCulte?: (srcLine: number) => void;
}

export function SectionView({ section, language, showChords, showPinyin, useJianpu, hideLyrics = false, note, nuance, keyChange, songSourceLabel, typography = "web", disposition = "classique", onLineSelect, nuanceSize = "sm", repeat = 1, occurrenceUids, couleurDe, slug, marques, onConflit, onPasserAuCulte }: SectionViewProps) {
  const isPdfTypo = typography === "pdf";
  const { t, i18n } = useTranslation();
  const isZh = language === "zh";
  const uiIsZh = i18n.language === "zh-CN";
  const label = formatSectionName(section, t);
  // Ossature seule (paroles ET accords masqués) : pas de corps, donc ni marge
  // sous le libellé ni padding bas plus grand que le haut — le libellé reste
  // centré dans son cadre, même agrandi en vue structure.
  const bodyHidden = hideLyrics && !showChords;
  const nomComplet = [
    label + (repeat > 1 ? ` ×${repeat}` : ""),
    keyChange ? t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange }) : "",
  ].filter(Boolean).join(" · ");
  // Ce que portait la rangée d'intitulé en plus du nom (Repères : une ligne fine en tête du corps).
  const aSuite = songSourceLabel || note || (nuance && (nuance.tags.length > 0 || nuance.note));
  // Partition : la modulation a sa place dans la rangée d'intitulé ; Repères et Scène la portent dans cette ligne fine.
  const suite = (disposition === "partition" ? aSuite : disposition === "reperes" || disposition === "scene" ? aSuite || keyChange : false) ? (
    <>
      {disposition !== "partition" && keyChange && <span className="font-semibold">{t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange })}</span>}
      {songSourceLabel && <span className="font-normal text-muted-foreground">{songSourceLabel}</span>}
      {note && <span className="font-normal text-muted-foreground">{note}</span>}
      {nuance && (nuance.tags.length > 0 || nuance.note) && <NuanceBadge nuance={nuance} size={nuanceSize} />}
    </>
  ) : null;
  // Lignes — corps vide quand paroles ET accords masqués (ossature seule).
  const corps = !bodyHidden ? (
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
              slug={slug}
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
              ecartApres={!isPdfTypo && section.type !== "intro" && sansParoles(line.tokens) && avecParoles(section.lines[i + 1]?.tokens)}
            />
          );
        }

        const m = marques && (marques[line.srcLine ?? -1] ?? marques[line.pinyinSrcLine ?? -1]);
        // Mode édition : la ligne devient une cible tactile qui ouvre la sheet.
        if (onLineSelect && line.srcLine !== undefined) {
          return (
            <Fragment key={i}>
              <div
                role="button"
                tabIndex={0}
                data-marque={m?.marque}
                data-retouche={m?.retouche}
                onClick={() => onLineSelect(line, section.uid)}
                onKeyDown={(e) => e.key === "Enter" && onLineSelect(line, section.uid)}
                className="cursor-pointer rounded-md -mx-1.5 px-1.5 border border-dashed border-primary/25 hover:border-primary/60 hover:bg-primary/5 active:bg-primary/10 transition-colors my-0.5 print:border-transparent print:bg-transparent print:mx-0 print:px-0 print:my-0"
              >
                {/* Édition : toucher la ligne ouvre la feuille d'édition, jamais le panneau d'un accord. */}
                <AccordsInactifs>{rendered}</AccordsInactifs>
              </div>
              {m?.marque === "moi" && onPasserAuCulte && (
                <button
                  type="button"
                  data-copy-ignore
                  className="mb-1 inline-flex h-11 items-center gap-1 text-xs font-semibold no-underline print:hidden"
                  style={{ color: "var(--graphite)" }}
                  onClick={() => onPasserAuCulte(line.srcLine!)}
                >
                  <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
                  {t("maPartition.crayon.passerAuCulte")}
                </button>
              )}
            </Fragment>
          );
        }
        if (!m) return <div key={i}>{rendered}</div>;
        const bouton = `${TOUCHER_44} h-8 rounded-full border border-border bg-background px-3 text-xs font-semibold hover:bg-secondary`;
        return (
          <Fragment key={i}>
            {m.conflit?.debut && (
              <div data-conflit-mention data-copy-ignore className="my-1 flex flex-wrap items-center gap-2 text-xs print:hidden">
                <span className="font-semibold">{t("maPartition.conflit")}</span>
                {onConflit && (
                  <>
                    <button type="button" className={bouton} onClick={() => onConflit(m.conflit!.index, "mienne")}>{t("maPartition.garderLaMienne")}</button>
                    <button type="button" className={bouton} onClick={() => onConflit(m.conflit!.index, "chant")}>{t("maPartition.prendreCelleDuChant")}</button>
                  </>
                )}
              </div>
            )}
            <div data-marque={m.marque} data-conflit={m.conflit?.cote} data-retouche={m.retouche}>{rendered}</div>
          </Fragment>
        );
      })}
    </div>
  ) : null;
  if (disposition === "reperes") {
    const couleurRepere = CHART_TYPE_COLOR[couleurDe ?? sectionColorKind(section)] ?? "var(--sec-other)";
    return (
      <div
        data-section
        data-section-uids={occurrenceUids?.join(" ")}
        data-repere
        className="mb-[22px] md:mb-[30px] print:mb-4 grid grid-cols-[36px_minmax(0,1fr)] md:grid-cols-[56px_minmax(0,1fr)] [--rep-p:24px] md:[--rep-p:38px]"
        style={{ breakInside: "avoid", "--sec-c": LANG_THEME[isZh ? "zh" : "fr"].accent, "--rep-c": couleurRepere, "--rep-encre": PASTILLE_FONCEE.has(couleurRepere) ? "var(--rep-encre-claire)" : "#0e0e10" } as React.CSSProperties}
      >
        <GouttiereReperes
          sigle={abbreviateSection(section)}
          nom={nomComplet}
          epais={FILET_EPAIS.has(couleurDe ?? sectionColorKind(section))}
          repeat={repeat}
          sansFilet={bodyHidden}
          fontClass={uiIsZh ? zh_lyric_font.className : chord_font.className}
        />
        {bodyHidden ? (
          <div data-copy-ignore className="flex min-h-[var(--rep-p)] min-w-0 flex-wrap items-center gap-x-2 text-sm font-semibold">
            {/* Le nom sans la modulation : la ligne de suite la porte. */}
            <span>{label + (repeat > 1 ? ` ×${repeat}` : "")}</span>
            {suite}
          </div>
        ) : (
          <div className="min-w-0">
            {suite && <div data-copy-ignore className="mb-1 flex flex-wrap items-center gap-x-2 text-xs">{suite}</div>}
            {corps}
          </div>
        )}
      </div>
    );
  }
  if (disposition === "partition") {
    // Partition (lot DP-D) : page gravée, sans fond ni cadre de section. Chaque section s'ouvre sur une rangée : repère
    // encadré (lettre à l'encre, cadre de la couleur de section), nom en casse normale, « ×2 », modulation, source,
    // note et nuance ; le corps suit en pleine largeur de colonne, les sections se séparent par du blanc.
    const couleurPartition = CHART_TYPE_COLOR[couleurDe ?? sectionColorKind(section)] ?? "var(--sec-other)";
    const police = uiIsZh ? zh_lyric_font.className : chord_font.className;
    const sigle = abbreviateSection(section);
    // Colonne de repères (planche, `.mk28`) : carré de 32 px (30 au téléphone), trait de 2 px, SUSPENDU dans la marge gauche de la page
    // (colonne de 44 px, 38 au téléphone) ; le texte et le nom partent d'un même retrait. La marge disponible est `--marge-bande`
    // (celle de la page : 16 px sur la page du chant, 24 px en mode louange, rien en deux colonnes ni à l'impression), en gardant 8 px
    // d'air avant le bord de la page : ce qui manque des 44 px reste dans le flux (retrait `--rep-p`), jamais de débordement horizontal.
    return (
      <div
        data-section
        data-section-uids={occurrenceUids?.join(" ")}
        data-partition
        className={`relative mb-5 [--rep-h:30px] md:[--rep-h:32px] print:mb-4 ${COLONNE_REPERES}`}
        style={{
          breakInside: "avoid",
          "--sec-c": LANG_THEME[isZh ? "zh" : "fr"].accent,
          "--rep-c": couleurPartition,
          // Les accords restent bleus, en chinois aussi (Scène et Partition ; Repères garde la couleur de la langue).
          "--jianpu-color": "var(--chord-color)",
          "--rep-p": RETRAIT_PARTITION,
          paddingLeft: "var(--rep-p)",
        } as React.CSSProperties}
      >
        <div data-copy-ignore data-partition-rangee className={`flex min-h-[var(--rep-h)] flex-wrap items-center gap-x-2.5 gap-y-1 ${bodyHidden ? "" : "mb-1"}`}>
          <span
            data-repere-encadre
            title={nomComplet}
            aria-hidden="true"
            className={`absolute top-0 grid h-[var(--rep-h)] w-[var(--rep-h)] select-none place-items-center overflow-hidden rounded-[5px] border-2 text-sm font-bold leading-none text-foreground md:text-[15px] ${police}`}
            style={{ borderColor: "var(--rep-c)", left: "calc(var(--rep-p) - var(--rep-col))" }}
          >
            {/* Au-delà de deux signes, le corps du sigle baisse (jamais d'élargissement du cadre) ; plus long, une ellipse. */}
            <span className={`block max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-px ${sigle.length > 2 ? "text-[11px] md:text-xs" : ""}`}>{sigle}</span>
          </span>
          <span data-partition-nom className={`text-[13px] font-medium text-muted-foreground md:text-[15px] ${police}`}>
            {label}
            {repeat > 1 && <span className="ml-1">×{repeat}</span>}
          </span>
          {keyChange && (
            <span data-partition-modulation className="text-[13px] font-semibold text-muted-foreground md:text-sm">
              {t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange })}
            </span>
          )}
          {suite && <span className="flex flex-wrap items-center gap-x-2 text-xs">{suite}</span>}
        </div>
        {corps}
      </div>
    );
  }
  if (disposition === "scene") {
    // Scène (lot DP-C, cotes de la planche B en DP-E) : une bande pleine largeur teintée, filet de 6 px de la couleur de section,
    // colonne de lettre de 40 px au téléphone, 64 px dès la tablette. La bande sort des marges de la page (`--marge-bande`)
    // et les bandes se joignent par un filet de 1 px. Lettre : 70 % de la couleur mêlée de noir en clair (AA sur la teinte),
    // la couleur telle quelle en sombre ; la teinte `--sec-*-tint` suit le thème de l'appareil.
    const couleurScene = CHART_TYPE_COLOR[couleurDe ?? sectionColorKind(section)] ?? "var(--sec-other)";
    const police = uiIsZh ? zh_lyric_font.className : chord_font.className;
    return (
      <div
        data-scene-cadre
        className="[container-type:inline-size]"
        style={{
          breakInside: "avoid",
          marginLeft: "calc(-1 * var(--marge-bande-g, var(--marge-bande, 0px)))",
          marginRight: "calc(-1 * var(--marge-bande-d, var(--marge-bande, 0px)))",
        }}
      >
        <div
          data-section
          data-section-uids={occurrenceUids?.join(" ")}
          data-scene
          className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 border-b border-b-[#d1d1d6] pb-[6px] pl-[10px] pr-[22px] pt-3 dark:border-b-[#3a3a3c] scene-large:grid-cols-[64px_minmax(0,1fr)] scene-large:gap-x-[18px] scene-large:pb-[10px] scene-large:pl-[18px] scene-large:pr-7 scene-large:pt-4 [--scene-lettre:color-mix(in_srgb,var(--rep-c)_70%,black)] dark:[--scene-lettre:var(--rep-c)]"
          style={{
            breakInside: "avoid",
            "--sec-c": LANG_THEME[isZh ? "zh" : "fr"].accent,
            "--rep-c": couleurScene,
            // Les accords restent bleus, en chinois aussi (Repères et Partition gardent la couleur de la langue).
            "--jianpu-color": "var(--chord-color)",
            "--scene-nom": `color-mix(in srgb, hsl(var(--foreground)) 72%, ${couleurScene.replace(")", "-tint)")})`,
            background: couleurScene.replace(")", "-tint)"),
            borderLeft: "6px solid var(--rep-c)",
          } as React.CSSProperties}
        >
          <ColonneScene sigle={abbreviateSection(section)} label={label} nomComplet={nomComplet} repeat={repeat} nomVisible={!bodyHidden} police={police} />
          {bodyHidden ? (
            <div data-copy-ignore className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm font-semibold">
              <span data-scene-nom-ligne>{label}</span>
              {suite}
            </div>
          ) : (
            // Retrait droit de la bande : 22 px au téléphone. La coupure laisse un vers déborder de 8 px au plus (DEBORD) ;
            // il garde donc 14 px d'air avant le bord de l'écran, sans toucher à la coupure.
            <div className="min-w-0">
              {suite && <div data-copy-ignore className="mb-1 flex flex-wrap items-center gap-x-2 text-xs">{suite}</div>}
              {corps}
            </div>
          )}
        </div>
      </div>
    );
  }
  return (
    <div data-section data-section-uids={occurrenceUids?.join(" ")} className="mb-5 print:mb-4" style={{ breakInside: "avoid", ...(disposition === "sections" ? getChartSectionStyle(couleurDe ?? sectionColorKind(section)) : getSectionStyle(couleurDe ?? section.type, isZh)), ...(bodyHidden ? { paddingBottom: 10 } : null) }}>
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
        <span className={`text-xs font-semibold tracking-normal ${uiIsZh ? zh_lyric_font.className : chord_font.className}`}
              style={{ color: "var(--sec-c, #6b7080)" }}>
          {label}
          {repeat > 1 && <span className="ml-1 normal-case">×{repeat}</span>}
          {keyChange && (
            <span className="ml-2 normal-case tracking-normal text-xs font-bold" style={{ color: "var(--sec-c, currentColor)" }}>
              {t("setlists.detail.sectionKeyChange", { defaultValue: "升调 ({{key}})", key: keyChange })}
            </span>
          )}
          {songSourceLabel && (
            <span className="ml-2 text-xs font-normal normal-case tracking-normal" style={{ color: "var(--sec-c, currentColor)", opacity: 0.7 }}>
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
      {corps}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SongView
// ---------------------------------------------------------------------------

interface SongViewProps {
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
  /** Disposition de la partition (dispositionPref.ts). */
  disposition?: Disposition;
  /** Mode édition setlist : rend chaque ligne tappable (ouvre la sheet d'édition). */
  onLineSelect?: (line: ChordProLine, sectionUid?: string) => void;
  /** Coup d'œil : ordre joué (défaut), chaque section une fois, ou bandeau seul. */
  layout?: PartitionLayout;
  /** Structure perso (docs/spec-version-perso.md) : le corps la suit telle
   *  quelle, sans notes ni transitions d'occurrence ; le bandeau garde la
   *  structure jouée. */
  bodyStructure?: string[] | null;
  /** Dans une setlist : le titre mène à la page du chant, dans ses réglages
   *  (docs/spec-deux-volets.md, Q12). */
  titleHref?: LinkProps["href"];
  /** Commande posée à droite des pastilles (page chant : le segment
   *  « 简谱 · Paroles », chantier 简谱 L3-T3). */
  bascule?: React.ReactNode;
  /** Remplace le corps (sections) sous l'en-tête et le bandeau : le scan 简谱
   *  garde ainsi l'en-tête du site au-dessus de lui (K3). */
  corps?: React.ReactNode;
  /** Sous la rangée titre / pastille de l'en-tête (page chant : la ligne de statistiques, lot ST4). */
  statistiques?: React.ReactNode;
  /** Page chant (lot JE, JE3) : sous-titre, référence biblique et ligne « 1= · mesure · ♩ » dans l'en-tête.
   *  Une seule colonne à toutes les tailles (Timothée, 31/10/2026 : les deux colonnes A2 sont retirées). */
  pageChant?: boolean;
  /** Slug du chant (exceptions de mots chinois, motsChinois.ts) ; absent : segmentation seule. */
  slug?: string;
  /** Ma partition : signes des lignes par `srcLine` (docs/spec-ma-partition.md, « Signes »), et règlement des conflits. */
  marques?: Marques;
  onConflit?: (index: number, choix: "mienne" | "chant") => void;
  onPasserAuCulte?: (srcLine: number) => void;
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
  disposition = "classique",
  onLineSelect,
  layout = "played",
  bodyStructure = null,
  titleHref,
  bascule,
  corps,
  statistiques,
  pageChant = false,
  slug,
  marques,
  onConflit,
  onPasserAuCulte,
}: SongViewProps) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { resolvedTheme } = useTheme();
  const couleursAccords = useCouleursAccords(loading ? undefined : user?.uid ?? null, resolvedTheme === "dark" ? "dark" : "light", disposition);
  const isZh = ast.metadata.language === "zh";
  const canUseJianpu = isZh && useJianpu;
  const langAccent = isZh ? "var(--jianpu-color)" : "var(--chord-color)";
  const sections = ordreJoue(ast.sections, canUseJianpu ? null : structureOverride);
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
  // Ligne sous la pastille de la page chant : « 1=D · 4/4 · ♩ = 66 » sur le scan, « 4/4 · ♩ = 66 » en paroles.
  const ligneTempo: React.ReactNode[] = [];
  if (pageChant) {
    if (corps !== undefined && ast.metadata.key) ligneTempo.push(`1=${ast.metadata.key}`);
    if (ast.metadata.time) ligneTempo.push(ast.metadata.time);
    if (ast.metadata.tempo) {
      ligneTempo.push(
        <span key="tempo">
          <span className="text-foreground/70">♩</span>
          {`\u202f=\u202f${ast.metadata.tempo}`}
        </span>
      );
    }
  }
  // Lignes de crédit (auteur, référence biblique) : Atkinson d'abord, Source Han seulement pour les caractères
  // chinois (Atkinson n'en a aucun) ; sans cela le latin d'un nom prenait la graisse Medium du chinois.
  const pileCredit: React.CSSProperties | undefined = isZh
    ? { fontFamily: `${chord_font.style.fontFamily}, ${zh_lyric_font.style.fontFamily}` }
    : undefined;
  // Partition (lot DP-D) : titre centré en serif, tempo et tonalité à gauche, compositeur en italique à droite. Sur la
  // page du chant l'en-tête du site reste tel quel : seule la partition prend la disposition.
  const titrePartition = titleHref ? (
    <Link href={titleHref} className="hover:underline underline-offset-4 decoration-2">{ast.metadata.title}</Link>
  ) : ast.metadata.title;
  const enTetePartition = (
      <div data-entete-partition className="mb-0 pb-3 print:mb-3 border-b border-border">
        <h1 data-titre-partition className={`text-center text-2xl md:text-[30px] font-bold leading-[1.15] text-foreground ${isZh ? KaiTiFont.className : gelasio_font.className}`}>
          {titrePartition}
        </h1>
        {ast.metadata.titlePinyin && (
          <p className={`text-center text-muted-foreground text-sm mt-0.5 ${pinyin_font.className}`}>{ast.metadata.titlePinyin}</p>
        )}
        <div className="mt-2 flex items-start justify-between gap-4">
          <div data-partition-tempo data-testid={ast.metadata.tempo ? "ligne-tempo" : undefined} className={`min-w-0 text-[15px] font-bold leading-[1.3] ${chord_font.className}`}>
            {ast.metadata.tempo ? <span><TempoPartition tempo={ast.metadata.tempo} /></span> : null}
            {ast.metadata.key && (
              <small className="block text-sm font-normal text-muted-foreground">{t("performance.key")} {ast.metadata.key}</small>
            )}
          </div>
          {/* Compositeur chinois : police des paroles (KaiTi-titres n'a que les caractères des titres), jamais d'italique synthétique. */}
          <p data-partition-compositeur data-testid="auteur" className={`max-w-[55%] text-right text-[15px] leading-[1.3] text-foreground/80 ${isZh ? zh_lyric_font.className : `italic ${gelasio_font.className}`}`} style={pileCredit}>
            {ast.metadata.artist}
          </p>
        </div>
        {canUseJianpu && structureOverride && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
            {t("songs.view.jianpuWarning")}
          </p>
        )}
      </div>
  );
  const enTete = disposition === "partition" && !pageChant ? enTetePartition : (
      <div className="mb-0 pb-3 print:mb-3 border-b border-border">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className={`text-xl md:text-2xl font-bold text-foreground leading-[1.05] tracking-[-0.02em] ${isZh ? KaiTiFont.className : chord_font.className}`}>
              {titleHref ? (
                <Link href={titleHref} className="hover:underline underline-offset-4 decoration-2">
                  {ast.metadata.title}
                </Link>
              ) : (
                ast.metadata.title
              )}
            </h1>
            {ast.metadata.titlePinyin && (
              <p className={`text-muted-foreground text-sm mt-1 ${pinyin_font.className}`}>
                {ast.metadata.titlePinyin}
              </p>
            )}
            {pageChant && ast.metadata.subtitle && (
              <p data-testid="sous-titre" className={`text-muted-foreground text-sm mt-1 ${pinyin_font.className}`}>
                {ast.metadata.subtitle}
              </p>
            )}
            <p data-testid="auteur" className={`text-muted-foreground text-xs leading-4 mt-2 ${chord_font.className}`} style={pileCredit}>
              {ast.metadata.artist}
            </p>
            {pageChant && ast.metadata.bible && (
              <p data-testid="reference-biblique" className={`text-muted-foreground/80 text-xs mt-0.5 ${chord_font.className}`} style={pileCredit}>
                {ast.metadata.bible}
              </p>
            )}
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
            {pageChant ? (
              ligneTempo.length > 0 && (
                <span data-testid="ligne-tempo" className="text-foreground/70 text-xs md:text-sm font-medium flex flex-wrap items-baseline justify-end gap-x-1 whitespace-nowrap">
                  {ligneTempo.map((element, i) => (
                    <Fragment key={i}>
                      {i > 0 && <span aria-hidden="true">{" · "}</span>}
                      {element}
                    </Fragment>
                  ))}
                </span>
              )
            ) : (
              ast.metadata.tempo && (
                <span className="text-muted-foreground text-xs font-medium flex items-baseline gap-0.5">
                  <span className="text-foreground/70 text-base leading-none">♩</span>
                  {` = ${ast.metadata.tempo}`}
                </span>
              )
            )}
          </div>
        </div>

        {statistiques && <div className="print:hidden">{statistiques}</div>}

        {canUseJianpu && structureOverride && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
            {t("songs.view.jianpuWarning")}
          </p>
        )}
      </div>
  );
  const bandeau = (
      <>
      {/* Bandeau de structure (coup d'œil) : notes et transitions y passent
          dès que le corps ne les porte plus (sections uniques, structure seule,
          structure perso — même en ordre joué, défaut depuis le 20/09/2026). */}
      {/* Sur le scan (`corps`), le bandeau porte seul notes, transitions et nuances. */}
      <StructureStrip steps={steps} songKey={ast.metadata.key} disposition={disposition} details={corps !== undefined || layout !== "played" || personalSteps !== null} className="pt-2 pb-3">
        {bascule}
      </StructureStrip>
      </>
  );
  return (
    <ConteneurCoupure className="max-w-[var(--colonne-partition,42rem)] print:max-w-none" disposition={disposition} style={couleursAccords}>
      {enTete}
      {bandeau}

      {/* Corps : ordre joué, ou chaque section une fois (les réglages
          d'occurrence restent dans le bandeau), ou rien du tout — ou le scan. */}
      {corps ?? <div>
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
                disposition={disposition}
                onLineSelect={onLineSelect}
                occurrenceUids={uids}
                slug={slug}
                marques={marques}
                onConflit={onConflit}
                onPasserAuCulte={onPasserAuCulte}
              />
              {withDetails && step.transition && <TransitionNote text={step.transition} />}
            </div>
          );
        })}
      </div>}
    </ConteneurCoupure>
  );
}