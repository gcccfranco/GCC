import type { SetlistItem, SectionNuance } from "@/types/setList";
import type { ChordProSection, ChordProAST } from "@/types/chordPro";
import type { SongContent } from "@/lib/api/songs";
import { transposeAST, transposeSection } from "@/lib/transposeAST";
import { semitonesTo, getTransposedKey } from "@/lib/transpose";
import { resolveStructureOverride } from "@/lib/chordpro/structure";
import { itemAst } from "@/lib/chordpro/itemContent";
import type { JianpuEntry, JianpuManifest } from "@/lib/jianpu/images";
import { sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference";
import { resolveSectionOccurrences, type SectionOccurrence } from "@/lib/setlist/sectionSteps";
import { uniqueSections } from "@/lib/setlist/uniqueSections";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";

export type SongHeaderBlock = {
  kind: "song-header";
  uid: string;
  title: string;
  titlePinyin?: string | null;
  artist: string;
  songKey: string;
  position: number;
  language?: "fr" | "zh";
  /** Slug du chant (absent pour les fusions) — cible du réglage capo */
  songSlug?: string;
  /** Capo appliqué (frets) : les accords des sections sont déjà transposés */
  capo?: number;
  /** Tonalité de la setlist, quand une autre a été choisie sur cet appareil
   *  (page du chant) : `songKey` est alors la tonalité choisie. */
  setlistKey?: string;
  /** Fusion en structure mixte : titres + tonalités des chants fusionnés */
  fusionSongs?: { title: string; key: string; language: "fr" | "zh" }[];
  /** Déroulé joué, pour le bandeau de structure en tête du chant ; une
   *  modulation vers la tonalité jouée n'en est pas une. */
  steps?: SectionOccurrence[];
};

export type SectionBlock = {
  kind: "section";
  uid: string;
  section: ChordProSection;
  language: "fr" | "zh";
  chordsEnabled: boolean;
  showPinyin: boolean;
  note?: string;
  nuance?: SectionNuance;
  /** Modulation (升调) : tonalité cible de cette section (tonalité jouée). */
  keyChange?: string;
  songTitle: string;
  songKey: string;
  songSourceLabel?: string;
  /** Occurrences de la structure jouée que ce bloc représente (une en ordre
   *  joué, toutes les reprises en sections uniques). */
  occurrenceUids?: string[];
};

export type TransitionIntraBlock = {
  kind: "transition-intra";
  uid: string;
  text: string;
};

export type TransitionInterBlock = {
  kind: "transition-inter";
  uid: string;
  text: string;
};

export type JianpuSheetBlock = {
  kind: "jianpu-sheet";
  uid: string;
  entry: JianpuEntry;
  songTitle: string;
  songSlug: string;
  /** Tonalité affichée dans la barre du Mode Louange. */
  songKey: string;
  /** Tonalité jouée, si elle diffère de celle du chant : le calque
   *  d'accords s'y transpose. */
  playedKey: string | null;
  /** Tonalité du `.cho`, jouée quand `playedKey` est nul. */
  originalKey: string;
  /** Page du scan rendue par ce bloc : une page de partition = une page
   *  d'écran, un scan de deux pages en occupe donc deux. */
  pageIndex: number;
  /** Capo du chant : le calque affiche alors les positions. */
  capo?: number;
  /** Tonalité de la setlist, quand une autre a été choisie sur cet appareil. */
  setlistKey?: string;
  /** Rang du chant dans la setlist, repris par le bandeau de structure. */
  position: number;
  /** Structure jouée : le scan ne la porte pas (il ignore l'ordre et les
   *  reprises décidés pour ce dimanche), le bandeau au-dessus l'affiche. */
  steps: SectionOccurrence[];
};

export type PerformanceBlock =
  | SongHeaderBlock
  | SectionBlock
  | JianpuSheetBlock
  | TransitionIntraBlock
  | TransitionInterBlock;

function getTransposed(ast: ChordProAST, keyOverride: string | null): ChordProAST {
  if (!keyOverride || keyOverride === ast.metadata.key) return ast;
  return transposeAST(ast, semitonesTo(ast.metadata.key, keyOverride), keyOverride);
}

function resolveSections(ast: ChordProAST, structureOverride: string[] | null): ChordProSection[] {
  if (!structureOverride?.length) return ast.sections;
  return resolveStructureOverride(ast.sections, structureOverride);
}

/** Déroulé pour le bandeau : une modulation vers la tonalité jouée n'en est pas une. */
function bandeau(occurrences: SectionOccurrence[], key: string): SectionOccurrence[] {
  return occurrences.map((o) => (o.targetKey && o.targetKey !== key ? o : { ...o, targetKey: undefined }));
}

// Capo N = accords affichés N demi-tons sous la tonalité jouée (shapes).
function applyCapo(ast: ChordProAST, playedKey: string, capo: number): ChordProAST {
  if (!capo) return ast;
  return transposeAST(ast, -capo, getTransposedKey(playedKey, -capo));
}

export function buildPerformanceBlocks(
  items: SetlistItem[],
  contents: Record<string, SongContent>,
  showChordsGlobal: boolean,
  capos?: Record<string, number>,
  jianpuSheets?: JianpuManifest,
  jianpuPref: JianpuPref = "auto",
  /** Tonalités choisies sur cet appareil (page du chant), par slug. */
  personalKeys?: Record<string, string>,
  /** Affichage (même préférence que la setlist, `partition-layout`) :
   *  ordre joué ; chaque section une fois, notes et transitions laissées au
   *  bandeau ; ou structure seule, où un chant à scan donne ses sections. */
  { affichage = "played" }: { affichage?: PartitionLayout } = {},
): PerformanceBlock[] {
  const blocks: PerformanceBlock[] = [];
  const unique = affichage === "unique";
  // Le responsable coche le 简谱 par chant ; la préférence de l'appareil peut
  // le suivre, l'imposer partout, ou ne jamais l'utiliser.
  const wantsSheet = (item: SetlistItem) => sheetEnabled(jianpuPref, item.jianpuSheet);
  let c = 0;
  const uid = () => `pb-${c++}`;

  for (const item of [...items].sort((a, b) => a.position - b.position)) {
    // ── Transition inter-chant ──
    if (item.type === "transition") {
      if (item.transitionText) blocks.push({ kind: "transition-inter", uid: uid(), text: item.transitionText });
      continue;
    }

    // ── Fusion ──
    if (item.type === "fusion" && item.fusionSongs) {
      const asts: Record<string, ChordProAST> = {};
      for (const fs of item.fusionSongs) {
        const ast = itemAst(fs, contents[fs.songSlug]);
        if (ast) asts[fs.songSlug] = getTransposed(ast, fs.keyOverride);
      }

      if (item.mixedStructure?.length) {
        const multiSong = item.fusionSongs.length > 1;
        const fusionMeta = item.fusionSongs.flatMap((fs) => {
          const ast = asts[fs.songSlug];
          return ast
            ? [{
                title: ast.metadata.title,
                key: fs.keyOverride ?? ast.metadata.key,
                language: ast.metadata.language,
              }]
            : [];
        });
        const passages = item.mixedStructure.flatMap((ms) => {
          const ast = asts[ms.songSlug];
          const section = ast?.sections.find((s) => s.uid === ms.sectionId || s.id === ms.sectionId);
          if (!ast || !section) return [];
          const fs = item.fusionSongs!.find((f) => f.songSlug === ms.songSlug);
          const fusionKey = fs?.keyOverride ?? ast.metadata.key;
          // Modulation (升调) : section transposée dans sa tonalité cible.
          const msTarget = ms.keyChange ?? fs?.sectionKeys?.[ms.sectionId];
          const msKeyChange = msTarget && msTarget !== fusionKey ? msTarget : undefined;
          return [{ ms, ast, section, fs, fusionKey, msKeyChange }];
        });
        if (fusionMeta.length > 0) {
          blocks.push({
            kind: "song-header",
            uid: uid(),
            title: fusionMeta.map((m) => m.title).join(" + "),
            artist: "",
            songKey: fusionMeta.map((m) => m.key).join(" / "),
            position: item.position,
            fusionSongs: fusionMeta,
            steps: passages.map(({ ms, section, fs, msKeyChange }) => ({
              section,
              note: ms.note ?? fs?.sectionNotes?.[ms.sectionId] ?? "",
              transition: ms.transition ?? "",
              nuance: ms.nuance ?? fs?.sectionNuances?.[ms.sectionId],
              targetKey: msKeyChange,
            })),
          });
        }
        // Sections uniques : chaque section une fois par chant et par
        // tonalité, comme la vue Partitions.
        const shown = unique
          ? passages.filter((p, i) => passages.findIndex((q) =>
              q.ms.songSlug === p.ms.songSlug && q.section.id === p.section.id && q.msKeyChange === p.msKeyChange) === i)
          : passages;
        for (const { ms, ast, section, fs, fusionKey, msKeyChange } of shown) {
          blocks.push({
            kind: "section",
            uid: uid(),
            section: msKeyChange
              ? transposeSection(section, semitonesTo(fusionKey, msKeyChange), msKeyChange)
              : section,
            language: ast.metadata.language,
            chordsEnabled: showChordsGlobal && item.showChords,
            showPinyin: ast.metadata.language === "zh",
            note: unique ? undefined : ms.note ?? fs?.sectionNotes?.[ms.sectionId],
            nuance: unique ? undefined : ms.nuance ?? fs?.sectionNuances?.[ms.sectionId],
            keyChange: msKeyChange,
            songTitle: ast.metadata.title,
            songKey: fusionKey,
            songSourceLabel: multiSong ? ast.metadata.title : undefined,
            occurrenceUids: [section.uid],
          });
          if (ms.transition && !unique) blocks.push({ kind: "transition-intra", uid: uid(), text: ms.transition });
        }
      } else {
        for (let i = 0; i < item.fusionSongs.length; i++) {
          const fs = item.fusionSongs[i];
          const ast = asts[fs.songSlug];
          if (!ast) continue;
          if (i > 0) blocks.push({ kind: "transition-inter", uid: uid(), text: "" });
          const fusionKey = fs.keyOverride ?? ast.metadata.key;
          const occurrences = resolveSectionOccurrences(resolveSections(ast, fs.structureOverride), fs);
          blocks.push({
            kind: "song-header",
            uid: uid(),
            title: ast.metadata.title,
            titlePinyin: ast.metadata.titlePinyin,
            artist: ast.metadata.artist,
            songKey: fusionKey,
            position: item.position,
            language: ast.metadata.language,
            steps: bandeau(occurrences, fusionKey),
          });
          const shown = unique
            ? uniqueSections(occurrences, fusionKey)
            : occurrences.map((step) => ({ step, uids: [step.section.uid] }));
          for (const { step: { section: sec, note, nuance, targetKey }, uids } of shown) {
            // Modulation (升调) : section transposée dans sa tonalité cible.
            const secKeyChange = targetKey && targetKey !== fusionKey ? targetKey : undefined;
            blocks.push({
              kind: "section",
              uid: uid(),
              section: secKeyChange
                ? transposeSection(sec, semitonesTo(fusionKey, secKeyChange), secKeyChange)
                : sec,
              language: ast.metadata.language,
              chordsEnabled: showChordsGlobal && item.showChords,
              showPinyin: ast.metadata.language === "zh",
              note: unique ? undefined : note || undefined,
              nuance: unique ? undefined : nuance,
              keyChange: secKeyChange,
              songTitle: ast.metadata.title,
              songKey: fusionKey,
              occurrenceUids: uids,
            });
          }
        }
      }
      continue;
    }

    // ── Chant normal ──
    const content = contents[item.songSlug];
    const baseAst = itemAst(item, content);
    if (!baseAst) continue;
    // Tonalité jouée (affichée) — après capo, ast.metadata.key devient la
    // tonalité des shapes, on fige donc la clé d'affichage ici. Une tonalité
    // choisie sur cet appareil remplace celle de la setlist ; les modulations
    // suivent le même écart.
    const setlistKey = item.keyOverride ?? baseAst.metadata.key;
    const chosenKey = personalKeys?.[item.songSlug];
    const personalKey = chosenKey && chosenKey !== setlistKey ? chosenKey : undefined;
    const playedKey = personalKey ?? setlistKey;
    const personalShift = personalKey ? semitonesTo(setlistKey, personalKey) : 0;
    const capo = capos?.[item.songSlug] ?? 0;
    const ast = applyCapo(getTransposed(baseAst, personalKey ?? item.keyOverride), playedKey, capo);
    const sections = resolveSections(ast, item.structureOverride);
    const occurrences = resolveSectionOccurrences(sections, item).map((o) =>
      personalShift && o.targetKey ? { ...o, targetKey: getTransposedKey(o.targetKey, personalShift) } : o,
    );
    const steps = bandeau(occurrences, playedKey);
    blocks.push({
      kind: "song-header",
      uid: uid(),
      title: ast.metadata.title,
      titlePinyin: ast.metadata.titlePinyin,
      artist: ast.metadata.artist,
      songKey: playedKey,
      position: item.position,
      language: ast.metadata.language,
      songSlug: item.songSlug,
      capo: capo || undefined,
      setlistKey: personalKey ? setlistKey : undefined,
      steps,
    });
    // ── Partition 简谱 : la page entière remplace les sections ──
    // La structure de l'item reste décrite (elle sert à la liste de la
    // setlist) mais ne découpe pas la partition, qui est un scan indivisible.
    // Structure seule : pas de scan, la structure en grand (D13).
    const sheet = wantsSheet(item) && affichage !== "structure" ? jianpuSheets?.[item.songSlug] : undefined;
    if (sheet) {
      // Avec un capo, la tonalité jouée est passée même si elle est celle du
      // chant : le calque doit descendre les accords en positions.
      const overlayKey =
        playedKey !== baseAst.metadata.key || capo ? playedKey : null;
      sheet.pages.forEach((_, pageIndex) => {
        blocks.push({
          kind: "jianpu-sheet",
          uid: uid(),
          entry: sheet,
          pageIndex,
          songTitle: ast.metadata.title,
          songSlug: item.songSlug,
          songKey: playedKey,
          playedKey: overlayKey,
          originalKey: baseAst.metadata.key,
          capo: capo || undefined,
          setlistKey: personalKey ? setlistKey : undefined,
          position: item.position,
          steps,
        });
      });
      continue;
    }

    // Sections uniques : une impression par section (et par tonalité de
    // 升调) ; notes, nuances et transitions passent au bandeau.
    const shown = unique
      ? uniqueSections(occurrences, playedKey).map(({ step, uids }) => ({ ...step, note: "", transition: "", nuance: undefined, uids }))
      : occurrences.map((step) => ({ ...step, uids: [step.section.uid] }));
    for (const { section: sec, note, transition, nuance, targetKey, uids } of shown) {
      // Modulation (升调) : section transposée dans sa tonalité cible. Avec un
      // capo, les accords de l'AST sont en tonalité de shapes → même écart de
      // demi-tons, mais l'orthographe suit la tonalité cible décalée du capo.
      const keyChange = targetKey && targetKey !== playedKey ? targetKey : undefined;
      const shownSec = keyChange
        ? transposeSection(
            sec,
            semitonesTo(playedKey, keyChange),
            capo ? getTransposedKey(keyChange, -capo) : keyChange
          )
        : sec;
      blocks.push({
        kind: "section",
        uid: uid(),
        section: shownSec,
        language: ast.metadata.language,
        chordsEnabled: showChordsGlobal && item.showChords,
        showPinyin: item.showPinyin,
        note: note || undefined,
        nuance,
        keyChange,
        songTitle: ast.metadata.title,
        songKey: playedKey,
        occurrenceUids: uids,
      });
      if (transition) blocks.push({ kind: "transition-intra", uid: uid(), text: transition });
    }
  }

  return blocks;
}

export function computePageKey(
  blocks: PerformanceBlock[],
  indices: number[],
  layoutSig = "",
): string {
  // `blocks` peut se reconstruire sous la mise en page (affichage changé,
  // manifeste 简谱 arrivé) : la page porte alors des indices trop grands.
  const uids = indices
    .map((i) => blocks[i])
    .filter((b): b is SectionBlock => b?.kind === "section")
    .map((b) => b.section.uid);
  let h = 0;
  // Repli sur les indices quand la page n'a aucune section (page 100 % transitions) :
  // évite que toutes ces pages partagent la clé "0" (annotations mélangées).
  const str = uids.length ? uids.join(",") : `idx:${indices.join(",")}`;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  const base = (h >>> 0).toString(36);
  return layoutSig ? `${base}-${layoutSig}` : base;
}
