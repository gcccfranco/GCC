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

// C6 : la forme est retenue aussi. Un responsable (profil fictif) retrouve, pendant l'attente, le sélecteur
// App · Back-Office et les entrées du Back-Office ; un membre ordinaire n'a pas le sélecteur.
const FORME = "gcc-forme";
const RESPONSABLE: FakeProfile = {
  uid: "u-ondine", email: "ondine@example.com", firstName: "Ondine", lastName: "T.", planningName: "Ondine T.",
  responsabilites: ["planning:culte"],
};
const selecteur = (page: Page) => page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true });
const forme = (page: Page) => page.evaluate((c) => localStorage.getItem(c), FORME);

/** Responsable connecté au Back-Office (sa forme est retenue), puis page rechargée avec Firebase retenu. */
async function rouvrirResponsableEnAttente(page: Page, vers = "/back-office") {
  await sansSheet(page);
  await signInAs(page, RESPONSABLE, {}, vers);
  await expect.poll(() => forme(page)).not.toBeNull();
  const liberer = await retenirFirebase(page);
  await page.reload();
  return liberer;
}

test("responsable : pendant l'attente, le sélecteur App · Back-Office et les entrées du Back-Office sont là", async ({ page }, info) => {
  const liberer = await rouvrirResponsableEnAttente(page);
  expect(JSON.parse((await forme(page))!)).toEqual({ responsable: true, messages: true, entreesBackOffice: ["afaire", "calendrier", "planning", "messages"] });
  await expect(page.locator("html")).toHaveAttribute("data-responsable", "1");
  await expect(connexion(page)).not.toBeVisible();
  await expect(selecteur(page)).toBeVisible();
  const barre = page.getByTestId(aBarreLaterale(info) ? "barre-laterale" : "barre-du-bas");
  for (const nom of ["À faire", "Calendrier", "Planning"]) await expect(barre.getByRole("link", { name: nom, exact: true })).toBeVisible();
  // Messages : une entrée de la barre latérale, sinon l'icône de l'en-tête ; sans pastille pendant l'attente.
  if (aBarreLaterale(info)) await expect(barre.getByRole("link", { name: "Messages", exact: true })).toBeVisible();
  else await expect(page.getByTestId("icone-messages")).toBeVisible();
  await expect(page.getByTestId("pastille")).toHaveCount(0);
  await page.screenshot({ path: `test-results/chargement/responsable-${info.project.name}.png` });
  liberer();
  // Le profil arrivé, la forme réelle remplace la forme retenue : la même.
  await expect(selecteur(page)).toBeVisible();
  for (const nom of ["À faire", "Calendrier", "Planning"]) await expect(barre.getByRole("link", { name: nom, exact: true })).toBeVisible();
});

test("responsable : l'attente sur une page de l'App garde le sélecteur", async ({ page }) => {
  const liberer = await rouvrirResponsableEnAttente(page, "/songs");
  await expect(selecteur(page)).toBeVisible();
  liberer();
  await expect(selecteur(page)).toBeVisible();
});

test("membre ordinaire : pas de sélecteur pendant l'attente, et une forme retenue sans responsable", async ({ page }) => {
  const liberer = await rouvrirEnAttente(page);
  expect(JSON.parse((await forme(page))!)).toEqual({ responsable: false, messages: false, entreesBackOffice: [] });
  await expect(page.locator("html")).not.toHaveAttribute("data-responsable", "1");
  await expect(page.getByRole("group", { name: "Choisir l'espace" })).toHaveCount(0);
  liberer();
  await expect(page.getByRole("group", { name: "Choisir l'espace" })).toHaveCount(0);
});

test("forme illisible : comportement d'avant (forme du membre ordinaire pendant l'attente)", async ({ page }) => {
  const liberer = await rouvrirResponsableEnAttente(page, "/songs");
  await page.evaluate((c) => localStorage.setItem(c, "{pas du json"), FORME);
  await page.reload();
  await expect(connexion(page)).not.toBeVisible();
  liberer();
  // Le profil arrivé, la vraie forme est retenue de nouveau.
  await expect(selecteur(page)).toBeVisible();
  await expect.poll(() => forme(page)).toContain('"responsable":true');
});

test("la forme est effacée à la déconnexion", async ({ page }) => {
  await sansSheet(page);
  await signInAs(page, RESPONSABLE, {}, "/songs");
  await expect.poll(() => forme(page)).not.toBeNull();
  await page.goto("/moi");
  await page.getByText("Déconnexion", { exact: true }).click();
  await expect.poll(() => forme(page)).toBeNull();
  await expect(page.locator("html")).not.toHaveAttribute("data-responsable", "1");
});

test("session expirée : la forme s'efface avec la marque", async ({ page }) => {
  await sansSheet(page);
  await page.addInitScript(([c, f]) => { localStorage.setItem(c, "1"); localStorage.setItem(f, JSON.stringify({ responsable: true, messages: false, entreesBackOffice: ["afaire"] })); }, [MARQUE, FORME]);
  await page.goto("/songs");
  await expect.poll(() => forme(page)).toBeNull();
});
