import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// CI-19 (A10) : quand la base répond 429 ou 5xx sur la lecture du profil, l'écran dit « profil illisible » avec
// « Réessayer » (jamais « Complète ton profil », jamais un formulaire vide enregistrable). Un profil réellement
// absent (404) garde « Complète ton profil ». Fausse base, nom fictif. Trois appareils.

const CLEMENCE: FakeProfile = {
  uid: "uid-clemence", email: "clemence@example.com", firstName: "Clémence", lastName: "Arvel", planningName: "Clémence A.",
};

const TEXTES = {
  fr: { illisible: "Ton profil ne peut pas être lu pour le moment (réseau ou base indisponible).", reessayer: "Réessayer", complete: "Complète ton profil pour voir les setlists de tes services." },
  "zh-CN": { illisible: "暂时无法读取你的资料（网络或数据库不可用）。", reessayer: "重试", complete: "请完善个人资料以查看你服事的歌单。" },
} as const;

/** Connecte le compte, puis fait répondre `statut` à GET users/{uid} tant que `etat.actif` ; renvoie l'état. */
async function ouvrir(page: Page, langue: keyof typeof TEXTES, statut: number, chemin: string) {
  await page.addInitScript((l) => { try { localStorage.setItem("i18nextLng", l); } catch {} }, langue);
  await signInAs(page, CLEMENCE, {}, "/guide");
  const etat = { actif: true };
  await page.route(new RegExp(`firestore\\.googleapis\\.com/.*/documents/users/${CLEMENCE.uid}$`), (route) => {
    if (route.request().method() !== "GET" || !etat.actif) return route.fallback();
    return route.fulfill({ status: statut, contentType: "application/json", body: JSON.stringify({ error: { code: statut, message: "x" } }) });
  });
  await page.goto(chemin);
  return etat;
}

for (const langue of ["fr", "zh-CN"] as const) {
  const T = TEXTES[langue];

  test(`profil illisible (429) : /setlists dit « profil illisible », Réessayer relit (${langue})`, async ({ page }) => {
    const etat = await ouvrir(page, langue, 429, "/setlists");
    await expect(page.getByText(T.illisible)).toBeVisible();
    await expect(page.getByRole("button", { name: T.reessayer })).toBeVisible();
    await expect(page.getByText(T.complete)).toHaveCount(0);
    etat.actif = false;
    await page.getByRole("button", { name: T.reessayer }).click();
    await expect(page.getByText(T.illisible)).toHaveCount(0);
    await expect(page.getByText(T.complete)).toHaveCount(0);
  });

  test(`profil illisible (503) : /setlists/new dit « profil illisible » (${langue})`, async ({ page }) => {
    await ouvrir(page, langue, 503, "/setlists/new");
    await expect(page.getByText(T.illisible)).toBeVisible();
    await expect(page.getByText(T.complete)).toHaveCount(0);
  });

  test(`profil illisible (429) : /profil sans formulaire ni Enregistrer, Réessayer relit (${langue})`, async ({ page }) => {
    const etat = await ouvrir(page, langue, 429, "/profil");
    await expect(page.getByText(T.illisible)).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator("input")).toHaveCount(0);
    await expect(page.locator("button[type=submit]")).toHaveCount(0);
    // Réessayer relit : la base répond, le vrai profil revient dans le formulaire.
    etat.actif = false;
    await page.getByRole("button", { name: T.reessayer }).click();
    await expect(page.getByText(T.illisible)).toHaveCount(0);
    await expect(page.locator("input").first()).toBeVisible();
  });

  test(`profil absent (404) : /setlists garde « Complète ton profil » (${langue})`, async ({ page }) => {
    await ouvrir(page, langue, 404, "/setlists");
    await expect(page.getByText(T.complete)).toBeVisible();
    await expect(page.getByText(T.illisible)).toHaveCount(0);
  });
}
