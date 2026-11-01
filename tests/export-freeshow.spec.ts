import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { BASE_URL_COUPE } from "../playwright.config";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot FS (docs/spec-export-freeshow.md, tranche 2) : le bouton « Exporter pour FreeShow » de la setlist,
// réservé à la régie de la setlist (FS1). Le serveur ordinaire a le back-office ouvert : la régie y est
// celle de « Où il sert » (`lieuxRegie`), on donne donc au profil les deux.
const SETLIST_ID = "setlist-freeshow";
const REGIE: FakeProfile = {
  uid: "uid-regie-fs",
  email: "regie.fs@example.com",
  serviceRoles: { "Culte Francophone": ["regie"] },
  lieuxRegie: ["Culte Francophone"],
};
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien-fs",
  email: "musicien.fs@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const ADMIN: FakeProfile = {
  uid: "uid-admin-fs",
  email: ADMIN_EMAIL,
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

function setlist(over: Record<string, unknown> = {}) {
  return {
    title: "Culte du 1er novembre",
    leader: "Présidence",
    category: "Culte Francophone",
    date: "2026-11-01",
    language: "mixed",
    notes: "",
    ownerId: "uid-owner",
    isPrivate: false,
    items: [
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"] }),
      item({ type: "transition", songSlug: "", position: 2, transitionText: "Prière" }),
      item({ songSlug: "一生爱你", position: 3, structureOverride: ["verse-2-0", "chorus-3-1"] }),
    ],
    ...over,
  };
}

const ouvrir = (page: Page, profile: FakeProfile, data = setlist()) =>
  signInAs(page, profile, { [`setlists/${SETLIST_ID}`]: data }, `/setlists/${SETLIST_ID}`);

const BOUTON = { name: "Exporter pour FreeShow" };

test("la régie exporte : fichier 011126.project, deux chants dans l'ordre, chinois et pinyin", async ({ page }, testInfo) => {
  await ouvrir(page, REGIE);
  const bouton = page.getByRole("button", BOUTON).first();
  await expect(bouton).toBeVisible();
  await expect(bouton).toBeEnabled();
  await testInfo.attach("bouton", { body: await page.screenshot(), contentType: "image/png" });
  await page.screenshot({ path: `test-results/export-freeshow-${testInfo.project.name}.png` });

  const [download] = await Promise.all([page.waitForEvent("download"), bouton.click()]);
  expect(download.suggestedFilename()).toBe("011126.project");
  const projet = JSON.parse(readFileSync((await download.path())!, "utf8"));

  expect(projet.project.name).toBe("01/11/26");
  expect(projet.project.shows.map((s: { index: number }) => s.index)).toEqual([0, 1]);
  const titres = projet.project.shows.map((s: { id: string }) => projet.shows[s.id].name);
  expect(titres).toEqual(["Abba Père", "一生爱你"]);
  const texte = JSON.stringify(projet.shows);
  expect(texte, "paroles chinoises").toContain("一生敬拜你");
  expect(texte, "pinyin").toContain("yī shēng ài nǐ");
});

test("pas de bouton pour un musicien ; l'admin sans rôle régie le voit", async ({ page }) => {
  await ouvrir(page, MUSICIEN);
  await expect(page.getByRole("heading", { name: "Culte du 1er novembre" })).toBeVisible();
  await expect(page.getByRole("button", BOUTON)).toHaveCount(0);

  await ouvrir(page, ADMIN);
  await expect(page.getByRole("button", BOUTON).first()).toBeVisible();
});

test("pas de bouton sur une setlist privée, même pour la régie", async ({ page }) => {
  await ouvrir(page, { ...REGIE, uid: "uid-owner" }, setlist({ isPrivate: true }));
  await expect(page.getByRole("heading", { name: "Culte du 1er novembre" })).toBeVisible();
  await expect(page.getByRole("button", BOUTON)).toHaveCount(0);
});

test.describe("deux volets (1 600 px)", () => {
  test.use({ viewport: { width: 1600, height: 900 } });
  test("le bouton est sous l'en-tête de la colonne de partitions", async ({ page }, testInfo) => {
    await ouvrir(page, REGIE);
    await expect(page.getByRole("button", BOUTON)).toHaveCount(1);
    await expect(page.getByRole("button", BOUTON)).toBeEnabled();
    await page.screenshot({ path: `test-results/export-freeshow-deux-volets-${testInfo.project.name}.png` });
  });
});

test.describe("site coupé (interrupteur du back-office absent)", () => {
  test.use({ baseURL: BASE_URL_COUPE });
  test("la régie du profil (rôle regie) voit le bouton", async ({ page }) => {
    await ouvrir(page, { ...REGIE, lieuxRegie: undefined });
    await expect(page.getByRole("button", BOUTON).first()).toBeVisible();
  });
});
