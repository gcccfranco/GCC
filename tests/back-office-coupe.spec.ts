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

// Lot 1a, vu « comme en ligne » : la page du Culte sert l'ancien tableau, et la colonne
// « Sainte cène » (index 11 de Franco_Louange) doit y être, comme dans « Ce dimanche »
// et « Mes services ». Question de Timothée du 20/09/2026, à la mise en ligne.
test.describe("back-office coupé : la Sainte cène reste un service à part entière", () => {
  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const CULTE = csv([
    ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
    ["13/09", "Jonathan Z.", "Daniela W.", "Alice Q.", "Timothée C.", "Christelle C.", "Yiyi C.", "Lorenzo S.", "Denis F.", "Belka", "", "", "à confirmer"],
    ["20/09", "Paul W.", "Christelle Z.", "Inès L.", "Eva C.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "Ruth K.", "chants ?"],
  ]);
  const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K." };
  const ouvrir = async (page: Page, to: string) => {
    await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet");
      return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
    });
    await signInAs(page, RUTH, {}, to);
  };

  test("onglet Culte : la colonne et la personne s'affichent, pas les notes de travail", async ({ page }) => {
    await ouvrir(page, "/planning/culte");
    await expect(page.locator("[data-grille]"), "c'est bien l'ancien tableau").toHaveCount(0);
    await expect(page.getByText("Ruth K.").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Sainte cène", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText("chants ?")).toHaveCount(0);
  });

  test("Ce dimanche et Mes services la portent aussi", async ({ page }) => {
    await ouvrir(page, "/planning");
    const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
    await expect(dimanche.getByText("Sainte cène", { exact: true })).toBeVisible();
    await expect(dimanche.getByText("Ruth K.")).toBeVisible();
    await page.goto("/mes-services");
    await expect(page.getByText("Sainte cène", { exact: true })).toBeVisible();
  });
});

// Lot 1b, vu « comme en ligne » (venu de planning-petit-dej.spec.ts au lot U3) :
// interrupteur coupé, le petit déj se lit encore dans le bloc « PETIT DÉJEUNER »
// de Franco_Table_PtD, et les inscriptions `petitDej/*` ne sont jamais lues
// (docs/spec-petit-dej.md, Q14 : Firestore est partagé entre local et en ligne).
test.describe("back-office coupé : le petit déj vient encore du Sheet", () => {
  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const col = (cells: Record<number, string>) => Array.from({ length: 21 }, (_, i) => cells[i] ?? "");
  const TABLE_PTD = csv([
    col({ 1: "PRÉPARATION TABLE", 17: "PETIT DÉJEUNER 2026 DATE", 18: "NOM", 19: "DATE", 20: "DATE" }),
    col({ 1: "13/09", 2: "Daniel F.", 3: "Lucas W.", 17: "15/03", 18: "Julien & Stéphane", 19: "13/09", 20: "" }),
    col({ 1: "20/09", 2: "Ruth K.", 3: "Charlie B.", 17: "22/03", 18: "Alice Q.", 19: "20/09", 20: "Charlie B. & Isabelle L." }),
  ]);
  const CHARLIE: FakeProfile = { uid: "uid-charlie", email: "charlie@example.com", planningName: "Charlie B." };
  // Une inscription en base pour le 20/09 : coupé, elle ne doit compter nulle part.
  const INSCRIPTION = {
    "petitDej/a": {
      dimanche: "2026-09-20", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre",
      creeLe: "2026-09-09T08:00:00.000Z", modifieLe: "2026-09-09T08:00:00.000Z",
    },
  };
  const ouvrir = async (page: Page, dimanche: string, to: string) => {
    const vendredi = new Date(`${dimanche}T10:00:00`);
    vendredi.setDate(vendredi.getDate() - 2);
    await page.clock.setFixedTime(vendredi);
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet");
      return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Table_PtD" ? TABLE_PTD : "" });
    });
    const lectures = { petitDej: 0 };
    page.on("request", (r) => { if (r.url().includes("firestore") && (r.postData() ?? "").includes('"petitDej"')) lectures.petitDej++; });
    await signInAs(page, CHARLIE, INSCRIPTION, to);
    return lectures;
  };

  test("Ce dimanche : la ligne Petit déj apparaît quand la case est remplie", async ({ page }) => {
    const lectures = await ouvrir(page, "2026-09-20", "/planning");
    const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
    await expect(dimanche.getByText("Petit déj", { exact: true })).toBeVisible();
    await expect(dimanche.getByText("Charlie B., Isabelle L.")).toBeVisible();
    await expect(dimanche.getByText("Famille Martin")).toHaveCount(0);
    expect(lectures.petitDej, "aucune lecture des inscriptions").toBe(0);
  });

  test("Ce dimanche : pas de ligne Petit déj quand la case est vide", async ({ page }) => {
    await ouvrir(page, "2026-09-13", "/planning");
    const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
    await expect(dimanche.getByText("Daniel F.", { exact: false }), "la Prépa. Table reste").toBeVisible();
    await expect(dimanche.getByText("Petit déj", { exact: true })).toHaveCount(0);
  });

  test("la page Table n'a pas de carte Petit déj : l'ancien tableau, sans inscription (PD2)", async ({ page }) => {
    const lectures = await ouvrir(page, "2026-09-20", "/planning/table");
    await expect(page.getByRole("heading", { name: "Prépa. Table du Seigneur" })).toBeVisible();
    await expect(page.getByText("Ruth K.", { exact: false }).filter({ visible: true }).first(), "le tableau du Sheet").toBeVisible();
    await expect(page.getByRole("region", { name: "Petit déj" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Je m'inscris" })).toHaveCount(0);
    await expect(page.getByText("Famille Martin")).toHaveCount(0);
    expect(lectures.petitDej, "aucune lecture des inscriptions").toBe(0);
  });

  test("Mes services : le petit déj est un service à part entière", async ({ page }) => {
    await ouvrir(page, "2026-09-20", "/mes-services");
    await expect(page.getByText("Petit déj", { exact: true })).toBeVisible();
  });

  test("en 中文 : libellé traduit", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, "2026-09-20", "/planning");
    const dimanche = page.getByRole("region", { name: /本主日/ });
    await expect(dimanche.getByText("早餐", { exact: true })).toBeVisible();
  });
});
