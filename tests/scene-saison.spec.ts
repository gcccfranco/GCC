import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone, interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";
import { fermerFeuille, reglageSaison, resumeSaison, versToutesLesReservations } from "./helpers/saisonScene";
import { canReserverPour } from "../src/lib/access";
import {
  commence, creneauxLibres, erreursSaison, FAMILLES, famillesDe, horsGrille, joursReservables,
  lignesDuJour, quiDesFamilles, quiPermis, saisonDe,
} from "../src/lib/scene/saison";
import { reservationsClosed } from "../src/lib/scene/dimanches";
import { QUI } from "../src/types/programme";
import { creneauxEnReservations } from "./helpers/creneauxScene";

// Lot U1 (docs/spec-scene-saison.md) : la coordination définit la saison de
// réservation de la scène — dates, jours, plages, qui réserve — et les groupes
// la réservent. Réécrite au lot 5 de Salles, T5b (docs/spec-salles.md, AR22) : plus de grille de créneaux ni de
// durée ; chaque jour dit quand la scène est libre (plages moins l'emploi du temps fixe, Salles, évènements) et
// « Réserver » ouvre la feuille « de / à » pré-remplie. Un dimanche ordinaire : libre 14:30–15:00 et 17:00–19:00
// (groupe Joie 13:00–14:30, culte sinophone 15:00–17:00).

/** Un programme d'avant U1 : aucun champ de saison. */
const NOEL = {
  nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: false, passages: [],
  createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z",
};

/** La saison de la « Réussite » : du 01/10 au 20/12, samedi 10:00–12:00 et
 *  dimanche 14:00–19:00, Groupes et EDD (pas Louange : Culte Francophone n'y est pas permis). */
const SAISON = saisonDe({
  ...NOEL,
  fin: "2026-12-20",
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  quiAutorises: [...FAMILLES[0].qui, ...FAMILLES[1].qui],
  ouvert: false,
});

const resa = (dimanche: string, debut: string, fin: string, id = `${dimanche}-${debut}`) => ({
  id, dimanche, debut, fin, quoi: "Chant", qui: ["EDD 中班"], note: "",
  auteurUid: "uid-alice", auteurNom: "Alice Q.", createdAt: "", updatedAt: "",
});

// ─── S1 : la règle (fonctions pures) ────────────────────────────────────────

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

test("défauts d'un programme d'avant U1 : dimanche 14:00–19:00, tout membre, fermeture le 20/12, ouvert", () => {
  expect(saisonDe(NOEL)).toEqual({
    debut: "2026-10-01",
    fin: "2026-12-20",
    jours: [0],
    plages: [{ jour: 0, debut: "14:00", fin: "19:00" }],
    quiAutorises: [],
    ouvert: true,
  });
});

test("lignes : une réservation coupe la fenêtre libre ; dans une plage, elle n'est pas « hors des plages »", () => {
  const c = resa("2026-10-11", "17:00", "18:30");
  const lignes = lignesDuJour(SAISON, "2026-10-11", [c]);
  expect(lignes.map((l) => [l.type, l.debut, l.fin])).toEqual([
    ["libre", "14:00", "17:00"], ["reserve", "17:00", "18:30"], ["libre", "18:30", "19:00"],
  ]);
  expect(lignes[1]).toMatchObject({ horsGrille: false, creneau: c });
});

test("hors des plages : hors des jours, de la période ou des plages ; jamais une réservation dans une plage", () => {
  const dedans = resa("2026-10-11", "17:00", "18:30");
  const decale = resa("2026-10-11", "13:30", "15:30");
  const mardi = resa("2026-10-13", "15:00", "16:00");
  const apres = resa("2026-12-27", "15:00", "16:00");
  expect(horsGrille(SAISON, [dedans, decale, mardi, apres]).map((c) => c.id)).toEqual([decale.id, mardi.id, apres.id]);
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

test("familles : Groupes, EDD, Louange (lot « chants des fêtes », décision 34) ; chaque groupe d'une famille est dans le « Qui »", () => {
  expect(FAMILLES.map((f) => f.cle)).toEqual(["groupes", "edd", "louange"]);
  expect(FAMILLES[2].qui).toEqual(["Franco", "Intergroupe", "Interfranco"]);
  expect(QUI).not.toContain("Jeunes");
  expect(QUI).not.toContain("Chorale");
  expect(QUI).not.toContain("敬拜团");
  for (const f of FAMILLES) for (const q of f.qui) expect(QUI).toContain(q);
});

test("groupes proposés : tous sans limite, sinon ceux des familles permises, rangés par famille comme la planche", () => {
  const parFamille = [
    "Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
    "Franco", "Intergroupe", "Interfranco",
  ];
  expect(quiPermis({})).toEqual(parFamille);
  expect(quiPermis({ quiAutorises: [] })).toEqual(parFamille);
  expect([...quiPermis({})].sort()).toEqual([...QUI].sort());
  expect(quiPermis({ quiAutorises: SAISON.quiAutorises })).not.toContain("Franco");
  expect(quiPermis({ quiAutorises: ["Franco", "Gp Amour"] })).toEqual(["Gp Amour", "Franco"]);
});

// ─── S2 : droits, en double (access.ts et firestore.rules) ─────────────────

const MEMBRE = { uid: "uid-noe", email: "noe@example.com" };
const COORD = { uid: "uid-alice", email: "alice@example.com" };
const COORDINATION = { coordination: true };
const PERMIS = { ouvert: true, quiAutorises: SAISON.quiAutorises };

test("réserver pour : liste vide → tout membre connecté, pour n'importe quel groupe", () => {
  expect(canReserverPour(MEMBRE, null, { ouvert: true, quiAutorises: [] }, ["Franco"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, {}, ["Gp Joie"]), "programme d'avant U1").toBe(true);
  expect(canReserverPour(null, null, {}, ["Gp Joie"]), "rien sans compte").toBe(false);
});

test("réserver pour : un groupe d'une famille permise → oui ; « Franco » hors familles → non", () => {
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Gp Amour"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Gp Paix", "EDD 中班"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Franco"])).toBe(false);
  expect(canReserverPour(MEMBRE, null, PERMIS, ["Gp Amour", "Franco"])).toBe(false);
});

test("réserver pour : la coordination toujours, même un brouillon ; un membre jamais dans un brouillon", () => {
  expect(canReserverPour(COORD, COORDINATION, PERMIS, ["Franco"])).toBe(true);
  expect(canReserverPour(COORD, COORDINATION, { ...PERMIS, ouvert: false }, ["Franco"])).toBe(true);
  expect(canReserverPour(MEMBRE, null, { ouvert: false, quiAutorises: [] }, ["Gp Amour"])).toBe(false);
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
  // lot RS : un gestionnaire de planning réserve aussi (gereUnPlanning), comme canReserverPour
  expect(create).toContain("isCoordination() || gereUnPlanning() || reservable(id, request.resource.data.qui)");
  expect(update).toContain("reservable(id, request.resource.data.qui)");
  expect(del).toContain("resource.data.auteurUid == request.auth.uid");
  expect(del).not.toContain("reservable");
});

// ─── S3 : l'écran de la coordination ────────────────────────────────────────

const NOE: FakeProfile = { uid: "uid-noe", email: "noe@example.com", firstName: "Noé", lastName: "L." };
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", dansEquipes: ["evenementiel", "edd"], referentDe: ["evenementiel", "edd"], responsabilites: ["orga"] /* lot RS : la coordination vient du Comité Orga */, coordination: true }; // lot AO : la Coordination vient du référent EDD ; `coordination` ne sert plus qu'à `ouvrir` (choix de l'adresse)

/** « Noël 2026 » de la Réussite, en brouillon. */
const NOEL26 = {
  ...NOEL,
  nom: "Noël 2026",
  fin: "2026-12-20",
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }],
  quiAutorises: SAISON.quiAutorises,
  ouvert: false,
};

/** Lundi 5 octobre 2026 à 10:00, horloge posée avant la connexion. Lot U6, B3 (Q12) : la
 *  coordination gère au Back-Office, les membres réservent dans l'App. Pâques · Noël, P7 : au
 *  Back-Office, l'onglet de la fête (`/back-office/evenements/scene` mène à Noël) ouvre la saison.
 *  `chemin` force l'adresse (la coordination qui réserve dans l'App). */
async function ouvrir(page: Page, who: FakeProfile, docs: Record<string, Record<string, unknown>>, jour = "2026-10-05T10:00:00", chemin?: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(jour));
  // L'emploi du temps du planning (Google Sheets) est simulé vide : seul l'emploi du temps fixe de Salles reste.
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, who, creneauxEnReservations(docs), chemin ?? (who.coordination ? "/back-office/evenements/scene" : "/evenements/scene"));
}
/** L'onglet de la section Évènements, dans l'App. */
async function ongletApp(page: Page, nom: string) {
  await page.goto("/evenements");
  return page.getByRole("link", { name: nom, exact: true });
}

const patches = (db: FakeDb, path = "programmes/noel") => db.writes.filter((w) => w.method === "PATCH" && w.path === path);
/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300); // fin des transitions de couleur des pilules (150 ms)
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

/** La carte de la saison ; sur téléphone (P9), la feuille du réglage voulu (`reglageSaison`). */
const carte = (page: Page) => page.getByRole("region", { name: "Mettre en place la saison" });
const apercu = (page: Page) => page.getByRole("region", { name: "Aperçu des membres" });
const lancer = (page: Page) => page.getByRole("button", { name: "Lancer les réservations", exact: true });
/** Pâques · Noël, P8 : une saison lancée s'ouvre sur « Toutes les réservations » ; la saison par `?vue=saison`. */
const SAISON_NOEL = "/back-office/evenements/scene/noel?vue=saison";
/** P8 (Q20) : les réservations hors des plages sont dans « Toutes les réservations », filtre « Hors des plages ». */
async function horsGrilleDuTableau(page: Page, n: number) {
  await versToutesLesReservations(page);
  await page.getByRole("group", { name: "Filtrer les réservations" }).getByRole("button", { name: `Hors des plages ${n}` }).click();
  // Le tableau à partir de 640 px de conteneur, dessous la liste « par jour » (bo-evenements-1) : les lignes du rendu visible.
  return page.locator('[data-testid="reservations-tableau"] tbody tr, [data-testid="reservations-liste"] li').filter({ visible: true });
}

test("brouillon : un membre a l'onglet Noël (fixe, P4) mais ni fenêtre libre ni réservation", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": NOEL26 });
  await expect(page.getByText(/^Les réservations ouvriront le/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Noël 2026", exact: true })).toHaveCount(0);
});

test("brouillon : la coordination voit la saison et l'aperçu dans l'onglet Noël du Back-Office", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await expect(page.getByRole("heading", { name: "Saison de Noël 2026" })).toBeVisible();
  await expect(page.getByText("Jour J : jeudi 24 décembre", { exact: true })).toBeVisible();
  // Les dates en toutes lettres, comme la planche (le sélecteur natif reste dessous).
  let c = await reglageSaison(page, "Réservations");
  await expect(c.getByText("du jeudi 1er octobre", { exact: true })).toBeVisible();
  await expect(c.getByText("au dimanche 20 décembre", { exact: true })).toBeVisible();
  await expect(c.getByLabel("Ouverture des réservations")).toHaveValue("2026-10-01");
  c = await reglageSaison(page, "Jours et plages");
  await expect(c.getByRole("button", { name: "sam.", exact: true, pressed: true })).toBeVisible();
  await expect(c.getByRole("button", { name: "dim.", exact: true, pressed: true })).toBeVisible();
  await expect(c.getByRole("button", { name: "lun.", exact: true, pressed: false })).toBeVisible();
  await expect(c.getByRole("button", { name: "sam. 10:00 – 12:00" })).toBeVisible();
  await expect(c.getByRole("button", { name: "dim. 14:00 – 19:00" })).toBeVisible();
  c = await reglageSaison(page, "Qui peut réserver");
  await expect(c.getByRole("button", { name: "EDD", pressed: true })).toBeVisible();
  await expect(c.getByRole("button", { name: "Louange", pressed: false })).toBeVisible();
  await expect(c.getByRole("button", { name: "Tout membre connecté", pressed: false })).toBeVisible();
  // La règle du chevauchement est dans la carte entière (pas dans les feuilles du téléphone).
  if (!estTelephone(test.info())) await expect(carte(page)).toContainText("un chevauchement avec la Grande salle ou la Scène reste refusé. La coordination et les admins peuvent tout déplacer.");
  await fermerFeuille(page);
  // Pâques · Noël, P7 (Q19) : l'aperçu montre une semaine, son premier jour en lignes.
  await expect(apercu(page).getByText("Semaine du 10 au 11 octobre")).toBeVisible();
  await expect(apercu(page).getByRole("region", { name: "Samedi 10 octobre" }).getByRole("listitem")).toHaveText([/10:00\s*→ 12:00\s*Libre/]);
  await expect(apercu(page)).toContainText("Dimanche 11 octobre : de 14:00 à 19:00.");
  await apercu(page).getByRole("button", { name: "Semaine suivante" }).click();
  await expect(apercu(page).getByRole("region", { name: "Samedi 17 octobre" })).toBeVisible();
});

test("« Lancer les réservations » écrit `ouvert: true` en un seul PATCH, et l'onglet Noël de l'App montre les fenêtres libres", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await lancer(page).click();
  await expect(page.getByRole("button", { name: "Fermer les réservations", exact: true })).toBeVisible();
  expect(patches(db)).toHaveLength(1);
  expect(patches(db)[0].data).toMatchObject({ ouvert: true });
  expect(Object.keys(patches(db)[0].data).sort()).toEqual(["modifiePar", "ouvert", "updatedAt"]);
  await (await ongletApp(page, "Noël")).click();
  await expect(page.getByRole("heading", { name: "Noël 2026", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Réserver \d/ }).first()).toBeVisible();
});

test("une fois ouvert, un membre voit l'onglet, le samedi et le dimanche", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": { ...NOEL26, ouvert: true } });
  await expect(page.getByRole("link", { name: "Noël", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Samedi 10 octobre" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Dimanche 11 octobre" })).toBeVisible();
});

test("saison lancée : résumée dans la colonne de la fête ; cocher « sam. » ajoute une plage, le samedi entre dans l'aperçu", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL }, undefined, "/back-office/evenements/scene/noel");
  await expect(page.getByRole("button", { name: /^Saison/ })).toContainText("dim. 14–19 · tout membre");
  await page.getByRole("button", { name: /^Saison/ }).click();
  await expect(apercu(page).getByRole("region", { name: "Dimanche 11 octobre" })).toBeVisible();
  const c = await reglageSaison(page, "Jours et plages");
  await c.getByRole("button", { name: "sam.", exact: true }).click();
  await expect(c.getByRole("button", { name: "sam. 14:00 – 19:00" })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([
    { jour: 6, debut: "14:00", fin: "19:00" }, { jour: 0, debut: "14:00", fin: "19:00" },
  ]);
  await fermerFeuille(page);
  await expect(apercu(page).getByRole("region", { name: "Samedi 10 octobre" }).getByRole("listitem")).toHaveCount(1);
});

test("une fermeture le jour J ou après affiche l'erreur et n'écrit rien", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  const c = await reglageSaison(page, "Réservations");
  await c.getByLabel("Fermeture des réservations").fill("2026-12-24");
  await expect(c.getByText("La fermeture doit être avant le jour J.")).toBeVisible();
  // Sur téléphone, la feuille cache « Lancer » ; refermée, elle oublie le réglage refusé (P9).
  if (!estTelephone(test.info())) await expect(lancer(page)).toBeDisabled();
  expect(patches(db)).toHaveLength(0);
});

test("hors des plages : la réservation est signalée, elle reste en base, « Déplacer » la pose dans une plage", async ({ page }) => {
  const c1 = { ...resa("2026-10-10", "13:00", "14:00"), quoi: "Sketch", qui: ["Gp Amour"], auteurUid: "uid-noe", auteurNom: "Noé L." };
  const db = await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, ouvert: true }, "programmes/noel/creneaux/c1": c1 }, undefined, SAISON_NOEL);
  // P8 (Q20) : signalée dans « Toutes les réservations », filtre « Hors des plages ».
  const hors = await horsGrilleDuTableau(page, 1);
  await expect(hors).toHaveCount(1);
  await expect(hors).toContainText("Sketch");
  expect(db.doc("reservations/c1")).toMatchObject({ debut: "13:00", fin: "14:00" });
  await hors.getByRole("button", { name: "Déplacer" }).click();
  // AR22 : la même feuille « de / à » que partout, plus de pastilles ni de liste.
  const f = page.getByRole("dialog");
  await expect(f.getByRole("heading", { name: "Déplacer la réservation" })).toBeVisible();
  await f.getByLabel("Date").fill("2026-10-17");
  await f.getByLabel("de", { exact: true }).selectOption("10:00");
  await f.getByLabel("à", { exact: true }).selectOption("11:00");
  await f.getByRole("button", { name: "Déplacer", exact: true }).click();
  // La feuille ouverte cache le reste de la page aux lecteurs d'écran : on attend qu'elle se ferme.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Hors des plages 0" })).toBeVisible();
  expect(db.doc("reservations/c1")).toMatchObject({ date: "2026-10-17", debut: "10:00", fin: "11:00", quoi: "Sketch" });
});

test("l'ordre de passage s'ouvre depuis la colonne de la fête, modifiable par la coordination", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, passages: [{ quoi: "Chant", qui: ["Gp Joie"], titre: "Douce nuit" }] } });
  await page.getByRole("button", { name: /Ordre de passage du jour J/ }).click();
  await expect(page.getByRole("list", { name: "Ordre de Passage jour J" }).getByRole("listitem")).toContainText(["Douce nuit"]);
  await expect(page.getByRole("button", { name: "Ajouter un passage" })).toBeVisible();
});

test("dates : changer l'ouverture écrit `debut` seul, et la pastille se relit en toutes lettres", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  const c = await reglageSaison(page, "Réservations");
  await c.getByLabel("Ouverture des réservations").fill("2026-10-08");
  await expect(c.getByText("du jeudi 8 octobre", { exact: true })).toBeVisible();
  await expect.poll(() => patches(db).length).toBe(1);
  expect(Object.keys(patches(db)[0].data).sort()).toEqual(["debut", "modifiePar", "updatedAt"]);
  expect(patches(db)[0].data.debut).toBe("2026-10-08");
});

test("plages : la pastille s'ouvre pour changer la plage ; retirer la seule plage d'un jour coché n'écrit rien ; décocher le jour retire ses plages", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  const c = await reglageSaison(page, "Jours et plages");
  await c.getByRole("button", { name: "sam. 10:00 – 12:00" }).click();
  await c.getByLabel("Fin de la plage").fill("13:00");
  await c.getByRole("button", { name: "OK", exact: true }).click();
  await expect(c.getByRole("button", { name: "sam. 10:00 – 13:00" })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([
    { jour: 6, debut: "10:00", fin: "13:00" }, { jour: 0, debut: "14:00", fin: "19:00" },
  ]);
  const avant = patches(db).length;
  await c.getByRole("button", { name: "sam. 10:00 – 13:00" }).click();
  await c.getByRole("button", { name: "Retirer la plage" }).click();
  await expect(c.getByText("Chaque jour coché a au moins une plage.")).toBeVisible();
  expect(patches(db)).toHaveLength(avant);
  await c.getByRole("button", { name: "sam.", exact: true }).click();
  await expect(c.getByRole("button", { name: "sam.", exact: true, pressed: false })).toBeVisible();
  await expect(c.getByText("Chaque jour coché a au moins une plage.")).toHaveCount(0);
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([{ jour: 0, debut: "14:00", fin: "19:00" }]);
});

const UNE_PLAGE = { ...NOEL26, ouvert: true, plages: [{ jour: 0, debut: "14:00", fin: "19:00" }] };

test("téléphone : « Terminé » enregistre la plage en cours d'édition", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "la feuille et son bouton « Terminé » n'existent que sur téléphone");
  const db = await ouvrir(page, ALICE, { "programmes/noel": UNE_PLAGE }, "2026-11-03T10:00:00", SAISON_NOEL);
  const c = await reglageSaison(page, "Jours et plages");
  await c.getByRole("button", { name: "dim. 14:00 – 19:00" }).click();
  await c.getByLabel("Début de la plage").fill("17:00");
  await page.getByRole("dialog").getByRole("button", { name: "Terminé", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([{ jour: 0, debut: "17:00", fin: "19:00" }]);
  await expect(resumeSaison(page)).toContainText("dim. 17–19");
});

test("téléphone : « Terminé » avec une plage refusée garde la feuille ouverte et n'écrit rien", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "la feuille et son bouton « Terminé » n'existent que sur téléphone");
  const db = await ouvrir(page, ALICE, { "programmes/noel": UNE_PLAGE }, "2026-11-03T10:00:00", SAISON_NOEL);
  const c = await reglageSaison(page, "Jours et plages");
  await c.getByRole("button", { name: "dim. 14:00 – 19:00" }).click();
  await c.getByLabel("Fin de la plage").fill("13:00");
  await page.getByRole("dialog").getByRole("button", { name: "Terminé", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("La fin d'une plage doit être après son début.")).toBeVisible();
  expect(db.writes.filter((w) => JSON.stringify(w.data ?? w).includes("plages"))).toHaveLength(0);
});

test("téléphone : « + Plage » laissée intacte puis « Terminé » ferme la feuille sans rien écrire", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "la feuille et son bouton « Terminé » n'existent que sur téléphone");
  const db = await ouvrir(page, ALICE, { "programmes/noel": UNE_PLAGE }, "2026-11-03T10:00:00", SAISON_NOEL);
  const c = await reglageSaison(page, "Jours et plages");
  await c.getByRole("button", { name: "Ajouter une plage" }).click();
  await expect(c.getByLabel("Début de la plage")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Terminé", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(db.writes.filter((w) => JSON.stringify(w.data ?? w).includes("plages"))).toHaveLength(0);
  await expect(resumeSaison(page)).toContainText("dim. 14–19");
});

test("plages : « + Plage » ajoute une seconde plage au dimanche, rangée par heure", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  const c = await reglageSaison(page, "Jours et plages");
  await c.getByRole("button", { name: "Ajouter une plage" }).click();
  await c.getByLabel("Jour de la plage").selectOption({ label: "dim." });
  await c.getByLabel("Début de la plage").fill("10:00");
  await c.getByLabel("Fin de la plage").fill("12:00");
  await c.getByRole("button", { name: "OK", exact: true }).click();
  await expect(c.getByRole("button", { name: /^(sam|dim)\. / })).toHaveText([
    "sam. 10:00 – 12:00", "dim. 10:00 – 12:00", "dim. 14:00 – 19:00",
  ]);
  await expect.poll(() => patches(db).at(-1)?.data.plages).toEqual([
    { jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" },
  ]);
});

test("qui peut réserver : « Tout membre connecté » vide la liste ; une famille cochée écrit ses groupes ; l'un exclut l'autre", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  const c = await reglageSaison(page, "Qui peut réserver");
  await c.getByRole("button", { name: "Tout membre connecté" }).click();
  await expect(c.getByRole("button", { name: "Tout membre connecté", pressed: true })).toBeVisible();
  await expect(c.getByRole("button", { name: "Groupes", pressed: false })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.quiAutorises).toEqual([]);
  await c.getByRole("button", { name: "Louange" }).click();
  await expect(c.getByRole("button", { name: "Tout membre connecté", pressed: false })).toBeVisible();
  await expect.poll(() => patches(db).at(-1)?.data.quiAutorises).toEqual(["Franco", "Intergroupe", "Interfranco"]);
});

test("hors des plages : « Retirer » supprime la réservation après la confirmation du site", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "12:00", "13:00"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  const db = await ouvrir(page, ALICE, { "programmes/noel": { ...NOEL26, ouvert: true }, "programmes/noel/creneaux/c1": c1 });
  // P8 : dans la semaine, « ⋯ » sur toute réservation (le tableau propose « Déplacer » seul).
  // Sur une colonne (P9), « Cette semaine » la montre d'emblée.
  if (estGrandEcran(test.info())) await page.getByRole("list", { name: "Semaines" }).getByRole("button", { name: /^10 – 11 oct\./ }).click();
  const ligne = bloc(page, "Dimanche 11 octobre").getByRole("listitem").filter({ hasText: "Hors des plages" });
  await expect(ligne).toContainText("12:00");
  await ligne.getByRole("button", { name: /^Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Retirer" }).click();
  await repondreDansLeSite(page, "Retirer");
  await expect(bloc(page, "Dimanche 11 octobre").getByText("Hors des plages")).toHaveCount(0);
  expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("reservations/c1");
});

test("中文 : la saison est traduite, dates comprises", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await expect(page.getByRole("heading", { name: "圣诞节 2026 预约季" })).toBeVisible();
  const carteZh = page.getByRole("region", { name: "设置预约季" });
  // Sur téléphone (P9), chaque réglage s'ouvre dans sa feuille depuis le résumé.
  const feuilleZh = async (titre: RegExp) => {
    if (!estTelephone(test.info())) return;
    await fermerFeuille(page);
    await page.getByRole("list", { name: "预约季设置" }).getByRole("button", { name: titre }).click();
  };
  await feuilleZh(/^预约时间/);
  await expect(carteZh.getByText("从 10月1日星期四", { exact: true })).toBeVisible();
  await feuilleZh(/^日子和时间段/);
  await expect(carteZh.getByRole("button", { name: "周六 10:00 – 12:00" })).toBeVisible();
  await fermerFeuille(page);
  await expect(page.getByRole("button", { name: "启动预约", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "成员看到的预览" }).getByRole("heading", { name: "10月10日星期六" })).toBeVisible();
});

test("captures : la saison, brouillon avec deux réservations (une hors des plages), puis lancée (à regarder)", async ({ page }) => {
  const sketch = { ...resa("2026-10-10", "10:00", "11:00"), quoi: "Sketch", qui: ["Gp Amour"] };
  const chant = resa("2026-10-11", "12:00", "13:00");
  await ouvrir(page, ALICE, {
    "programmes/noel": NOEL26, "programmes/noel/creneaux/a": sketch, "programmes/noel/creneaux/b": chant,
  });
  await expect(apercu(page).getByText("Sketch · Gp Amour")).toBeVisible();
  await capture(page, "u1-saison-brouillon");
  await lancer(page).click();
  await expect(page.getByRole("button", { name: "Fermer les réservations", exact: true })).toBeVisible();
  await fermerFeuille(page);
  // Sur une colonne (P9), la saison s'est ouverte en page : retour à la fête.
  if (!estGrandEcran(test.info())) await page.getByRole("link", { name: "Noël 2026", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Toutes les réservations/ })).toContainText("1 hors des plages");
  await capture(page, "u1-saison-lancee-hors-grille");
});

test("places libres : les fenêtres à venir moins ce qui est pris ou commencé ; la réservation qu'on déplace ne se bloque pas elle-même", () => {
  const s = { ...SAISON, fin: "2026-10-11" };
  const c = resa("2026-10-11", "17:00", "18:00", "c");
  const horloge = { today: "2026-10-10", maintenant: "10:20" };
  const libres = creneauxLibres(s, NOEL.jourJ, [c], horloge);
  // samedi : 10:00–12:00 moins ce qui est passé (10:30) ; dimanche : 14:00–19:00 moins la réservation, durée d'une heure
  expect(libres.map((l) => `${l.jour} ${l.debut}-${l.fin}`)).toEqual([
    "2026-10-10 10:30-11:30", "2026-10-11 14:00-15:00", "2026-10-11 18:00-19:00",
  ]);
  const pourC = creneauxLibres(s, NOEL.jourJ, [c], { sauf: "c", ...horloge });
  expect(pourC.map((l) => `${l.jour} ${l.debut}`)).toContain("2026-10-11 17:00");
  expect(commence("2026-10-10", "10:00", "2026-10-10", "10:00")).toBe(true);
  expect(commence("2026-10-10", "11:00", "2026-10-10", "10:30")).toBe(false);
  expect(commence("2026-10-09", "18:00", "2026-10-10", "08:00")).toBe(true);
});

test("familles d'une liste « qui » : celles dont tous les groupes sont permis ; et l'inverse", () => {
  expect(famillesDe(SAISON.quiAutorises)).toEqual(["groupes", "edd"]);
  expect(famillesDe([])).toEqual([]);
  expect(quiDesFamilles(["edd", "louange"])).toEqual(["Franco", "Intergroupe", "Interfranco", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班"]);
});

// ─── S4 : l'écran des membres ───────────────────────────────────────────────
// Planches scene-reserver-telephone et scene-reserver-feuille-telephone (v17).

/** « Noël 2026 » ouvert : la saison de la Réussite, telle que les membres la voient. */
const OUVERT = { ...NOEL26, ouvert: true };
const LEA: FakeProfile = { uid: "uid-lea", email: "lea@example.com", firstName: "Léa", lastName: "M." };
/** Réservation de Noé, dimanche 11 octobre à 17:00 (parcours « Réussite »). */
const SKETCH = { ...resa("2026-10-11", "17:00", "18:00", "s"), quoi: "Sketch", qui: ["Gp Amour"], auteurUid: "uid-noe", auteurNom: "Noé L." };

const bloc = (page: Page, jour: string) => page.getByRole("region", { name: jour, exact: true });
/** Pâques · Noël, P5 : une semaine à la fois ; on choisit la semaine dans la liste (ou les pastilles). */
const choisirSemaine = (page: Page, debut: RegExp) => page.getByRole("list", { name: "Semaines" }).getByRole("button", { name: debut }).click();
const feuille = (page: Page) => page.getByRole("dialog");

test("membres : un bloc par jour de la semaine choisie, en toutes lettres, la scène libre dite et « Réserver » sur chaque fenêtre ; les semaines passées derrière un lien", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await expect(page.getByText("Jour J : jeudi 24 décembre · réservations jusqu'au dimanche 20 décembre", { exact: true })).toBeVisible();
  await expect(bloc(page, "Samedi 10 octobre").getByRole("listitem")).toHaveText([/10:00\s*→ 12:00\s*Libre\s*Réserver/]);
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await expect(dimanche.getByTestId("libre-du-jour")).toHaveText("Libre 14:30 – 15:00 · 17:00 – 19:00");
  await expect(dimanche.locator('[data-ligne="libre"]')).toHaveCount(2);
  await expect(dimanche.locator('[data-ligne="occupe"]')).toHaveCount(2);
  await expect(dimanche.getByRole("button", { name: "Réserver 14:30 – 15:00" })).toBeVisible();
  await expect(dimanche.getByRole("button", { name: "Réserver 17:00 – 19:00" })).toBeVisible();
  await expect(bloc(page, "Dimanche 20 décembre")).toHaveCount(0);
  await choisirSemaine(page, /^19 – 20 déc\./);
  await expect(bloc(page, "Dimanche 20 décembre")).toBeVisible();
  // Samedi 3 et dimanche 4 octobre sont passés (on est le lundi 5).
  await expect(bloc(page, "Samedi 3 octobre")).toHaveCount(0);
  await page.getByRole("button", { name: "Semaines passées (1)" }).click();
  await choisirSemaine(page, /^3 – 4 oct\./);
  await expect(bloc(page, "Samedi 3 octobre")).toBeVisible();
  await expect(bloc(page, "Samedi 3 octobre").getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

test("membres : « Réserver » ouvre la feuille « de / à » sur la fenêtre touchée ; 17:00 « Sketch · Gp Amour » s'écrit 17:00–18:00 à son nom", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = feuille(page);
  await expect(f.getByRole("heading", { name: "Réserver" })).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-11");
  await expect(f.getByLabel("de", { exact: true })).toHaveValue("17:00");
  await expect(f.getByLabel("à", { exact: true })).toHaveValue("19:00");
  await f.getByLabel("à", { exact: true }).selectOption("18:00");
  await f.getByRole("radio", { name: "Sketch" }).check();
  await f.getByRole("checkbox", { name: "Gp Amour" }).check();
  await f.getByLabel("Note").fill("Avec la sono");
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(feuille(page)).toHaveCount(0);
  const ligne = bloc(page, "Dimanche 11 octobre").getByRole("listitem").filter({ hasText: "Sketch · Gp Amour" });
  await expect(ligne).toContainText("17:00");
  // P6 : sur sa propre réservation, « à moi » remplace son nom.
  await expect(ligne).toContainText("à moi");
  await expect(ligne).toContainText("Avec la sono");
  await expect(bloc(page, "Dimanche 11 octobre").getByTestId("libre-du-jour")).toHaveText("Libre 14:30 – 15:00 · 18:00 – 19:00");
  const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("reservations/"));
  expect(cree?.data).toMatchObject({
    salle: "scene", date: "2026-10-11", debut: "17:00", fin: "18:00", quoi: "Sketch", qui: ["Gp Amour"], note: "Avec la sono",
    auteurUid: "uid-noe", auteurNom: "Noé L.",
  });
});

test("membres : la feuille ne propose que les groupes permis (pas « Franco ») ; rien de coché, rien ne s'écrit", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 12:00" }).click();
  const f = feuille(page);
  await expect(f.getByText("Qui · les groupes permis pour cette saison")).toBeVisible();
  await expect(f.getByRole("checkbox")).toHaveCount(9);
  await expect(f.getByRole("checkbox", { name: "Franco" })).toHaveCount(0);
  // Pâques · Noël, P6 (Q15) : rien de coché d'avance, le bouton attend quoi et qui.
  await expect(f.getByRole("radio", { checked: true })).toHaveCount(0);
  await f.getByRole("radio", { name: "Séance louange" }).check();
  await expect(f.getByRole("button", { name: "Choisis quoi et qui" })).toBeDisabled();
  // Seules les écritures du programme comptent : `:commit` est l'envoi quotidien du comptage d'usage (docs/spec-comptage-usage.md).
  expect(db.writes.filter((w) => w.method === "POST" && /^(programmes|reservations)\//.test(w.path))).toHaveLength(0);
});

test("membres : sans limite, la feuille propose tous les groupes ; la coordination n'est jamais limitée", async ({ page }) => {
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT }, undefined, "/evenements/scene");
  await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 12:00" }).click();
  await expect(feuille(page).getByRole("checkbox", { name: "Culte Francophone", exact: true })).toBeVisible();
  await expect(feuille(page).getByText("Qui", { exact: true })).toBeVisible();
});

test("membres : la réservation d'un autre montre son auteur, sans bouton ; l'emploi du temps fixe est en gris, sans action", async ({ page }) => {
  await ouvrir(page, LEA, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH });
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await expect(dimanche.locator('[data-ligne="reserve"]')).toHaveText(/^17:00\s*→ 18:00\s*Sketch · Gp Amour\s*Noé L\.$/);
  await expect(dimanche.getByTestId("libre-du-jour")).toHaveText("Libre 14:30 – 15:00 · 18:00 – 19:00");
  await expect(dimanche.locator('[data-ligne="occupe"]').filter({ hasText: "Groupe Joie" })).toContainText("13:00");
  await expect(dimanche.getByRole("button")).toHaveCount(2);
  await expect(dimanche.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(dimanche.getByRole("button", { name: "Retirer" })).toHaveCount(0);
  await expect(dimanche.getByText("Pris", { exact: true })).toHaveCount(0);
  await expect(dimanche.getByText("Hors des plages")).toHaveCount(0);
});

test("membres : le temps passé aujourd'hui ne se réserve plus : la fenêtre commence au quart d'heure suivant", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT }, "2026-10-11T17:20:00");
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await expect(dimanche.getByTestId("libre-du-jour")).toHaveText("Libre 17:30 – 19:00");
  await expect(dimanche.getByRole("button", { name: /^Réserver/ })).toHaveCount(1);
  await expect(dimanche.getByRole("button", { name: "Réserver 14:30 – 15:00" })).toHaveCount(0);
  await expect(dimanche.getByRole("button", { name: "Réserver 17:30 – 19:00" })).toBeVisible();
});

test("membres : « ⋯ » › Déplacer rouvre la feuille « de / à » sur sa réservation ; elle va où on la pose", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH });
  const ligne = bloc(page, "Dimanche 11 octobre").getByRole("listitem").filter({ hasText: "Sketch · Gp Amour" });
  await ligne.getByRole("button", { name: /^Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Déplacer" }).click();
  const f = feuille(page);
  await expect(f.getByRole("heading", { name: "Déplacer la réservation" })).toBeVisible();
  await expect(f.getByLabel("Date")).toHaveValue("2026-10-11");
  await expect(f.getByLabel("de", { exact: true })).toHaveValue("17:00");
  await expect(f.getByLabel("à", { exact: true })).toHaveValue("18:00");
  await f.getByLabel("Date").fill("2026-10-17");
  await f.getByLabel("de", { exact: true }).selectOption("11:00");
  await f.getByLabel("à", { exact: true }).selectOption("12:00");
  await f.getByRole("button", { name: "Déplacer", exact: true }).click();
  await expect(feuille(page)).toHaveCount(0);
  await expect(bloc(page, "Dimanche 11 octobre").getByText("Sketch · Gp Amour")).toHaveCount(0);
  await choisirSemaine(page, /^17 – 18 oct\./);
  await expect(bloc(page, "Samedi 17 octobre").getByRole("listitem").filter({ hasText: "Sketch · Gp Amour" })).toContainText("11:00");
  expect(db.doc("reservations/s")).toMatchObject({ date: "2026-10-17", debut: "11:00", fin: "12:00", quoi: "Sketch", qui: ["Gp Amour"] });
});

test("membres : « ⋯ » › Retirer sa réservation après la confirmation du site rend la fenêtre libre", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH });
  const dimanche = bloc(page, "Dimanche 11 octobre");
  await dimanche.getByRole("listitem").filter({ hasText: "Sketch · Gp Amour" }).getByRole("button", { name: /^Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Retirer" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(dimanche.getByRole("button", { name: "Réserver 17:00 – 19:00" })).toBeVisible();
  expect(db.writes.find((w) => w.method === "DELETE")?.path).toBe("reservations/s");
});

test("membres : la coordination modifie ou retire toute réservation et voit celles hors des plages", async ({ page }) => {
  const hors = { ...resa("2026-10-11", "12:00", "13:00", "l"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH, "programmes/noel/creneaux/l": hors }, undefined, "/evenements/scene");
  const dimanche = bloc(page, "Dimanche 11 octobre");
  const sketch = dimanche.getByRole("listitem").filter({ hasText: "Sketch · Gp Amour" });
  await sketch.getByRole("button", { name: /^Plus d'actions/ }).click();
  await expect(page.getByRole("menuitem")).toHaveText([/^Déplacer/, /^Modifier/, /^Retirer/]);
  await page.keyboard.press("Escape");
  await expect(dimanche.getByRole("listitem").filter({ hasText: "Chant · EDD 中班" })).toContainText("Hors des plages");
});

test("membres : après la fermeture de la saison, le volet Entraînements disparaît (horloge simulée)", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": { ...OUVERT, fin: "2026-11-29" } }, "2026-11-30T10:00:00");
  await expect(page.getByRole("heading", { name: "Ordre de Passage jour J" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entraînements" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Réserver/ })).toHaveCount(0);
});

test("membres : la veille de la fermeture, le dernier jour se réserve encore", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": { ...OUVERT, fin: "2026-11-29" } }, "2026-11-29T10:00:00");
  await expect(bloc(page, "Dimanche 29 novembre").getByRole("button", { name: "Réserver 14:30 – 15:00" })).toBeVisible();
  await expect(page.getByText("Jour J : jeudi 24 décembre · réservations jusqu'au dimanche 29 novembre", { exact: true })).toBeVisible();
});

test("membres en 中文 : jours, lignes et feuille traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, NOE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": SKETCH });
  await expect(page.getByRole("button", { name: "过去的周（1）" })).toBeVisible();
  await expect(page.getByText(/预约截至12月20日/)).toBeVisible();
  const samedi = page.getByRole("region", { name: "10月10日星期六" });
  await expect(samedi.getByRole("listitem")).toHaveText([/10:00\s*→ 12:00\s*空闲\s*预约/]);
  await expect(page.getByRole("region", { name: "10月11日星期日" }).getByRole("button", { name: /^更多操作/ })).toBeVisible();
  await samedi.getByRole("button", { name: "预约 10:00 – 12:00" }).click();
  const f = feuille(page);
  await expect(f.getByRole("heading", { name: "预约" })).toBeVisible();
  await expect(f.getByLabel("日期")).toHaveValue("2026-10-10");
  await expect(f.getByLabel("从", { exact: true })).toHaveValue("10:00");
  await expect(f.getByLabel("到", { exact: true })).toHaveValue("12:00");
  await expect(f.getByText("参与者 · 本季允许的团体")).toBeVisible();
  await expect(f.getByRole("button", { name: "取消" })).toBeVisible();
});

test("captures : l'écran des membres et la feuille « Réserver » (à regarder, planches scene-reserver-*)", async ({ page }) => {
  const franco = { ...resa("2026-10-10", "10:00", "11:00", "f"), quoi: "Séance louange", qui: ["Franco"], auteurUid: "uid-lea", auteurNom: "Léa M." };
  const chant = resa("2026-10-11", "17:00", "18:00", "c");
  const danse = { ...resa("2026-10-17", "11:00", "12:00", "d"), quoi: "Danse", qui: ["Gp Amour"], auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, NOE, {
    "programmes/noel": OUVERT, "programmes/noel/creneaux/f": franco, "programmes/noel/creneaux/c": chant, "programmes/noel/creneaux/d": danse,
  });
  await expect(bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 18:00 – 19:00" })).toBeVisible();
  await capture(page, "u1-membres");
  await bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 18:00 – 19:00" }).click();
  await feuille(page).getByRole("radio", { name: "Sketch" }).check();
  await feuille(page).getByRole("checkbox", { name: "Gp Amour" }).check();
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
  // Pâques · Noël (P4) : l'onglet « Pâques » reste dans le rail ; le brouillon ne s'annonce pas ici.
  await expect(page.getByText(/Pâques 2027/)).toHaveCount(0);
});

test("passer de Noël à Pâques au Back-Office pendant que les créneaux de Noël répondent en retard : l'aperçu de Pâques reste vide", async ({ page }) => {
  const sketch = { ...resa("2026-12-06", "17:00", "18:00", "s"), quoi: "Sketch", qui: ["Gp Amour"] };
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/s": sketch }, "2026-12-05T10:00:00", SAISON_NOEL);
  await expect(apercu(page).getByText("Semaine du 5 au 6 décembre")).toBeVisible();
  // Désormais, les créneaux de Noël répondent en retard : une lecture périmée
  // arriverait après celle de Pâques et la remplacerait.
  await page.route(/documents\/programmes\/noel:runQuery/, async (route) => {
    await attendre(1000);
    await route.fallback().catch(() => undefined);
  });
  await page.getByRole("link", { name: "Pâques", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saison de Pâques 2027" })).toBeVisible();
  await page.waitForTimeout(1500); // la réponse en retard, s'il y en a une, est arrivée
  await expect(apercu(page).getByText("Sketch · Gp Amour")).toHaveCount(0);
  await expect(page.getByRole("region", { name: /hors des plages/ })).toHaveCount(0);
});

test("Pâques en brouillon : même pendant le chargement, l'aperçu ne montre rien de Noël", async ({ page }) => {
  const sketch = { ...resa("2026-10-11", "17:00", "18:00", "s"), quoi: "Sketch", qui: ["Gp Amour"] };
  const long = resa("2026-10-11", "12:00", "13:00", "l");
  await ouvrir(page, ALICE, {
    "programmes/noel": OUVERT, "programmes/noel/creneaux/s": sketch, "programmes/noel/creneaux/l": long, "programmes/paques": { ...PAQUES, debut: "2027-02-01" },
  }, undefined, SAISON_NOEL);
  await expect(apercu(page).getByText("Semaine du 10 au 11 octobre")).toBeVisible();
  await page.route(/documents\/programmes\/paques:runQuery/, async (route) => {
    await attendre(1000);
    await route.fallback().catch(() => undefined);
  });
  await page.getByRole("link", { name: "Pâques", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saison de Pâques 2027" })).toBeVisible();
  // Relevé immédiat, sans nouvel essai : rien de Noël ne doit passer, même un instant.
  expect(await apercu(page).getByText("Sketch · Gp Amour").count()).toBe(0);
  expect(await page.getByRole("region", { name: /hors des plages/ }).count()).toBe(0);
  await expect(apercu(page).getByRole("region", { name: "Dimanche 7 février" }).getByRole("listitem")).toHaveCount(1);
});

test("la saison suit le jour J : reporté, la fermeture par défaut suit, et un clic sur « Louange » n'écrit que `quiAutorises`", async ({ page }) => {
  // Programme sans `fin` en base : fermeture au dernier dimanche avant le jour J.
  const sansFin = { ...NOEL, nom: "Noël 2026", plages: NOEL26.plages, quiAutorises: SAISON.quiAutorises, ouvert: false };
  const db = await ouvrir(page, ALICE, { "programmes/noel": sansFin });
  await expect((await reglageSaison(page, "Réservations")).getByText("au dimanche 20 décembre", { exact: true })).toBeVisible();
  // Pâques · Noël, P7 (Q19) : le jour J se règle dans la carte de la saison.
  await (await reglageSaison(page, "Jour J")).getByLabel("Choisir le jour J").fill("2026-12-31");
  await expect.poll(() => patches(db).length).toBe(1);
  await fermerFeuille(page);
  await expect(page.getByText("Jour J : jeudi 31 décembre", { exact: true })).toBeVisible();
  await expect((await reglageSaison(page, "Réservations")).getByText("au dimanche 27 décembre", { exact: true })).toBeVisible();
  const c = await reglageSaison(page, "Qui peut réserver");
  await c.getByRole("button", { name: "Louange" }).click();
  await expect.poll(() => patches(db).length).toBe(2);
  expect(Object.keys(patches(db)[1].data).sort()).toEqual(["modifiePar", "quiAutorises", "updatedAt"]);
  expect(db.doc("programmes/noel")?.fin).toBeUndefined();
  await expect(c.getByRole("alert")).toHaveCount(0);
});

test("deux coordinateurs : un réglage écrit par l'autre (la fermeture) s'affiche et n'est pas écrasé au réglage suivant", async ({ page }) => {
  const db = await ouvrir(page, ALICE, { "programmes/noel": NOEL26 });
  await expect((await reglageSaison(page, "Réservations")).getByText("au dimanche 20 décembre", { exact: true })).toBeVisible();
  // L'autre coordinateur avance la fermeture au 13 décembre.
  db.set("programmes/noel", { ...NOEL26, fin: "2026-12-13", updatedAt: "2026-10-05T10:01:00Z" });
  await (await reglageSaison(page, "Qui peut réserver")).getByRole("button", { name: "Louange" }).click();
  await expect.poll(() => patches(db).length).toBe(1);
  await expect((await reglageSaison(page, "Réservations")).getByText("au dimanche 13 décembre", { exact: true })).toBeVisible();
  await (await reglageSaison(page, "Qui peut réserver")).getByRole("button", { name: "Tout membre connecté" }).click();
  await expect.poll(() => patches(db).length).toBe(2);
  expect(patches(db).map((p) => Object.keys(p.data).sort())).toEqual([["modifiePar", "quiAutorises", "updatedAt"], ["modifiePar", "quiAutorises", "updatedAt"]]);
  expect(db.doc("programmes/noel")?.fin).toBe("2026-12-13");
});

test("hors des plages : une réservation d'un jour passé n'est plus signalée ; celles à venir le restent", async ({ page }) => {
  const passee = { ...resa("2026-10-04", "12:00", "13:00", "p"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  const aVenir = { ...resa("2026-10-18", "12:00", "13:00", "v"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, ALICE, { "programmes/noel": NOEL, "programmes/noel/creneaux/p": passee, "programmes/noel/creneaux/v": aVenir }, "2026-10-15T10:00:00");
  const hors = await horsGrilleDuTableau(page, 1);
  await expect(hors).toHaveCount(1);
  // Le jour est dans la première cellule du tableau, ou dans le titre du groupe de la liste.
  await expect(page.getByText("dim. 18 oct.", { exact: true }).filter({ visible: true })).toHaveCount(1);
});

test("membres : un moment qui commence pendant que la feuille est ouverte est refusé à la validation (horloge simulée)", async ({ page }) => {
  const db = await ouvrir(page, NOE, { "programmes/noel": OUVERT }, "2026-10-11T16:50:00");
  await bloc(page, "Dimanche 11 octobre").getByRole("button", { name: "Réserver 17:00 – 19:00" }).click();
  const f = feuille(page);
  await f.getByRole("radio", { name: "Sketch" }).check();
  await f.getByRole("checkbox", { name: "Gp Amour" }).check();
  await page.clock.setFixedTime(new Date("2026-10-11T17:05:00"));
  await f.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(f.getByRole("alert")).toHaveText("Ce moment a déjà commencé : il ne se réserve plus.");
  // Seules les écritures du programme comptent : `:commit` est l'envoi quotidien du comptage d'usage (docs/spec-comptage-usage.md).
  expect(db.writes.filter((w) => w.method === "POST" && /^(programmes|reservations)\//.test(w.path))).toHaveLength(0);
});

test("hors des plages : « Déplacer » vers un moment qui a commencé entre-temps est refusé (horloge simulée)", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "19:30", "20:30", "c1"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  const db = await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/c1": c1 }, "2026-10-11T16:50:00");
  await (await horsGrilleDuTableau(page, 1)).getByRole("button", { name: "Déplacer" }).click();
  const f = feuille(page);
  await f.getByLabel("de", { exact: true }).selectOption("17:00");
  await f.getByLabel("à", { exact: true }).selectOption("18:00");
  await page.clock.setFixedTime(new Date("2026-10-11T17:05:00"));
  await f.getByRole("button", { name: "Déplacer", exact: true }).click();
  await expect(f.getByRole("alert")).toHaveText("Ce moment a déjà commencé : il ne se réserve plus.");
  expect(db.writes.filter((w) => w.method === "PATCH" && w.path.startsWith("reservations/"))).toHaveLength(0);
});

test("« Retirer » qui échoue le dit au-dessus du tableau de toutes les réservations", async ({ page }) => {
  const c1 = { ...resa("2026-10-11", "15:00", "16:00", "c1"), auteurUid: "uid-noe", auteurNom: "Noé L." };
  await ouvrir(page, ALICE, { "programmes/noel": OUVERT, "programmes/noel/creneaux/c1": c1 });
  await page.route(/reservations\/c1/, (route) => route.request().method() === "DELETE"
    ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "denied" } }) })
    : route.fallback());
  await versToutesLesReservations(page);
  const toutes = page.getByRole("region", { name: "Toutes les réservations" });
  await toutes.getByRole("button", { name: /^Plus d'actions/ }).click();
  await page.getByRole("menuitem", { name: "Retirer" }).click();
  await repondreDansLeSite(page, "Retirer");
  await expect(toutes.getByRole("alert")).toHaveText("Enregistrement impossible. Vérifie ta connexion et réessaie.");
  await expect(toutes.locator('[data-testid="reservations-tableau"], [data-testid="reservations-liste"]').filter({ visible: true })).toContainText("15:00 – 16:00");
});

test("membres : la feuille range les groupes permis par famille, comme la planche (Groupes, EDD)", async ({ page }) => {
  await ouvrir(page, NOE, { "programmes/noel": OUVERT });
  await bloc(page, "Samedi 10 octobre").getByRole("button", { name: "Réserver 10:00 – 12:00" }).click();
  await expect(feuille(page).getByRole("group", { name: /^Qui/ }).locator("label")).toHaveText([
    "Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "EDD 小班", "EDD 中班", "EDD 大班", "EDD 高班",
  ]);
});
