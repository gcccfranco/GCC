import { readFileSync } from "fs";
import { expect, test } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { buildPerformanceBlocks, type PerformanceBlock, type SectionBlock } from "../src/lib/performance/blocks";
import type { JianpuManifest } from "../src/lib/jianpu/images";
import type { SetlistItem } from "../src/types/setList";

// Lot 2 du chantier 简谱 (docs/spec-jianpu-integration.md) : « Sections uniques » et
// structure dans le mode louange. Setlist « Culte du 11 octobre » (fictive) :
// 1 为我而来 (C), 2 一生爱你 (D, gravé en E), 3 Abba Père (A, I · C1 · R · Pm · C2 · R · P · R ×2,
// transition après C2, note sur le 2e R).

// ─── Données ─────────────────────────────────────────────────────────────────

const contenu = (slug: string) => {
  const source = readFileSync(`content/songs/${slug}.cho`, "utf8");
  return { slug, ast: parseChordPro(source), source };
};
const CONTENTS = Object.fromEntries(["abba-pere", "一生爱你", "为我而来"].map((s) => [s, contenu(s)]));
const MANIFESTE = JSON.parse(readFileSync("public/jianpu/index.json", "utf8")) as JianpuManifest;

const item = (over: Partial<SetlistItem> & { songSlug: string; position: number }): SetlistItem => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

/** Abba Père : I · C1 · R · Pm · C2 · R · P · R · R ; transition après C2, note sur le 2e R. */
const ABBA = item({
  songSlug: "abba-pere",
  position: 3,
  structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"],
  sectionTransitions: { "verse-5-4": "Montée de la batterie" },
  sectionNotes: { "chorus-3-5": "Piano seul, voix douces" },
});
const YISHENG = item({ songSlug: "一生爱你", position: 2, keyOverride: "D", jianpuSheet: true });

const sections = (blocks: PerformanceBlock[]) => blocks.filter((b): b is SectionBlock => b.kind === "section");
const noms = (blocks: PerformanceBlock[]) => sections(blocks).map((b) => b.section.name);

// ─── 1. Blocs, sans navigateur ───────────────────────────────────────────────

test.describe("buildPerformanceBlocks : affichage (pur)", () => {
  test("Sections uniques : chaque section une fois, sans note ni transition ; Ordre joué inchangé", () => {
    const unique = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(noms(unique)).toEqual(["Intro", "Couplet 1", "Refrain", "Interlude", "Couplet 2", "Pont"]);
    expect(sections(unique).every((b) => !b.note && !b.nuance), "aucune note portée par les sections").toBe(true);
    expect(unique.filter((b) => b.kind === "transition-intra")).toHaveLength(0);
    // Chaque impression dit quelles occurrences elle représente : le refrain, les quatre.
    expect(sections(unique).find((b) => b.section.name === "Refrain")!.occurrenceUids).toEqual([
      "chorus-3-2", "chorus-3-5", "chorus-3-7", "chorus-3-8",
    ]);

    const joue = buildPerformanceBlocks([ABBA], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "played" });
    expect(sections(joue)).toHaveLength(9);
    expect(sections(joue).map((b) => b.note).filter(Boolean)).toEqual(["Piano seul, voix douces"]);
    expect(joue.filter((b) => b.kind === "transition-intra").map((b) => (b as { text: string }).text)).toEqual(["Montée de la batterie"]);
    expect(sections(joue).map((b) => b.occurrenceUids)).toEqual(ABBA.structureOverride!.map((u) => [u]));
    // Sans options : l'ordre joué d'aujourd'hui.
    const defaut = buildPerformanceBlocks([ABBA], CONTENTS, true);
    expect(defaut.map((b) => b.kind)).toEqual(joue.map((b) => b.kind));
  });

  test("l'en-tête porte le déroulé joué (bandeau), modulation vers la tonalité jouée neutralisée", () => {
    const avecMod = { ...ABBA, keyOverride: "B", sectionKeys: { "bridge-6-6": "B", "chorus-3-8": "C" } };
    const [entete] = buildPerformanceBlocks([avecMod], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(entete.kind).toBe("song-header");
    const steps = (entete as Extract<PerformanceBlock, { kind: "song-header" }>).steps!;
    expect(steps.map((s) => s.section.uid)).toEqual(ABBA.structureOverride);
    expect(steps.map((s) => s.targetKey ?? "")).toEqual(["", "", "", "", "", "", "", "", "C"]);
    expect(steps[4].transition).toBe("Montée de la batterie");
    expect(steps[5].note).toBe("Piano seul, voix douces");
    // 升调 : le refrain rejoué en C est réimprimé, sa tonalité à part.
    const unique = buildPerformanceBlocks([avecMod], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(sections(unique).map((b) => `${b.section.name}${b.keyChange ? `→${b.keyChange}` : ""}`)).toEqual([
      "Intro", "Couplet 1", "Refrain", "Interlude", "Couplet 2", "Pont", "Refrain→C",
    ]);
  });

  test("Structure seule : un chant à scan donne ses sections, pas de bloc jianpu-sheet (D13)", () => {
    const blocs = (affichage: "played" | "unique" | "structure") =>
      buildPerformanceBlocks([YISHENG, ABBA], CONTENTS, true, undefined, MANIFESTE, "auto", undefined, { affichage });
    expect(blocs("played").filter((b) => b.kind === "jianpu-sheet"), "en ordre joué, le scan").toHaveLength(1);
    expect(blocs("unique").filter((b) => b.kind === "jianpu-sheet"), "en sections uniques, le scan inchangé").toHaveLength(1);

    const structure = blocs("structure");
    expect(structure.filter((b) => b.kind === "jianpu-sheet")).toHaveLength(0);
    const zh = sections(structure).filter((b) => b.songTitle === "一生爱你");
    expect(zh.map((b) => b.section.type)).toEqual(["intro", "verse", "chorus"]);
    // Le reste suit l'ordre joué : Abba Père garde ses neuf passages, note et transition.
    expect(sections(structure).filter((b) => b.songTitle === "Abba Père")).toHaveLength(9);
    expect(structure.filter((b) => b.kind === "transition-intra")).toHaveLength(1);
  });

  test("fusion en structure mixte : même filtre que la vue Partitions, bandeau des deux chants", () => {
    const fusion = item({
      type: "fusion",
      songSlug: "",
      position: 4,
      fusionSongs: [
        { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
        { songSlug: "为我而来", keyOverride: null, structureOverride: null, sectionNotes: {} },
      ],
      mixedStructure: [
        { songSlug: "abba-pere", sectionId: "chorus-3" },
        { songSlug: "为我而来", sectionId: "chorus-3", note: "Tous ensemble" },
        { songSlug: "abba-pere", sectionId: "chorus-3", transition: "On ralentit" },
        { songSlug: "为我而来", sectionId: "chorus-3", keyChange: "D" },
      ],
    });
    const unique = buildPerformanceBlocks([fusion], CONTENTS, true, undefined, undefined, "auto", undefined, { affichage: "unique" });
    expect(sections(unique).map((b) => `${b.songTitle}:${b.section.id}${b.keyChange ? `→${b.keyChange}` : ""}`)).toEqual([
      "Abba Père:chorus-3", "为我而来:chorus-3", "为我而来:chorus-3→D",
    ]);
    expect(unique.filter((b) => b.kind === "transition-intra")).toHaveLength(0);
    const entete = unique[0] as Extract<PerformanceBlock, { kind: "song-header" }>;
    expect(entete.steps!.map((s) => [s.note, s.transition])).toEqual([["", ""], ["Tous ensemble", ""], ["", "On ralentit"], ["", ""]]);
  });
});
