import { expect, test } from "@playwright/test";
import { loadSong } from "../src/lib/content/loadSongs";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { harmonieDuChant, passagesDuChant } from "../src/lib/harmonie/passages";
import { lireFamille } from "../src/lib/harmonie/fiches";
import type { ChordProSection } from "../src/types/chordPro";
import type { Idee } from "../src/lib/firebase/harmonie";

// Lot H2 (docs/spec-harmonie-accords.md) : les passages d'un chant lus en degrés, les idées rangées par passage,
// les ressentis et usages des fiches. Tout est pur : aucune page.

const section = (uid: string, type: ChordProSection["type"], lignes: string[][], name = ""): ChordProSection => ({
  type, id: uid, name, uid,
  lines: lignes.map((accords) => ({
    type: "line", pinyin: null, jianpu: null,
    tokens: accords.flatMap((a) => [{ type: "chord" as const, value: a }, { type: "lyric" as const, value: "la " }]),
  })),
});

const FONCTIONS = ["repos", "vers-refrain", "suspens", "sans-accords"];

for (const slug of ["a-jamais-tu-es-saint", "一切歌颂赞美"]) {
  test(`passagesDuChant : ${slug}, un passage par section`, () => {
    const ast = parseChordPro(loadSong(slug).chordProSource);
    expect(ast.metadata.key).toBeTruthy();
    expect(ast.sections.some((s) => s.type === "chorus")).toBe(true);
    const passages = passagesDuChant(ast.sections, ast.metadata.key);
    expect(passages).toHaveLength(ast.sections.length);
    for (const p of passages) {
      expect(FONCTIONS).toContain(p.fonction);
      if (p.lignes.length) expect(p.resume.length).toBeGreaterThan(0);
    }
  });
}

test("passagesDuChant : boucle, vers-refrain, repos", () => {
  const boucle = section("a", "verse", [["D", "A", "Bm", "G"], ["D", "A", "Bm", "G"]]);
  const [p] = passagesDuChant([boucle], "D");
  expect(p.resume).toEqual(["1", "5", "6m", "4"]);
  expect(p.boucle).toBe(true);
  expect(p.fonction).toBe("suspens");

  const refrain = section("b", "chorus", [["D"]]);
  expect(passagesDuChant([boucle, refrain], "D")[0].fonction).toBe("vers-refrain");

  const [fin] = passagesDuChant([section("c", "verse", [["G", "A", "D"]])], "D");
  expect(fin.fonction).toBe("repos");
  expect(fin.lignes[0].map((a) => a.fonction)).toEqual(["SD", "D", "T"]);
});

const idee = (id: string, auteur: string, plus: Partial<Idee>): Idee => ({
  id, uid: id, auteur, instrument: "piano", texte: "une idée", creeLe: "2026-01-01", modifieLe: "2026-01-01", ...plus,
});

test("harmonieDuChant : une idée d'équipe va dans son passage, sinon sansPassage", () => {
  const sections = [section("s1", "verse", [["D", "A"]], "Couplet 1"), section("s2", "chorus", [["G", "D"]])];
  const a = idee("i1", "Lison Marel", { passage: "s2" });
  const b = idee("i2", "Basile Orcan", { passage: "inconnu", passageNom: "absent" });
  const c = idee("i3", "Basile Orcan", { passage: "inconnu", passageNom: "Couplet 1" });
  const { passages, sansPassage } = harmonieDuChant(sections, "D", [], [], [a, b, c]);
  expect(passages[1].ideesEquipe).toEqual([a]);
  expect(passages[0].ideesEquipe).toEqual([c]);
  expect(sansPassage).toEqual([b]);
});

const FICHE = (ligne: string) => `# 99 · Essai

## X1 · Une fiche

| | |
| --- | --- |
| Id | \`essai/une-fiche\` |
| Sensations | Épique |
| Moments | Refrain |
${ligne}
`;

test("lireFamille : ressentis, usages et « (proposé) »", () => {
  const [f] = lireFamille(FICHE("| Ressenti | élan · couleur (proposé) |\n| Usage | pré-refrain |"), "99-essai.md");
  expect(f.ressentis).toEqual(["elan", "couleur"]);
  expect(f.usages).toEqual(["pre-refrain"]);
  expect(f.etiquettesProposees).toBe(true);
  const [g] = lireFamille(FICHE(""), "99-essai.md");
  expect(g).toMatchObject({ ressentis: [], usages: [], etiquettesProposees: false, ecoutes: [] });
  expect(() => lireFamille(FICHE("| Ressenti | joyeux |"), "99-essai.md")).toThrow(/ressenti inconnu/);
});
