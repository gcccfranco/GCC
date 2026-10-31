import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot CH — plus d'écran « Chargement… » au démarrage (docs/spec-chargement.md, C1 à C5).
// Un membre qui rouvre le site (marque locale `gcc-connecte`) voit la forme du membre pendant que Firebase
// lit sa session : jamais l'en-tête des visiteurs, jamais le mot « Chargement… ». Firebase est retardé par
// le test (les routes identitytoolkit / securetoken), puis libéré.

const MEMBRE: FakeProfile = { uid: "u-salome", email: "salome@example.com", firstName: "Salomé", lastName: "V.", planningName: "Salomé V." };
const MARQUE = "gcc-connecte";

const aBarreLaterale = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
/** Le lien de connexion des visiteurs, dans l'en-tête ou dans le pied de la barre latérale. */
const connexion = (page: Page) => page.locator('a[href="/login"], a[href="/login/"]');

/** Retient les réponses de Firebase Auth jusqu'à `liberer()` ; à poser après `signInAs` (la dernière route gagne). */
async function retenirFirebase(page: Page) {
  let liberer = () => {};
  const barriere = new Promise<void>((r) => { liberer = r; });
  await page.route(/identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/, async (route) => {
    await barriere;
    await route.fallback();
  });
  return liberer;
}

/** Membre connecté, puis page rechargée avec Firebase retenu : rend la fonction qui le libère. */
async function rouvrirEnAttente(page: Page, langue?: string) {
  await sansSheet(page);
  if (langue) await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await signInAs(page, MEMBRE, {}, "/songs");
  const liberer = await retenirFirebase(page);
  await page.reload();
  return liberer;
}

async function attendu(page: Page, info: TestInfo, mot: string) {
  // Ni l'en-tête des visiteurs ni le mot de chargement, pendant l'attente.
  await expect(connexion(page)).not.toBeVisible();
  await expect(page.getByText(mot, { exact: true })).toHaveCount(0);
  // La forme du membre : barre du bas (téléphone, tablette portrait) ou barre latérale (grand écran).
  if (aBarreLaterale(info)) await expect(page.getByTestId("barre-laterale").getByRole("link").first()).toBeVisible();
  else await expect(page.getByTestId("barre-du-bas")).toBeVisible();
}

test("membre : pendant l'attente de Firebase, forme du membre, ni en-tête visiteur ni « Chargement… »", async ({ page }, info) => {
  const liberer = await rouvrirEnAttente(page);
  await attendu(page, info, "Chargement…");
  await page.screenshot({ path: `test-results/chargement/${info.project.name}.png` });
  liberer();
  await expect(connexion(page)).not.toBeVisible();
  await expect(page.getByTestId(aBarreLaterale(info) ? "barre-laterale" : "barre-du-bas")).toBeVisible();
});

test("membre en chinois : pendant l'attente, ni 登录 ni 加载中…", async ({ page }, info) => {
  const liberer = await rouvrirEnAttente(page, "zh-CN");
  await attendu(page, info, "加载中…");
  await expect(page.getByText("Chargement…", { exact: true })).toHaveCount(0);
  liberer();
});

test("visiteur sans marque : l'en-tête des visiteurs, comme avant", async ({ page }) => {
  await sansSheet(page);
  await page.goto("/songs");
  expect(await page.evaluate((c) => localStorage.getItem(c), MARQUE)).toBeNull();
  await expect(connexion(page).filter({ visible: true }).first()).toBeVisible();
  // Un visiteur a sa propre barre du bas (entrées des visiteurs), comme avant le lot CH : rien à vérifier de plus ici.
});

test("session expirée (C5) : la marque dit « connecté », Firebase rend personne, la page passe visiteur et la marque s'efface", async ({ page }) => {
  await sansSheet(page);
  await page.addInitScript((c) => localStorage.setItem(c, "1"), MARQUE);
  await page.goto("/songs");
  await expect(connexion(page).filter({ visible: true }).first()).toBeVisible();
  await expect.poll(() => page.evaluate((c) => localStorage.getItem(c), MARQUE)).toBeNull();
  await expect(page.locator("html")).not.toHaveAttribute("data-connecte", "1");
});

test("la marque est posée à la connexion, effacée à la déconnexion", async ({ page }) => {
  await sansSheet(page);
  await signInAs(page, MEMBRE, {}, "/songs");
  await expect.poll(() => page.evaluate((c) => localStorage.getItem(c), MARQUE)).toBe("1");
  await page.goto("/moi");
  await page.getByText("Déconnexion", { exact: true }).click();
  await expect.poll(() => page.evaluate((c) => localStorage.getItem(c), MARQUE)).toBeNull();
});
