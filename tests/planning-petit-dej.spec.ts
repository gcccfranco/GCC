import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { abonneAuxNotifications, fsDoc, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { parsePetitDej } from "../src/lib/planning/sheets";
import { findMyServices, type PlanningData } from "../src/lib/planning/names";
import { reminderBody, reminderServicesFor, type ReminderService } from "../src/lib/push/reminderMessage";
import {
  ajouterPetitDejAuxRappels, estLibre, grillePourReprise, lirePetitDej, oublierPetitDej, planifierReprise, rangeesPetitDej,
} from "../src/lib/petitdej/lignes";
import { servicesPetitDejDuCompte } from "../src/lib/petitdej/services";
import { canEditPetitDej, canGererPetitDej } from "../src/lib/access";
import { GRILLE_TABLE } from "../src/lib/planning/grilles";
import { documentDimanche, nomsNonRattaches } from "../src/lib/planning/import";
import { serviceButtonFill } from "../src/lib/serviceButton";
import { PLANNING_COLORS } from "../src/lib/serviceColors";
import type { LignePetitDej } from "../src/types/petitDej";
import { estMercredi, lignesMercredi, petitDejTitre, prochainDimanche } from "../src/lib/petitdej/rappel";
import { avecLignes } from "../src/lib/evenements/rappel";
import { DEFAULT_NOTIF_PREFS, NOTIF_TYPE_LABELS, NOTIF_TYPES } from "../src/types/user";

// Lot 1b (docs/spec-planning-petits-lots.md) : le petit déj se lisait dans le
// bloc « PETIT DÉJEUNER » de l'onglet Franco_Table_PtD (colonnes 17 DATE / 18 NOM
// pour janvier → juin, 19 / 20 pour juillet → décembre). Ce dimanche, Mes
// services, rappels ; pas d'onglet.
//
// Lot U3 (docs/spec-petit-dej.md), tranche PD1 : interrupteur ouvert, les
// inscriptions (`petitDej/{id}`, une ligne par document) sont la SEULE source
// (T8) ; le Sheet ne parle plus. Les écrans du lot 1b, Sheet compris, se
// vérifient désormais dans back-office-coupe.spec.ts (interrupteur coupé).
// Tranche PD2 : la carte « Petit déj » en tête de Planning › Table (s'inscrire,
// réécrire, retirer ; les écrivains du planning Table posent pour d'autres) et
// la colonne Petit déj de la grille en lecture seule (Q12).
// Tranche PD3 : une ligne posée par « Je m'inscris » compte pour son inscrit
// (Q9) dans « Ton prochain service », « Mes services » (même sans nom de
// planning) et les rappels J-7 / J-3 / J-1, sans doublon.
// Tranche PD4 : le mercredi, si le dimanche qui vient est libre, une ligne de
// plus dans le rappel du matin (T5, Q5) ; préférence « Petit déj », active par
// défaut, dans Mon profil › Notifications, liste « Recevoir » traduite (question 7).
// Le cron lui-même se relit, il ne s'exécute pas ici (comme le reste du cron).
// Tranche PD5 : la reprise (T11, Q13), un bouton de l'administration qui appelle
// POST /api/admin/reprendre-petit-dej (admins seulement). La route écrit avec
// firebase-admin : simulée ici, comme l'import G4 (planning-import.spec.ts) ;
// seul son refus sans jeton s'exécute. Coupée : 404 (back-office-coupe.spec.ts).

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Même forme que la vraie feuille : la Prépa. Table à gauche (index 1 à 5),
// les colonnes de personnes disponibles au milieu, le petit déj à droite.
const col = (cells: Record<number, string>) =>
  Array.from({ length: 21 }, (_, i) => cells[i] ?? "");

const TABLE_PTD = csv([
  col({ 1: "PRÉPARATION TABLE", 17: "PETIT DÉJEUNER 2026 DATE", 18: "NOM", 19: "DATE", 20: "DATE" }),
  col({ 1: "13/09", 2: "Daniel F.", 3: "Lucas W.", 17: "15/03", 18: "Julien & Stéphane", 19: "13/09", 20: "" }),
  col({ 1: "20/09", 2: "Ruth K.", 3: "Charlie B.", 17: "22/03", 18: "Alice Q.", 19: "20/09", 20: "Charlie B. & Isabelle L." }),
]);

const CHARLIE: FakeProfile = { uid: "uid-charlie", email: "charlie@example.com", planningName: "Charlie B." };

/** Une ligne du petit déj telle que Firestore la garde (`petitDej/{id}`). */
const ligne = (l: Partial<LignePetitDej> & Pick<LignePetitDej, "id" | "dimanche" | "nom">): LignePetitDej => ({
  uid: "", auteurUid: "uid-ecrivain", creeLe: "2026-09-01T10:00:00.000Z", modifieLe: "2026-09-01T10:00:00.000Z", ...l,
});

/** Les documents simulés `petitDej/{id}` à partir de lignes. */
const docsPetitDej = (lignes: LignePetitDej[]) =>
  Object.fromEntries(lignes.map(({ id, ...data }) => [`petitDej/${id}`, data]));

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

async function open(page: Page, dimanche: string, to: string, docs: Record<string, Record<string, unknown>> = {}, qui: FakeProfile = CHARLIE) {
  const vendredi = new Date(`${dimanche}T10:00:00`);
  vendredi.setDate(vendredi.getDate() - 2);
  await page.clock.setFixedTime(vendredi);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: sheet === "Franco_Table_PtD" ? TABLE_PTD : "",
    });
  });
  return signInAs(page, qui, docs, to);
}

// ─── Lecture de la feuille (lot 1b, interrupteur coupé) ──────────────────────

test("les deux blocs de dates sont lus, et « A & B » fait deux noms", () => {
  const rows = [
    col({ 17: "PETIT DÉJEUNER 2026 DATE", 18: "NOM", 19: "DATE", 20: "DATE" }),
    col({ 17: "04/01", 18: "Stéphane", 19: "05/07", 20: "" }),
    col({ 17: "11/01", 18: "", 19: "12/07", 20: "Alice Q. & Xinyao W." }),
    col({ 17: "25/01", 18: "Charlie B. & Isabelle L.", 19: "26/07", 20: "" }),
  ];
  expect(parsePetitDej(rows), "en-tête et cases vides ignorés, noms séparés par des virgules").toEqual([
    ["2026-01-04", "Stéphane"],
    ["2026-07-12", "Alice Q., Xinyao W."],
    ["2026-01-25", "Charlie B., Isabelle L."],
  ]);
});

// ─── Services et rappels ─────────────────────────────────────────────────────

const vide: PlanningData = {
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], fideliteMusic: [],
  bonte: [], edd: {}, campus: [], intergroupe: [], interfranco: [],
};

const planning: PlanningData = {
  ...vide,
  culte: [["2026-09-20", "Paul W.", "", "", "Ruth K.", "Éloïse M.", "", "", "", "Hewei", "", ""]],
  petitDej: [["2026-09-20", "Charlie B., Isabelle L."]],
};

test("le petit déj est un service de la personne, sans rôle à afficher", () => {
  expect(findMyServices(planning, "Charlie B.")).toEqual([
    { date: "2026-09-20", service: "Petit déj", role: "Équipe", leader: "" },
  ]);
  expect(findMyServices(planning, "Isabelle L."), "le second nom de la case compte aussi").toHaveLength(1);
  expect(reminderServicesFor(planning, "Charlie B.", "2026-09-20")).toEqual([
    { service: "Petit déj", roles: [] },
  ]);
});

test("le rappel nomme le petit déj, en français et en 中文", () => {
  const charlie = reminderServicesFor(planning, "Charlie B.", "2026-09-20");
  expect(reminderBody("2026-09-20", "J1", charlie, "fr")).toBe("Dimanche 20 septembre (demain) : Petit déj");
  expect(reminderBody("2026-09-20", "J1", charlie, "zh-CN")).toBe("9月20日星期日（明天）：早餐");
  const ruth = reminderServicesFor(planning, "Ruth K.", "2026-09-20");
  expect(reminderBody("2026-09-20", "J3", ruth, "fr"), "un seul message, le petit déj à la suite des autres services").toBe(
    "Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano)",
  );
});

// ─── U3 · PD1 : les lignes (pur) ─────────────────────────────────────────────

test("rangeesPetitDej : les textes d'un dimanche joints par « , » dans l'ordre d'inscription, un dimanche sans ligne absent", () => {
  const lignes = [
    ligne({ id: "c", dimanche: "2026-10-11", nom: "Les jeunes du Campus", creeLe: "2026-09-03T08:00:00.000Z" }),
    ligne({ id: "a", dimanche: "2026-10-04", nom: "Famille Martin", creeLe: "2026-09-02T08:00:00.000Z" }),
    ligne({ id: "b", dimanche: "2026-10-11", nom: "Inès L.", creeLe: "2026-09-01T08:00:00.000Z" }),
  ];
  expect(rangeesPetitDej(lignes)).toEqual([
    ["2026-10-04", "Famille Martin"],
    ["2026-10-11", "Inès L., Les jeunes du Campus"],
  ]);
  expect(rangeesPetitDej([])).toEqual([]);
});

test("estLibre : un dimanche sans ligne est libre, une ligne suffit à le prendre", () => {
  const lignes = [ligne({ id: "a", dimanche: "2026-10-04", nom: "Famille Martin" })];
  expect(estLibre(lignes, "2026-10-11")).toBe(true);
  expect(estLibre(lignes, "2026-10-04")).toBe(false);
});

// ─── U3 · PD1 : les droits (miroir de firestore.rules) ──────────────────────

const MEMBRE = { uid: "uid-membre", email: "membre@example.com" };
const AUTRE = { uid: "uid-autre", email: "autre@example.com" };
const ECRIVAIN = { uid: "uid-ecrivain", email: "ecrivain@example.com" };
const ADMIN = { uid: "uid-admin", email: "tc328829@gmail.com" };
const DIMANCHE_EN_COURS = "2026-09-20";

test("canGererPetitDej : les écrivains du planning Table et les admins, personne d'autre", () => {
  expect(canGererPetitDej(MEMBRE, { plannings: [] })).toBe(false);
  expect(canGererPetitDej(MEMBRE, { plannings: ["culte"] }), "écrire un autre planning ne suffit pas").toBe(false);
  expect(canGererPetitDej(ECRIVAIN, { plannings: ["table"] })).toBe(true);
  expect(canGererPetitDej(ADMIN, null)).toBe(true);
  expect(canGererPetitDej(null, { plannings: ["table"] })).toBe(false);
});

test("canEditPetitDej : l'inscrit sur sa ligne à venir, les écrivains Table et les admins ; personne un dimanche passé", () => {
  const sienne = { uid: MEMBRE.uid, dimanche: "2026-09-27" };
  const posee = { uid: "", dimanche: "2026-09-27" };
  expect(canEditPetitDej(MEMBRE, { plannings: [] }, sienne, DIMANCHE_EN_COURS), "l'inscrit, sur sa ligne").toBe(true);
  expect(canEditPetitDej(AUTRE, { plannings: [] }, sienne, DIMANCHE_EN_COURS), "un autre membre").toBe(false);
  expect(canEditPetitDej(MEMBRE, { plannings: [] }, posee, DIMANCHE_EN_COURS), "une ligne posée pour quelqu'un").toBe(false);
  expect(canEditPetitDej(ECRIVAIN, { plannings: ["table"] }, sienne, DIMANCHE_EN_COURS), "écrivain Table").toBe(true);
  expect(canEditPetitDej(ADMIN, null, posee, DIMANCHE_EN_COURS), "admin").toBe(true);
  expect(canEditPetitDej(null, null, sienne, DIMANCHE_EN_COURS), "sans compte").toBe(false);
  expect(canEditPetitDej(MEMBRE, { plannings: [] }, { ...sienne, dimanche: DIMANCHE_EN_COURS }, DIMANCHE_EN_COURS), "le dimanche même reste ouvert").toBe(true);

  const passee = { uid: MEMBRE.uid, dimanche: "2026-09-13" };
  expect(canEditPetitDej(MEMBRE, { plannings: [] }, passee, DIMANCHE_EN_COURS), "passé : pas l'inscrit").toBe(false);
  expect(canEditPetitDej(ECRIVAIN, { plannings: ["table"] }, passee, DIMANCHE_EN_COURS), "passé : pas l'écrivain").toBe(false);
  expect(canEditPetitDej(ADMIN, null, passee, DIMANCHE_EN_COURS), "passé : pas l'admin").toBe(false);
});

test("firestore.rules porte la règle petitDej/{id}, en double avec access.ts", () => {
  const rules = readFileSync("firestore.rules", "utf8");
  const debut = rules.indexOf("match /petitDej/{id}");
  expect(debut, "le bloc existe, après peutEcrirePlanning").toBeGreaterThan(rules.indexOf("function peutEcrirePlanning"));
  const bloc = rules.slice(debut, rules.indexOf("\n    }", debut));
  const partie = (de: string, a?: string) => bloc.slice(bloc.indexOf(de), a ? bloc.indexOf(a) : undefined);
  expect(partie("allow read", "allow create")).toContain("if true");
  const create = partie("allow create", "allow update");
  expect(create).toContain("request.resource.data.auteurUid == request.auth.uid");
  expect(create).toContain("request.resource.data.uid == request.auth.uid");
  expect(create).toContain("request.resource.data.uid == '' && peutEcrirePlanning('table')");
  const update = partie("allow update", "allow delete");
  for (const fige of ["dimanche", "uid", "auteurUid"]) {
    expect(update, `${fige} figé`).toContain(`request.resource.data.${fige} == resource.data.${fige}`);
  }
  expect(update).toContain("resource.data.uid == request.auth.uid || peutEcrirePlanning('table')");
  expect(partie("allow delete")).toContain("resource.data.uid == request.auth.uid || peutEcrirePlanning('table')");
});

// ─── U3 · PD1 : rattachement par le compte (Q9) ─────────────────────────────

test("servicesPetitDejDuCompte : « Famille Martin » reste un service de son inscrit, sans doublon", () => {
  const lignes = [
    ligne({ id: "a", dimanche: "2026-10-11", nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "b", dimanche: "2026-10-04", nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "c", dimanche: "2026-10-04", nom: "Charlie et ses amis", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "d", dimanche: "2026-10-18", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre" }),
    ligne({ id: "e", dimanche: "2026-10-25", nom: "Famille Martin" }),
  ];
  expect(servicesPetitDejDuCompte(lignes, CHARLIE.uid, ""), "même sans nom de planning ; deux lignes le même dimanche = un service").toEqual([
    { date: "2026-10-04", service: "Petit déj", role: "Équipe", leader: "" },
    { date: "2026-10-11", service: "Petit déj", role: "Équipe", leader: "" },
  ]);
  expect(servicesPetitDejDuCompte(lignes, "", ""), "une ligne posée par un écrivain ne se rattache que par son texte").toEqual([]);

  const portantSonNom = [ligne({ id: "f", dimanche: "2026-11-01", nom: "Charlie B., Isabelle L.", uid: CHARLIE.uid })];
  expect(
    servicesPetitDejDuCompte(portantSonNom, CHARLIE.uid, "Charlie B."),
    "le texte porte déjà son nom de planning : findMyServices le trouve, pas de doublon",
  ).toEqual([]);
});

// ─── U3 · PD1 : la reprise (Q13), planifiée ─────────────────────────────────

test("planifierReprise : une ligne par case à venir remplie, dimanches déjà pris ignorés, relancer n'écrit rien", () => {
  // [date, équipe, petit déj] : la grille Table telle qu'elle s'affichait avant U3.
  const grille = [
    ["2026-09-13", "Daniel F.", "Julien, Stéphane"],
    ["2026-09-20", "Ruth K.", "Charlie, Isabelle"],
    ["2026-09-27", "Lydie", ""],
    ["2026-10-04", "Wendy", "  "],
    ["2026-10-11", "Olivier", "Alice Q."],
    ["2026-10-18", "Samuel", "Famille Martin"],
  ];
  const lignes = [ligne({ id: "a", dimanche: "2026-10-18", nom: "Les jeunes du Campus", uid: "uid-autre" })];
  const plan = planifierReprise(grille, lignes, DIMANCHE_EN_COURS);
  expect(plan.aEcrire, "le passé, une case vide ou blanche : rien ; le dimanche même compte ; le texte tel quel").toEqual([
    { dimanche: "2026-09-20", nom: "Charlie, Isabelle" },
    { dimanche: "2026-10-11", nom: "Alice Q." },
  ]);
  expect(plan.ignores, "le 18/10 a déjà une ligne").toBe(1);

  const apres = [...lignes, ...plan.aEcrire.map((l, i) => ligne({ id: `r${i}`, ...l }))];
  expect(planifierReprise(grille, apres, DIMANCHE_EN_COURS)).toEqual({ aEcrire: [], ignores: 3 });
});

test("grillePourReprise : un document de l'app sans petit déj ne masque pas le nom du Sheet ; Sheet illisible, rien", () => {
  // Grille de l'app [date, équipe, petit déj] : depuis PD2, un dimanche créé par
  // une case « équipe » ou par l'import G4 n'a plus de petit déj.
  const app = [
    ["2026-09-27", "Lydie", ""],
    ["2026-10-04", "Wendy", "Alice Q."],
    ["2026-10-11", "Olivier", "  "],
  ];
  const sheet = [
    ["2026-09-27", "Ruth K.", "Famille Martin"],
    ["2026-10-04", "Wendy", "Julien & Stéphane"],
    ["2026-10-11", "", "Isabelle L."],
    ["2026-10-18", "Samuel", "Charlie B."],
  ];
  expect(grillePourReprise(app, sheet), "l'équipe de l'app, le petit déj de l'app s'il en a un, sinon celui du Sheet").toEqual([
    ["2026-09-27", "Lydie", "Famille Martin"],
    ["2026-10-04", "Wendy", "Alice Q."],
    ["2026-10-11", "Olivier", "Isabelle L."],
    ["2026-10-18", "Samuel", "Charlie B."],
  ]);
  expect(
    planifierReprise(grillePourReprise(app, sheet)!, [], DIMANCHE_EN_COURS).aEcrire.map((l) => l.nom),
    "le nom du Sheet est repris, pas perdu en silence",
  ).toEqual(["Famille Martin", "Alice Q.", "Isabelle L.", "Charlie B."]);

  expect(grillePourReprise(app, []), "Sheet illisible (lecture vide) : la route refuse au lieu de dire « 0 repris »").toBeNull();
  expect(grillePourReprise([], [])).toBeNull();
});

test("lignes.ts n'importe pas names.ts : pas de cycle sheets → lignes → names → sheets", () => {
  const source = readFileSync("src/lib/petitdej/lignes.ts", "utf8");
  expect(source).not.toMatch(/from "@\/lib\/planning\/names"/);
  expect(readFileSync("src/lib/planning/names.ts", "utf8"), "le cycle passait par ici").toMatch(/from "\.\/sheets"/);
});

// ─── U3 · PD1 : la lecture REST publique (Q10) ──────────────────────────────

test("lirePetitDej : la collection en REST public, sans jeton, triée, gardée cinq minutes", async () => {
  const appels: { url: string; init?: RequestInit }[] = [];
  const avant = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    appels.push({ url: String(url), init });
    return new Response(JSON.stringify([
      { document: fsDoc("petitDej/b", { dimanche: "2026-10-04", nom: "Les jeunes du Campus", uid: "", auteurUid: "uid-ecrivain", creeLe: "2026-09-03T08:00:00.000Z", modifieLe: "2026-09-03T08:00:00.000Z" }) },
      { document: fsDoc("petitDej/a", { dimanche: "2026-10-04", nom: "Famille Martin", uid: "uid-charlie", auteurUid: "uid-charlie", creeLe: "2026-09-02T08:00:00.000Z", modifieLe: "2026-09-02T08:00:00.000Z" }) },
      { readTime: "2026-09-18T10:00:00Z" },
    ]), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    oublierPetitDej();
    const lignes = await lirePetitDej();
    expect(lignes).toEqual([
      { id: "a", dimanche: "2026-10-04", nom: "Famille Martin", uid: "uid-charlie", auteurUid: "uid-charlie", creeLe: "2026-09-02T08:00:00.000Z", modifieLe: "2026-09-02T08:00:00.000Z" },
      { id: "b", dimanche: "2026-10-04", nom: "Les jeunes du Campus", uid: "", auteurUid: "uid-ecrivain", creeLe: "2026-09-03T08:00:00.000Z", modifieLe: "2026-09-03T08:00:00.000Z" },
    ]);
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toMatch(/\/documents:runQuery$/);
    expect(JSON.stringify(appels[0].init?.body)).toContain("petitDej");
    expect(JSON.stringify(appels[0].init?.headers ?? {}), "lecture publique : aucun jeton").not.toContain("Authorization");

    await lirePetitDej();
    expect(appels, "le cache sert la seconde lecture").toHaveLength(1);
    oublierPetitDej();
    await lirePetitDej();
    expect(appels, "oublié après une écriture : relu").toHaveLength(2);
  } finally {
    globalThis.fetch = avant;
    oublierPetitDej();
  }
});

test("lirePetitDej : une lecture en échec est une erreur, pas « personne »", async () => {
  const avant = globalThis.fetch;
  globalThis.fetch = (async () => new Response("{}", { status: 503 })) as typeof fetch;
  try {
    oublierPetitDej();
    await expect(lirePetitDej()).rejects.toThrow();
  } finally {
    globalThis.fetch = avant;
    oublierPetitDej();
  }
});

// ─── U3 · PD1 : écrans, les lignes seule source (interrupteur ouvert) ──────

test("Ce dimanche : la ligne Petit déj vient des inscriptions, plus du Sheet", async ({ page }) => {
  await open(page, "2026-09-20", "/planning", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-20", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]));
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Petit déj", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Famille Martin")).toBeVisible();
  await expect(dimanche.getByText("Charlie B., Isabelle L."), "le nom du Sheet n'apparaît plus").toHaveCount(0);
  await capture(page, "ce-dimanche-petit-dej-lignes");
});

test("Ce dimanche : sans inscription, pas de ligne Petit déj, même si le Sheet en porte une", async ({ page }) => {
  await open(page, "2026-09-20", "/planning");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Ruth K.", { exact: false }), "la Prépa. Table reste").toBeVisible();
  await expect(dimanche.getByText("Petit déj", { exact: true })).toHaveCount(0);
  await expect(dimanche.getByText("Charlie B., Isabelle L.")).toHaveCount(0);
});

test("Ce dimanche : inscriptions illisibles, ni ligne Petit déj ni retour au Sheet (T8, Q10)", async ({ page }) => {
  await open(page, "2026-09-20", "/planning");
  await page.route(/firestore\.googleapis\.com.*:runQuery/, (route) =>
    (route.request().postData() ?? "").includes('"petitDej"')
      ? route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
      : route.fallback(),
  );
  await page.reload();
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Ruth K.", { exact: false }), "la Prépa. Table reste").toBeVisible();
  await expect(dimanche.getByText("Petit déj", { exact: true })).toHaveCount(0);
  await expect(dimanche.getByText("Charlie B., Isabelle L."), "pas de secours par le Sheet").toHaveCount(0);
});

test("Mes services : une ligne à son nom de planning est un service, le Sheet ne compte plus", async ({ page }) => {
  await open(page, "2026-09-20", "/mes-services", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Charlie B." }),
  ]));
  const petitDej = page.getByRole("listitem").filter({ hasText: "Petit déj" });
  await expect(petitDej).toHaveCount(1);
  await expect(petitDej, "le 27/09 des inscriptions, pas le 20/09 du Sheet").toContainText("27");
  await expect(petitDej).not.toContainText("20 sept");
  await capture(page, "mes-services-petit-dej-lignes");
});

test("en 中文 : libellé traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, "2026-09-20", "/planning", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-20", nom: "Famille Martin" }),
  ]));
  const dimanche = page.getByRole("region", { name: /本主日/ });
  await expect(dimanche.getByText("早餐", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Famille Martin")).toBeVisible();
});

// ─── U3 · PD2 : la grille, colonne Petit déj en lecture seule (Q12, pur) ────

test("la colonne Petit déj de la grille Table est en lecture seule : ni importée ni comptée parmi les noms sans compte", () => {
  const petitDej = GRILLE_TABLE.colonnes.find((c) => c.cle === "petitDej")!;
  expect(petitDej.lectureSeule).toBe(true);
  expect(GRILLE_TABLE.colonnes.find((c) => c.cle === "equipe")!.lectureSeule, "l'équipe reste une case").toBeFalsy();

  const row = ["2026-10-04", "Wendy", "Famille Martin"];
  const doc = documentDimanche(GRILLE_TABLE, row, "Admin T.", "2026-10-01T10:00:00.000Z");
  expect(doc).toMatchObject({ date: "2026-10-04", equipe: "Wendy" });
  expect(doc, "les inscriptions ne s'écrivent pas dans la grille").not.toHaveProperty("petitDej");
  expect(nomsNonRattaches([row], GRILLE_TABLE, []), "un texte d'inscription n'est pas un nom de planning").toEqual(["Wendy"]);
});

test("« Je m'inscris » à la couleur de la Table : libellé blanc lisible (AA, 4,5), serviceColors.ts intact", () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const x = parseInt(hex.slice(i, i + 2), 16) / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const surBlanc = (hex: string) => 1.05 / (lum(hex) + 0.05);
  expect(PLANNING_COLORS.table, "la couleur gelée ne bouge pas").toBe("#c87941");
  expect(surBlanc(PLANNING_COLORS.table), "la couleur gelée seule ne passe pas").toBeLessThan(4.5);
  expect(surBlanc(serviceButtonFill(PLANNING_COLORS.table))).toBeGreaterThanOrEqual(4.5);
  expect(serviceButtonFill("#a87b0f"), "l'Intergroupe ne change pas").toBe("#966d0d");
});

// ─── U3 · PD2 : la carte « Petit déj » de Planning › Table ──────────────────

/** A le droit d'écrire le planning Table : pose et retire des lignes pour d'autres (T10). */
const ECRIVAIN_TABLE: FakeProfile = {
  uid: "uid-ecrivain", email: "ecrivain@example.com", firstName: "Noa", lastName: "Test", planningName: "Noa T.",
  plannings: ["table"],
};

/** Ouvre Planning › Table le vendredi 18/09/2026 : dimanche en cours = 20/09, trimestre T3. */
async function ouvrirTable(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Table_PtD" ? TABLE_PTD : "" });
  });
  return signInAs(page, qui, docs, "/planning/table");
}

const carteDe = (page: Page, titre = "Petit déj") => page.getByRole("region", { name: titre });
const rangee = (carte: Locator, dimanche: string) => carte.locator(`[data-dimanche="${dimanche}"]`);
const ecrituresPetitDej = (writes: { method: string; path: string; data: Record<string, unknown> }[], method: string) =>
  writes.filter((w) => w.method === method && w.path.startsWith("petitDej/"));

/** Contraste du libellé sur le fond d'un bouton, calculé dans le navigateur. */
const contraste = (bouton: Locator) =>
  bouton.evaluate((el) => {
    const s = getComputedStyle(el);
    const lum = (css: string) => {
      const [r, g, b] = (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map((v) => {
        const x = Number(v) / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [a, b] = [lum(s.color), lum(s.backgroundColor)].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  });

test("carte : un dimanche à venir sans ligne dit « Libre » ; « Je m'inscris » pose une ligne à mon nom, rattachée à mon compte", async ({ page }) => {
  const db = await ouvrirTable(page, CHARLIE);
  const carte = carteDe(page);
  await expect(carte.getByRole("heading", { name: "Petit déj" })).toBeVisible();
  await expect(carte.getByText("Trimestre 3")).toBeVisible();
  await expect(carte.getByText("Tu peux écrire « Famille … » à la place de ton nom.")).toBeVisible();

  const le27 = rangee(carte, "2026-09-27");
  await expect(le27).toContainText("27 sept.");
  await expect(le27.getByText("Libre", { exact: true })).toBeVisible();
  const inscrire = le27.getByRole("button", { name: "Je m'inscris" });
  expect(await contraste(inscrire), "libellé blanc sur le fond foncé de la Table").toBeGreaterThanOrEqual(4.5);
  await capture(page, "petit-dej-carte-membre");

  await inscrire.click();
  await expect(le27.getByText("Charlie B.", { exact: true })).toBeVisible();
  await expect(le27.getByText("Libre", { exact: true })).toHaveCount(0);
  const posees = ecrituresPetitDej(db.writes, "POST");
  expect(posees).toHaveLength(1);
  expect(posees[0].data).toMatchObject({ dimanche: "2026-09-27", nom: "Charlie B.", uid: CHARLIE.uid, auteurUid: CHARLIE.uid });
  await expect(le27.getByRole("button", { name: "Modifier" })).toBeVisible();
  await expect(le27.getByRole("button", { name: "Retirer" })).toBeVisible();
  // Lot U6, B2 : la grille de la Table n'est plus dans l'App (Back-Office seulement).
});

test("carte : ✎ réécrit ma ligne « Famille Martin » (tient au rechargement) ; Échap annule, un texte vide est refusé", async ({ page }) => {
  const db = await ouvrirTable(page, CHARLIE, docsPetitDej([
    ligne({ id: "m", dimanche: "2026-09-27", nom: "Charlie B.", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
  ]));
  const le27 = rangee(carteDe(page), "2026-09-27");
  const champ = le27.getByRole("textbox", { name: "Modifier" });

  await le27.getByRole("button", { name: "Modifier" }).click();
  await champ.fill("Autre chose");
  await champ.press("Escape");
  await expect(le27.getByText("Charlie B.", { exact: true })).toBeVisible();

  await le27.getByRole("button", { name: "Modifier" }).click();
  await champ.fill("   ");
  await champ.press("Enter");
  await expect(le27.getByText("Charlie B.", { exact: true })).toBeVisible();
  expect(ecrituresPetitDej(db.writes, "PATCH"), "rien d'écrit : Échap, puis vide").toHaveLength(0);

  await le27.getByRole("button", { name: "Modifier" }).click();
  await champ.fill("Famille Martin");
  await champ.press("Enter");
  await expect(le27.getByText("Famille Martin", { exact: true })).toBeVisible();
  expect(db.doc("petitDej/m")).toMatchObject({ nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid, dimanche: "2026-09-27" });

  await page.reload();
  await expect(rangee(carteDe(page), "2026-09-27").getByText("Famille Martin", { exact: true })).toBeVisible();
});

test("carte : « Retirer » demande confirmation et rend le dimanche « Libre »", async ({ page }) => {
  const db = await ouvrirTable(page, CHARLIE, docsPetitDej([
    ligne({ id: "m", dimanche: "2026-09-27", nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
  ]));
  const le27 = rangee(carteDe(page), "2026-09-27");
  let question = "";
  page.once("dialog", (d) => { question = d.message(); void d.accept(); });
  await le27.getByRole("button", { name: "Retirer" }).click();
  await expect(le27.getByText("Libre", { exact: true })).toBeVisible();
  await expect(le27.getByRole("button", { name: "Je m'inscris" })).toBeVisible();
  expect(question).toBe("Retirer cette ligne ?");
  expect(db.doc("petitDej/m"), "le document est supprimé").toBeUndefined();
});

test("carte : aucun bouton sur la ligne d'un autre ni un dimanche passé, pas de ＋ pour un membre, le Sheet ne parle pas", async ({ page }) => {
  await ouvrirTable(page, CHARLIE, docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre" }),
    ligne({ id: "p", dimanche: "2026-09-13", nom: "Charlie B.", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
  ]));
  const carte = carteDe(page);
  const le27 = rangee(carte, "2026-09-27");
  await expect(le27.getByText("Famille Martin", { exact: true })).toBeVisible();
  await expect(le27.getByRole("button"), "la ligne d'un autre : le texte seul").toHaveCount(0);

  const le13 = rangee(carte, "2026-09-13");
  await expect(le13.getByText("Charlie B.", { exact: true })).toBeVisible();
  await expect(le13.getByRole("button"), "un dimanche passé, même ma ligne : aucun bouton").toHaveCount(0);
  const le6 = rangee(carte, "2026-09-06");
  await expect(le6).toContainText("6 sept.");
  await expect(le6.getByText("Libre", { exact: true }), "un dimanche passé sans ligne n'est pas « Libre »").toHaveCount(0);
  await expect(le6.getByRole("button")).toHaveCount(0);

  const le20 = rangee(carte, "2026-09-20");
  await expect(le20.getByText("Libre", { exact: true }), "le dimanche même reste ouvert ; le Sheet le portait").toBeVisible();
  await expect(le20.getByRole("button", { name: "Je m'inscris" })).toBeVisible();
  await expect(carte.getByText("Isabelle L.", { exact: false }), "un nom du Sheet n'apparaît nulle part").toHaveCount(0);
  await expect(carte.getByRole("button", { name: "Ajouter une ligne" })).toHaveCount(0);
});

test("carte : une ligne arrivée entre-temps — le message, et rien n'est écrit", async ({ page }) => {
  const db = await ouvrirTable(page, CHARLIE);
  const le27 = rangee(carteDe(page), "2026-09-27");
  await expect(le27.getByRole("button", { name: "Je m'inscris" })).toBeVisible();
  db.set("petitDej/x", {
    dimanche: "2026-09-27", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre",
    creeLe: "2026-09-18T09:00:00.000Z", modifieLe: "2026-09-18T09:00:00.000Z",
  });
  await le27.getByRole("button", { name: "Je m'inscris" }).click();
  await expect(le27.getByText("Famille Martin vient de s'inscrire.")).toBeVisible();
  await expect(le27.getByText("Famille Martin", { exact: true })).toBeVisible();
  await expect(le27.getByRole("button")).toHaveCount(0);
  expect(ecrituresPetitDej(db.writes, "POST")).toHaveLength(0);
});

test("carte : un écrivain du planning Table ajoute « Les jeunes du Campus » et retire la ligne d'un autre", async ({ page }) => {
  const db = await ouvrirTable(page, ECRIVAIN_TABLE, docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]));
  const carte = carteDe(page);
  const le20 = rangee(carte, "2026-09-20");
  await expect(le20.getByRole("button", { name: "Je m'inscris" }), "il peut aussi s'inscrire lui-même").toBeVisible();
  await capture(page, "petit-dej-carte-ecrivain");

  await le20.getByRole("button", { name: "Ajouter une ligne" }).click();
  const champ = le20.getByRole("combobox", { name: "Ajouter une ligne" });
  await champ.fill("Les jeunes du Campus");
  await champ.press("Enter");
  await expect(le20.getByText("Les jeunes du Campus", { exact: true })).toBeVisible();
  const posees = ecrituresPetitDej(db.writes, "POST");
  expect(posees).toHaveLength(1);
  expect(posees[0].data, "une ligne pour quelqu'un : uid vide").toMatchObject({
    dimanche: "2026-09-20", nom: "Les jeunes du Campus", uid: "", auteurUid: ECRIVAIN_TABLE.uid,
  });

  const le27 = rangee(carte, "2026-09-27");
  await expect(le27.getByRole("button", { name: "Ajouter une ligne" }), "sur chaque dimanche à venir, même pris").toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await le27.getByRole("button", { name: "Retirer" }).click();
  await expect(le27.getByText("Libre", { exact: true })).toBeVisible();
  expect(db.doc("petitDej/a")).toBeUndefined();
  await expect(rangee(carte, "2026-09-13").getByRole("button"), "le passé, même pour un écrivain : aucun bouton").toHaveCount(0);
});

test("carte : inscriptions illisibles — le message, ni « Libre » ni bouton", async ({ page }) => {
  await ouvrirTable(page, CHARLIE);
  await page.route(/firestore\.googleapis\.com.*:runQuery/, (route) =>
    (route.request().postData() ?? "").includes('"petitDej"')
      ? route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
      : route.fallback(),
  );
  await page.reload();
  const carte = carteDe(page);
  await expect(carte.getByText("Inscriptions illisibles pour l'instant.")).toBeVisible();
  await expect(carte.getByText("Libre", { exact: true })).toHaveCount(0);
  await expect(carte.getByRole("button")).toHaveCount(0);
  await capture(page, "petit-dej-carte-illisible");
});

test("carte en 中文 : titre, trimestre, date, « 空闲 » et « 我来报名 »", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirTable(page, CHARLIE, docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-20", nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
  ]));
  const carte = carteDe(page, "早餐");
  await expect(carte.getByRole("heading", { name: "早餐" })).toBeVisible();
  await expect(carte.getByText("第3季度")).toBeVisible();
  const le27 = rangee(carte, "2026-09-27");
  await expect(le27).toContainText("9月27日");
  await expect(le27.getByText("空闲", { exact: true })).toBeVisible();
  await expect(le27.getByRole("button", { name: "我来报名" })).toBeVisible();
  const le20 = rangee(carte, "2026-09-20");
  await expect(le20.getByRole("button", { name: "修改" })).toBeVisible();
  await expect(le20.getByRole("button", { name: "移除" })).toBeVisible();
  await expect(carte.getByText("可以写“某某家庭”代替你的名字。")).toBeVisible();
  await capture(page, "petit-dej-carte-zh");
});

// ─── U3 · relecture : les échecs d'écriture et le nom pré-rempli ───────────

/** Répond `status` à toute écriture POST d'une ligne `petitDej`, avant la base simulée. */
async function refuserLesInscriptions(page: Page, status: number) {
  await page.route(/firestore\.googleapis\.com.*\/documents\/petitDej(\?|$)/, (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: { code: status, message: "refus simulé" } }) })
      : route.fallback(),
  );
}

test("carte : un échec du serveur (500) dit « Enregistrement impossible, réessaie. », pas « tu n'as plus le droit »", async ({ page }) => {
  await ouvrirTable(page, CHARLIE);
  await refuserLesInscriptions(page, 500);
  const le27 = rangee(carteDe(page), "2026-09-27");
  await le27.getByRole("button", { name: "Je m'inscris" }).click();
  await expect(le27.getByRole("status")).toHaveText("Enregistrement impossible, réessaie.");
  await expect(le27.getByText("Libre", { exact: true }), "rien n'est écrit, le dimanche reste libre").toBeVisible();
});

test("carte : un refus des règles (403) garde le message des droits", async ({ page }) => {
  await ouvrirTable(page, CHARLIE);
  await refuserLesInscriptions(page, 403);
  const le27 = rangee(carteDe(page), "2026-09-27");
  await le27.getByRole("button", { name: "Je m'inscris" }).click();
  await expect(le27.getByRole("status")).toContainText("tu n’as plus le droit de modifier ce planning, ou les règles n’ont pas été publiées");
});

test("carte en 中文 : un échec du serveur a son message traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirTable(page, CHARLIE);
  await refuserLesInscriptions(page, 500);
  const le27 = rangee(carteDe(page, "早餐"), "2026-09-27");
  await le27.getByRole("button", { name: "我来报名" }).click();
  await expect(le27.getByRole("status")).toHaveText("保存失败，请重试。");
});

/** Un compte sans prénom ni nom de planning (profil incomplet). */
const SANS_PRENOM: FakeProfile = { uid: "uid-sans-prenom", email: "adresse.privee@example.com", firstName: "", lastName: "" };

test("carte : sans prénom ni nom de planning, « Je m'inscris » demande un nom ; l'adresse mail n'est jamais écrite", async ({ page }) => {
  const db = await ouvrirTable(page, SANS_PRENOM);
  const le27 = rangee(carteDe(page), "2026-09-27");
  await le27.getByRole("button", { name: "Je m'inscris" }).click();
  const champ = le27.getByRole("textbox", { name: "Ton nom" });
  await expect(champ).toBeVisible();
  await expect(champ).toHaveValue("");
  expect(ecrituresPetitDej(db.writes, "POST"), "rien d'écrit avant le nom").toHaveLength(0);
  await capture(page, "petit-dej-carte-sans-prenom");

  await champ.press("Escape");
  await expect(le27.getByRole("button", { name: "Je m'inscris" }), "Échap annule").toBeVisible();

  await le27.getByRole("button", { name: "Je m'inscris" }).click();
  await champ.fill("Famille Martin");
  await champ.press("Enter");
  await expect(le27.getByText("Famille Martin", { exact: true })).toBeVisible();
  const posees = ecrituresPetitDej(db.writes, "POST");
  expect(posees).toHaveLength(1);
  expect(posees[0].data, "une inscription : rattachée à son compte").toMatchObject({
    dimanche: "2026-09-27", nom: "Famille Martin", uid: SANS_PRENOM.uid, auteurUid: SANS_PRENOM.uid,
  });
  expect(JSON.stringify(db.writes.filter((w) => w.path.startsWith("petitDej/"))), "ni début d'adresse mail").not.toContain("adresse.privee");
});

// ─── U3 · PD3 : Ce dimanche, Mes services, rappels — rattachés par le compte (Q9) ─

/** Un compte de l'assemblée, sans nom de planning. */
const SANS_NOM: FakeProfile = { uid: "uid-sans-nom", email: "sans-nom@example.com", firstName: "Camille", lastName: "Exemple" };

test("rappels J-7 / J-3 / J-1 : « Petit déj » ajouté par le compte, sans doublon, une ligne sans inscrit ne prévient personne", () => {
  // Ce que le cron a déjà trouvé par les noms de planning, le dimanche 20/09.
  const charlie: ReminderService[] = [{ service: "Petit déj", roles: [] }];
  const ruth: ReminderService[] = [{ service: "Culte Franco", roles: ["Piano"] }];
  const parUid = new Map([[CHARLIE.uid, charlie], ["uid-ruth", ruth]]);
  const lignes = [
    ligne({ id: "a", dimanche: "2026-09-20", nom: "Charlie B.", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "b", dimanche: "2026-09-20", nom: "Famille Martin", uid: SANS_NOM.uid, auteurUid: SANS_NOM.uid }),
    ligne({ id: "c", dimanche: "2026-09-20", nom: "Les amis de Camille", uid: SANS_NOM.uid, auteurUid: SANS_NOM.uid }),
    ligne({ id: "d", dimanche: "2026-09-20", nom: "Ruth et les siens", uid: "uid-ruth", auteurUid: "uid-ruth" }),
    ligne({ id: "e", dimanche: "2026-09-20", nom: "Les jeunes du Campus" }),
    ligne({ id: "f", dimanche: "2026-09-27", nom: "Famille Durand", uid: "uid-autre", auteurUid: "uid-autre" }),
  ];

  ajouterPetitDejAuxRappels(parUid, lignes, "2026-09-20");

  expect(parUid.get(CHARLIE.uid), "déjà trouvé par son nom de planning : pas de doublon").toEqual([{ service: "Petit déj", roles: [] }]);
  expect(parUid.get(SANS_NOM.uid), "sans nom de planning, deux lignes le même dimanche : un service").toEqual([{ service: "Petit déj", roles: [] }]);
  expect(parUid.get("uid-ruth"), "à la suite de ses autres services, dans le même message").toEqual([
    { service: "Culte Franco", roles: ["Piano"] }, { service: "Petit déj", roles: [] },
  ]);
  expect(ruth, "la liste partagée par les comptes d'un même nom n'est pas touchée").toEqual([{ service: "Culte Franco", roles: ["Piano"] }]);
  expect([...parUid.keys()].sort(), "ni ligne posée pour quelqu'un (uid vide), ni autre dimanche").toEqual([CHARLIE.uid, SANS_NOM.uid, "uid-ruth"].sort());

  expect(reminderBody("2026-09-20", "J1", parUid.get(SANS_NOM.uid)!, "fr")).toBe("Dimanche 20 septembre (demain) : Petit déj");
  expect(reminderBody("2026-09-20", "J1", parUid.get(SANS_NOM.uid)!, "zh-CN")).toBe("9月20日星期日（明天）：早餐");
  expect(reminderBody("2026-09-20", "J3", parUid.get("uid-ruth")!, "fr")).toBe(
    "Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano) · Petit déj",
  );
});

test("Ce dimanche : « Ton prochain service » compte ma ligne « Famille Martin », une seule fois", async ({ page }) => {
  // Vendredi 25/09 : le Sheet n'a plus rien pour Charlie, seules ses lignes comptent.
  await open(page, "2026-09-27", "/planning", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "b", dimanche: "2026-09-27", nom: "Charlie et ses amis", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
  ]));
  await expect(page.getByRole("heading", { name: "Ton prochain service" })).toBeVisible();
  const prochain = page.locator('main a[href^="/mes-services"]').first();
  await expect(prochain).toContainText("Petit déj (Équipe)");
  expect((await prochain.innerText()).match(/Petit déj/g), "deux lignes le même dimanche : un seul « Petit déj »").toHaveLength(1);
  await expect(prochain.getByTestId("tuile")).toContainText("27");
  await capture(page, "ce-dimanche-prochain-petit-dej");
});

test("Ce dimanche : un compte sans nom de planning voit son petit déj en prochain service ; la ligne d'un autre, non", async ({ page }) => {
  await open(page, "2026-09-27", "/planning", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-10-04", nom: "Famille Martin", uid: SANS_NOM.uid, auteurUid: SANS_NOM.uid }),
    ligne({ id: "b", dimanche: "2026-09-27", nom: "Famille Durand", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]), SANS_NOM);
  const prochain = page.locator('main a[href^="/mes-services"]').first();
  await expect(prochain).toContainText("Petit déj (Équipe)");
  await expect(prochain.getByTestId("tuile"), "le 04/10, pas le 27/09 d'un autre").toContainText("4");
  await expect(prochain.getByTestId("tuile")).toContainText("oct");
});

test("Ce dimanche : sans ligne à moi ni nom de planning, pas de prochain service", async ({ page }) => {
  await open(page, "2026-09-27", "/planning", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Durand", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]), SANS_NOM);
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Famille Durand"), "la ligne d'un autre reste dans Ce dimanche").toBeVisible();
  await expect(page.getByRole("heading", { name: "Ton prochain service" })).toHaveCount(0);
});

test("Mes services : « Famille Martin » reste un service de son inscrit, sans doublon avec son nom de planning", async ({ page }) => {
  await open(page, "2026-09-20", "/mes-services", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "b", dimanche: "2026-10-04", nom: "Charlie B.", uid: CHARLIE.uid, auteurUid: CHARLIE.uid }),
    ligne({ id: "c", dimanche: "2026-10-11", nom: "Famille Durand", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]));
  const petitDej = page.getByRole("listitem").filter({ hasText: "Petit déj" });
  await expect(petitDej, "le 27/09 par le compte, le 04/10 par le nom et le compte : une fois chacun").toHaveCount(2);
  await expect(petitDej.nth(0)).toContainText("27");
  await expect(petitDej.nth(1)).toContainText("4 oct");
  await expect(page.getByText("3 à venir"), "avec la Prépa. Table du 20/09").toBeVisible();
});

test("Mes services : un compte sans nom de planning voit ses petits déj, sous son prénom et son nom", async ({ page }) => {
  await open(page, "2026-09-20", "/mes-services", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin", uid: SANS_NOM.uid, auteurUid: SANS_NOM.uid }),
    ligne({ id: "b", dimanche: "2026-10-04", nom: "Famille Durand", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]), SANS_NOM);
  await expect(page.getByRole("heading", { name: "Mes services" })).toBeVisible();
  await expect(page.getByText("Les dates où Camille Exemple apparaît dans les plannings.")).toBeVisible();
  await expect(page.getByText(/Choisis ton nom de planning/)).toHaveCount(0);
  const petitDej = page.getByRole("listitem").filter({ hasText: "Petit déj" });
  await expect(petitDej, "le sien, pas celui d'un autre").toHaveCount(1);
  await expect(petitDej).toContainText("27");
  await capture(page, "mes-services-sans-nom-petit-dej");
});

test("Mes services : un compte sans nom de planning ni ligne garde « choisis ton nom »", async ({ page }) => {
  await open(page, "2026-09-20", "/mes-services", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Durand", uid: "uid-autre", auteurUid: "uid-autre" }),
  ]), SANS_NOM);
  await expect(page.getByText(/Choisis ton nom de planning/)).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Petit déj" })).toHaveCount(0);
});

test("Mes services en 中文 : un compte sans nom de planning voit ses petits déj", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, "2026-09-20", "/mes-services", docsPetitDej([
    ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin", uid: SANS_NOM.uid, auteurUid: SANS_NOM.uid }),
  ]), SANS_NOM);
  await expect(page.getByRole("listitem").filter({ hasText: "Petit déj" })).toHaveCount(1);
  // Le pied de la barre latérale (lot U4) porte aussi le nom : la phrase de la page seule.
  await expect(page.getByText(/Camille Exemple\s*出现在排班表中/)).toBeVisible();
});

// ─── U3 · PD4 : le mercredi (T5, Q5) ────────────────────────────────────────

test("le mercredi : le dimanche qui vient est à J+4 ; les autres jours ne sont pas des mercredis", () => {
  expect(estMercredi("2026-09-16")).toBe(true);
  expect(estMercredi("2026-09-17"), "un jeudi").toBe(false);
  expect(estMercredi("2026-09-20"), "un dimanche").toBe(false);
  expect(prochainDimanche("2026-09-16")).toBe("2026-09-20");
  expect(prochainDimanche("2026-09-30"), "d'un mois sur l'autre").toBe("2026-10-04");
});

test("lignesMercredi : dimanche libre, la ligne puis « Ne plus recevoir », en français et en 中文, fondues à la suite du rappel", () => {
  const autreDimanche = [ligne({ id: "a", dimanche: "2026-09-27", nom: "Famille Martin" })];
  const fr = lignesMercredi("2026-09-16", autreDimanche, "fr");
  expect(fr, "une ligne d'un autre dimanche ne prend pas le 20").toEqual([
    "Dimanche 20 septembre : personne pour le petit déj.",
    "Ne plus recevoir : Moi › Mon profil › Notifications › Petit déj",
  ]);
  expect(lignesMercredi("2026-09-16", [], "zh-CN")).toEqual([
    "9月20日星期日：还没有人负责早餐。",
    "不再接收：我 › 我的资料 › 通知 › 早餐",
  ]);
  expect(
    avecLignes("Samedi 19 septembre (dans 3 jours) : Groupe Paix (Piano)", fr),
    "une notification, pas une de plus : le corps du rappel, puis les deux lignes",
  ).toBe([
    "Samedi 19 septembre (dans 3 jours) : Groupe Paix (Piano)",
    "Dimanche 20 septembre : personne pour le petit déj.",
    "Ne plus recevoir : Moi › Mon profil › Notifications › Petit déj",
  ].join("\n"));
  expect(petitDejTitre("fr"), "seule, la notification porte ce titre").toBe("Petit déj");
  expect(petitDejTitre("zh-CN")).toBe("早餐");
});

test("lignesMercredi : rien si le dimanche est pris, si la lecture a échoué (Q10), ni un autre jour", () => {
  const pris = [ligne({ id: "a", dimanche: "2026-09-20", nom: "Les jeunes du Campus" })];
  expect(lignesMercredi("2026-09-16", pris, "fr"), "une ligne suffit à prendre le dimanche (T2)").toEqual([]);
  expect(lignesMercredi("2026-09-16", null, "fr"), "une lecture en échec n'est pas « personne »").toEqual([]);
  expect(lignesMercredi("2026-09-17", [], "fr"), "un jeudi").toEqual([]);
  expect(lignesMercredi("2026-09-20", [], "zh-CN"), "un dimanche").toEqual([]);
});

test("préférence « Petit déj » : un type de notification, active par défaut", () => {
  expect(NOTIF_TYPES).toContain("petitDej");
  expect(DEFAULT_NOTIF_PREFS.petitDej).toBe(true);
  expect(NOTIF_TYPE_LABELS.petitDej).toBe("Petit déj");
});

test("Mon profil › Notifications : la bascule « Petit déj » est active par défaut ; l'éteindre écrit notifPrefs/{uid}.petitDej = false", async ({ page }) => {
  await abonneAuxNotifications(page);
  const db = await signInAs(page, CHARLIE, {}, "/profil");
  await expect(page.getByText("Recevoir", { exact: true })).toBeVisible();
  const bascule = page.getByRole("switch", { name: "Petit déj" });
  await expect(bascule, "aucun document notifPrefs : actif par défaut").toBeChecked();
  await bascule.scrollIntoViewIfNeeded();
  await capture(page, "profil-notifications-petit-dej");

  await bascule.click();
  await expect(bascule).not.toBeChecked();
  await expect.poll(() => db.doc(`notifPrefs/${CHARLIE.uid}`)?.petitDej).toBe(false);
  expect(db.doc(`notifPrefs/${CHARLIE.uid}`), "les autres préférences restent").toMatchObject({
    reminders: true, setlists: true, evenements: true, taches: true,
  });
});

test("Mon profil › Notifications en 中文 : la liste « Recevoir » est traduite ; une préférence éteinte le reste", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await abonneAuxNotifications(page);
  await signInAs(page, CHARLIE, { [`notifPrefs/${CHARLIE.uid}`]: { petitDej: false } }, "/profil");
  await expect(page.getByText("接收", { exact: true })).toBeVisible();
  for (const nom of ["服侍提醒", "歌单已准备好", "活动", "任务"]) {
    await expect(page.getByRole("switch", { name: nom }), nom).toBeChecked();
  }
  await expect(page.getByRole("switch", { name: "早餐" }), "éteinte dans notifPrefs").not.toBeChecked();
  await expect(page.getByText("Petit déj", { exact: true })).toHaveCount(0);
  await page.getByRole("switch", { name: "早餐" }).scrollIntoViewIfNeeded();
  await capture(page, "profil-notifications-petit-dej-zh");
});

// ─── U3 · PD5 : la reprise (T11, Q13), le bouton et la route ───────────────

test("Back-Office › Planning › Import : « Reprendre les noms du petit déj » demande confirmation, appelle la route et affiche son compte rendu", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-19T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const appels: { methode: string; jeton: string }[] = [];
  await page.route("**/api/admin/reprendre-petit-dej", (route) => {
    appels.push({ methode: route.request().method(), jeton: route.request().headers()["authorization"] ?? "" });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reprises: 9, ignores: 3 }) });
  });
  await signInAs(page, { ...ADMIN, firstName: "Admin", lastName: "A." }, {}, "/back-office/planning/import");
  const bouton = page.getByRole("button", { name: "Reprendre les noms du petit déj" });
  await expect(bouton).toBeVisible();

  page.once("dialog", (d) => void d.dismiss());
  await bouton.click();
  await expect(bouton, "annulé : la page reste prête").toBeEnabled();
  expect(appels, "annulé : la route n'est pas appelée").toEqual([]);

  page.once("dialog", (d) => void d.accept());
  await bouton.click();
  await expect(page.getByText("9 dimanches repris, 3 déjà inscrits.")).toBeVisible();
  expect(appels).toHaveLength(1);
  expect(appels[0].methode).toBe("POST");
  expect(appels[0].jeton, "le jeton de l'admin part avec l'appel").toMatch(/^Bearer ./);
  await bouton.scrollIntoViewIfNeeded();
  await capture(page, "admin-reprise-petit-dej");
});

test("Back-Office › Planning › Import : un refus de la route s'affiche à la place du compte rendu", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-19T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route("**/api/admin/reprendre-petit-dej", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Erreur serveur" }) }));
  await signInAs(page, { ...ADMIN, firstName: "Admin", lastName: "A." }, {}, "/back-office/planning/import");
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Reprendre les noms du petit déj" }).click();
  await expect(page.getByText("Erreur serveur")).toBeVisible();
  await expect(page.getByText(/dimanches repris/)).toHaveCount(0);
});

test("la route de reprise existe interrupteur ouvert et refuse un appel sans jeton", async ({ request }) => {
  const reponse = await request.post("/api/admin/reprendre-petit-dej/", { data: {} });
  expect(reponse.status()).toBe(401);
});
