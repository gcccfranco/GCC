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

// ─── OG-D : Personnes et Sans compte ─────────────────────────────────────────

const JOEL: FakeProfile & Record<string, unknown> = {
  uid: "joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", planningName: "Joël F.", serviceRoles: {},
  groupe: "paix", remplitParRole: ["paix"], publieParRole: ["paix"], notifieParRole: ["Groupe Paix"], dansEquipes: ["comite-paix"],
};
const DOCS_PERSONNES = {
  "groupes/paix": PAIX,
  ...Object.fromEntries([JOEL, { uid: "ana", email: "ana@example.com", firstName: "Ana", lastName: "T.", planningName: "Ana T.", serviceRoles: {}, groupe: "joie" }]
    .map(({ uid, ...p }) => [`users/${uid}`, p as Record<string, unknown>])),
};

async function ouvrirPersonnes(page: Page, to: string, zh = false) {
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route("**/api/equipes/groupes", (route) => route.fulfill({ json: { ok: true, maj: 0, ignores: [] } }));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, DOCS_PERSONNES, to);
}

test("Personnes : la fiche (Groupe, Rôles, Droits) sans débordement ; « Changer de groupe » en panneau (grand) ou feuille", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes?uid=joel");
  const fiche = page.locator("article");
  await expect(fiche.getByRole("region", { name: "Rôles dans le Groupe Paix" })).toBeVisible();
  await verifierSansDebordement(page);
  await capture(page, "personne-fiche");
  await fiche.getByRole("button", { name: "Changer de groupe" }).click();
  const panneau = page.getByRole("dialog");
  await expect(panneau.getByRole("button", { name: "Sans groupe" })).toBeVisible();
  const boite = (await panneau.boundingBox())!;
  const largeur = page.viewportSize()!.width;
  if (grand()) expect(Math.round(boite.width), "panneau de 420 px à droite").toBe(420);
  else expect(Math.round(boite.width), "feuille sur toute la largeur").toBeGreaterThanOrEqual(largeur - 1);
  await capture(page, "personne-changer");
  await page.keyboard.press("Escape");
  await verifierSansDebordement(page);
});

test("Personnes en 中文 : la fiche et le panneau se lisent sans débordement", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes?uid=joel", true);
  await expect(page.locator("article").getByRole("region", { name: "在和平团契的岗位" })).toBeVisible();
  await expect(page.locator("article")).toContainText("更换团契");
  await verifierSansDebordement(page);
  await capture(page, "personne-fiche-zh");
});

test("Personnes › Sans compte (ex-Planning › Sans compte) : le bloc des titulaires sans compte sans débordement", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes/sans-compte");
  await expect(page.getByRole("region", { name: /^Titulaires sans compte/ })).toContainText("Inès V.");
  await verifierSansDebordement(page);
  await capture(page, "sans-compte");
});

// ─── OG-E : App › Équipes ────────────────────────────────────────────────────

test("App › Équipes : un groupe en lecture, colonnes de rôles, sélecteur sur une rangée, bandeau « Toi », sans débordement", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const membre = { uid: "joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", planningName: "Joël F.", serviceRoles: {}, groupe: "paix" };
  const { uid: _u, ...profil } = membre;
  await signInAs(page, { ...ADMIN, ...membre }, { "groupes/paix": PAIX, "users/joel": profil as Record<string, unknown> }, "/equipes");
  await expect(page.locator("[data-role]").first()).toBeVisible();
  await expect(page.locator("[data-moi-bandeau]")).toBeVisible();
  await verifierAgencement(page);
  expect(await colonnesDeRoles(page), "colonnes de rôles").toBe(COLONNES[projet()]);
  const boutons = page.getByRole("group", { name: "Organigrammes", exact: true }).getByRole("button");
  const ys = await boutons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
  expect(new Set(ys).size, "le sélecteur tient sur une rangée").toBe(1);
  await verifierSansDebordement(page);
  await capture(page, "app-groupe");
});

test("App › Équipes : l'église garde son bandeau, le sélecteur à gauche et Équipes · Musiciens à droite en grand", async ({ page }) => {
  await signInAs(page, { ...ADMIN, uid: "yann", email: "yann@example.com" }, { "users/yann": { email: "yann@example.com", firstName: "Yann", lastName: "M.", planningName: "Yann M.", serviceRoles: {} } }, "/equipes");
  await expect(page.getByTestId("bandeau-equipes")).toBeVisible();
  const selecteur = page.getByRole("group", { name: "Organigrammes", exact: true });
  const vues = page.getByRole("group", { name: "Vue" });
  const a = (await selecteur.boundingBox())!;
  const b = (await vues.boundingBox())!;
  if (grand()) {
    expect(b.x, "Équipes · Musiciens à droite du sélecteur").toBeGreaterThan(a.x + a.width - 1);
    expect(Math.abs(a.y - b.y), "sur la même rangée").toBeLessThan(24);
  } else expect(b.y, "dessous").toBeGreaterThan(a.y);
  await verifierSansDebordement(page);
  await capture(page, "app-eglise");
});

// ─── OG-F : « Choisir » relié à un rôle ──────────────────────────────────────

test("Planning Paix : « Choisir » relié au rôle (menu contre la case en grand, feuille sinon), groupe déplié, sans débordement", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const compte = (uid: string, prenom: string, nom: string, o: Record<string, unknown> = {}) =>
    [`users/${uid}`, { email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`, serviceRoles: {}, groupe: "paix", ...o }] as const;
  const ruth = { uid: "ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K.", groupe: "paix", remplitParRole: ["paix"], referentDe: ["comite-paix"] };
  await signInAs(page, { ...ruth }, {
    ...Object.fromEntries([compte("joel", "Joël", "F."), compte("hugo", "Hugo", "L."), compte("sam", "Sam", "R."), compte("lea", "Léa", "M.")]),
    "groupes/paix": PAIX,
    "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", musiciens: "Joël F." },
  }, "/back-office/planning/groupes");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  const caseVide = page.locator('[data-case="2027-01-17|musiciens"]').filter({ visible: true });
  await caseVide.getByRole("button").first().click();
  const liste = page.getByRole("listbox", { name: /^Titulaires du rôle/ });
  await expect(liste).toBeVisible();
  await page.getByRole("button", { name: /^Voir tout le groupe/ }).click();
  await expect(page.getByRole("option").first()).toBeVisible();
  const boite = (await page.getByRole("combobox").evaluate((e) => {
    const m = e.closest("[role=dialog]") as HTMLElement;
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, sw: m.scrollWidth - m.clientWidth };
  }));
  const vp = page.viewportSize()!;
  expect(boite.x, "dans l'écran, à gauche").toBeGreaterThanOrEqual(0);
  expect(boite.x + boite.w, "dans l'écran, à droite").toBeLessThanOrEqual(vp.width + 1);
  expect(boite.y, "dans l'écran, en haut").toBeGreaterThanOrEqual(-1);
  expect(boite.sw, "sans débordement horizontal").toBeLessThanOrEqual(1);
  await capture(page, "choisir-relie");
});
