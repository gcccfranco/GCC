import { expect, test } from "@playwright/test";
import { colonneDe, doitSemer, motifDuRefus, phraseHistorique, sansCompteDe, styleCase } from "../src/lib/planning/grilleAffichage";
import type { CaseGeste } from "../src/lib/planning/gestes";

// Lot N, tranche N6a (docs/spec-nettoyage-code.md) : fonctions pures sorties de PlanningGrille. Spec sans page :
// elle fige le comportement lu dans le code d'origine. Données fictives.

const definition = {
  colonnes: [
    { cle: "piano", i18n: "planning.roles.piano", index: 1 },
    { cle: "theme", i18n: "planning.roles.theme", index: 2 },
  ],
};
const cas = (date: string, cle: string, apres: string): CaseGeste => ({ date, cle, avant: "", apres });

test("colonneDe", () => {
  expect(colonneDe(definition, "theme")?.index).toBe(2);
  expect(colonneDe(definition, "absente")).toBeUndefined();
});

test.describe("motifDuRefus", () => {
  const g = globalThis as Record<string, unknown>;
  const sauve = Object.getOwnPropertyDescriptor(g, "navigator");
  test.afterEach(() => {
    if (sauve) Object.defineProperty(g, "navigator", sauve);
    else delete g.navigator;
  });
  const poserNavigator = (valeur: unknown) =>
    Object.defineProperty(g, "navigator", { value: valeur, configurable: true, writable: true });

  test("hors ligne, en ligne, sans navigator", () => {
    poserNavigator({ onLine: false });
    expect(motifDuRefus()).toBe("horsLigne");
    poserNavigator({ onLine: true });
    expect(motifDuRefus()).toBe("droitRetire");
    poserNavigator(undefined);
    expect(motifDuRefus()).toBe("droitRetire");
    delete g.navigator;
    expect(motifDuRefus()).toBe("droitRetire");
  });
});

test("doitSemer : non dès 2027, pour un dimanche dans l'app ou déjà semé", () => {
  const semes = new Set(["2026-03-08"]);
  expect(doitSemer("2026-03-01", [], semes)).toBe(true);
  expect(doitSemer("2026-03-01", ["2026-03-01"], semes)).toBe(false);
  expect(doitSemer("2026-03-08", [], semes)).toBe(false);
  expect(doitSemer("2027-01-03", [], new Set())).toBe(false);
  expect(doitSemer("2025-12-28", [], new Set())).toBe(true);
});

test("sansCompteDe : noms inconnus, dédoublonnés, hors colonnes de texte libre", () => {
  const connus = new Set(["alice", "bob"]);
  const r = sansCompteDe(
    [
      cas("2026-03-01", "piano", "Alice"),
      cas("2026-03-01", "guitare", "Zoé, Bob"),
      cas("2026-03-08", "piano", "Zoé / Yan"),
      cas("2026-03-08", "theme", "Inconnu"),
    ],
    connus,
  );
  expect(r.noms).toEqual(["Zoé", "Yan"]);
  expect(r.cles).toEqual(["2026-03-01|guitare", "2026-03-08|piano"]);
  expect(sansCompteDe([], connus)).toEqual({ noms: [], cles: [] });
});

test("phraseHistorique : import, dimanche, case", () => {
  const appels: [string, Record<string, unknown>][] = [];
  const t = ((cle: string, o?: Record<string, unknown>) => {
    appels.push([cle, o ?? {}]);
    return `${cle}|${JSON.stringify(o ?? {})}`;
  }) as never;
  phraseHistorique(t, "fr", definition, "Marie", { kind: "import", count: 12 });
  expect(appels.at(-1)).toEqual(["planning.grille.importe", { auteur: "Marie", count: 12 }]);

  phraseHistorique(t, "fr", definition, "Marie", { kind: "dimanche", date: "2027-01-03", retire: true });
  expect(appels.at(-1)![0]).toBe("planning.grille.retire");
  expect(Object.keys(appels.at(-1)![1])).toEqual(["auteur", "date"]);
  phraseHistorique(t, "fr", definition, "Marie", { kind: "dimanche", date: "2027-01-03", retire: false });
  expect(appels.at(-1)![0]).toBe("planning.grille.pose");

  const base = { kind: "case", date: "2027-01-03", colonne: "piano" } as const;
  phraseHistorique(t, "fr", definition, "Marie", { ...base, from: "", to: "Luc" });
  expect(appels.at(-1)![0]).toBe("planning.grille.ajoute");
  expect(appels.at(-1)![1]).toMatchObject({ auteur: "Marie", avant: "", apres: "Luc" });
  phraseHistorique(t, "fr", definition, "Marie", { ...base, from: "Luc", to: "Eve" });
  expect(appels.at(-1)![0]).toBe("planning.grille.remplace");
  phraseHistorique(t, "fr", definition, "Marie", { ...base, from: "Luc", to: "" });
  expect(appels.at(-1)![0]).toBe("planning.grille.efface");
  // colonne connue : son libellé traduit (t appelé sur la clé i18n) ; inconnue : la clé brute.
  expect(appels.at(-1)![1].colonne).toBe('planning.roles.piano|{}');
  phraseHistorique(t, "fr", definition, "Marie", { ...base, colonne: "ancienne", from: "a", to: "b" });
  expect(appels.at(-1)![1].colonne).toBe("ancienne");
});

test("styleCase : fond du geste, arêtes de la plage", () => {
  const plage = { r0: 1, r1: 2, c0: 1, c1: 3 };
  expect(styleCase(null, "#112233", false, 0, 0)).toBeUndefined();
  expect(styleCase(null, "#112233", true, 0, 0)).toEqual({ background: "#11223322" });
  expect(styleCase(plage, "#112233", false, 0, 1)).toBeUndefined();
  expect(styleCase(plage, "#112233", true, 3, 1)).toEqual({ background: "#11223322" });
  expect(styleCase(plage, "#112233", false, 1, 2)).toEqual({ background: "#11223312", boxShadow: "inset 0 2px 0 0 #112233" });
  expect(styleCase(plage, "#112233", true, 2, 3)).toEqual({
    background: "#11223322",
    boxShadow: "inset 0 -2px 0 0 #112233, inset -2px 0 0 0 #112233",
  });
  expect(styleCase({ r0: 1, r1: 1, c0: 1, c1: 1 }, "#112233", false, 1, 1)).toEqual({
    background: "#11223312",
    boxShadow: "inset 0 2px 0 0 #112233, inset 0 -2px 0 0 #112233, inset 2px 0 0 0 #112233, inset -2px 0 0 0 #112233",
  });
});
