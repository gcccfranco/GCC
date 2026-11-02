import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { cartesDeLaVisite, type Carte } from "../src/lib/onboarding/visite";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot VB-E (docs/spec-video-bienvenue.md) : un extrait vidéo en boucle au pied de chaque écran de la visite, sauf Bienvenue (le logo).
// Comptes fictifs inventés pour ce fichier.

type Extrait = "apercu" | "onglets" | "musicien" | "melange" | "taches" | "planning";

const BASE: FakeProfile = { uid: "uid-extraits", email: "oceane.extraits@example.com", firstName: "Océane", lastName: "Vasseur", accueil: true };
const LIEU = ["Culte Francophone"];
const PROFILS: Record<string, FakeProfile> = {
  musicien: { ...BASE, uid: "uid-ext-musicien", dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: LIEU, joue: ["basse"] },
  choriste: { ...BASE, uid: "uid-ext-choriste", dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: LIEU },
  présidence: { ...BASE, uid: "uid-ext-presidence", dansEquipes: ["louange"], sousEquipes: ["presidence"], lieuxLouange: LIEU },
  référent: { ...BASE, uid: "uid-ext-referent", dansEquipes: ["medias"], referentDe: ["medias"] },
  membre: { ...BASE, uid: "uid-ext-membre" },
};
const MUSICIEN = PROFILS.musicien;

const DISPOSITION: Record<string, string> = {
  telephone: "telephone",
  tablette: "tablette",
  "tablette-paysage": "tablette-paysage",
  ordinateur: "ordinateur",
  "ordinateur-1440": "ordinateur",
};

const accueil = (page: Page) => page.getByRole("dialog", { name: /Bienvenue dans GCC|欢迎使用 GCC/ });
const video = (page: Page) => accueil(page).locator("video");
const suivant = (page: Page) => accueil(page).getByRole("button", { name: "Suivant" });
/** Le bouton du pied : « Suivant », et « Commencer » sur le dernier écran. */
const avancer = (page: Page) => accueil(page).getByRole("button", { name: /^(Suivant|Commencer)$/ });

/** L'extrait que chaque carte doit porter (E4 à E6), écrit ici indépendamment du composant. */
function extraitAttendu(c: Carte): Extrait {
  if (c.kind === "service") return c.role === "musicien" ? "musicien" : "melange";
  if (c.kind === "equipe") return "taches";
  if (c.kind === "responsabilites") return "planning";
  return "melange";
}

const cartesDe = (p: FakeProfile) =>
  cartesDeLaVisite({ uid: p.uid, email: p.email }, p as Parameters<typeof cartesDeLaVisite>[1], true);

/** Ce Chromium lit-il le H.264 ? Sinon on ne vérifie que les attributs. */
async function litH264(page: Page): Promise<boolean> {
  const reponse = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="avc1.640020, mp4a.40.2"'));
  if (reponse === "") {
    test.info().annotations.push({ type: "h264", description: "H.264 non lu par ce navigateur : seuls loop, muted et poster sont vérifiés" });
    return false;
  }
  return true;
}

const etat = (page: Page) => video(page).evaluate((v: HTMLVideoElement) => ({ muted: v.muted, loop: v.loop, paused: v.paused, currentTime: v.currentTime }));

async function ouvrir(page: Page, profil: FakeProfile = MUSICIEN, chemin = "/moi") {
  const db = await signInAs(page, profil, {}, chemin);
  await expect(accueil(page)).toBeVisible();
  return db;
}

/** Le nombre d'écrans, lu dans le texte réservé aux lecteurs d'écran (« Étape 1 sur 5 »). */
async function totalEcrans(page: Page): Promise<number> {
  const texte = await accueil(page).getByText(/^Étape 1 sur \d+/).textContent();
  return Number(/sur (\d+)/.exec(texte ?? "")?.[1]);
}

/** Avance jusqu'à l'écran dont le titre est donné. */
async function allerA(page: Page, titre: string) {
  const h = accueil(page).getByRole("heading", { name: titre });
  for (let i = 0; i < 9 && !(await h.isVisible()); i++) await suivant(page).click();
  await expect(h).toBeVisible();
}

/** Une image à montrer : on laisse tourner la vidéo ~1,5 s, puis on photographie. */
async function capturer(page: Page, fichier: string) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `test-results/extraits-visite/${fichier}.png` });
}

test("écran 1 : le logo seul, aucune vidéo", async ({ page }) => {
  await ouvrir(page);
  const d = accueil(page);
  await expect(d.getByRole("heading", { name: "Bienvenue dans GCC" })).toBeVisible();
  await expect(d.locator('img[src*="logo"]')).toBeVisible();
  await expect(d.locator("video")).toHaveCount(0);
});

for (const [nom, profil] of Object.entries(PROFILS)) {
  test(`${nom} : chaque écran après le premier porte le bon extrait, dans la disposition du projet`, async ({ page }, info: TestInfo) => {
    const dispo = DISPOSITION[info.project.name];
    expect(dispo).toBeTruthy();
    await ouvrir(page, profil);
    const cartes = cartesDe(profil);
    const total = await totalEcrans(page);
    // Bienvenue, Où trouver quoi, les cartes, Notifications si proposées, C'est parti.
    const notifs = total - 3 - cartes.length;
    expect([0, 1]).toContain(notifs);
    const attendus: Extrait[] = ["onglets", ...cartes.map(extraitAttendu), ...(notifs ? ["planning" as const] : [])];
    attendus.push(attendus.includes("melange") ? "apercu" : "melange");
    expect(attendus).toHaveLength(total - 1);

    for (let i = 0; i < attendus.length; i++) {
      await suivant(page).click();
      await expect(video(page)).toHaveCount(1);
      await expect(video(page)).toHaveAttribute("src", new RegExp(`/accueil/extraits/${attendus[i]}-${dispo}\\.mp4$`));
      await expect(video(page)).toHaveAttribute("poster", new RegExp(`/${attendus[i]}-${dispo}\\.jpg$`));
    }
    // Le dernier écran est « C'est parti ».
    await expect(accueil(page).getByRole("heading", { name: "C'est parti" })).toBeVisible();
  });
}

test("E9 : avec une carte « melange » (choriste), C'est parti montre l'aperçu", async ({ page }, info: TestInfo) => {
  await ouvrir(page, PROFILS.choriste);
  await allerA(page, "C'est parti");
  await expect(video(page)).toHaveAttribute("src", new RegExp(`/apercu-${DISPOSITION[info.project.name]}\\.mp4$`));
});

test("E9 : musicien seul (pas de carte « melange »), C'est parti montre le mélange", async ({ page }, info: TestInfo) => {
  // Sa carte service (musicien) et la carte de TEAM LOUANGE (tâches) : aucune ne montre « melange ».
  expect(cartesDe(MUSICIEN).map(extraitAttendu)).toEqual(["musicien", "taches"]);
  await ouvrir(page, MUSICIEN);
  await allerA(page, "C'est parti");
  await expect(video(page)).toHaveAttribute("src", new RegExp(`/melange-${DISPOSITION[info.project.name]}\\.mp4$`));
});

test("en 中文 : un écran après le premier a sa vidéo, le premier garde le logo", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await signInAs(page, MUSICIEN, {}, "/moi");
  const d = accueil(page);
  await expect(d).toBeVisible();
  await expect(d.getByRole("heading", { name: "欢迎使用 GCC" })).toBeVisible();
  await expect(d.locator("video")).toHaveCount(0);
  await expect(d.locator('img[src*="logo"]')).toBeVisible();
  await d.getByRole("button", { name: "下一步" }).click();
  await expect(d.locator("video")).toHaveCount(1);
  await expect(d.locator("video")).toHaveAttribute("src", /\/onglets-/);
  await expect(d.locator("video")).toHaveAttribute("aria-label", /导航栏预览/);
});

test("l'extrait tourne en boucle, muet, et se lit", async ({ page }) => {
  await ouvrir(page);
  await suivant(page).click();
  await expect(video(page)).toBeVisible();
  const h264 = await litH264(page);
  expect(await video(page).evaluate((v: HTMLVideoElement) => v.loop)).toBe(true);
  expect((await etat(page)).muted).toBe(true);
  await expect(video(page)).toHaveAttribute("aria-label", /barre de navigation/);
  await expect(accueil(page).getByRole("button", { name: /Lire la vidéo|Revoir/ })).toHaveCount(0);
  if (h264) {
    await expect.poll(async () => (await etat(page)).paused).toBe(false);
    await expect.poll(async () => (await etat(page)).currentTime).toBeGreaterThan(0);
  }
});

test.describe("mouvement réduit", () => {
  test("pas de lecture automatique : l'affiche et le bouton « Lire la vidéo », qui donne le focus à la vidéo", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ouvrir(page);
    await suivant(page).click();
    await expect(video(page)).toBeVisible();
    await page.waitForTimeout(1000);
    const e = await etat(page);
    expect(e.paused).toBe(true);
    expect(e.currentTime).toBe(0);
    const lire = accueil(page).getByRole("button", { name: "Lire la vidéo" });
    await expect(lire).toBeVisible();
    await lire.click();
    await expect(video(page)).toBeFocused();
    if (await litH264(page)) await expect.poll(async () => (await etat(page)).paused).toBe(false);
  });
});

test("si play() est refusé : le bouton « Lire la vidéo » et la vidéo en pause", async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("refus", "NotAllowedError"));
  });
  await ouvrir(page);
  await suivant(page).click();
  await expect(accueil(page).getByRole("button", { name: "Lire la vidéo" })).toBeVisible();
  expect((await etat(page)).paused).toBe(true);
});

test("extrait introuvable : l'affiche seule, sans bouton, et la visite continue", async ({ page }) => {
  await page.route("**/accueil/extraits/*.mp4", (route) => route.fulfill({ status: 404, body: "" }));
  await ouvrir(page);
  await suivant(page).click();
  const affiche = accueil(page).locator('img[src^="/accueil/extraits/onglets-"]');
  await expect(affiche).toBeVisible();
  await expect(video(page)).toHaveCount(0);
  await expect(accueil(page).getByRole("button", { name: /Lire la vidéo/ })).toHaveCount(0);
  await expect(accueil(page).getByRole("heading", { name: "Où trouver quoi" })).toBeVisible();
  await suivant(page).click();
  await expect(affiche).toHaveCount(0);
  await expect(accueil(page).locator('img[src^="/accueil/extraits/musicien-"]')).toBeVisible();
});

test("« Suivant » démonte la vidéo de l'écran précédent : une seule à la fois", async ({ page }) => {
  await ouvrir(page);
  await suivant(page).click();
  await expect(video(page)).toHaveCount(1);
  await expect(video(page)).toHaveAttribute("src", /\/onglets-/);
  await suivant(page).click();
  await expect(video(page)).toHaveCount(1);
  await expect(video(page)).toHaveAttribute("src", /\/musicien-/);
  await accueil(page).getByRole("button", { name: "Retour" }).click();
  await expect(video(page)).toHaveCount(1);
  await expect(video(page)).toHaveAttribute("src", /\/onglets-/);
});

test("mode revoir : « Revoir la visite » sur Moi rouvre le logo, puis l'extrait des onglets", async ({ page }) => {
  await signInAs(page, { ...MUSICIEN, accueil: false }, {}, "/moi");
  await expect(page.getByRole("heading", { name: "Moi", level: 1 })).toBeVisible();
  await expect(accueil(page)).toHaveCount(0);
  await page.getByRole("button", { name: /Revoir la visite/ }).click();
  await expect(accueil(page)).toBeVisible();
  await expect(accueil(page).locator('img[src*="logo"]')).toBeVisible();
  await expect(video(page)).toHaveCount(0);
  await suivant(page).click();
  await expect(video(page)).toHaveAttribute("src", /\/onglets-/);
});

// Captures : Où trouver quoi, une carte, C'est parti — à regarder à l'œil, sur chaque projet.
const ECRANS_CAPTURES = [
  { nom: "ou-trouver-quoi", titre: "Où trouver quoi" },
  { nom: "carte", titre: "Tu joues le dimanche" },
  { nom: "cest-parti", titre: "C'est parti" },
];

test("captures des écrans avec extrait sur chaque disposition", async ({ page }, info) => {
  await ouvrir(page);
  for (const e of ECRANS_CAPTURES) {
    await allerA(page, e.titre);
    await expect(video(page)).toBeVisible();
    await capturer(page, `${info.project.name}-${e.nom}`);
  }
});

test("à 375×667 (iPhone SE), propre au téléphone : « Suivant » visible, rien ne déborde", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "propre au téléphone");
  await page.setViewportSize({ width: 375, height: 667 });
  await ouvrir(page);
  for (const e of ECRANS_CAPTURES) {
    await allerA(page, e.titre);
    await expect(video(page)).toBeVisible();
    await expect(avancer(page)).toBeInViewport();
    // L'écran entre d'un glissé de 12 px : on mesure une fois posé.
    await expect.poll(() => accueil(page).evaluate((el) => el.scrollWidth - el.clientWidth), { message: e.titre }).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.body.scrollWidth <= document.body.clientWidth)).toBe(true);
    await capturer(page, `iphone-se-${e.nom}`);
  }
});
