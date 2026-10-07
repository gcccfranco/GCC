import "./helpers/cleFirebase";
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
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
import { enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, ongletsRail, verifierAgencement, verifierSansDebordement } from "./helpers/agencement";
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

// ─── P4 : App — onglets de fête, en-tête, états sans grille ─────────────────
// Horloge au vendredi 09/10/2026 (la « Réussite » de la spec) sauf mention.

const PASSAGES_NOEL = [
  { quoi: "Séance louange", qui: ["敬拜团"], titre: "Ouverture" },
  { quoi: "Chant", qui: ["EDD 小班"], titre: "Jésus est né" },
  { quoi: "Sketch", qui: ["Gp Paix"], titre: "La nuit de Bethléem" },
];
/** L'ancien Noël, sans `fete` ni `annee` ni `ouvert` : lu comme Noël 2026, lancé (Q2). */
const DOC_NOEL_ANCIEN = {
  nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, passages: PASSAGES_NOEL,
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z",
};
const DOC_PAQUES_2026 = {
  nom: "Pâques 2026", fete: "paques", annee: 2026, jourJ: "2026-04-05", debut: "2026-02-09", ouvert: true,
  passages: ["Ouverture", "Le tombeau vide", "Il est vivant", "Au matin", "Louange de clôture"].map((titre) => ({ quoi: "Chant", qui: ["Franco"], titre })),
  createdBy: "uid-alice", updatedAt: "2026-04-01T10:00:00Z",
};
/** Une Pâques d'avant ce lot (identifiant au hasard, ni `fete` ni `annee`). */
const DOC_PAQUES_2025 = {
  nom: "Pâques", jourJ: "2025-04-20", debut: "2025-02-24", visible: false,
  passages: Array.from({ length: 7 }, (_, i) => ({ quoi: "Chant", qui: ["Franco"], titre: `Numéro ${i + 1} de 2025` })),
  createdBy: "uid-alice", updatedAt: "2025-04-01T10:00:00Z",
};
const DOC_PAQUES_2027_BROUILLON = {
  nom: "Pâques 2027", fete: "paques", annee: 2027, jourJ: "2027-03-28", debut: "2027-02-01", ouvert: false, passages: [],
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  createdBy: "uid-alice", updatedAt: "2026-10-05T10:00:00Z",
};
const JO_MEMBRE: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L." };

async function ouvrirFete(page: Page, chemin: string, docs: Record<string, Record<string, unknown>> = {}, jour = "2026-10-09", qui: FakeProfile = JO_MEMBRE) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(`${jour}T10:00:00`));
  return signInAs(page, qui, docs, chemin);
}
const enTeteFete = (page: Page) => page.getByRole("heading", { level: 2 }).first();
const historique = (page: Page) => page.evaluate(() => history.length);

test("P4 — rail « Calendrier · Pâques · Noël » pour un membre sans aucun programme", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/paques");
  await expect(ongletsRail(page).getByRole("link")).toHaveText(["Calendrier", "Pâques", "Noël"]);
  await expect(ongletsRail(page).getByRole("link", { name: "Pâques" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Évènements");
  await expect(enTete(page)).toContainText("Les rendez-vous de l'église et les inscriptions");
  await verifierAgencement(page);
});

test("P4 — en chinois : 复活节 et 圣诞节 dans le rail, le titre de l'édition aussi", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN });
  await expect(ongletsRail(page).getByRole("link")).toHaveText(["日历", "复活节", "圣诞节"]);
  await expect(enTeteFete(page)).toHaveText("圣诞节 2026");
});

test("P4 — `/evenements/scene` mène à Noël le 09/10/2026 ; `/evenements/scene/ete` n'existe pas", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene", { "programmes/x7Kq2": DOC_NOEL_ANCIEN });
  await expect(page).toHaveURL(/\/evenements\/scene\/noel\/?$/);
  await expect(enTeteFete(page)).toHaveText("Noël 2026");
  const reponse = await page.goto("/evenements/scene/ete");
  expect(reponse?.status()).toBe(404);
});

test("P4 — Pâques sans document : « … ne sont pas encore ouvertes », jour J calculé, aucune grille, rien d'écrit", async ({ page }) => {
  const db = await ouvrirFete(page, "/evenements/scene/paques");
  await expect(enTeteFete(page)).toHaveText("Pâques 2027");
  await expect(page.getByText("Jour J : dimanche 28 mars 2027")).toBeVisible();
  await expect(page.getByText("Les réservations de Pâques 2027 ne sont pas encore ouvertes.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
  await expect(page.getByText("Comment réserver ?")).toBeVisible();
  expect(db.writes.filter((w) => w.path.startsWith("programmes"))).toHaveLength(0);
});

test("P4 — brouillon ouvert au 01/02 : « Les réservations ouvriront le lundi 1er février », sans grille", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/paques", { "programmes/paques-2027": DOC_PAQUES_2027_BROUILLON });
  await expect(page.getByText("Les réservations ouvriront le lundi 1er février")).toBeVisible();
  await expect(page.getByText("Les entraînements pour Pâques auront lieu le samedi et le dimanche, jusqu'au dimanche 21 mars. Cet onglet montrera alors les créneaux libres.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

test("P4 — années passées : titre, jour J, nombre de numéros ; l'ordre de la dernière année à lire, une autre par `?annee=`", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/paques", { "programmes/paques-2026": DOC_PAQUES_2026, "programmes/a1b2": DOC_PAQUES_2025 });
  const annees = page.getByRole("region", { name: "Les années passées" });
  await expect(annees.getByRole("button")).toHaveText([/Pâques 2026\s*dimanche 5 avril · 5 numéros/, /Pâques 2025\s*dimanche 20 avril · 7 numéros/]);
  await expect(page.getByRole("heading", { name: "Pâques 2026 · ordre de passage" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(5);
  const avant = await historique(page);
  await annees.getByRole("button", { name: /Pâques 2025/ }).click();
  await expect(page).toHaveURL(/[?&]annee=2025/);
  await expect(page.getByRole("heading", { name: "Pâques 2025 · ordre de passage" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(7);
  expect(await historique(page)).toBe(avant);
});

test("P4 — Noël 2026, ancien document : titre calculé, jour J, fin des réservations ; plus de volet « Programme Noël »", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN });
  await expect(enTeteFete(page)).toHaveText("Noël 2026");
  await expect(page.getByText("Jour J : jeudi 24 décembre · réservations jusqu'au dimanche 20 décembre")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Réserver \d/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Programme Noël" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Entraînements", exact: true })).toHaveCount(0);
  await verifierAgencement(page);
});

test("P4 — ordre de passage : une seule entrée, en bas, en lecture même pour la coordination ; `?vue=ordre` sans entrée d'historique", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN }, "2026-10-09", ALICE_EVT);
  const entree = page.getByRole("button", { name: /Ordre de passage du jour J/ });
  await expect(entree).toHaveCount(1);
  await expect(entree).toContainText("jeudi 24 décembre · 3 numéros");
  expect((await entree.boundingBox())!.y).toBeGreaterThan((await enTeteFete(page).boundingBox())!.y);
  await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toBeVisible();
  const avant = await historique(page);
  await entree.click();
  await expect(page).toHaveURL(/[?&]vue=ordre/);
  const liste = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await expect(liste.getByRole("listitem")).toHaveCount(3);
  await expect(liste.getByRole("button", { name: "Déplacer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter un passage" })).toHaveCount(0);
  expect(await historique(page)).toBe(avant);
  for (const libelle of ["Nouveau programme", "Masquer", "Afficher", "Modifier le programme", "Fermer"]) {
    await expect(page.getByRole("button", { name: libelle, exact: true })).toHaveCount(0);
  }
});

test("P4 — ordre de passage sur téléphone : en page, avec un retour vers la fête", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "propre au téléphone");
  await ouvrirFete(page, "/evenements/scene/noel?vue=ordre", { "programmes/x7Kq2": DOC_NOEL_ANCIEN });
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Noël 2026", exact: true }).click();
  await expect(page).not.toHaveURL(/vue=ordre/);
  await expect(page.getByRole("button", { name: /^Réserver \d/ }).first()).toBeVisible();
});

test("P4 — une colonne (téléphone, tablette) : l'ordre de passage en carte tout en bas, sous les entraînements", async ({ page }) => {
  test.skip(estGrandEcran(test.info()), "propre au téléphone et à la tablette debout");
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN });
  const entree = page.getByRole("button", { name: /Ordre de passage du jour J/ });
  const dernier = page.getByRole("button", { name: /^Réserver \d/ }).last();
  await expect(dernier).toBeAttached();
  const yDernier = await dernier.evaluate((e) => e.getBoundingClientRect().bottom + window.scrollY);
  const yEntree = await entree.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
  expect(yEntree).toBeGreaterThan(yDernier);
});

test("P4 — réservations fermées (21/12/2026) : l'ordre de passage, plus d'entraînements", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN }, "2026-12-21");
  await expect(page.getByText("Les réservations sont fermées.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

test("P4 — 28/12/2026 : le remerciement et l'ordre de passage ; 01/01/2027 : Noël 2027 pas encore ouvert, Noël 2026 dans les années passées", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN }, "2026-12-28");
  await expect(page.getByRole("region", { name: "Noël 2026, c'est passé — merci à tous !" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);

  await page.clock.setFixedTime(new Date("2027-01-01T10:00:00"));
  await page.reload();
  await expect(enTeteFete(page)).toHaveText("Noël 2027");
  await expect(page.getByText("Les réservations de Noël 2027 ne sont pas encore ouvertes.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Les années passées" }).getByRole("button")).toHaveText([/Noël 2026\s*jeudi 24 décembre · 3 numéros/]);
});

test("P4 — deux volets sur ordinateur, ordinateur-1440 et tablette couchée ; une colonne sur téléphone et tablette ; rien ne déborde", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/paques", { "programmes/paques-2026": DOC_PAQUES_2026 });
  await expect(page.getByText("Les réservations de Pâques 2027 ne sont pas encore ouvertes.")).toBeVisible();
  await expect(page.locator("[data-deux-volets]")).toHaveCount(estGrandEcran(test.info()) ? 1 : 0);
  await verifierAgencement(page);
});

test("P4 — captures à regarder (planches v18-scene-a-sans-saison-* et v18-scene-a-membres-*), PW_CAPTURES=<dossier>", async ({ page }) => {
  const dir = process.env.PW_CAPTURES;
  test.skip(!dir, "captures seulement avec PW_CAPTURES");
  await ouvrirFete(page, "/evenements/scene/paques", { "programmes/paques-2026": DOC_PAQUES_2026, "programmes/a1b2": DOC_PAQUES_2025, "programmes/paques-2027": DOC_PAQUES_2027_BROUILLON, "programmes/x7Kq2": DOC_NOEL_ANCIEN });
  await expect(page.getByText("Les réservations ouvriront le lundi 1er février")).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/p4-paques-${test.info().project.name}.png`, fullPage: true });
  await page.goto("/evenements/scene/noel");
  await expect(page.getByRole("button", { name: /^Réserver \d/ }).first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/p4-noel-${test.info().project.name}.png` });
});

// ─── P5 : App — une semaine à la fois, « Mes réservations » en tête ─────────
// Horloge au vendredi 09/10/2026 ; Jo a deux réservations (planche `v18-scene-a-membres-*`).

const A_JO = { auteurUid: "uid-jo", auteurNom: "Jo L." };
const RESAS_P5: Record<string, Record<string, unknown>> = {
  "programmes/x7Kq2/creneaux/f": { ...resaDe("f", "2026-10-10", "10:00", "11:00"), quoi: "Séance louange", qui: ["Franco"], auteurUid: "uid-lea", auteurNom: "Léa M." },
  "programmes/x7Kq2/creneaux/s": { ...resaDe("s", "2026-10-11", "16:00", "17:00"), quoi: "Sketch", qui: ["Jeunes"], ...A_JO },
  "programmes/x7Kq2/creneaux/l": { ...resaDe("l", "2026-10-11", "17:00", "18:30"), quoi: "Chant", qui: ["EDD 中班"], auteurUid: "uid-alice", auteurNom: "Alice Q." },
  "programmes/x7Kq2/creneaux/d": { ...resaDe("d", "2026-10-17", "11:00", "12:00"), quoi: "Danse", qui: ["Jeunes"], ...A_JO },
};
const DOCS_P5 = { "programmes/x7Kq2": DOC_NOEL_ANCIEN, ...RESAS_P5 };
const LEA_MEMBRE: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M." };

const mesReservations = (page: Page) => page.getByRole("region", { name: "Mes réservations" });
const listeSemaines = (page: Page) => page.getByRole("list", { name: "Semaines" });
const semaineChoisie = (page: Page) => listeSemaines(page).locator('[aria-current="true"]');
const jour = (page: Page, nom: string) => page.getByRole("region", { name: nom, exact: true });

test("P5 — « Mes réservations » en tête avec le compte, puis la semaine du 10 au 11 octobre par défaut", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  const mes = mesReservations(page);
  await expect(mes.getByTestId("compte")).toHaveText("2");
  await expect(mes.getByRole("listitem")).toHaveText([
    /11\s*oct\.\s*Sketch · Jeunes\s*dim\. 11 oct\. · 16:00 – 17:00/,
    /17\s*oct\.\s*Danse · Jeunes\s*sam\. 17 oct\. · 11:00 – 12:00/,
  ]);
  expect((await mes.boundingBox())!.y).toBeLessThan((await listeSemaines(page).boundingBox())!.y);
  await expect(semaineChoisie(page)).toHaveText(/^10 – 11 oct\./);
  await expect(jour(page, "Samedi 10 octobre")).toContainText("1 place libre");
  await expect(jour(page, "Dimanche 11 octobre")).toContainText("2 places libres");
  await expect(jour(page, "Samedi 17 octobre")).toHaveCount(0);
  await expect(jour(page, "Samedi 3 octobre")).toHaveCount(0);
  // Hors grille (Q13) : une ligne, à son heure, qui prend aussi 18:00 ; pas de « Pris ».
  await expect(jour(page, "Dimanche 11 octobre").getByRole("listitem")).toHaveText([
    /14:00\s*Libre/, /15:00\s*Libre/, /16:00\s*Sketch · Jeunes/,
    /17:00\s*→ 18:30\s*Chant · EDD 中班\s*17:00 – 18:30 · prend aussi le créneau de 18:00/,
  ]);
  await expect(page.getByText("Pris", { exact: true })).toHaveCount(0);
  if (estGrandEcran(test.info())) {
    await expect(page.getByRole("heading", { level: 2, name: "Semaine du 10 au 11 octobre" })).toBeVisible();
    await expect(page.getByText("3 places libres · un créneau = 1 h", { exact: true })).toBeVisible();
  }
  await verifierAgencement(page);
});

test("P5 — sans réservation à moi, pas de « Mes réservations »", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", { "programmes/x7Kq2": DOC_NOEL_ANCIEN, "programmes/x7Kq2/creneaux/s": RESAS_P5["programmes/x7Kq2/creneaux/s"] }, "2026-10-09", LEA_MEMBRE);
  await expect(semaineChoisie(page)).toHaveText(/^10 – 11 oct\./);
  await expect(mesReservations(page)).toHaveCount(0);
});

test("P5 — la liste des semaines : jours, places libres, une case par créneau (pleine = pris) ; « Semaines passées (1) »", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  const semaines = listeSemaines(page).getByRole("button");
  await expect(semaines).toHaveCount(11);
  await expect(semaines.first()).toHaveText(/^10 – 11 oct\.\s*sam\. et dim\. · 3 places libres/);
  await expect(semaines.nth(1)).toHaveText(/^17 – 18 oct\.\s*sam\. et dim\. · 6 places libres/);
  await expect(semaines.nth(3)).toHaveText(/^31 oct\. – 1er nov\./);
  await expect(semaines.first().locator("[data-case]")).toHaveCount(7);
  await expect(semaines.first().locator('[data-case="pris"]')).toHaveCount(4);
  await expect(semaines.last()).toHaveText(/^19 – 20 déc\./);
  const passees = page.getByRole("button", { name: "Semaines passées (1)" });
  await expect(passees).toHaveAttribute("aria-expanded", "false");
  await expect(listeSemaines(page).getByRole("button", { name: /^3 – 4 oct\./ })).toHaveCount(0);
  await passees.click();
  await expect(passees).toHaveAttribute("aria-expanded", "true");
  await expect(semaines).toHaveCount(12);
  await expect(semaines.first()).toHaveText(/^3 – 4 oct\./);
});

test("P5 — une semaine pleine dit « complet »", async ({ page }) => {
  const court = { ...DOC_NOEL_ANCIEN, plages: [{ jour: 0, debut: "14:00", fin: "15:00" }] };
  await ouvrirFete(page, "/evenements/scene/noel", {
    "programmes/x7Kq2": court,
    "programmes/x7Kq2/creneaux/a": { ...resaDe("a", "2026-10-11", "14:00", "15:00"), auteurUid: "uid-lea", auteurNom: "Léa M." },
  });
  await expect(semaineChoisie(page)).toHaveText(/^11 oct\.\s*dim\. · complet/);
  await expect(jour(page, "Dimanche 11 octobre")).toContainText("complet");
});

test("P5 — changer de semaine : la liste et ‹ › changent la semaine et l'adresse (`?semaine=`), sans entrée d'historique", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await expect(semaineChoisie(page)).toHaveText(/^10 – 11 oct\./);
  const avant = await historique(page);
  await listeSemaines(page).getByRole("button", { name: /^17 – 18 oct\./ }).click();
  await expect(page).toHaveURL(/[?&]semaine=2026-10-12/);
  await expect(semaineChoisie(page)).toHaveText(/^17 – 18 oct\./);
  await expect(jour(page, "Samedi 17 octobre")).toContainText("Danse · Jeunes");
  await expect(jour(page, "Samedi 10 octobre")).toHaveCount(0);
  if (estGrandEcran(test.info())) {
    await page.getByRole("button", { name: "Semaine suivante" }).click();
    await expect(page).toHaveURL(/[?&]semaine=2026-10-19/);
    await expect(jour(page, "Samedi 24 octobre")).toBeVisible();
    await page.getByRole("button", { name: "Semaine précédente" }).click();
    await page.getByRole("button", { name: "Semaine précédente" }).click();
    await expect(page).toHaveURL(/[?&]semaine=2026-10-05/);
    await expect(jour(page, "Samedi 10 octobre")).toBeVisible();
  }
  expect(await historique(page)).toBe(avant);
  await page.goto("/evenements/scene/noel?semaine=2026-11-02");
  await expect(semaineChoisie(page)).toHaveText(/^7 – 8 nov\./);
  await expect(jour(page, "Samedi 7 novembre")).toBeVisible();
});

test("P5 — toucher une de mes réservations choisit sa semaine", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await mesReservations(page).getByRole("button", { name: /^17 oct\. Danse · Jeunes/ }).click();
  await expect(page).toHaveURL(/[?&]semaine=2026-10-12/);
  await expect(semaineChoisie(page)).toHaveText(/^17 – 18 oct\./);
  await expect(jour(page, "Samedi 17 octobre").getByRole("listitem").filter({ hasText: "Danse · Jeunes" })).toBeVisible();
});

test("P5 — deux volets (ordinateur, ordinateur-1440, tablette couchée) : les semaines à gauche, la semaine choisie à droite", async ({ page }) => {
  test.skip(!estGrandEcran(test.info()), "propre aux grands écrans");
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await expect(page.locator('[data-volet="liste"]').getByRole("list", { name: "Semaines" })).toBeVisible();
  await expect(page.locator('[data-volet="liste"]').getByRole("region", { name: "Mes réservations" })).toBeVisible();
  await expect(page.locator('[data-volet="detail"]').getByRole("region", { name: "Dimanche 11 octobre", exact: true })).toBeVisible();
  await verifierSansDebordement(page);
});

test("P5 — une colonne (téléphone, tablette) : les semaines en pastilles qui défilent en largeur, la page non ; page courte", async ({ page }) => {
  test.skip(estGrandEcran(test.info()), "propre au téléphone et à la tablette debout");
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await expect(semaineChoisie(page)).toHaveText(/^10 – 11 oct\./);
  const [large, visible] = await listeSemaines(page).evaluate((e) => [e.scrollWidth, e.clientWidth]);
  expect(large).toBeGreaterThan(visible);
  await verifierSansDebordement(page);
  // Les pastilles viennent avant les jours de la semaine choisie.
  expect((await listeSemaines(page).boundingBox())!.y).toBeLessThan((await jour(page, "Samedi 10 octobre").boundingBox())!.y);
  if (estTelephone(test.info())) {
    // L'audit mesurait 7 458 px sur téléphone (un bloc par jour réservable à venir).
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(3000);
  }
});

test("P5 — en chinois : 我的预约, les semaines et leurs places", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await expect(mesReservations(page)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "我的预约" })).toBeVisible();
  await expect(page.getByRole("list", { name: "周次" }).locator('[aria-current="true"]')).toHaveText(/^10月10日 – 11日\s*周六和周日 · 剩余 3 个名额/);
  await expect(page.getByRole("button", { name: "过去的周（1）" })).toBeVisible();
  if (estGrandEcran(test.info())) await expect(page.getByRole("heading", { level: 2, name: "10月10日至11日这一周" })).toBeVisible();
});

test("P5 — captures à regarder (planche v18-scene-a-membres-*), PW_CAPTURES=<dossier>", async ({ page }) => {
  const dir = process.env.PW_CAPTURES;
  test.skip(!dir, "captures seulement avec PW_CAPTURES");
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await expect(semaineChoisie(page)).toHaveText(/^10 – 11 oct\./);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/p5-noel-${test.info().project.name}.png`, fullPage: true });
});

// ─── P6 : App — réserver, déplacer, modifier, retirer ───────────────────────
// Même horloge et mêmes réservations que P5 (planches `v18-scene-a-membres-*`, `v18-scene-a-feuille-telephone`).

const ligneDe = (page: Page, nom: string, texte: string) => jour(page, nom).getByRole("listitem").filter({ hasText: texte });
const plus = (zone: Locator) => zone.getByRole("button", { name: /^Plus d'actions/ });

test("P6 — Réserver : rien de coché, « Choisis quoi et qui » inactif ; Chant et Gp Paix → le POST porte le jour, le créneau et l'auteur ; la case se remplit", async ({ page }) => {
  const db = await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await expect(semaineChoisie(page).locator('[data-case="pris"]')).toHaveCount(4);
  await jour(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 14:00 – 15:00" }).click();
  const f = page.getByRole("dialog");
  await expect(f).toContainText("Dimanche 11 octobre · 14:00 – 15:00");
  await expect(f.getByRole("radio")).toHaveCount(5);
  await expect(f.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(f.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(f.getByLabel("Note · facultatif")).toBeVisible();
  const attente = f.getByRole("button", { name: "Choisis quoi et qui" });
  await expect(attente).toBeDisabled();
  await f.getByRole("radio", { name: "Chant" }).check();
  await expect(attente).toBeDisabled();
  await f.getByRole("checkbox", { name: "Gp Paix" }).check();
  await expect(attente).toHaveCount(0);
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("programmes/x7Kq2/creneaux"));
  expect(cree?.data).toMatchObject({ dimanche: "2026-10-11", debut: "14:00", fin: "15:00", quoi: "Chant", qui: ["Gp Paix"], auteurUid: "uid-jo", auteurNom: "Jo L." });
  await expect(ligneDe(page, "Dimanche 11 octobre", "Chant · Gp Paix")).toContainText("à moi");
  await expect(semaineChoisie(page).locator('[data-case="pris"]')).toHaveCount(5);
});

test("P6 — Réserver : neuf groupes, puis « + 4 » déplie le reste", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await jour(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 14:00 – 15:00" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("checkbox")).toHaveCount(9);
  await expect(f.getByRole("checkbox", { name: "Jeunes" })).toHaveCount(0);
  await f.getByRole("button", { name: /^\+ 4/ }).click();
  await expect(f.getByRole("checkbox")).toHaveCount(13);
  await expect(f.getByRole("button", { name: /^\+ 4/ })).toHaveCount(0);
  await f.getByRole("checkbox", { name: "Jeunes" }).check();
  await f.getByRole("radio", { name: "Sketch" }).check();
  await expect(f.getByRole("button", { name: "Réserver", exact: true })).toBeEnabled();
});

test("P6 — ma réservation : « à moi » à la place de mon nom et « ⋯ » (Déplacer, Modifier, Retirer), dans la semaine et dans « Mes réservations » ; plus de boutons sous la ligne", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  const sketch = ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes");
  await expect(sketch).toContainText("à moi");
  await expect(sketch).not.toContainText("Jo L.");
  await expect(sketch.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(sketch.getByRole("button", { name: "Retirer" })).toHaveCount(0);
  await plus(sketch).click();
  await expect(page.getByRole("menuitem")).toHaveText(["Déplacer", "Modifier", "Retirer"]);
  await page.keyboard.press("Escape");
  await expect(plus(mesReservations(page))).toHaveCount(2);
  // La réservation d'un autre : son auteur, sans « ⋯ ».
  const franco = ligneDe(page, "Samedi 10 octobre", "Séance louange · Franco");
  await expect(franco).toContainText("Léa M.");
  await expect(plus(franco)).toHaveCount(0);
  await expect(plus(ligneDe(page, "Dimanche 11 octobre", "Chant · EDD 中班"))).toHaveCount(0);
  await verifierAgencement(page);
});

test("P6 — un autre membre n'a ni « ⋯ » ni « à moi » sur ma réservation", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5, "2026-10-09", LEA_MEMBRE);
  const sketch = ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes");
  await expect(sketch).toContainText("Jo L.");
  await expect(sketch).not.toContainText("à moi");
  await expect(plus(sketch)).toHaveCount(0);
  await expect(ligneDe(page, "Samedi 10 octobre", "Séance louange · Franco")).toContainText("à moi");
});

test("P6 — la coordination a « ⋯ » sur toutes les réservations", async ({ page }) => {
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5, "2026-10-09", ALICE_EVT);
  await expect(plus(jour(page, "Samedi 10 octobre"))).toHaveCount(1);
  await expect(plus(jour(page, "Dimanche 11 octobre"))).toHaveCount(2);
  await expect(ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes")).toContainText("Jo L.");
  await expect(ligneDe(page, "Dimanche 11 octobre", "Chant · EDD 中班")).toContainText("à moi");
});

test("P6 — « ⋯ » › Déplacer : les créneaux libres en pastilles, jour par jour, sans liste déroulante ; le nouveau créneau s'écrit", async ({ page }) => {
  const db = await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await plus(ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes")).click();
  await page.getByRole("menuitem", { name: "Déplacer" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Déplacer la réservation" })).toBeVisible();
  await expect(f.locator("select")).toHaveCount(0);
  await expect(f.getByRole("combobox")).toHaveCount(0);
  // Samedi 10 : 10:00 est à Léa ; dimanche 11 : 17:00 et 18:00 sont pris par la réservation hors grille.
  await expect(f.getByRole("group", { name: "Samedi 10 octobre" }).locator("label")).toHaveText(["11:00 – 12:00"]);
  const dimanche = f.getByRole("group", { name: "Dimanche 11 octobre" });
  await expect(dimanche.locator("label")).toHaveText(["14:00 – 15:00", "15:00 – 16:00", "16:00 – 17:00"]);
  await expect(dimanche.getByRole("radio", { name: "16:00 – 17:00" })).toBeChecked();
  // Samedi 17 : 11:00 est déjà à moi (Danse).
  const samedi17 = f.getByRole("group", { name: "Samedi 17 octobre" });
  await expect(samedi17.locator("label")).toHaveText(["10:00 – 11:00"]);
  // Le déplacement ne touche ni quoi ni qui.
  await expect(f.getByRole("checkbox")).toHaveCount(0);
  await samedi17.getByRole("radio", { name: "10:00 – 11:00" }).check();
  await f.getByRole("button", { name: "Déplacer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(db.doc("programmes/x7Kq2/creneaux/s")).toMatchObject({ dimanche: "2026-10-17", debut: "10:00", fin: "11:00", quoi: "Sketch", qui: ["Jeunes"] });
  await expect(ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes")).toHaveCount(0);
  await expect(jour(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 16:00 – 17:00" })).toBeVisible();
});

test("P6 — « ⋯ » › Modifier : Quoi, Qui, Note, sans créneau à choisir ; le créneau reste", async ({ page }) => {
  const db = await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await plus(ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes")).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Modifier le créneau" })).toBeVisible();
  await expect(f).toContainText("Dimanche 11 octobre · 16:00 – 17:00");
  await expect(f.getByRole("radio")).toHaveCount(5);
  await expect(f.getByRole("radio", { name: "Sketch" })).toBeChecked();
  // « Jeunes », au-delà des neuf premiers, est choisi : la liste est dépliée.
  await expect(f.getByRole("checkbox", { name: "Jeunes" })).toBeChecked();
  await f.getByRole("radio", { name: "Danse" }).check();
  await f.getByLabel("Note · facultatif").fill("Avec la sono");
  await f.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(db.doc("programmes/x7Kq2/creneaux/s")).toMatchObject({ dimanche: "2026-10-11", debut: "16:00", fin: "17:00", quoi: "Danse", qui: ["Jeunes"], note: "Avec la sono" });
  await expect(ligneDe(page, "Dimanche 11 octobre", "Danse · Jeunes")).toContainText("Avec la sono");
});

test("P6 — « ⋯ » › Retirer : la confirmation de l'app, aucune fenêtre du navigateur ; « Annuler » ne retire rien, « Retirer » envoie le DELETE", async ({ page }) => {
  const db = await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  const sketch = ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes");
  await plus(sketch).click();
  await page.getByRole("menuitem", { name: "Retirer" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(confirmation).toContainText("Retirer ce créneau ?");
  await expect(confirmation).toContainText("Sketch · Jeunes, dimanche 11 octobre · 16:00 – 17:00 : le créneau redevient libre.");
  await confirmation.getByRole("button", { name: "Annuler" }).click();
  await expect(confirmation).toHaveCount(0);
  expect(db.writes.filter((w) => w.method === "DELETE")).toHaveLength(0);
  await expect(sketch).toBeVisible();
  // Depuis « Mes réservations », cette fois.
  await plus(mesReservations(page).getByRole("listitem").filter({ hasText: "Sketch · Jeunes" })).click();
  await page.getByRole("menuitem", { name: "Retirer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(jour(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 16:00 – 17:00" })).toBeVisible();
  expect(db.writes.filter((w) => w.method === "DELETE").map((w) => w.path)).toEqual(["programmes/x7Kq2/creneaux/s"]);
  await expect(mesReservations(page).getByTestId("compte")).toHaveText("1");
});

test("P6 — en chinois : « 我的 », le menu et la feuille", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  const sketch = page.getByRole("region", { name: "10月11日星期日", exact: true }).getByRole("listitem").filter({ hasText: "Sketch · Jeunes" });
  await expect(sketch).toContainText("我的");
  await sketch.getByRole("button", { name: /^更多操作/ }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["调整", "修改", "删除"]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "预约 14:00 – 15:00" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "请选择内容和参与者" })).toBeDisabled();
});

test("P6 — captures à regarder (planches v18-scene-a-membres-* et v18-scene-a-feuille-telephone), PW_CAPTURES=<dossier>", async ({ page }) => {
  const dir = process.env.PW_CAPTURES;
  test.skip(!dir, "captures seulement avec PW_CAPTURES");
  await ouvrirFete(page, "/evenements/scene/noel", DOCS_P5);
  await plus(mesReservations(page)).first().click();
  await expect(page.getByRole("menuitem")).toHaveCount(3);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/p6-menu-${test.info().project.name}.png` });
  await page.keyboard.press("Escape");
  await jour(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 14:00 – 15:00" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/p6-feuille-${test.info().project.name}.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await plus(ligneDe(page, "Dimanche 11 octobre", "Sketch · Jeunes")).click();
  await page.getByRole("menuitem", { name: "Déplacer" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/p6-deplacer-${test.info().project.name}.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/p6-semaine-${test.info().project.name}.png`, fullPage: true });
});
