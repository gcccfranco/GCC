import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enDeuxVolets } from "./helpers/setlist";

// 5C1, tranche V8 (docs/spec-look.md § « V8 », 27/09/2026 ; remplace V7) : le texte ne
// passe plus derrière les barres. Retour de Timothée sur iPhone : transparentes depuis
// V7, les barres laissaient les paroles, les titres et la liste traverser le logo et
// les boutons. Option B de la planche du 27/09 : chaque barre `.material-chrome` a un
// fond opaque (`FondDeBarre`) qui repeint ce qu'il cache, le fond de la page et son
// halo ; la barre reste donc invisible tant que rien n'est dessous. Sous la dernière
// barre, le contenu s'efface sur 12 px au lieu d'être tranché (ni voile, ni flou, ni
// filet : V7 les a écartés). Le mode louange garde ses deux barres voilées (20/09/2026).
const VOILE = "rgba(255, 255, 255, 0.8)";
const FONDU = 12;

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
  items: [
    chant({ songSlug: "beni-soit-ton-nom", position: 1 }), chant({ songSlug: "abba-pere", position: 2 }),
    chant({ songSlug: "tu-m-aimes", position: 3 }), chant({ songSlug: "grace-infinie", position: 4 }),
  ],
};

/** Chaque barre affichée de la page (hors mode louange) et son fond, tels que le navigateur
 *  les pose. Lot U4 : sur ordinateur, la navbar est masquée (barre latérale) mais reste montée. */
const barres = (page: Page) =>
  page.locator(".material-chrome:not(.material-steady)").evaluateAll((els) =>
    els.filter((el) => el.getClientRects().length > 0).map((el) => {
      const b = el.getBoundingClientRect();
      const fond = el.querySelector<HTMLElement>(":scope > .barre-fond");
      const f = fond?.getBoundingClientRect();
      return {
        fond: fond ? getComputedStyle(fond).backgroundColor : null,
        // Écart entre le bas du fond et le bas de la barre : le fondu.
        deborde: f ? Math.round(f.bottom - b.bottom) : null,
        couvre: f ? Math.round(f.top - b.top) === 0 && Math.round(f.left - b.left) === 0 && Math.round(f.right - b.right) === 0 : false,
        glisse: getComputedStyle(el).transitionProperty,
      };
    })
  );

/** Lot U4 : sur ordinateur, plus de navbar (la barre latérale n'est pas une barre `.material-chrome`). */
const sansNavbar = () => test.info().project.name.startsWith("ordinateur");
const avecNavbar = (combien: number) => combien - (sansNavbar() ? 1 : 0);

const auRepos = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await auRepos(page);
  await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

/** La zone des barres : du haut de l'écran au bas de la dernière barre visible. */
async function zoneDesBarres(page: Page) {
  const { bas, gauche } = await page.locator(".material-chrome:not(.material-steady)").evaluateAll((els) => {
    const r = els.filter((el) => el.getClientRects().length > 0).map((el) => el.getBoundingClientRect());
    return { bas: Math.max(...r.map((b) => b.bottom)), gauche: Math.min(...r.map((b) => b.left)) };
  });
  const largeur = await page.evaluate(() => document.documentElement.clientWidth);
  // Depuis le bord gauche des barres : Chants en deux volets (lot U5) pose la barre du chant
  // dans le volet de droite ; la liste, à gauche, n'est sous aucune barre et défile seule.
  const x = Math.ceil(Math.max(0, gauche));
  // Sans la dernière colonne : à ×2,625, le bord droit de l'écran tombe au milieu d'un pixel.
  // Sans la dernière rangée : la barre des onglets colle à `nav-h − 1 px`, son bas remonte
  // d'1 px au défilement et cette rangée passe dans le fondu.
  return { x, y: 0, width: largeur - 1 - x, height: Math.floor(bas) - 1 };
}

/** Écart entre deux captures de même taille, décodées dans la page : le plus grand écart
 *  d'un canal, où il se trouve (px CSS), et combien de pixels dépassent la tolérance. */
function ecart(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([a, b, tolerance]) => {
    const pixels = async (b64: string) => {
      const octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const image = await createImageBitmap(new Blob([octets], { type: "image/png" }));
      const toile = new OffscreenCanvas(image.width, image.height);
      const ctx = toile.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      return { data: ctx.getImageData(0, 0, image.width, image.height).data, largeur: image.width };
    };
    const [p, q] = await Promise.all([pixels(a), pixels(b)]);
    if (p.data.length !== q.data.length) return { max: 255, trop: -1, x: 0, y: 0 };
    let max = 0, ou = 0, trop = 0;
    for (let i = 0; i < p.data.length; i += 4) {
      const d = Math.max(Math.abs(p.data[i] - q.data[i]), Math.abs(p.data[i + 1] - q.data[i + 1]), Math.abs(p.data[i + 2] - q.data[i + 2]));
      if (d > tolerance) trop++;
      if (d > max) { max = d; ou = i / 4; }
    }
    const dpr = window.devicePixelRatio;
    return { max, trop, x: Math.round((ou % p.largeur) / dpr), y: Math.round(Math.floor(ou / p.largeur) / dpr) };
  }, [a.toString("base64"), b.toString("base64"), TOLERANCE] as const);
}

/** Masque le contenu des barres, fond laissé, sans toucher à leur mise en page. Masquer
 *  ne suffit pas : sur ordinateur, Chromium gardait peint le titre « Louange » (son calque
 *  d'animation `animate-in`) jusqu'au rendu suivant ; déplacé hors de l'écran, il part. */
const MASQUE_CONTENU = ".material-chrome:not(.material-steady) > :not(.barre-fond) { transform: translateY(-10000px) !important } .material-chrome:not(.material-steady) > :not(.barre-fond), .material-chrome:not(.material-steady) > :not(.barre-fond) * { visibility: hidden !important }";

/** Tolérance d'arrondi du flou du halo, rendu deux fois (l'original et sa copie) :
 *  quelques pixels s'écartent de 4 ou 5 niveaux sur 255, invisibles. */
const TOLERANCE = 6;

/**
 * Les deux promesses de la barre, vérifiées au pixel :
 * 1. en haut de page, son fond repeint exactement la page qu'il cache (fond + halo) ;
 * 2. défilée, rien ne transparaît dessous : la zone est la même qu'en haut de page.
 * `sousLeTitre` (agencement v18, R6) : la dernière barre est posée sous le titre de la page et
 * ne colle qu'une fois le titre passé ; en haut de page, la zone des barres contient donc le
 * titre. Défilée, on compare alors la zone des barres collées à la même zone, page masquée.
 */
async function barresOpaquesEtInvisibles(page: Page, combien: number, nom: string, { sousLeTitre = false } = {}) {
  await expect.poll(async () => (await barres(page)).length).toBe(combien);
  for (const b of await barres(page)) {
    expect(b.couvre, "le fond couvre la barre").toBe(true);
    expect(b.fond, "le fond est opaque").toMatch(/^rgb\(/);
    expect(b.glisse, "les barres glissent toujours au défilement").toContain("transform");
  }
  await auRepos(page);
  const zone = await zoneDesBarres(page);
  await capture(page, `barres-${nom}-en-haut`);

  // Le contenu des barres reste masqué jusqu'au bout : seul compte ce que laisse voir leur
  // fond (un bouton qui apparaît entre-temps, ou les onglets qui remontent d'1 px en
  // collant, ne disent rien de ce qui passe dessous). Le retirer relancerait les animations.
  const masque = await page.addStyleTag({ content: MASQUE_CONTENU });

  // 1. En haut de page, le fond seul est identique à la page sans barre.
  const fondSeul = await page.screenshot({ clip: zone });
  const sansFond = await page.addStyleTag({ content: ".barre-fond{visibility:hidden!important}" });
  const pageNue = await page.screenshot({ clip: zone });
  await sansFond.evaluate((el) => (el as ChildNode).remove());
  const repeint = await ecart(page, fondSeul, pageNue);
  expect(repeint, `le fond repeint exactement la page et son halo ${JSON.stringify(repeint)}`).toMatchObject({ trop: 0 });

  // 2. On défile, puis on remonte d'un cran : les barres reviennent, posées sur du contenu.
  // À la molette, comme on défile : deux `scrollTo` coup sur coup se confondent en un seul
  // événement, et les barres croient qu'on descend encore.
  const transformations = () => page.locator(".material-chrome:not(.material-steady)").evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).map((el) => getComputedStyle(el).transform));
  const enPlace = Array(combien).fill("matrix(1, 0, 0, 1, 0, 0)");
  await page.addStyleTag({ content: "body{min-height:3000px}" });
  await page.mouse.move(zone.x + zone.width / 2, 400);
  await page.mouse.wheel(0, 600);
  await expect.poll(transformations, "les barres se rangent quand on descend").not.toEqual(enPlace);
  await page.mouse.wheel(0, -40);
  await expect.poll(transformations, "elles reviennent quand on remonte").toEqual(enPlace);
  await auRepos(page);
  if (sousLeTitre) {
    const collees = await zoneDesBarres(page);
    const pageMasquee = async () => {
      const cache = await page.addStyleTag({ content: "main main, header[data-entete-page] { visibility: hidden !important }" });
      const image = await page.screenshot({ clip: collees });
      await cache.evaluate((el) => (el as ChildNode).remove());
      return image;
    };
    await expect.poll(async () => ecart(page, await pageMasquee(), await page.screenshot({ clip: collees })), "rien ne transparaît sous les barres collées")
      .toMatchObject({ trop: 0 });
  } else {
    // Attendu jusqu'à ce que le rendu se pose (1 fois sur 90, la capture tombait juste après
    // le défilement) : du contenu visible sous une barre, lui, ne disparaîtrait jamais.
    await expect.poll(async () => ecart(page, fondSeul, await page.screenshot({ clip: zone })), "rien ne transparaît sous les barres")
      .toMatchObject({ trop: 0 });
  }

  await masque.evaluate((el) => (el as ChildNode).remove());
  await capture(page, `barres-${nom}-defile`);
}

test.describe("barres (5C1, V8) : opaques, elles repeignent la page qu'elles cachent", () => {
  test("Chants : la navbar", async ({ page }) => {
    test.skip(sansNavbar(), "ordinateur : pas de barre en haut de la liste des chants (lot U4)");
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await barresOpaquesEtInvisibles(page, 1, "chants");
  });

  // Un chant français et un chant chinois (CLAUDE.md).
  for (const [nom, slug] of [["fr", "tu-m-aimes"], ["zh", "一生爱你"]] as const) {
    test(`un chant (${nom}) : la navbar et la barre d'outils`, async ({ page }) => {
      await page.goto(`/songs/${encodeURIComponent(slug)}`);
      await page.getByTestId("barre-outils").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await barresOpaquesEtInvisibles(page, avecNavbar(2), `chant-${nom}`);
    });
  }

  test("une setlist : la navbar et la barre d'outils", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, { "setlists/culte": FICHE }, "/setlists/culte");
    await page.getByRole("button", { name: "Mode louange" }).waitFor();
    // Deux volets (docs/spec-deux-volets.md, T4) : la barre est l'en-tête collant, et les
    // partitions sont là dès l'ouverture ; on attend qu'elles soient posées.
    if (await enDeuxVolets(page)) await page.locator("[data-outline-item]").first().waitFor();
    await barresOpaquesEtInvisibles(page, avecNavbar(2), "setlist");
  });

  test("Planning : la navbar et la barre des onglets", async ({ page }) => {
    // Agencement v18 (R6) : en grand, les plannings sont des pilules dans l'en-tête, plus de barre collante.
    test.skip(sansNavbar(), "en grand, le Planning n'a plus de barre d'onglets");
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/planning");
    await page.getByRole("heading", { level: 1, name: "Planning" }).waitFor();
    await barresOpaquesEtInvisibles(page, avecNavbar(2), "planning", { sousLeTitre: true });
  });

  test("en sombre aussi, le fond repeint la page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/songs/tu-m-aimes");
    await page.getByTestId("barre-outils").waitFor();
    await barresOpaquesEtInvisibles(page, avecNavbar(2), "chant-sombre");
  });

  // Le fondu vit sous la dernière barre : celui de la navbar mangerait le haut de la barre posée dessous.
  test("le contenu s'efface sous la dernière barre seulement", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    expect((await barres(page)).map((b) => b.deborde)).toEqual(sansNavbar() ? [] : [FONDU]);
    await page.goto("/songs/tu-m-aimes");
    await page.getByTestId("barre-outils").waitFor();
    // navbar (1 px de recouvrement), barre d'outils ; sur ordinateur, la barre d'outils seule (lot U4)
    expect((await barres(page)).map((b) => b.deborde)).toEqual(sansNavbar() ? [FONDU] : [1, FONDU]);
  });

  // Rien ne dépend de React : ni bande blanche ni halo absent le temps qu'il démarre.
  test("dès le premier affichage, avant que React ne démarre, la navbar repeint déjà le halo", async ({ page }) => {
    test.skip(sansNavbar(), "là où il y a une navbar : pas sur ordinateur (lot U4)");
    await page.route(/\/_next\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto("/songs");
    await page.locator("header").first().waitFor();
    expect((await barres(page)).map((b) => b.couvre)).toEqual([true]);
    const halo = await page.evaluate(() => getComputedStyle(document.querySelector("header .barre-halo")!, "::before").backgroundColor);
    expect(halo, "la copie du halo a sa couleur").not.toBe("rgba(0, 0, 0, 0)");
  });

  // Qui demande moins de transparence garde des barres pleines.
  test("transparence réduite : les barres prennent un fond plein", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Playwright n'émule pas ce réglage : on le demande à Chromium.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    await expect.poll(() => page.locator(".material-chrome:not(.material-steady)").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))).toEqual(["rgb(255, 255, 255)"]);
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
