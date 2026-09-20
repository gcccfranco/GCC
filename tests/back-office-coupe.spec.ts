import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 18 (docs/spec-mise-en-ligne.md) : ce que voit le site en ligne tant que le
// back-office n'est pas ouvert. Ce serveur tourne SANS `NEXT_PUBLIC_BACK_OFFICE` ;
// toutes les autres specs tournent interrupteur ouvert.
test.use({ baseURL: BASE_URL_COUPE });

// Un admin membre de tous les pôles : s'il ne voit rien du back-office, personne ne le voit.
const ADMIN: FakeProfile = {
  uid: "uid-admin",
  email: "tc328829@gmail.com",
  firstName: "Timothée",
  lastName: "C.",
  planningName: "Timothée",
  serviceRoles: { "Culte Francophone": ["musicien"] },
  poles: ["da", "media", "orga", "evenement"],
};
const barreDuBas = (page: Page) => page.getByRole("navigation", { name: "Navigation principale" });
const phone = { viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

test.describe("back-office coupé : les entrées disparaissent", () => {
  test("barre du bas à quatre onglets pour un membre, Chants seul pour un visiteur (téléphone)", async ({ browser }) => {
    const contexte = await browser.newContext({ ...phone, baseURL: BASE_URL_COUPE });
    const page = await contexte.newPage();
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["Chants"]);
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["Chants", "Setlists", "Planning", "Moi"]);
    await contexte.close();
  });

  test("« Moi » ne propose ni Équipes ni Mes tâches, même à un admin", async ({ page }) => {
    await signInAs(page, ADMIN, {}, "/moi");
    const moi = page.getByRole("main");
    await expect(moi.getByRole("link", { name: /Mes services/ })).toBeVisible();
    await expect(moi.getByRole("link", { name: /Équipes/ })).toHaveCount(0);
    await expect(moi.getByRole("link", { name: /tâches/i })).toHaveCount(0);
  });

  test("la navbar d'ordinateur n'a ni Évènements ni Tâches", async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, "propre à l'ordinateur");
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const sections = page.getByRole("navigation", { name: "Sections" });
    await expect(sections.getByRole("link", { name: "Planning" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Évènements" })).toHaveCount(0);
    await expect(sections.getByRole("link", { name: "Tâches" })).toHaveCount(0);
  });
});

test.describe("back-office coupé : une adresse tapée à la main tombe dans le vide", () => {
  for (const chemin of ["/taches", "/taches/da", "/equipes", "/evenements", "/evenements/foot", "/evenements/foot/modifier", "/evenements/nouveau", "/evenements/scene", "/annonces"]) {
    test(`${chemin} répond 404`, async ({ page }) => {
      const reponse = await page.goto(chemin);
      expect(reponse?.status()).toBe(404);
    });
  }

  for (const route of ["/api/taches/assigne", "/api/taches/fait", "/api/equipes/importer", "/api/equipes/poles", "/api/admin/importer-planning", "/api/scene/conflit", "/api/evenements/inscription", "/api/evenements/desinscription", "/api/push/notify-evenement"]) {
    test(`${route} répond 404`, async ({ request }) => {
      const reponse = await request.post(`${BASE_URL_COUPE}${route}/`, { data: {} });
      expect(reponse.status()).toBe(404);
    });
  }
});

test.describe("back-office coupé : le planning reste le tableau d'aujourd'hui", () => {
  test("la page du Culte affiche un tableau lu dans le Sheet, sans grille, sans saisie ni export", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-20T10:00:00"));
    // Le Sheet répond une ligne ; Firestore en contiendrait une autre pour le même dimanche : elle doit être ignorée.
    await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
      route.fulfill({ status: 200, contentType: "text/csv", body: "DATE,PRESIDENCE\n20/09,Nom Du Sheet\n" }));
    let lectureDeLApp = false;
    await page.route(/firestore\.googleapis\.com.*plannings/, (route) => { lectureDeLApp = true; return route.fulfill({ status: 200, json: { documents: [] } }); });
    await signInAs(page, ADMIN, {}, "/planning/culte");
    // L'ancien tableau : une <table> à partir de 640 px, des cartes en dessous.
    if ((page.viewportSize()?.width ?? 0) >= 640) await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Culte Franco" }).first()).toBeVisible();
    await expect(page.locator("[data-grille]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
    expect(lectureDeLApp, "aucune lecture de plannings/* dans Firestore").toBe(false);
  });
});
