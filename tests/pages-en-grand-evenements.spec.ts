import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import type { Evenement } from "../src/types/evenement";

// Lot U4 bis, tranche B2 — Évènements en grand (docs/spec-pages-en-grand.md, Q5 ; planches
// `evenements-*`, `evenement-fiche-telephone`). En grand : l'agenda dans le layout, la fiche à
// droite (sur l'adresse de l'agenda, le prochain évènement, Q3) ; « Nouvel évènement » en encre.
// Tablette portrait : cartes sur deux colonnes. Téléphone : l'agenda garde ses cartes à bannière,
// la fiche fait remonter l'inscription sous les infos. Firestore et date simulés ; personnes fictives.

const base: Omit<Evenement, "id" | "titre"> = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "21:00", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [{ label: "Plan d'accès", url: "https://example.com/plan" }], images: [],
  placesMax: 10, inscriptionOuverte: true, sansCompte: true, lienExterne: "",
  contact: "", organisateurUid: "uid-steph", organisateurNom: "Steph", epingle: false, expiresAt: null, inscrits: 4,
  createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const LOUANGE: Omit<Evenement, "id"> = { ...base, titre: "Soirée louange", type: "musique", date: "2026-10-09", heure: "20:00", lieu: "Grande salle", placesMax: null };
const FOOT: Omit<Evenement, "id"> = { ...base, titre: "Foot au parc" };
const PAIX: Omit<Evenement, "id"> = { ...base, titre: "Repas Groupe Paix", type: "loisir", pour: "Groupe Paix", date: "2026-10-17", heure: "12:30", lieu: "Salle du bas", placesMax: null };
const INFO: Omit<Evenement, "id"> = { ...base, titre: "Nouveau parking", type: "info", date: "", heure: "", epingle: true, placesMax: null, inscriptionOuverte: false, liens: [] };
const DOCS = { "evenements/louange": LOUANGE, "evenements/foot": FOOT, "evenements/paix": PAIX, "evenements/parking": INFO };

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", serviceRoles: { "Groupe Paix": ["chanteur"] } };
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };

async function membre(page: Page, qui: FakeProfile, adresse: string) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, qui, DOCS, adresse);
}

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand";
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const fiche = (page: Page) => page.getByTestId("fiche-carte");
/** Le volet de droite en grand : titre de la fiche en tête, hors de la carte d'inscription. */
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const sansDefilementLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("Évènements en grand", () => {
  test.beforeEach(({}, info) => { test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage"); });

  test("l'agenda à gauche, le prochain évènement à droite, l'adresse inchangée", async ({ page }) => {
    await membre(page, JO, "/evenements");
    await expect(liste(page).getByRole("heading", { name: "Évènements" })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: "Calendrier", exact: true }), "les onglets sont dans la liste").toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Repas Groupe Paix/ })).toBeVisible();
    await expect(liste(page).getByRole("region", { name: "À la une" }).getByRole("link", { name: /Nouveau parking/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Soirée louange", level: 1 })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Soirée louange/ })).toHaveAttribute("aria-current", "page");
    expect(new URL(page.url()).pathname).toMatch(/^\/evenements\/?$/);
    expect(await sansDefilementLateral(page)).toBe(true);
  });

  test("un lien direct vers une fiche : l'agenda à gauche, la fiche à droite ; retour arrière rend la précédente", async ({ page }) => {
    await membre(page, JO, "/evenements/paix");
    await expect(liste(page).getByRole("link", { name: /Repas Groupe Paix/ })).toHaveAttribute("aria-current", "page");
    await expect(detail(page).getByRole("heading", { name: "Repas Groupe Paix" })).toBeVisible();
    await liste(page).getByRole("link", { name: /Foot au parc/ }).click();
    await expect(page).toHaveURL(/\/evenements\/foot\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Foot au parc" })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Repas Groupe Paix/ }), "la liste reste montée").toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/evenements\/paix\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Repas Groupe Paix" })).toBeVisible();
  });

  test("la fiche : bannière et description à gauche, infos et inscription à droite ; badge « Inscrit » dans l'agenda", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, JO, { ...DOCS, "evenements/louange/inscriptions/uid-jo": { uid: "uid-jo", nom: "Jo L.", invites: 0, createdAt: "2026-09-21T10:00:00Z" } }, "/evenements/foot");
    const banniere = (await page.getByTestId("banniere").boundingBox())!;
    const sinscrire = (await page.getByRole("button", { name: "S'inscrire" }).boundingBox())!;
    expect(sinscrire.x, "l'inscription à droite de la bannière").toBeGreaterThan(banniere.x + banniere.width - 1);
    const description = (await page.getByText("Match amical, venez nombreux.").boundingBox())!;
    expect(description.y, "la description sous la bannière").toBeGreaterThan(banniere.y + banniere.height - 1);
    await expect(page.getByRole("link", { name: "Plan d'accès" })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Soirée louange/ }).getByText("Inscrit")).toBeVisible();
  });

  test("responsable : « Nouvel évènement » en encre et « Gérer dans le Back-Office » sur la fiche", async ({ page }) => {
    await membre(page, ALICE, "/evenements/foot");
    const nouvel = liste(page).getByRole("link", { name: "Nouvel évènement" });
    await expect(nouvel).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
    const [fond, encre] = await nouvel.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(document.body).color]);
    expect(fond, "en encre : la couleur du texte de la page").toBe(encre);
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toHaveAttribute("href", /^\/back-office\/evenements\/foot\/?$/);
  });

  test("sans compte : l'agenda et la fiche lisibles", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await fakeFirestore(page, DOCS);
    await page.goto("/evenements");
    await expect(page.getByRole("heading", { name: "Soirée louange", level: 1 })).toBeVisible();
    await expect(liste(page).getByText("Repas Groupe Paix")).toHaveCount(0);
  });
});

test("tablette portrait : l'agenda en cartes sur deux colonnes ; la fiche seule sur son adresse", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "tablette portrait");
  await membre(page, JO, "/evenements");
  const cartes = page.getByTestId("carte-evenement");
  await expect(cartes.first()).toBeVisible();
  const [b1, b2] = [(await cartes.nth(0).boundingBox())!, (await cartes.nth(1).boundingBox())!];
  expect(b2.x, "deux colonnes").toBeGreaterThan(b1.x + b1.width - 1);
  expect(Math.abs(b2.y - b1.y)).toBeLessThan(2);
  await cartes.nth(1).click();
  await expect(page).toHaveURL(/\/evenements\/foot\/?$/);
  await expect(fiche(page).getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  expect(await sansDefilementLateral(page)).toBe(true);
});

test("téléphone : l'agenda garde ses cartes à bannière ; la fiche fait remonter l'inscription sous les infos", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "téléphone");
  await membre(page, JO, "/evenements");
  await expect(page.getByTestId("carte-evenement").first().getByTestId("banniere")).toBeVisible();
  await page.goto("/evenements/foot");
  const sinscrire = (await page.getByRole("button", { name: "S'inscrire" }).boundingBox())!;
  const description = (await page.getByText("Match amical, venez nombreux.").boundingBox())!;
  const lieu = (await page.getByText("Parc de Bercy").boundingBox())!;
  expect(sinscrire.y, "l'inscription sous les infos").toBeGreaterThan(lieu.y);
  expect(description.y, "la description après l'inscription").toBeGreaterThan(sinscrire.y);
  expect(await sansDefilementLateral(page)).toBe(true);
});
