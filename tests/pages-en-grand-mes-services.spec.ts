import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { cleDeTransition } from "../src/lib/deuxVolets";
import { adresseDuService, repetitionsDe, serviceDeLAdresse } from "../src/lib/planning/mesServices";

// Lot U4 bis, tranche B4 — Mes services (docs/spec-pages-en-grand.md, Q7 ; planches
// `mes-services-*`). En grand : la liste à gauche, le service à droite (rôles, répétition,
// setlist liée, équipe du service) ; sur l'adresse de la liste, le prochain service (Q3).
// Nouvelle adresse `/mes-services/[date]` (téléphone, liens). Tablette portrait : cartes sur
// deux colonnes. Feuilles Google, Firestore et date simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, pres: string, piano: string) =>
  [date, pres, "Noé T.", "Inès V.", piano, "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ENTETE_CULTE,
    culte("27/09", "Léa M.", "Ruth K."),
    culte("04/10", "Léa M.", "Ruth K."),
    culte("11/10", "Léa M.", "Yann B."),
    culte("18/10", "Hugo L.", "Ruth K."),
    culte("25/10", "Léa M.", "Ruth K."),
  ]),
  // Le même dimanche que le culte du 4 : deux services à la même date.
  Paix_T4: csv([["DATE", "Présidence", "Musiciens", "Orateur"], ["04/10", "Clara B.", "Ruth K.", "Orateur Z."]]),
};

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] } };

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const SETLIST = {
  title: "Culte du 4 octobre", leader: "Léa M.", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [item("hosanna", 1), item("abba-pere", 2)],
};
const DOCS = { "setlists/sl-1": SETLIST };

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse: string) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, RUTH, DOCS, adresse);
}

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand"; // ordinateur, ordinateur-1440, tablette-paysage
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const ligne = (page: Page, nom: RegExp) => liste(page).getByRole("link", { name: nom });
const equipe = (page: Page) => page.getByRole("region", { name: "L'équipe de ce service" });
const laSetlist = (page: Page) => page.getByRole("region", { name: "La setlist de ce service" });
const sansDefilementLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("Mes services : la règle des adresses, sans navigateur", () => {
  const s = (date: string, service: string, over: Record<string, unknown> = {}) => ({ date, service, roles: ["Piano"], ...over });
  const tous = [s("2026-10-04", "Culte Franco"), s("2026-10-04", "Groupe Paix"), s("2026-10-18", "Culte Franco")];

  test("un service seul à sa date : la date suffit ; deux le même jour : le service s'ajoute", () => {
    expect(adresseDuService(tous[2], tous)).toBe("/mes-services/2026-10-18");
    expect(adresseDuService(tous[1], tous)).toBe("/mes-services/2026-10-04?service=Groupe%20Paix");
    expect(adresseDuService(tous[0], tous)).toBe("/mes-services/2026-10-04?service=Culte%20Franco");
  });

  test("l'adresse rend son service ; sans service nommé, le premier du jour ; date inconnue, rien", () => {
    expect(serviceDeLAdresse(tous, "2026-10-04", "Groupe Paix")).toBe(tous[1]);
    expect(serviceDeLAdresse(tous, "2026-10-04", null)).toBe(tous[0]);
    expect(serviceDeLAdresse(tous, "2026-10-04", "Inconnu")).toBe(tous[0]);
    expect(serviceDeLAdresse(tous, "2026-10-11", null)).toBeUndefined();
  });

  test("la répétition d'une séance du Campus : même séance (date et moment), service différent", () => {
    const soir = s("2026-10-18", "Campus (soir)", { moment: "soir" });
    const repet = s("2026-10-17", "Campus (répét.)", { setlistDate: "2026-10-18", moment: "soir", time: "17:00" });
    const repetMatin = s("2026-10-17", "Campus (répét.)", { setlistDate: "2026-10-18", moment: "matin" });
    expect(repetitionsDe([soir, repet, repetMatin], soir)).toEqual([repet]);
    expect(repetitionsDe([soir, repet], repet), "une répétition n'a pas de répétition").toEqual([]);
  });

  test("la section reste montée d'un service à l'autre, et Mes tâches d'une tâche à l'autre", () => {
    expect(cleDeTransition("/mes-services/2026-10-18")).toBe("/mes-services");
    expect(cleDeTransition("/taches/da/t1")).toBe("/taches");
  });
});

test.describe("Mes services en grand", () => {
  test.beforeEach(({}, info) => { test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage"); });

  test("la liste à gauche, le prochain service à droite, l'adresse inchangée", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await expect(liste(page).getByRole("heading", { name: "Mes services", level: 2 })).toBeVisible();
    await expect(detail(page).getByRole("heading", { name: "Dimanche 4 octobre", level: 1 })).toBeVisible();
    await expect(ligne(page, /Culte Franco.*4 oct/)).toHaveAttribute("aria-current", "page");
    expect(new URL(page.url()).pathname).toMatch(/^\/mes-services\/?$/);
    // L'équipe d'après le planning, la personne en pastille d'encre ; la setlist liée.
    await expect(equipe(page).getByText("Léa M.")).toBeVisible();
    await expect(equipe(page).getByTestId("moi")).toHaveText("Ruth K.");
    await expect(laSetlist(page).getByText("Culte du 4 octobre")).toBeVisible();
    await expect(laSetlist(page).getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
    await expect(laSetlist(page).getByRole("link", { name: "Mode Louange" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?\?louange=1$/);
    // Côte à côte : la setlist à gauche, l'équipe à droite (planche `mes-services-ordinateur`).
    const [a, b] = [(await laSetlist(page).boundingBox())!, (await equipe(page).boundingBox())!];
    expect(b.x).toBeGreaterThan(a.x + a.width - 1);
    expect(await sansDefilementLateral(page)).toBe(true);
  });

  test("un lien direct vers un service : la liste à gauche, le service à droite ; retour arrière rend le précédent", async ({ page }) => {
    await ouvrir(page, "/mes-services/2026-10-18");
    await expect(detail(page).getByRole("heading", { name: "Dimanche 18 octobre", level: 1 })).toBeVisible();
    await expect(ligne(page, /Culte Franco.*18 oct/)).toHaveAttribute("aria-current", "page");
    await expect(equipe(page).getByText("Hugo L.")).toBeVisible();
    await ligne(page, /Culte Franco.*25 oct/).click();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-25\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Dimanche 25 octobre", level: 1 })).toBeVisible();
    await expect(ligne(page, /Culte Franco.*18 oct/), "la liste reste montée").toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-18\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Dimanche 18 octobre", level: 1 })).toBeVisible();
  });

  test("deux services le même jour : chacun son adresse", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await ligne(page, /Groupe Paix.*4 oct/).click();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-04\/?\?service=Groupe(\+|%20)Paix$/);
    await expect(ligne(page, /Groupe Paix.*4 oct/)).toHaveAttribute("aria-current", "page");
    await expect(ligne(page, /Culte Franco.*4 oct/)).not.toHaveAttribute("aria-current", "page");
    await expect(equipe(page).getByText("Clara B.")).toBeVisible();
  });

  test("Passés : à droite, le dernier service passé", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await liste(page).getByRole("button", { name: "Passés" }).click();
    await expect(detail(page).getByRole("heading", { name: "Dimanche 27 septembre", level: 1 })).toBeVisible();
  });
});

test("tablette portrait : cartes sur deux colonnes ; le service seul sur son adresse", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "tablette portrait");
  await ouvrir(page, "/mes-services");
  const cartes = page.getByTestId("carte-service");
  await expect(cartes.first()).toBeVisible();
  const [b1, b2] = [(await cartes.nth(0).boundingBox())!, (await cartes.nth(1).boundingBox())!];
  expect(b2.x, "deux colonnes").toBeGreaterThan(b1.x + b1.width - 1);
  expect(Math.abs(b2.y - b1.y)).toBeLessThan(2);
  await page.getByRole("link", { name: /Culte Franco.*18 oct/ }).click();
  await expect(page).toHaveURL(/\/mes-services\/2026-10-18\/?$/);
  await expect(page.getByRole("heading", { name: "Dimanche 18 octobre", level: 1 })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Mes services", exact: true })).toBeVisible();
  expect(await sansDefilementLateral(page)).toBe(true);
});

test("téléphone : la liste, puis le service en page (l'équipe avant la setlist)", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "téléphone");
  await ouvrir(page, "/mes-services");
  await expect(page.getByRole("heading", { name: "Mes services", level: 1 })).toBeVisible();
  // Le lien « Setlist » de la ligne mène toujours à la setlist.
  await expect(page.getByRole("link", { name: "Setlist" }).first()).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
  await page.getByRole("link", { name: /Culte Franco.*4 oct/ }).click();
  await expect(page).toHaveURL(/\/mes-services\/2026-10-04\/?\?service=Culte(\+|%20)Franco$/);
  await expect(page.getByRole("heading", { name: "Dimanche 4 octobre", level: 1 })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  const retour = page.getByRole("link", { name: "Mes services", exact: true });
  await expect(retour).toBeVisible();
  const [eq, sl] = [(await equipe(page).boundingBox())!, (await laSetlist(page).boundingBox())!];
  expect(sl.y, "la setlist sous l'équipe").toBeGreaterThan(eq.y + eq.height - 1);
  expect(await sansDefilementLateral(page)).toBe(true);
  await retour.click();
  await expect(page).toHaveURL(/\/mes-services\/?$/);
});

test("capture : Mes services", async ({ page }, info) => {
  await ouvrir(page, disposition(info) === "grand" ? "/mes-services/2026-10-18" : "/mes-services");
  await expect(page.getByText("Culte Franco").first()).toBeVisible();
  await page.screenshot({ path: `test-results/pages-en-grand/mes-services-${info.project.name}.png`, animations: "disabled" });
  if (disposition(info) !== "grand") {
    await page.goto("/mes-services/2026-10-04?service=Culte%20Franco");
    await expect(equipe(page)).toBeVisible();
    await page.screenshot({ path: `test-results/pages-en-grand/mes-services-detail-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  }
});
