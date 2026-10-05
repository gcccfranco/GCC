import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { canReserverPour } from "../src/lib/access";
import {
  commence, creneauxLibres, erreursSaison, FAMILLES, famillesDe, grilleDuJour, horsGrille, joursReservables,
  lignesDuJour, quiDesFamilles, quiPermis, saisonDe,
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

test("erreurs : une date en cours de frappe (année 0002, 0202…) n'est pas une date — rien ne s'écrit avant l'année entière", () => {
  expect(erreursSaison({ ...SAISON, debut: "0002-10-01" }, NOEL.jourJ)).toContain("dateInvalide");
  expect(erreursSaison({ ...SAISON, fin: "0202-12-20" }, NOEL.jourJ)).toContain("dateInvalide");
  expect(erreursSaison({ ...SAISON, debut: "2026-09-27" }, NOEL.jourJ)).toEqual([]);
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

test("groupes proposés : tous sans limite, sinon ceux des familles permises, rangés par famille comme la planche", () => {
  const parFamille = [
    "Gp Bonté", "Gp Fidélité", "Gp Paix", "Gp Amour", "Gp Joie", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
    "Jeunes", "Franco", "敬拜团", "Chorale",
  ];
  expect(quiPermis({})).toEqual(parFamille);
  expect(quiPermis({ quiAutorises: [] })).toEqual(parFamille);
  expect([...quiPermis({})].sort()).toEqual([...QUI].sort());
  expect(quiPermis({ quiAutorises: SAISON.quiAutorises })).not.toContain("Chorale");
  expect(quiPermis({ quiAutorises: ["Franco", "Jeunes"] })).toEqual(["Jeunes", "Franco"]);
});

// ─── S2 : droits, en double (access.ts et firestore.rules) ─────────────────

const MEMBRE = { uid: "uid-noe", email: "noe@example.com" };
const COORD = { uid: "uid-alice", email: "alice@example.com" };
const POLE_EVENEMENT = { poles: ["evenement"] };
const PERMIS = { ouvert: true, quiAutorises: SAISON.quiAutorises };

test("réserver pour : liste vide → tout membre connecté, pour n'importe quel groupe", () => {
  expect(canReserverPour(MEMBRE, null, { ouvert: true, quiAutorises: [] }, ["Chorale"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, {}, ["Gp Joie"]), "programme d'avant U1").toBe(true);
  expect(canReserverPour(null, null, {}, ["Gp Joie"]), "rien sans compte").toBe(false);
});

test("réserver pour : un groupe d'une famille permise → oui ; « Chorale » hors familles → non", () => {
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Jeunes"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Gp Paix", "EDD 中班"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Chorale"])).toBe(false);
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Jeunes", "Chorale"])).toBe(false);
});

test("réserver pour : la coordination toujours, même un brouillon ; un membre jamais dans un brouillon", () => {
  expect(canReserverPour(COORD, POLE_EVENEMENT, PERMIS, ["Chorale"])).toBe(true);
  expect(canReserverPour(COORD, POLE_EVENEMENT, { ...PERMIS, ouvert: false }, ["Chorale"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, { ouvert: false, quiAutorises: [] }, ["Jeunes"])).toBe(false);
});

test("règles Firestore : les créneaux passent par reservable(), miroir de canReserverPour", () => {
  const rules = readFileSync(path.join(process.cwd(), "firestore.rules"), "utf8");
  const fonction = rules.slice(rules.indexOf("function reservable("), rules.indexOf("match /creneaux/{cid}"));
  expect(fonction).toContain("p.get('ouvert', true) == true");
  expect(fonction).toContain("p.get('quiAutorises', []).size() == 0 || qui.hasOnly(p.quiAutorises)");
  const bloc = rules.slice(rules.indexOf("match /creneaux/{cid}"));
  const create = bloc.slice(bloc.indexOf("allow create"), bloc.indexOf("allow update"));
  const update = bloc.slice(bloc.indexOf("allow update"), bloc.indexOf("allow delete"));
  // Jusqu'à l'accolade qui ferme le bloc (celle de « {cid} » viendrait avant : tranche vide).
  const del = bloc.slice(bloc.indexOf("allow delete"), bloc.indexOf("}", bloc.indexOf("allow delete")));
  expect(create).toContain("request.resource.data.auteurUid == request.auth.uid");
  expect(create).toContain("isCoordination() || reservable(id, request.resource.data.qui)");
  expect(update).toContain("reservable(id, request.resource.data.qui)");
  expect(del).toContain("resource.data.auteurUid == request.auth.uid");
  expect(del).not.toContain("reservable");
});

// ─── S3 : l'écran de la coordination ────────────────────────────────────────

const NOE: FakeProfile = { uid: "uid-noe", email: "noe@example.com", firstName: "Noé", lastName: "L." };
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };

/** « Noël 2026 » de la Réussite, en brouillon. */
const NOEL26 = {
  ...NOEL,
  nom: "Noël 2026",
  fin: "2026-12-20",
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  duree: 60,
  quiAutorises: SAISON.quiAutorises,
  ouvert: false,
};

/** Lundi 5 octobre 2026 à 10:00, horloge posée avant la connexion. */
async function ouvrir(page: Page, who: FakeProfile, docs: Record<string, Record<string, unknown>>, jour = "2026-10-05T10:00:00") {
  await page.clock.setFixedTime(new Date(jour));
  return signInAs(page, who, docs, "/evenements/scene");
}

const patches = (db: FakeDb, path = "programmes/noel") => db.writes.filter((w) => w.method === "PATCH" && w.path === path);
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300); // fin des transitions de couleur des pilules (150 ms)
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

const carte = (page: Page) => page.getByRole("region", { name: "Mettre en place la saison" });
const apercu = (page: Page) => page.getByRole("region", { name: "Aperçu de ce que verront les groupes" });

test("brouillon : un membre n'a ni onglet ni programme", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": NOEL26 });
  await expect(page.getByText("Aucun programme en cours.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Noël 2026", exact: true })).toHaveCount(0);
});

test("brouillon : la coordination l'ouvre depuis sa ligne et voit la saison et l'aperçu", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toBeVisible();
  const ligne = page.getByRole("region", { name: "Programmes masqués" }).getByRole("listitem").filter({ hasText: "Noël 2026" });
  await expect(ligne).toContainText("Brouillon");
  await ligne.getByRole("button", { name: "Préparer la saison" }).click();
  await expect(page.getByRole("heading", { name: "Noël 2026 · réservations" })).toBeVisible();
  await expect(page.getByText("Jour J : jeudi 24 décembre", { exact: true })).toBeVisible();
  // Les dates en toutes lettres, comme la planche (le sélecteur natif reste dessous).
  await expect(carte(page).getByText("du jeudi 1er octobre", { exact: true })).toBeVisible();
  await expect(carte(page).getByText("au dimanche 20 décembre", { exact: true })).toBeVisible();
  await expect(carte(page).getByLabel("Ouverture des réservations")).toHaveValue("2026-10-01");
  await expect(carte(page).getByRole("button", { name: "sam.", exact: true, pressed: true })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "dim.", exact: true, pressed: true })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "lun.", exact: true, pressed: false })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "sam. 10:00 – 12:00" })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "dim. 14:00 – 19:00" })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "1 h", exact: true, pressed: true })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "Jeunes", pressed: true })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "Chorale", pressed: false })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "Tout membre connecté", pressed: false })).toBeVisible();
  await expect(carte(page)).toContainText("Deux créneaux qui se chevauchent restent refusés ; la coordination et les admins peuvent tout déplacer.");
  await expect(apercu(page).getByRole("heading", { name: "Samedi 10 octobre" })).toBeVisible();
  await apercu(page).getByRole("button", { name: "Jour suivant" }).click();
  await expect(apercu(page).getByRole("heading", { name: "Dimanche 11 octobre" })).toBeVisible();
  await expect(apercu(page).getByRole("listitem")).toHaveText([/14:00\s*Libre/, /15:00\s*Libre/, /16:00\s*Libre/, /17:00\s*Libre/, /18:00\s*Libre/]);
});

test("« Ouvrir les réservations » écrit `ouvert: true` en un seul PATCH, et l'onglet prend le nom du programme", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await page.getByRole("button", { name: "Ouvrir les réservations" }).click();
  await expect(page.getByText("Réservations ouvertes du 1er octobre au 20 décembre")).toBeVisible();
  await expect(page.getByRole("link", { name: "Noël 2026", exact: true })).toBeVisible();
  expect(patches(db)).toHaveLength(1);
  expect(patches(db)[0].data).toMatchObject({ ouvert: true });
  expect(Object.keys(patches(db)[0].data).sort()).toEqual(["ouvert", "updatedAt"]);
});

test("une fois ouvert, un membre voit l'onglet, le samedi et le dimanche", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": { ...NOEL26, ouvert: true } });
  await expect(page.getByRole("link", { name: "Noël 2026", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Samedi 10 octobre" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 11 octobre" })).toBeVisible();
});

test("saison ouverte : repliée en une ligne au-dessus des volets ; cocher « sam. » ajoute une plage, le samedi entre dans l'aperçu", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL });
  await expect(page.getByText("Saison : 1er octobre → 20 décembre · dim. · 1 h · Tout membre connecté")).toBeVisible();
  await page.getByRole("button", { name: "Modifier la saison" }).click();
  await expect(apercu(page).getByRole("heading", { name: "Dimanche 11 octobre" })).toBeVisible();
  await carte(page).getByRole("button", { name: "sam.", exact: true }).click();
  await expect(carte(page).getByRole("button", { name: "sam. 14:00 – 19:00" })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([
    { jour: 6, debut: "14:00", fin: "19:00" }, { jour: 0, debut: "14:00", fin: "19:00" },
  ]);
  await apercu(page).getByRole("button", { name: "Jour précédent" }).click();
  await expect(apercu(page).getByRole("heading", { name: "Samedi 10 octobre" })).toBeVisible();
  await expect(apercu(page).getByRole("listitem")).toHaveCount(5);
});

test("changer la durée met l'aperçu à jour", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await apercu(page).getByRole("button", { name: "Jour suivant" }).click();
  await carte(page).getByRole("button", { name: "1 h 30", exact: true }).click();
  await expect(apercu(page).getByRole("listitem")).toHaveText([/14:00\s*Libre/, /15:30\s*Libre/, /17:00\s*Libre/]);
  expect(patches(db).at(-1)?.data).toMatchObject({ duree: 90 });
});

test("une fermeture le jour J ou après affiche l'erreur et n'écrit rien", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await carte(page).getByLabel("Fermeture des réservations").fill("2026-12-24");
  await expect(carte(page).getByText("La fermeture doit être avant le jour J.")).toBeVisible();
  expect(patches(db)).toHaveLength(0);
});

test("hors grille : passer à 1 h 30 avec une réservation à 15:00 la signale, elle reste en base, « Déplacer » la pose sur un créneau libre", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "15:00", "16:00"), quoi: "Sketch", qui: ["Jeunes"], auteurUid: "uid-noe", auteurNom: "Noé L." };
  const db = await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, ouvert: true }, "programmes/noel/creneaux/c1": c1 });
  await page.getByRole("button", { name: "Modifier la saison" }).click();
  await carte(page).getByRole("button", { name: "1 h 30", exact: true }).click();
  const hors = page.getByRole("region", { name: "1 réservation hors grille" });
  await expect(hors).toContainText("Sketch · Jeunes");
  expect(db.doc("programmes/noel/creneaux/c1")).toMatchObject({ debut: "15:00", fin: "16:00" });
  await hors.getByRole("button", { name: "Déplacer" }).click();
  await page.getByLabel("Jour", { exact: true }).selectOption({ label: "Dimanche 11 octobre" });
  await page.getByLabel("Créneau", { exact: true }).selectOption({ label: "15:30 – 17:00" });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // La feuille ouverte cache le reste de la page aux lecteurs d'écran : on attend qu'elle se ferme.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("region", { name: /hors grille/ })).toHaveCount(0);
  expect(db.doc("programmes/noel/creneaux/c1")).toMatchObject({ dimanche: "2026-10-11", debut: "15:30", fin: "17:00", quoi: "Sketch" });
});

test("« Programme du jour J » ouvre l'ordre de passage depuis l'écran de la saison", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, passages: [{ quoi: "Chant", qui: ["Chorale"], titre: "Douce nuit" }] } });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await page.getByRole("button", { name: "Programme du jour J" }).click();
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toContainText(["Douce nuit"]);
});

test("« Programme du jour J » s'ouvre sous l'en-tête, au-dessus de la saison (pas au bas d'une longue page)", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, passages: [{ quoi: "Chant", qui: ["Chorale"], titre: "Douce nuit" }] } });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await page.getByRole("button", { name: "Programme du jour J" }).click();
  const ordre = page.getByRole("list", { name: "Ordre de Passage jour J" });
  await expect(ordre).toBeVisible();
  const yOrdre = (await ordre.boundingBox())?.y ?? Infinity;
  const yCarte = (await carte(page).boundingBox())?.y ?? -Infinity;
  expect(yOrdre).toBeLessThan(yCarte);
});

test("« Modifier le programme » depuis l'écran de la saison : nom et jour J, en un PATCH de ces deux champs", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await page.getByRole("button", { name: "Modifier le programme" }).click();
  await expect(page.getByLabel("Début des réservations")).toHaveCount(0);
  await page.getByLabel("Nom").fill("Noël 26");
  await page.getByLabel("Jour J").fill("2026-12-25");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Noël 26 · réservations" })).toBeVisible();
  await expect(page.getByText("Jour J : vendredi 25 décembre", { exact: true })).toBeVisible();
  expect(patches(db)).toHaveLength(1);
  expect(Object.keys(patches(db)[0].data).sort()).toEqual(["jourJ", "nom", "updatedAt"]);
  expect(patches(db)[0].data).toMatchObject({ nom: "Noël 26", jourJ: "2026-12-25" });
});

test("dates : changer l'ouverture écrit `debut` seul, et la pastille se relit en toutes lettres", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await carte(page).getByLabel("Ouverture des réservations").fill("2026-10-08");
  await expect(carte(page).getByText("du jeudi 8 octobre", { exact: true })).toBeVisible();
  await expect.poll(() => patches(db).length).toBe(1);
  expect(Object.keys(patches(db)[0].data).sort()).toEqual(["debut", "updatedAt"]);
  expect(patches(db)[0].data.debut).toBe("2026-10-08");
});

test("plages : la pastille s'ouvre pour changer la plage ; retirer la seule plage d'un jour coché n'écrit rien ; décocher le jour retire ses plages", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await carte(page).getByRole("button", { name: "sam. 10:00 – 12:00" }).click();
  await carte(page).getByLabel("Fin de la plage").fill("13:00");
  await carte(page).getByRole("button", { name: "OK", exact: true }).click();
  await expect(carte(page).getByRole("button", { name: "sam. 10:00 – 13:00" })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([
    { jour: 6, debut: "10:00", fin: "13:00" }, { jour: 0, debut: "14:00", fin: "19:00" },
  ]);
  const avant = patches(db).length;
  await carte(page).getByRole("button", { name: "sam. 10:00 – 13:00" }).click();
  await carte(page).getByRole("button", { name: "Retirer la plage" }).click();
  await expect(carte(page).getByText("Chaque jour coché a au moins une plage.")).toBeVisible();
  expect(patches(db)).toHaveLength(avant);
  await carte(page).getByRole("button", { name: "sam.", exact: true }).click();
  await expect(carte(page).getByRole("button", { name: "sam.", exact: true, pressed: false })).toBeVisible();
  await expect(carte(page).getByText("Chaque jour coché a au moins une plage.")).toHaveCount(0);
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([{ jour: 0, debut: "14:00", fin: "19:00" }]);
});

test("plages : « + Plage » ajoute une seconde plage au dimanche, rangée par heure", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await carte(page).getByRole("button", { name: "Ajouter une plage" }).click();
  await carte(page).getByLabel("Jour de la plage").selectOption({ label: "dim." });
  await carte(page).getByLabel("Début de la plage").fill("10:00");
  await carte(page).getByLabel("Fin de la plage").fill("12:00");
  await carte(page).getByRole("button", { name: "OK", exact: true }).click();
  await expect(carte(page).getByRole("button", { name: /^(sam|dim)\. / })).toHaveText([
    "sam. 10:00 – 12:00", "dim. 10:00 – 12:00", "dim. 14:00 – 19:00",
  ]);
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([
    { jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" },
  ]);
});

test("qui peut réserver : « Tout membre connecté » vide la liste ; une famille cochée écrit ses groupes ; l'un exclut l'autre", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await carte(page).getByRole("button", { name: "Tout membre connecté" }).click();
  await expect(carte(page).getByRole("button", { name: "Tout membre connecté", pressed: true })).toBeVisible();
  await expect(carte(page).getByRole("button", { name: "Groupes", pressed: false })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.quiAutorises).toEqual([]);
  await carte(page).getByRole("button", { name: "Chorale" }).click();
  await expect(carte(page).getByRole("button", { name: "Tout membre connecté", pressed: false })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.quiAutorises).toEqual(["Chorale"]);
});

test("hors grille : « Retirer » supprime la réservation après confirmation", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "17:00", "18:30"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  const db = await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, ouvert: true }, "programmes/noel/creneaux/c1": c1 });
  await page.getByRole("button", { name: "Modifier la saison" }).click();
  page.on("dialog", (d) => d.accept());
  const hors = page.getByRole("region", { name: "1 réservation hors grille" });
  await expect(hors).toContainText("17:00 – 18:30");
  await hors.getByRole("button", { name: "Retirer" }).click();
  await expect(page.getByRole("region", { name: /hors grille/ })).toHaveCount(0);
  expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("programmes/noel/creneaux/c1");
});

test("中文 : l'écran de la saison est traduit, dates comprises", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "准备预约季" }).click();
  await expect(page.getByRole("heading", { name: "Noël 2026 · 预约" })).toBeVisible();
  const carteZh = page.getByRole("region", { name: "设置预约季" });
  await expect(carteZh.getByText("从 10月1日星期四", { exact: true })).toBeVisible();
  await expect(carteZh.getByRole("button", { name: "周六 10:00 – 12:00" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开放预约" })).toBeVisible();
  await expect(page.getByRole("region", { name: "各小组将看到的预览" }).getByRole("heading", { name: "10月10日星期六" })).toBeVisible();
});

test("captures : l'écran de la saison, brouillon avec deux réservations, puis ouvert (à regarder)", async ({ page }) => {
  const sketch = { ...resa("2026-10-11", "15:00", "16:00"), quoi: "Sketch", qui: ["Jeunes"] };
  const chant = resa("2026-10-11", "17:00", "18:00");
  await ouvrir(page, ALICE, {
    "programmes/noel": NOEL26, "programmes/noel/creneaux/a": sketch, "programmes/noel/creneaux/b": chant,
  });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await apercu(page).getByRole("button", { name: "Jour suivant" }).click();
  await expect(apercu(page).getByText("Sketch · Jeunes")).toBeVisible();
  await capture(page, "u1-saison-brouillon");
  await page.getByRole("button", { name: "Ouvrir les réservations" }).click();
  await expect(page.getByText("Réservations ouvertes du 1er octobre au 20 décembre")).toBeVisible();
  await carte(page).getByRole("button", { name: "1 h 30", exact: true }).click();
  await expect(page.getByRole("region", { name: "2 réservations hors grille" })).toBeVisible();
  await capture(page, "u1-saison-ouverte-hors-grille");
  await page.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Modifier la saison" })).toBeVisible();
  await capture(page, "u1-saison-repliee");
});

test("créer un programme : brouillon ouvert au jour de sa création, l'écran s'ouvre directement sur sa saison", async ({ page }) => {
  const db = await ouvrir(page, ALICE, {});
  await page.getByLabel("Nom").fill("Noël 2026");
  await page.getByLabel("Jour J").fill("2026-12-24");
  await expect(page.getByLabel("Début des réservations")).toHaveCount(0);
  await page.getByRole("button", { name: "Créer le programme" }).click();
  await expect(page.getByRole("heading", { name: "Noël 2026 · réservations" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ouvrir les réservations" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Scène", exact: true })).toBeVisible();
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("programmes/"));
  expect(cree?.data).toMatchObject({ nom: "Noël 2026", jourJ: "2026-12-24", debut: "2026-10-05", ouvert: false, visible: false });
});

test("créneaux libres : la grille à venir moins les créneaux pris ou commencés ; la réservation qu'on déplace ne se bloque pas elle-même", () => {
  const s = { ...SAISON, fin: "2026-10-11" };
  const c = resa("2026-10-11", "15:00", "16:00", "c");
  const libres = creneauxLibres(s, NOEL.jourJ, [c], { today: "2026-10-10", maintenant: "10:30" });
  expect(libres.map((l) => `${l.jour} ${l.debut}`)).toEqual([
    "2026-10-10 11:00",
    "2026-10-11 14:00", "2026-10-11 16:00", "2026-10-11 17:00", "2026-10-11 18:00",
  ]);
  const pourC = creneauxLibres(s, NOEL.jourJ, [c], { sauf: "c", today: "2026-10-10", maintenant: "10:30" });
  expect(pourC.map((l) => `${l.jour} ${l.debut}`)).toContain("2026-10-11 15:00");
  expect(commence("2026-10-10", "10:00", "2026-10-10", "10:00")).toBe(true);
  expect(commence("2026-10-10", "11:00", "2026-10-10", "10:30")).toBe(false);
  expect(commence("2026-10-09", "18:00", "2026-10-10", "08:00")).toBe(true);
});

test("familles d'une liste « qui » : celles dont tous les groupes sont permis ; et l'inverse", () => {
  expect(famillesDe(SAISON.quiAutorises)).toEqual(["groupes", "edd", "jeunes", "louange"]);
  expect(famillesDe([])).toEqual([]);
  expect(quiDesFamilles(["jeunes", "louange"])).toEqual(["Franco", "敬拜团", "Jeunes"]);
});

// ─── S4 : l'écran des membres ───────────────────────────────────────────────
// Planches scene-reserver-telephone et scene-reserver-feuille-telephone (v17).

/** « Noël 2026 » ouvert : la saison de la Réussite, telle que les membres la voient. */
const OUVERT = { ...NOEL26, ouvert: true };
const LEA: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M." };
/** Réservation de Noé, dimanche 11 octobre à 15:00 (parcours « Réussite »). */
const SKETCH = { ...resa("2026-10-11", "15:00", "16:00", "s"), quoi: "Sketch", qui: ["Jeunes"], auteurUid: "uid-noe", auteurNom: "Noé L." };

const bloc = (page: Page, jour: string) => page.getByRole("region", { name: jour, exact: true });
const feuille = (page: Page) => page.getByRole("dialog");

test("membres : un bloc par jour réservable à venir, en toutes lettres, chaque créneau « Libre · Réserver » ; les jours passés derrière un lien", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await expect(page.getByText("Réservations : du 3 octobre au 20 décembre", { exact: true })).toBeVisible();
  await expect(bloc(page, "Samedi 10 octobre").getByRole("listitem")).toHaveText([/10:00\s*Libre\s*Réserver/, /11:00\s*Libre\s*Réserver/]);
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await expect(dimanche.getByRole("listitem")).toHaveText([/14:00\s*Libre/, /15:00\s*Libre/, /16:00\s*Libre/, /17:00\s*Libre/, /18:00\s*Libre/]);
  await expect(dimanche.getByRole("button", { name: "Réserver 15:00 – 16:00" })).toBeVisible();
  await expect(bloc(page, "Dimanche 20 décembre")).toBeVisible();
  // Samedi 3 et dimanche 4 octobre sont passés (on est le lundi 5).
  await expect(bloc(page, "Samedi 3 octobre")).toHaveCount(0);
  await page.getByRole("button", { name: "Voir les jours passés (2)" }).click();
  await expect(bloc(page, "Samedi 3 octobre")).toBeVisible();
  await expect(bloc(page, "Samedi 3 octobre").getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

test("membres : « Réserver » ouvre la feuille sur ce créneau, sans heure à taper ; 15:00 « Sketch · Jeunes » s'écrit 15:00–16:00 à son nom", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 15:00 – 16:00" }).click();
  const f = feuille(page);
  await expect(f.getByRole("heading", { name: "Réserver" })).toBeVisible();
  await expect(f).toContainText("Dimanche 11 octobre · 15:00 – 16:00");
  await expect(f.getByLabel("Début")).toHaveCount(0);
  await expect(f.getByLabel("Jour", { exact: true })).toHaveCount(0);
  await f.getByRole("radio", { name: "Sketch" }).check();
  await f.getByRole("checkbox", { name: "Jeunes" }).check();
  await f.getByLabel("Note").fill("Avec la sono");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(feuille(page)).toHaveCount(0);
  const ligne = bloc(page, "Dimanche 11 octobre").getByRole("listitem").filter({ hasText: "Sketch · Jeunes" });
  await expect(ligne).toContainText("15:00");
  await expect(ligne).toContainText("Noé L.");
  await expect(ligne).toContainText("Avec la sono");
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("programmes/noel/creneaux/"));
  expect(cree?.data).toMatchObject({
    dimanche: "2026-10-11", debut: "15:00", fin: "16:00", quoi: "Sketch", qui: ["Jeunes"], note: "Avec la sono",
    auteurUid: "uid-noe", auteurNom: "Noé L.",
  });
});

test("membres : la feuille ne propose que les groupes permis (pas « Chorale ») ; sans groupe coché, rien ne s'écrit", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 11:00" }).click();
  const f = feuille(page);
  await expect(f.getByText("Qui · les groupes permis pour cette saison")).toBeVisible();
  await expect(f.getByRole("checkbox")).toHaveCount(12);
  await expect(f.getByRole("checkbox", { name: "Chorale" })).toHaveCount(0);
  await expect(f.getByRole("radio", { name: "Séance louange" })).toBeChecked();
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(f.getByRole("alert")).toHaveText("Choisis au moins un groupe.");
  expect(db.writes.filter((w) => w.method === "POST")).toHaveLength(0);
});

test("membres : sans limite, la feuille propose tous les groupes ; la coordination n'est jamais limitée", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT });
  await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 11:00" }).click();
  await expect(feuille(page).getByRole("checkbox", { name: "Chorale" })).toBeVisible();
  await expect(feuille(page).getByText("Qui", { exact: true })).toBeVisible();
});

test("membres : la réservation d'un autre montre son auteur, sans bouton ; un créneau pris n'a pas de bouton", async ({ page }) => {
  const long = resa("2026-10-11", "17:00", "18:30", "l");
  await ouvrir(page, LEA, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH, "programmes/noel/creneaux/l": long });
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await expect(dimanche.getByRole("listitem")).toHaveText([
    /14:00\s*Libre\s*Réserver/, /15:00\s*Sketch · Jeunes\s*Noé L\./, /16:00\s*Libre\s*Réserver/,
    /17:00 – 18:30\s*Chant · EDD 中班\s*Alice Q\./, /17:00\s*Pris/, /18:00\s*Pris/,
  ]);
  await expect(dimanche.getByRole("button")).toHaveCount(2);
  await expect(dimanche.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(dimanche.getByRole("button", { name: "Retirer" })).toHaveCount(0);
  await expect(dimanche.getByText("Hors grille")).toHaveCount(0);
});

test("membres : un créneau commencé aujourd'hui ne se réserve plus", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT }, "2026-10-11T15:30:00");
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await expect(dimanche.getByRole("listitem")).toHaveCount(5);
  await expect(dimanche.getByRole("button", { name: /^Réserver/ })).toHaveCount(3);
  await expect(dimanche.getByRole("button", { name: "Réserver 15:00 – 16:00" })).toHaveCount(0);
  await expect(dimanche.getByRole("button", { name: "Réserver 16:00 – 17:00" })).toBeVisible();
});

test("membres : « Modifier » déplace sa réservation sur un créneau libre de la saison, jour par jour", async ({ page }) => {
  const pris = { ...resa("2026-10-17", "10:00", "11:00", "p"), auteurUid: "uid-lea", auteurNom: "Léa M." };
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH, "programmes/noel/creneaux/p": pris });
  const ligne = bloc(page, "Dimanche 11 octobre").getByRole("listitem").filter({ hasText: "Sketch · Jeunes" });
  await ligne.getByRole("button", { name: "Modifier" }).click();
  const f = feuille(page);
  await expect(f.getByRole("heading", { name: "Modifier le créneau" })).toBeVisible();
  await expect(f.getByLabel("Jour", { exact: true })).toHaveValue("2026-10-11");
  await expect(f.getByLabel("Créneau", { exact: true })).toHaveValue("15:00-16:00");
  await expect(f.getByRole("radio", { name: "Sketch" })).toBeChecked();
  await expect(f.getByRole("checkbox", { name: "Jeunes" })).toBeChecked();
  await f.getByLabel("Jour", { exact: true }).selectOption({ label: "Samedi 17 octobre" });
  // 10:00 est pris par Léa : seul 11:00 reste ce samedi-là.
  await expect(f.getByLabel("Créneau", { exact: true }).getByRole("option")).toHaveText(["11:00 – 12:00"]);
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(feuille(page)).toHaveCount(0);
  await expect(bloc(page, "Samedi 17 octobre").getByRole("listitem").filter({ hasText: "Sketch · Jeunes" })).toContainText("11:00");
  await expect(bloc(page, "Dimanche 11 octobre").getByText("Sketch · Jeunes")).toHaveCount(0);
  expect(db.doc("programmes/noel/creneaux/s")).toMatchObject({ dimanche: "2026-10-17", debut: "11:00", fin: "12:00", quoi: "Sketch", qui: ["Jeunes"] });
});

test("membres : « Retirer » sa réservation après confirmation rend le créneau libre", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH });
  page.on("dialog", (d) => d.accept());
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await dimanche.getByRole("listitem").filter({ hasText: "Sketch · Jeunes" }).getByRole("button", { name: "Retirer" }).click();
  await expect(dimanche.getByRole("button", { name: "Réserver 15:00 – 16:00" })).toBeVisible();
  expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("programmes/noel/creneaux/s");
});

test("membres : la coordination modifie ou retire toute réservation et la voit « hors grille »", async ({ page }) => {
  const long = { ...resa("2026-10-11", "17:00", "18:30", "l"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH, "programmes/noel/creneaux/l": long });
  const dimanche = bloc(page, "Dimanche 11 octobre");
  const sketch = dimanche.getByRole("listitem").filter({ hasText: "Sketch · Jeunes" });
  await expect(sketch.getByRole("button", { name: "Modifier" })).toBeVisible();
  await expect(sketch.getByRole("button", { name: "Retirer" })).toBeVisible();
  await expect(dimanche.getByRole("listitem").filter({ hasText: "Chant · EDD 中班" })).toContainText("Hors grille");
});

test("membres : après la fermeture de la saison, le volet Entraînements disparaît (horloge simulée)", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": { ...OUVERT, fin: "2026-11-29" } }, "2026-11-30T10:00:00");
  await expect(page.getByRole("heading", { name: "Ordre de Passage jour J" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entraînements" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

test("membres : la veille de la fermeture, le dernier jour se réserve encore", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": { ...OUVERT, fin: "2026-11-29" } }, "2026-11-29T10:00:00");
  await expect(bloc(page, "Dimanche 29 novembre").getByRole("button", { name: "Réserver 14:00 – 15:00" })).toBeVisible();
  await expect(page.getByText("Réservations : du 3 octobre au 29 novembre", { exact: true })).toBeVisible();
});

test("membres en 中文 : jours, lignes et feuille traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH });
  await expect(page.getByRole("button", { name: "查看过去的日子（2）" })).toBeVisible();
  await expect(page.getByText("预约：10月3日 至 12月20日", { exact: true })).toBeVisible();
  const samedi = page.getByRole("region", { name: "10月10日星期六" });
  await expect(samedi.getByRole("listitem")).toHaveText([/10:00\s*空闲\s*预约/, /11:00\s*空闲\s*预约/]);
  await expect(page.getByRole("region", { name: "10月11日星期日" }).getByRole("button", { name: "修改" })).toBeVisible();
  await samedi.getByRole("button", { name: "预约 10:00 – 11:00" }).click();
  const f = feuille(page);
  await expect(f.getByRole("heading", { name: "预约" })).toBeVisible();
  await expect(f).toContainText("10月10日星期六 · 10:00 – 11:00");
  await expect(f.getByText("参与者 · 本季允许的团体")).toBeVisible();
  await expect(f.getByRole("button", { name: "取消" })).toBeVisible();
});

test("captures : l'écran des membres et la feuille « Réserver » (à regarder, planches scene-reserver-*)", async ({ page }) => {
  const franco = { ...resa("2026-10-10", "10:00", "11:00", "f"), quoi: "Séance louange", qui: ["Franco"], auteurUid: "uid-lea", auteurNom: "Léa M." };
  const chant = resa("2026-10-11", "17:00", "18:00", "c");
  const danse = { ...resa("2026-10-17", "11:00", "12:00", "d"), quoi: "Danse", qui: ["Jeunes"], auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, NOE, {
    "programmes/noel": OUVERT, "programmes/noel/creneaux/f": franco, "programmes/noel/creneaux/c": chant, "programmes/noel/creneaux/d": danse,
  });
  await expect(bloc(page, "Samedi 17 octobre").getByRole("button", { name: "Modifier" })).toBeVisible();
  await capture(page, "u1-membres");
  await bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 15:00 – 16:00" }).click();
  await feuille(page).getByRole("radio", { name: "Sketch" }).check();
  await feuille(page).getByRole("checkbox", { name: "Jeunes" }).check();
  await page.waitForTimeout(600); // fin de l'animation de la feuille
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/u1-membres-feuille-${test.info().project.name}.png` });
});

// ─── Relecture du lot (05/10/2026) ──────────────────────────────────────────

/** « Pâques 2027 », brouillon (créé après U1). */
const PAQUES = {
  nom: "Pâques 2027", jourJ: "2027-03-28", debut: "2026-10-05", visible: false, passages: [], ouvert: false,
  createdBy: "uid-alice", updatedAt: "2026-10-05T09:00:00Z",
};
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("passé : le programme suivant annoncé n'est jamais un brouillon (Q3)", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/paques": { ...PAQUES, debut: "2026-12-26" } }, "2026-12-26T10:00:00");
  await expect(page.getByText("Noël 2026, c'est passé — merci à tous !")).toBeVisible();
  await expect(page.getByText(/Prochain programme/)).toHaveCount(0);
  await expect(page.getByText(/Pâques/)).toHaveCount(0);
});

test("créer un programme pendant que le programme affiché a des réservations aux mêmes dates : l'aperçu du brouillon reste vide", async ({ page }) => {
  const sketch = { ...resa("2026-12-06", "15:00", "16:00", "s"), quoi: "Sketch", qui: ["Jeunes"] };
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": sketch }, "2026-12-06T10:00:00");
  await expect(bloc(page, "Dimanche 6 décembre").getByText("Sketch · Jeunes")).toBeVisible();
  // Désormais, les créneaux de Noël répondent en retard : une lecture périmée
  // arriverait après celle du brouillon et la remplacerait.
  await page.route(/documents\/programmes\/noel:runQuery/, async (route) => {
    await attendre(1000);
    await route.fallback().catch(() => undefined);
  });
  await page.getByRole("button", { name: "Nouveau programme" }).click();
  await page.getByLabel("Nom").fill("Pâques 2027");
  await page.getByLabel("Jour J").fill("2027-03-28");
  await page.getByRole("button", { name: "Créer le programme" }).click();
  await expect(page.getByRole("heading", { name: "Pâques 2027 · réservations" })).toBeVisible();
  await expect(apercu(page).getByRole("heading", { name: "Dimanche 6 décembre" })).toBeVisible();
  await page.waitForTimeout(1500); // la réponse en retard, s'il y en a une, est arrivée
  await expect(apercu(page).getByRole("listitem")).toHaveText([/14:00\s*Libre/, /15:00\s*Libre/, /16:00\s*Libre/, /17:00\s*Libre/, /18:00\s*Libre/]);
  await expect(page.getByRole("region", { name: /hors grille/ })).toHaveCount(0);
});

test("« Préparer la saison » d'un brouillon : même pendant le chargement, l'aperçu ne montre rien du programme affiché", async ({ page }) => {
  const sketch = { ...resa("2026-10-11", "15:00", "16:00", "s"), quoi: "Sketch", qui: ["Jeunes"] };
  const long = resa("2026-10-11", "17:00", "18:30", "l");
  await ouvrir(page, ALICE, {
    "programmes/noel": OUVERT, "programmes/noel/creneaux/s": sketch, "programmes/noel/creneaux/l": long, "programmes/paques": PAQUES,
  });
  await expect(bloc(page, "Dimanche 11 octobre").getByText("Sketch · Jeunes")).toBeVisible();
  await page.route(/documents\/programmes\/paques:runQuery/, async (route) => {
    await attendre(1000);
    await route.fallback().catch(() => undefined);
  });
  await page.getByRole("region", { name: "Programmes masqués" }).getByRole("button", { name: "Préparer la saison" }).click();
  await expect(page.getByRole("heading", { name: "Pâques 2027 · réservations" })).toBeVisible();
  // Relevé immédiat, sans nouvel essai : rien de Noël ne doit passer, même un instant.
  expect(await apercu(page).getByText("Sketch · Jeunes").count()).toBe(0);
  expect(await page.getByRole("region", { name: /hors grille/ }).count()).toBe(0);
  await expect(apercu(page).getByRole("heading", { name: "Dimanche 11 octobre" })).toBeVisible();
  await expect(apercu(page).getByRole("listitem")).toHaveCount(5);
});

test("la saison suit le programme : jour J reporté, la fermeture par défaut suit, et un clic sur la durée n'écrit que `duree`", async ({ page }) => {
  // Programme sans `fin` en base : fermeture au dernier dimanche avant le jour J.
  const sansFin = { ...NOEL, nom: "Noël 2026", plages: NOEL26.plages, duree: 60, quiAutorises: SAISON.quiAutorises, ouvert: false };
  const db = await ouvrir(page, ALICE, { "programmes/noel": sansFin });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await expect(carte(page).getByText("au dimanche 20 décembre", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Modifier le programme" }).click();
  await page.getByLabel("Jour J").fill("2026-12-31");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Jour J : jeudi 31 décembre", { exact: true })).toBeVisible();
  await expect(carte(page).getByText("au dimanche 27 décembre", { exact: true })).toBeVisible();
  await carte(page).getByRole("button", { name: "1 h 30", exact: true }).click();
  await expect.poll(() => patches(db).length).toBe(2);
  expect(Object.keys(patches(db)[1].data).sort()).toEqual(["duree", "updatedAt"]);
  expect(db.doc("programmes/noel")?.fin).toBeUndefined();
  await expect(carte(page).getByRole("alert")).toHaveCount(0);
});

test("deux coordinateurs : un réglage écrit par l'autre (la durée) s'affiche et n'est pas écrasé au réglage suivant", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await page.getByRole("button", { name: "Préparer la saison" }).click();
  await expect(carte(page).getByRole("button", { name: "1 h", exact: true, pressed: true })).toBeVisible();
  // L'autre coordinateur passe la durée à 1 h 30.
  db.set("programmes/noel", { ...NOEL26, duree: 90, updatedAt: "2026-10-05T10:01:00Z" });
  await carte(page).getByRole("button", { name: "Chorale" }).click();
  await expect.poll(() => patches(db).length).toBe(1);
  await expect(carte(page).getByRole("button", { name: "1 h 30", exact: true, pressed: true })).toBeVisible();
  await carte(page).getByRole("button", { name: "Tout membre connecté" }).click();
  await expect.poll(() => patches(db).length).toBe(2);
  expect(patches(db).map((p) => Object.keys(p.data).sort())).toEqual([["quiAutorises", "updatedAt"], ["quiAutorises", "updatedAt"]]);
  expect(db.doc("programmes/noel")?.duree).toBe(90);
});

test("hors grille : une réservation d'un jour passé n'est plus signalée ; celles à venir le restent", async ({ page }) => {
  const passee = { ...resa("2026-10-04", "17:00", "18:30", "p"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  const aVenir = { ...resa("2026-10-18", "17:00", "18:30", "v"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, ALICE, { "programmes/noel": NOEL, "programmes/noel/creneaux/p": passee, "programmes/noel/creneaux/v": aVenir }, "2026-10-15T10:00:00");
  await page.getByRole("button", { name: "Modifier la saison" }).click();
  await expect(apercu(page)).toBeVisible();
  const hors = page.getByRole("region", { name: "1 réservation hors grille" });
  await expect(hors).toContainText("Dimanche 18 octobre");
  await expect(hors).not.toContainText("Dimanche 4 octobre");
});

test("membres : un créneau qui commence pendant que la feuille est ouverte est refusé à la validation (horloge simulée)", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT }, "2026-10-11T14:50:00");
  await bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 15:00 – 16:00" }).click();
  const f = feuille(page);
  await f.getByRole("radio", { name: "Sketch" }).check();
  await f.getByRole("checkbox", { name: "Jeunes" }).check();
  await page.clock.setFixedTime(new Date("2026-10-11T15:05:00"));
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(f.getByRole("alert")).toHaveText("Ce créneau a déjà commencé : il ne se réserve plus.");
  expect(db.writes.filter((w) => w.method === "POST")).toHaveLength(0);
});

test("hors grille : « Déplacer » vers un créneau qui a commencé entre-temps est refusé (horloge simulée)", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "17:00", "18:30", "c1"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  const db = await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/c1": c1 }, "2026-10-11T14:50:00");
  await page.getByRole("button", { name: "Modifier la saison" }).click();
  await page.getByRole("region", { name: "1 réservation hors grille" }).getByRole("button", { name: "Déplacer" }).click();
  const f = feuille(page);
  await expect(f.getByLabel("Créneau", { exact: true })).toHaveValue("15:00-16:00");
  await page.clock.setFixedTime(new Date("2026-10-11T15:05:00"));
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(f.getByRole("alert")).toHaveText("Ce créneau a déjà commencé : il ne se réserve plus.");
  expect(db.writes.filter((w) => w.method === "PATCH" && w.path.includes("creneaux"))).toHaveLength(0);
});

test("hors grille : « Retirer » qui échoue le dit sous la liste", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "17:00", "18:30", "c1"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/c1": c1 });
  await page.route(/creneaux\/c1/, (route) => route.request().method() === "DELETE"
    ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "denied" } }) })
    : route.fallback());
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Modifier la saison" }).click();
  const hors = page.getByRole("region", { name: "1 réservation hors grille" });
  await hors.getByRole("button", { name: "Retirer" }).click();
  await expect(hors.getByRole("alert")).toHaveText("Enregistrement impossible. Vérifie ta connexion et réessaie.");
  await expect(hors).toContainText("17:00 – 18:30");
});

test("membres : la feuille range les groupes par famille, comme la planche (Groupes, EDD, Jeunes, Louange)", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 11:00" }).click();
  await expect(feuille(page).getByRole("group", { name: /^Qui/ }).locator("label")).toHaveText([
    "Gp Bonté", "Gp Fidélité", "Gp Paix", "Gp Amour", "Gp Joie", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
    "Jeunes", "Franco", "敬拜团",
  ]);
});
