import { expect, test, type Page } from "@playwright/test";

// Connexion et inscription (docs/spec-corrections-design/eglise.md, T1 : eglise-11, eglise-13, eglise-16, et
// l'espacement d'eglise-12) : un visiteur, rien d'autre que le formulaire ne mène à /login ; « Mot de passe oublié ? »
// sous le champ, « Créer un compte » seul sous le bouton, « ‹ Chants » en retour ; formulaire de 420 px dès 1 024 px ;
// le nom du site en chinois s'écrit 「GCC 敬拜」 partout. Aucun compte, rien ne sort sur le réseau.

const LARGEUR_LG = 1024;

async function sansReseau(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  // Inscriptions ouvertes : le document de réglage est absent (aucune lecture de la vraie base).
  await page.route(/firestore\.googleapis\.com/, (r) => r.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
}
async function enChinois(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN") } catch { /* stockage refusé */ } });
}
const larg = (page: Page) => page.viewportSize()!.width;
const grand = (page: Page) => larg(page) >= LARGEUR_LG;

test.describe("eglise-11 : plus de bouton « Connexion » sur /login et /signup", () => {
  for (const [langue, nom] of [["fr", "Connexion"], ["zh", "登录"]] as const) {
    for (const chemin of ["/login", "/signup"]) {
      test(`${chemin} en ${langue === "fr" ? "français" : "中文"} : aucun lien visible ne mène à /login hors du formulaire`, async ({ page }) => {
        await sansReseau(page);
        if (langue === "zh") await enChinois(page);
        await page.goto(chemin);
        await expect(page.getByTestId("panneau-marque")).toBeVisible();
        await expect(page.getByTestId("formulaire-connexion")).toBeVisible();
        await expect(page.getByRole("link", { name: nom, exact: true })).toHaveCount(0);
        // Les liens vers /login hors du formulaire (en-tête, barre latérale) : aucun.
        const hors = page.locator('a[href="/login"], a[href^="/login?"]').filter({ visible: true }).and(page.locator(":not([data-testid=formulaire-connexion] *)"));
        await expect(hors).toHaveCount(0);
      });
    }
  }

  test("sur une autre page, le visiteur voit toujours « Connexion »", async ({ page }) => {
    await sansReseau(page);
    await page.goto("/songs");
    await expect(page.getByRole("link", { name: "Connexion", exact: true }).filter({ visible: true }).first()).toBeVisible();
  });
});

test.describe("eglise-13 : un lien à sa place", () => {
  test("« ‹ Chants » en haut mène à /setlists, « Créer un compte » à /signup", async ({ page }) => {
    await sansReseau(page);
    await page.goto("/login");
    const formulaire = page.getByTestId("formulaire-connexion");
    const retour = formulaire.getByRole("link", { name: "Chants", exact: true });
    await expect(retour).toHaveAttribute("href", /^\/setlists\/?$/);
    const creer = formulaire.getByRole("link", { name: "Créer un compte", exact: true });
    await expect(creer).toHaveAttribute("href", /^\/signup\/?$/);
    await expect(formulaire.getByText("Pas encore de compte ?")).toBeVisible();
    // Le retour est au-dessus du titre ; « Créer un compte » sous le bouton ; plus de pile de trois liens.
    const [r, h, b, c] = [(await retour.boundingBox())!, (await formulaire.getByRole("heading", { level: 1 }).boundingBox())!, (await formulaire.getByRole("button", { name: "Se connecter" }).boundingBox())!, (await creer.boundingBox())!];
    expect(r.y + r.height, "retour au-dessus du titre").toBeLessThanOrEqual(h.y + 1);
    expect(c.y, "« Créer un compte » sous « Se connecter »").toBeGreaterThan(b.y + b.height - 1);
    expect(c.height, "zone de 44 px").toBeGreaterThanOrEqual(44);
    expect(await creer.evaluate((el) => ({ gras: Number(getComputedStyle(el).fontWeight) >= 600, souligne: getComputedStyle(el).textDecorationLine }))).toEqual({ gras: true, souligne: "underline" });
    await expect(formulaire.getByRole("link")).toHaveCount(2);
    await creer.click();
    await expect(page).toHaveURL(/\/signup\/?$/);
  });

  test("« Mot de passe oublié ? » est un bouton sous le champ mot de passe, à droite ; sans courriel il le dit", async ({ page }) => {
    await sansReseau(page);
    await page.goto("/login");
    const formulaire = page.getByTestId("formulaire-connexion");
    const oublie = formulaire.getByRole("button", { name: "Mot de passe oublié ?" });
    await expect(oublie).toBeVisible();
    const [champ, o] = [(await formulaire.getByLabel("Mot de passe").boundingBox())!, (await oublie.boundingBox())!];
    expect(o.y, "sous le champ").toBeGreaterThan(champ.y + champ.height - 1);
    expect(o.height, "zone de 44 px").toBeGreaterThanOrEqual(44);
    expect(Math.abs(o.x + o.width - (champ.x + champ.width)), "aligné à droite du champ").toBeLessThanOrEqual(1);
    await oublie.click();
    await expect(formulaire.getByText("Saisis d'abord ton email ci-dessus.")).toBeVisible();
  });

  test("en 中文 : « ‹ 诗歌 », « 还没有账号？注册 »", async ({ page }) => {
    await sansReseau(page);
    await enChinois(page);
    await page.goto("/login");
    const formulaire = page.getByTestId("formulaire-connexion");
    await expect(formulaire.getByRole("link", { name: "诗歌", exact: true })).toHaveAttribute("href", /^\/setlists\/?$/);
    await expect(formulaire.getByText("还没有账号？")).toBeVisible();
    await expect(formulaire.getByRole("link", { name: "注册", exact: true })).toHaveAttribute("href", /^\/signup\/?$/);
    await expect(formulaire.getByRole("button", { name: "忘记密码？" })).toBeVisible();
  });

  test("le formulaire fait 420 px dès 1 024 px, sinon il garde sa largeur ; le titre est à 30 px", async ({ page }) => {
    await sansReseau(page);
    await page.goto("/login");
    const formulaire = page.getByTestId("formulaire-connexion");
    await expect(formulaire).toBeVisible();
    const largeur = Math.round((await formulaire.boundingBox())!.width);
    // `text-2xl` vaut déjà 30 px dans l'échelle du site (tailwind.config.ts) : le titre y est à toutes les tailles.
    expect(await formulaire.getByRole("heading", { level: 1 }).evaluate((el) => getComputedStyle(el).fontSize)).toBe("30px");
    if (grand(page)) expect(largeur).toBe(420);
    else expect(largeur).toBeLessThanOrEqual(380);
    const { large, fenetre } = await page.evaluate(() => ({ large: document.documentElement.scrollWidth, fenetre: window.innerWidth }));
    expect(large).toBeLessThanOrEqual(fenetre);
  });
});

test.describe("eglise-16 : 「GCC 敬拜」 partout", () => {
  test("/login en 中文 : « GCC » en encre et 「敬拜」 en couleur de marque dans le panneau", async ({ page }) => {
    await sansReseau(page);
    await enChinois(page);
    await page.goto("/login");
    const nom = page.getByTestId("panneau-marque").locator("p").first();
    await expect(nom).toHaveText("GCC 敬拜");
    await expect(nom.locator("span.text-brand")).toHaveText("敬拜");
  });

  test("/signup en 中文 : le sous-titre dit 「GCC 敬拜——仅限教会成员」", async ({ page }) => {
    await sansReseau(page);
    await enChinois(page);
    await page.goto("/signup");
    await expect(page.getByText("GCC 敬拜——仅限教会成员")).toBeVisible();
  });
});

test("eglise-12 : le panneau de marque perd 8 px de marge verticale sous 640 px (py-6)", async ({ page }) => {
  test.skip(larg(page) >= 640, "téléphone seulement");
  await sansReseau(page);
  await page.goto("/login");
  const haut = await page.getByTestId("panneau-marque").evaluate((el) => getComputedStyle(el).paddingTop);
  expect(haut).toBe("24px");
});
