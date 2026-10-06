import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";
import { PLANNING_COLORS } from "../src/lib/serviceColors";

// Agencement v18, tranche T4a (docs/spec-agencement-v18.md, B6, B7, A2, A3) : l'en-tête et la
// rangée de grille communes du Planning, la période unique (année et T1–T4 en rail), les groupes
// au rail ; le Planning du Back-Office en piste A (deux rangées de commandes au lieu de cinq).
// Cinq projets. Noms fictifs seulement.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["08/11", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", "", ""],
  ["15/11", "Président J.", "Choriste K.", "Choriste L.", "Pianiste M.", "Guitariste N.", "Batteur O.", "Sono P.", "Projection Q.", "Orateur R.", "", "", ""],
  ["22/11", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "Guitariste N.", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", "", ""],
]);

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T.", planningName: "Pianiste D." };
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Pianiste D." };

/** Le dimanche 15/11/2026 (T4), le Sheet simulé (le Culte seul a des lignes). */
async function ouvrir(page: Page, qui: FakeProfile, vers: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, qui, {}, vers);
}

/** La rangée de la grille (`BarreDeGrille`) : service, période, filtres. */
const barre = (page: Page) => page.getByTestId("barre-grille").filter({ visible: true });
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const fond = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
const milieuY = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return b.y + b.height / 2;
};

// ─── Back-Office (B6, B7) ─────────────────────────────────────────────────────

test.describe("BO Planning, piste A", () => {
  test("l'agencement commun ; le titre « Planning », le planning et ses cases vides en sous-titre, « Exporter » dans l'en-tête", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    await expect(page.locator('[data-grille="culte"]')).toBeVisible();
    await verifierAgencement(page, { premierBloc: barre(page) });
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    const sousTitre = enTete(page).locator("p").first();
    await expect(sousTitre).toContainText("Culte Franco");
    await expect(sousTitre).toContainText("Dimanche 10:30");
    await expect(sousTitre).toContainText(/\d+ cases? vides? ce trimestre/);
    await expect(enTete(page).getByRole("button", { name: /Exporter/ })).toBeVisible();
    // Le rail des sous-parties (admins) dans l'en-tête.
    await expect(enTete(page).locator('[data-onglets="rail"]').getByRole("link")).toHaveText(["Plannings", "Sans compte"]);
  });

  test("deux rangées de commandes : le rail, puis les plannings en pilules, la période et « Mes dates »", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    const plannings = barre(page).getByRole("navigation", { name: "Plannings" });
    await expect(plannings).toHaveAttribute("data-onglets", "pilules");
    await expect(plannings.getByRole("link")).toHaveText(["Culte Franco", "Prépa. Table", "Groupes", "EDD", "Campus", "Intergroupe", "Interfranco"]);
    const actif = plannings.getByRole("link", { name: "Culte Franco" });
    await expect(actif).toHaveAttribute("aria-current", "page");
    expect(await fond(actif), "l'actif à la couleur du service").toBe(rgb(PLANNING_COLORS.culte));
    const periode = barre(page).getByRole("tablist", { name: "Trimestre" });
    await expect(periode).toHaveAttribute("data-onglets", "rail");
    await expect(periode.getByRole("tab", { name: "T4" })).toHaveAttribute("aria-selected", "true");
    await expect(barre(page).getByRole("button", { name: "Mes dates" })).toBeVisible();
    // Plus de bandeau de couleur au-dessus de la grille, plus d'export dans la grille.
    await expect(page.getByTestId("grille-bandeau")).toHaveCount(0);
    await expect(page.locator('[data-grille="culte"]').getByRole("button", { name: /Exporter/ })).toHaveCount(0);

    if (estGrandEcran(info)) {
      // Plannings et période sur la même rangée, sous le rail ; la grille juste dessous.
      expect(Math.abs((await milieuY(plannings)) - (await milieuY(periode)))).toBeLessThan(12);
      const rail = enTete(page).locator('[data-onglets="rail"]');
      expect(await milieuY(rail)).toBeLessThan(await milieuY(plannings));
      const finBarre = (await barre(page).boundingBox())!;
      const grille = (await page.getByTestId("grille-defilement").boundingBox())!;
      expect(grille.y - (finBarre.y + finBarre.height), "rien entre la rangée et la grille").toBeLessThan(32);
    }
  });

  test("la période unique : l'année et le trimestre en rail, dans la rangée de la grille", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    const annees = barre(page).getByRole("tablist", { name: "Année" });
    await expect(annees).toHaveAttribute("data-onglets", "rail");
    await expect(annees.getByRole("tab")).toHaveText(["2026", "2027"]);
    await annees.getByRole("tab", { name: "2027" }).click();
    await expect(annees.getByRole("tab", { name: "2027" })).toHaveAttribute("aria-selected", "true");
    await expect(barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: /^T1/ })).toHaveAttribute("aria-selected", "true");
  });

  test("le halo est celui du service", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    await expect(page.getByTestId("halo")).toHaveCount(1);
    expect(await page.getByTestId("halo").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--halo"))).toBe(PLANNING_COLORS.culte);
  });

  test("Sans compte : même en-tête, sans rangée de grille", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/sans-compte");
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    await expect(enTete(page).locator('[data-onglets="rail"]').getByRole("link", { name: "Sans compte" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("barre-grille")).toHaveCount(0);
  });
});

// ─── App (A2, A3, R6) ─────────────────────────────────────────────────────────

test.describe("App Planning : le titre « Planning », le service en h2", () => {
  test("Culte : l'agencement commun, h1 « Planning », h2 du service avec son horaire et sa période", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning/culte");
    await expect(page.locator('[data-grille="culte"]')).toBeVisible();
    await verifierAgencement(page, { premierBloc: barre(page) });
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    await expect(enTete(page)).toContainText("Qui sert quand, dans tous les plannings de l'église");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Culte Franco");
    await expect(barre(page)).toContainText("Dimanche 10:30 · 4e trimestre 2026");
    await expect(barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: "T4" })).toHaveAttribute("aria-selected", "true");
  });

  test("grand écran : les plannings en pilules dans l'en-tête, l'actif à sa couleur ; la grille à en-tête gris", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand seulement : téléphone et tablette gardent la barre collante");
    await ouvrir(page, MEMBRE, "/planning/culte");
    const plannings = enTete(page).getByRole("navigation", { name: "Plannings" });
    await expect(plannings).toHaveAttribute("data-onglets", "pilules");
    await expect(plannings.getByRole("link")).toHaveCount(8);
    const actif = plannings.getByRole("link", { name: "Culte Franco" });
    await expect(actif).toHaveAttribute("aria-current", "page");
    expect(await fond(actif)).toBe(rgb(PLANNING_COLORS.culte));
    await expect(page.getByTestId("barre-section")).toBeHidden();
    // A2 : la couleur du service sur les dates seulement, pas sur l'en-tête de la grille.
    const th = page.getByTestId("grille-colonnes").locator("th").first();
    expect(await fond(th)).not.toBe(rgb(PLANNING_COLORS.culte));
  });

  test("téléphone : la feuille des plannings (V7) marche toujours, sous le titre", async ({ page }, info) => {
    test.skip(!estTelephone(info), "la feuille est celle du téléphone");
    await ouvrir(page, MEMBRE, "/planning/culte");
    const bouton = page.getByTestId("menu-plannings");
    await expect(bouton).toBeVisible();
    await bouton.click();
    await page.getByTestId("feuille-plannings").getByRole("link", { name: "Groupes" }).click();
    await expect(page).toHaveURL(/\/planning\/groupes\/?$/);
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Groupes");
  });

  test("tablette : la rangée collante des plannings, posée sous le titre", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait");
    await ouvrir(page, MEMBRE, "/planning/culte");
    const rangee = page.getByTestId("onglets-section");
    await expect(rangee).toBeVisible();
    const tete = (await enTete(page).boundingBox())!;
    expect((await rangee.boundingBox())!.y).toBeGreaterThanOrEqual(tete.y + tete.height - 1);
    await rangee.getByRole("link", { name: "Groupes" }).click();
    await expect(page).toHaveURL(/\/planning\/groupes\/?$/);
  });

  test("Groupes : Paix · Fidélité · Bonté en rail, Fidélité › Groupe · Musiciens en pilules", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning/groupes");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Groupes");
    const groupes = barre(page).getByRole("tablist", { name: "Groupes" });
    await expect(groupes).toHaveAttribute("data-onglets", "rail");
    await expect(groupes.getByRole("tab")).toHaveText(["Paix", "Fidélité", "Bonté"]);
    await expect(groupes.getByRole("tab", { name: "Paix" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Paix", exact: true }), "plus de grands boutons de couleur").toHaveCount(0);
    await expect(barre(page).locator('[data-onglets="pilules"]')).toHaveCount(0);

    await groupes.getByRole("tab", { name: "Fidélité" }).click();
    const sous = barre(page).locator('[data-onglets="pilules"]');
    await expect(sous.getByRole("button")).toHaveText(["Planning groupe", /Planning musiciens/]);
    await expect(page.locator('[data-grille="fidelite"]')).toBeVisible();
    await sous.getByRole("button", { name: /Planning musiciens/ }).click();
    await expect(page.locator('[data-grille="fideliteMusiciens"]')).toBeVisible();
    await groupes.getByRole("tab", { name: "Bonté" }).click();
    await expect(page.locator('[data-grille="bonte"]')).toBeVisible();
    await expect(barre(page).locator('[data-onglets="pilules"]')).toHaveCount(0);
  });

  test("EDD et Campus : la classe et la vue en rail, dans la rangée", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning/edd");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("EDD — École du Dimanche");
    await expect(barre(page).getByRole("tablist", { name: "Classe" }).getByRole("tab")).toHaveText(["中班", "大班", "高班"]);
    await expect(barre(page).getByRole("tablist", { name: "Période" }).getByRole("tab")).toHaveCount(6);
    await page.goto("/planning/campus");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Campus");
    const vues = barre(page).getByRole("tablist", { name: "Vue" });
    await expect(vues.getByRole("tab")).toHaveText(["Louange", "Répétition", "Grille"]);
  });

  test("accueil : un seul h1, « Planning », dans l'en-tête commun", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning");
    await expect(page.locator("h1").filter({ visible: true })).toHaveCount(1);
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
  });
});

// ─── Captures, à regarder (cinq tailles) ──────────────────────────────────────

test("captures : BO Planning, Culte et Groupes de l'App", async ({ page }, info) => {
  const capture = async (nom: string) => {
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.screenshot({ path: `test-results/agencement-v18-planning/${nom}-${info.project.name}.png` });
  };
  /** Les lignes du Sheet simulé sont là (plus de « Chargement… »). */
  const culteCharge = () => expect(page.locator('[data-case="2026-11-15|presidence"]').filter({ visible: true })).toContainText("Président J.");
  await ouvrir(page, ADMIN, "/back-office/planning/culte");
  await culteCharge();
  await capture("bo-culte");
  await page.goto("/planning/culte");
  await culteCharge();
  await capture("app-culte");
  await page.goto("/planning/groupes");
  await expect(page.locator('[data-grille="paix"]')).toBeVisible();
  await barre(page).getByRole("tablist", { name: "Groupes" }).getByRole("tab", { name: "Fidélité" }).click();
  await capture("app-groupes");
});
