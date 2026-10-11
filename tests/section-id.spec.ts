import { expect, test } from "@playwright/test";
import { parseChordPro } from "../src/lib/chordpro/parser";
import { resolveStructureOverride } from "../src/lib/chordpro/structure";

// Changer le type d'une section (`{start_of_final}` → `{start_of_outro}`,
// un pré-refrain écrit sous `{start_of_verse}`…) changeait son identifiant
// (`final-3` → `outro-3`) : les setlists enregistrées, qui le gardent dans
// leur structure et leurs tonalités par section, perdaient la section.
// `{section_id: …}` sous l'en-tête garde l'ancien identifiant ; le type
// (couleur, libellé) suit la directive.

const CHO = `{title: Essai}
{key: G}

{start_of_verse: Couplet}
[G]Paroles du couplet
{end_of_verse}

{start_of_chorus: Refrain}
[C]Paroles du refrain
{end_of_chorus}

{start_of_outro: Final}
{section_id: final-3}
[D]Paroles de la fin
{end_of_outro}
`;

test("{section_id} garde l'identifiant d'une section dont le type a changé", () => {
  const { sections } = parseChordPro(CHO);
  expect(sections.map((s) => [s.id, s.type])).toEqual([
    ["verse-1", "verse"],
    ["chorus-2", "chorus"],
    ["final-3", "outro"],
  ]);
});

test("{section_id} : une structure enregistrée avec l'ancien identifiant retrouve sa section", () => {
  const { sections } = parseChordPro(CHO);
  const joue = resolveStructureOverride(sections, ["final-3-0", "verse-1-1", "final-3-2"]);
  expect(joue.map((s) => [s.type, s.uid])).toEqual([
    ["outro", "final-3-0"],
    ["verse", "verse-1-1"],
    ["outro", "final-3-2"],
  ]);
});

test("{section_id} n'est pas une ligne de paroles", () => {
  const { sections } = parseChordPro(CHO);
  const fin = sections.find((s) => s.id === "final-3")!;
  expect(fin.lines).toHaveLength(1);
});

// Le suffixe entre parenthèses est une consigne de jeu, pas une sorte de section :
// `{start_of_tag: Tag (To Chorus)}` (十架的大能) se lisait refrain.
test("le suffixe entre parenthèses ne fait pas le type : « Tag (To Chorus) » n'est pas un refrain", () => {
  const { sections } = parseChordPro(`{title: Essai}

{start_of_tag: Tag (To Chorus)}
{section_id: outro-1}
[A]Paroles du tag
{end_of_tag}
`);
  expect(sections.map((s) => [s.id, s.type, s.suffix])).toEqual([["outro-1", "other", "(To Chorus)"]]);
});
