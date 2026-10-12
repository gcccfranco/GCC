import { expect, test } from "@playwright/test";
import {
  GRILLE_CAMPUS_MATIN, GRILLE_CULTE, GRILLE_INTERFRANCO, GRILLE_TABLE,
} from "../src/lib/planning/grilles";
import {
  borne, casesDuTrimestre, changementsDepuis, verifierReference, datesDesChangements, etatApres, personnesTouchees, premierDimancheDepuis, verifierChangements,
} from "../src/lib/planning/prevenir";
import { changementPlanningMessage, changementPlanningParDefaut } from "../src/lib/push/messages";
import { PUBLISHABLE_PLANNINGS, peutPrevenir } from "../src/lib/planning/releases";
import { GRILLE_PAIX } from "../src/lib/planning/grilles";
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

test("planCollage : une cellule de plus de 200 caractères est refusée et comptée", () => {
  const plan = planCollage({ bloc: [["x".repeat(201), "Ruth K."]], ligne: 0, col: 0, dates: ["2027-01-03"], cles: ["a", "b"], lire: () => "", verrou: () => false });
  expect(plan.tropLongues).toBe(1);
  expect(plan.cases.map((c) => c.apres)).toEqual(["Ruth K."]);
});

// ─── PG-E : prévenir des changements (PG33 à PG47) ──────────────────────────

const TOUT = new Set(["presidence", "musiciens", "orateur", "theme", "percussion"]);
const ETAT = {
  cases: { "2026-11-15|presidence": "Ruth K.", "2026-11-22|musiciens": "Hugo L.", "2026-11-22|orateur": "Joël F.", "2026-11-29|theme": "Ancien thème", "2026-11-08|presidence": "Ruth K." },
};

test("premierDimancheDepuis : le dimanche en cours est le premier dimanche égal ou postérieur au jour", () => {
  expect(premierDimancheDepuis("2026-11-15")).toBe("2026-11-15");
  expect(premierDimancheDepuis("2026-11-16")).toBe("2026-11-22");
  expect(premierDimancheDepuis("2026-11-21")).toBe("2026-11-22");
});

test("casesDuTrimestre : sans case vide, sans colonne en lecture seule, sans présidence imposée", () => {
  const lignes = [
    ["2026-11-15", "Anaïs P.", "", "", ""],
    ["2026-11-22", "Interfranco", "Hugo L.", "Orateur O.", ""],
  ];
  const cases = casesDuTrimestre(GRILLE_PAIX, lignes, { "2026-11-22": "Interfranco" });
  expect(cases).toEqual({ "2026-11-15|presidence": "Anaïs P.", "2026-11-22|musiciens": "Hugo L.", "2026-11-22|orateur": "Orateur O." });
  const table = casesDuTrimestre(GRILLE_TABLE, [["2026-11-15", "Équipe E.", "Yann M.", ""]], {});
  expect(Object.keys(table).every((k) => !k.endsWith("|petitDej"))).toBe(true);
});

test("changementsDepuis : ajouts, retraits et vidages ; un dimanche passé, une valeur du Sheet et le même nom ne comptent pas", () => {
  const cases = {
    "2026-11-15|presidence": "Anaïs P.", "2026-11-22|musiciens": "Pasteur Lin", "2026-11-29|theme": "Nouveau thème",
    "2026-11-08|presidence": "Hugo L.", "2026-12-06|piano": "Zoé T.", "2026-12-13|sono": "Éloïse M.",
  };
  const ecrites = new Set([
    "2026-11-15|presidence", "2026-11-22|musiciens", "2026-11-22|orateur", "2026-11-29|theme", "2026-11-08|presidence", "2026-12-13|sono",
  ]);
  const ch = changementsDepuis({ ...ETAT, cases: { ...ETAT.cases, "2026-12-13|sono": "Éloïse M." } }, cases, ecrites, "2026-11-15");
  expect(ch).toEqual([
    { date: "2026-11-15", cle: "presidence", avant: "Ruth K.", apres: "Anaïs P." },
    { date: "2026-11-22", cle: "musiciens", avant: "Hugo L.", apres: "Pasteur Lin" },
    { date: "2026-11-22", cle: "orateur", avant: "Joël F.", apres: "" },
    { date: "2026-11-29", cle: "theme", avant: "Ancien thème", apres: "Nouveau thème" },
  ]);
  // Une case jamais écrite dans l'app (valeur du Sheet, reprise de Fidélité) n'est jamais « changée » : piano du 06/12 absent de `ecrites`.
  expect(ch.some((c) => c.cle === "piano")).toBe(false);
  expect(changementsDepuis(null, cases, ecrites, "2026-11-15")).toEqual([]);
  expect(datesDesChangements(ch)).toEqual(["2026-11-15", "2026-11-22", "2026-11-29"]);
});

test("personnesTouchees : ajout, retrait, une personne sur deux cases comptée une fois, sans compte, texte libre ignoré", () => {
  const ch = [
    { date: "2026-11-15", cle: "presidence", avant: "Ruth K.", apres: "Anaïs P." },
    { date: "2026-11-22", cle: "musiciens", avant: "Hugo L., Ruth K.", apres: "Pasteur Lin, Anaïs P." },
    { date: "2026-11-29", cle: "theme", avant: "A", apres: "Léa M." },
  ];
  const gens = personnesTouchees(ch, (n) => n !== "Pasteur Lin");
  const par = Object.fromEntries(gens.map((p) => [p.nom, p]));
  expect(Object.keys(par).sort()).toEqual(["Anaïs P.", "Hugo L.", "Pasteur Lin", "Ruth K."]);
  expect(par["Anaïs P."].motifs).toEqual([
    { sens: "ajout", date: "2026-11-15", cle: "presidence" },
    { sens: "ajout", date: "2026-11-22", cle: "musiciens" },
  ]);
  // Ruth K. est retirée de deux cases : une personne, deux motifs.
  expect(par["Ruth K."].motifs.map((m) => m.sens)).toEqual(["retrait", "retrait"]);
  expect(par["Pasteur Lin"].compte).toBe(false);
  expect(par["Hugo L."].compte).toBe(true);
});

test("personnesTouchees : déplacée (retirée d'une case, ajoutée à une autre) porte les deux pastilles", () => {
  const gens = personnesTouchees([
    { date: "2026-11-15", cle: "presidence", avant: "Ruth K.", apres: "" },
    { date: "2026-11-22", cle: "orateur", avant: "", apres: "Ruth K." },
  ], () => true);
  expect(gens).toHaveLength(1);
  expect(gens[0].motifs.map((m) => m.sens)).toEqual(["retrait", "ajout"]);
});

test("verifierChangements : avant, après, date et trimestre doivent correspondre", () => {
  const dimanches = { "2026-11-15": { presidence: "Anaïs P." }, "2026-11-22": { orateur: "" } };
  const bon = { date: "2026-11-15", cle: "presidence", avant: "Ruth K.", apres: "Anaïs P." };
  const T = { annee: 2026, tri: "T4" };
  expect(verifierChangements(ETAT, dimanches, [bon], "2026-11-15", T, TOUT)).toEqual({ ok: true });
  expect(verifierChangements(ETAT, dimanches, [{ ...bon, avant: "Autre" }], "2026-11-15", T, TOUT).ok).toBe(false);
  expect(verifierChangements(ETAT, dimanches, [{ ...bon, apres: "Autre" }], "2026-11-15", T, TOUT).ok).toBe(false);
  expect(verifierChangements(ETAT, dimanches, [{ date: "2026-11-08", cle: "presidence", avant: "Ruth K.", apres: "" }], "2026-11-15", T, TOUT).ok).toBe(false);
  expect(verifierChangements(ETAT, dimanches, [{ date: "2027-01-03", cle: "presidence", avant: "", apres: "" }], "2026-11-15", T, TOUT).ok).toBe(false);
  expect(verifierChangements(ETAT, dimanches, [], "2026-11-15", T, TOUT).ok).toBe(false);
  // REVUE : seule une colonne de la grille, hors lecture seule, peut changer (pas modifiePar, pas un champ inconnu).
  const colonnes = new Set(["presidence", "orateur"]);
  const intrus = { date: "2026-11-15", cle: "modifiePar", avant: "", apres: "x" };
  const dim2 = { "2026-11-15": { presidence: "Anaïs P.", modifiePar: "x" } };
  expect(verifierChangements({ cases: {} } as never, dim2, [intrus], "2026-11-15", T, colonnes)).toEqual({ ok: false, raison: "colonne hors grille" });
  expect(verifierChangements(ETAT, dimanches, [bon], "2026-11-15", T, colonnes)).toEqual({ ok: true });
  // Un vidage : « après » absent du document = vide.
  expect(verifierChangements(ETAT, dimanches, [{ date: "2026-11-22", cle: "orateur", avant: "Joël F.", apres: "" }], "2026-11-15", T, TOUT)).toEqual({ ok: true });
});

test("etatApres : l'état annoncé reprend les valeurs « après » ; une case vidée disparaît", () => {
  const apres = etatApres(ETAT, [
    { date: "2026-11-15", cle: "presidence", avant: "Ruth K.", apres: "Anaïs P." },
    { date: "2026-11-22", cle: "orateur", avant: "Joël F.", apres: "" },
  ]);
  expect(apres["2026-11-15|presidence"]).toBe("Anaïs P.");
  expect(apres).not.toHaveProperty("2026-11-22|orateur");
  expect(apres["2026-11-22|musiciens"]).toBe("Hugo L.");
});

test("peutPrevenir : admin, notify « tout le monde », notify de la catégorie ; ni l'un ni l'autre, ni `plannings` seul", () => {
  const paix = PUBLISHABLE_PLANNINGS.find((p) => p.key === "paix")!;
  expect(peutPrevenir(paix, true, [])).toBe(true);
  expect(peutPrevenir(paix, false, ["*"])).toBe(true);
  expect(peutPrevenir(paix, false, ["Groupe Paix"])).toBe(true);
  expect(peutPrevenir(paix, false, ["Groupe Bonté"])).toBe(false);
  expect(peutPrevenir(paix, false, [])).toBe(false);
});

test("changementPlanningParDefaut : titre et message pré-remplis, FR et 中文", () => {
  expect(changementPlanningParDefaut({ label: "Groupe Paix", dates: ["2026-11-15", "2026-11-22"] }, "fr")).toEqual({
    title: "Planning Paix : changement le 15/11 et le 22/11",
    body: "Le planning du groupe Paix a changé. Ouvre-le pour voir ta place.",
  });
  expect(changementPlanningParDefaut({ label: "Culte Franco", dates: ["2026-11-15"] }, "fr")).toEqual({
    title: "Planning Culte Franco : changement le 15/11",
    body: "Le planning du Culte Franco a changé. Ouvre-le pour voir ta place.",
  });
  expect(changementPlanningParDefaut({ label: "Groupe Paix", dates: ["2026-11-15", "2026-11-22", "2026-11-29", "2026-12-06"] }, "fr").title)
    .toBe("Planning Paix : changement le 15/11, le 22/11, le 29/11 et 1 autre");
  const zh = changementPlanningParDefaut({ label: "Groupe Paix", dates: ["2026-11-15", "2026-11-22"] }, "zh-CN");
  expect(zh.title).toContain("11月15日");
  expect(zh.title).toContain("11月22日");
});

test("changementPlanningMessage : la place de chacun après le changement, ou « tu n'es plus au planning »", () => {
  const jours = [{ date: "2026-11-15", roles: ["Présidence"] }, { date: "2026-11-22", roles: [] }];
  const fr = changementPlanningMessage({ titre: "T", message: "M", jours }, "fr");
  expect(fr.title).toBe("T");
  expect(fr.body).toBe("Dim. 15/11 : Présidence\nDim. 22/11 : tu n'es plus au planning\nM");
  const zh = changementPlanningMessage({ titre: "T", message: "M", jours: [{ date: "2026-11-15", roles: ["司会", "吉他"] }, { date: "2026-11-22", roles: [] }] }, "zh-CN");
  expect(zh.body).toBe("11月15日主日：司会、吉他\n11月22日主日：你已不在服事表上\nM");
});

test("verifierChangements : refuse sans état annoncé (brouillon) et pour une case jamais écrite dans le document", () => {
  const T = { annee: 2026, tri: "T4" };
  const ch = { date: "2026-11-15", cle: "presidence", avant: "", apres: "" };
  expect(verifierChangements(null, {}, [{ ...ch, avant: "", apres: "Anaïs P." }], "2026-11-15", T, TOUT).ok).toBe(false);
  expect(verifierChangements(undefined, { "2026-11-15": { presidence: "Anaïs P." } }, [{ ...ch, apres: "Anaïs P." }], "2026-11-15", T, TOUT).ok).toBe(false);
  // Un « avant » forgé sur une case que le document ne porte pas : refusé.
  expect(verifierChangements({ cases: { "2026-11-15|presidence": "Nom X" } }, { "2026-11-15": {} }, [{ ...ch, avant: "Nom X", apres: "" }], "2026-11-15", T, TOUT).ok).toBe(false);
});

test("borne : les valeurs longues sont tronquées de la même façon des deux côtés, jamais rejetées", () => {
  const long = "x".repeat(500);
  expect(borne(long)).toHaveLength(200);
  const cases = casesDuTrimestre(GRILLE_PAIX, [["2026-11-15", "", "", "", long]], {});
  expect(cases["2026-11-15|theme"]).toHaveLength(200);
  const T = { annee: 2026, tri: "T4" };
  const etat = { cases: { "2026-11-29|theme": "a" } };
  expect(verifierChangements(etat, { "2026-11-29": { theme: long } }, [{ date: "2026-11-29", cle: "theme", avant: "a", apres: borne(long) }], "2026-11-15", T, TOUT)).toEqual({ ok: true });
});

test("verifierReference : dates du trimestre seulement, valeurs égales au document quand il les porte", () => {
  const T = { annee: 2026, tri: "T4" };
  const docs = { "2026-11-15": { presidence: "Anaïs P." } };
  expect(verifierReference({ "2026-11-15|presidence": "Anaïs P.", "2026-11-22|piano": "Valeur du Sheet" }, docs, T)).toEqual({ ok: true });
  expect(verifierReference({ "2026-11-15|presidence": "Nom X" }, docs, T).ok).toBe(false);
  expect(verifierReference({ "2027-01-03|presidence": "A. B." }, {}, T).ok).toBe(false);
  expect(verifierReference({ "pas une clé": "x" }, {}, T).ok).toBe(false);
  expect(verifierReference(Object.fromEntries(Array.from({ length: 700 }, (_, i) => [`2026-11-15|c${i}`, "x"])), {}, T).ok).toBe(false);
});
