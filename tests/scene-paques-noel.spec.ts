import { expect, test } from "@playwright/test";
import {
  editionCourante, editionsAffichees, editionsDe, etatEdition, FETES, feteDe, anneeDe, idEdition,
  jourJParDefaut, libelleEdition, paques, reglagesRepris,
} from "../src/lib/scene/fetes";
import { compteCreneaux, erreursSaison, FAMILLES, lignesDuJour, saisonDe, semainesDe } from "../src/lib/scene/saison";
import { semaineCourte } from "../src/app/evenements/scene/libelles";
import type { Programme } from "../src/types/programme";

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
