import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { coordination, musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran } from "./helpers/agencement";
import { ongletsBackOffice } from "../src/lib/navigation";

// Lot SF (docs/spec-espace-musiciens.md, § Lot SF ; Q5, Q6) — la scène des fêtes à portée de la coordination :
// SF-1, l'entrée « Scène » de la barre latérale du Back-Office (entre Calendrier et Planning, jamais dans la barre du bas) ;
// SF-2, la carte « Scène des fêtes » en bas d'À faire, là où la barre latérale n'existe pas.
// Comptes simulés, noms fictifs. Lancé sur les cinq dispositions (SPECS_GRAND_ECRAN).

const COMITE: FakeProfile = { uid: "uid-orlane", email: "orlane@example.com", firstName: "Orlane", lastName: "V.", ...coordination() };
/** Responsable sans la coordination : il tient un planning, rien de la scène. */
const PLANNEUR: FakeProfile = {
  uid: "uid-gaspard", email: "gaspard@example.com", firstName: "Gaspard", lastName: "L.", responsabilites: ["planning:culte"],
};

const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

/** Le menu du Back-Office en grand : la barre latérale (dépliée par-dessus sur l'iPad en paysage). */
async function menuLateral(page: Page, info: TestInfo) {
  if (info.project.name === "tablette-paysage") {
    await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale|展开侧边栏/ }).tap();
    return page.getByTestId("barre-par-dessus").getByRole("navigation", { name: /Navigation principale|主导航/ });
  }
  return page.getByTestId("barre-laterale").getByRole("navigation", { name: /Navigation principale|主导航/ });
}

async function ouvrirAFaire(page: Page, qui: FakeProfile) {
  await sansSheet(page);
  await signInAs(page, qui, {}, "/back-office");
  await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
}

test.describe("SF-1 : l'entrée « Scène » de la barre latérale", () => {
  test("la coordination la voit entre Calendrier et Planning, un clic ouvre la scène d'une fête", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la barre latérale : ordinateur et tablette en paysage");
    await ouvrirAFaire(page, COMITE);
    const menu = await menuLateral(page, info);
    const liens = await menu.getByRole("link").allTextContents();
    const noms = liens.map((l) => l.replace(/\d+$/, ""));
    expect(noms.indexOf("Scène"), noms.join(" | ")).toBe(noms.indexOf("Calendrier") + 1);
    // Une coordination seule n'a pas Planning : l'ordre complet (Scène avant Planning) est vérifié pour l'admin, back-office-espace.spec.ts.
    if (noms.includes("Planning")) expect(noms.indexOf("Planning")).toBe(noms.indexOf("Scène") + 1);
    await page.screenshot({ path: `test-results/scene-des-fetes/afaire-${info.project.name}.png` });
    await menu.getByRole("link", { name: "Scène", exact: true }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/scene\/(paques|noel)/, { timeout: 20_000 });
    await expect(page.getByRole("navigation", { name: "Sous-parties" }).getByRole("link")).toHaveText(["Pâques", "Noël"]);
    // Seule Scène est l'entrée courante sur les pages de la scène.
    const menuApres = await menuLateral(page, info);
    await expect(menuApres.locator("[aria-current]")).toHaveCount(1);
    await expect(menuApres.getByRole("link", { name: "Scène", exact: true })).toHaveAttribute("aria-current", "page");
    await page.screenshot({ path: `test-results/scene-des-fetes/scene-${info.project.name}.png` });
  });

  test("un responsable hors coordination n'a pas l'entrée", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la barre latérale : ordinateur et tablette en paysage");
    await ouvrirAFaire(page, PLANNEUR);
    const menu = await menuLateral(page, info);
    await expect(menu.getByRole("link", { name: "Calendrier", exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Scène", exact: true })).toHaveCount(0);
  });

  test("Scène n'est jamais un onglet de la barre du bas", () => {
    const cles = ongletsBackOffice(["afaire", "calendrier", "scene", "planning", "equipes", "messages"]).map((o) => o.cle);
    expect(cles).toEqual([
      "backOffice.entrees.afaire", "backOffice.entrees.calendrier", "backOffice.entrees.planning", "backOffice.entrees.equipes", "backOffice.barre.app",
    ]);
  });

  test("en 中文 : l'entrée s'appelle « 舞台 »", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la barre latérale : ordinateur et tablette en paysage");
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* stockage indisponible */ } });
    await sansSheet(page);
    await signInAs(page, COMITE, {}, "/back-office");
    const menu = await menuLateral(page, info);
    await expect(menu.getByRole("link", { name: "舞台", exact: true })).toBeVisible();
  });
});

test.describe("SF-2 : la carte « Scène des fêtes » en bas d'À faire", () => {
  test("téléphone et tablette en portrait : en bas, un toucher ouvre la scène, la barre du bas n'a pas Scène", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "la barre latérale porte déjà l'entrée");
    await ouvrirAFaire(page, COMITE);
    const carte = page.getByTestId("carte-scene-des-fetes");
    await expect(carte).toBeVisible();
    await expect(carte).toContainText("Scène des fêtes");
    await expect(carte).toContainText("Pâques et Noël");
    await expect(carte).toHaveAttribute("href", /^\/back-office\/evenements\/scene\/?$/);
    // Cible de toucher d'au moins 44 px.
    expect((await carte.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // compte-10 : en dernier, sous tous les groupes et toutes les lignes de la zone À faire.
    const contenu = page.getByRole("main");
    const hautCarte = (await carte.boundingBox())!.y;
    for (const autre of await contenu.locator('[data-testid^="groupe-"], [data-testid="ligne-a-faire"]').all()) {
      expect((await autre.boundingBox())!.y).toBeLessThan(hautCarte);
    }
    // La barre du bas garde ses onglets, sans Scène.
    const barre = page.getByTestId("barre-du-bas");
    await expect(barre.getByRole("link", { name: "À faire" })).toBeVisible();
    await expect(barre.getByRole("link", { name: "Calendrier" })).toBeVisible();
    await expect(barre.getByRole("link", { name: "App" })).toBeVisible();
    await expect(barre.getByRole("link", { name: /Scène/ })).toHaveCount(0);
    await page.screenshot({ path: `test-results/scene-des-fetes/afaire-${info.project.name}.png` });
    await carte.tap();
    await expect(page).toHaveURL(/\/back-office\/evenements\/scene\/(paques|noel)/, { timeout: 20_000 });
    await page.screenshot({ path: `test-results/scene-des-fetes/scene-${info.project.name}.png` });
  });

  test("grand écran : la carte n'est pas montrée (la barre latérale a l'entrée)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la carte est pour les écrans sans barre latérale");
    await ouvrirAFaire(page, COMITE);
    await expect(page.getByTestId("carte-scene-des-fetes")).toBeHidden();
  });

  test("un responsable hors coordination ne voit pas la carte", async ({ page }) => {
    await ouvrirAFaire(page, PLANNEUR);
    await expect(page.getByTestId("carte-scene-des-fetes")).toHaveCount(0);
  });

  test("en 中文 : la carte dit « 节日舞台 »", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "la barre latérale porte déjà l'entrée");
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* stockage indisponible */ } });
    await sansSheet(page);
    await signInAs(page, COMITE, {}, "/back-office");
    await expect(page.getByTestId("carte-scene-des-fetes")).toContainText("节日舞台");
  });
});

test.describe("SF-1 : la forme retenue (C6) accepte « scene »", () => {
  test("la coordination : sa forme retenue contient scene, et l'entrée est là pendant l'attente de Firebase", async ({ page }, info) => {
    await sansSheet(page);
    await signInAs(page, COMITE, {}, "/back-office");
    await expect.poll(() => page.evaluate(() => localStorage.getItem("gcc-forme"))).not.toBeNull();
    const forme = JSON.parse((await page.evaluate(() => localStorage.getItem("gcc-forme")))!);
    expect(forme.entreesBackOffice).toContain("scene");
    // Firebase retenu, page rechargée : la forme qui contient « scene » reste valide (pas rejetée).
    let liberer = () => {};
    const barriere = new Promise<void>((r) => { liberer = r; });
    await page.route(/identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/, async (route) => { await barriere; await route.fallback(); });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-responsable", "1");
    if (estGrandEcran(info)) {
      await expect(page.getByTestId("barre-laterale").getByRole("link", { name: "Scène", exact: true })).toBeVisible();
    }
    liberer();
    await expect(page.getByRole("heading", { level: 1, name: "À faire" })).toBeVisible();
  });
});

// ─── bo-evenements-13 : la carte de liste de la scène prend sa hauteur naturelle ─────────────────────────────

const NOEL_OUVERT = {
  nom: "Noël 2026", fete: "noel", annee: 2026, jourJ: "2026-12-24", debut: "2026-10-01", ouvert: true,
  plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }], duree: 60,
  quiAutorises: ["Gp Paix", "Gp Fidélité", "Gp Bonté", "Gp Amour", "Gp Joie", "Franco"],
  passages: [{ quoi: "Chant", qui: ["Franco"], titre: "Ouverture" }],
  createdBy: "uid-orlane", updatedAt: "2026-09-14T20:00:00Z",
};

test.describe("bo-evenements-13 : la scène des fêtes, en deux volets", () => {
  test.beforeEach(({}, info) => { test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette en paysage"); });

  test("à 1 280 × 720, la carte de liste n'a pas d'overflow-y: auto, la dernière semaine est atteignable et visible, l'ordre de passage est dans « Cette fête »", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await signInAs(page, COMITE, { "programmes/noel-2026": NOEL_OUVERT }, "/back-office/evenements/scene/noel");
    const colonne = page.getByRole("region", { name: "Cette fête" });
    await expect(colonne.getByRole("heading", { level: 2 })).toHaveText("Noël 2026");
    const carte = page.locator('[data-volet="liste"]');
    expect(await carte.evaluate((el) => getComputedStyle(el).overflowY), "la page défile, pas la carte").not.toBe("auto");
    await expect(colonne.getByRole("button", { name: /Ordre de passage du jour J/ })).toBeVisible();
    const derniere = page.getByRole("list", { name: "Semaines" }).getByRole("listitem").last();
    await derniere.scrollIntoViewIfNeeded();
    await expect(derniere).toBeVisible();
    const [boite, fenetre] = [(await derniere.boundingBox())!, page.viewportSize()!];
    expect(boite.y, "haut de la dernière semaine dans la fenêtre").toBeGreaterThanOrEqual(0);
    expect(boite.y + boite.height, "bas de la dernière semaine dans la fenêtre").toBeLessThanOrEqual(fenetre.height);
  });

  test("une autre page en deux volets (Harmonie) garde un max-height sur sa carte de liste", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await sansSheet(page);
    const pianiste: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K.", ...musicien("piano") };
    await signInAs(page, pianiste, {}, "/harmonie");
    const carte = page.locator('[data-volet="liste"]');
    await expect(carte).toBeVisible();
    expect(await carte.evaluate((el) => getComputedStyle(el).maxHeight)).not.toBe("none");
  });
});

// ─── bo-evenements-12 et evenements-app-3 (lot CD, T4b, L1) : la scène sur une colonne ───────────────────────

test.describe("la scène des fêtes sur une colonne : deux colonnes de groupes au Back-Office, colonne de 720 px côté membre", () => {
  test.beforeEach(({}, info) => { test.skip(estGrandEcran(info), "une colonne : tablette portrait et téléphone"); });

  test("bo-evenements-12 : Back-Office, « Cette fête » à gauche et « Cette semaine » à droite dès 720 px de conteneur, empilés au téléphone", async ({ page }, info) => {
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await signInAs(page, COMITE, { "programmes/noel-2026": NOEL_OUVERT }, "/back-office/evenements/scene/noel");
    const fete = page.getByRole("region", { name: "Cette fête" });
    const semaine = page.getByRole("region", { name: "Cette semaine" });
    await expect(fete.getByRole("heading", { level: 2 })).toHaveText("Noël 2026");
    await expect(semaine).toBeVisible();
    // Une seule entrée visible : troisième ligne de la carte de « Cette fête » dès 720 px, carte à part tout en bas sinon.
    const ordre = page.getByRole("button", { name: /Ordre de passage du jour J/ });
    await expect(ordre).toHaveCount(1);
    const [f, s, o] = [(await fete.boundingBox())!, (await semaine.boundingBox())!, (await ordre.boundingBox())!];
    if (info.project.name === "tablette") {
      expect(o.y, "dans la carte de « Cette fête »").toBeLessThan(f.y + f.height);
      expect(o.x).toBeGreaterThanOrEqual(f.x);
      expect(s.x, "à droite de « Cette fête »").toBeGreaterThan(f.x + f.width - 1);
      expect(Math.abs(s.width - f.width), "deux colonnes égales").toBeLessThan(2);
      expect(Math.abs(s.y - f.y), "en haut des deux colonnes").toBeLessThan(40);
    } else {
      expect(s.y, "dessous").toBeGreaterThan(f.y + f.height - 1);
      expect(Math.abs(s.x - f.x)).toBeLessThan(2);
      expect(o.y, "carte à part, tout en bas").toBeGreaterThan(s.y + s.height - 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("bo-evenements-12 : une vue ouverte en page (Saison) est une colonne de 720 px au plus, alignée à gauche", async ({ page }, info) => {
    test.skip(info.project.name === "telephone", "au téléphone, la saison est un résumé dont chaque ligne ouvre une feuille");
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await signInAs(page, COMITE, { "programmes/noel-2026": NOEL_OUVERT }, "/back-office/evenements/scene/noel?vue=saison");
    const reglages = page.getByRole("region", { name: "Mettre en place la saison" });
    await expect(reglages).toBeVisible();
    const b = (await reglages.boundingBox())!;
    expect(b.width, "720 px au plus").toBeLessThanOrEqual(721);
    const marge = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--marge-page")));
    expect(Math.abs(b.x - marge), "alignée à gauche, jamais centrée").toBeLessThan(2);
  });

  test("evenements-app-3 : côté membre, la colonne est plafonnée à 720 px et alignée à gauche", async ({ page }) => {
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
    await signInAs(page, { uid: "uid-bastien", email: "bastien@example.com", firstName: "Bastien", lastName: "M.", ...musicien("piano") }, { "programmes/noel-2026": NOEL_OUVERT }, "/evenements/scene/noel");
    const colonne = page.locator("[data-colonne-plafonnee]");
    await expect(colonne).toBeVisible();
    const marge = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--marge-page")));
    const b = (await colonne.boundingBox())!;
    expect(b.width, "720 px de contenu et les marges au plus").toBeLessThanOrEqual(720 + 2 * marge + 1);
    expect(Math.abs(b.x), "alignée à gauche").toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
