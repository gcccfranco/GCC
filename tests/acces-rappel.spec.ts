import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { PlanningData } from "../src/lib/planning/names";
import { estLundi, lignesSansEquipe, sansEquipeParReferent, titreSansEquipe, type EquipeRappel } from "../src/lib/acces/rappelSansEquipe";

// Lot AO, AO-E (docs/spec-acces-organigramme.md) : le lundi, au référent concerné, une ligne de plus dans le
// rappel du matin — « N personnes au planning de ce mois ne sont dans aucune équipe ». Logique pure, noms inventés.

const LUNDI = "2026-10-19";

const vide: PlanningData = {
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
  edd: {}, campus: [], intergroupe: [], interfranco: [],
};

// Colonnes du culte : 1 présidence, 2-3 choristes, 4-6 instruments, 7 sono, 8 PPT, 9 orateur.
const culte = (date: string, c: Record<number, string>) =>
  [date, ...Array.from({ length: 11 }, (_, i) => c[i + 1] ?? "")];

const membre = (nom: string, uid = "", referent = false) => ({ nom, uid, referent });
const equipes: EquipeRappel[] = [
  { id: "louange", membres: [membre("Odile Vance", "uid-ref-louange", true), membre("Pia Marek", "uid-pia")] },
  { id: "regie", membres: [membre("Rémi Dorval", "uid-ref-regie", true)] },
  { id: "edd", membres: [membre("Sabine Luce", "uid-ref-edd", true)] },
  { id: "medias", membres: [membre("Hugo Perrin")] },
];
const profils = [{ uid: "uid-pia", planningName: "Pia M." }, { uid: "uid-tess", planningName: "Tess Orsay" }];

test("une choriste du culte sans équipe : au référent Louange, avec ou sans compte", () => {
  const planning = { ...vide, culte: [culte("2026-10-25", { 2: "Zoé Bantam", 3: "Tess Orsay", 1: "Pia M." })] };
  const out = sansEquipeParReferent(planning, equipes, profils, LUNDI);
  // Pia M. est de l'organigramme par son compte ; Tess a un compte mais aucune équipe ; Zoé n'a rien.
  expect(out.get("uid-ref-louange")).toEqual(["Tess Orsay", "Zoé Bantam"]);
  expect(out.size).toBe(1);
});

test("sono et PPT : au référent Régie, qui ne reçoit pas les noms de Louange", () => {
  const planning = { ...vide, culte: [culte("2026-10-25", { 2: "Zoé Bantam", 7: "Noé Gaspard", 8: "Lise Ormont" })] };
  const out = sansEquipeParReferent(planning, equipes, profils, LUNDI);
  expect(out.get("uid-ref-regie")).toEqual(["Lise Ormont", "Noé Gaspard"]);
  expect(out.get("uid-ref-louange")).toEqual(["Zoé Bantam"]);
});

test("Intergroupe, Interfranco et Campus comptent comme le culte", () => {
  const planning: PlanningData = {
    ...vide,
    intergroupe: [["2026-10-11", "Ugo Faure", "", "", "", "", "", "", "Yann Roc"]],
    interfranco: [["2026-10-18", "Vera Lund", "", "", "", "", "", "Wim Soler"]],
    campus: [{ d: "20/10 Soir", date: "2026-10-20", pres: "Ana Brize", ch: "", mu: "", rg: "Ivo Marsan", ent: "", chants: [] }],
  };
  const out = sansEquipeParReferent(planning, equipes, profils, LUNDI);
  expect(out.get("uid-ref-louange")).toEqual(["Ana Brize", "Ugo Faure", "Vera Lund"]);
  expect(out.get("uid-ref-regie")).toEqual(["Ivo Marsan", "Wim Soler", "Yann Roc"]);
});

test("une classe de l'EDD : au référent EDD", () => {
  const planning: PlanningData = {
    ...vide,
    edd: { P5_SepOct: { label: "Sep–Oct", classes: { "中班": [["2026-10-18", "Cléo Brandt", "Sabine Luce"]] } } },
  };
  const out = sansEquipeParReferent(planning, equipes, profils, LUNDI);
  expect(out.get("uid-ref-edd")).toEqual(["Cléo Brandt"]);
  expect(out.size).toBe(1);
});

test("quelqu'un de l'organigramme n'est pas listé : par nom, accents et casse pliés, ou par compte", () => {
  const planning = { ...vide, culte: [culte("2026-10-25", { 1: "odile  vance", 2: "PIA M", 3: "Hugo Perrin" })] };
  expect(sansEquipeParReferent(planning, equipes, profils, LUNDI).size).toBe(0);
});

test("pas lundi : rien", () => {
  const planning = { ...vide, culte: [culte("2026-10-25", { 2: "Zoé Bantam" })] };
  for (const jour of ["2026-10-20", "2026-10-21", "2026-10-25"]) {
    expect(sansEquipeParReferent(planning, equipes, profils, jour).size, jour).toBe(0);
  }
  expect(estLundi(LUNDI)).toBe(true);
  expect(estLundi("2026-10-22")).toBe(false);
});

test("un nom du mois suivant ou du mois passé : rien", () => {
  const planning = { ...vide, culte: [culte("2026-11-01", { 2: "Zoé Bantam" }), culte("2026-09-27", { 2: "Tess Orsay" })] };
  expect(sansEquipeParReferent(planning, equipes, profils, LUNDI).size).toBe(0);
});

test("un planning de groupe, la Table ou le petit déj : rien", () => {
  const planning: PlanningData = {
    ...vide,
    paix: [["2026-10-25", "Gaël Rivet", "Maud Esteve"]],
    fidelite: [["2026-10-25", "Gaël Rivet"]],
    bonte: [["2026-10-25", "Gaël Rivet"]],
    dejeuner: [["2026-10-25", "Maud Esteve"]],
    petitDej: [["2026-10-25", "Maud Esteve"]],
  };
  expect(sansEquipeParReferent(planning, equipes, profils, LUNDI).size).toBe(0);
});

test("zéro nom : rien ; un référent sans compte n'est pas joignable", () => {
  expect(sansEquipeParReferent(vide, equipes, profils, LUNDI).size).toBe(0);
  const sansCompte: EquipeRappel[] = [{ id: "louange", membres: [membre("Odile Vance", "", true)] }];
  const planning = { ...vide, culte: [culte("2026-10-25", { 2: "Zoé Bantam" })] };
  expect(sansEquipeParReferent(planning, sansCompte, [], LUNDI).size).toBe(0);
});

test("les libellés, en français (singulier et pluriel) et en 中文", () => {
  expect(lignesSansEquipe(["Tess Orsay", "Zoé Bantam"], "fr")).toEqual([
    "2 personnes au planning de ce mois ne sont dans aucune équipe : Tess Orsay, Zoé Bantam",
    "À placer : Back-Office › Équipes",
  ]);
  expect(lignesSansEquipe(["Tess Orsay"], "fr")[0]).toBe("1 personne au planning de ce mois n'est dans aucune équipe : Tess Orsay");
  expect(lignesSansEquipe(["Tess Orsay", "周小秋"], "zh-CN")).toEqual([
    "本月排班中有 2 人不在任何团队：Tess Orsay、周小秋",
    "请在此安排：后台 › 团队",
  ]);
  expect(lignesSansEquipe([], "fr")).toEqual([]);
  expect(titreSansEquipe("fr")).toBe("Équipes");
  expect(titreSansEquipe("zh-CN")).toBe("团队");
});

test("la route n'appelle cette logique que sous BACK_OFFICE, et marque une clé par semaine et par référent", () => {
  const route = readFileSync("src/app/api/cron/reminders/route.ts", "utf8");
  expect(route).toMatch(/BACK_OFFICE \? await sansEquipeDuLundi\(/);
  expect(route.match(/sansEquipeDuLundi\(/g)).toHaveLength(2); // la définition et l'unique appel
  expect(route).toContain("const cleSansEquipe = `sans-equipe-${today}`");
  expect(route).toMatch(/markNotified\(db, \[u\], cleSansEquipe/);
});
