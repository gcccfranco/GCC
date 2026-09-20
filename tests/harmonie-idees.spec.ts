import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 9 / H2 et H3 (docs/spec-harmonie.md) : la feuille « Idées d'harmonie »
// d'un chant — cinq idées au plus, chacune « À vérifier en jouant », le refus
// qui vaut pour tout le monde, et les idées écrites par l'équipe.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Paul W.", "", "", "Jo L.", "Éloïse M.", "Yiyi C.", "", "", "Hewei", "", ""],
]);

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", planningName: "Jo L." };
const YIYI: FakeProfile = { uid: "uid-yiyi", email: "yiyi@example.com", planningName: "Yiyi C." };

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function ouvrirChant(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = {}) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  return signInAs(page, qui, docs, "/songs/hosanna");
}

async function ouvrirLaFeuille(page: Page) {
  await page.getByRole("button", { name: /Plus d'actions|More actions|更多操作/ }).click();
  await page.getByRole("menuitem", { name: "Idées d'harmonie" }).click();
  await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
}

test("un pianiste ouvre les idées d'un chant : cinq au plus, à vérifier en jouant", async ({ page }) => {
  await ouvrirChant(page, JO);
  await ouvrirLaFeuille(page);
  const idees = page.locator("[data-suggestion]");
  await expect(idees).toHaveCount(5);
  await expect(page.getByText("À vérifier en jouant").first()).toBeVisible();
  await capture(page, "idees-harmonie");
});

test("« Voir plus » donne la suite", async ({ page }) => {
  await ouvrirChant(page, JO);
  await ouvrirLaFeuille(page);
  await page.getByRole("button", { name: "Voir plus" }).click();
  await expect.poll(async () => page.locator("[data-suggestion]").count()).toBeGreaterThan(5);
});

test("« Ne marche pas sur ce chant » retire l'idée et garde qui l'a dit", async ({ page }) => {
  const db = await ouvrirChant(page, JO);
  await ouvrirLaFeuille(page);
  const premiere = page.locator("[data-suggestion]").first();
  const id = await premiere.getAttribute("data-suggestion");
  await premiere.getByRole("button", { name: "Ne marche pas sur ce chant" }).click();
  await expect(page.locator(`[data-suggestion="${id}"]`)).toHaveCount(0);
  const ecrit = db.writes.find((w) => w.path.startsWith("harmonie/hosanna/rejets/"));
  expect(ecrit, "le refus est enregistré").toBeTruthy();
  expect(ecrit!.data.uid).toBe("uid-jo");
  expect(ecrit!.data.auteur).toBe("Jo L.");
  expect(ecrit!.data.suggestion, "l'idée écartée est nommée").toBe(id);

  // La liste des idées écartées dit laquelle (son nom de fiche), et par qui.
  const ecartees = page.getByText(/idée écartée/);
  await expect(ecartees).toBeVisible();
  await ecartees.click();
  const ligne = page.locator("details li", { hasText: "Jo L." });
  await expect(ligne, "le nom de la fiche, pas son identifiant").not.toContainText("__");
  await expect(ligne.getByRole("button", { name: "Remettre cette idée" })).toBeVisible();
});

test("une idée de l'équipe s'ajoute, avec l'instrument de son auteur", async ({ page }) => {
  const db = await ouvrirChant(page, JO);
  await ouvrirLaFeuille(page);
  await page.getByRole("button", { name: "Ajouter une idée" }).click();
  await page.getByLabel("L'idée").fill("Pont : tenir le 4 deux mesures");
  await page.getByLabel("Avant (accords)").fill("G");
  await page.getByLabel("Après (accords)").fill("Gmaj7");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Pont : tenir le 4 deux mesures")).toBeVisible();
  const ecrit = db.writes.find((w) => w.path.startsWith("harmonie/hosanna/idees/"));
  expect(ecrit!.data.texte).toBe("Pont : tenir le 4 deux mesures");
  expect(ecrit!.data.instrument, "Jo est au piano").toBe("piano");
  expect(ecrit!.data.auteur).toBe("Jo L.");
});

test("une idée écrite dans une autre tonalité se range dans celle du chant", async ({ page }) => {
  const db = await ouvrirChant(page, JO);
  // Hosanna est écrit en D. Jo le lit en F : ce qu'il écrit « Bb » (le 4 en F)
  // doit se ranger « G » (le 4 en D), pour rester juste chez les autres.
  await page.getByLabel("Tonalité").selectOption("F");
  await ouvrirLaFeuille(page);
  await page.getByRole("button", { name: "Ajouter une idée" }).click();
  await page.getByLabel("L'idée").fill("Refrain : ouvrir l'accord");
  await page.getByLabel("Avant (accords)").fill("Bb");
  await page.getByLabel("Après (accords)").fill("Bbmaj7");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Attendre que l'idée s'affiche avant de lire les écritures : sans cela le
  // test lisait db.writes avant que l'enregistrement soit parti (rouge au
  // hasard selon l'appareil, sous charge).
  await expect(page.getByText("Refrain : ouvrir l'accord")).toBeVisible();

  const ecrit = db.writes.find((w) => w.path.startsWith("harmonie/hosanna/idees/"))!;
  expect(ecrit.data.avant, "rangée dans la tonalité du chant").toBe("G");
  expect(ecrit.data.apres).toBe("Gmaj7");
  // Et relue dans la tonalité qu'on lit : Jo la revoit en F.
  await expect(page.locator("[data-idee]").getByText("Bb", { exact: false }).first()).toBeVisible();
});

test("une idée déjà écrite est lisible, avec « nouveau » la première fois", async ({ page }) => {
  await ouvrirChant(page, JO, {
    "harmonie/hosanna/idees/i1": {
      uid: "uid-eloise", auteur: "Éloïse M.", instrument: "guitare",
      texte: "Refrain : capo 2, formes de C", creeLe: "2026-09-17T10:00:00Z", modifieLe: "2026-09-17T10:00:00Z",
    },
  });
  await ouvrirLaFeuille(page);
  await expect(page.getByText("Refrain : capo 2, formes de C")).toBeVisible();
  await expect(page.getByText("Éloïse M. · Guitare")).toBeVisible();
  await expect(page.getByText("nouveau")).toBeVisible();
  await expect(page.locator("[data-idee='i1']").getByRole("button", { name: "Modifier" }), "on ne modifie pas l'idée d'un autre").toHaveCount(0);
});

test("« Montrer » ferme la feuille et entoure la section visée", async ({ page }) => {
  await ouvrirChant(page, JO);
  await ouvrirLaFeuille(page);
  const premiere = page.locator("[data-suggestion]").first();
  const section = await premiere.locator("p").first().innerText();
  await premiere.getByRole("button", { name: "Montrer" }).click();
  await expect(page.locator("[data-idees-harmonie]"), "la feuille s'efface pour laisser voir").toBeHidden();
  const entouree = page.locator(".harmonie-surligne");
  await expect(entouree).toHaveCount(1);
  await expect(entouree).toContainText(section.split(" · ")[0], { ignoreCase: true });
});

test("un batteur n'a pas l'entrée « Idées d'harmonie »", async ({ page }) => {
  await ouvrirChant(page, YIYI);
  await page.getByRole("button", { name: /Plus d'actions|More actions|更多操作/ }).click();
  await expect(page.getByRole("menuitem", { name: "Idées d'harmonie" })).toHaveCount(0);
});
