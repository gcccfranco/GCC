import { Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { ChordProAST, ChordProSection } from "@/types/chordPro";
import { ordreJoue } from "@/lib/chordpro/structure";
import { altSpellingKey, semitonesTo, transposeLabel } from "@/lib/transpose";
import { transposeSection } from "@/lib/transposeAST";
import type { JianpuChords as JianpuRetouches, SectionNuance } from "@/types/setList";
import { cleJouee, type JianpuChordLabel, type JianpuChords, type JianpuPage } from "@/lib/jianpu/images";
import { type PdfSectionStyle, BLUE_THEME, RED_THEME, C, footerLabelFont } from "@/components/pdf/song/lignes";
import { TransitionPDFBlock, SectionBlock, OrdreLine, CompactStrip, CompactBody } from "@/components/pdf/song/sections";

// ─── Page ─────────────────────────────────────────────────────────────────────

export interface SongPDFProps {
  ast: ChordProAST;
  showChords: boolean;
  showPinyin: boolean;
  useJianpu?: boolean;
  structureOverride?: string[] | null;
  sectionNotes?: Record<string, string>;
  sectionTransitions?: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Modulation (升调) par section : uid → tonalité cible d'affichage. */
  sectionKeys?: Record<string, string>;
  /** Optional override for the footer center label (e.g. setlist title). */
  footerCenter?: string;
  language?: string;
  sectionStyle?: PdfSectionStyle;
  /** « unique » (PDF compact) : bandeau à la place de la ligne ORDRE, puis
   *  chaque section une fois — comme la vue partitions en « Sections uniques ». */
  layout?: "played" | "unique";
  /** Transition de la setlist jouée après ce chant (compact) : en bas de page. */
  trailingTransition?: string;
}

export function SongPDFPage({
  ast,
  showChords,
  showPinyin,
  useJianpu = false,
  structureOverride = null,
  sectionNotes = {},
  sectionTransitions = {},
  sectionNuances = {},
  sectionKeys = {},
  footerCenter,
  language = "fr",
  sectionStyle = "classic",
  layout = "played",
  trailingTransition,
}: SongPDFProps) {
  const isZh = ast.metadata.language === "zh";
  const uiLang = language;
  const canUseJianpu = isZh && useJianpu;
  const theme = isZh ? RED_THEME : BLUE_THEME;
  const { title, titlePinyin, artist, key, jianpuKey, tempo } = ast.metadata;
  const displayKey = canUseJianpu ? (jianpuKey ?? `1=${key}`) : key;

  const sections: ChordProSection[] = ordreJoue(ast.sections, canUseJianpu ? null : structureOverride);

  const titleFont = isZh ? "KaiTi" : "SpaceGrotesk";
  const metaFont = isZh ? "SourceHanSansCN" : "SpaceGrotesk";
  const centerLabel = footerCenter ?? title;
  const centerLabelFont = footerLabelFont(centerLabel);
  return (
    <Page size="A4" style={styles.page}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Top row: title + key badge */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Left: title block */}
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ fontSize: 26, fontWeight: 700, color: C.title,
                           fontFamily: titleFont, lineHeight: 1.1, marginBottom: 2 }}>
              {title}
            </Text>
            {titlePinyin && (
              <Text style={{ fontSize: 11, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300,
                             marginBottom: 2 }}>
                {titlePinyin}
              </Text>
            )}
            {artist && (
              <Text style={{ fontSize: 11, color: C.subtitle, fontFamily: metaFont, fontWeight: 300 }}>
                {artist}
              </Text>
            )}
          </View>
          {/* Right: key badge + tempo */}
          <View style={{ alignItems: "flex-end", gap: 5, paddingTop: 2 }}>
            {displayKey && (
              <View style={{ borderWidth: 1.5, borderColor: theme.accent, borderRadius: 20,
                             paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, fontSize: 13,
                               color: theme.accent }}>
                  {displayKey}
                </Text>
              </View>
            )}
            {tempo && (
              <Text style={{ fontFamily: "DejaVuSans", fontSize: 11, color: C.subtitle }}>
                {`♩ = ${tempo}`}
              </Text>
            )}
          </View>
        </View>

        {/* Horizontal rule */}
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 10, marginBottom: 0 }} />
      </View>

      {layout === "unique" ? (
        <CompactBody
          sections={sections}
          item={{ sectionNotes, sectionTransitions, sectionNuances, sectionKeys }}
          songKey={ast.metadata.key}
          isZh={isZh}
          useJianpu={canUseJianpu}
          showChords={showChords}
          showPinyin={isZh ? showPinyin : false}
          theme={theme}
          uiLang={uiLang}
          sectionStyle={sectionStyle}
        />
      ) : (<>
      {/* ── ORDRE line ── */}
      <OrdreLine sections={sections} theme={theme} uiLang={uiLang} isZh={isZh} />

      {/* ── Sections ── */}
      {(() => {
        const occ: Record<string, number> = {};
        return sections.flatMap((section, i) => {
          const idx = occ[section.id] ?? 0;
          occ[section.id] = idx + 1;
          const key = idx === 0 ? section.id : `${section.id}:${idx}`;
          const note = sectionNotes[section.uid] ?? sectionNotes[key] ?? sectionNotes[section.id];
          const transition = sectionTransitions[section.uid] ?? sectionTransitions[key] ?? sectionTransitions[section.id];
          const nuance = sectionNuances[section.uid] ?? sectionNuances[key] ?? sectionNuances[section.id];
          // Modulation (升调) : la section s'affiche transposée dans sa tonalité cible.
          const targetKey = sectionKeys[section.uid] ?? sectionKeys[key] ?? sectionKeys[section.id];
          const keyChange = targetKey && targetKey !== ast.metadata.key ? targetKey : undefined;
          const shownSection = keyChange && ast.metadata.key
            ? transposeSection(section, semitonesTo(ast.metadata.key, keyChange), keyChange)
            : section;
          const items = [
            <SectionBlock
              key={`${section.uid ?? section.id}-${i}`}
              section={shownSection}
              isZh={isZh}
              useJianpu={canUseJianpu}
              showChords={showChords}
              showPinyin={isZh ? showPinyin : false}
              note={note}
              nuance={nuance}
              keyChange={keyChange}
              theme={theme}
              uiLang={uiLang}
              sectionStyle={sectionStyle}
            />,
          ];
          if (transition) items.push(<TransitionPDFBlock key={`tr-${section.uid ?? section.id}-${i}`} text={transition} />);
          return items;
        });
      })()}
      </>)}

      {trailingTransition ? <TransitionPDFBlock text={trailingTransition} marginTop={4} /> : null}

      {/* ── Footer ── */}
      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: theme.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: centerLabelFont, fontWeight: 400 }]}>
          {centerLabel}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

// ─── Fusion page (mixed structure) ───────────────────────────────────────────

export interface FusionPDFSong {
  slug: string;
  ast: ChordProAST;
  sectionNotes: Record<string, string>;
  sectionNuances?: Record<string, SectionNuance>;
  /** Modulation (升调) par section : uid → tonalité cible d'affichage. */
  sectionKeys?: Record<string, string>;
  /** Structure du chant dans la fusion « à la suite ». */
  structureOverride?: string[] | null;
}

export function FusionPDFPage({
  songs,
  mixedStructure,
  showChords,
  footerCenter,
  sectionStyle = "classic",
  withStrip = false,
  trailingTransition,
}: {
  songs: FusionPDFSong[];
  mixedStructure: Array<{ songSlug: string; sectionId: string; note?: string; transition?: string; nuance?: SectionNuance; keyChange?: string }>;
  showChords: boolean;
  footerCenter?: string;
  sectionStyle?: PdfSectionStyle;
  /** PDF compact : bandeau au-dessus de la structure mélangée (toujours dans
   *  l'ordre joué, comme à l'écran). */
  withStrip?: boolean;
  trailingTransition?: string;
}) {
  const songMap = Object.fromEntries(songs.map((s) => [s.slug, s]));

  const mixedSections = mixedStructure.flatMap((ms) => {
    const song = songMap[ms.songSlug];
    if (!song) return [];
    const section = song.ast.sections.find((s) => s.id === ms.sectionId);
    if (!section) return [];
    const note = ms.note ?? song.sectionNotes?.[ms.sectionId];
    const nuance = ms.nuance ?? song.sectionNuances?.[ms.sectionId];
    const isZh = song.ast.metadata.language === "zh";
    const sourceLabel = song.ast.metadata.title;
    const sourceLabelFont = isZh ? "KaiTi" : "SpaceGrotesk";
    // Modulation (升调) : section transposée dans sa tonalité cible.
    const targetKey = ms.keyChange ?? song.sectionKeys?.[ms.sectionId];
    const keyChange = targetKey && targetKey !== song.ast.metadata.key ? targetKey : undefined;
    const shownSection = keyChange && song.ast.metadata.key
      ? transposeSection(section, semitonesTo(song.ast.metadata.key, keyChange), keyChange)
      : section;
    return [{ section: shownSection, note, nuance, keyChange, transition: ms.transition, isZh, theme: isZh ? RED_THEME : BLUE_THEME, sourceLabel, sourceLabelFont }];
  });

  if (mixedSections.length === 0) return null;

  const centerLabel = footerCenter ?? songs.map((s) => s.ast.metadata.title).join(" / ");
  const centerLabelFont = footerLabelFont(centerLabel);

  // Build flat list of title parts so each Text gets a key (no Fragment needed)
  const titleParts: { text: string; font: string; bold: boolean; key: string }[] = [];
  songs.forEach((s, i) => {
    if (i > 0) titleParts.push({ text: " / ", font: "SpaceGrotesk", bold: false, key: `sep-${i}` });
    titleParts.push({
      text: s.ast.metadata.title,
      font: s.ast.metadata.language === "zh" ? "KaiTi" : "SpaceGrotesk",
      bold: true,
      key: `title-${s.slug}`,
    });
  });

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap" }}>
          {titleParts.map(({ text, font, bold, key }) => (
            <Text key={key} style={{ fontSize: 18, fontWeight: bold ? 700 : 400,
                                     color: bold ? C.title : C.subtitle,
                                     fontFamily: font, lineHeight: 1.2 }}>
              {text}
            </Text>
          ))}
        </View>
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 10, marginBottom: 0 }} />
      </View>

      {withStrip && (
        <CompactStrip
          steps={mixedSections.map((m) => ({ section: m.section, note: m.note ?? "", transition: m.transition ?? "", nuance: m.nuance, targetKey: m.keyChange }))}
          uiLang="fr"
          details={false}
        />
      )}

      {mixedSections.flatMap(({ section, note, nuance, keyChange, transition, isZh, theme, sourceLabel, sourceLabelFont }, idx) => {
        const items = [
          <SectionBlock
            key={`${section.id}-${idx}`}
            section={section}
            isZh={isZh}
            useJianpu={false}
            showChords={showChords}
            showPinyin={isZh}
            note={note}
            nuance={nuance}
            keyChange={keyChange}
            theme={theme}
            uiLang="fr"
            sourceLabel={sourceLabel}
            sourceLabelFont={sourceLabelFont}
            sectionStyle={sectionStyle}
          />,
        ];
        if (transition) items.push(<TransitionPDFBlock key={`tr-${idx}`} text={transition} />);
        return items;
      })}

      {trailingTransition ? <TransitionPDFBlock text={trailingTransition} marginTop={4} /> : null}

      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: BLUE_THEME.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: centerLabelFont, fontWeight: 400 }]}>
          {centerLabel}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

// ─── Transition page ──────────────────────────────────────────────────────────

export function TransitionPDFPage({ text, footerCenter }: { text: string; footerCenter?: string }) {
  const hasCJK = /[一-鿿㐀-䶿]/.test(text);
  const textFont = hasCJK ? "SourceHanSansCN" : "SpaceGrotesk";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: C.subtitle, fontFamily: "SpaceGrotesk",
                       letterSpacing: 2 }}>
          TRANSITION
        </Text>
        <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 8 }} />
      </View>

      <View style={{ marginTop: 28 }}>
        <Text style={{ fontSize: 13, color: C.lyric, fontFamily: textFont, lineHeight: 1.8, fontWeight: 400 }}>
          {text}
        </Text>
      </View>

      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: BLUE_THEME.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: footerLabelFont(footerCenter ?? ""), fontWeight: 400 }]}>
          {footerCenter ?? ""}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );

}

// ─── Static styles (theme-independent) ───────────────────────────────────────

export const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 46,
    paddingHorizontal: 50,
    backgroundColor: "#fff",
    fontFamily: "Inter",
  },
  header: {
    marginBottom: 0,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 50,
    right: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: C.rule,
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7.5,
    color: C.footer,
    fontFamily: "LiberationSans",
  },
});

// ─── Page partition 简谱 (scan) ───────────────────────────────────────────────

// Cadre disponible pour le scan : A4 moins les marges de `styles.page`, moins
// la bande du pied de page. L'image s'y met à l'échelle en conservant son
// ratio — jamais rognée, jamais étirée.
const SHEET_BOX_W = 595.28 - 2 * 50;
const SHEET_BOX_H = 841.89 - 36 - 46 - 20;

/** Une page de scan 简谱, avec le calque d'accords transposé redessiné par
 *  dessus (mêmes coordonnées que le calque web, converties en points). */
export function JianpuPDFPage({
  src,
  page,
  chords,
  title,
  titlePinyin,
  playedKey: demandee,
  originalKey,
  headerHeight = 0,
  footerCenter,
  strip,
  stripHeight = 0,
  trailingTransition,
  pageIndex = 0,
  top = 0,
  accordsOrigine,
  retouches,
}: {
  src: string;
  page: JianpuPage;
  chords?: JianpuChords | null;
  /** Retouches d'accords de l'item (`item.jianpuChords`, lot 9) : comme à
   *  l'écran, elles remplacent le gravé et se dessinent même calque éteint.
   *  Comme à l'écran aussi, seule la première page du scan les porte. */
  retouches?: JianpuRetouches | null;
  /** Rang de la page dans le scan (0 = la première, seule à porter un calque). */
  pageIndex?: number;
  /** Rangées de l'en-tête gravé coupées de `src` (`cadrage.json`) : l'image fait
   *  `h − top` pixels de haut, le calque remonte d'autant. */
  top?: number;
  /** K4 (O11) : tonalité gravée, sur une page suivante dont la première page
   *  transpose ses accords — ceux de cette page-ci ne suivent pas. */
  accordsOrigine?: string | null;
  title: string;
  titlePinyin?: string | null;
  /** Tonalité choisie, si elle diffère de celle du .cho. */
  playedKey?: string | null;
  /** Tonalité du `.cho`, jouée quand `playedKey` est absent (voir `cleJouee`). */
  originalKey: string | null | undefined;
  /** Hauteur réservée à l'en-tête (0 = page suivante d'un scan multi-pages). */
  headerHeight?: number;
  footerCenter?: string;
  /** PDF compact : bandeau de structure sous l'en-tête (première page). */
  strip?: ReactNode;
  /** Place réservée au bandeau, retirée de la hauteur du scan. */
  stripHeight?: number;
  /** Transition jouée après ce chant (compact, dernière page du scan). */
  trailingTransition?: string;
}) {
  const availH = SHEET_BOX_H - headerHeight - stripHeight - (trailingTransition ? 30 : 0) - (accordsOrigine ? 24 : 0);
  const k = Math.min(SHEET_BOX_W / page.w, availH / (page.h - top));
  const imgW = page.w * k;
  const imgH = (page.h - top) * k;
  // Le seul endroit où le recadrage devient un décalage de coordonnées : le
  // calque est relevé sur la page entière.
  const dy = top * k;
  // Le calque est relevé sur une image d'une autre définition que le scan
  // affiché : tout est ramené à l'échelle du rendu.
  const ck = chords ? imgW / chords.w : 0;
  const playedKey = cleJouee(demandee, originalKey, chords?.printedKey ?? undefined);
  const overlayOn = Boolean(chords && playedKey);
  const partial = Boolean(overlayOn && chords?.complete === false);
  const semitones = chords && playedKey ? semitonesTo(chords.printedKey, playedKey) : 0;
  const chordColor = partial ? "#2563eb" : "#000";
  // Retouches : lues sur la page 0 seule (JianpuSheet ne dessine le calque que là).
  const changed = pageIndex === 0 ? (retouches?.changed ?? {}) : {};
  const ajouts = pageIndex === 0 ? (retouches?.added ?? []).filter((a) => a.page === 0) : [];
  const calqueDessine = Boolean(chords && (overlayOn || Object.keys(changed).length > 0 || ajouts.length > 0));
  // Tonalité d'orthographe : la jouée, sinon l'imprimée (calque éteint, rien ne se transpose).
  const cleEcrite = playedKey ?? chords?.printedKey ?? "C";
  const centerLabel = footerCenter ?? title;

  return (
    <Page size="A4" style={styles.page}>
      {headerHeight > 0 && (
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 700, color: C.title, fontFamily: "KaiTi", lineHeight: 1.1 }}>
                {title}
              </Text>
              {titlePinyin && (
                <Text style={{ fontSize: 10, color: C.subtitle, fontFamily: "SourceHanSansCN", fontWeight: 300 }}>
                  {titlePinyin}
                </Text>
              )}
            </View>
            {playedKey && (
              <View style={{ borderWidth: 1.5, borderColor: RED_THEME.accent, borderRadius: 20,
                             paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontFamily: "SpaceGrotesk", fontWeight: 700, fontSize: 12, color: RED_THEME.accent }}>
                  {playedKey}
                </Text>
              </View>
            )}
          </View>
          <View style={{ height: 0.5, backgroundColor: C.rule, marginTop: 8 }} />
          {strip}
        </View>
      )}

      {accordsOrigine && (
        <Text style={{ fontSize: 8, color: C.subtitle, fontFamily: "LiberationSans", marginBottom: 8 }}>
          {`Page ${pageIndex + 1} : les accords imprimés sont ceux d'origine (${accordsOrigine}) et ne suivent pas la transposition ; les chiffres, eux, restent justes.`}
        </Text>
      )}
      <View style={{ alignItems: "center", marginTop: headerHeight > 0 && !strip ? 10 : 0 }}>
        {/* `overflow: hidden` (lot JE) : la coupe passe sous « 1=X » ; son cadre et les gommes
            au-dessus de `top` tomberaient sur l'en-tête de la page. */}
        <View style={{ width: imgW, height: imgH, position: "relative", overflow: "hidden" }}>
          <Image src={src} style={{ width: imgW, height: imgH }} />

          {/* Calque : le pavé blanc masque l'accord d'origine, le texte le
              réécrit au même endroit. Seule la 1re page du scan est relevée.
              Calque éteint, seules les étiquettes retouchées se dessinent. */}
          {calqueDessine && chords && (() => {
            // Peinture comme à l'écran : les masques (étiquette vide) d'abord,
            // pour qu'un pavé blanc n'efface pas un accord voisin.
            const boites = chords.labels
              .map((l, i) => {
                const retouche = changed[i];
                if (!overlayOn && retouche === undefined) return null;
                const grave = retouche ?? l.c;
                const texte = l.opt ? "" : transposeLabel(grave, semitones, altSpellingKey(cleEcrite, l.alt ?? 0));
                return { l, i, texte };
              })
              .filter((b): b is { l: JianpuChordLabel; i: number; texte: string } => b !== null);
            const rend = (b: { l: JianpuChordLabel; i: number; texte: string }) => (
              <SheetLabel key={b.i} box={b.l} k={ck} dy={dy} h={b.l.fh ?? chords.labelH} color={chordColor}>
                {b.texte}
              </SheetLabel>
            );
            return (
              <>
                {boites.filter((b) => !b.texte.trim()).map(rend)}
                {overlayOn && chords.keyLabel && (
                  <SheetLabel box={chords.keyLabel} k={ck} dy={dy} h={chords.labelH} color="#000">
                    {/* `c` : le texte gravé, quand la page n'écrit pas « 1=X »
                        (la lettre seule, l'ordre inverse, ou un « 1=F » posé
                        au-dessus d'accords en D). Transposé comme une étiquette,
                        pas remplacé par la tonalité jouée. */}
                    {chords.keyLabel.c
                      ? transposeLabel(chords.keyLabel.c, semitones, playedKey!)
                      : `1=${playedKey}`}
                  </SheetLabel>
                )}
                {/* « （X调） » du titre gravé : coupé avec lui, rien à réécrire. */}
                {overlayOn && chords.titleKey && chords.titleKey.y >= top && (
                  <SheetLabel box={chords.titleKey} k={ck} dy={dy} h={chords.titleKey.h * 0.78} color="#000" font="SourceHanSansCN">
                    {`（${playedKey}调）`}
                  </SheetLabel>
                )}
                {/* `transposeLabel`, pas `transposeChord` : depuis l'itération 34
                    une étiquette peut porter une ligne entière (`(Am G/B C D)`,
                    `【前奏 | G D/F# | … | D】`). `fh` : le corps propre à
                    l'étiquette, quand il n'est pas celui de la page.
                    `opt` : une **lecture alternative** (positions de capo
                    empilées au-dessus des accords réels). Le PDF n'a pas le
                    sélecteur de la page web : ces étiquettes-là restent des
                    masques. `alt` donne la tonalité d'orthographe des rangées
                    qui se suivent (une modulation). */}
                {boites.filter((b) => b.texte.trim()).map(rend)}
                {/* Accords ajoutés : au-dessus de tout, sans pavé (ils se
                    posent dans la place libre de la ligne), au corps de leur
                    voisin d'étiquette. */}
                {ajouts.map((a, n) => {
                  const voisin = chords.labels.find((l) => a.y < l.y + l.h && l.y < a.y + chords.labelH);
                  return (
                    <SheetLabel
                      key={`ajout-${n}`}
                      box={{ x: a.x, y: a.y, w: 0, h: chords.labelH }}
                      k={ck}
                      dy={dy}
                      h={voisin?.fh ?? chords.labelH}
                      color={chordColor}
                      masque={false}
                    >
                      {transposeLabel(a.c, semitones, cleEcrite)}
                    </SheetLabel>
                  );
                })}
              </>
            );
          })()}
        </View>

        {partial && (
          <Text style={{ fontSize: 8, color: C.subtitle, fontFamily: "LiberationSans", marginTop: 6 }}>
            {`Jouer en ${playedKey} — seuls les accords en bleu ont été transposés ; les autres sont ceux d'origine (${chords?.printedKey}).`}
          </Text>
        )}
        {playedKey && !chords && pageIndex === 0 && (
          <Text style={{ fontSize: 8, color: C.subtitle, fontFamily: "LiberationSans", marginTop: 6 }}>
            {`Jouer en ${playedKey} — les chiffres restent justes, mais les accords imprimés sur ce scan sont ceux d'origine.`}
          </Text>
        )}
      </View>

      {trailingTransition ? <TransitionPDFBlock text={trailingTransition} marginTop={8} /> : null}

      <View style={styles.footer} fixed>
        <Text style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 700,
                       color: RED_THEME.accent, letterSpacing: 1 }]}>
          GCC LOUANGE
        </Text>
        <Text style={[styles.footerText, { fontFamily: footerLabelFont(centerLabel), fontWeight: 400 }]}>
          {centerLabel}
        </Text>
        <Text
          style={[styles.footerText, { fontFamily: "LiberationSans", fontWeight: 400 }]}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
      </View>
    </Page>
  );
}

/** Un accord réécrit sur le scan : pavé blanc + texte, aux coordonnées du
 *  calque (pixels image) converties en points. Les débords repris du rendu
 *  web (−3/−6 px, +7/+8 px) couvrent le crénage du glyphe d'origine.
 *
 *  Le texte est posé à côté du pavé, sans largeur imposée : dans une View de
 *  largeur fixe, react-pdf tronque un libellé plus large que son cadre (le
 *  rendu web, lui, déborde grâce à `minWidth` + `nowrap`). */
function SheetLabel({
  box, k, dy = 0, h, color, font = "Times-Roman", masque = true, children,
}: {
  box: { x: number; y: number; w: number; h: number };
  k: number;
  /** Recadrage de l'image, en points : le calque remonte d'autant. */
  dy?: number;
  h: number;
  color: string;
  font?: string;
  /** Faux : le texte seul, sans pavé blanc (accord ajouté). */
  masque?: boolean;
  children: string;
}) {
  const left = (box.x - 3) * k;
  const top = (box.y - 6) * k - dy;
  const boxH = (box.h + 8) * k;
  const fontSize = h * k;
  return (
    <>
      {masque && (
        <View
          style={{
            position: "absolute",
            left,
            top,
            width: (box.w + 7) * k,
            height: boxH,
            backgroundColor: "#fff",
          }}
        />
      )}
      <Text
        style={{
          position: "absolute",
          left,
          // Aligné sur le bas du cadre, comme le `items-end` du calque web.
          top: top + boxH - fontSize,
          fontSize,
          color,
          fontFamily: font,
          lineHeight: 1,
        }}
      >
        {children}
      </Text>
    </>
  );
}
