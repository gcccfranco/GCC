import { expect, test } from "@playwright/test";
import {
  erreursSaison, FAMILLES, grilleDuJour, horsGrille, joursReservables, lignesDuJour, quiPermis, saisonDe,
} from "../src/lib/scene/saison";
import { currentProgramme, reservationsClosed } from "../src/lib/scene/dimanches";
import { QUI } from "../src/types/programme";

// Lot U1 (docs/spec-scene-saison.md) : la coordination définit la saison de
// réservation de la scène — dates, jours, plages, durée d'un créneau, qui
// réserve — et les groupes prennent un créneau de la grille.

/** Un programme d'avant U1 : aucun champ de saison. */
const NOEL = {
  nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, passages: [],
  createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z",
};

/** La saison de la « Réussite » : du 01/10 au 20/12, samedi 10:00–12:00 et
 *  dimanche 14:00–19:00, créneaux d'1 h, Groupes, EDD, Jeunes et Louange. */
const SAISON = saisonDe({
  ...NOEL,
  fin: "2026-12-20",
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  duree: 60,
  quiAutorises: [...FAMILLES[0].qui, ...FAMILLES[1].qui, ...FAMILLES[2].qui, ...FAMILLES[3].qui],
  ouvert: false,
});

const resa = (dimanche: string, debut: string, fin: string, id = `${dimanche}-${debut}`) => ({
  id, dimanche, debut, fin, quoi: "Chant", qui: ["EDD 中班"], note: "",
  auteurUid: "uid-alice", auteurNom: "Alice Q.", createdAt: "", updatedAt: "",
});

// ─── S1 : la règle (fonctions pures) ────────────────────────────────────────

test("grille : 14:00–19:00 en créneaux d'1 h → cinq créneaux", () => {
  expect(grilleDuJour(SAISON, "2026-10-11")).toEqual([
    { debut: "14:00", fin: "15:00" }, { debut: "15:00", fin: "16:00" }, { debut: "16:00", fin: "17:00" },
    { debut: "17:00", fin: "18:00" }, { debut: "18:00", fin: "19:00" },
  ]);
});

test("grille : en 1 h 30 → 14:00, 15:30, 17:00 (le dernier tient dans la plage)", () => {
  expect(grilleDuJour({ ...SAISON, duree: 90 }, "2026-10-11").map((c) => c.debut)).toEqual(["14:00", "15:30", "17:00"]);
});

test("grille : une plage plus courte qu'un créneau ne donne aucun créneau, et une erreur", () => {
  const courte = { ...SAISON, duree: 120 as const, plages: [{ jour: 6, debut: "10:00", fin: "11:30" }] };
  expect(grilleDuJour(courte, "2026-10-10")).toEqual([]);
  expect(erreursSaison(courte, NOEL.jourJ)).toContain("plageCourte");
});

test("jours : samedi et dimanche du 01/10 au 20/12/2026 → 24 jours, du samedi 3 octobre au dimanche 20 décembre", () => {
  const jours = joursReservables(SAISON, NOEL.jourJ);
  expect(jours).toHaveLength(24);
  expect(jours[0]).toBe("2026-10-03");
  expect(jours[1]).toBe("2026-10-04");
  expect(jours[23]).toBe("2026-12-20");
});

test("jours : jamais le jour J, même si la fermeture le touche", () => {
  const jeudi = { ...SAISON, fin: "2026-12-24", plages: [{ jour: 4, debut: "18:00", fin: "20:00" }] };
  expect(joursReservables(jeudi, NOEL.jourJ)).not.toContain("2026-12-24");
  expect(joursReservables(jeudi, NOEL.jourJ).at(-1)).toBe("2026-12-17");
});

test("défauts d'un programme d'avant U1 : dimanche 14:00–19:00, 1 h, tout membre, fermeture le 20/12, ouvert", () => {
  expect(saisonDe(NOEL)).toEqual({
    debut: "2026-10-01",
    fin: "2026-12-20",
    jours: [0],
    plages: [{ jour: 0, debut: "14:00", fin: "19:00" }],
    duree: 60,
    quiAutorises: [],
    ouvert: true,
  });
});

test("lignes : une réservation 17:00–18:30 dans une grille d'1 h rend 17:00 et 18:00 « Pris » et reste à son heure, hors grille", () => {
  const c = resa("2026-10-11", "17:00", "18:30");
  const lignes = lignesDuJour(SAISON, "2026-10-11", [c]);
  expect(lignes.map((l) => [l.type, l.debut])).toEqual([
    ["libre", "14:00"], ["libre", "15:00"], ["libre", "16:00"],
    ["reserve", "17:00"], ["pris", "17:00"], ["pris", "18:00"],
  ]);
  const ligne = lignes.find((l) => l.type === "reserve");
  expect(ligne).toMatchObject({ debut: "17:00", fin: "18:30", horsGrille: true, creneau: c });
});

test("lignes : une réservation pile sur un créneau prend sa place, dans la grille", () => {
  const c = resa("2026-10-11", "15:00", "16:00");
  const lignes = lignesDuJour(SAISON, "2026-10-11", [c]);
  expect(lignes.map((l) => [l.type, l.debut])).toEqual([
    ["libre", "14:00"], ["reserve", "15:00"], ["libre", "16:00"], ["libre", "17:00"], ["libre", "18:00"],
  ]);
  expect(lignes[1]).toMatchObject({ horsGrille: false });
});

test("hors grille : hors des jours, hors de la période ou hors des créneaux ; jamais une réservation pile sur la grille", () => {
  const pile = resa("2026-10-11", "15:00", "16:00");
  const decale = resa("2026-10-11", "17:00", "18:30");
  const mardi = resa("2026-10-13", "15:00", "16:00");
  const apres = resa("2026-12-27", "15:00", "16:00");
  expect(horsGrille(SAISON, [pile, decale, mardi, apres]).map((c) => c.id)).toEqual([decale.id, mardi.id, apres.id]);
  expect(horsGrille({ ...SAISON, duree: 90 }, [pile]).map((c) => c.id)).toEqual([pile.id]);
});

test("erreurs : fermeture le jour J ou après", () => {
  expect(erreursSaison({ ...SAISON, fin: "2026-12-24" }, NOEL.jourJ)).toContain("finApresJourJ");
  expect(erreursSaison({ ...SAISON, fin: "2026-12-30" }, NOEL.jourJ)).toContain("finApresJourJ");
  expect(erreursSaison(SAISON, NOEL.jourJ)).toEqual([]);
});

test("erreurs : fermeture avant l'ouverture", () => {
  expect(erreursSaison({ ...SAISON, fin: "2026-09-30" }, NOEL.jourJ)).toContain("finAvantDebut");
});

test("erreurs : un jour coché sans plage", () => {
  expect(erreursSaison({ ...SAISON, jours: [6, 0, 3] }, NOEL.jourJ)).toContain("jourSansPlage");
});

test("erreurs : aucun jour réservable", () => {
  expect(erreursSaison({ ...SAISON, jours: [], plages: [] }, NOEL.jourJ)).toContain("aucunJour");
});

test("erreurs : une plage dont la fin n'est pas après le début", () => {
  const bad = { ...SAISON, plages: [{ jour: 6, debut: "12:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }] };
  expect(erreursSaison(bad, NOEL.jourJ)).toContain("plageInvalide");
});

test("erreurs : deux plages du même jour qui se chevauchent", () => {
  const bad = { ...SAISON, plages: [...SAISON.plages, { jour: 0, debut: "18:00", fin: "20:00" }] };
  expect(erreursSaison(bad, NOEL.jourJ)).toContain("plagesChevauchent");
});

test("fermeture : le volet se ferme le lendemain de `fin`, sinon du dernier dimanche avant le jour J", () => {
  expect(reservationsClosed("2026-12-20", "2026-12-24")).toBe(false);
  expect(reservationsClosed("2026-12-21", "2026-12-24")).toBe(true);
  expect(reservationsClosed("2026-12-06", "2026-12-24", "2026-12-06")).toBe(false);
  expect(reservationsClosed("2026-12-07", "2026-12-24", "2026-12-06")).toBe(true);
});

test("programme affiché : un brouillon n'est jamais affiché, même épinglé ; ouvert → lui ; champ absent → ouvert", () => {
  const brouillon = { debut: "2026-10-01", jourJ: "2026-12-24", visible: false, ouvert: false };
  expect(currentProgramme([brouillon], "2026-10-05")).toBeNull();
  expect(currentProgramme([{ ...brouillon, visible: true }], "2026-10-05")).toBeNull();
  const ouvert = { ...brouillon, ouvert: true };
  expect(currentProgramme([ouvert], "2026-10-05")).toBe(ouvert);
  const avantU1 = { debut: "2026-10-01", jourJ: "2026-12-24", visible: false };
  expect(currentProgramme([avantU1], "2026-10-05")).toBe(avantU1);
});

test("familles : Groupes, EDD, Jeunes, Louange, Chorale ; « Jeunes » et « Chorale » sont des groupes du « Qui »", () => {
  expect(FAMILLES.map((f) => f.cle)).toEqual(["groupes", "edd", "jeunes", "louange", "chorale"]);
  expect(FAMILLES[3].qui).toEqual(["Franco", "敬拜团"]);
  expect(QUI).toContain("Jeunes");
  expect(QUI).toContain("Chorale");
  for (const f of FAMILLES) for (const q of f.qui) expect(QUI).toContain(q);
});

test("groupes proposés : tous sans limite, sinon ceux des familles permises, dans l'ordre du « Qui »", () => {
  expect(quiPermis({})).toEqual([...QUI]);
  expect(quiPermis({ quiAutorises: [] })).toEqual([...QUI]);
  expect(quiPermis({ quiAutorises: SAISON.quiAutorises })).not.toContain("Chorale");
  expect(quiPermis({ quiAutorises: ["Jeunes", "Franco"] })).toEqual(["Franco", "Jeunes"]);
});
