import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 9 / H1 (docs/spec-harmonie.md) : le catalogue « Harmonie ». Réservé aux
// Musiciens de Louange qui jouent du piano ou de la guitare — lot AO : l'instrument se lit dans
// « Ce qu'il joue » de l'organigramme (champ `joue` du profil), plus dans les colonnes du planning — et aux admins.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Jo tient le piano, Éloïse la guitare, Yiyi la batterie : trois accès
// différents avec le même profil.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Paul W.", "", "", "Jo L.", "Éloïse M.", "Yiyi C.", "", "", "Hewei", "", ""],
]);

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", planningName: "Jo L.", ...musicien("piano") };
const ELOISE: FakeProfile = { uid: "uid-eloise", email: "eloise@example.com", planningName: "Éloïse M.", ...musicien("guitare") };
const YIYI: FakeProfile = { uid: "uid-yiyi", email: "yiyi@example.com", planningName: "Yiyi C.", ...musicien("batterie") };

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string, pleinePage = false) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: pleinePage });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, qui, {}, to);
}

test("un pianiste trouve « Harmonie » dans l'onglet Chants et ouvre le catalogue", async ({ page }) => {
  await ouvrir(page, JO, "/songs");
  const lien = page.locator("[data-lien-harmonie]");
  await expect(lien).toBeVisible();
  await lien.click();
  await expect(page).toHaveURL(/\/harmonie\/?$/);
  await expect(page.getByRole("heading", { name: "Harmonie" })).toBeVisible();
  await capture(page, "harmonie-catalogue");
});

test("un batteur ne voit ni la ligne ni le catalogue", async ({ page }) => {
  await ouvrir(page, YIYI, "/songs");
  await expect(page.locator("[data-lien-harmonie]")).toHaveCount(0);
  await page.goto("/harmonie");
  await expect(page.locator("[data-harmonie]")).toHaveCount(0);
  // Et il lit une phrase, pas le nom d'une clé de traduction.
  await expect(page.getByText("Cette page est réservée aux musiciens de l'équipe.")).toBeVisible();
});

test("le parcours « Par où commencer » mène à sa première fiche", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie");
  const parcours = page.locator("[data-parcours]");
  // Sur deux volets le parcours est replié au départ : on le déplie.
  await expect(parcours).toBeVisible();
  const replie = parcours.getByRole("button", { name: /Par où commencer/ });
  if (await replie.count()) await replie.click();
  // Trois étapes visibles, les dix après « Voir les 7 autres » (un téléphone ne tient
  // pas dix lignes avant les filtres).
  await expect(parcours.getByRole("link")).toHaveCount(3);
  await parcours.getByRole("button", { name: "Voir les 7 autres" }).click();
  await expect(parcours.getByRole("link")).toHaveCount(10);
  await parcours.getByRole("link").first().click();
  await expect(page.locator("[data-fiche]")).toBeVisible();
});

test("les filtres réduisent la liste, et « Tout afficher » la rend", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie");
  // Les lignes du cours et des sons du RD-2000 ne sont pas des fiches, et elles
  // arrivent après elles : les compter faussait le total de départ. Préfixes et
  // non égalités : le site écrit ces liens avec une barre finale.
  const fiches = page.locator("[data-harmonie] a[href^='/harmonie/']:not([href^='/harmonie/cours']):not([href^='/harmonie/rd2000'])");
  await expect(fiches.first(), "le catalogue est chargé avant de compter").toBeVisible();
  const total = await fiches.count();
  await page.getByRole("group", { name: "Sensation" }).getByRole("button", { name: "Tension" }).click();
  await expect.poll(async () => fiches.count(), { message: "moins de fiches avec un filtre" }).toBeLessThan(total);
  await page.getByRole("group", { name: "Sensation" }).getByRole("button", { name: "Tension" }).click();
  await expect.poll(async () => fiches.count()).toBe(total);
});

test("Moment et Niveau sont des menus : choisir une valeur réduit la liste, « Tous les moments » la rend", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie");
  const fiches = page.locator("[data-harmonie] a[href^='/harmonie/']:not([href^='/harmonie/cours']):not([href^='/harmonie/rd2000'])");
  await expect(fiches.first()).toBeVisible();
  const total = await fiches.count();
  const moment = page.locator('[data-harmonie] [data-menu][aria-label^="Moment"]');
  await expect(moment).toBeVisible();
  await expect(moment).not.toHaveAttribute("data-pose", "");
  await moment.click();
  await page.getByRole("menuitemradio", { name: "Refrain", exact: true }).click();
  await expect(moment).toContainText("Refrain");
  await expect(moment).toHaveAttribute("data-pose", "");
  await expect.poll(async () => fiches.count(), { message: "moins de fiches avec un moment" }).toBeLessThan(total);
  await expect(page.getByRole("menu"), "le panneau est refermé").toHaveCount(0);
  await moment.click();
  await page.getByRole("menuitemradio", { name: "Tous les moments" }).click();
  await expect.poll(async () => fiches.count()).toBe(total);
  await expect(page.locator('[data-harmonie] [data-menu][aria-label^="Niveau"]')).toBeVisible();
  expect(await page.locator("[data-harmonie] select:visible").count(), "aucun <select> dans le catalogue").toBe(0);
});

test("une fiche montre avant → après, le pourquoi, les pièges et les exemples", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie/substitutions/2m7-pour-4");
  await expect(page.getByRole("heading", { name: "Le 2m7 à la place du 4" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avant → après" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pourquoi ça marche" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quand l'éviter" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Au piano" }), "Jo est pianiste").toBeVisible();
  await expect(page.getByRole("heading", { name: "Dans le répertoire" })).toBeVisible();
  await expect(page.getByText(/chants? qui le joue/), "les exemples sont comptés").toBeVisible();
  // harmonie-10 : toutes les lignes de chants ont la même hauteur (44 px) ; « Voir les N autres » déplie le reste.
  const lignes = page.locator('[data-fiche] a[href^="/songs/"]');
  await expect(lignes.first()).toBeVisible();
  const hauteurs = await lignes.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(new Set(hauteurs), "des lignes d'une seule hauteur").toEqual(new Set([44]));
  const autres = page.locator("[data-fiche]").getByRole("button", { name: /^Voir les \d+ autres$/ });
  if (await autres.count()) {
    const avant = await lignes.count();
    await autres.click();
    expect(await lignes.count(), "la liste se déplie").toBeGreaterThan(avant);
    await expect(autres).toHaveCount(0);
  }
  await capture(page, "harmonie-fiche");
});

test("musiciens-8 : toutes les fiches sont à relire, donc aucune ne porte de badge ; le bandeau reste", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie");
  await expect(page.locator("[data-famille]").first()).toBeVisible();
  await expect(page.locator("[data-famille]").getByText("à relire", { exact: true })).toHaveCount(0);
  await expect(page.locator("[data-harmonie]").getByText(/Les fiches sont en relecture/)).toBeVisible();
});

test("musiciens-5 : les guillemets et la flèche d'une fiche sont liés par des espaces insécables", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie/substitutions/2m7-pour-4");
  const fiche = page.locator("[data-fiche]");
  await expect(fiche).toBeVisible();
  const texte = (await fiche.textContent()) ?? "";
  expect(texte, "« glisse » : espace fine insécable à l'intérieur des guillemets").toMatch(/«\u202Fglisse\u202F»/);
  // Le texte lu par l'écran n'est pas altéré : getByText normalise les espaces.
  await expect(fiche.getByText("La phrase « glisse » vers A", { exact: false })).toBeVisible();
});

test("musiciens-11 (jeu B) : Tonalité et Capo sont des menus de 32 px au doigt, 28 px à la souris ; aucun <select> sur la fiche", async ({ page }) => {
  await ouvrir(page, ELOISE, "/harmonie/substitutions/2m7-pour-4");
  const tonalite = page.getByRole("button", { name: /^Tonalité/ });
  await expect(tonalite).toBeVisible();
  const tactile = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  const attendu = tactile ? 32 : 28;
  for (const cible of [tonalite, page.getByRole("button", { name: /^Capo/ })]) {
    if ((await cible.count()) === 0) continue;
    expect(Math.round((await cible.boundingBox())!.height)).toBe(attendu);
  }
  expect(await page.locator("select:visible:not(form select)").count(), "aucun <select> hors formulaire sur une fiche").toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "pas de débordement").toBe(true);
});

test("changer de tonalité transpose les accords de la fiche", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie/substitutions/2m7-pour-4");
  const avant = page.locator("section", { has: page.getByRole("heading", { name: "Avant → après" }) });
  await expect(avant.getByText("Em7 → A", { exact: true }), "écrite en D").toBeVisible();
  await avant.getByRole("button", { name: /^Tonalité/ }).click();
  await page.getByRole("menuitemradio", { name: "F", exact: true }).click();
  await expect(avant.getByText("Gm7 → C", { exact: true }), "la même fiche en F").toBeVisible();
  await expect(avant.getByText("Em7 → A", { exact: true })).toHaveCount(0);
});

test("les filets d'une fiche sont ceux des listes, pas la couleur du texte", async ({ page }) => {
  await ouvrir(page, JO, "/harmonie/substitutions/2m7-pour-4");
  // Le jeton `--filet` n'était défini nulle part : ces filets prenaient la
  // couleur du texte, un trait noir là où les listes ont un gris clair.
  const eviter = page.locator("section", { has: page.getByRole("heading", { name: "Quand l'éviter" }) });
  const filets = [page.getByRole("button", { name: /^Tonalité/ }).locator(".."), eviter.locator("li").nth(1)];
  const attendu = await page.evaluate(() => {
    const temoin = document.createElement("div");
    temoin.style.borderTopColor = "hsl(var(--border))";
    document.body.append(temoin);
    const couleur = getComputedStyle(temoin).borderTopColor;
    temoin.remove();
    return couleur;
  });
  for (const filet of filets) {
    expect(await filet.evaluate((el) => getComputedStyle(el).borderTopColor)).toBe(attendu);
  }
});

test("un guitariste voit la partie guitare, avec son diagramme", async ({ page }) => {
  await ouvrir(page, ELOISE, "/harmonie/substitutions/2m7-pour-4");
  await expect(page.getByRole("heading", { name: "À la guitare" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Au piano" })).toHaveCount(0);
  await page.getByRole("heading", { name: "À la guitare" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("img", { name: /Doigté guitare/ }).first()).toBeVisible();
  await capture(page, "harmonie-fiche-guitare", true);
});

test("le capo donne les formes jouées, côté guitare", async ({ page }) => {
  await ouvrir(page, ELOISE, "/harmonie/substitutions/2m7-pour-4");
  const guitare = page.locator("section", { has: page.getByRole("heading", { name: "À la guitare" }) });
  await expect(guitare.getByText("Formes écrites en D."), "la fiche est écrite en D").toBeVisible();
  await guitare.getByRole("button", { name: /^Capo/ }).click();
  await page.getByRole("menuitemradio", { name: "2", exact: true }).click();
  // Les doigtés ne changent pas : avec un capo 2, ces formes de D sonnent en E.
  await expect(guitare.getByText("Ces formes (écrites en D) sonnent en E.")).toBeVisible();
});

test("en 中文 : le catalogue est traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, JO, "/harmonie");
  await expect(page.getByRole("heading", { name: "和声" })).toBeVisible();
  await expect(page.getByRole("group", { name: "感觉" })).toBeVisible();
  await expect(page.getByRole("button", { name: "张力" })).toBeVisible();
});
