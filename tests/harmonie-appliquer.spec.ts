import { expect, test } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { lireFamille } from "../src/lib/harmonie/fiches";
import { appliquerDansLaSource } from "../src/lib/harmonie/appliquer";
import { apercuDuChangement, suggestionsPour } from "../src/lib/harmonie/suggestions";
import { transitionEntre } from "../src/lib/harmonie/transitions";
import { modulationProposee } from "../src/lib/harmonie/modulation";
import { MODULATIONS } from "../src/lib/harmonie/regles";
import type { Fiche } from "../src/types/harmonie";

// Lot 9 / H2 et H4 : poser une suggestion dans le source d'un chant
// (« Essayer dans Ma version »), et la transition vers le chant suivant.

const DOSSIER = path.join(process.cwd(), "docs", "harmonie");
const fiches: Fiche[] = fs
  .readdirSync(DOSSIER)
  .filter((f) => /^\d\d-.+\.md$/.test(f) && !f.startsWith("00-"))
  .flatMap((f) => lireFamille(fs.readFileSync(path.join(DOSSIER, f), "utf-8"), f));

const CHANT = `{title: Essai}
{key: D}
{language: fr}

{start_of_verse: Couplet 1}
[D]Ma parole [G]tient [A]debout
[G]Encore [A]une fois
{end_of_verse}
`;

const ast = parseChordPro(CHANT);
const s1 = suggestionsPour(ast.sections, "D", fiches).find((s) => s.fiche.id === "substitutions/2m7-pour-4")!;

test("la suggestion se pose à son endroit, et nulle part ailleurs", () => {
  const apercu = apercuDuChangement(s1, "D")!;
  expect(apercu.avant).toBe("G – A");
  expect(apercu.apres).toBe("Em7 – A");
  const pose = appliquerDansLaSource(CHANT, s1.endroits[0], ["Em7", "A"]);
  expect(pose).toContain("[D]Ma parole [Em7]tient [A]debout");
  expect(pose, "la seconde ligne n'a pas bougé").toContain("[G]Encore [A]une fois");
  expect(pose.split("\n").length, "aucune ligne ajoutée ni perdue").toBe(CHANT.split("\n").length);
});

test("un motif qui s'allonge ajoute ses accords à la suite", () => {
  // B1 : « 1 → 6m » devient « 1 – 5/7 → 6m » : trois accords à la place de deux.
  const chant = `{title: B}\n{key: D}\n\n{start_of_verse: Couplet}\n[D]Une ligne [Bm]qui descend\n{end_of_verse}\n`;
  const b1 = suggestionsPour(parseChordPro(chant).sections, "D", fiches).find((s) => s.fiche.id === "basses/descend")!;
  const pose = appliquerDansLaSource(chant, b1.endroits[0], ["D", "A/C#", "Bm"]);
  expect(pose).toContain("[D]Une ligne [A/C#][Bm]qui descend");
});

test("un motif à cheval sur deux lignes est posé sur les deux", () => {
  // Le moteur cherche le motif dans toute la section : il peut commencer en
  // fin de ligne et finir sur la suivante. Longtemps, seule la première ligne
  // était réécrite — l'idée ne changeait rien (917 endroits du répertoire).
  const chant = `{title: Cheval}\n{key: D}\n\n{start_of_verse: Couplet}\n[D]Une ligne qui finit\n[Bm]et la suite descend\n{end_of_verse}\n`;
  const b1 = suggestionsPour(parseChordPro(chant).sections, "D", fiches).find((s) => s.fiche.id === "basses/descend")!;
  expect(b1.endroits[0].places.map((p) => p.ligne), "le motif tient sur deux lignes").toEqual([0, 1]);
  const pose = appliquerDansLaSource(chant, b1.endroits[0], ["D", "A/C#", "Bm"]);
  expect(pose, "la ligne du motif a changé").not.toBe(chant);
  expect(pose).toContain("[D]Une ligne qui finit");
  expect(pose).toContain("[A/C#][Bm]et la suite descend");
});

test("les paroles et les autres sections ne bougent pas", () => {
  const pose = appliquerDansLaSource(CHANT, s1.endroits[0], ["Em7", "A"]);
  expect(pose).toContain("{start_of_verse: Couplet 1}");
  expect(pose).toContain("{title: Essai}");
  expect(pose.replace(/\[[^\]]*\]/g, ""), "le texte chanté est intact").toBe(CHANT.replace(/\[[^\]]*\]/g, ""));
});

test("un chant joué dans une autre tonalité revient dans celle d'origine", () => {
  // Le chant est écrit en D et joué en F (+3) : ce qu'on voit en F doit
  // s'écrire en D dans le source de Ma version.
  const pose = appliquerDansLaSource(CHANT, s1.endroits[0], ["Gm7", "C"], 3, "D");
  expect(pose).toContain("[D]Ma parole [Em7]tient [A]debout");
});

test("une modulation vise le dernier refrain, et son accord d'approche la fin d'avant", () => {
  const chant = `{title: M}\n{key: D}\n\n{start_of_verse: Couplet}\n[D]Un couplet [A]qui finit\n{end_of_verse}\n\n{start_of_chorus: Refrain}\n[G]Le refrain [D]qui monte\n{end_of_chorus}\n`;
  const sections = parseChordPro(chant).sections;
  const parLe5 = MODULATIONS.find((m) => m.fiche === "modulations/ton-par-le-5")!;
  const prop = modulationProposee(sections, "D", parLe5)!;
  expect(prop.sectionNom, "le dernier refrain").toBe("Refrain");
  expect(prop.tonaliteCible, "un ton plus haut").toBe("E");
  expect(prop.approche, "le 5 de la nouvelle tonalité").toEqual(["B7"]);
  expect(prop.endroitApproche?.sectionNom, "à la fin du couplet").toBe("Couplet");
  expect(prop.endroitApproche?.accords, "sur son dernier accord").toEqual(["A"]);

  const directe = MODULATIONS.find((m) => m.fiche === "modulations/directe")!;
  expect(modulationProposee(sections, "D", directe)!.approche, "rien à ajouter").toEqual([]);
});

test("la transition vers le chant suivant suit l'écart des tonalités", () => {
  expect(transitionEntre("D", "D")).toEqual({ ficheId: "transitions/meme-tonalite", ecart: 0, approche: null });
  expect(transitionEntre("D", "G")).toEqual({ ficheId: "transitions/vers-le-4", ecart: 5, approche: "D" });
  expect(transitionEntre("D", "A")).toEqual({ ficheId: "transitions/vers-le-5", ecart: 7, approche: "E" });
  expect(transitionEntre("D", "E")).toEqual({ ficheId: "transitions/ton-plus-haut", ecart: 2, approche: "B" });
  expect(transitionEntre("D", "C")).toEqual({ ficheId: "transitions/ton-plus-bas", ecart: 10, approche: "G" });
  expect(transitionEntre("D", "Bb"), "tonalité éloignée").toEqual({
    ficheId: "transitions/note-commune", ecart: 8, approche: "F",
  });
  expect(transitionEntre("D", "n'importe quoi")).toBeNull();
});

test("chaque transition renvoie à une fiche qui existe", () => {
  const ids = new Set(fiches.map((f) => f.id));
  for (const vers of ["D", "G", "A", "E", "C", "Bb", "F#"]) {
    const tr = transitionEntre("D", vers)!;
    expect(ids.has(tr.ficheId), `${vers} → ${tr.ficheId}`).toBe(true);
  }
});
