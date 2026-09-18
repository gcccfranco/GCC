import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 10 — suppression groupée depuis la liste (docs/spec-suppression-groupee.md).
// Demande de Christelle : effacer plusieurs setlists privées sans ouvrir cinq
// fiches, cinq menus ⋯ et cinq confirmations.

const LEA: FakeProfile = {
  uid: "uid-lea",
  email: "lea@example.com",
  firstName: "Léa",
  lastName: "Mbala",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
};

/** Musicien du service : niveau « edit » sur la catégorie. */
const JO: FakeProfile = {
  uid: "uid-jo",
  email: "jo@example.com",
  firstName: "Jo",
  lastName: "Bala",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const ADMIN: FakeProfile = {
  uid: "uid-admin",
  email: "tc328829@gmail.com",
  firstName: "Timothée",
  lastName: "C.",
  serviceRoles: { "Culte Francophone": ["chanteur"] },
};

const setlist = (over: Record<string, unknown>) => ({
  title: "Sans titre",
  leader: "",
  category: "Culte Francophone",
  date: "2027-01-10",
  language: "fr",
  notes: "",
  ownerId: LEA.uid,
  isPrivate: true,
  isDraft: false,
  items: [],
  ...over,
});

/** Les cinq setlists privées de Léa — l'onglet « Mes setlists » de la capture. */
const MES_CINQ: Record<string, Record<string, unknown>> = {
  "setlists/s1": setlist({ title: "Répétition du 10 janvier", date: "2027-01-10" }),
  "setlists/s2": setlist({ title: "Répétition du 17 janvier", date: "2027-01-17" }),
  "setlists/s3": setlist({ title: "Culte du 24 janvier", date: "2027-01-24" }),
  "setlists/s4": setlist({ title: "Jeunesse du 31 janvier", date: "2027-01-31" }),
  "setlists/s5": setlist({ title: "Louange du 7 février", date: "2027-02-07" }),
};

/** Deux setlists partagées à venir : une de Léa, une de Jonathan. */
const A_VENIR: Record<string, Record<string, unknown>> = {
  "setlists/pub-lea": setlist({ title: "Culte de Léa", isPrivate: false, date: "2027-01-10" }),
  "setlists/pub-jonathan": setlist({
    title: "Culte de Jonathan",
    isPrivate: false,
    ownerId: "uid-jonathan",
    date: "2027-01-17",
  }),
};

// La fenêtre de confirmation est rendue hors de `main` (portail) : les lignes
// de la liste se comptent donc sans jamais attraper ses puces.
const lignes = (page: Page) => page.locator("main").getByRole("listitem");
const ligne = (page: Page, titre: string) => lignes(page).filter({ hasText: titre });
const cases = (page: Page) => page.getByRole("checkbox");
const boutonSupprimer = (page: Page) => page.getByRole("button", { name: /^Supprimer \(\d+\)$/ });

async function planningVide(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
}

/** Les règles refusent la suppression (403) des chemins donnés, comme pour une
 *  setlist qu'on n'a pas le droit d'effacer. Le reste de la base continue de
 *  répondre. Rend la liste des suppressions refusées, dans l'ordre : refusées,
 *  elles n'arrivent jamais jusqu'à `db.writes`. */
async function refuserLesSuppressions(
  page: Page,
  refusee: (path: string) => boolean = () => true,
): Promise<string[]> {
  const refuses: string[] = [];
  await page.route(/firestore\.googleapis\.com/, (route) => {
    const request = route.request();
    const path = decodeURIComponent(new URL(request.url()).pathname.split("/documents/")[1] ?? "");
    if (request.method() !== "DELETE" || !refusee(path)) return route.fallback();
    refuses.push(path);
    return route.fulfill({
      status: 403,
      contentType: "application/json",
      body: '{"error":{"code":403,"message":"Missing or insufficient permissions."}}',
    });
  });
  return refuses;
}

// ── S1 : la suppression dit la vérité ────────────────────────────────────────

test("fiche : une suppression refusée laisse sur la setlist au lieu de se faire passer pour une réussite", async ({ page }) => {
  await planningVide(page);
  await signInAs(
    page,
    LEA,
    { "setlists/s1": setlist({ title: "Répétition du 10 janvier" }) },
    "/setlists/s1",
  );
  await expect(page.getByRole("heading", { name: "Répétition du 10 janvier" })).toBeVisible();

  const refuses = await refuserLesSuppressions(page);
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();

  // Le DELETE est bien parti et a été refusé ; la setlist est donc toujours là.
  await expect.poll(() => refuses).toEqual(["setlists/s1"]);
  // Sans `checkRest`, la fiche prenait le refus pour une réussite et filait
  // vers /setlists : on lui laisse largement le temps de partir, et on vérifie
  // qu'elle est restée.
  await expect(page.waitForURL("**/setlists", { timeout: 3_000 })).rejects.toThrow();
  await expect(page.getByRole("heading", { name: "Répétition du 10 janvier" })).toBeVisible();
});

// ── S2 : la sélection dans la liste ──────────────────────────────────────────

async function ouvrirLaListe(
  page: Page,
  profil: FakeProfile,
  docs: Record<string, Record<string, unknown>>,
  attendues: number,
) {
  await planningVide(page);
  const db = await signInAs(page, profil, docs, "/setlists");
  await expect(lignes(page)).toHaveCount(attendues);
  return db;
}

async function ouvrirMesSetlists(
  page: Page,
  profil: FakeProfile = LEA,
  docs: Record<string, Record<string, unknown>> = MES_CINQ,
  attendues = 5,
) {
  await planningVide(page);
  const db = await signInAs(page, profil, docs, "/setlists");
  await page.getByRole("button", { name: /Mes setlists/ }).click();
  await expect(lignes(page)).toHaveCount(attendues);
  return db;
}

async function entrerEnSelection(page: Page) {
  await page.getByRole("button", { name: "Sélectionner" }).click();
  await expect(cases(page).first()).toBeVisible();
}

async function cocher(page: Page, ...titres: string[]) {
  for (const titre of titres) {
    // Nom exact : « Répétition n° 1 » est un préfixe de « Répétition n° 10 ».
    await page.getByRole("checkbox", { name: titre, exact: true }).click();
    await expect(page.getByRole("checkbox", { name: titre, exact: true })).toBeChecked();
  }
}

/** Écritures reçues par la collection `setlists`, dans l'ordre. Le reste de la
 *  page (préférences de notification à la connexion) n'est pas du ressort du
 *  lot 10. */
const ecrituresSetlists = (db: { writes: { method: string; path: string }[] }) =>
  db.writes.filter((w) => w.path.startsWith("setlists")).map((w) => `${w.method} ${w.path}`);

test("« Mes setlists » : chaque ligne porte une case, et aucune avant « Sélectionner »", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await expect(cases(page)).toHaveCount(0);
  await entrerEnSelection(page);
  await expect(cases(page)).toHaveCount(5);
  await expect(page.getByRole("checkbox", { name: "Culte du 24 janvier" })).toBeVisible();
});

test("« À venir » : la setlist d'un autre membre n'a pas de case et reste un lien", async ({ page }) => {
  await ouvrirLaListe(page, LEA, A_VENIR, 2);
  await entrerEnSelection(page);
  await expect(cases(page)).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Culte de Léa" })).toBeVisible();
  // Next sert ses pages avec une barre oblique finale.
  await expect(ligne(page, "Culte de Jonathan").getByRole("link")).toHaveAttribute(
    "href",
    /\/setlists\/pub-jonathan\/?$/,
  );
});

test("admin : toutes les lignes portent une case", async ({ page }) => {
  await ouvrirLaListe(page, ADMIN, A_VENIR, 2);
  await entrerEnSelection(page);
  await expect(cases(page)).toHaveCount(2);
});

test("musicien : pas de case sur la setlist privée d'un autre, vignettes alignées", async ({ page }) => {
  // La base simulée ignore le filtre `ownerId ==` de getMySetlists : la setlist
  // privée d'un autre membre arrive donc dans l'onglet — exactement la ligne
  // qui ne doit pas porter de case, même pour un musicien du service.
  await ouvrirMesSetlists(
    page,
    JO,
    {
      "setlists/jo1": setlist({ title: "Ma répétition", ownerId: JO.uid, date: "2027-01-10" }),
      "setlists/priv-jonathan": setlist({
        title: "Brouillon de Jonathan",
        ownerId: "uid-jonathan",
        date: "2027-01-17",
      }),
    },
    2,
  );
  await entrerEnSelection(page);
  await expect(cases(page)).toHaveCount(1);
  await expect(page.getByRole("checkbox", { name: "Ma répétition" })).toBeVisible();

  const avec = (await ligne(page, "Ma répétition").getByTestId("tuile").boundingBox())!;
  const sans = (await ligne(page, "Brouillon de Jonathan").getByTestId("tuile").boundingBox())!;
  expect(Math.abs(sans.x - avec.x), "vignettes alignées, avec ou sans case").toBeLessThan(1);
});

test("rien de supprimable : pas de bouton « Sélectionner »", async ({ page }) => {
  await ouvrirLaListe(page, LEA, { "setlists/pub-jonathan": A_VENIR["setlists/pub-jonathan"] }, 1);
  await expect(page.getByRole("button", { name: "Sélectionner" })).toHaveCount(0);
});

test("la sélection ne contient que ce qui est à l'écran : changer d'onglet la vide", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Répétition du 17 janvier", "Culte du 24 janvier");
  await expect(boutonSupprimer(page)).toHaveText("Supprimer (3)");

  await page.getByRole("button", { name: "À venir" }).click();
  await expect(boutonSupprimer(page)).toHaveText("Supprimer (0)");
  await expect(boutonSupprimer(page)).toBeDisabled();

  await page.getByRole("button", { name: /Mes setlists/ }).click();
  await expect(cases(page)).toHaveCount(5);
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
});

test("une recherche qui cache des lignes fait baisser le compteur", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Répétition du 17 janvier", "Culte du 24 janvier");

  await page.getByRole("searchbox").fill("Culte");
  await expect(lignes(page)).toHaveCount(1);
  await expect(boutonSupprimer(page)).toHaveText("Supprimer (1)");
});

test("« Annuler » referme le mode : plus de case, la ligne redevient un lien", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Culte du 24 janvier");

  await page.getByRole("button", { name: "Annuler" }).click();
  await expect(cases(page)).toHaveCount(0);
  await expect(ligne(page, "Culte du 24 janvier").getByRole("link")).toHaveAttribute("href", /\/setlists\/s3\/?$/);
  await expect(page.getByRole("button", { name: "Sélectionner" })).toBeVisible();
});

test("en mode sélection, toucher une ligne la coche au lieu d'ouvrir la setlist", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await ligne(page, "Culte du 24 janvier").getByText("Culte du 24 janvier").click();
  await expect(page.getByRole("checkbox", { name: "Culte du 24 janvier" })).toBeChecked();
  expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe("/setlists");
});

test("la barre d'action est en tête de liste et reste à portée quand la liste défile", async ({ page }) => {
  // Trente setlists : la liste dépasse l'écran sur les trois appareils.
  const beaucoup: Record<string, Record<string, unknown>> = {};
  for (let i = 1; i <= 30; i++) {
    beaucoup[`setlists/n${i}`] = setlist({ title: `Répétition n° ${i}`, date: "2027-03-01" });
  }
  await ouvrirMesSetlists(page, LEA, beaucoup, 30);
  await entrerEnSelection(page);

  const premiere = (await lignes(page).first().boundingBox())!;
  const barre = (await boutonSupprimer(page).boundingBox())!;
  expect(barre.y + barre.height, "la barre est en tête de liste").toBeLessThanOrEqual(premiere.y + 1);

  // Après défilement, elle est toujours à l'écran, sous la navbar et sans
  // recouvrir la barre d'onglets là où elle existe (téléphone, tablette).
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(boutonSupprimer(page)).toBeInViewport();
  const apres = (await boutonSupprimer(page).boundingBox())!;
  const navbar = (await page.locator("header").boundingBox())!;
  expect(apres.y, "la barre n'est pas cachée derrière la navbar").toBeGreaterThanOrEqual(navbar.y + navbar.height - 1);
  const onglets = page.getByRole("navigation", { name: "Navigation principale" });
  if (await onglets.isVisible()) {
    const bas = (await onglets.boundingBox())!;
    expect(apres.y + apres.height, "la barre ne recouvre pas la barre d'onglets").toBeLessThanOrEqual(bas.y + 1);
  }
});

// ── S3 : la confirmation qui nomme, le résultat, les langues ─────────────────

const dialogue = (page: Page) => page.getByRole("alertdialog");
const resultat = (page: Page) => page.getByRole("status");

async function confirmer(page: Page) {
  await boutonSupprimer(page).click();
  await expect(dialogue(page)).toBeVisible();
  await dialogue(page).getByRole("button", { name: "Oui, supprimer" }).click();
}

test("la confirmation nomme les setlists et leurs dates", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Répétition du 17 janvier", "Culte du 24 janvier");
  await boutonSupprimer(page).click();

  await expect(dialogue(page).getByRole("heading")).toHaveText("Supprimer 3 setlists ?");
  await expect(dialogue(page).getByRole("listitem")).toHaveText([
    /Répétition du 10 janvier.*10 janvier 2027/,
    /Répétition du 17 janvier.*17 janvier 2027/,
    /Culte du 24 janvier.*24 janvier 2027/,
  ]);
  await expect(dialogue(page)).toContainText("Cette action est définitive.");
});

test("une seule cochée : la confirmation parle au singulier", async ({ page }) => {
  await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Culte du 24 janvier");
  await boutonSupprimer(page).click();

  await expect(dialogue(page).getByRole("heading")).toHaveText("Supprimer cette setlist ?");
  await expect(dialogue(page).getByRole("listitem")).toHaveText([/Culte du 24 janvier/]);
});

test("douze cochées : huit titres, puis « … et 4 autres »", async ({ page }) => {
  const douze: Record<string, Record<string, unknown>> = {};
  for (let i = 1; i <= 12; i++) {
    douze[`setlists/n${i}`] = setlist({ title: `Répétition n° ${i}`, date: "2027-03-01" });
  }
  await ouvrirMesSetlists(page, LEA, douze, 12);
  await entrerEnSelection(page);
  for (let i = 1; i <= 12; i++) await cocher(page, `Répétition n° ${i}`);
  await boutonSupprimer(page).click();

  await expect(dialogue(page).getByRole("heading")).toHaveText("Supprimer 12 setlists ?");
  await expect(dialogue(page).getByRole("listitem")).toHaveCount(8);
  await expect(dialogue(page)).toContainText("… et 4 autres");
});

test("« Annuler » dans la confirmation : aucune suppression, la sélection reste", async ({ page }) => {
  const db = await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Culte du 24 janvier");
  await boutonSupprimer(page).click();
  await expect(dialogue(page)).toBeVisible();
  await dialogue(page).getByRole("button", { name: "Annuler" }).click();

  await expect(dialogue(page)).toHaveCount(0);
  await expect(boutonSupprimer(page)).toHaveText("Supprimer (2)");
  await expect(lignes(page)).toHaveCount(5);
  expect(ecrituresSetlists(db)).toEqual([]);
});

test("trois cochées confirmées : trois suppressions, rien d'autre, et le mode se referme", async ({ page }) => {
  const db = await ouvrirMesSetlists(page);
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Répétition du 17 janvier", "Culte du 24 janvier");
  await confirmer(page);

  await expect(lignes(page)).toHaveCount(2);
  await expect(resultat(page)).toHaveText("3 setlists supprimées.");
  expect(ecrituresSetlists(db), "trois suppressions, et rien d'autre").toEqual([
    "DELETE setlists/s1",
    "DELETE setlists/s2",
    "DELETE setlists/s3",
  ]);
  await expect(cases(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sélectionner" })).toBeVisible();
});

test("une suppression refusée au milieu : les autres partent, la ratée est nommée et reste cochée", async ({ page }) => {
  const db = await ouvrirMesSetlists(page);
  const refuses = await refuserLesSuppressions(page, (path) => path === "setlists/s2");
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Répétition du 17 janvier", "Culte du 24 janvier");
  await confirmer(page);

  await expect(lignes(page)).toHaveCount(3);
  await expect(resultat(page)).toContainText("2 setlists supprimées.");
  await expect(resultat(page)).toContainText("Répétition du 17 janvier");
  await expect(resultat(page)).toContainText("n'a pas pu être supprimée.");
  // Trois DELETE sont bien partis : deux acceptés, un refusé.
  expect(ecrituresSetlists(db)).toEqual(["DELETE setlists/s1", "DELETE setlists/s3"]);
  expect(refuses).toEqual(["setlists/s2"]);
  // La ratée reste cochée, le mode reste ouvert : réessayer est un seul appui.
  await expect(page.getByRole("checkbox", { name: "Répétition du 17 janvier" })).toBeChecked();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);
  await expect(boutonSupprimer(page)).toHaveText("Supprimer (1)");
});

test("un refus d'entrée n'arrête pas le lot : les suivantes partent quand même", async ({ page }) => {
  const db = await ouvrirMesSetlists(page);
  const refuses = await refuserLesSuppressions(page, (path) => path === "setlists/s1");
  await entrerEnSelection(page);
  await cocher(page, "Répétition du 10 janvier", "Répétition du 17 janvier", "Culte du 24 janvier");
  await confirmer(page);

  await expect(lignes(page)).toHaveCount(3);
  expect(ecrituresSetlists(db)).toEqual(["DELETE setlists/s2", "DELETE setlists/s3"]);
  expect(refuses).toEqual(["setlists/s1"]);
  await expect(page.getByRole("checkbox", { name: "Répétition du 10 janvier" })).toBeChecked();
});

test("en 中文, la confirmation et le résultat sont traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await planningVide(page);
  const db = await signInAs(page, LEA, MES_CINQ, "/setlists");
  await page.getByRole("button", { name: /我的歌单/ }).click();
  await expect(lignes(page)).toHaveCount(5);

  await page.getByRole("button", { name: "选择" }).click();
  await page.getByRole("checkbox", { name: "Culte du 24 janvier" }).click();
  await page.getByRole("button", { name: "删除（1）" }).click();

  // Le chinois n'a qu'une forme : i18next y choisit toujours « _other ».
  await expect(dialogue(page).getByRole("heading")).toHaveText("删除 1 个歌单？");
  await expect(dialogue(page)).toContainText("此操作无法撤销。");
  await dialogue(page).getByRole("button", { name: "确认删除" }).click();

  await expect(lignes(page)).toHaveCount(4);
  await expect(resultat(page)).toHaveText("已删除 1 个歌单。");
  expect(ecrituresSetlists(db)).toEqual(["DELETE setlists/s3"]);
});
