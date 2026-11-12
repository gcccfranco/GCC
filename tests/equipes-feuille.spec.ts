import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone } from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Exemples d'usage, T6 (docs/spec-exemples-usage.md) : la feuille « Modifier une équipe » (titre avec le nombre de
// membres, champ d'ajout en tête, barre Annuler / Enregistrer collée en bas). Cinq projets (SPECS_GRAND_ECRAN).
// Base et Sheets simulés, noms inventés. Captures : test-results/t6-feuille/.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const MEMBRES = [
  M("Anouk Pelard", { mention: "Chef de chœur" }), M("Baptiste Orvain"), M("Cléo Mandrin", { essai: true }),
  M("Dorian Sabel"), M("Élise Varnot", { mention: "Basse" }), M("Fabrice Linet"), M("Garance Tholy"),
  M("Hector Bidaut"), M("Iseult Corvel"),
];
const doc = (membres: MembreEquipe[]) => ({ membres, updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" });

async function ouvrir(page: Page, equipe: "louange" | "da" = "louange", membres = MEMBRES) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, { [`equipes/${equipe}`]: doc(membres) }, "/back-office/equipes");
  const nom = equipe === "louange" ? "Louange" : "DA";
  await page.getByRole("button", { name: `Modifier ${nom}` }).first().click();
  const f = page.getByRole("dialog", { name: new RegExp(`^${nom}, \\d+ membres?$`) });
  await expect(f).toBeVisible();
  // L'animation d'ouverture finie : les mesures se prennent sur la feuille posée.
  await f.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return f;
}

const boite = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;

test("titre : « Louange, 9 membres », puis 10 après un ajout libre", async ({ page }) => {
  const f = await ouvrir(page);
  await expect(f).toHaveAccessibleName("Louange, 9 membres");
  await f.getByPlaceholder("Ajouter un membre").fill("Jonas Ferrand");
  await f.getByRole("button", { name: /Ajouter « Jonas Ferrand »/ }).click();
  await expect(page.getByRole("dialog", { name: "Louange, 10 membres" })).toBeVisible();
});

test("titre : une équipe d'un membre dit « 1 membre »", async ({ page }) => {
  await ouvrir(page, "da", [M("Kévin Aubrac")]);
  await expect(page.getByRole("dialog", { name: "DA, 1 membre" })).toBeVisible();
});

test("titre en 中文 : 「敬拜组，9 人」", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, { "equipes/louange": doc(MEMBRES) }, "/back-office/equipes");
  await page.getByRole("button", { name: /^修改敬拜/ }).first().click();
  const f = page.getByRole("dialog", { name: /，\d+ 人$/ });
  await expect(f).toBeVisible();
  await f.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const court = await f.getByRole("heading").first().textContent();
  expect(court).toBe("敬拜，9 人");
  if (estTelephone(test.info())) await page.screenshot({ path: "test-results/t6-feuille/telephone-zh.png" });
});

test("le champ d'ajout et ses résultats sont au-dessus de la première ligne ; Annuler et Enregistrer visibles sans défiler", async ({ page }, info) => {
  const f = await ouvrir(page);
  const champ = f.getByPlaceholder("Ajouter un membre");
  await champ.fill("Zz");
  const libre = f.getByRole("button", { name: /Ajouter « Zz »/ });
  const premiere = f.getByTestId(/^membre-/).first();
  const yPremiere = (await boite(premiere)).y;
  expect((await boite(champ)).y + (await boite(champ)).height, "champ au-dessus de la liste").toBeLessThanOrEqual(yPremiere);
  expect((await boite(libre)).y + (await boite(libre)).height, "résultats au-dessus de la liste").toBeLessThanOrEqual(yPremiere);
  await champ.fill("");
  const fenetre = page.viewportSize()!;
  for (const nom of ["Annuler", "Enregistrer"]) {
    const b = await boite(f.getByRole("button", { name: nom }));
    expect(b.y, `${nom} : haut`).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, `${nom} : bas`).toBeLessThanOrEqual(fenetre.height);
    expect(b.x + b.width, `${nom} : droite`).toBeLessThanOrEqual(fenetre.width);
  }
  const dossier = "test-results/t6-feuille";
  await page.screenshot({ path: `${dossier}/${info.project.name}.png` });
  if (info.project.name === "telephone" || info.project.name === "ordinateur-1440") {
    await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.classList.remove("light"); });
    // Les couleurs des boutons passent par une transition : on attend qu'elle finisse.
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dossier}/${info.project.name}-sombre.png` });
  }
});

test("ordinateur 1 280 × 720 : Enregistrer visible sans défiler", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "cas propre à l'ordinateur");
  await page.setViewportSize({ width: 1280, height: 720 });
  const f = await ouvrir(page);
  const b = await boite(f.getByRole("button", { name: "Enregistrer" }));
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(720);
});

test("la barre reste collée en bas quand la liste défile", async ({ page }) => {
  const f = await ouvrir(page);
  const bouton = f.getByRole("button", { name: "Enregistrer" });
  const avant = await boite(bouton);
  await f.getByTestId(/^membre-/).last().scrollIntoViewIfNeeded();
  const apres = await boite(bouton);
  expect(Math.abs(apres.y - avant.y)).toBeLessThanOrEqual(1);
});

test("forme selon la disposition", async ({ page }, info) => {
  const f = await ouvrir(page);
  const b = await boite(f);
  const fenetre = page.viewportSize()!;
  const nom = info.project.name;
  if (nom === "tablette") {
    expect(Math.abs(b.width - 560)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.x - (fenetre.width - b.x - b.width)), "centrée").toBeLessThanOrEqual(1);
    expect(await f.evaluate((el) => getComputedStyle(el).borderBottomLeftRadius), "coins du bas arrondis").not.toBe("0px");
    // vaul prolonge les feuilles du bas par un ::after de leur fond : une feuille qui flotte n'en a pas.
    expect(await f.evaluate((el) => getComputedStyle(el, "::after").display), "aucun fond sous la feuille").toBe("none");
  } else if (estGrandEcran(info)) {
    expect(Math.abs(b.width - 420)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.x + b.width - fenetre.width), "collé à droite").toBeLessThanOrEqual(1);
  } else {
    expect(Math.abs(b.width - fenetre.width), "pleine largeur").toBeLessThanOrEqual(1);
    expect(Math.abs(b.y + b.height - fenetre.height), "feuille du bas").toBeLessThanOrEqual(1);
  }
});

test("erreur d'enregistrement : le message est entre la liste et la barre, juste au-dessus d'Enregistrer", async ({ page }) => {
  const f = await ouvrir(page);
  await page.route(/firestore\.googleapis\.com.*equipes(\/|%2F)louange/, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
      : route.fallback());
  await f.getByRole("button", { name: "Enregistrer" }).click();
  const alerte = f.getByRole("alert");
  await expect(alerte).toBeVisible();
  const a = await boite(alerte);
  const enregistrer = await boite(f.getByRole("button", { name: "Enregistrer" }));
  // Bas de la zone qui défile (la liste), quel que soit le défilement.
  const basListe = await f.getByTestId(/^membre-/).last().evaluate((el) => el.closest(".overflow-y-auto")!.getBoundingClientRect().bottom);
  expect(a.y + a.height, "au-dessus d'Enregistrer").toBeLessThanOrEqual(enregistrer.y);
  expect(enregistrer.y - (a.y + a.height), "écart ≤ 16 px").toBeLessThanOrEqual(16);
  expect(a.y, "sous la liste").toBeGreaterThanOrEqual(basListe - 1);
  expect(enregistrer.y + enregistrer.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test("mouvement réduit : la feuille arrive en fondu de 150 ms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const f = await ouvrir(page);
  const anim = await f.evaluate((el) => { const s = getComputedStyle(el); return { n: s.animationName, d: s.animationDuration }; });
  expect(anim.n).toBe("volet-fondu");
  expect(anim.d).toBe("0.15s");
});
