import { expect, test } from "@playwright/test";
import { prochainsServicesSansSetlist } from "../src/lib/setlist/prochainsServices";
import type { SetlistSeance } from "../src/lib/planning/names";

// Lot U5 bis (docs/spec-editeur-setlist.md), entrée « Pour quel service ? » :
// les prochains services sans setlist, d'après le planning (question Q3).
// Tranche T1 : la logique pure. La page vient en T2.

const CULTE = "Culte Francophone";

const seance = (category: string, date: string, leader = "", moment?: "matin" | "soir"): SetlistSeance => ({
  category,
  date,
  leader,
  ...(moment ? { moment } : {}),
  label: date,
});

const dates = (seances: SetlistSeance[]) => seances.map((s) => `${s.category} ${s.date}${s.moment ? " " + s.moment : ""}`);

test("(pur) quatre semaines, aujourd'hui compris : du jour même à J+27", () => {
  const seances = [
    seance(CULTE, "2026-10-07"), // hier
    seance(CULTE, "2026-10-08"), // aujourd'hui
    seance(CULTE, "2026-11-04"), // J+27
    seance(CULTE, "2026-11-05"), // J+28
  ];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-08`,
    `${CULTE} 2026-11-04`,
  ]);
});

test("(pur) l'horizon se règle : 7 jours, aujourd'hui compris", () => {
  const seances = [seance(CULTE, "2026-10-08"), seance(CULTE, "2026-10-14"), seance(CULTE, "2026-10-15")];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE], "2026-10-08", 7))).toEqual([
    `${CULTE} 2026-10-08`,
    `${CULTE} 2026-10-14`,
  ]);
});

test("(pur) le parcours de la spec : le 08/10, Culte Franco des 18/10, 25/10 et 01/11, le 11/10 a sa setlist", () => {
  const seances = [
    seance(CULTE, "2026-10-04", "Présidence A"),
    seance(CULTE, "2026-10-11", "Présidence B"),
    seance(CULTE, "2026-10-18", "Présidence C"),
    seance(CULTE, "2026-10-25", "Présidence A"),
    seance(CULTE, "2026-11-01", "Présidence B"),
    seance(CULTE, "2026-11-08", "Présidence C"),
  ];
  const setlists = [{ category: CULTE, date: "2026-10-11", leader: "Présidence B" }];
  const out = prochainsServicesSansSetlist(seances, setlists, [CULTE], "2026-10-08");
  expect(out.map((s) => s.date)).toEqual(["2026-10-18", "2026-10-25", "2026-11-01"]);
  // La séance est rendue telle quelle : la présidence lue au planning y est.
  expect(out[0]).toEqual(seances[2]);
});

test("(pur) seules les catégories données (celles où la personne peut créer)", () => {
  const seances = [seance(CULTE, "2026-10-11"), seance("Groupe Paix", "2026-10-11"), seance("中班", "2026-10-11")];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE, "中班"], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-11`,
    "中班 2026-10-11",
  ]);
  expect(prochainsServicesSansSetlist(seances, [], [], "2026-10-08")).toEqual([]);
});

test("(pur) une setlist partagée publiée retire son service ; un brouillon ou une privée, non", () => {
  const seances = [seance(CULTE, "2026-10-11"), seance(CULTE, "2026-10-18"), seance(CULTE, "2026-10-25")];
  const setlists = [
    { category: CULTE, date: "2026-10-11", leader: "" },
    { category: CULTE, date: "2026-10-18", leader: "", isDraft: true },
    { category: CULTE, date: "2026-10-25", leader: "", isPrivate: true },
  ];
  expect(prochainsServicesSansSetlist(seances, setlists, [CULTE], "2026-10-08").map((s) => s.date)).toEqual([
    "2026-10-18",
    "2026-10-25",
  ]);
});

test("(pur) une setlist d'une autre catégorie ou d'un autre jour ne retire rien", () => {
  const seances = [seance(CULTE, "2026-10-11"), seance("Groupe Paix", "2026-10-11")];
  const setlists = [
    { category: "Groupe Paix", date: "2026-10-11", leader: "" },
    { category: CULTE, date: "2026-10-12", leader: "" },
  ];
  expect(dates(prochainsServicesSansSetlist(seances, setlists, [CULTE, "Groupe Paix"], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-11`,
  ]);
});

test("(pur) Campus : la setlist du soir ne retire que le soir", () => {
  const seances = [
    seance("Campus", "2026-10-10", "Présidence A", "matin"),
    seance("Campus", "2026-10-10", "Présidence B", "soir"),
  ];
  const setlists = [{ category: "Campus", date: "2026-10-10", leader: "Présidence A", moment: "soir" as const }];
  // Même présidence que le matin, mais le moment départage : le matin reste.
  expect(dates(prochainsServicesSansSetlist(seances, setlists, ["Campus"], "2026-10-08"))).toEqual([
    "Campus 2026-10-10 matin",
  ]);
});

test("(pur) Campus : une ancienne setlist sans moment se reconnaît à sa présidence", () => {
  const seances = [
    seance("Campus", "2026-10-10", "Présidence A", "matin"),
    seance("Campus", "2026-10-10", "Présidence B", "soir"),
  ];
  // Graphie différente, même personne (normalizeName) : le matin est pris.
  const prise = [{ category: "Campus", date: "2026-10-10", leader: "présidence a" }];
  expect(dates(prochainsServicesSansSetlist(seances, prise, ["Campus"], "2026-10-08"))).toEqual([
    "Campus 2026-10-10 soir",
  ]);
  // Ni moment ni présidence reconnue : ambigu, les deux restent proposés.
  const ambigue = [{ category: "Campus", date: "2026-10-10", leader: "Présidence C" }];
  expect(prochainsServicesSansSetlist(seances, ambigue, ["Campus"], "2026-10-08")).toHaveLength(2);
});

test("(pur) tri par date, puis dans l'ordre du planning", () => {
  const seances = [
    seance("Groupe Paix", "2026-10-18"),
    seance(CULTE, "2026-10-11"),
    seance(CULTE, "2026-10-18"),
    seance("Campus", "2026-10-11", "", "matin"),
    seance("Campus", "2026-10-11", "", "soir"),
  ];
  expect(dates(prochainsServicesSansSetlist(seances, [], [CULTE, "Groupe Paix", "Campus"], "2026-10-08"))).toEqual([
    `${CULTE} 2026-10-11`,
    "Campus 2026-10-11 matin",
    "Campus 2026-10-11 soir",
    "Groupe Paix 2026-10-18",
    `${CULTE} 2026-10-18`,
  ]);
});

test("(pur) planning vide : aucun service", () => {
  expect(prochainsServicesSansSetlist([], [], [CULTE], "2026-10-08")).toEqual([]);
});
