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
  await expect(form.getByRole("checkbox")).toHaveCount(2); // lot RS : au comité + Saisir les chants des fêtes
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

async function ouvrirPersonnes(page: Page, to: string, zh = false, csv = "") {
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route("**/api/equipes/groupes", (route) => route.fulfill({ json: { ok: true, maj: 0, ignores: [] } }));
  // `csv` : le planning du Culte Franco (onglet Franco_Louange) ; les autres onglets restent vides.
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: new URL(route.request().url()).searchParams.get("sheet") === "Franco_Louange" ? csv : "" }));
  await signInAs(page, ADMIN, DOCS_PERSONNES, to);
}

test("Personnes : la fiche (Groupe, Rôles, Droits) sans débordement ; « Changer de groupe » en panneau (grand) ou feuille", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes?uid=joel");
  const fiche = page.locator("article");
  await expect(fiche.getByRole("region", { name: "Rôles dans le Groupe Paix" })).toBeVisible();
  await verifierSansDebordement(page);
  // bo-equipes-3 : une seule colonne à toutes les tailles (1 440 px compris) ; les cartes se suivent sans se recouvrir.
  const cartes = await fiche.locator("section[aria-label]").evaluateAll((els) =>
    els.map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: r.y, bas: r.y + r.height }; }));
  expect(cartes.length).toBeGreaterThanOrEqual(4);
  expect(new Set(cartes.map((c) => c.x)).size, "toutes les cartes de la fiche sur la même colonne").toBe(1);
  const parHauteur = [...cartes].sort((a, b) => a.y - b.y);
  parHauteur.slice(1).forEach((c, i) => expect(c.y, "sans chevauchement").toBeGreaterThanOrEqual(parHauteur[i].bas - 1));
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
  // Pas de capture ici : la page montre les noms de secours du dépôt (de vrais noms).
});

// bo-equipes-6 : « Modifier » (40 px) et « Changer de groupe » (36 px) gardent leur dessin, leur zone de toucher fait 44 px.
test("toucher : « Modifier » et « Changer de groupe » ont une zone de 44 px (::after), un toucher à 21 px du centre les active", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes?uid=joel");
  const fiche = page.locator("article");
  await expect(fiche.getByRole("region", { name: "Rôles dans le Groupe Paix" })).toBeVisible();
  test.skip(!(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)), "la zone de 44 px est celle du doigt : projets au toucher");
  const modifier = fiche.getByRole("button", { name: "Modifier", exact: true });
  const changer = fiche.getByRole("button", { name: "Changer de groupe" });
  expect(Math.round((await modifier.boundingBox())!.height), "« Modifier » : 40 px de dessin").toBe(40);
  expect(Math.round((await changer.boundingBox())!.height), "« Changer de groupe » : 36 px de dessin").toBe(36);
  for (const [nom, bouton] of [["Modifier", modifier], ["Changer de groupe", changer]] as const) {
    const zone = await bouton.evaluate((el) => parseFloat(getComputedStyle(el, "::after").height));
    expect(zone, `« ${nom} » : ::after de 44 px`).toBeGreaterThanOrEqual(43.5);
  }
  const c = (await changer.boundingBox())!;
  await page.touchscreen.tap(c.x + c.width / 2, c.y + c.height / 2 + 21);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const m = (await modifier.boundingBox())!;
  await page.touchscreen.tap(m.x + m.width / 2, m.y + m.height / 2 + 21);
  await expect(page.getByRole("button", { name: "Enregistrer" })).toBeVisible();
});

// bo-equipes-12 : « Sans compte » est une liste de lecture (recherche, repères d'initiale, compteur), sans pastille d'alerte.
// Noms fictifs, inventés pour ce test, ajoutés au planning du Culte. Les plannings sans onglet lu retombent sur les données de
// secours du dépôt (de vrais noms) : AUCUNE capture de cette page, et aucun total écrit en dur (on lit celui de la page).
const PLANNING_FICTIF = [
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["11/10", "Élise Vandame", "Bastien Orlan", "", "Sébastien Tressol", "Cléo Marchal", "", "", "", "Étude de la prière", "李明华", "", ""],
  ["18/10", "(invité) Noé Prat", "", "", "Zoé Lemaire", "", "", "", "", "", "", "", ""],
].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Le nombre de noms sans compte que dit le titre de la page « Sans compte ». */
async function nombreDuTitre(page: Page): Promise<number> {
  // Le titre dit 0 tant que le planning se charge : on attend la liste.
  await expect(page.getByTestId("sans-compte-nombre")).toBeVisible();
  const titre = page.getByRole("heading", { level: 2, name: /^(Noms du planning sans compte \(\d+\)|排班表中尚无账号的名字（\d+）)$/ });
  await expect(titre).toBeVisible();
  return Number(/\d+/.exec((await titre.textContent())!)![0]);
}

test("Personnes › Sans compte : liste de lecture avec recherche, repères d'initiale et compteur ; aucune pastille ambre", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes/sans-compte", false, PLANNING_FICTIF);
  const total = await nombreDuTitre(page);
  const carte = page.getByRole("heading", { level: 2, name: /^Noms du planning sans compte/ }).locator("xpath=..");
  await expect(carte).toContainText("Page de lecture : pour lier un nom, ouvre la fiche de la personne.");
  await expect(page.getByTestId("sans-compte-nombre")).toHaveText(`${total} noms`);
  // Les repères : A à Z, puis « 中文 », puis « # » ; « Élise » et « Étude » sous E (accents pliés).
  const reperes = page.locator("[data-repere]");
  const lettres = await reperes.evaluateAll((els) => els.map((e) => e.getAttribute("data-repere")!));
  expect(lettres.slice(-2), "« 中文 » puis « # » en dernier").toEqual(["中文", "#"]);
  const alpha = lettres.slice(0, -2);
  expect(alpha, "A à Z dans l'ordre").toEqual([...alpha].sort());
  for (const l of ["B", "C", "E", "S", "Z"]) expect(alpha).toContain(l);
  await expect(page.locator('[data-repere="E"]')).toContainText("Élise Vandame");
  await expect(page.locator('[data-repere="E"]')).toContainText("Étude de la prière");
  await expect(page.locator('[data-repere="中文"]')).toContainText("李明华");
  await expect(page.locator('[data-repere="#"]')).toContainText("(invité) Noé Prat");
  // Les noms qui n'en sont pas (une étude) sont affichés comme les autres ; aucune couleur d'alerte sur la page.
  await expect(carte.locator('[class*="amber"]')).toHaveCount(0);
  const colonnes = new Set(await reperes.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x))));
  if (projet() === "telephone") expect(colonnes.size, "une colonne au téléphone").toBe(1);
  else expect(colonnes.size, "trois colonnes dès la tablette").toBe(3);
  // bo-equipes-13 : ni « en fin de ligne ni » en début de ligne (espace fine insécable de part et d'autre).
  const orphelins = await carte.locator("p").first().evaluate((p) => {
    const noeud = p.firstChild as Text;
    const haut = (i: number) => { const r = document.createRange(); r.setStart(noeud, i); r.setEnd(noeud, i + 1); return r.getClientRects()[0]?.top; };
    const sortie: string[] = [];
    for (let i = 0; i < noeud.data.length; i++) {
      const c = noeud.data[i];
      if (c === "«" && Math.abs(haut(i)! - haut(i + 1)!) > 2) sortie.push(`« orphelin à ${i}`);
      if (c === "»" && Math.abs(haut(i)! - haut(i - 1)!) > 2) sortie.push(`» orphelin à ${i}`);
    }
    return { guillemets: (noeud.data.match(/[«»]/g) ?? []).length, sortie };
  });
  expect(orphelins.guillemets, "l'aide porte bien des guillemets").toBeGreaterThanOrEqual(2);
  expect(orphelins.sortie).toEqual([]);
  await verifierSansDebordement(page);

  // La recherche ignore casse et accents, et le compteur dit « n sur total ».
  const champ = page.getByRole("searchbox", { name: "Chercher un nom" });
  expect(Math.round((await champ.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await champ.fill("SEBASTIEN tressol");
  await expect(page.getByTestId("sans-compte-nombre")).toHaveText(`1 sur ${total}`);
  await expect(page.locator("[data-repere]")).toHaveCount(1);
  await expect(carte).toContainText("Sébastien Tressol");
  await expect(carte).not.toContainText("Élise Vandame");
  await champ.fill("zzzqq");
  await expect(carte).toContainText("Aucun nom ne correspond.");
  await champ.fill("");
  await expect(page.getByTestId("sans-compte-nombre")).toHaveText(`${total} noms`);
  // Le retour est « Toutes les personnes » (bo-messages-planning-5).
  await expect(page.getByRole("link", { name: "Toutes les personnes", exact: true })).toHaveAttribute("href", /\/back-office\/equipes\/personnes\/?$/);
});

test("Personnes › Sans compte en 中文 : le repère « 中文 », le compteur filtré", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes/sans-compte", true, PLANNING_FICTIF);
  const total = await nombreDuTitre(page);
  await expect(page.locator('[data-repere="中文"]')).toContainText("李明华");
  await expect(page.getByTestId("sans-compte-nombre")).toHaveText(`${total} 个名字`);
  await page.getByRole("searchbox", { name: "搜索名字" }).fill("李明");
  await expect(page.getByTestId("sans-compte-nombre")).toHaveText(`${total} 个中的 1 个`);
  await expect(page.getByRole("link", { name: "所有人", exact: true })).toBeVisible();
  await verifierSansDebordement(page);
});

// bo-equipes-1 : l'entrée « sans compte » est une rangée de la liste (52 px, le nombre à droite, un chevron), plus un bouton de l'en-tête.
test("Personnes : la rangée « Noms du planning sans compte » ouvre la page, avec le même nombre", async ({ page }) => {
  await ouvrirPersonnes(page, "/back-office/equipes/personnes", false, PLANNING_FICTIF);
  const rangee = page.getByTestId("rangee-sans-compte");
  await expect(rangee).toContainText("Noms du planning sans compte");
  const dite = Number(/(\d+) noms? à relier/.exec((await rangee.textContent())!)![1]);
  expect(Math.round((await rangee.boundingBox())!.height)).toBe(52);
  await expect(page.locator("header[data-entete-page]").getByRole("link", { name: "Noms du planning sans compte" })).toHaveCount(0);
  // La première ligne du groupe de liste, au-dessus du champ de recherche.
  const champ = page.getByRole("searchbox", { name: /Rechercher un membre/ });
  expect((await rangee.boundingBox())!.y).toBeLessThan((await champ.boundingBox())!.y);
  await verifierSansDebordement(page);
  await rangee.click();
  await expect(page).toHaveURL(/\/personnes\/sans-compte\/?$/);
  expect(await nombreDuTitre(page), "le chiffre de la rangée est celui de la page").toBe(dite);
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
