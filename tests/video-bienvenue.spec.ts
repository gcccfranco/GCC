import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot VB (docs/spec-video-bienvenue.md, point 7) : la vidéo de l'écran Bienvenue de la visite.

const NEUF: FakeProfile = { uid: "uid-video", email: "video@example.com", firstName: "Maëlys", lastName: "Fortin", accueil: true };

const VIDEO_DU_PROJET: Record<string, string> = {
  telephone: "bienvenue-telephone.mp4",
  tablette: "bienvenue-tablette.mp4",
  "tablette-paysage": "bienvenue-tablette-paysage.mp4",
  ordinateur: "bienvenue-ordinateur.mp4",
  "ordinateur-1440": "bienvenue-ordinateur.mp4",
};

const accueil = (page: Page) => page.getByRole("dialog", { name: /Bienvenue dans GCC|欢迎使用 GCC/ });
const video = (page: Page) => accueil(page).locator("video");
const suivant = (page: Page) => accueil(page).getByRole("button", { name: "Suivant" });

/** Ce Chromium lit-il le H.264 ? Sinon on ne vérifie que les attributs. */
async function litH264(page: Page): Promise<boolean> {
  const reponse = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.640020, mp4a.40.2"'));
  if (reponse === "") {
    test.info().annotations.push({ type: "h264", description: "H.264 non lu par ce navigateur : seuls muted et poster sont vérifiés" });
    return false;
  }
  return true;
}

const etat = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => ({ muted: v.muted, paused: v.paused, currentTime: v.currentTime }));

async function ouvrir(page: Page, profil: FakeProfile = NEUF, chemin = "/moi") {
  const db = await signInAs(page, profil, {}, chemin);
  await expect(accueil(page)).toBeVisible();
  return db;
}

/** Une image à montrer : on laisse tourner la vidéo ~1,5 s, puis on photographie. */
async function capturer(page: Page, fichier: string) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/video-bienvenue/${fichier}.png` });
}

test("la vidéo est là sur un compte neuf : la bonne, muette, sans logo, qui se lit", async ({ page }, info: TestInfo) => {
  await ouvrir(page);
  const v = video(page);
  await expect(v).toBeVisible();
  const attendu = VIDEO_DU_PROJET[info.project.name];
  expect(attendu).toBeTruthy();
  await expect(v).toHaveAttribute("src", new RegExp(`${attendu.replace(".", "\\.")}$`));
  await expect(accueil(page).locator('img[src*="logo"]')).toHaveCount(0);
  if (await litH264(page)) {
    await expect.poll(() => etat(page)).toMatchObject({ muted: true, paused: false });
    await expect.poll(async () => (await etat(page)).currentTime).toBeGreaterThan(0);
  } else {
    expect((await etat(page)).muted).toBe(true);
    await expect(v).toHaveAttribute("poster", /bienvenue\.jpg/);
  }
});

test.describe("mouvement réduit", () => {
  test("pas de lecture automatique : l'affiche et le bouton « Lire la vidéo »", async ({ page }) => {
    // `test.use({ reducedMotion })` ne s'applique pas ici : on émule la préférence, comme les autres specs.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ouvrir(page);
    await page.waitForTimeout(1000);
    const e = await etat(page);
    expect(e.paused).toBe(true);
    expect(e.currentTime).toBe(0);
    const lire = accueil(page).getByRole("button", { name: "Lire la vidéo" });
    await expect(lire).toBeVisible();
    await lire.click();
    // Le bouton disparaît : le focus passe à la vidéo, pas à la page.
    await expect(video(page)).toBeFocused();
    if (await litH264(page)) await expect.poll(async () => (await etat(page)).paused).toBe(false);
  });
});

test("si play() est refusé : le bouton « Lire la vidéo » et la vidéo en pause", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("refus", "NotAllowedError"));
  });
  await ouvrir(page);
  await expect(accueil(page).getByRole("button", { name: "Lire la vidéo" })).toBeVisible();
  expect((await etat(page)).paused).toBe(true);
});

test("à la fin, « Revoir » relance la vidéo depuis le début", async ({ page }) => {
  await ouvrir(page);
  const h264 = await litH264(page);
  await video(page).evaluate((v: HTMLVideoElement) => new Promise<void>((ok) => {
    const fin = () => { v.dispatchEvent(new Event("ended")); ok(); };
    if (v.readyState >= 1 && Number.isFinite(v.duration)) {
      v.currentTime = v.duration;
      fin();
    } else {
      v.addEventListener("loadedmetadata", () => { v.currentTime = v.duration; fin(); }, { once: true });
      // Sans métadonnées (H.264 non lu), l'évènement suffit.
      setTimeout(fin, 3000);
    }
  }));
  const revoir = accueil(page).getByRole("button", { name: "Revoir", exact: true });
  await expect(revoir).toBeVisible();
  await revoir.click();
  await expect(revoir).toHaveCount(0);
  await expect(video(page)).toBeFocused();
  if (h264) {
    await expect.poll(async () => (await etat(page)).paused).toBe(false);
    expect((await etat(page)).currentTime).toBeLessThan(3);
  }
});

test.describe("vidéo introuvable", () => {
  test("erreur de chargement : l'affiche seule, sans bouton, et la visite continue", async ({ page }) => {
    await page.route("**/accueil/*.mp4", (route) => route.fulfill({ status: 404, body: "" }));
    await ouvrir(page);
    const affiche = accueil(page).locator('img[src="/accueil/bienvenue.jpg"]');
    await expect(affiche).toBeVisible();
    await expect(video(page)).toHaveCount(0);
    await expect(accueil(page).getByRole("button", { name: /Lire la vidéo|Revoir/ })).toHaveCount(0);
    await expect(accueil(page).getByRole("heading", { name: "Bienvenue dans GCC" })).toBeVisible();
    await suivant(page).click();
    await expect(affiche).toHaveCount(0);
  });
});

test("« Suivant » retire la vidéo, « Retour » en remonte une neuve, muette, repartie du début", async ({ page }) => {
  await ouvrir(page);
  await expect(video(page)).toBeVisible();
  await suivant(page).click();
  await expect(video(page)).toHaveCount(0);
  await accueil(page).getByRole("button", { name: "Retour" }).click();
  await expect(video(page)).toBeVisible();
  const e = await etat(page);
  expect(e.muted).toBe(true);
  expect(e.currentTime).toBeLessThan(2);
  if (await litH264(page)) await expect.poll(async () => (await etat(page)).paused).toBe(false);
});

test("en 中文 : le logo, pas de vidéo", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, NEUF, {}, "/moi");
  const d = accueil(page);
  await expect(d).toBeVisible();
  await expect(d.getByRole("heading", { name: "欢迎使用 GCC" })).toBeVisible();
  await expect(d.locator("video")).toHaveCount(0);
  await expect(d.locator('img[src*="logo"]')).toBeVisible();
});

test("mode retour : le logo et « La visite a changé », pas de vidéo", async ({ page }) => {
  await signInAs(page, { ...NEUF, accueil: false, accueilLot8: true }, {}, "/moi");
  const d = accueil(page);
  await expect(d).toBeVisible();
  await expect(d.locator("video")).toHaveCount(0);
  await expect(d.locator('img[src*="logo"]')).toBeVisible();
  await expect(d.getByText("La visite a changé")).toBeVisible();
});

test("mode revoir : « Revoir la visite » sur Moi rouvre la visite avec la vidéo", async ({ page }) => {
  await signInAs(page, { ...NEUF, accueil: false }, {}, "/moi");
  await expect(page.getByRole("heading", { name: "Moi", level: 1 })).toBeVisible();
  await expect(accueil(page)).toHaveCount(0);
  await page.getByRole("button", { name: /Revoir la visite/ }).click();
  await expect(accueil(page)).toBeVisible();
  await expect(video(page)).toBeVisible();
});

test("capture de l'écran Bienvenue sur chaque disposition", async ({ page }, info) => {
  await ouvrir(page);
  await expect(video(page)).toBeVisible();
  await capturer(page, info.project.name);
});

test("capture à 375×667 (iPhone SE), propre au téléphone", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "propre au téléphone");
  await page.setViewportSize({ width: 375, height: 667 });
  await ouvrir(page);
  await expect(video(page)).toBeVisible();
  await expect(suivant(page)).toBeInViewport();
  const debord = await page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth);
  expect(debord).toBe(true);
  const dialogue = await accueil(page).evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(dialogue).toBe(true);
  await capturer(page, "iphone-se");
});
