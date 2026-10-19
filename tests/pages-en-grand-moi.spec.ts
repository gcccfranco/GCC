import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { abonneAuxNotifications, signInAs, ADMIN_EMAIL, type FakeProfile } from "./helpers/fakeSession";

// Lot U4 bis, tranche B5 — Moi, profil, connexion (docs/spec-pages-en-grand.md, Q9, Q10, Q13 ;
// planches `moi-*`, `notifications-telephone`, `profil-*`, `connexion-*`, `inscription-*`).
// Moi : carte du compte ; trois colonnes en grand, deux sur tablette portrait, une sur téléphone ;
// Réglages = Notifications · Langue · Thème, « Notifications » ouvre les réglages de PushToggle
// (feuille sur téléphone, panneau ailleurs). Profil : deux colonnes dès la tablette portrait (la carte
// Notifications revient avec la v18, A13). Connexion et inscription : écran partagé dès la tablette paysage, la marque en
// haut ailleurs ; titre « Connexion » (登录). Firestore, Sheet et abonnement simulés ; personnes fictives.

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Noé", lastName: "T.", planningName: "Noé T.",
  serviceRoles: { "Culte Francophone": ["musicien"], "Groupe Fidélité": ["musicien"], "Campus": ["presidence", "musicien"] },
};
const MEMBRE: FakeProfile = {
  uid: "uid-membre", email: "lea@example.com", firstName: "Léa", lastName: "M.", planningName: "Léa M.",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
};

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand"; // ordinateur (1 280 px), ordinateur-1440, tablette-paysage
}
const boite = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;
const sansDefilementHorizontal = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, {}, to);
}

const compte = (page: Page) => page.getByRole("region", { name: "Mon compte" });
const reglages = (page: Page) => page.getByRole("region", { name: "Réglages" });

test.describe("Moi (Q9)", () => {
  test("la carte du compte : nom, e-mail, rôle, nom dans les plannings, services et rôles, « Mon profil »", async ({ page }) => {
    await ouvrir(page, ADMIN, "/moi");
    const c = compte(page);
    await expect(c.getByRole("heading", { name: "Noé T." })).toBeVisible();
    await expect(c.getByText("Admin", { exact: true })).toBeVisible();
    await expect(c.getByText("Ton nom dans les plannings")).toBeVisible();
    await expect(c.getByText("Noé T.", { exact: true }).last()).toBeVisible();
    await expect(c.getByTestId("service-role")).toHaveText([
      "Culte Franco · Musicien",
      "Campus · Présidence, Musicien",
      "Groupe Fidélité · Musicien",
    ]);
    await expect(c.getByRole("link", { name: "Mon profil" })).toHaveAttribute("href", /^\/profil\/?$/);
    await capture(page, "b5-moi");
  });

  test("un membre n'a pas de pastille de rôle", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/moi");
    await expect(compte(page).getByRole("heading", { name: "Léa M." })).toBeVisible();
    await expect(compte(page).getByText("lea@example.com"), "l'e-mail du compte").toBeVisible();
    await expect(compte(page).getByText("Admin", { exact: true })).toHaveCount(0);
    await expect(compte(page).getByTestId("service-role")).toHaveText(["Culte Franco · Choriste"]);
  });

  // Agencement v18, A12 : les colonnes de Q9 deviennent le compte et les réglages à gauche, les aperçus
  // à droite (détail dans agencement-v18-moi.spec.ts).
  test("disposition (v18, A12) : compte et réglages à gauche en grand, côte à côte sur tablette portrait ; une colonne sur téléphone", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/moi");
    const c = await boite(compte(page));
    const services = await boite(page.getByRole("region", { name: "Mes services", exact: true }));
    const r = await boite(reglages(page));
    const deconnexion = await boite(page.getByRole("button", { name: "Déconnexion" }));
    const d = disposition(info);
    if (d === "grand") {
      expect(services.x, "les aperçus à droite du compte").toBeGreaterThan(c.x + c.width - 1);
      expect(Math.abs(r.x - c.x), "les réglages sous le compte").toBeLessThan(2);
      expect(r.y).toBeGreaterThan(c.y + c.height - 1);
      expect(deconnexion.y, "la déconnexion sous les réglages").toBeGreaterThan(r.y + r.height - 1);
    } else if (d === "tablette") {
      expect(r.x, "les réglages à droite du compte").toBeGreaterThan(c.x + c.width - 1);
      expect(Math.abs(r.y - c.y)).toBeLessThan(2);
      expect(services.y, "les aperçus dessous").toBeGreaterThan(c.y + c.height - 1);
      expect(deconnexion.x, "la déconnexion à droite").toBeGreaterThan(c.x + c.width - 1);
    } else {
      expect(services.y, "une colonne : les aperçus sous le compte").toBeGreaterThan(c.y + c.height - 1);
      expect(r.y, "puis les réglages").toBeGreaterThan(services.y);
      expect(deconnexion.y, "la déconnexion en dernier").toBeGreaterThan(r.y + r.height - 1);
    }
    expect(await sansDefilementHorizontal(page), "pas de défilement horizontal").toBe(true);
  });

  test("Réglages = Notifications · Langue · Thème ; « Notifications » ouvre ses réglages", async ({ page }, info) => {
    await abonneAuxNotifications(page);
    await ouvrir(page, MEMBRE, "/moi");
    const r = reglages(page);
    await expect(r.getByRole("button", { name: /Notifications/ })).toContainText("Activées");
    await expect(r.getByText("Langue")).toBeVisible();
    await expect(r.getByText("Thème")).toBeVisible();
    const lignes = await r.locator(".group-row").allInnerTexts();
    expect(lignes.map((l) => l.split("\n")[0])).toEqual(["Notifications", "Langue", "Thème"]);

    await r.getByRole("button", { name: /Notifications/ }).click();
    const panneau = page.getByRole("dialog", { name: "Notifications" });
    await expect(panneau).toBeVisible();
    await expect(panneau.getByRole("switch", { name: "Notifications" })).toBeChecked();
    await expect(panneau.getByRole("switch", { name: "Rappels de service" })).toBeChecked();
    await expect(panneau.getByRole("switch", { name: "Setlist prête" })).toBeVisible();
    // Laisser la feuille finir de monter avant de mesurer et de capturer.
    await page.waitForTimeout(600);
    const b = await boite(panneau);
    const vue = page.viewportSize()!;
    if (disposition(info) === "telephone") {
      expect(Math.abs(b.y + b.height - vue.height), "feuille posée en bas").toBeLessThan(2);
      expect(b.width).toBeGreaterThan(vue.width - 2);
    } else {
      expect(Math.abs(b.x + b.width - vue.width), "panneau collé à droite").toBeLessThan(2);
      expect(b.width, "un panneau, pas une page").toBeLessThanOrEqual(420);
      expect(b.width).toBeLessThan(vue.width * 0.6);
    }
    await capture(page, "b5-notifications");
    await page.keyboard.press("Escape");
    await expect(panneau).toHaveCount(0);
  });

  test("en 中文 : la carte et les réglages traduits", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, MEMBRE, "/moi");
    await expect(page.getByRole("region", { name: "我的账号" }).getByText("排班表中的名字")).toBeVisible();
    await expect(page.getByRole("region", { name: "设置" }).getByRole("button", { name: /通知/ })).toBeVisible();
  });
});

// Agencement v18, A13 (planche `v18-app-profil`, plus récente que Q10) : la carte Notifications revient
// sous l'identité, « Enregistrer » passe dans l'en-tête dès 768 px (détail dans agencement-v18-moi.spec.ts).
test.describe("Profil (Q10, revu par A13)", () => {
  test("la carte Notifications sous l'identité (A13)", async ({ page }) => {
    await abonneAuxNotifications(page);
    await ouvrir(page, ADMIN, "/profil");
    await expect(page.getByRole("heading", { level: 1, name: "Mon profil" })).toBeVisible();
    await expect(page.getByLabel("Prénom")).toHaveValue("Noé");
    await expect(page.getByRole("region", { name: "Notifications" }).getByRole("switch", { name: "Rappels de service" })).toBeVisible();
  });

  test("disposition : deux colonnes dès la tablette portrait (identité · services), « Enregistrer » dans l'en-tête ; une sur téléphone, « Enregistrer » en bas", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/profil");
    const identite = await boite(page.getByRole("group", { name: "Identité" }));
    const services = await boite(page.getByRole("group", { name: "Tes services et rôles" }));
    if (disposition(info) === "telephone") {
      const enregistrer = await boite(page.locator("form").getByRole("button", { name: "Enregistrer mon profil" }));
      expect(services.y, "les services sous l'identité").toBeGreaterThan(identite.y + identite.height - 1);
      expect(enregistrer.y, "« Enregistrer » en bas").toBeGreaterThan(services.y + services.height - 1);
    } else {
      const enregistrer = await boite(page.locator("header[data-entete-page]").getByRole("button", { name: "Enregistrer mon profil" }));
      expect(services.x, "les services à droite").toBeGreaterThan(identite.x + identite.width - 1);
      expect(Math.abs(services.y - identite.y)).toBeLessThan(4);
      expect(enregistrer.y + enregistrer.height, "« Enregistrer » au-dessus des cartes").toBeLessThan(identite.y);
    }
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b5-profil");
  });
});

test.describe("Connexion et inscription (Q13)", () => {
  const enPartage = (info: TestInfo) => disposition(info) === "grand";

  test("titre « Connexion », la marque « Réservé aux membres de l'église » ; écran partagé en grand", async ({ page }, info) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();
    await expect(page.getByText(/présidents de séance/)).toHaveCount(0);
    const marque = page.getByTestId("panneau-marque");
    await expect(marque.getByText("Réservé aux membres de l'église")).toBeVisible();
    await expect(marque.getByText("GCC Louange")).toBeVisible();
    const m = await boite(marque);
    const f = await boite(page.locator("form"));
    if (enPartage(info)) {
      expect(f.x, "le formulaire à droite de la marque").toBeGreaterThan(m.x + m.width - 1);
      expect(f.y, "à mi-hauteur").toBeGreaterThan(m.y);
    } else {
      expect(f.y, "la marque en haut").toBeGreaterThan(m.y + m.height - 1);
    }
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b5-connexion");
  });

  test("en 中文 : titre 登录", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "登录" })).toBeVisible();
    await expect(page.getByText("敬拜带领人员登录")).toHaveCount(0);
  });

  test("inscription : les trois étapes dans le panneau de marque ; écran partagé en grand", async ({ page }, info) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    // Inscriptions ouvertes : le document de réglage est absent (aucune lecture de la vraie base).
    await page.route(/firestore\.googleapis\.com/, (route) => route.fulfill({ status: 404, contentType: "application/json", body: "{}" }));
    await page.goto("/signup");
    await expect(page.getByRole("heading", { level: 1, name: "Créer un compte" })).toBeVisible();
    const marque = page.getByTestId("panneau-marque");
    const etapes = marque.getByTestId("etape");
    await expect(etapes).toHaveText(["1Compte", "2Identité", "3Services"]);
    await expect(etapes.nth(0)).toHaveAttribute("aria-current", "step");
    await page.getByLabel(/^Email/).fill("nouveau@example.com");
    await page.getByLabel(/^Mot de passe/).fill("secret1");
    await page.getByLabel(/^Confirmer/).fill("secret1");
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(etapes.nth(1)).toHaveAttribute("aria-current", "step");
    const m = await boite(marque);
    const f = await boite(page.getByLabel("Prénom"));
    if (enPartage(info)) expect(f.x).toBeGreaterThan(m.x + m.width - 1);
    else expect(f.y).toBeGreaterThan(m.y + m.height - 1);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "b5-inscription");
  });
});
