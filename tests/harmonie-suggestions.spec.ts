import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { lireFamille } from "../src/lib/harmonie/fiches";
import { cinqPremieres, suggestionsPour } from "../src/lib/harmonie/suggestions";
import type { Fiche } from "../src/types/harmonie";

// Lot 9 / H2 (docs/spec-harmonie.md) : les « Idées d'harmonie » d'un chant.
// Une règle × une section = UNE suggestion, avec la liste de ses endroits ;
// cinq au plus, les plus sûres puis les plus faciles, dans l'ordre du chant.

const DOSSIER = path.join(process.cwd(), "docs", "harmonie");
const fiches: Fiche[] = fs
  .readdirSync(DOSSIER)
  .filter((f) => /^\d\d-.+\.md$/.test(f) && !f.startsWith("00-"))
  .flatMap((f) => lireFamille(fs.readFileSync(path.join(DOSSIER, f), "utf-8"), f));

// Un couplet qui joue quatre fois « 4 → 5 », donc quatre endroits pour une
// seule et même idée.
const CHANT = `{title: Essai}
{key: D}
{language: fr}

{start_of_verse: Couplet 1}
[G]Une [A]fois [G]deux [A]fois
[G]trois [A]fois [G]quatre [A]fois
{end_of_verse}

{start_of_chorus: Refrain}
[D]Le refrain [G]qui [A]monte [D]bien
{end_of_chorus}
`;

const ast = parseChordPro(CHANT);
const toutes = suggestionsPour(ast.sections, "D", fiches);
const s1 = toutes.filter((s) => s.fiche.id === "substitutions/2m7-pour-4");

test("une règle trouvée quatre fois dans une section ne fait qu'une suggestion", () => {
  // Le couplet joue quatre fois « 4 → 5 », le refrain une : deux suggestions,
  // une par section, et non cinq.
  expect(s1.map((s) => s.sectionNom)).toEqual(["Couplet 1", "Refrain"]);
  expect(s1[0].endroits, "le couplet sait ses quatre endroits").toHaveLength(4);
  expect(s1[1].endroits, "le refrain n'en a qu'un").toHaveLength(1);
  expect(s1[0].id).toBe(`substitutions/2m7-pour-4__${ast.sections[0].uid}`);
});

test("les suggestions sortent dans l'ordre du chant", () => {
  const sections = toutes.map((s) => s.section);
  expect([...sections].sort((a, b) => a - b), "déjà triées").toEqual(sections);
});

test("« Ne marche pas sur ce chant » retire l'idée pour tout le monde", () => {
  const sans = suggestionsPour(ast.sections, "D", fiches, [s1[0].id]);
  expect(sans.some((s) => s.id === s1[0].id)).toBe(false);
  expect(sans.length, "les autres restent").toBe(toutes.length - 1);
});

test("cinq au plus : cinq fiches différentes, les plus sûres, dans l'ordre du chant", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "content", "songs", "Ta parole.cho"), "utf-8");
  const vrai = suggestionsPour(parseChordPro(source).sections, "Bb", fiches);
  const { premieres, suite } = cinqPremieres(vrai, "piano");
  expect(premieres).toHaveLength(5);
  expect(premieres.length + suite.length).toBe(vrai.length);

  // Cinq fiches **différentes** : la même idée trouvée dans trois sections ne
  // mange pas trois places (choix du 17/09/2026, § « Écarts assumés »).
  expect(new Set(premieres.map((s) => s.fiche.id)).size).toBe(5);

  // Parmi les fiches retenues, aucune fiche écartée n'est plus sûre.
  const rang = { "tres-sure": 0, sure: 1, "a-ecouter": 2 } as const;
  const parFiche = new Map<string, number>();
  for (const s of vrai) parFiche.set(s.fiche.id, Math.min(parFiche.get(s.fiche.id) ?? 9, rang[s.surete]));
  const pireRetenue = Math.max(...premieres.map((s) => parFiche.get(s.fiche.id)!));
  const ecartees = [...new Set(suite.map((s) => s.fiche.id))].filter((id) => !premieres.some((p) => p.fiche.id === id));
  const meilleureEcartee = Math.min(...ecartees.map((id) => parFiche.get(id)!));
  expect(pireRetenue, "aucune fiche écartée n'est plus sûre qu'une fiche retenue").toBeLessThanOrEqual(meilleureEcartee);

  const sections = premieres.map((s) => s.section);
  expect([...sections].sort((a, b) => a - b), "affichées dans l'ordre du chant").toEqual(sections);
});

test("l'intro avec la fin du refrain n'est proposée que si le chant n'a pas d'intro", () => {
  const avecIntro = parseChordPro(CHANT.replace("{start_of_verse: Couplet 1}", "{start_of_intro: Intro}\n[D] [G]\n{end_of_intro}\n\n{start_of_verse: Couplet 1}"));
  const id = "intros-fins/intro-fin-du-refrain";
  expect(toutes.some((s) => s.fiche.id === id), "ce chant n'a pas d'intro").toBe(true);
  expect(suggestionsPour(avecIntro.sections, "D", fiches).some((s) => s.fiche.id === id), "celui-ci en a une").toBe(false);
});

test("le tag vise le dernier refrain", () => {
  const tag = toutes.find((s) => s.fiche.id === "intros-fins/tag");
  expect(tag, "proposé").toBeTruthy();
  expect(tag!.sectionNom).toBe("Refrain");
  expect(tag!.endroits[0].accords, "la dernière ligne du refrain").toEqual(["D", "G", "A", "D"]);
});

test("un vrai chant du répertoire reçoit des idées, pas un tas", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "content", "songs", "Ta parole.cho"), "utf-8");
  const vrai = parseChordPro(source);
  const idees = suggestionsPour(vrai.sections, vrai.metadata.key, fiches);
  expect(idees.length, "au moins quelques idées").toBeGreaterThan(3);
  // Pas un tas non plus : l'écran n'en montre que cinq, mais « Voir plus »
  // ne doit pas dérouler cent lignes sur un chant de cinq sections.
  expect(idees.length, "pas un tas").toBeLessThan(60);
  const { premieres } = cinqPremieres(idees, "guitare");
  expect(premieres, "cinq au plus à l'écran").toHaveLength(5);
  for (const s of premieres) expect(s.fiche.nom.length).toBeGreaterThan(3);
});
