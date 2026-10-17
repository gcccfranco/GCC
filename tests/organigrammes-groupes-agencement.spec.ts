import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { verifierAgencement, verifierSansDebordement } from "./helpers/agencement";
import type { RoleGroupe } from "../src/types/groupe";

// Lot 2 du chantier « équipes et groupes » (docs/spec-organigrammes-groupes.md), tranche OG-C :
// l'agencement de Back-Office › Équipes › Organigramme d'un groupe, sur les cinq projets. Colonnes de
// rôles (1, 2, 3, 3, 4), En tête et comité côte à côte dès 1 024 px, sélecteur sur une rangée,
// Équipes · Musiciens à droite sur Église en grand, panneau de 420 px en grand et feuille sinon,
// formulaire et « Nommer » sans débordement. Captures : PW_CAPTURES=<dossier>, FR et 中文. Noms fictifs.

const ADMIN: FakeProfile = { uid: "adm", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T." };
const t = (nom: string, uid = "") => ({ nom, uid });
const role = (id: string, nom: string, o: Partial<RoleGroupe> = {}): RoleGroupe => ({
  id, nom, nomZh: "", places: null, comite: false, colonne: null,
  droits: { remplir: false, publier: false, notifier: false, saisirFetes: false }, titulaires: [], ...o,
});
const PAIX = {
  president: t("Ruth K.", "ruth"), vp: [t("Léa M.", "lea"), t("Clara B.", "clara")], maxVp: 3,
  roles: [
    role("r1", "Responsable louange", { nomZh: "敬拜负责人", comite: true, places: 1, droits: { remplir: true, publier: true, notifier: false, saisirFetes: false }, titulaires: [t("Joël F.", "joel")] }),
    role("r2", "Trésorerie", { nomZh: "财务", comite: true, places: 1, titulaires: [t("Inès V.")] }),
    role("r3", "Présidence de séance", { nomZh: "主领", places: 4, colonne: "presidence", titulaires: [t("Anaïs P."), t("Camille R.")] }),
    role("r4", "Musiciens", { nomZh: "司琴", places: 3, colonne: "musiciens", titulaires: [t("Joël F.", "joel"), t("Hugo L.", "hugo")] }),
    role("r5", "Orateurs", { nomZh: "讲员", colonne: "orateur", titulaires: [t("Bastien G."), t("Aurore B.")] }),
    role("r6", "Accueil", { nomZh: "招待", titulaires: [t("Sarah Y."), t("Zoé F."), t("Tom R.")] }),
    role("r7", "Repas", { nomZh: "饭食", places: 3, droits: { remplir: false, publier: false, notifier: true, saisirFetes: false }, titulaires: [t("Rose A.")] }),
    role("r8", "Chants des fêtes", { droits: { remplir: false, publier: false, notifier: false, saisirFetes: true }, titulaires: [t("Mei Z.")] }),
  ],
  updatedAt: "", parUid: "", parNom: "",
};
const COLONNES: Record<string, number> = { telephone: 1, tablette: 2, "tablette-paysage": 3, ordinateur: 3, "ordinateur-1440": 4 };
const projet = () => test.info().project.name;
const grand = () => ["tablette-paysage", "ordinateur", "ordinateur-1440"].includes(projet());

async function ouvrir(page: Page, to: string, zh = false) {
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route("**/api/equipes/groupes", (route) => route.fulfill({ json: { ok: true, maj: 0, ignores: [] } }));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, { "groupes/paix": PAIX }, to);
}

async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${projet()}.png`, fullPage: true });
}

/** Les colonnes distinctes des cartes de rôles visibles. */
async function colonnesDeRoles(page: Page): Promise<number> {
  const xs = await page.locator("[data-role]").evaluateAll((els) =>
    els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => Math.round(e.getBoundingClientRect().x)));
  return new Set(xs).size;
}

test("groupe : agencement, colonnes de rôles, En tête et comité, sélecteur sur une rangée", async ({ page }) => {
  await ouvrir(page, "/back-office/equipes?groupe=paix");
  await expect(page.locator("[data-role]").first()).toBeVisible();
  await verifierAgencement(page);
  expect(await colonnesDeRoles(page), "colonnes de rôles").toBe(COLONNES[projet()]);
  const boutons = page.getByRole("group", { name: "Organigrammes", exact: true }).getByRole("button");
  await expect(boutons).toHaveCount(6);
  const ys = await boutons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
  expect(new Set(ys).size, "le sélecteur sur une rangée").toBe(1);
  const enTete = (await page.getByRole("region", { name: "En tête", exact: true }).boundingBox())!;
  const comite = (await page.getByRole("region", { name: "Le comité", exact: true }).first().boundingBox())!;
  const large = (page.viewportSize()?.width ?? 0) >= 1024;
  if (large) expect(Math.abs(enTete.y - comite.y), "côte à côte dès 1 024 px").toBeLessThan(2);
  else expect(comite.y, "l'une sous l'autre").toBeGreaterThan(enTete.y + enTete.height - 1);
  await capture(page, "org-groupe");
});

test("Église : Équipes · Musiciens à droite du sélecteur en grand, dessous sinon", async ({ page }) => {
  await ouvrir(page, "/back-office/equipes");
  const selecteur = (await page.getByRole("group", { name: "Organigrammes", exact: true }).boundingBox())!;
  const vue = (await page.getByRole("group", { name: "Vue" }).boundingBox())!;
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    expect(Math.abs(vue.y - selecteur.y), "même rangée").toBeLessThan(4);
    expect(vue.x, "à droite").toBeGreaterThan(selecteur.x + 200);
  } else {
    expect(vue.y, "dessous").toBeGreaterThan(selecteur.y + 10);
  }
  await verifierSansDebordement(page);
  await capture(page, "org-eglise");
});

test("fiche du rôle : panneau de 420 px en grand, feuille sinon ; formulaire et « Nommer » (maxVp: 3) sans débordement", async ({ page }) => {
  await ouvrir(page, "/back-office/equipes?groupe=paix");
  await page.locator('[data-role="r4"]').click();
  const fiche = page.getByRole("dialog");
  await expect(fiche).toContainText("Droits du rôle");
  await verifierSansDebordement(page);
  await expect.poll(async () => Math.round((await fiche.boundingBox())!.width)).toBe(grand() ? 420 : page.viewportSize()!.width);
  await capture(page, "org-fiche");
  await page.keyboard.press("Escape");
  await expect(fiche).toBeHidden();

  await page.getByRole("button", { name: "Nouveau rôle" }).click();
  const form = page.getByRole("form", { name: "Nouveau rôle" });
  await expect(form.getByRole("checkbox")).toHaveCount(5);
  expect(await form.evaluate((f) => f.scrollWidth - f.clientWidth), "formulaire sans débordement").toBeLessThanOrEqual(0);
  await capture(page, "org-formulaire");
  await page.keyboard.press("Escape");
  await expect(form).toBeHidden();

  await page.getByRole("button", { name: "Nommer", exact: true }).click();
  const nommer = page.getByRole("dialog");
  await expect(nommer.getByText("Vice-présidents · au plus 3")).toBeVisible();
  // Le corps du panneau (le panneau de droite porte un prolongement hors champ, propre au tiroir).
  const corps = nommer.locator(":scope > div").last();
  expect(await corps.evaluate((f) => f.scrollWidth - f.clientWidth), "« Nommer » sans débordement").toBeLessThanOrEqual(0);
  await capture(page, "org-nommer");
  await verifierSansDebordement(page);
});

test("中文 : le groupe se lit sans débordement, sélecteur et libellés traduits", async ({ page }) => {
  await ouvrir(page, "/back-office/equipes?groupe=paix", true);
  await expect(page.getByRole("group", { name: "组织架构", exact: true }).getByRole("button", { name: "恩慈" })).toBeVisible();
  await expect(page.getByRole("region", { name: "带领", exact: true })).toBeVisible();
  // Le plafond, la case et la pastille « Saisir les chants des fêtes », sans « 主席 » en double.
  await expect(page.locator('[data-role="r8"]')).toContainText("填写节日诗歌");
  await expect(page.getByRole("region", { name: "带领", exact: true })).not.toContainText("主席 主席");
  await page.getByRole("button", { name: "任命", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("副主席 · 最多 3 位")).toBeVisible();
  await page.keyboard.press("Escape");
  await verifierSansDebordement(page);
  await capture(page, "org-groupe-zh");
});
