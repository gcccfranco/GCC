import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fsDoc, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { parsePetitDej } from "../src/lib/planning/sheets";
import { findMyServices, type PlanningData } from "../src/lib/planning/names";
import { reminderBody, reminderServicesFor } from "../src/lib/push/reminderMessage";
import {
  estLibre, lirePetitDej, oublierPetitDej, planifierReprise, rangeesPetitDej, servicesPetitDejDuCompte,
} from "../src/lib/petitdej/lignes";
import { canEditPetitDej, canGererPetitDej } from "../src/lib/access";
import type { LignePetitDej } from "../src/types/petitDej";

// Lot 1b (docs/spec-planning-petits-lots.md) : le petit déj se lisait dans le
// bloc « PETIT DÉJEUNER » de l'onglet Franco_Table_PtD (colonnes 17 DATE / 18 NOM
// pour janvier → juin, 19 / 20 pour juillet → décembre). Ce dimanche, Mes
// services, rappels ; pas d'onglet.
//
// Lot U3 (docs/spec-petit-dej.md), tranche PD1 : interrupteur ouvert, les
// inscriptions (`petitDej/{id}`, une ligne par document) sont la SEULE source
// (T8) ; le Sheet ne parle plus. Les écrans du lot 1b, Sheet compris, se
// vérifient désormais dans back-office-coupe.spec.ts (interrupteur coupé).

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

async function open(page: Page, dimanche: string, to: string, docs: Record<string, Record<string, unknown>> = {}) {
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
  return signInAs(page, CHARLIE, docs, to);
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
