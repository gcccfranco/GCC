import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// 5C1, tranche V6 bis (docs/spec-look.md § « Barres et halo : réouvert… », option C) :
// en haut de page rien ne passe sous les barres `.material-chrome`, elles s'effacent et
// laissent voir le halo ; dès qu'on défile elles reprennent leur voile (blanc à 80 %,
// flou de 20 px). Le mode louange garde ses deux barres voilées (tranché le 20/09/2026).
const RIEN = "rgba(0, 0, 0, 0)";
const VOILE = "rgba(255, 255, 255, 0.8)";
const VOILE_SOMBRE = "rgba(0, 0, 0, 0.8)";

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
const chant = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
const FICHE = {
  title: "Culte du 27 septembre", leader: "Élise R.", category: "Culte Francophone", date: "2026-09-27", language: "mixed", notes: "",
  ownerId: "uid-owner", isPrivate: false, isDraft: false,
  items: [chant({ songSlug: "beni-soit-ton-nom", position: 1 }), chant({ songSlug: "abba-pere", position: 2 })],
};

/** Le matériau de chaque barre de la page (hors mode louange), tel que le navigateur le calcule. */
const barres = (page: Page) =>
  page.locator(".material-chrome:not(.material-steady)").evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { fond: s.backgroundColor, flou: s.backdropFilter, filet: s.boxShadow, glisse: s.transitionProperty };
    })
  );
const EFFACEE = { fond: RIEN, flou: "none", filet: "none" };

/** Défile, même sur une page trop courte pour cela (planning vide, setlist de deux chants). */
async function defiler(page: Page, y: number) {
  await page.addStyleTag({ content: "body{min-height:3000px}" });
  await page.evaluate((top) => window.scrollTo(0, top), y);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function enHautPuisDefile(page: Page, combien: number, nom: string) {
  // En haut de page : aucune barre, ni fond, ni flou, ni filet.
  await expect.poll(async () => (await barres(page)).map(({ fond, flou, filet }) => ({ fond, flou, filet }))).toEqual(Array(combien).fill(EFFACEE));
  await capture(page, `barres-${nom}-en-haut`);
  // On défile : le voile d'aujourd'hui revient sur chacune.
  await defiler(page, 600);
  await expect.poll(async () => (await barres(page)).map((b) => b.fond)).toEqual(Array(combien).fill(VOILE));
  for (const b of await barres(page)) expect(b.flou).toContain("blur(20px)");
  // Et elles glissent toujours quand on défile : le fondu du voile ne doit pas écraser leur `transition-transform`.
  for (const b of await barres(page)) expect(b.glisse).toContain("transform");
  await capture(page, `barres-${nom}-defile`);
  // De retour en haut : elles s'effacent de nouveau.
  await defiler(page, 0);
  await expect.poll(async () => (await barres(page)).map((b) => b.fond)).toEqual(Array(combien).fill(RIEN));
}

test.describe("barres (5C1, V6 bis) : effacées en haut de page, voilées dès qu'on défile", () => {
  test("Chants : la navbar", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await enHautPuisDefile(page, 1, "chants");
  });

  // Sans cela, à chaque chargement le voile blanc se montre puis s'efface, le temps que React démarre.
  test("dès le premier affichage, avant que React ne démarre, la navbar est déjà effacée", async ({ page }) => {
    await page.route(/\/_next\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto("/songs");
    await page.locator("header").first().waitFor();
    expect((await barres(page)).map(({ fond, flou, filet }) => ({ fond, flou, filet }))).toEqual([EFFACEE]);
  });

  test("Planning : la navbar et la barre des onglets", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/planning");
    await page.getByRole("heading", { level: 1, name: "Planning" }).waitFor();
    await enHautPuisDefile(page, 2, "planning");
  });

  // Un chant français et un chant chinois (CLAUDE.md).
  for (const [nom, slug] of [["fr", "beni-soit-ton-nom"], ["zh", "一生爱你"]] as const) {
    test(`un chant (${nom}) : la navbar et la barre d'outils`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      await page.getByTestId("barre-outils").waitFor();
      await enHautPuisDefile(page, 2, `chant-${nom}`);
    });
  }

  test("une setlist : la navbar et la barre d'outils", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, { "setlists/culte": FICHE }, "/setlists/culte");
    await page.getByRole("button", { name: "Mode louange" }).waitFor();
    await enHautPuisDefile(page, 2, "setlist");
  });

  test("en sombre, le voile du défilement est noir à 80 %", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.emulateMedia({ colorScheme: "dark" });
    await defiler(page, 600);
    await expect.poll(async () => (await barres(page)).map((b) => b.fond)).toEqual([VOILE_SOMBRE]);
  });

  test("le mode louange garde ses deux barres voilées, même en haut de page", async ({ page }) => {
    await sansSheet(page);
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await signInAs(page, MUSICIEN, { "setlists/culte": FICHE }, "/setlists/culte");
    await page.getByRole("button", { name: "Mode louange" }).click();
    await expect(page.getByText("Mise en page…")).toHaveCount(0);
    const voilees = page.locator(".material-chrome.material-steady");
    await expect(voilees).toHaveCount(2); // la barre du haut et celle du bas
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-at-top"))).toBe(true);
    for (const fond of await voilees.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))) expect(fond).toBe(VOILE);
  });
});
