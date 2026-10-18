import "./helpers/cleFirebase";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";
import { etatEdition } from "../src/lib/scene/fetes";
import type { Programme } from "../src/types/programme";

// Fermer les réservations d'une fête avant la date de fin (docs/spec-fermer-reservations.md, FR-A).
// Comptes et programmes simulés ; noms fictifs.

const NINA_COORD: FakeProfile = { uid: "uid-nina", email: "nina@example.com", firstName: "Nina", lastName: "V.", coordination: true };
const ELIO_MEMBRE: FakeProfile = { uid: "uid-elio", email: "elio@example.com", firstName: "Elio", lastName: "B." };

/** Noël 2026 lancé, ouverture le lundi 02/11, fermeture par défaut le dimanche 20/12. */
const NOEL_2026 = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-11-02", ouvert: true,
  plages: [{ jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  passages: [{ id: "q1aaaaaa", quoi: "Séance louange", qui: ["Gp Paix"], titre: "Ouverture" }],
  createdBy: "uid-nina", updatedAt: "2026-10-01T10:00:00Z",
};

// ─── FR5 : etatEdition ───────────────────────────────────────────────────────

const prog = (over: Partial<Programme> = {}): Programme => ({ id: "noel-2026", ...NOEL_2026, ...over } as Programme);
const ed = (programme: Programme) => ({ fete: "noel" as const, annee: 2026, programme });

test("FR5 — `fermees` : avant l'ouverture et pendant → « fermees », jusqu'au jour J compris ; après → « passee »", () => {
  expect(etatEdition(ed(prog({ fermees: true })), "2026-10-18")).toBe("fermees");
  expect(etatEdition(ed(prog({ fermees: true })), "2026-11-15")).toBe("fermees");
  expect(etatEdition(ed(prog({ fermees: true })), "2026-12-24")).toBe("fermees");
  expect(etatEdition(ed(prog({ fermees: true })), "2026-12-25")).toBe("passee");
});

test("FR5 — un brouillon reste « brouillon », même avec `fermees` ; `fermees: false` suit les dates", () => {
  expect(etatEdition(ed(prog({ ouvert: false, fermees: true })), "2026-11-15")).toBe("brouillon");
  expect(etatEdition(ed(prog({ fermees: false })), "2026-10-18")).toBe("bientot");
  expect(etatEdition(ed(prog({ fermees: false })), "2026-11-15")).toBe("ouvertes");
  expect(etatEdition(ed(prog({ fermees: false })), "2026-12-21")).toBe("fermees");
});

// ─── FR6, FR7 : Back-Office, vue Saison ──────────────────────────────────────

const SAISON = "/back-office/evenements/scene/noel?vue=saison";
const fermer = (page: Page) => page.getByRole("button", { name: "Fermer les réservations", exact: true });
const rouvrir = (page: Page) => page.getByRole("button", { name: "Rouvrir les réservations", exact: true });
const enTeteSaison = (page: Page) => page.locator("header").filter({ has: page.getByRole("heading", { name: "Saison de Noël 2026" }) });
const ecritures = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("programmes"));

async function ouvrir(page: Page, chemin: string, doc: Record<string, unknown> = NOEL_2026, jour = "2026-10-18", qui: FakeProfile = NINA_COORD) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(`${jour}T10:00:00`));
  return signInAs(page, qui, { "programmes/noel-2026": doc }, chemin);
}

test("FR6 — édition lancée : « Fermer les réservations », confirmation du site, un PATCH de `fermees` seul ; pastille « Fermées »", async ({ page }) => {
  const db = await ouvrir(page, SAISON);
  await expect(enTeteSaison(page)).toContainText("Lancée");
  await expect(page.getByText("Réservations lancées")).toHaveCount(0);
  await fermer(page).click();
  const dialogue = page.getByRole("alertdialog");
  await expect(dialogue.getByRole("heading", { name: "Fermer les réservations de Noël 2026 ?" })).toBeVisible();
  await expect(dialogue).toContainText("Les créneaux déjà pris restent ; plus personne ne peut réserver.");
  await dialogue.getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(rouvrir(page)).toBeVisible();
  const ecrites = ecritures(db);
  expect(ecrites).toHaveLength(1);
  expect(ecrites[0]).toMatchObject({ method: "PATCH", path: "programmes/noel-2026" });
  expect(Object.keys(ecrites[0].data).sort()).toEqual(["fermees", "modifiePar", "updatedAt"]);
  expect(ecrites[0].data.fermees).toBe(true);
  await expect(enTeteSaison(page)).toContainText("Fermées");
  await expect(fermer(page)).toHaveCount(0);
});

test("FR6 — « Annuler » dans la confirmation n'écrit rien", async ({ page }) => {
  const db = await ouvrir(page, SAISON);
  await fermer(page).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(fermer(page)).toBeVisible();
  expect(ecritures(db)).toHaveLength(0);
});

test("FR7 — fermée à la main : « Rouvrir les réservations », sans confirmation, `fermees: false` ; pastille « Lancée »", async ({ page }) => {
  const db = await ouvrir(page, SAISON, { ...NOEL_2026, fermees: true });
  await expect(enTeteSaison(page)).toContainText("Fermées");
  await rouvrir(page).click();
  await expect(fermer(page)).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  const ecrites = ecritures(db);
  expect(ecrites).toHaveLength(1);
  expect(Object.keys(ecrites[0].data).sort()).toEqual(["fermees", "modifiePar", "updatedAt"]);
  expect(ecrites[0].data.fermees).toBe(false);
  await expect(enTeteSaison(page)).toContainText("Lancée");
});

test("FR7 — le jour J, « Rouvrir » est encore là ; après le jour J, ni Fermer ni Rouvrir", async ({ page }) => {
  await ouvrir(page, SAISON, { ...NOEL_2026, fermees: true }, "2026-12-24");
  await expect(rouvrir(page)).toBeVisible();
  await ouvrir(page, SAISON, { ...NOEL_2026, fermees: true }, "2026-12-26");
  await expect(page.getByRole("heading", { name: "Saison de Noël 2026" })).toBeVisible();
  await expect(rouvrir(page)).toHaveCount(0);
  await expect(fermer(page)).toHaveCount(0);
  await ouvrir(page, SAISON, NOEL_2026, "2026-12-26");
  await expect(page.getByRole("heading", { name: "Saison de Noël 2026" })).toBeVisible();
  await expect(fermer(page)).toHaveCount(0);
});

test("FR6 — le bouton à la place de « Lancer » : en en-tête sur deux volets, pleine largeur sur une colonne ; rien ne déborde", async ({ page }) => {
  await ouvrir(page, SAISON);
  const bouton = (await fermer(page).boundingBox())!;
  const titre = (await page.getByRole("heading", { name: "Saison de Noël 2026" }).boundingBox())!;
  if (estGrandEcran(test.info())) {
    // Dans l'en-tête, comme « Lancer » : à droite du titre, ou dessous quand le volet est étroit ; avant les réglages.
    const reglages = (await page.getByRole("region", { name: "Mettre en place la saison" }).boundingBox())!;
    expect(bouton.y + bouton.height).toBeLessThanOrEqual(reglages.y);
  } else {
    expect(bouton.y).toBeGreaterThan(titre.y + titre.height);
    expect(bouton.height).toBeGreaterThanOrEqual(44);
    expect(bouton.width).toBeGreaterThan(page.viewportSize()!.width * 0.8);
  }
  await verifierAgencement(page);
});

test("FR6 — en chinois : 关闭预约, la confirmation, 重新开放预约", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, SAISON);
  await page.getByRole("button", { name: "关闭预约", exact: true }).click();
  const dialogue = page.getByRole("alertdialog");
  await expect(dialogue.getByRole("heading", { name: /^关闭.*的预约？$/ })).toBeVisible();
  await expect(dialogue).toContainText("已预约的时段保留；之后无人可再预约。");
  await dialogue.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("button", { name: "重新开放预约", exact: true })).toBeVisible();
});

// ─── FR9 : App ───────────────────────────────────────────────────────────────

test("FR9 — App : ouvertes par les dates mais `fermees` → « Les réservations sont fermées. », pas de grille", async ({ page }) => {
  await ouvrir(page, "/evenements/scene/noel", { ...NOEL_2026, fermees: true }, "2026-11-15", ELIO_MEMBRE);
  await expect(page.getByText("Les réservations sont fermées.")).toBeVisible();
  await expect(page.getByText("Rendez-vous le jour J, dans l'ordre de passage.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Réserver \d/ })).toHaveCount(0);
});

test("FR9 — App : « Saisir les chants » toujours là pour un ayant droit, réservations fermées", async ({ page }) => {
  await page.route("**/api/fetes/droits", (route) =>
    route.fulfill({ json: { passages: [{ id: "q1aaaaaa", chants: true, musiques: false, mien: true }] } }));
  await ouvrir(page, "/evenements/scene/noel?vue=ordre", { ...NOEL_2026, fermees: true }, "2026-11-15", ELIO_MEMBRE);
  await expect(page.getByRole("button", { name: "Saisir les chants" })).toBeVisible();
});

// ─── Captures à regarder ─────────────────────────────────────────────────────

test("captures : vue Saison lancée puis fermée, PW_CAPTURES=<dossier>", async ({ page }) => {
  const dir = process.env.PW_CAPTURES;
  test.skip(!dir, "captures seulement avec PW_CAPTURES");
  await ouvrir(page, SAISON);
  await expect(fermer(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/fr-lancee-${test.info().project.name}.png` });
  await fermer(page).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/fr-confirmation-${test.info().project.name}.png` });
  await page.getByRole("alertdialog").getByRole("button", { name: "Fermer", exact: true }).click();
  await expect(rouvrir(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/fr-fermee-${test.info().project.name}.png` });
});
