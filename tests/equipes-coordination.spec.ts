import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_EMAIL, orga, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, ongletsRail } from "./helpers/agencement";
import { droitsDesPages, estResponsable, isCoordination, sousPartiesEvenements } from "../src/lib/access";
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
  dansEquipes: ["evenementiel"], referentDe: ["evenementiel"],
};
/** Simple membre de TEAM ACCUEIL J1, sans la case. */
const NINA: FakeProfile = {
  uid: "u-nina", email: "nina@example.com", firstName: "Nina", lastName: "B.",
  dansEquipes: ["accueil-j1"],
};
/** Le même référent, à qui un admin a coché « Coordination ». */
const HUGO_COORD: FakeProfile = { ...HUGO, coordination: true };
/** La case seule, sans équipe ni autre droit. */
const IRIS: FakeProfile = { uid: "u-iris", email: "iris@example.com", firstName: "Iris", lastName: "D.", coordination: true };
/** Droit Équipes (tenir l'organigramme) sans être admin. */
const ELSA: FakeProfile = { uid: "u-elsa", email: "elsa@example.com", firstName: "Elsa", lastName: "N.", equipes: true, ...orga() };
/** Lot AO : Coordination = une place d'organigramme. Hugo, référent de TEAM ÉVÉNEMENTIEL, aussi référent EDD ; Iris, membre d'Orga, sans autre équipe. */
const HUGO_ORGA: FakeProfile = { ...HUGO, dansEquipes: ["evenementiel", "edd"], referentDe: ["evenementiel", "edd"] };
const IRIS_ORGA: FakeProfile = { uid: "u-iris", email: "iris@example.com", firstName: "Iris", lastName: "D.", ...orga() };

const PROFIL = (p: FakeProfile, over: Record<string, unknown> = {}) => ({
  email: p.email, firstName: p.firstName, lastName: p.lastName, planningName: "",
  serviceRoles: {}, annonces: [], notify: [], equipes: false, plannings: [],
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
    expect(droitsDesPages(user(IRIS), IRIS).evenements).toBe(true);
    expect(sousPartiesEvenements(user(IRIS), IRIS)).toEqual(["evenements", "scene"]);
    expect(sousPartiesEvenements(user(NINA), NINA), "le pôle Événement n'ouvre plus la scène").toEqual([]);
  });
});

// ─── Personnes : la fiche et le formulaire (lot AO) ──────────────────────────

// Lot AO : la case « Coordination » n'existe plus dans Personnes (interrupteur ouvert) : la Coordination vient d'une place de
// l'organigramme (référent Louange, référent EDD, membre d'Orga) et la fiche la dit dans « Ce que ça lui ouvre ». L'ancienne
// case n'a plus d'écran : le back-office est en 404 interrupteur coupé. Les tests d'avant la cochaient ; les voici dans le
// nouveau mode.
test("Personnes : la fiche d'un référent EDD dit « Coordination » dans « Ce que ça lui ouvre » ; le formulaire n'a plus de case", async ({ page }, info: TestInfo) => {
  const db = await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo", { "users/u-hugo": PROFIL(HUGO_ORGA) });
  if (estGrandEcran(info)) {
    await expect(carteDroits(page)).toContainText(/Admin\s*Non/);
    await expect(carteDroits(page)).not.toContainText("Coordination");
    await expect(fiche(page).getByRole("region", { name: "Ce que ça lui ouvre" })).toContainText("Coordination : scène, fêtes et évènements de toute l'Église");
    await capture(page, "coordination-fiche");
  }
  // Un volet : la fiche est une page entière, « Modifier » ouvre le formulaire.
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Coordination", exact: true })).toHaveCount(0);
  await expect(page.getByText("Régler la scène, créer pour toute l'église, modifier tout évènement")).toHaveCount(0);
  await expect(page.getByText("Coordination : scène, fêtes et évènements de toute l'Église")).toBeVisible();
  await capture(page, "coordination-formulaire");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  // L'identité seule s'écrit : aucun droit (ni `coordination`, ni `equipes`…) ne part d'ici.
  await expect.poll(() => db.writes.some((w) => w.method === "PATCH" && w.path === "users/u-hugo")).toBe(true);
  expect(Object.keys(db.writes.find((w) => w.method === "PATCH" && w.path === "users/u-hugo")!.data).sort()).toEqual(["firstName", "lastName", "planningName"]);
});

test("Personnes en 中文 : « 协调 » dans « 这会开放什么权限 »", async ({ page }, info: TestInfo) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo", { "users/u-hugo": PROFIL(HUGO_ORGA) });
  if (estGrandEcran(info)) {
    await expect(fiche(page).getByRole("region", { name: "这会开放什么权限" })).toContainText("协调：舞台、节日和全教会的活动");
    await capture(page, "coordination-fiche-zh");
  }
  await page.getByRole("button", { name: /^(Modifier|修改)$/ }).click();
  await expect(page.getByRole("button", { name: "协调", exact: true })).toHaveCount(0);
  await expect(page.getByText("协调：舞台、节日和全教会的活动")).toBeVisible();
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
    // Le pôle écrit ne donne rien : pas de Coordination dans « Ce que ça lui ouvre ».
    await expect(fiche(page)).not.toContainText("Coordination : scène");
  }
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  await expect(page.getByRole("button", { name: "Coordination", exact: true })).toHaveCount(0);
  await expect(page.getByText(/Pôles \(donnés par les équipes/)).toHaveCount(0);
  await expect(page.getByText(/Coché hors organigramme/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Décocher" })).toHaveCount(0);
});

test("Personnes : qui tient l'organigramme sans être admin n'a pas Personnes, donc pas de case", async ({ page }) => {
  await ouvrir(page, ELSA, "/back-office/equipes/personnes?uid=u-hugo", { "users/u-hugo": PROFIL(HUGO) });
  await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Coordination", exact: true })).toHaveCount(0);
});

// ─── Ce qu'ouvre la Coordination ─────────────────────────────────────────────────────

// Depuis EQ-B, un simple membre d'équipe n'a que Tâches et Réunions (EQ17) : sans la case, ACCUEIL J1
// n'atteint même plus Évènements ; seul le référent (responsable) a l'entrée à vérifier ici.
test("sans la case, un membre de TEAM ACCUEIL J1 n'a pas Évènements : ses adresses le ramènent à Tâches (EQ17)", async ({ page }) => {
  await ouvrir(page, NINA, "/moi", { "evenements/foot": FOOT });
  await page.goto("/back-office/evenements/scene/noel");
  await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
  await page.goto("/back-office/evenements/foot");
  await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
  await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
});

for (const [qui, profil] of [["un référent de TEAM ÉVÉNEMENTIEL", HUGO]] as const) {
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

for (const [qui, profil] of [["le même référent, aussi référent EDD", HUGO_ORGA], ["un membre d'Orga sans autre équipe", IRIS_ORGA]] as const) {
  test(`avec la Coordination (organigramme), ${qui} a Pâques et Noël, « Toute l'église » et « Modifier »`, async ({ page }) => {
    await ouvrir(page, profil, "/back-office/evenements/scene/noel", { "evenements/foot": FOOT });
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Pâques", "Noël"]);
    await expect(page.getByText("Réservé à la coordination.")).toHaveCount(0);

    await page.goto("/back-office/evenements/nouveau");
    await expect(page.getByLabel("Public").locator("option", { hasText: "Toute l'église" })).toBeAttached();

    await page.goto("/back-office/evenements/foot");
    await expect(page.getByRole("link", { name: "Modifier" })).toBeVisible();
  });
}
