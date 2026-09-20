import { expect, test } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { chercher, typeDeSection } from "../src/lib/harmonie/motifs";
import { regleDeLaFiche } from "../src/lib/harmonie/regles";

// Lot 9 / H1 : trouver dans un chant l'endroit où une règle s'applique. Le
// même moteur sert au build (les chants qui jouent **déjà** le « après » sont
// les exemples du répertoire) et au navigateur (le « avant » trouvé devient
// une suggestion). Tout est cherché en degrés, donc dans n'importe quelle
// tonalité.

const CHANT = `{title: Essai}
{key: D}
{language: fr}

{start_of_intro: Intro}
[D] [G] [D]
{end_of_intro}

{start_of_verse: Couplet 1}
[D]Première ligne [D]qui répète [Bm]puis descend
[G]Ensuite le quatre [A]puis le cinq
{end_of_verse}

{start_of_prechorus: Montée}
[G]Ça monte [A]vers le refrain
{end_of_prechorus}

{start_of_chorus: Refrain}
[D]Refrain [G]avec [A]du [D]monde
{end_of_chorus}

{start_of_outro: Fin}
[G]Tout [A]finit [D]ici
{end_of_outro}
`;

const ast = parseChordPro(CHANT);
const regle = (fiche: string) => {
  const r = regleDeLaFiche(fiche);
  if (!r) throw new Error(`règle absente : ${fiche}`);
  return r;
};
const resume = (e: { sectionNom: string; accords: string[] }[]) =>
  e.map((x) => `${x.sectionNom} : ${x.accords.join(" ")}`);

test("« dans une section » : le motif se trouve où qu'il soit, même d'une ligne à l'autre", () => {
  // S1 : 4 → 5 (G → A), partout où il est joué. Le cas « à cheval sur deux
  // lignes » est couvert par tests/harmonie-appliquer.spec.ts.
  expect(resume(chercher(ast.sections, "D", regle("substitutions/2m7-pour-4"), "motif"))).toEqual([
    "Couplet 1 : G A",
    "Montée : G A",
    "Refrain : G A",
    "Fin : G A",
  ]);
  // S2 : 1 → 1 (D → D), deux fois de suite, dans le couplet.
  expect(resume(chercher(ast.sections, "D", regle("substitutions/6m-pour-1-repete"), "motif"))).toEqual([
    "Couplet 1 : D D",
  ]);
});

test("« fin de ligne » et « fin de section » ne retiennent que la bonne place", () => {
  // S6 : 5 → 1 en fin de ligne — le refrain finit sur A D, la fin aussi.
  expect(resume(chercher(ast.sections, "D", regle("substitutions/4-sur-5-pour-5"), "motif"))).toEqual([
    "Refrain : A D",
    "Fin : A D",
  ]);
  // E1 : 4 → 1 en fin de section — seule l'intro finit par G D ; le refrain a
  // bien G … D mais avec le A entre les deux, et la Fin finit par A D.
  expect(resume(chercher(ast.sections, "D", regle("emprunts/4m-avant-1"), "motif"))).toEqual([
    "Intro : G D",
  ]);
});

test("« avant un refrain » ne regarde que la section qui le précède", () => {
  // M3 : 4 → 5 à la fin de la section qui précède un refrain → la Montée,
  // pas le couplet (qui a pourtant le même G → A).
  expect(resume(chercher(ast.sections, "D", regle("montees/4-5-sur-4"), "motif"))).toEqual([
    "Montée : G A",
  ]);
});

test("« toute fin du chant » ne regarde que la dernière section", () => {
  // E2 : 5 → 1 final. Le refrain finit aussi par A D, mais seule la Fin compte.
  expect(resume(chercher(ast.sections, "D", regle("emprunts/b6-b7-1"), "motif"))).toEqual([
    "Fin : A D",
  ]);
});

test("le type de section filtre la règle", () => {
  // B5 (pédale de 1) : 1 → 4 → 1, dans une intro ou un pont seulement.
  expect(resume(chercher(ast.sections, "D", regle("basses/pedale-de-1"), "motif"))).toEqual([
    "Intro : D G D",
  ]);
  expect(typeDeSection({ type: "other", name: "Interlude" })).toBe("interlude");
  expect(typeDeSection({ type: "other", name: "Autre chose" })).toBe("other");
  expect(typeDeSection({ type: "chorus", name: "Refrain" })).toBe("chorus");
});

test("le « après » se cherche pareil : un chant qui le joue déjà est un exemple", () => {
  const deja = parseChordPro(`{title: Déjà}\n{key: G}\n\n{start_of_verse: Couplet}\n[Am7]Le deux mineur sept [D]puis le cinq\n{end_of_verse}\n`);
  expect(resume(chercher(deja.sections, "G", regle("substitutions/2m7-pour-4"), "apres")), "Am7 → D en G").toEqual([
    "Couplet : Am7 D",
  ]);
  expect(chercher(deja.sections, "G", regle("substitutions/2m7-pour-4"), "motif"), "le « avant » n'y est pas").toEqual([]);
});

test("une étiquette « nue » exigée écarte les accords déjà colorés", () => {
  const colore = parseChordPro(`{title: Coloré}\n{key: D}\n\n{start_of_chorus: Refrain}\n[Dmaj7]Déjà coloré\n{end_of_chorus}\n`);
  // C1 demande un 1 sans couleur : Dmaj7 n'est pas candidat.
  expect(chercher(colore.sections, "D", regle("couleurs/accord-2"), "motif")).toEqual([]);
});
