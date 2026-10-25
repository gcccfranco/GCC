import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreEditeur, boutonTonalite, groupeTonalites, reglerElement } from "./helpers/editeurSetlist";
import { interdireDialoguesNatifs } from "./helpers/agencement";

// Flux B, tranche B5a (docs/spec-corrections-audit.md) : en 中文, plus de français hors contenu des chants et
// noms de personnes sur Campus, Moi et Profil ; l'erreur de notification se lit en 中文 ; l'éditeur de setlist
// range une tonalité majeure d'ancienne setlist sur le relatif mineur. Fausse base, noms fictifs.

const MEMBRE: FakeProfile = {
  uid: "uid-mina", email: "mina@example.com", firstName: "Mina", lastName: "Rowan", planningName: "Mina R.",
  serviceRoles: { "Culte Francophone": ["chanteur", "musicien"] },
};

const FRANCAIS = /[éèêàçù]|\b(Piano|Guitare|Batterie|Choriste|Musicien|Aucune|donnée|Culte)\b/;

async function enZh(page: Page) {
  interdireDialoguesNatifs(page);
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
}

/** Le texte visible du <main>, sans ce qui suit un « : » (nom de personne d'une cellule « Poste: Nom »). */
async function texteDuMain(page: Page): Promise<string> {
  const texte = await page.locator("main").first().innerText();
  // « Français » : le nom de la langue, écrit dans sa langue, comme dans tout sélecteur de langue.
  return texte.replace(/[:：][^\n,]*/g, "").replace(/Français/g, "");
}

test("Campus en 中文 : postes traduits, aucun français hors noms", async ({ page }) => {
  await enZh(page);
  await signInAs(page, MEMBRE, {}, "/planning/campus");
  await expect(page.getByTestId("campus-cartes")).toBeVisible();
  await expect(page.getByTestId("campus-cartes")).toContainText("钢琴");
  const brut = await page.getByTestId("campus-cartes").innerText();
  expect(brut).not.toMatch(/\b(Piano|Guitare|Batterie|Sono|PPT)\b/);
  expect(await texteDuMain(page)).not.toMatch(/\b(Piano|Guitare|Batterie|Aucune|donnée|Matin|Soir)\b/);
});

test("Moi en 中文 : aucun français", async ({ page }) => {
  await enZh(page);
  await signInAs(page, MEMBRE, {}, "/moi");
  await expect(page.locator("main").first()).toContainText("Mina");
  await page.waitForTimeout(500);
  expect(await texteDuMain(page)).not.toMatch(FRANCAIS);
});

test("Profil en 中文 : aucun français", async ({ page }) => {
  await enZh(page);
  await signInAs(page, MEMBRE, {}, "/profil");
  await expect(page.locator("main").first()).toBeVisible();
  await page.waitForTimeout(500);
  expect(await texteDuMain(page)).not.toMatch(FRANCAIS);
});

test.describe("Profil, site en ligne (interrupteur coupé)", () => {
  test.use({ baseURL: BASE_URL_COUPE });

  test("les services et rôles à cocher se lisent en 中文", async ({ page }) => {
    await enZh(page);
    await signInAs(page, MEMBRE, {}, "/profil");
    await expect(page.getByText("法语崇拜").first()).toBeVisible();
    await expect(page.getByText("乐手").first()).toBeVisible();
    expect(await texteDuMain(page)).not.toMatch(FRANCAIS);
  });
});

test("erreur de notification en 中文 : permission refusée", async ({ page }) => {
  await enZh(page);
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { configurable: true, get: () => "default" });
    Notification.requestPermission = async () => "denied";
    Object.defineProperty(Navigator.prototype, "standalone", { configurable: true, get: () => true });
    const enregistrement = { pushManager: { getSubscription: async () => null } };
    Object.defineProperty(ServiceWorkerContainer.prototype, "ready", { configurable: true, get: () => Promise.resolve(enregistrement) });
  });
  await signInAs(page, MEMBRE, {}, "/profil");
  const activer = page.getByRole("switch", { name: "通知" });
  await expect(activer).toBeVisible();
  await activer.click();
  await expect(page.getByText("出现错误")).toBeVisible();
  await expect(page.getByText(/Permission refusée|Une erreur est survenue/)).toHaveCount(0);
});

test("éditeur : un chant mineur avec une tonalité majeure d'ancienne setlist montre 12 boutons, la relative mineure cochée", async ({ page }) => {
  interdireDialoguesNatifs(page);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const id = "sl-mineur";
  await signInAs(page, { ...MEMBRE, ...{ serviceRoles: { "Culte Francophone": ["musicien"] } } }, {
    [`setlists/${id}`]: {
      title: "Culte fictif", leader: "Mina R.", category: "Culte Francophone", date: "2026-10-04", language: "fr", notes: "",
      ownerId: MEMBRE.uid, isPrivate: false,
      items: [{ songSlug: "a-l-agneau", position: 1, keyOverride: "C", showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
    },
  }, `/setlists/${id}/edit`);
  const titre = "À l'agneau";
  await attendreEditeur(page, titre);
  await reglerElement(page, titre);
  const groupe = groupeTonalites(page, titre);
  await expect(groupe.getByRole("radio")).toHaveCount(12);
  await expect(boutonTonalite(groupe, "Am")).toHaveAttribute("aria-checked", "true");
});
