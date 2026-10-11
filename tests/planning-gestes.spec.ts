import { expect, test } from "@playwright/test";
import {
  GRILLE_CAMPUS_MATIN, GRILLE_CULTE, GRILLE_INTERFRANCO, GRILLE_TABLE,
} from "../src/lib/planning/grilles";
import {
  colonnesACopier, datesApres, enTexteTabule, lignePrecedente, lireCollage, parDimanche, planCollage, planCopie, planRemplir,
} from "../src/lib/planning/gestes";

// Lot 3 du chantier « équipes et groupes » (docs/spec-planning-gestes.md) : les gestes de la
// grille. Fonctions pures, sans navigateur. Noms fictifs seulement.

const cle = (def: { colonnes: { cle: string }[] }) => def.colonnes.map((c) => c.cle);

test("lignePrecedente : J−7 d'un planning hebdomadaire, même d'une année sur l'autre", () => {
  const dates = ["2026-12-20", "2026-12-27", "2027-01-03", "2027-01-10"];
  expect(lignePrecedente(GRILLE_CULTE, dates, "2027-01-03")).toBe("2026-12-27");
  expect(lignePrecedente(GRILLE_CULTE, dates, "2027-01-10")).toBe("2027-01-03");
});

test("lignePrecedente : absente de la liste, donc vide ; un trou ne remonte pas plus loin", () => {
  expect(lignePrecedente(GRILLE_CULTE, ["2027-01-03", "2027-01-17"], "2027-01-17")).toBeNull();
  expect(lignePrecedente(GRILLE_CULTE, ["2027-01-03"], "2027-01-03")).toBeNull();
});

test("lignePrecedente : à dates choisies, la date posée qui précède, même plusieurs semaines avant", () => {
  const dates = ["2027-01-10", "2027-03-14", "2027-06-13"];
  expect(lignePrecedente(GRILLE_INTERFRANCO, dates, "2027-03-14")).toBe("2027-01-10");
  expect(lignePrecedente(GRILLE_CAMPUS_MATIN, dates, "2027-06-13")).toBe("2027-03-14");
  expect(lignePrecedente(GRILLE_INTERFRANCO, dates, "2027-01-10")).toBeNull();
});

test("colonnesACopier : sans Thème ni Orateur, sans lecture seule, facultatives comprises", () => {
  const culte = colonnesACopier(GRILLE_CULTE).map((c) => c.cle);
  expect(culte).not.toContain("orateur");
  expect(culte).toContain("sainteCene");
  expect(culte).toContain("presidence");
  const table = colonnesACopier(GRILLE_TABLE).map((c) => c.cle);
  expect(table).not.toContain("petitDej");
  expect(cle(GRILLE_TABLE)).toContain("petitDej");
});

test("colonnesACopier : le Campus ne recopie ni les chants ni la Répétition (décision 45, Q2)", () => {
  const colonnes = colonnesACopier(GRILLE_CAMPUS_MATIN).map((c) => c.cle);
  for (const texte of ["chant1", "chant2", "chant3", "chant4", "repetition", "theme"]) expect(colonnes).not.toContain(texte);
  expect(colonnes.length).toBeGreaterThan(0);
});

const valeurs = (o: Record<string, string>) => (date: string, c: string) => o[`${date}|${c}`] ?? "";

test("planCopie : vides et remplacements comptés, même nom ignoré", () => {
  const lire = valeurs({
    "2027-01-17|presidence": "Ruth K.", "2027-01-17|piano": "Yann M.", "2027-01-17|sono": "Zoé T.", "2027-01-17|ppt": "",
    "2027-01-24|presidence": "Ruth K.", "2027-01-24|piano": "Anaïs P.",
  });
  const cols = colonnesACopier(GRILLE_CULTE).filter((c) => ["presidence", "piano", "sono", "ppt"].includes(c.cle));
  const plan = planCopie({ colonnes: cols, source: "2027-01-17", cible: "2027-01-24", lire, verrou: () => false });
  expect(plan.vides).toEqual([{ date: "2027-01-24", cle: "sono", avant: "", apres: "Zoé T." }]);
  expect(plan.remplace).toEqual([{ date: "2027-01-24", cle: "piano", avant: "Anaïs P.", apres: "Yann M." }]);
  expect(plan.verrouillees).toBe(0);
});

test("planCopie : une case verrouillée, à la source comme à la cible, est sautée et comptée", () => {
  const lire = valeurs({ "2027-01-17|presidence": "Paix", "2027-01-17|piano": "Yann M.", "2027-01-17|sono": "Zoé T." });
  const verrou = (d: string, c: string) => (d === "2027-01-17" && c === "presidence") || (d === "2027-01-24" && c === "sono");
  const cols = colonnesACopier(GRILLE_CULTE).filter((c) => ["presidence", "piano", "sono"].includes(c.cle));
  const plan = planCopie({ colonnes: cols, source: "2027-01-17", cible: "2027-01-24", lire, verrou });
  expect(plan.vides.map((c) => c.cle)).toEqual(["piano"]);
  expect(plan.verrouillees).toBe(2);
});

test("planRemplir : les seules cases vides après la case, jusqu'au dernier dimanche du trimestre", () => {
  const dates = ["2027-03-14", "2027-03-21", "2027-03-28", "2027-04-04"];
  const lire = valeurs({ "2027-03-14|piano": "Yann M.", "2027-03-21|piano": "Anaïs P." });
  const plan = planRemplir({ cle: "piano", nom: "Yann M.", dates: datesApres(dates, "2027-03-14"), lire, verrou: () => false });
  expect(plan.cases).toEqual([{ date: "2027-03-28", cle: "piano", avant: "", apres: "Yann M." }]);
  expect(plan.fin).toBe("2027-03-28");
});

test("planRemplir : une case verrouillée est sautée et comptée", () => {
  const dates = ["2027-03-21", "2027-03-28"];
  const plan = planRemplir({ cle: "presidence", nom: "Ruth K.", dates, lire: valeurs({}), verrou: (d) => d === "2027-03-21" });
  expect(plan.cases.map((c) => c.date)).toEqual(["2027-03-28"]);
  expect(plan.verrouillees).toBe(1);
});

test("datesApres : après la date, dans le même trimestre seulement", () => {
  expect(datesApres(["2027-03-14", "2027-03-28", "2027-04-04"], "2027-03-14")).toEqual(["2027-03-28"]);
});

test("lireCollage : le texte de Google Sheets et d'Excel", () => {
  expect(lireCollage("a\tb\nc\td\n")).toEqual([["a", "b"], ["c", "d"]]);
  expect(lireCollage("a\tb\r\nc\td\r\n")).toEqual([["a", "b"], ["c", "d"]]);
  expect(lireCollage("seul")).toEqual([["seul"]]);
  expect(lireCollage("a\t\tc")).toEqual([["a", "", "c"]]);
  expect(lireCollage("")).toEqual([]);
});

test("lireCollage : cellules entre guillemets, guillemets doublés, saut de ligne remplacé par « , »", () => {
  expect(lireCollage('"Yann ""Y"" M."\tb')).toEqual([['Yann "Y" M.', "b"]]);
  expect(lireCollage('"Yann\nAnaïs"\tb\nc\td')).toEqual([["Yann, Anaïs", "b"], ["c", "d"]]);
});

test("planCollage : à partir de l'ancre, sur les colonnes affichées ; une cellule vide n'efface rien", () => {
  const dates = ["2027-01-03", "2027-01-10", "2027-01-17"];
  const cles = ["presidence", "choriste1", "piano"];
  const lire = valeurs({ "2027-01-10|choriste1": "Anaïs P.", "2027-01-10|piano": "Yann M." });
  const plan = planCollage({ bloc: [["Ruth K.", "", "Zoé T."], ["Léa D.", "Max R."]], ligne: 1, col: 0, dates, cles, lire, verrou: () => false });
  expect(plan.cases).toEqual([
    { date: "2027-01-10", cle: "presidence", avant: "", apres: "Ruth K." },
    { date: "2027-01-10", cle: "piano", avant: "Yann M.", apres: "Zoé T." },
    { date: "2027-01-17", cle: "presidence", avant: "", apres: "Léa D." },
    { date: "2027-01-17", cle: "choriste1", avant: "", apres: "Max R." },
  ]);
  expect(plan.remplace).toBe(1);
  expect(plan.horsGrille).toBe(0);
});

test("planCollage : ce qui dépasse est coupé et compté ; verrouillées comptées ; valeur égale ignorée", () => {
  const dates = ["2027-01-03", "2027-01-10"];
  const cles = ["presidence", "piano"];
  const lire = valeurs({ "2027-01-10|piano": "Yann M." });
  const verrou = (d: string, c: string) => d === "2027-01-10" && c === "presidence";
  const plan = planCollage({ bloc: [["a", "b", "c"], ["d", "Yann M."], ["x", "y"]], ligne: 0, col: 0, dates, cles, lire, verrou });
  expect(plan.cases.map((c) => `${c.date}|${c.cle}`)).toEqual(["2027-01-03|presidence", "2027-01-03|piano"]);
  expect(plan.horsGrille).toBe(1 + 2);
  expect(plan.verrouillees).toBe(1);
});

test("enTexteTabule : une ligne par dimanche, tabulations, la case masquée copiée vide", () => {
  const dates = ["2027-01-03", "2027-01-10"];
  const lire = valeurs({ "2027-01-03|presidence": "Paix", "2027-01-03|piano": "Yann M.", "2027-01-10|piano": "Léa D." });
  const texte = enTexteTabule(dates, ["presidence", "piano"], lire, (d, c) => c === "presidence" && d === "2027-01-03");
  expect(texte).toBe("\tYann M.\n\tLéa D.");
});

test("parDimanche : un groupe par dimanche, dans l'ordre des dates, tous les champs", () => {
  const groupes = parDimanche([
    { date: "2027-01-17", cle: "piano", avant: "", apres: "A" },
    { date: "2027-01-10", cle: "sono", avant: "", apres: "B" },
    { date: "2027-01-17", cle: "ppt", avant: "x", apres: "C" },
  ]);
  expect(groupes).toEqual([
    { date: "2027-01-10", champs: { sono: "B" } },
    { date: "2027-01-17", champs: { piano: "A", ppt: "C" } },
  ]);
});
