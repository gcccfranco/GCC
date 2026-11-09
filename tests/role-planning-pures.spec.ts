import { expect, test } from "@playwright/test";
import { findMyServices, instrumentDuNom } from "../src/lib/planning/names";
import type { PlanningData } from "../src/lib/planning/names";
import { roleDuPlanning } from "../src/lib/planning/rolePlanning";
import type { CampusSeance } from "../src/lib/planning/utils";

// Lot RP, tranche RP-1 (docs/spec-mode-louange-forscore-2.md) : le rôle proposé d'après le planning. Spec sans page.
// Noms et dates fictifs.

const D = "2026-11-15";
const vide = (): PlanningData => ({
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
  edd: {}, campus: [], intergroupe: [], interfranco: [],
});
const ligne = (n: number, cases: Record<number, string>, date = D): string[] => {
  const r = Array(n).fill("");
  r[0] = date;
  for (const [i, v] of Object.entries(cases)) r[Number(i)] = v;
  return r;
};
const seance = (o: Partial<CampusSeance>): CampusSeance => ({
  d: "Matin", date: D, pres: "", ch: "", mu: "", rg: "", ent: "", chants: [], ...o,
});
const role = (
  data: PlanningData, nom: string,
  setlist: { date?: string; category?: string; moment?: "matin" | "soir" },
  joue?: string[],
) => roleDuPlanning(findMyServices(data, nom), setlist, joue);

const LINA = "Lina Roussel";
const MARC = "Marc Tissier";

test("a. Culte Franco, Piano", () => {
  const d = vide();
  d.culte = [ligne(12, { 4: LINA })];
  expect(role(d, LINA, { date: D, category: "Culte Francophone" })).toBe("pianiste");
});

test("b. Groupe Fidélité, Batterie", () => {
  const d = vide();
  d.fidelite = [ligne(8, { 6: LINA })];
  expect(role(d, LINA, { date: D, category: "Groupe Fidélité" })).toBe("batteur");
});

test("c. EDD, Cajon", () => {
  const d = vide();
  d.edd = { P6_NovDec: { label: "Nov-Déc", classes: { 中班: [ligne(8, { 4: LINA })] } } };
  expect(role(d, LINA, { date: D, category: "中班" })).toBe("batteur");
});

test("d. Interfranco, Cajon/Batterie", () => {
  const d = vide();
  d.interfranco = [ligne(12, { 6: LINA })];
  expect(role(d, LINA, { date: D, category: "Interfranco" })).toBe("batteur");
});

test("e. Groupe Paix, Percussion", () => {
  const d = vide();
  d.paix = [ligne(8, { 5: LINA })];
  expect(role(d, LINA, { date: D, category: "Groupe Paix" })).toBe("batteur");
});

test("f. Choriste et Présidence", () => {
  const d = vide();
  d.culte = [ligne(12, { 2: LINA, 1: MARC })];
  const s = { date: D, category: "Culte Francophone" };
  expect(role(d, LINA, s)).toBe("choriste");
  expect(role(d, MARC, s)).toBe("presidence");
});

test("g. Musicien sans préfixe : joue", () => {
  const d = vide();
  d.bonte = [ligne(8, { 2: LINA })];
  const s = { date: D, category: "Groupe Bonté" };
  expect(role(d, LINA, s, ["guitare"])).toBe("guitariste");
  expect(role(d, LINA, s, ["guitare", "basse"])).toBe("guitariste");
  expect(role(d, LINA, s, ["piano", "guitare"])).toBeNull();
  expect(role(d, LINA, s)).toBeNull();
});

test("h. Campus, préfixe d'instrument", () => {
  const d = vide();
  d.campus = [seance({ mu: `Piano: ${LINA}, Guitare: ${MARC}` })];
  const s = { date: D, category: "Campus", moment: "matin" as const };
  expect(role(d, LINA, s)).toBe("pianiste");
  expect(role(d, MARC, s)).toBe("guitariste");
  expect(instrumentDuNom(`Piano: ${LINA}, Guitare: ${MARC}`, MARC)).toBe("Guitare");
  expect(instrumentDuNom(`Piano: ${LINA}`, MARC)).toBeUndefined();
  expect(instrumentDuNom(LINA, LINA)).toBeUndefined();
  expect(instrumentDuNom(undefined, LINA)).toBeUndefined();
  d.campus = [seance({ mu: `Basse: ${LINA}` })];
  expect(role(d, LINA, s, ["piano"])).toBeNull();
});

test("i. Campus séance et répétition dédoublonnées", () => {
  const d = vide();
  d.campus = [seance({ ch: "Ondine Pradel", ent: "2026-11-12" })];
  expect(role(d, "Ondine Pradel", { date: D, category: "Campus", moment: "matin" })).toBe("choriste");
  expect(role(d, "Ondine Pradel", { date: "2026-11-12", category: "Campus", moment: "matin" })).toBeNull();
});

test("j. Campus matin et soir le même jour", () => {
  const d = vide();
  d.campus = [
    seance({ d: "Matin", mu: `Piano: ${LINA}` }),
    seance({ d: "Soir", ch: LINA }),
  ];
  const s = { date: D, category: "Campus" };
  expect(role(d, LINA, { ...s, moment: "matin" })).toBe("pianiste");
  expect(role(d, LINA, { ...s, moment: "soir" })).toBe("choriste");
  expect(role(d, LINA, s)).toBeNull();
});

test("k. deux rôles le même service", () => {
  const d = vide();
  d.culte = [ligne(12, { 4: LINA, 5: LINA })];
  expect(role(d, LINA, { date: D, category: "Culte Francophone" })).toBeNull();
  d.paix = [ligne(8, { 1: "Yanis Coudert", 3: "Yanis Coudert" })];
  expect(role(d, "Yanis Coudert", { date: D, category: "Groupe Paix" })).toBe("presidence");
});

test("l. même jour, deux services", () => {
  const d = vide();
  d.culte = [ligne(12, { 4: LINA })];
  d.interfranco = [ligne(12, { 5: LINA })];
  expect(role(d, LINA, { date: D, category: "Culte Francophone" })).toBe("pianiste");
  expect(role(d, LINA, { date: D, category: "Interfranco" })).toBe("guitariste");
});

test("m. aucune proposition", () => {
  const d = vide();
  d.culte = [ligne(12, { 4: LINA, 7: MARC })];
  expect(role(d, LINA, { category: "Culte Francophone" })).toBeNull();
  expect(role(d, LINA, { date: D })).toBeNull();
  expect(role(d, LINA, { date: D, category: "Autre" })).toBeNull();
  expect(role(d, LINA, { date: "2026-11-22", category: "Culte Francophone" })).toBeNull();
  expect(role(d, "", { date: D, category: "Culte Francophone" })).toBeNull();
  expect(role(d, MARC, { date: D, category: "Culte Francophone" })).toBeNull();
});
