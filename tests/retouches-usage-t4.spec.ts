import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, remplit, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot « retouches d'usage », tranche T4 (docs/spec-retouches-usage.md, Q1 option a) : le menu déroulant n'a plus de plafond
// fixe (294 px au toucher, 320 px à la souris), il grandit jusqu'à la place libre moins 8 px ; le « ⋯ » d'un dimanche ne sort
// plus de l'écran. Mesures faites dans la page. Base et Sheets simulés ; comptes et noms inventés.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Maëlle T.", "Odon F.", "Ilse R.", "Corto V.", "Sabine L.", "Yann P.", "Nell A.", "Hugo B.", "Pasteur LEROY", "", "", ""],
  ["27/09", "Tiphaine G.", "Odon F.", "Ilse R.", "Corto V.", "Sabine L.", "Yann P.", "Nell A.", "Hugo B.", "Pasteur LEROY", "", "", ""],
]);
const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const LISE: FakeProfile = {
  uid: "uid-lise", email: "lise@example.com", firstName: "Lise", lastName: "Vernet", planningName: "Lise V.", ...remplit("culte"),
};

test.beforeEach(async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
});

test("menu « Tous les services » : la rubrique Groupes est entière sans défilement intérieur, le bas reste à 8 px de la fenêtre", async ({ page }, info) => {
  test.skip(!["telephone", "tablette"].includes(info.project.name), "téléphone et tablette");
  await signInAs(page, ADMIN, {}, "/setlists");
  const declencheur = page.getByRole("button", { name: "Filtrer par catégorie" }).filter({ visible: true }).first();
  await expect(declencheur).toBeVisible();
  // Place maximale sous le déclencheur : on le remonte en haut de la fenêtre quand la page le permet.
  await page.evaluate(() => { document.body.style.paddingBottom = "100vh"; });
  await declencheur.evaluate((e) => { const y = e.getBoundingClientRect().top - 70; if (y > 0) window.scrollBy(0, y); });
  await declencheur.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByText("Groupes", { exact: true })).toBeVisible();
  // Les mesures se font une fois l'animation d'ouverture (zoom-in-95) terminée.
  await menu.evaluate((e) => Promise.all(e.getAnimations().map((a) => a.finished)));
  const m = await menu.evaluate((e) => ({
    scroll: e.scrollHeight, client: e.clientHeight, maxH: getComputedStyle(e).maxHeight,
    bas: e.getBoundingClientRect().bottom, fenetre: window.innerHeight,
  }));
  // Plus aucun plafond fixe : le menu dépasse l'ancien (294 px) et, s'il défile, c'est qu'il occupe toute la place libre (bas à 8 px de la fenêtre).
  expect(m.client, "plus de plafond fixe de 294/320 px").toBeGreaterThan(320);
  if (m.scroll > m.client + 0.5) {
    expect(m.bas, "il ne défile que parce qu'il occupe toute la place libre").toBeGreaterThanOrEqual(m.fenetre - 8 - 1);
  }
  expect(m.bas, "le bas du menu reste à 8 px au moins du bas de la fenêtre").toBeLessThanOrEqual(m.fenetre - 8 + 0.5);
  const lignes = menu.getByRole("menuitemradio");
  // Déclencheur remonté en haut : la place existe, le menu (Groupes compris) tient sans défilement intérieur.
  expect(m.scroll, "la place existe : aucun défilement intérieur").toBeLessThanOrEqual(m.client + 0.5);
  const dernier = (await lignes.last().boundingBox())!;
  const panneau = (await menu.boundingBox())!;
  expect(dernier.y + dernier.height, "la dernière ligne est entière dans le menu").toBeLessThanOrEqual(panneau.y + panneau.height + 0.5);
  expect(await lignes.count(), "toutes les catégories sont là").toBeGreaterThan(8);
});

test("menu « ⋯ » d'un dimanche : entièrement dans la fenêtre au téléphone", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "téléphone seul");
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await signInAs(page, LISE, {}, "/back-office/planning/culte");
  const plus = page.locator('[data-date-carte="2026-09-27"]').getByRole("button", { name: "Plus d'actions" });
  await expect(plus).toBeVisible();
  await plus.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await plus.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeVisible();
  const b = (await menu.boundingBox())!;
  const v = page.viewportSize()!;
  expect(b.x, "gauche").toBeGreaterThanOrEqual(0);
  expect(b.y, "haut").toBeGreaterThanOrEqual(0);
  expect(b.x + b.width, "droite").toBeLessThanOrEqual(v.width + 0.5);
  expect(b.y + b.height, "bas").toBeLessThanOrEqual(v.height + 0.5);
  expect(b.width).toBeLessThanOrEqual(v.width - 16 + 0.5);
});
