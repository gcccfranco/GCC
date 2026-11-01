import { expect, test } from "@playwright/test";
import { clesDeMesServices, estDeMesServices, trierSetlists } from "../src/lib/setlist/liste";
import { langueCourte } from "../src/lib/utils/formatDate";
import { normalizeName, type PlanningData } from "../src/lib/planning/names";
import type { FSSetlist } from "../src/types/setList";

// Lot N7, tranche N7a (docs/spec-nettoyage-code.md) : fonctions pures sorties de la liste des setlists. Spec sans page :
// elle fige le comportement lu dans le code d'origine (données fictives).

const planning = {
  culte: [["2030-03-03", "Alice Test, Bob Essai", "", "", "", "", "", "", "", "", "", ""]],
  dejeuner: [["2030-03-03", "Alice Test"]],
  petitDej: [],
  paix: [["2030-03-10", "", "Alice Test"]],
  fidelite: [],
  bonte: [],
  edd: {},
  campus: [
    { d: "Dim. Matin", date: "2030-03-17", pres: "Alice Test", ch: "", mu: "", rg: "", ent: "2030-03-14", chants: [] },
    { d: "Dim. Soir", date: "2030-03-17", pres: "Carla Faux", ch: "Alice Test", mu: "", rg: "", ent: "", chants: [] },
  ],
  intergroupe: [],
  interfranco: [],
} as unknown as PlanningData;

const set = (p: Partial<FSSetlist>) => ({ id: "x", title: "T", date: "2030-03-17", category: "Culte Francophone", items: [], ...p }) as unknown as FSSetlist;

test.describe("langueCourte", () => {
  test("zh-CN donne zh, tout le reste fr", () => {
    expect(langueCourte("zh-CN")).toBe("zh");
    expect(langueCourte("fr")).toBe("fr");
    expect(langueCourte("zh")).toBe("fr");
    expect(langueCourte("")).toBe("fr");
  });
});

test.describe("clesDeMesServices", () => {
  test("sans planning ou sans nom : ensemble vide", () => {
    expect([...clesDeMesServices(null, "Alice Test")]).toEqual([]);
    expect([...clesDeMesServices(planning, undefined)]).toEqual([]);
    expect([...clesDeMesServices(planning, "")]).toEqual([]);
  });
  test("culte, groupe, Campus par moment ET par président, répétition = date de la séance", () => {
    const cles = clesDeMesServices(planning, "Alice Test");
    expect([...cles].sort()).toEqual(
      [
        "2030-03-03|Culte Francophone",
        "2030-03-10|Groupe Paix",
        "2030-03-17|Campus|m:matin",
        `2030-03-17|Campus|l:${normalizeName("Alice Test")}`,
        "2030-03-17|Campus|m:soir",
        `2030-03-17|Campus|l:${normalizeName("Carla Faux")}`,
      ].sort()
    );
  });
  test("un nom absent du planning : vide", () => {
    expect(clesDeMesServices(planning, "Personne Inconnue").size).toBe(0);
  });
});

test.describe("estDeMesServices", () => {
  const cles = new Set([
    "2030-03-03|Culte Francophone",
    "2030-03-17|Campus|m:matin",
    `2030-03-17|Campus|l:${normalizeName("Carla Faux")}`,
  ]);
  test("catégorie ordinaire : date + catégorie", () => {
    expect(estDeMesServices(set({ date: "2030-03-03", category: "Culte Francophone" }), cles)).toBe(true);
    expect(estDeMesServices(set({ date: "2030-03-04", category: "Culte Francophone" }), cles)).toBe(false);
    expect(estDeMesServices(set({ date: "2030-03-03", category: "Groupe Paix" }), cles)).toBe(false);
  });
  test("Campus : le moment, sinon le président", () => {
    expect(estDeMesServices(set({ category: "Campus", moment: "matin" }), cles)).toBe(true);
    expect(estDeMesServices(set({ category: "Campus", moment: "soir", leader: "Autre" }), cles)).toBe(false);
    expect(estDeMesServices(set({ category: "Campus", leader: "carla  FAUX" }), cles)).toBe(true);
    expect(estDeMesServices(set({ category: "Campus", moment: "soir", leader: "Carla Faux" }), cles)).toBe(true);
    expect(estDeMesServices(set({ category: "Campus" }), cles)).toBe(false);
  });
});

test.describe("trierSetlists", () => {
  const rang = (s: FSSetlist) => (s.fete ? Number(s.fete.passage) : -1);
  const f = (id: string, date: string, programme: string, passage: string) =>
    set({ id, date, fete: { programme, passage, qui: "q" } as FSSetlist["fete"] });
  const liste = [
    f("f2", "2030-05-01", "noel-2030", "2"),
    set({ id: "b", date: "2030-05-01" }),
    f("f1", "2030-05-01", "noel-2030", "1"),
    set({ id: "a", date: "2030-04-01" }),
    set({ id: "passe1", date: "2030-01-01" }),
    set({ id: "passe2", date: "2030-02-01" }),
    set({ id: "auj", date: "2030-03-01" }),
  ];
  const ids = (l: FSSetlist[]) => l.map((s) => s.id);
  test("à venir : dates croissantes, aujourd'hui compris, ordinaires avant fêtes, fêtes dans l'ordre de passage", () => {
    expect(ids(trierSetlists(liste, true, "2030-03-01", rang))).toEqual(["auj", "a", "b", "f1", "f2"]);
  });
  test("archives : dates décroissantes, strictement avant aujourd'hui", () => {
    expect(ids(trierSetlists(liste, false, "2030-03-01", rang))).toEqual(["passe2", "passe1"]);
    expect(ids(trierSetlists(liste, false, "2031-01-01", rang))).toEqual(["b", "f1", "f2", "a", "auj", "passe2", "passe1"]);
  });
  test("ne modifie pas la liste d'origine", () => {
    const avant = ids(liste);
    trierSetlists(liste, true, "2030-03-01", rang);
    expect(ids(liste)).toEqual(avant);
  });
});
