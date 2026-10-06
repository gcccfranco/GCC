import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Retours du 06/10/2026 : « 升调 » apparaissait dans l'interface en français (clé de fr.json restée
// en chinois). Sans navigateur : aucun libellé français n'est écrit en caractères chinois, sauf
// les mots qui se disent ainsi à GCC (简谱, 中文, les classes de l'EDD).

type Arbre = { [cle: string]: string | Arbre };
const lire = (fichier: string) => JSON.parse(readFileSync(`src/locales/${fichier}`, "utf8")) as Arbre;
function* feuilles(arbre: Arbre, chemin = ""): Generator<[string, string]> {
  for (const [cle, v] of Object.entries(arbre)) {
    const c = chemin ? `${chemin}.${cle}` : cle;
    if (typeof v === "string") yield [c, v];
    else yield* feuilles(v, c);
  }
}
/** Mots chinois gardés tels quels en français. */
const GARDES = /简谱|中文|中班|大班|高班/g;

test("fr.json : aucun libellé en caractères chinois, hors 简谱, 中文 et les classes de l'EDD", () => {
  const fautifs = [...feuilles(lire("fr.json"))].filter(([, v]) => /\p{Script=Han}/u.test(v.replace(GARDES, "")));
  expect(fautifs).toEqual([]);
});

test("la modulation : « Modulation » en français, 升调 en chinois", () => {
  const fr = lire("fr.json").setlists as Arbre;
  const zh = lire("zh-CN.json").setlists as Arbre;
  expect((fr.editeur as Arbre).keyChange).toBe("Modulation");
  expect((zh.editeur as Arbre).keyChange).toBe("升调");
});
