import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// 5C1, tranche V7 (docs/spec-look.md § « V7 », 21/09/2026 ; remplace l'option C de V6 bis) :
// les barres `.material-chrome` n'ont plus ni voile ni filet, en haut de page comme
// défilées. Un flou seul les sépare de ce qui passe dessous, et le halo, fixe, les
// traverse. Depuis V7 bis, ce flou vit sur un calque qui déborde de 16 px sous la barre
// et s'y éteint en dégradé : plus de bord net entre flou et net (le « scroll edge » d'iOS).
// Le mode louange garde ses deux barres voilées (tranché le 20/09/2026).
const RIEN = "rgba(0, 0, 0, 0)";
const VOILE = "rgba(255, 255, 255, 0.8)";

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

/** Le matériau de chaque barre de la page (hors mode louange), tel que le navigateur le
 *  calcule. Le flou vit sur le calque `::before`, qui déborde sous la barre pour s'y
 *  fondre (V7 bis) ; la barre elle-même ne porte que son contenu. */
const barres = (page: Page) =>
  page.locator(".material-chrome:not(.material-steady)").evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      const calque = getComputedStyle(el, "::before");
      return {
        fond: s.backgroundColor,
        flou: calque.backdropFilter,
        filet: s.boxShadow,
        glisse: s.transitionProperty,
        masque: calque.maskImage,
        deborde: calque.bottom,
      };
    })
  );
const VERRE = { fond: RIEN, filet: "none" };
const verre = async (page: Page) => (await barres(page)).map(({ fond, filet }) => ({ fond, filet }));

/** Défile, même sur une page trop courte pour cela (planning vide, setlist de deux chants). */
async function defiler(page: Page, y: number) {
  await page.addStyleTag({ content: "body{min-height:3000px}" });
  await page.evaluate((top) => window.scrollTo(0, top), y);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function enHautPuisDefile(page: Page, combien: number, nom: string) {
  // En haut de page : ni voile, ni filet, ni flou. Rien ne passe sous les barres, il n'y
  // a donc rien à en séparer — et le calque déborde de 16 px, il brouillerait le haut du
  // contenu pour rien (retour de Timothée du 21/09/2026 : « le flou est trop présent »).
  await expect.poll(() => verre(page)).toEqual(Array(combien).fill(VERRE));
  for (const b of await barres(page)) expect(b.flou).toBe("none");
  await capture(page, `barres-${nom}-en-haut`);
  // On défile, puis on remonte d'un cran pour que les barres reviennent, posées sur du
  // contenu : toujours ni voile ni filet, c'est le flou qui les sépare de ce qui passe dessous.
  await defiler(page, 600);
  await defiler(page, 560);
  await expect.poll(() => verre(page)).toEqual(Array(combien).fill(VERRE));
  // Le flou arrive avec l'événement de défilement, pas avec `scrollTo` : on l'attend.
  await expect.poll(async () => (await barres(page)).every((b) => b.flou.includes("blur(20px)"))).toBe(true);
  for (const b of await barres(page)) {
    expect(b.flou).toContain("blur(20px)");
    // Le bord bas ne tranche pas : le flou déborde de 16 px et s'y éteint en dégradé.
    expect(b.masque).toContain("linear-gradient");
    expect(b.deborde).toBe("-16px");
  }
  // Et elles glissent toujours quand on défile.
  for (const b of await barres(page)) expect(b.glisse).toContain("transform");
  await capture(page, `barres-${nom}-defile`);
}

test.describe("barres (5C1, V7) : ni voile ni filet, en haut de page comme défilées", () => {
  test("Chants : la navbar", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await enHautPuisDefile(page, 1, "chants");
  });

  // Le matériau ne dépend plus de React : aucun voile blanc ne se montre le temps qu'il démarre.
  test("dès le premier affichage, avant que React ne démarre, la navbar n'a ni voile ni filet", async ({ page }) => {
    await page.route(/\/_next\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto("/songs");
    await page.locator("header").first().waitFor();
    expect(await verre(page)).toEqual([VERRE]);
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

  test("en sombre non plus, ni voile ni filet", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.emulateMedia({ colorScheme: "dark" });
    await defiler(page, 600);
    await defiler(page, 560);
    await expect.poll(() => verre(page)).toEqual([VERRE]);
    await capture(page, "barres-chants-sombre-defile");
  });

  // Qui demande moins de transparence garde des barres pleines : le flou part, le fond revient.
  test("transparence réduite : les barres redeviennent pleines", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Playwright n'émule pas ce réglage : on le demande à Chromium.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    await expect.poll(async () => (await barres(page)).map(({ fond, flou, masque }) => ({ fond, flou, masque }))).toEqual([{ fond: "rgb(255, 255, 255)", flou: "none", masque: "none" }]);
  });

  test("le mode louange garde ses deux barres voilées", async ({ page }) => {
    await sansSheet(page);
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await signInAs(page, MUSICIEN, { "setlists/culte": FICHE }, "/setlists/culte");
    await page.getByRole("button", { name: "Mode louange" }).click();
    await expect(page.getByText("Mise en page…")).toHaveCount(0);
    const voilees = page.locator(".material-chrome.material-steady");
    await expect(voilees).toHaveCount(2); // la barre du haut et celle du bas
    for (const fond of await voilees.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))) expect(fond).toBe(VOILE);
  });
});
