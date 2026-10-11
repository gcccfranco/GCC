import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, ongletsRail } from "./helpers/agencement";
import { entreesBackOffice, estResponsable, isCoordination, sousPartiesEvenements } from "../src/lib/access";
import type { Evenement } from "../src/types/evenement";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-A :
// la coordination (régler la scène, créer pour toute l'église, modifier tout évènement) n'est
// plus donnée par le pôle Événement : c'est un droit coché par un admin dans Personnes
// (décision 6, EQ24 à EQ26). Personne ne l'a au départ ; TEAM ÉVÉNEMENTIEL et ACCUEIL J1 ne la
// donnent plus. La carte « Pôles » de Personnes disparaît. Base et Sheets simulés, noms fictifs.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Référent de TEAM ÉVÉNEMENTIEL, sans la case : l'organigramme lui donnait le pôle Événement,
 *  qui donnait la coordination ; il ne donne plus rien. */
const HUGO: FakeProfile = {
  uid: "u-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "L.",
  poles: ["evenement"], dansEquipes: ["evenementiel"], referentDe: ["evenementiel"],
};
/** Simple membre de TEAM ACCUEIL J1, sans la case. */
const NINA: FakeProfile = {
  uid: "u-nina", email: "nina@example.com", firstName: "Nina", lastName: "B.",
  poles: ["evenement"], dansEquipes: ["accueil-j1"],
};
/** Le même référent, à qui un admin a coché « Coordination ». */
const HUGO_COORD: FakeProfile = { ...HUGO, coordination: true };
/** La case seule, sans équipe ni autre droit. */
const IRIS: FakeProfile = { uid: "u-iris", email: "iris@example.com", firstName: "Iris", lastName: "D.", coordination: true };
/** Droit Équipes (tenir l'organigramme) sans être admin. */
const ELSA: FakeProfile = { uid: "u-elsa", email: "elsa@example.com", firstName: "Elsa", lastName: "N.", equipes: true };

const PROFIL = (p: FakeProfile, over: Record<string, unknown> = {}) => ({
  email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: "",
  serviceRoles: {}, annonces: [], notify: [], poles: p.poles ?? [], equipes: false, plannings: [],
  ...(p.dansEquipes ? { dansEquipes: p.dansEquipes } : {}), ...(p.referentDe ? { referentDe: p.referentDe } : {}),
  ...over,
});

/** Un évènement de toute l'église organisé par quelqu'un d'autre. */
const FOOT: Omit<Evenement, "id"> = {
  titre: "Foot au parc", type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "", dateFin: "",
  lieu: "Parc de Bercy", description: "", liens: [], images: [], placesMax: 10, inscriptionOuverte: true, sansCompte: false,
  lienExterne: "", contact: "", organisateurUid: "uid-steph", organisateurNom: "Steph R.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  // Personnes lit les plannings dans le Sheet : une feuille vide, jamais la vraie.
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const fiche = (page: Page) => page.locator('[data-volet="detail"]');
const carteDroits = (page: Page) =>
  fiche(page).locator("section").filter({ has: page.getByRole("heading", { name: "Droits", exact: true }) });

// ─── Pur : la source de la coordination ──────────────────────────────────────

test.describe("pur : la coordination est un droit coché, plus un pôle", () => {
  test("isCoordination lit `coordination` ; le pôle Événement ne donne plus rien", () => {
    expect(isCoordination(user(HUGO), HUGO), "pôle Événement, sans la case").toBe(false);
    expect(isCoordination(user(NINA), NINA), "ACCUEIL J1, sans la case").toBe(false);
    expect(isCoordination(user(HUGO), HUGO_COORD)).toBe(true);
    expect(isCoordination(user(HUGO), { coordination: false })).toBe(false);
    expect(isCoordination(user(HUGO), null)).toBe(false);
    expect(isCoordination({ email: ADMIN_EMAIL }, null), "un admin reste coordination").toBe(true);
  });

  test("la case seule fait une responsable : Évènements, avec Pâques et Noël", () => {
    expect(estResponsable(user(IRIS), IRIS)).toBe(true);
    expect(entreesBackOffice(user(IRIS), IRIS)).toContain("evenements");
    expect(sousPartiesEvenements(user(IRIS), IRIS)).toEqual(["evenements", "scene"]);
    expect(sousPartiesEvenements(user(NINA), NINA), "le pôle Événement n'ouvre plus la scène").toEqual([]);
  });
});

// ─── Personnes : la case et la ligne ─────────────────────────────────────────

test("Personnes : un admin coche « Coordination » ; le masque porte `coordination`, la fiche dit Oui", async ({ page }, info: TestInfo) => {
  const masques: string[][] = [];
  page.on("request", (r) => {
    if (r.method() === "PATCH" && /\/documents\/users\/u-hugo/.test(r.url())) {
      masques.push(new URL(r.url()).searchParams.getAll("updateMask.fieldPaths"));
    }
  });
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo", { "users/u-hugo": PROFIL(HUGO) });
  if (estGrandEcran(info)) {
    await expect(carteDroits(page)).toContainText(/Admin\s*Non\s*Coordination\s*Non/);
    await fiche(page).getByRole("button", { name: "Modifier" }).click();
  }
  const coche = page.getByRole("button", { name: "Coordination", exact: true });
  await expect(coche).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText("Régler la scène, créer pour toute l'église, modifier tout évènement")).toBeVisible();
  await coche.click();
  await expect(coche).toHaveAttribute("aria-pressed", "true");
  await capture(page, "coordination-formulaire");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();

  await expect.poll(() => masques.length).toBe(1);
  expect(masques[0]).toContain("coordination");
  expect(masques[0], "les pôles ne sont jamais renvoyés").not.toContain("poles");
  expect(db.writes.find((w) => w.method === "PATCH" && w.path === "users/u-hugo")?.data.coordination).toBe(true);
  expect(db.doc("users/u-hugo")?.coordination).toBe(true);

  if (estGrandEcran(info)) {
    await expect(carteDroits(page)).toContainText(/Admin\s*Non\s*Coordination\s*Oui/);
    await capture(page, "coordination-fiche");
  } else {
    // Un volet : la ligne se replie à l'enregistrement ; rouverte, la case est cochée.
    await page.getByRole("button", { name: /Hugo L\./ }).click();
    await expect(page.getByRole("button", { name: "Coordination", exact: true })).toHaveAttribute("aria-pressed", "true");
  }
});

test("Personnes en 中文 : « 协调 », cochée", async ({ page }, info: TestInfo) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo", { "users/u-hugo": PROFIL(HUGO, { coordination: true }) });
  if (estGrandEcran(info)) {
    await expect(carteDroits(page)).toContainText(/Admin\s*Non\s*协调\s*Oui/);
    await capture(page, "coordination-fiche-zh");
    await fiche(page).getByRole("button", { name: "Modifier" }).click();
  }
  await expect(page.getByRole("button", { name: "协调", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("管理舞台、为全教会创建、修改所有活动")).toBeVisible();
  await capture(page, "coordination-formulaire-zh");
});

test("Personnes : plus de carte « Pôles » ni de « Coché hors organigramme »", async ({ page }, info: TestInfo) => {
  // Un pôle encore écrit sur le profil, qu'aucune équipe ne donne : avant, « Coché hors organigramme : Orga ».
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo", {
    "users/u-hugo": PROFIL(HUGO, { poles: ["orga"], dansEquipes: [], referentDe: [] }),
  });
  if (estGrandEcran(info)) {
    await expect(carteDroits(page)).toBeVisible();
    await expect(fiche(page).getByRole("heading", { name: "Pôles" })).toHaveCount(0);
    await fiche(page).getByRole("button", { name: "Modifier" }).click();
  }
  await expect(page.getByRole("button", { name: "Coordination", exact: true })).toBeVisible();
  await expect(page.getByText(/Pôles \(donnés par les équipes/)).toHaveCount(0);
  await expect(page.getByText(/Coché hors organigramme/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Décocher" })).toHaveCount(0);
});

test("Personnes : le droit Équipes sans être admin ne montre pas la case", async ({ page }) => {
  await ouvrir(page, ELSA, "/back-office/equipes/personnes?uid=u-hugo", { "users/u-hugo": PROFIL(HUGO) });
  await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Coordination", exact: true })).toHaveCount(0);
});

// ─── Ce qu'ouvre la case ─────────────────────────────────────────────────────

for (const [qui, profil] of [["un référent de TEAM ÉVÉNEMENTIEL", HUGO], ["un membre de TEAM ACCUEIL J1", NINA]] as const) {
  test(`sans la case, ${qui} n'a ni Pâques ni Noël, ni « Toute l'église », ni « Modifier » sur l'évènement d'un autre`, async ({ page }) => {
    await ouvrir(page, profil, "/back-office/evenements/scene/noel", { "evenements/foot": FOOT });
    await expect(page.getByText("Réservé à la coordination.")).toBeVisible();
    await expect(ongletsRail(page).getByRole("link", { name: "Pâques" })).toHaveCount(0);
    await expect(ongletsRail(page).getByRole("link", { name: "Noël" })).toHaveCount(0);

    await page.goto("/back-office/evenements/nouveau");
    await expect(page.getByLabel("Public")).toBeVisible();
    await expect(page.getByLabel("Public").locator("option", { hasText: "Toute l'église" })).toHaveCount(0);

    await page.goto("/back-office/evenements/foot");
    await expect(page.getByText("Cette page est réservée à la coordination et aux responsables de section.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
  });
}

for (const [qui, profil] of [["le même référent", HUGO_COORD], ["une personne d'aucune équipe", IRIS]] as const) {
  test(`avec la case, ${qui} a Pâques et Noël, « Toute l'église » et « Modifier »`, async ({ page }) => {
    await ouvrir(page, profil, "/back-office/evenements/scene/noel", { "evenements/foot": FOOT });
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Pâques", "Noël"]);
    await expect(page.getByText("Réservé à la coordination.")).toHaveCount(0);

    await page.goto("/back-office/evenements/nouveau");
    await expect(page.getByLabel("Public").locator("option", { hasText: "Toute l'église" })).toBeAttached();

    await page.goto("/back-office/evenements/foot");
    await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();
  });
}
