import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Retours de Timothée du 06/10/2026 au soir : le dégradé d'en-tête (le halo, `Halo`, `.halo`)
// manquait sur les pages arrivées avec le chantier U (Back-Office surtout). Il est sur toutes les
// pages de l'App et du Back-Office : celles qui ont leur couleur gardent leur halo, les autres
// prennent le halo par défaut, à l'encre comme Moi (l'écran n'appartient à aucune section).
// Exactement un halo visible, au coin de la zone de contenu, et sa couleur posée sur la racine
// (`--halo`) : les barres en repeignent une copie sous leurs boutons (V8).

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
  pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-06",
  repetition: null, lien: "", note: "", prevenir: null, auteurUid: "uid-admin",
  createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
};
const DOCS = { "evenements/fete": EV, "poles/da/taches/t1": TACHE };

/** Les pages qui n'avaient pas de halo (relevé du 06/10/2026), App puis Back-Office. */
const PAGES = [
  "/mes-services", "/evenements", "/evenements/fete", "/taches", "/taches/da", "/harmonie", "/harmonie/cours",
  "/harmonie/rd2000", "/profil", "/setlists/new",
  "/back-office", "/back-office/calendrier", "/back-office/taches", "/back-office/taches/da", "/back-office/evenements",
  "/back-office/evenements/fete", "/back-office/reunions", "/back-office/equipes", "/back-office/equipes/personnes",
  "/back-office/messages", "/back-office/messages/notifier", "/back-office/statistiques", "/back-office/planning",
  "/back-office/planning/culte", "/back-office/plus",
];

/** Les halos visibles (le halo d'une page et le halo par défaut ; jamais les copies des barres). */
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

test.describe("le halo d'en-tête sur toutes les pages (retours du 06/10/2026)", () => {
  test("App et Back-Office : chaque page a son halo, un seul", async ({ page }) => {
    test.setTimeout(240_000);
    await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, DOCS, "/moi");
    await page.getByRole("heading", { level: 1, name: "Moi" }).waitFor();
    for (const chemin of PAGES) {
      await page.goto(chemin);
      // La page est arrivée (pas l'écran de chargement du Back-Office) : un titre est là.
      await page.locator("main h1, main h2").first().waitFor();
      await unSeulHaloAuCoin(page, chemin);
      const dir = process.env.PW_CAPTURES;
      if (dir) await page.screenshot({ path: `${dir}/halo-${chemin.replace(/\W+/g, "_")}-${test.info().project.name}.png` });
    }
  });

  test("une page qui a sa couleur garde son halo, sans celui par défaut par-dessus", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, {}, "/setlists");
    await page.getByRole("heading", { level: 1, name: "Setlists" }).waitFor();
    await unSeulHaloAuCoin(page, "/setlists");
    await expect(halosVisibles(page)).toHaveAttribute("data-testid", "halo");
    // Le bleu des accords, pas l'encre du halo par défaut.
    const [halo, accords] = await page.evaluate(() => {
      const st = getComputedStyle(document.documentElement);
      return [st.getPropertyValue("--halo").trim(), st.getPropertyValue("--chord-color").trim()];
    });
    expect(halo).toBe(accords);
  });

  test("la connexion garde ses deux halos à elle, sans halo d'en-tête", async ({ page }) => {
    await page.goto("/login");
    await page.locator('button[type="submit"]').first().waitFor();
    await expect(halosVisibles(page)).toHaveCount(0);
  });
});
