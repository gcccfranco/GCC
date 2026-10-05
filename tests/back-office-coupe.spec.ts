import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { abonneAuxNotifications, signInAs, type FakeProfile } from "./helpers/fakeSession";

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

  // Lot U6 (B1) : le sélecteur « App · Back-Office » n'apparaît pour personne, même un admin.
  test("aucun sélecteur App · Back-Office, même pour un admin", async ({ page }) => {
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(page.getByRole("navigation", { name: "Navigation principale" }).first()).toBeAttached();
    await expect(page.getByRole("group", { name: "Choisir l'espace" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back-Office" })).toHaveCount(0);
  });

  // Lot U4 : sur ordinateur, la barre latérale remplace la navbar.
  test("la barre latérale d'ordinateur n'a ni Évènements ni Tâches", async ({ page }) => {
    test.skip(!test.info().project.name.startsWith("ordinateur"), "propre à l'ordinateur");
    await signInAs(page, ADMIN, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const sections = page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" });
    await expect(sections.getByRole("link", { name: "Planning" })).toBeVisible();
    await expect(sections.getByRole("link", { name: "Évènements" })).toHaveCount(0);
    await expect(sections.getByRole("link", { name: "Tâches" })).toHaveCount(0);
  });
});

test.describe("back-office coupé : une adresse tapée à la main tombe dans le vide", () => {
  for (const chemin of ["/taches", "/taches/da", "/equipes", "/evenements", "/evenements/foot", "/evenements/foot/modifier", "/evenements/nouveau", "/evenements/scene", "/annonces", "/back-office", "/back-office/taches", "/back-office/taches/da", "/back-office/evenements", "/back-office/evenements/reunions", "/back-office/evenements/scene", "/back-office/evenements/nouveau", "/back-office/evenements/foot", "/back-office/evenements/foot/modifier", "/back-office/calendrier"]) {
    test(`${chemin} répond 404`, async ({ page }) => {
      const reponse = await page.goto(chemin);
      expect(reponse?.status()).toBe(404);
    });
  }

  for (const route of ["/api/taches/assigne", "/api/taches/fait", "/api/equipes/importer", "/api/equipes/poles", "/api/admin/importer-planning", "/api/admin/reprendre-petit-dej", "/api/scene/conflit", "/api/evenements/inscription", "/api/evenements/desinscription", "/api/push/notify-evenement"]) {
    test(`${route} répond 404`, async ({ request }) => {
      const reponse = await request.post(`${BASE_URL_COUPE}${route}/`, { data: {} });
      expect(reponse.status()).toBe(404);
    });
  }
});

// Lot U6 (B2) : en ligne, l'Admin et Notifier restent les pages d'aujourd'hui (le
// Back-Office qui les accueille n'y répond pas) ; Moi et le menu du compte les gardent.
test.describe("back-office coupé : l'administration et Notifier restent où ils sont", () => {
  test("/admin et /notifier ne redirigent pas", async ({ page }) => {
    await signInAs(page, ADMIN, {}, "/admin");
    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await page.goto("/notifier");
    await expect(page.getByRole("heading", { name: "Envoyer une notification" })).toBeVisible();
    await expect(page).toHaveURL(/\/notifier\/?$/);
  });

  test("Moi garde Notifier et Administration", async ({ page }) => {
    await signInAs(page, ADMIN, {}, "/moi");
    const moi = page.getByRole("main");
    await expect(moi.getByRole("link", { name: "Notifier" })).toBeVisible();
    await expect(moi.getByRole("link", { name: "Admin" })).toBeVisible();
  });

  for (const chemin of ["/back-office/planning", "/back-office/planning/culte", "/back-office/planning/import", "/back-office/equipes", "/back-office/equipes/personnes", "/back-office/messages", "/back-office/messages/notifier"]) {
    test(`${chemin} répond 404`, async ({ page }) => {
      const reponse = await page.goto(chemin);
      expect(reponse?.status()).toBe(404);
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

// Lot U2, P4 (docs/spec-planning-2027.md, Q5 et Q14) : la présidence d'un groupe
// un dimanche d'Interfranco ou d'Intergroupe vient de leur grille… derrière
// l'interrupteur. En ligne, rien ne change : « Mes services » lit le Sheet tel quel.
test.describe("back-office coupé : les dimanches d'Interfranco ne touchent pas encore « Mes services »", () => {
  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const SHEETS: Record<string, string> = {
    Interfranco: csv([
      ["INTERFRANCO Année 2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Cajon/Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur"],
      ["25/10", "Président I.", "", "", "", "", "", "", "", "", ""],
    ]),
    Paix_T4: csv([
      ["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME"],
      ["25/10", "Membre M.", "", "", ""],
    ]),
  };
  const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Membre M." };

  test("un président de Paix le jour d'une Interfranco du Sheet reste listé", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-20T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
    });
    await signInAs(page, MEMBRE, {}, "/mes-services");
    await expect(page.getByText("Groupe Paix", { exact: true })).toBeVisible();
  });
});

// Lot U2, P5 (docs/spec-planning-2027.md, question 4 et Q14) : Percussion (groupes)
// et Cours (EDD) sont lus derrière l'interrupteur. En ligne, rien ne change :
// l'ancien tableau, « Ce dimanche », « Mes services » et les rappels lisent le Sheet comme avant.
test.describe("back-office coupé : Percussion et Cours attendent l'ouverture du back-office", () => {
  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const SHEETS: Record<string, string> = {
    Paix_T4: csv([
      ["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME", "PERCUSSION"],
      ["22/11", "Ancien G.", "", "", "", "Batteur B."],
      ["29/11", "Batteur B.", "", "", "", ""],
    ]),
    EDD: csv([
      ["DATE", "PRESIDENCE", "SUPPLÉANT", "PIANO", "CAJON", "GUITARE", "COURS", ""],
      ["22/11", "Ancien K.", "", "", "", "", "Batteur B.", "中班"],
    ]),
  };
  const BATTEUR: FakeProfile = { uid: "uid-batteur", email: "batteur@example.com", planningName: "Batteur B." };
  const ouvrir = async (page: Page, to: string) => {
    await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
      return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
    });
    await signInAs(page, BATTEUR, {}, to);
  };

  test("« Mes services » garde la présidence, sans Percussion ni Cours", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await expect(page.getByText("Groupe Paix", { exact: true }), "le 29/11 seulement").toHaveCount(1);
    await expect(page.getByText("Percussion", { exact: true })).toHaveCount(0);
    await expect(page.getByText("EDD 中班", { exact: true })).toHaveCount(0);
  });

  test("l'ancien tableau des groupes n'a pas de colonne de plus", async ({ page }) => {
    await ouvrir(page, "/planning/groupes");
    await expect(page.locator("[data-grille]"), "c'est bien l'ancien tableau").toHaveCount(0);
    await expect(page.getByText("Ancien G.").filter({ visible: true }).first()).toBeVisible();
    // Le pied de la barre latérale (lot U4) porte aussi le nom de planning : hors d'elle.
    const page_ = page.locator("main").filter({ has: page.getByText("Ancien G.") }).last();
    await expect(page_.getByText("Batteur B.").filter({ visible: true }), "le 29/11 à la présidence seulement").toHaveCount(1);
  });
});

// Lot U2, P7 : l'export au modèle du Sheet vit dans les pages du back-office.
// En ligne, ni « Exporter (modèle du Sheet) », ni l'ancien export, même pour un admin.
test.describe("back-office coupé : pas d'export au modèle du Sheet", () => {
  for (const chemin of ["/planning/groupes", "/planning/edd", "/planning/table", "/planning/campus", "/planning/interfranco", "/planning/intergroupe"]) {
    test(`${chemin} : aucun bouton « Exporter »`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
      await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
      await signInAs(page, ADMIN, {}, chemin);
      await expect(page.getByRole("main").first()).toBeVisible();
      await expect(page.locator("[data-grille]"), "c'est bien l'ancien tableau").toHaveCount(0);
      await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
    });
  }
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
  const ouvrir = async (page: Page, dimanche: string, to: string, qui: FakeProfile = CHARLIE, docs: Record<string, Record<string, unknown>> = INSCRIPTION) => {
    const vendredi = new Date(`${dimanche}T10:00:00`);
    vendredi.setDate(vendredi.getDate() - 2);
    await page.clock.setFixedTime(vendredi);
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
      const sheet = new URL(route.request().url()).searchParams.get("sheet");
      return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Table_PtD" ? TABLE_PTD : "" });
    });
    const lectures = { petitDej: 0 };
    page.on("request", (r) => { if (r.url().includes("firestore") && (r.postData() ?? "").includes('"petitDej"')) lectures.petitDej++; });
    await signInAs(page, qui, docs, to);
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

  // PD3 : coupé, une inscription en base ne rattache rien — ni « Mes services »
  // ouvert sans nom de planning, ni prochain service.
  test("un compte sans nom de planning garde « choisis ton nom », même inscrit en base (PD3)", async ({ page }) => {
    const sansNom: FakeProfile = { uid: "uid-sans-nom", email: "sans-nom@example.com" };
    const inscrit = { "petitDej/b": { ...INSCRIPTION["petitDej/a"], dimanche: "2026-09-27", uid: sansNom.uid, auteurUid: sansNom.uid } };
    const lectures = await ouvrir(page, "2026-09-27", "/mes-services", sansNom, inscrit);
    await expect(page.getByText(/Choisis ton nom de planning/)).toBeVisible();
    await page.goto("/planning");
    await expect(page.getByRole("region", { name: /Ce dimanche/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ton prochain service" })).toHaveCount(0);
    expect(lectures.petitDej, "aucune lecture des inscriptions").toBe(0);
  });

  test("en 中文 : libellé traduit", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, "2026-09-20", "/planning");
    const dimanche = page.getByRole("region", { name: /本主日/ });
    await expect(dimanche.getByText("早餐", { exact: true })).toBeVisible();
  });

  // PD4 : coupé, ni ligne du mercredi (cron) ni bascule « Petit déj » dans Mon profil.
  test("Mon profil › Notifications : pas de bascule « Petit déj » (PD4)", async ({ page }) => {
    await abonneAuxNotifications(page);
    await signInAs(page, CHARLIE, {}, "/profil");
    await expect(page.getByRole("switch", { name: "Rappels de service" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "Petit déj" })).toHaveCount(0);
  });

  // PD5 : coupé, l'administration ne propose pas la reprise (la route répond 404, plus haut).
  test("Administration › Planning : pas de « Reprendre les noms du petit déj » (PD5)", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-19T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, {}, "/admin");
    await page.getByRole("button", { name: /^Planning/ }).click();
    await expect(page.getByRole("heading", { name: /Planning sans compte/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reprendre les noms du petit déj" })).toHaveCount(0);
  });
});
