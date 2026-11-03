import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// partout-q2 (docs/spec-corrections-design/partout.md) : un halo veut toujours dire quelque chose.
// Seules les pages qui portent une couleur en ont un (Planning, fiche de setlist, évènements, scène) :
// un halo visible au coin de la zone de contenu, sa couleur sur la racine (`--halo`). Toutes les
// autres pages : zéro halo, pas de `--halo`, et aucune copie visible sous les barres (V8).

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T.", planningName: "Admin T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const EV = {
  titre: "Fête de rentrée", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "14:00", heureFin: "", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: null, inscriptions: "auto", inscriptionOuverte: true,
  sansCompte: false, contact: "", organisateurUid: "uid-admin", organisateurNom: "Admin T.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const TACHE = {
  equipe: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-06",
  repetition: null, lien: "", note: "", prevenir: null, auteurUid: "uid-admin",
  createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
};
const DOCS = { "evenements/fete": EV, "equipes/da/taches/t1": TACHE };

/** Les pages sans couleur à porter : plus aucun halo (App puis Back-Office). */
const PAGES_SANS_HALO = [
  "/mes-services", "/taches", "/taches/da", "/equipes/da", "/harmonie", "/harmonie/cours",
  "/harmonie/rd2000", "/profil", "/setlists/new", "/moi", "/equipes", "/guide", "/songs", "/setlists",
  "/back-office", "/back-office/calendrier", "/back-office/equipes/da", "/back-office/taches/da/t1",
  "/evenements", "/evenements/fete", "/back-office/evenements", "/back-office/evenements/fete",
  "/back-office/reunions", "/back-office/equipes", "/back-office/equipes/personnes",
  "/back-office/messages", "/back-office/messages/notifier", "/songs/statistiques", "/back-office/plus",
];
/** Les pages porteuses : scène (couleur de la scène), planning (couleur du service). */
const PAGES_AVEC_HALO = [
  "/evenements/scene", "/back-office/evenements/scene",
  "/back-office/planning", "/back-office/planning/culte",
];

/** Les halos visibles (jamais les copies des barres). */
const halosVisibles = (page: Page) => page.locator('[data-testid="halo"], [data-testid="halo-defaut"]').filter({ visible: true });

async function unSeulHaloAuCoin(page: Page, chemin: string) {
  await expect(halosVisibles(page), `${chemin} : un halo, un seul`).toHaveCount(1);
  const zone = await page.evaluate(() => {
    const barre = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barre-laterale")) || 0;
    return { x: barre, y: 0, width: document.documentElement.clientWidth - barre };
  });
  await expect.poll(() => halosVisibles(page).boundingBox(), `${chemin} : au coin de la zone de contenu`).toMatchObject(zone);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--halo").trim()), `${chemin} : couleur sur la racine`).not.toBe("");
}

async function aucunHalo(page: Page, chemin: string) {
  await expect(page.locator('[data-testid="halo"], [data-testid="halo-defaut"]'), `${chemin} : aucun halo`).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--halo").trim()), `${chemin} : pas de --halo`).toBe("");
  expect(
    await page.evaluate(() => [...document.querySelectorAll(".barre-halo")].filter((el) => getComputedStyle(el).display !== "none").length),
    `${chemin} : aucune copie visible sous les barres`,
  ).toBe(0);
}

async function ouvrirSession(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, DOCS, "/moi");
  await page.getByRole("heading", { level: 1, name: "Moi" }).waitFor();
}

test.describe("le halo d'en-tête seulement où il porte une couleur (partout-q2)", () => {
  for (const [nom, pages, attendu] of [["sans halo", PAGES_SANS_HALO, aucunHalo], ["avec halo", PAGES_AVEC_HALO, unSeulHaloAuCoin]] as const) {
    test(`App et Back-Office : pages ${nom}`, async ({ page }) => {
      test.setTimeout(240_000);
      await ouvrirSession(page);
      for (const chemin of pages) {
        await page.goto(chemin);
        // La page est arrivée (pas l'écran de chargement du Back-Office) : un titre est là.
        await page.locator("main h1, main h2").first().waitFor();
        await attendu(page, chemin);
        const dir = process.env.PW_CAPTURES;
        if (dir) await page.screenshot({ path: `${dir}/halo-${chemin.replace(/\W+/g, "_")}-${test.info().project.name}.png` });
      }
    });
  }

  test("la fiche d'une setlist garde la couleur de son culte ; la liste n'a plus de halo", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    const fiche = {
      title: "Culte 27/09", leader: "Élise R.", category: "Culte Francophone", date: "2026-09-27", language: "mixed", notes: "",
      ownerId: "uid-owner", isPrivate: false, isDraft: false, items: [],
    };
    await signInAs(page, ADMIN, { "setlists/culte": fiche }, "/setlists");
    await page.getByRole("heading", { level: 1, name: "Setlists" }).waitFor();
    await aucunHalo(page, "/setlists");
    await page.goto("/setlists/culte");
    await page.getByRole("button", { name: "Mode louange" }).waitFor();
    await unSeulHaloAuCoin(page, "/setlists/culte");
  });

  test("la connexion : panneau uni, aucun halo d'en-tête ni dégradé", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').first().waitFor();
    await expect(halosVisibles(page)).toHaveCount(0);
    expect(await page.getByTestId("panneau-marque").evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  });
});
