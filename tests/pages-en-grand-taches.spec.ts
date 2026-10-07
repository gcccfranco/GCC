import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot U4 bis, tranche B4 — Mes tâches (docs/spec-pages-en-grand.md, Q8 ; planches
// `mes-taches-*`). « À faire pour moi » : en grand, la liste à gauche et la fiche à lire à
// droite (échéance, responsable, répétition, évènement, « Quand c'est fait, prévenir », lien,
// note, état à trois positions), avec « Modifier », qui ouvre le formulaire d'aujourd'hui.
// Téléphone : la fiche en page (`/taches/[pole]/[id]`). Le formulaire ne s'ouvre plus qu'avec
// « Modifier ». Firestore et date simulés ; personnes fictives.

const RUTH: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Ruth", lastName: "K.", poles: ["da"] };

function tacheDoc(over: Record<string, unknown> = {}) {
  return {
    pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-05",
    repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-da",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
  };
}
const DOCS = {
  "poles/da/taches/t3": tacheDoc({ titre: "Planning du trimestre", responsableUid: "uid-da", responsableNom: "Ruth K.", echeance: "2026-10-05" }),
  "poles/da/taches/t2": tacheDoc({ titre: "Fond PPT du culte", echeance: "2026-10-01", repetition: { rythme: "semaine" } }),
  "poles/da/taches/t1": tacheDoc({
    titre: "Affiche de Noël", responsableUid: "uid-da", responsableNom: "Ruth K.", echeance: "2026-09-28",
    evenement: { id: "noel", titre: "Culte de Noël" }, prevenir: { pole: "media" },
    lien: "https://example.com/affiche-noel", note: "Format A3 + version Instagram",
  }),
  "poles/da/taches/t1/fois/2026-09-28": {
    date: "2026-09-28", parUid: "uid-da", parNom: "Ruth K.", le: "2026-09-28T09:00:00Z", etat: "encours", debutLe: "2026-09-28T09:00:00Z",
  },
};

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse: string) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, RUTH, DOCS, adresse);
}

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand";
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const ligne = (page: Page, titre: string) => page.getByRole("button", { name: new RegExp(`^${titre}`) });
const fiche = (page: Page) => page.getByRole("article", { name: /./ });
const sansDefilementLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("Mes tâches en grand", () => {
  test.beforeEach(({}, info) => { test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage"); });

  test("la liste à gauche, la première tâche à faire à droite, en fiche à lire", async ({ page }) => {
    await ouvrir(page, "/taches");
    // Agencement v18 (R3, tranche Z) : le titre de la page est le h1 de l'en-tête commun, au-dessus
    // des deux volets ; la liste n'a plus de titre, la fiche se titre en h2.
    await expect(page.locator("header[data-entete-page]").getByRole("heading", { name: "Tâches", level: 1 })).toBeVisible();
    await expect(liste(page).getByRole("heading", { name: "À faire pour moi" })).toBeVisible();
    // Dans l'ordre des échéances : l'affiche (28 sept.) d'abord ; la tâche de chaque semaine
    // montre aussi sa fois suivante (8 oct.), visible 7 jours avant.
    await expect(liste(page).getByRole("checkbox")).toHaveCount(4);
    await expect(liste(page).getByRole("checkbox").first()).toHaveAccessibleName(/Affiche de Noël/);
    const d = detail(page);
    await expect(d.getByRole("heading", { name: "Affiche de Noël", level: 2 })).toBeVisible();
    await expect(ligne(page, "Affiche de Noël")).toHaveAttribute("aria-current", "page");
    await expect(d.getByText("Pôle DA")).toBeVisible();
    await expect(d.getByText("Lundi 28 septembre")).toBeVisible();
    await expect(d.getByText("Ruth K.").first()).toBeVisible();
    await expect(d.getByText("Une seule fois")).toBeVisible();
    await expect(d.getByRole("link", { name: "Culte de Noël" })).toHaveAttribute("href", /^\/evenements\/noel\/?$/);
    await expect(d.getByText("Pôle Média")).toBeVisible();
    await expect(d.getByRole("link", { name: /example\.com\/affiche-noel/ })).toHaveAttribute("href", "https://example.com/affiche-noel");
    await expect(d.getByText("Format A3 + version Instagram")).toBeVisible();
    await expect(d.getByRole("radio", { name: "En cours" })).toBeChecked();
    await expect(d.getByText(/En cours depuis 3 jours/)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(new URL(page.url()).pathname).toMatch(/^\/taches\/?$/);
    expect(await sansDefilementLateral(page)).toBe(true);
  });

  test("toucher une tâche ouvre sa fiche, pas le formulaire ; « Modifier » l'ouvre ; retour arrière", async ({ page }) => {
    await ouvrir(page, "/taches/da/t3");
    await expect(detail(page).getByRole("heading", { name: "Planning du trimestre", level: 2 })).toBeVisible();
    await ligne(page, "Fond PPT du culte jeu\\. 1 oct").click();
    await expect(page).toHaveURL(/\/taches\/da\/t2\/?\?date=2026-10-01$/);
    await expect(detail(page).getByRole("heading", { name: "Fond PPT du culte", level: 2 })).toBeVisible();
    await expect(detail(page).getByText("Chaque semaine")).toBeVisible();
    await expect(detail(page).getByText("Tout le pôle")).toBeVisible();
    await expect(page.getByRole("dialog"), "le toucher n'ouvre plus le formulaire").toHaveCount(0);
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const form = page.getByRole("dialog", { name: "Modifier la tâche" });
    await expect(form.getByLabel("Titre")).toHaveValue("Fond PPT du culte");
    await page.keyboard.press("Escape");
    await expect(form).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/taches\/da\/t3\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Planning du trimestre", level: 2 })).toBeVisible();
  });
});

test("l'état à trois positions : À faire, En cours, Terminée", async ({ page }) => {
  const db = await ouvrir(page, "/taches/da/t3");
  const etat = page.getByRole("radiogroup", { name: "État" });
  await expect(etat.getByRole("radio", { name: "À faire" })).toBeChecked();
  await etat.getByRole("radio", { name: "En cours" }).click();
  await expect(etat.getByRole("radio", { name: "En cours" })).toBeChecked();
  expect(db.doc("poles/da/taches/t3/fois/2026-10-05")).toMatchObject({ etat: "encours", parUid: "uid-da", parNom: "Ruth K." });
  await etat.getByRole("radio", { name: "Terminée" }).click();
  await expect(etat.getByRole("radio", { name: "Terminée" })).toBeChecked();
  await expect(page.getByText("Faite par Ruth K.")).toBeVisible();
  expect(db.doc("poles/da/taches/t3/fois/2026-10-05")).toMatchObject({ etat: "terminee" });
  await etat.getByRole("radio", { name: "À faire" }).click();
  await expect(etat.getByRole("radio", { name: "À faire" })).toBeChecked();
  expect(db.doc("poles/da/taches/t3/fois/2026-10-05")).toBeUndefined();
});

// Relecture du lot : la fiche n'ouvre que les liens web ; un autre schéma (`javascript:`,
// `data:`) se lit en texte, sans lien.
test("le lien de la fiche : seulement http(s), un autre schéma reste du texte", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, RUTH, {
    ...DOCS,
    "poles/da/taches/t8": tacheDoc({ titre: "Lien douteux", lien: "javascript:alert(1)" }),
    "poles/da/taches/t9": tacheDoc({ titre: "Lien data", lien: "data:text/html,<b>x</b>" }),
  }, "/taches/da/t8");
  const f = page.getByRole("article", { name: "Lien douteux" });
  await expect(f.getByRole("heading", { name: "Lien douteux" })).toBeVisible();
  await expect(f.getByText("javascript:alert(1)")).toBeVisible();
  await expect(f.locator("a[href^='javascript']")).toHaveCount(0);
  await page.goto("/taches/da/t9");
  const g = page.getByRole("article", { name: "Lien data" });
  await expect(g.getByText("data:text/html,<b>x</b>")).toBeVisible();
  await expect(g.locator("a[href^='data:']")).toHaveCount(0);
});

test("une tâche d'un pôle dont on n'est pas : la fiche le dit, sans rien montrer", async ({ page }) => {
  await ouvrir(page, "/taches/media/m1");
  await expect(page.getByText("Tu ne fais pas partie de ce pôle.")).toBeVisible();
});

test("un volet : la liste, puis la fiche en page ; « Modifier » ouvre le formulaire", async ({ page }, info) => {
  test.skip(disposition(info) === "grand", "un volet : téléphone et tablette portrait");
  await ouvrir(page, "/taches");
  await expect(page.getByRole("heading", { name: "Tâches", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Les tâches des pôles/ })).toBeVisible();
  await ligne(page, "Planning du trimestre").click();
  await expect(page).toHaveURL(/\/taches\/da\/t3\/?$/);
  await expect(page.getByRole("heading", { name: "Planning du trimestre", level: 1 })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect(page.getByRole("dialog", { name: "Modifier la tâche" })).toBeVisible();
  await page.keyboard.press("Escape");
  const retour = page.getByRole("link", { name: "Tâches", exact: true });
  await expect(retour).toBeVisible();
  expect(await sansDefilementLateral(page)).toBe(true);
  await retour.click();
  await expect(page).toHaveURL(/\/taches\/?$/);
});

test("tablette portrait : « À faire pour moi » et les tâches des pôles côte à côte", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "tablette portrait");
  await ouvrir(page, "/taches");
  const aFaire = page.locator("section", { has: page.getByRole("heading", { name: "À faire pour moi" }) });
  const poles = page.getByRole("link", { name: /Les tâches des pôles/ });
  await expect(poles).toBeVisible();
  const [a, b] = [(await aFaire.boundingBox())!, (await poles.boundingBox())!];
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
});

test("capture : Mes tâches", async ({ page }, info) => {
  await ouvrir(page, "/taches");
  await expect(page.getByText("Affiche de Noël").first()).toBeVisible();
  await page.screenshot({ path: `test-results/pages-en-grand/mes-taches-${info.project.name}.png`, animations: "disabled" });
  if (disposition(info) !== "grand") {
    await page.goto("/taches/da/t1");
    await expect(fiche(page).getByText("Format A3 + version Instagram")).toBeVisible();
    await page.screenshot({ path: `test-results/pages-en-grand/mes-taches-fiche-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  }
});
