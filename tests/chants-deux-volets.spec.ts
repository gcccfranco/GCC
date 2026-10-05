import { expect, test, type Page, type Request } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot U5, tranche T5 (docs/spec-deux-volets.md, questions 1, 15 à 17) : sur ordinateur
// et sur tablette couchée, Chants passe en deux volets. À gauche la liste (recherche,
// filtres, récents, index A–Z), qui reste montée d'un chant à l'autre ; à droite
// « Choisis un chant » puis, un chant choisi, sa page (barre collante, sans Retour).
// Connecté : les chants de ses trois prochaines setlists, celles que `canSeeSetlist`
// laisse voir. Téléphone et tablette debout : un volet, comme aujourd'hui.

const GRAND = ["ordinateur", "tablette-paysage", "ordinateur-1440"];
const UN_VOLET = ["telephone", "tablette"];
/** Samedi 3 octobre 2026 : le culte du 4 est le prochain. */
const AUJOURDHUI = new Date("2026-10-03T10:00:00");

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
// Le statut d'admin se lit sur l'adresse (ADMIN_EMAILS) ; sans nom de planning,
// Idées d'harmonie s'ouvre sur ce seul statut.
const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});
const setlist = (over: Record<string, unknown>) => ({
  title: "",
  leader: "Présidence T.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "",
  ownerId: "uid-autre",
  isPrivate: false,
  isDraft: false,
  items: [item({ songSlug: "abrite-moi", position: 1 })],
  ...over,
});

const SETLISTS: Record<string, Record<string, unknown>> = {
  "setlists/passee": setlist({ title: "Culte passé", date: "2026-09-27" }),
  "setlists/culte-4": setlist({
    title: "Culte du 4 octobre",
    date: "2026-10-04",
    items: [
      // FR transposé (G au lieu de A), une transition, un ZH (CLAUDE.md : un de chaque).
      item({ songSlug: "abba-pere", position: 1, keyOverride: "G" }),
      item({ type: "transition", songSlug: "", position: 2, transitionText: "Prière" }),
      item({ songSlug: "一生爱你", position: 3 }),
      item({
        type: "fusion",
        songSlug: "",
        position: 4,
        fusionSongs: [
          { songSlug: "abba-pere", keyOverride: null, structureOverride: ["chorus-3"], sectionNotes: {} },
          { songSlug: "一生爱你", keyOverride: null, structureOverride: ["chorus-3"], sectionNotes: {} },
        ],
        mixedStructure: null,
      }),
    ],
  }),
  "setlists/brouillon": setlist({ title: "Brouillon du 4", isDraft: true }),
  "setlists/privee-autre": setlist({ title: "Privée d'un autre", isPrivate: true }),
  "setlists/groupe-4": setlist({ title: "Groupe Fidélité du 4", category: "Groupe Fidélité" }),
  "setlists/privee-moi": setlist({ title: "Ma setlist privée", date: "2026-10-11", category: "Groupe Paix", isPrivate: true, ownerId: MUSICIEN.uid }),
  "setlists/culte-11": setlist({ title: "Culte du 11 octobre", date: "2026-10-11" }),
  "setlists/culte-18": setlist({ title: "Culte du 18 octobre", date: "2026-10-18" }),
};

const liste = (page: Page) => page.locator("[data-volet-liste]");
const droite = (page: Page) => page.locator("[data-volet-chant]");
const choisis = (page: Page) => page.getByRole("heading", { name: "Choisis un chant" });
const cartes = (page: Page) => page.locator("[data-carte-setlist]");
const ligne = (page: Page, slug: string) => liste(page).locator(`[id="song-li-${slug}"] a`);
const titreChant = (page: Page) => droite(page).getByRole("heading", { level: 1 });
const recherche = (page: Page) => liste(page).getByRole("searchbox");

/** Liste prête : chargée depuis l'index et hydratée. */
async function listePrete(page: Page) {
  await expect(ligne(page, "abba-pere")).toBeAttached({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const s = document.querySelector("[data-volet-liste] input[type=search]");
    return !!s && Object.keys(s).some((k) => k.startsWith("__reactProps"));
  });
}

async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

/** La lecture des prochaines setlists (la cloche lit aussi `setlists`, par `createdAt`). */
const lectureDesProchaines = (r: Request) =>
  r.url().includes(":runQuery") && !!r.postData()?.includes('"setlists"') && !!r.postData()?.includes('"fieldPath":"date"');

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AUJOURDHUI);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
});

test.describe("Chants en deux volets (ordinateur, tablette couchée)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(!GRAND.includes(info.project.name), "deux volets : ordinateur et tablette couchée");
  });

  test("sans compte : la liste à gauche, « Choisis un chant » seul à droite, sans carte", async ({ page }) => {
    await page.goto("/songs");
    await listePrete(page);
    await expect(choisis(page)).toBeVisible();
    await expect(droite(page).getByText("dans la liste.", { exact: true })).toBeVisible();
    await expect(page.getByText("Prochaines setlists")).toHaveCount(0);
    await expect(cartes(page)).toHaveCount(0);
    const [l, d] = await Promise.all([liste(page).boundingBox(), droite(page).boundingBox()]);
    expect(l!.x + l!.width, "la liste à gauche de la page du chant").toBeLessThanOrEqual(d!.x + 1);
    expect(l!.width).toBeGreaterThanOrEqual(320);
    expect(l!.width).toBeLessThanOrEqual(400);
    await capture(page, "chants-accueil-visiteur");
  });

  test("connecté avec un rôle : trois cartes au plus, dans l'ordre, ni brouillon, ni passée, ni privée d'un autre", async ({ page }) => {
    await signInAs(page, MUSICIEN, SETLISTS, "/songs");
    await listePrete(page);
    await expect(page.getByText("Prochaines setlists")).toBeVisible();
    await expect(cartes(page)).toHaveCount(3);
    // 4 octobre, puis le 11 : le culte avant le groupe (ordre des catégories) ; sa propre privée oui.
    await expect(cartes(page).getByRole("heading")).toHaveText(["Culte du 4 octobre", "Culte du 11 octobre", "Ma setlist privée"]);
    const carte = cartes(page).first();
    await expect(carte).toContainText("Culte Francophone");
    await expect(carte).toContainText("Dim. 4 oct.");
    await expect(carte).toContainText("Présidence T.");
    // Chants numérotés avec leur tonalité ; la transition n'en est pas un ; la fusion « A / B ».
    const chants = carte.locator("[data-carte-chant]");
    await expect(chants).toHaveCount(3);
    await expect(chants.nth(0)).toContainText("1");
    await expect(chants.nth(0)).toContainText("Abba Père");
    await expect(chants.nth(0).getByTestId("tonalite")).toHaveText("G");
    await expect(chants.nth(1)).toContainText("一生爱你");
    await expect(chants.nth(2)).toContainText("Abba Père / 一生爱你");
    await expect(carte).not.toContainText("Prière");
    await capture(page, "chants-accueil-connecte");
  });

  test("admin : toutes les catégories", async ({ page }) => {
    await signInAs(page, ADMIN, SETLISTS, "/songs");
    await listePrete(page);
    await expect(cartes(page).getByRole("heading")).toHaveText(["Culte du 4 octobre", "Groupe Fidélité du 4", "Culte du 11 octobre"]);
  });

  test("la lecture est bornée : date ≥ aujourd'hui, triée par date, 30 au plus", async ({ page }) => {
    const requetes: unknown[] = [];
    page.on("request", (r) => {
      if (lectureDesProchaines(r)) requetes.push(r.postDataJSON());
    });
    await signInAs(page, MUSICIEN, SETLISTS, "/songs");
    await expect(cartes(page)).toHaveCount(3);
    expect(requetes).toHaveLength(1);
    const q = (requetes[0] as { structuredQuery: Record<string, unknown> }).structuredQuery;
    expect(q.limit).toBe(30);
    expect(q.orderBy).toEqual([{ field: { fieldPath: "date" }, direction: "ASCENDING" }]);
    expect(q.where).toEqual({ fieldFilter: { field: { fieldPath: "date" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: "2026-10-03" } } });
  });

  test("un chant de carte s'ouvre à droite dans la tonalité de la setlist ; le retour ramène « Choisis un chant »", async ({ page }) => {
    await signInAs(page, MUSICIEN, SETLISTS, "/songs");
    await listePrete(page);
    await cartes(page).first().locator("[data-carte-chant]").first().getByRole("link").click();
    await expect(titreChant(page)).toHaveText(/Abba Père/i);
    await expect(page.getByTestId("tonalite-courante")).toHaveText(/^G/);
    const params = new URL(page.url()).searchParams;
    expect(params.get("key")).toBe('"G"');
    expect(params.get("setlist")).toBe('"culte-4"');
    // La liste n'a pas bougé et surligne la ligne.
    await expect(recherche(page)).toBeVisible();
    await expect(ligne(page, "abba-pere")).toHaveAttribute("aria-current", "page");
    await capture(page, "chants-chant-de-carte");
    await page.goBack();
    await expect(choisis(page)).toBeVisible();
    await expect(liste(page).locator('[aria-current="page"]')).toHaveCount(0);
  });

  test("le titre d'une carte ouvre la setlist", async ({ page }) => {
    await signInAs(page, MUSICIEN, SETLISTS, "/songs");
    await cartes(page).first().getByRole("link", { name: "Culte du 4 octobre" }).click();
    await page.waitForURL((u) => u.pathname.replace(/\/$/, "") === "/setlists/culte-4");
  });

  test("un chant de la liste s'ouvre à droite ; la liste garde sa position et sa recherche ; retour → chant précédent", async ({ page }) => {
    await page.goto("/songs");
    await listePrete(page);
    // Position : la liste défile seule, dans son volet.
    await liste(page).evaluate((el) => el.scrollTo({ top: 1200 }));
    await page.waitForTimeout(100);
    const yAvant = await liste(page).evaluate((el) => el.scrollTop);
    expect(yAvant).toBeGreaterThan(1000);
    const slug = await liste(page).evaluate((el) => {
      const top = el.getBoundingClientRect().top;
      return [...el.querySelectorAll('li[id^="song-li-"]')].find((li) => li.getBoundingClientRect().top > top + 120)!.id.replace("song-li-", "");
    });
    await ligne(page, slug).click();
    await expect(titreChant(page)).toBeVisible();
    await expect(ligne(page, slug)).toHaveAttribute("aria-current", "page");
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(`/songs/${encodeURIComponent(slug)}`);
    expect(await liste(page).evaluate((el) => el.scrollTop), "la liste n'a pas bougé").toBe(yAvant);

    // Recherche : un chant ZH, puis un FR ; la recherche reste.
    await recherche(page).fill("一生爱你");
    await ligne(page, "一生爱你").click();
    await expect(titreChant(page)).toHaveText(/一生爱你/);
    await expect(recherche(page)).toHaveValue("一生爱你");
    // Les filtres ne s'écrivent pas dans l'adresse du chant.
    expect(new URL(page.url()).search).toBe("");

    await page.goBack();
    await expect(titreChant(page)).not.toHaveText(/一生爱你/);
    expect(new URL(page.url()).pathname.replace(/\/$/, "")).toBe(`/songs/${encodeURIComponent(slug)}`);
    await expect(recherche(page)).toHaveValue("一生爱你");
  });

  test("arrivé par une adresse : le chant dans sa tonalité, sa ligne dans la vue ; les filtres n'effacent pas ?key=", async ({ page }) => {
    await page.goto("/songs/tout-puissant/?key=%22F%22");
    await listePrete(page);
    await expect(page.getByTestId("tonalite-courante")).toHaveText(/^F/);
    const l = ligne(page, "tout-puissant");
    await expect(l).toHaveAttribute("aria-current", "page");
    await expect(l).toBeInViewport();
    await liste(page).getByRole("button", { name: "FR", exact: true }).click();
    await page.waitForTimeout(200);
    expect(new URL(page.url()).searchParams.get("key")).toBe('"F"');
    await expect(page.getByTestId("tonalite-courante")).toHaveText(/^F/);
  });

  test("la barre du chant est en haut du volet de droite : sans Retour, Idées d'harmonie et PDF en boutons", async ({ page }) => {
    await signInAs(page, ADMIN, {}, "/songs/abba-pere");
    await listePrete(page);
    const barre = page.getByTestId("barre-outils");
    await expect(barre).toBeVisible();
    await expect(barre.getByRole("link", { name: "Retour" })).toHaveCount(0);
    await expect(barre.getByRole("button", { name: "Idées d'harmonie" })).toBeVisible();
    await expect(barre.getByRole("button", { name: "PDF" })).toBeVisible();
    const [b, l, d] = await Promise.all([barre.boundingBox(), liste(page).boundingBox(), droite(page).boundingBox()]);
    expect(b!.x, "la barre commence au bord du volet").toBeGreaterThanOrEqual(l!.x + l!.width - 1);
    expect(Math.round(b!.x + b!.width)).toBeLessThanOrEqual(Math.round(d!.x + d!.width));
    // Ni ligne de boutons qui déborde, ni défilement horizontal de la page.
    expect(await barre.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    // La barre colle : le chant défile, elle s'escamote ; on remonte un peu, elle revient
    // en haut du volet (et non en haut de la page).
    const centre = { x: d!.x + d!.width / 2, y: 400 };
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.wheel(0, 800);
    await expect.poll(async () => (await barre.boundingBox())!.y + b!.height).toBeLessThanOrEqual(0);
    await page.mouse.wheel(0, -120);
    await expect.poll(async () => Math.round((await barre.boundingBox())!.y)).toBe(Math.round(b!.y));
    expect(await page.evaluate(() => window.scrollY), "toujours au milieu du chant").toBeGreaterThan(300);
    await page.waitForTimeout(350);
    await capture(page, "chants-chant");
  });

  test("le chant ZH sur son scan, dans le volet, sans débordement", async ({ page }) => {
    await page.goto("/songs/一生爱你");
    await listePrete(page);
    await page.getByTestId("barre-outils").getByRole("button", { name: "简谱" }).click();
    const scan = droite(page).locator("img").first();
    await expect(scan).toBeVisible();
    const [s, d] = await Promise.all([scan.boundingBox(), droite(page).boundingBox()]);
    expect(s!.x).toBeGreaterThanOrEqual(d!.x);
    expect(s!.x + s!.width).toBeLessThanOrEqual(d!.x + d!.width + 1);
    await capture(page, "chants-chant-zh-scan");
  });

  test("ordinateur, barre dépliée, fenêtre de 1 024 px : un seul volet", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("ordinateur"), "ordinateur seulement");
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/songs");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await expect(choisis(page)).toBeHidden();
    await page.goto("/songs/abba-pere");
    await expect(page.getByRole("heading", { level: 1, name: /Abba Père/i })).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeHidden();
    await expect(page.getByTestId("barre-outils").getByRole("link", { name: "Retour" })).toBeVisible();
  });
});

test.describe("Chants en un volet (téléphone, tablette debout)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(!UN_VOLET.includes(info.project.name), "un volet : téléphone et tablette debout");
  });

  test("la liste seule, sans « Choisis un chant », et aucune setlist lue", async ({ page }) => {
    let lectures = 0;
    page.on("request", (r) => {
      if (lectureDesProchaines(r)) lectures++;
    });
    await signInAs(page, MUSICIEN, SETLISTS, "/songs");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await expect(page.locator('li[id="song-li-abba-pere"]')).toBeVisible();
    await expect(choisis(page)).toBeHidden();
    await page.waitForTimeout(500);
    expect(lectures).toBe(0);
    await page.locator('li[id="song-li-abba-pere"] a').click();
    await expect(page.getByRole("heading", { level: 1, name: /Abba Père/i })).toBeVisible();
    await expect(page.getByRole("searchbox")).toBeHidden();
  });

  test("tablette debout : Idées d'harmonie et PDF en boutons, Retour gardé", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette debout seulement");
    await signInAs(page, ADMIN, {}, "/songs/abba-pere");
    const barre = page.getByTestId("barre-outils");
    await expect(barre.getByRole("link", { name: "Retour" })).toBeVisible();
    await expect(barre.getByRole("button", { name: "Idées d'harmonie" })).toBeVisible();
    await expect(barre.getByRole("button", { name: "PDF" })).toBeVisible();
    expect(await barre.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    await capture(page, "chants-chant-tablette");
  });

  test("téléphone : rien ne change, Idées d'harmonie et PDF restent dans ⋯", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement");
    await signInAs(page, ADMIN, {}, "/songs/abba-pere");
    const barre = page.getByTestId("barre-outils");
    await expect(barre.getByRole("link", { name: "Retour" })).toBeVisible();
    await expect(barre.getByRole("button", { name: "PDF" })).toBeHidden();
    await barre.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(page.getByRole("menuitem", { name: "PDF" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Idées d'harmonie" })).toBeVisible();
  });
});
