import "./helpers/cleFirebase";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { fsDoc, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  editionCourante, editionProche, editionsAffichees, editionsDe, etatEdition, FETES, feteDe, anneeDe, idEdition,
  jourJParDefaut, libelleEdition, paques, reglagesRepris,
} from "../src/lib/scene/fetes";
import * as dimanches from "../src/lib/scene/dimanches";
import { chargerCalendrier } from "../src/lib/calendrier/charger";
import { planDeplacement } from "../src/lib/calendrier/deplacer";
import { entreesCalendrier, type DonneesCalendrier, type EntreeCalendrier, type ProfilCalendrier } from "../src/lib/calendrier/entrees";
import { compteCreneaux, erreursSaison, FAMILLES, lignesDuJour, saisonDe, semainesDe } from "../src/lib/scene/saison";
import { semaineCourte } from "../src/app/evenements/scene/libelles";
import { creerEdition } from "../src/lib/firebase/programmes";
import type { Creneau, Programme } from "../src/types/programme";

// Réservation de la scène — Pâques · Noël (docs/spec-scene-paques-noel.md).
// Deux onglets fixes ; une édition par fête et par année, `programmes/{fete}-{annee}`.

/** Un programme d'avant ce lot : ni `fete` ni `annee`, identifiant quelconque. */
const prog = (over: Partial<Programme> = {}): Programme => ({
  id: "x7Kq2", nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, passages: [],
  createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z", ...over,
});

// ─── P1 : la règle des fêtes (fonctions pures) ──────────────────────────────

test("fêtes : Pâques puis Noël, dans l'ordre des onglets", () => {
  expect(FETES).toEqual(["paques", "noel"]);
});

test("Pâques : calcul grégorien — 2025-04-20, 2026-04-05, 2027-03-28, 2028-04-16", () => {
  expect([2025, 2026, 2027, 2028].map(paques)).toEqual(["2025-04-20", "2026-04-05", "2027-03-28", "2028-04-16"]);
});

test("jour J par défaut : Noël le 24 décembre, Pâques calculé", () => {
  expect(jourJParDefaut("noel", 2026)).toBe("2026-12-24");
  expect(jourJParDefaut("paques", 2027)).toBe("2027-03-28");
});

test("identifiant d'une édition : `noel-2026`, `paques-2027`", () => {
  expect(idEdition("noel", 2026)).toBe("noel-2026");
  expect(idEdition("paques", 2027)).toBe("paques-2027");
});

test("fête et année : le champ s'il est là, même contre le mois du jour J", () => {
  const p = prog({ fete: "paques", annee: 2027, jourJ: "2026-12-24" });
  expect(feteDe(p)).toBe("paques");
  expect(anneeDe(p)).toBe(2027);
});

test("ancien document : déduit du jour J — 24/12/2026 → Noël 2026, 04/04/2027 → Pâques 2027, 14/06/2026 → aucune fête", () => {
  expect([feteDe(prog()), anneeDe(prog())]).toEqual(["noel", 2026]);
  const avril = prog({ jourJ: "2027-04-04" });
  expect([feteDe(avril), anneeDe(avril)]).toEqual(["paques", 2027]);
  const mars = prog({ jourJ: "2027-03-28" });
  expect(feteDe(mars)).toBe("paques");
  const juin = prog({ jourJ: "2026-06-14" });
  expect([feteDe(juin), anneeDe(juin)]).toEqual([null, null]);
});

test("éditions d'une fête : par année décroissante, l'autre fête et les hors-fête écartés", () => {
  const programmes = [
    prog({ id: "noel-2025", jourJ: "2025-12-24" }),
    prog({ id: "ete", jourJ: "2026-06-14" }),
    prog({ id: "paques-2027", fete: "paques", annee: 2027, jourJ: "2027-03-28" }),
    prog({ id: "noel-2027", fete: "noel", annee: 2027, jourJ: "2027-12-24" }),
    prog({ id: "x7Kq2" }),
  ];
  expect(editionsDe("noel", programmes).map((p) => p.id)).toEqual(["noel-2027", "x7Kq2", "noel-2025"]);
  expect(editionsDe("paques", programmes).map((p) => p.id)).toEqual(["paques-2027"]);
});

test("deux documents pour Noël 2026 : `noel-2026` gagne, dans un ordre comme dans l'autre", () => {
  const ancien = prog({ id: "x7Kq2" });
  const canonique = prog({ id: "noel-2026", fete: "noel", annee: 2026, debut: "2026-10-05" });
  expect(editionsDe("noel", [ancien, canonique]).map((p) => p.id)).toEqual(["noel-2026"]);
  expect(editionsDe("noel", [canonique, ancien]).map((p) => p.id)).toEqual(["noel-2026"]);
  expect(editionCourante("noel", [ancien, canonique], "2026-10-09").programme?.id).toBe("noel-2026");
});

test("édition courante de Noël : 09/10/2026 → 2026 ; 28/12/2026 → 2026 ; 01/01/2027 → 2027", () => {
  const programmes = [prog()];
  expect(editionCourante("noel", programmes, "2026-10-09")).toEqual({ fete: "noel", annee: 2026, programme: programmes[0] });
  expect(editionCourante("noel", programmes, "2026-12-28")).toEqual({ fete: "noel", annee: 2026, programme: programmes[0] });
  expect(editionCourante("noel", programmes, "2026-12-31").annee).toBe(2026);
  expect(editionCourante("noel", programmes, "2027-01-01")).toEqual({ fete: "noel", annee: 2027, programme: null });
});

test("édition courante de Noël : jour J avancé au 20/12 → 2027 dès le 28/12", () => {
  const programmes = [prog({ jourJ: "2026-12-20" })];
  expect(editionCourante("noel", programmes, "2026-12-27").annee).toBe(2026);
  expect(editionCourante("noel", programmes, "2026-12-28")).toEqual({ fete: "noel", annee: 2027, programme: null });
});

test("édition courante de Pâques au 09/10/2026 → 2027, sans aucun document", () => {
  expect(editionCourante("paques", [], "2026-10-09")).toEqual({ fete: "paques", annee: 2027, programme: null });
  const p27 = prog({ id: "paques-2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01" });
  expect(editionCourante("paques", [prog(), p27], "2026-10-09").programme?.id).toBe("paques-2027");
});

test("état : les six états de Noël 2026, chacun sur sa date (fermeture absente = dimanche 20/12)", () => {
  const ed = (programme: Programme | null) => ({ fete: "noel" as const, annee: 2026, programme });
  expect(etatEdition(ed(null), "2026-10-09")).toBe("aucune");
  expect(etatEdition(ed(prog({ ouvert: false })), "2026-10-09")).toBe("brouillon");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-09-30")).toBe("bientot");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-10-01")).toBe("ouvertes");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-12-20")).toBe("ouvertes");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-12-21")).toBe("fermees");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-12-24")).toBe("fermees");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-12-25")).toBe("passee");
  expect(etatEdition(ed(prog({ ouvert: true })), "2026-12-31")).toBe("passee");
});

test("état : la fermeture de la saison (`fin`) l'emporte sur le dernier dimanche", () => {
  const ed = { fete: "noel" as const, annee: 2026, programme: prog({ fin: "2026-12-13" }) };
  expect(etatEdition(ed, "2026-12-13")).toBe("ouvertes");
  expect(etatEdition(ed, "2026-12-14")).toBe("fermees");
});

test("état : un document sans `ouvert` compte comme lancé", () => {
  const ed = { fete: "noel" as const, annee: 2026, programme: prog() };
  expect(etatEdition(ed, "2026-10-09")).toBe("ouvertes");
});

test("éditions affichées : ni un brouillon ni une fête sans document", () => {
  const brouillon = prog({ id: "paques-2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01", ouvert: false });
  expect(editionsAffichees([prog(), brouillon], "2026-10-09")).toEqual([{ fete: "noel", annee: 2026, programme: prog() }]);
  expect(editionsAffichees([prog()], "2026-10-09").map((e) => e.fete)).toEqual(["noel"]);
  expect(editionsAffichees([], "2026-10-09")).toEqual([]);
  const lancee = { ...brouillon, ouvert: true };
  expect(editionsAffichees([prog(), lancee], "2026-10-09").map((e) => e.fete)).toEqual(["paques", "noel"]);
});

test("éditions affichées : Noël passé reste affiché jusqu'à J + 7, puis disparaît", () => {
  expect(editionsAffichees([prog()], "2026-12-31").map((e) => e.annee)).toEqual([2026]);
  expect(editionsAffichees([prog()], "2027-01-01")).toEqual([]);
});

test("réglages repris : Noël 2026 → Noël 2027 ouvert le 01/10/2027, mêmes plages, brouillon, ordre vide", () => {
  const quatre = [...FAMILLES[0].qui, ...FAMILLES[1].qui, ...FAMILLES[2].qui, ...FAMILLES[3].qui];
  const plages = [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }];
  const noel2026 = prog({
    fin: "2026-12-20", plages, duree: 60, quiAutorises: quatre, ouvert: true,
    passages: [{ quoi: "Chant", qui: ["Gp Paix"], titre: "Hymne" }],
  });
  expect(reglagesRepris(noel2026, "noel", 2027)).toEqual({
    nom: "Noël 2027", fete: "noel", annee: 2027, jourJ: "2027-12-24", debut: "2027-10-01",
    plages, duree: 60, quiAutorises: quatre, passages: [], ouvert: false,
  });
});

test("réglages repris : l'écart d'ouverture suit le jour J (Pâques 2026 ouvert 8 semaines avant → Pâques 2027 aussi)", () => {
  const p26 = prog({ id: "paques-2026", fete: "paques", annee: 2026, nom: "Pâques", jourJ: "2026-04-05", debut: "2026-02-08", duree: 90 });
  const r = reglagesRepris(p26, "paques", 2027);
  expect(r.jourJ).toBe("2027-03-28");
  expect(r.debut).toBe("2027-01-31");
  expect(r.duree).toBe(90);
  // Un ancien document sans saison donne les défauts de U1.
  expect(r.plages).toEqual([{ jour: 0, debut: "14:00", fin: "19:00" }]);
  expect(r.quiAutorises).toEqual([]);
});

test("réglages repris : sans précédent → Pâques 2027 ouvert le lundi 01/02/2027, dimanche 14:00–19:00, 1 h, tout membre", () => {
  expect(reglagesRepris(null, "paques", 2027)).toEqual({
    nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01",
    plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60, quiAutorises: [], passages: [], ouvert: false,
  });
  // Noël 2026 tombe un jeudi : semaine du lundi 21/12, sept semaines avant → lundi 2 novembre.
  expect(reglagesRepris(null, "noel", 2026).debut).toBe("2026-11-02");
});

test("titre d'une édition : calculé, dans la langue", () => {
  expect(libelleEdition("noel", 2026, "fr")).toBe("Noël 2026");
  expect(libelleEdition("paques", 2027, "fr")).toBe("Pâques 2027");
  expect(libelleEdition("noel", 2026, "zh")).toBe("圣诞节 2026");
  expect(libelleEdition("paques", 2027, "zh")).toBe("复活节 2027");
});

// ─── P2 : la grille (fonctions pures) ───────────────────────────────────────

/** Noël 2026 de la « Réussite » : du 01/10 au 20/12, samedi 10:00–12:00 et
 *  dimanche 14:00–19:00, créneaux d'1 h. */
const NOEL26 = saisonDe({
  ...prog(), fin: "2026-12-20", duree: 60,
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
});

const resa = (dimanche: string, debut: string, fin: string) => ({ id: `${dimanche}-${debut}`, dimanche, debut, fin });

test("lignes : 17:00–18:30 dans une grille d'1 h → une seule ligne qui couvre 2 créneaux, aucune ligne à 18:00, aucun « Pris »", () => {
  const c = resa("2026-10-11", "17:00", "18:30");
  const lignes = lignesDuJour(NOEL26, "2026-10-11", [c]);
  expect(lignes.map((l) => [l.type, l.debut])).toEqual([
    ["libre", "14:00"], ["libre", "15:00"], ["libre", "16:00"], ["reserve", "17:00"],
  ]);
  expect(lignes.at(-1)).toMatchObject({ debut: "17:00", fin: "18:30", horsGrille: true, couvre: 2, aussi: ["18:00"], creneau: c });
});

test("lignes : une réservation pile sur un créneau couvre 1 créneau, sans « aussi »", () => {
  const lignes = lignesDuJour(NOEL26, "2026-10-11", [resa("2026-10-11", "15:00", "16:00")]);
  expect(lignes.map((l) => l.type)).toEqual(["libre", "reserve", "libre", "libre", "libre"]);
  expect(lignes[1]).toMatchObject({ horsGrille: false, couvre: 1, aussi: [] });
});

test("lignes : une réservation à cheval sur deux créneaux absorbe les deux ; un jour sans grille ne couvre rien", () => {
  const lignes = lignesDuJour(NOEL26, "2026-10-11", [resa("2026-10-11", "15:30", "16:30")]);
  expect(lignes.map((l) => [l.type, l.debut])).toEqual([["libre", "14:00"], ["reserve", "15:30"], ["libre", "17:00"], ["libre", "18:00"]]);
  expect(lignes[1]).toMatchObject({ couvre: 2, aussi: ["15:00", "16:00"] });
  expect(lignesDuJour(NOEL26, "2026-10-13", [resa("2026-10-13", "15:00", "16:00")])).toMatchObject([{ type: "reserve", couvre: 0, aussi: [] }]);
});

test("semaines : samedi et dimanche du 01/10 au 20/12/2026 → 12 semaines du lundi au dimanche, la première « 3 – 4 oct. »", () => {
  const semaines = semainesDe(NOEL26, "2026-12-24", []);
  expect(semaines).toHaveLength(12);
  expect(semaines[0]).toEqual({ lundi: "2026-09-28", jours: ["2026-10-03", "2026-10-04"], cases: Array(7).fill(false), libres: 7 });
  expect(semaines.at(-1)).toMatchObject({ lundi: "2026-12-14", jours: ["2026-12-19", "2026-12-20"] });
  expect(semaineCourte(semaines[0].jours, "fr")).toBe("3 – 4 oct.");
  expect(semaineCourte(["2026-10-31", "2026-11-01"], "fr")).toBe("31 oct. – 1er nov.");
  expect(semaineCourte(semaines[0].jours, "zh-CN")).toBe("10月3日 – 4日");
  expect(semaineCourte(["2026-10-31", "2026-11-01"], "zh-CN")).toBe("10月31日 – 11月1日");
});

test("semaines : une case par créneau, pleine = pris ; une réservation hors grille remplit les cases qu'elle prend ; « 3 places libres »", () => {
  const creneaux = [
    resa("2026-10-10", "10:00", "11:00"), resa("2026-10-11", "16:00", "17:00"), resa("2026-10-11", "17:00", "18:30"),
    resa("2026-10-13", "15:00", "16:00"), // un mardi : hors des jours, ne compte pas
  ];
  const s = semainesDe(NOEL26, "2026-12-24", creneaux)[1];
  expect(s.lundi).toBe("2026-10-05");
  expect(s.cases).toEqual([true, false, false, false, true, true, true]);
  expect(s.libres).toBe(3);
});

test("semaines : une semaine pleine n'a plus de place libre (« complet »)", () => {
  const jours = { "2026-10-17": ["10:00", "11:00"], "2026-10-18": ["14:00", "15:00", "16:00", "17:00", "18:00"] };
  const pleine = Object.entries(jours).flatMap(([d, hs]) => hs.map((h) => resa(d, h, `${String(Number(h.slice(0, 2)) + 1).padStart(2, "0")}:00`)));
  const s = semainesDe(NOEL26, "2026-12-24", pleine)[2];
  expect(s.cases.every(Boolean)).toBe(true);
  expect(s.libres).toBe(0);
});

test("compte : Pâques 2027 du 01/02, samedi 10–12 et dimanche 14–19 en 1 h → 2 et 5 créneaux, 7 semaines, 49 en tout ; dimanche seul → 35", () => {
  const paques27 = saisonDe({
    debut: "2027-02-01", jourJ: "2027-03-28", duree: 60,
    plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  });
  expect(compteCreneaux(paques27, "2027-03-28")).toEqual({ parJour: [{ jour: 6, creneaux: 2 }, { jour: 0, creneaux: 5 }], semaines: 7, total: 49 });
  const dimanche = saisonDe({ debut: "2027-02-01", jourJ: "2027-03-28" });
  expect(compteCreneaux(dimanche, "2027-03-28")).toEqual({ parJour: [{ jour: 0, creneaux: 5 }], semaines: 7, total: 35 });
});

test("erreurs : Pâques 2027 ouvert le 01/12/2026 croise Noël 2026 (fermé le 20/12) → `autreFete` ; ouvert le 01/02/2027 → aucune erreur", () => {
  const noel = { debut: NOEL26.debut, fin: NOEL26.fin };
  const paques27 = saisonDe({ debut: "2026-12-01", jourJ: "2027-03-28" });
  expect(erreursSaison(paques27, "2027-03-28", noel)).toEqual(["autreFete"]);
  expect(erreursSaison(paques27, "2027-03-28")).toEqual([]);
  expect(erreursSaison({ ...paques27, debut: "2027-02-01" }, "2027-03-28", noel)).toEqual([]);
  // Le croisement vaut dans les deux sens : Noël 2026 contre un Pâques 2027 ouvert le 01/12.
  expect(erreursSaison(NOEL26, "2026-12-24", { debut: "2026-12-01", fin: "2027-03-21" })).toEqual(["autreFete"]);
});

// ─── P3 : les lecteurs (calendrier, déplacer, widget, cron, création) ───────

// Tous passent à `editionsAffichees` : les éditions courantes des deux fêtes,
// sans brouillon ni fête sans document ; `currentProgramme` disparaît.

/** Noël 2026, ancien document (identifiant quelconque, ni `fete` ni `annee`), samedi 10–12 et dimanche 14–19. */
const NOEL_ANCIEN = prog({
  id: "x7Kq2", plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
});
/** Pâques 2027, lancé (réservations le 01/02/2027), dimanche seul. */
const PAQUES_LANCE = prog({ id: "paques-2027", nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01", ouvert: true });
/** Noël 2026 en brouillon : n'apparaît nulle part. */
const NOEL_BROUILLON = prog({ id: "noel-2026", fete: "noel", annee: 2026, ouvert: false });

const resaDe = (id: string, dimanche: string, debut: string, fin: string): Creneau => ({
  id, dimanche, debut, fin, quoi: "Chant", qui: ["Jeunes"], note: "", auteurUid: "u-autre", auteurNom: "Autre",
  createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
});

const donneesVides = (): DonneesCalendrier => ({
  seances: [], mesServices: [], sheet: [], evenements: [], mesInscriptions: [], taches: [], scene: [], petitDej: [], setlists: [],
});
const CTX = {
  user: { uid: "u-moi", email: "moi@example.org" },
  profile: { uid: "u-moi", email: "moi@example.org", firstName: "Alix", lastName: "P.", serviceRoles: {} } as unknown as ProfilCalendrier,
  lang: "fr" as const,
  today: "2026-10-09",
};

test("édition la plus proche : le jour J le plus près d'aujourd'hui, avant ou après", () => {
  const editions = editionsAffichees([NOEL_ANCIEN, PAQUES_LANCE], "2026-10-09");
  expect(editions.map((e) => e.fete)).toEqual(["paques", "noel"]);
  expect(editionProche(editions, "2026-10-09")?.fete).toBe("noel");
  // Le 28/12, Noël (passé de 4 jours) reste plus proche que Pâques (dans trois mois).
  expect(editionProche(editionsAffichees([NOEL_ANCIEN, PAQUES_LANCE], "2026-12-28"), "2026-12-28")?.fete).toBe("noel");
  expect(editionProche(editionsAffichees([NOEL_ANCIEN, PAQUES_LANCE], "2027-01-02"), "2027-01-02")?.fete).toBe("paques");
  expect(editionProche([], "2026-10-09")).toBeNull();
});

test("calendrier : les créneaux de Noël 2026 et de Pâques 2027 dans la même liste, chacun vers sa fête ; un brouillon n'y est pas", () => {
  const d = donneesVides();
  d.scene = [
    { programme: NOEL_ANCIEN, creneaux: [resaDe("n1", "2026-10-11", "14:00", "15:00")] },
    { programme: PAQUES_LANCE, creneaux: [resaDe("p1", "2027-02-07", "15:00", "16:00")] },
    { programme: { ...NOEL_BROUILLON, id: "brouillon", jourJ: "2027-12-24", annee: 2027 }, creneaux: [resaDe("b1", "2026-10-18", "14:00", "15:00")] },
  ];
  const scene = entreesCalendrier("2026-10-01", "2027-03-31", d, CTX).filter((e) => e.source === "scene");
  expect(scene.map((e) => [e.cle, e.lien])).toEqual([
    ["scene:n1:2026-10-11", "/evenements/scene/noel"],
    ["scene:p1:2027-02-07", "/evenements/scene/paques"],
  ]);
});

test("calendrier : une seule lecture rend les éditions affichées des deux fêtes avec leurs créneaux, sans brouillon", async () => {
  const docs: Record<string, Record<string, unknown>> = {
    "programmes/x7Kq2": { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, passages: [], createdBy: "", updatedAt: "" },
    "programmes/paques-2027": { nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01", ouvert: true, passages: [], createdBy: "", updatedAt: "" },
    "programmes/noel-2027": { nom: "Noël 2027", fete: "noel", annee: 2027, jourJ: "2027-12-24", debut: "2027-10-01", ouvert: false, passages: [], createdBy: "", updatedAt: "" },
    "programmes/x7Kq2/creneaux/n1": { ...resaDe("n1", "2026-10-11", "14:00", "15:00") },
    "programmes/paques-2027/creneaux/p1": { ...resaDe("p1", "2027-02-07", "15:00", "16:00") },
    "programmes/noel-2027/creneaux/b1": { ...resaDe("b1", "2027-10-03", "14:00", "15:00") },
  };
  const avant = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (!u.endsWith(":runQuery")) return new Response("{}", { status: 404 });
    const parent = decodeURIComponent(u.split("/documents")[1] ?? "").replace(/^\//, "").replace(/:runQuery$/, "");
    const from = (JSON.parse(String(init?.body)) as { structuredQuery: { from: { collectionId: string }[] } }).structuredQuery.from[0].collectionId;
    const collection = parent ? `${parent}/${from}` : from;
    const rows = Object.entries(docs)
      .filter(([p]) => p.startsWith(`${collection}/`) && !p.slice(collection.length + 1).includes("/"))
      .sort(([a], [b]) => String(docs[a].jourJ ?? "").localeCompare(String(docs[b].jourJ ?? "")))
      .map(([p, data]) => ({ document: fsDoc(p, data) }));
    return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const { base } = await chargerCalendrier({ uid: "u-moi" }, null, "2026-10-09", { pourLeWidget: true });
    expect(base.scene.map((e) => [e.programme.id, e.creneaux.map((c) => c.id)])).toEqual([
      ["paques-2027", ["p1"]],
      ["x7Kq2", ["n1"]],
    ]);
  } finally {
    globalThis.fetch = avant;
  }
});

test("déplacer : un créneau de Pâques reste dans Pâques (sa grille, son programme), un créneau de Noël dans Noël", () => {
  const scene = [
    { programme: NOEL_ANCIEN, creneaux: [resaDe("n1", "2026-10-11", "14:00", "15:00")] },
    { programme: PAQUES_LANCE, creneaux: [resaDe("p1", "2027-02-07", "15:00", "16:00")] },
  ];
  const entree = (id: string, date: string): EntreeCalendrier => ({
    source: "scene", cle: `scene:${id}:${date}`, date, heure: "", heureFin: "", titre: "", detail: "", couleur: "", duSheet: false, moi: false, deplacable: true, lien: "",
  });
  const horloge = { today: "2026-10-09", maintenant: "10:00" };
  const donnees = { evenements: [], taches: [], scene };
  expect(planDeplacement(entree("p1", "2027-02-07"), "2027-02-14", donnees, horloge))
    .toMatchObject({ type: "creneau", programmeId: "paques-2027", parDefaut: { jour: "2027-02-14", debut: "15:00" } });
  // Un samedi : réservable à Noël (samedi 10–12), pas à Pâques (dimanche seul).
  expect(planDeplacement(entree("p1", "2027-02-07"), "2027-02-13", donnees, horloge)).toEqual({ type: "refus", refus: "sceneFermee" });
  expect(planDeplacement(entree("n1", "2026-10-11"), "2026-10-17", donnees, horloge))
    .toMatchObject({ type: "creneau", programmeId: "x7Kq2", places: [{ jour: "2026-10-17", debut: "10:00" }, { jour: "2026-10-17", debut: "11:00" }] });
});

test("création d'une édition : `POST programmes?documentId=noel-2027` ; déjà créée (409) → le changement s'applique au document existant", async () => {
  const appels: { url: string; method: string; body: string }[] = [];
  let reponse = 200;
  const avant = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    appels.push({ url: String(url), method: init?.method ?? "GET", body: String(init?.body ?? "") });
    if (init?.method === "POST" && reponse === 409) {
      return new Response(JSON.stringify({ error: { code: 409, status: "ALREADY_EXISTS" } }), { status: 409 });
    }
    return new Response(JSON.stringify({ name: "projects/gcclouange/databases/(default)/documents/programmes/noel-2027", fields: {} }), { status: 200 });
  }) as typeof fetch;
  try {
    const data = { ...reglagesRepris(null, "noel", 2027), createdBy: "uid-alice", updatedAt: "2026-12-28T10:00:00Z" };
    expect(await creerEdition("noel", 2027, data, { duree: 90 })).toBe("noel-2027");
    expect(appels).toHaveLength(1);
    expect(appels[0].method).toBe("POST");
    expect(appels[0].url).toMatch(/\/documents\/programmes\?documentId=noel-2027$/);
    expect(appels[0].body).toContain('"fete":{"stringValue":"noel"}');
    expect(appels[0].body).toContain('"annee":{"integerValue":"2027"}');
    expect(appels[0].body).toContain('"duree":{"integerValue":"90"}');

    appels.length = 0;
    reponse = 409;
    expect(await creerEdition("noel", 2027, data, { duree: 90 })).toBe("noel-2027");
    expect(appels.map((a) => a.method)).toEqual(["POST", "PATCH"]);
    expect(appels[1].url).toMatch(/\/documents\/programmes\/noel-2027\?updateMask\.fieldPaths=duree&updateMask\.fieldPaths=updatedAt$/);
  } finally {
    globalThis.fetch = avant;
  }
});

test("`currentProgramme` a disparu ; le cron des rappels lit les éditions affichées", () => {
  expect("currentProgramme" in dimanches).toBe(false);
  const cron = readFileSync("src/app/api/cron/reminders/route.ts", "utf8");
  expect(cron).toMatch(/editionsAffichees\(/);
  expect(cron).not.toMatch(/currentProgramme/);
});

// Le widget « Scène » du tableau de bord (Alice, pôle Événement, seul widget affiché).
const DOCS_WIDGET: Record<string, Record<string, unknown>> = {
  "backOffice/uid-alice": { tableauDeBord: [{ id: "scene", taille: "m", reglages: {} }], majLe: "2026-10-01" },
  "programmes/x7Kq2": { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, passages: [], createdBy: "uid-alice", updatedAt: "" },
  "programmes/x7Kq2/creneaux/n1": { ...resaDe("n1", "2026-10-11", "14:00", "15:00"), quoi: "Sketch", qui: ["Franco"] },
  "programmes/paques-2027": { nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01", ouvert: true, passages: [], createdBy: "uid-alice", updatedAt: "" },
  "programmes/paques-2027/creneaux/p1": { ...resaDe("p1", "2027-02-07", "15:00", "16:00"), quoi: "Danse", qui: ["Gp Paix"] },
  "programmes/noel-2027": { nom: "Noël 2027", fete: "noel", annee: 2027, jourJ: "2027-12-24", debut: "2027-10-01", ouvert: false, passages: [], createdBy: "uid-alice", updatedAt: "" },
};
const ALICE_EVT: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };

async function tableauDeBord(page: Page, docs: Record<string, Record<string, unknown>>) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ALICE_EVT, docs, "/back-office");
  return page.getByTestId("grille-widgets").getByRole("region", { name: "Scène", exact: true });
}

test("widget Scène : sans réglage, l'édition au jour J le plus proche — « Scène · Noël 2026 » et ses créneaux", async ({ page }) => {
  const w = await tableauDeBord(page, DOCS_WIDGET);
  await expect(w.getByRole("heading", { name: "Scène · Noël 2026" })).toBeVisible();
  await expect(w.getByTestId("ligne-creneau")).toHaveText([/11 oct\. 14:00.*Sketch · Franco/]);
});

test("widget Scène : ses réglages proposent les éditions affichées (Pâques 2027, Noël 2026), jamais un brouillon", async ({ page }) => {
  const w = await tableauDeBord(page, DOCS_WIDGET);
  await expect(w.getByRole("heading", { name: "Scène · Noël 2026" })).toBeVisible();
  await page.getByRole("button", { name: "Personnaliser" }).click();
  await w.getByRole("button", { name: "Réglages du widget" }).click();
  const groupe = w.getByRole("group", { name: "Programme" });
  await expect(groupe.getByRole("button")).toHaveText(["Celui qui est affiché", "Pâques 2027", "Noël 2026"]);
  await groupe.getByRole("button", { name: "Pâques 2027" }).click();
  await expect(w.getByRole("heading", { name: "Scène · Pâques 2027" })).toBeVisible();
  await expect(w.getByTestId("ligne-creneau")).toHaveText([/7 févr\. 15:00.*Danse · Gp Paix/]);
});

test("widget Scène : un brouillon seul n'est pas montré", async ({ page }) => {
  const w = await tableauDeBord(page, {
    "backOffice/uid-alice": DOCS_WIDGET["backOffice/uid-alice"],
    "programmes/noel-2026": { nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: false, passages: [], createdBy: "uid-alice", updatedAt: "" },
    "programmes/noel-2026/creneaux/b1": { ...resaDe("b1", "2026-10-11", "14:00", "15:00") },
  });
  await expect(w.getByText("Aucun programme affiché.")).toBeVisible();
  await expect(w.getByRole("heading", { name: /Noël 2026/ })).toHaveCount(0);
});
