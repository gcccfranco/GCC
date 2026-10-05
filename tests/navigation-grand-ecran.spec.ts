import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot U4 — navigation sur grand écran (docs/spec-navigation-grand-ecran.md).
// Quatre dispositions décidées par le CSS seul (Q1) : ordinateur = pointeur fin
// et ≥ 1024 px ; tablette en paysage = pointeur grossier, paysage et ≥ 1024 px ;
// sinon le modèle du téléphone (barre du haut et barre du bas).
// Lancé sur les cinq projets ; un test propre à une disposition le dit dans son titre.

const MEMBRE: FakeProfile = { uid: "u-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", planningName: "Ruth K." };
const ENCRE = "rgb(28, 28, 30)";

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTablettePaysage = (info: TestInfo) => info.project.name === "tablette-paysage";
const aBarreLaterale = (info: TestInfo) => estOrdinateur(info) || estTablettePaysage(info);

/** La barre latérale (visible seulement sur grand écran). */
const barreLaterale = (page: Page) => page.getByTestId("barre-laterale");
const navigation = (page: Page) => page.getByRole("navigation", { name: "Navigation principale" });
const pxVar = (page: Page, nom: string) =>
  page.evaluate((n) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(n)) || 0, nom);
/** Le `main` du site (layout.tsx) ; une page peut avoir le sien, dedans. */
const mainDuSite = (page: Page) => page.locator("main").first();
/** En développement, Next pose son indicateur (« N ») en bas à gauche de la fenêtre, sur
 *  l'initiale du pied de la barre ; il n'existe pas en ligne. On le retire avant d'y toucher. */
const sansIndicateurDeNext = (page: Page) => page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
/** Le planning lit un Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
/** Nom de l'élément qui a le focus (son `aria-label`, sinon son texte). */
const focusActuel = (page: Page) =>
  page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").trim());
/** Attendre la fin des animations (fondu d'entrée de la page, libellés). */
const animationsFinies = (page: Page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

test.describe("navigation sur grand écran (U4) : précondition", () => {
  // Sans elle, les projets mentiraient : un « iPad » qui aurait un pointeur fin
  // serait pris pour un ordinateur, et tous les tests suivants seraient faux.
  test("pointeur grossier sur téléphone et tablettes, fin sur les deux projets ordinateur", async ({ page }, info) => {
    await page.goto("/songs");
    const grossier = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    expect(grossier, `projet ${info.project.name}`).toBe(!estOrdinateur(info));
  });
});

test.describe("navigation sur grand écran (U4) : une seule cloche", () => {
  // Q7 : le hook des notifications interroge Firestore toutes les 10 min. Deux
  // barres montées (navbar et barre latérale) ne doivent pas doubler les lectures.
  // Le hook se rafraîchit au retour sur la page (`focus`) : un retour = une
  // requête par cloche montée. Deux cloches en feraient deux.
  test("un retour sur la page relance une seule requête de notifications", async ({ page }) => {
    let requetes = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes(":runQuery") && (r.postData() ?? "").includes('"collectionId":"notifications"')) requetes++;
    });
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect.poll(() => requetes, { message: "la cloche a chargé" }).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    requetes = 0;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForTimeout(1500);
    expect(requetes, "une seule cloche interroge Firestore").toBe(1);
  });
});

test.describe("navigation sur grand écran (U4) : un seul profil lu", () => {
  // Relecture du 05/10/2026 : navbar, barre latérale (barre fixe et menus « Compte ») et
  // notifications lisent chacune le profil ; montées ensemble, elles partaient chacune
  // chercher `users/{uid}` (jusqu'à 8 lectures Firestore au lieu d'une).
  test("au premier chargement, le profil du membre n'est lu qu'une fois", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    let lectures = 0;
    page.on("request", (r) => {
      if (r.method() === "GET" && /\/documents\/users\/u-ruth(\?|$)/.test(r.url())) lectures++;
    });
    await page.reload();
    await page.getByRole("searchbox").waitFor();
    // La session connue (entrée « Moi » du membre), le profil est demandé ; on laisse à
    // chaque barre le temps de demander le sien.
    await page.getByRole("link", { name: "Moi", exact: true }).filter({ visible: true }).first().waitFor();
    await expect.poll(() => lectures, { message: "le profil a été lu" }).toBeGreaterThan(0);
    await page.waitForTimeout(1500);
    expect(lectures, "une seule lecture de users/u-ruth").toBe(1);
  });
});

/** Ce qui est visible : barre du haut, barre du bas, barre latérale. */
async function barresVisibles(page: Page) {
  return {
    haut: await page.locator("header").isVisible(),
    bas: await page.getByTestId("barre-du-bas").isVisible(),
    laterale: await barreLaterale(page).isVisible(),
  };
}

test.describe("navigation sur grand écran (U4) : dispositions", () => {
  test("ordinateur, de 1 024 à 1 920 px : la barre latérale seule, la page à sa droite, aucun défilement horizontal", async ({ page }, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    for (const largeur of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await expect.poll(() => barresVisibles(page), { message: `${largeur} px` }).toEqual({ haut: false, bas: false, laterale: true });
      expect(Math.round((await barreLaterale(page).boundingBox())!.width), `${largeur} px : barre dépliée`).toBe(248);
      expect(await pxVar(page, "--barre-laterale")).toBe(248);
      // `--nav-h` vaut `--sat` (0 ici) : mesuré sur `main`, un calc() non résolu se lirait 0 aussi.
      expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingTop), "plus de barre du haut : la page commence en haut").toBe("0px");
      expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingLeft), "la page commence au bord de la barre").toBe("248px");
      const titre = await page.getByRole("heading", { level: 1, name: "Chants" }).boundingBox();
      expect(titre!.x, "le titre est à droite de la barre").toBeGreaterThanOrEqual(248);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${largeur} px`).toBe(0);
    }
  });

  test("téléphone et tablette en portrait : barre du haut et barre du bas, comme aujourd'hui", async ({ page }, info) => {
    test.skip(aBarreLaterale(info), "téléphone et tablette en portrait seulement");
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    expect(await pxVar(page, "--barre-laterale")).toBe(0);
  });
});

// Trois cas limites, chacun lancé sur le projet de sa famille (pointeur et toucher).
test.describe("navigation sur grand écran (U4) : cas limites, barres du haut et du bas", () => {
  test.describe("iPad Pro 13 pouces debout (1 024 × 1 366, tactile)", () => {
    test.use({ viewport: { width: 1024, height: 1366 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test("garde la barre du haut et la barre du bas", async ({ page }, info) => {
      test.skip(info.project.name !== "tablette", "projet tablette seulement");
      await signInAs(page, MEMBRE, {}, "/songs");
      await page.getByRole("searchbox").waitFor();
      await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    });
  });
  test.describe("téléphone couché (915 × 412, tactile)", () => {
    test.use({ viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test("garde la barre du haut et la barre du bas", async ({ page }, info) => {
      test.skip(info.project.name !== "telephone", "projet téléphone seulement");
      await signInAs(page, MEMBRE, {}, "/songs");
      await page.getByRole("searchbox").waitFor();
      await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    });
  });
  test.describe("fenêtre d'ordinateur de 900 px", () => {
    test.use({ viewport: { width: 900, height: 800 } });
    test("garde la barre du haut et la barre du bas", async ({ page }, info) => {
      test.skip(info.project.name !== "ordinateur", "projet ordinateur seulement");
      await signInAs(page, MEMBRE, {}, "/songs");
      await page.getByRole("searchbox").waitFor();
      await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    });
  });
});

test.describe("navigation sur grand écran (U4) : barre dépliée, ordinateur", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
  });
  test("membre : les cinq entrées dans l'ordre, la courante en pastille d'encre ; « GCC Louange » puis « Planning » en rouge du logo", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const nav = navigation(page);
    await expect(nav).toHaveCount(1);
    await expect(nav.getByRole("link")).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
    const chants = nav.getByRole("link", { name: "Chants" });
    await expect(chants).toHaveAttribute("aria-current", "page");
    await expect.poll(() => chants.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe(ENCRE);
    expect(await nav.getByRole("link", { name: "Setlists" }).evaluate((a) => getComputedStyle(a).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    const label = barreLaterale(page).getByTestId("label-section");
    await expect(label).toHaveText("Louange");
    expect(await label.evaluate((el) => getComputedStyle(el).color), "rouge du logo").toBe("rgb(207, 42, 32)");
    await nav.getByRole("link", { name: "Setlists" }).click();
    await expect(page).toHaveURL(/\/setlists\/?$/);
    await expect(label).toHaveText("Louange");
    await nav.getByRole("link", { name: "Planning" }).click();
    await expect(page).toHaveURL(/\/planning\/?$/);
    await expect(label).toHaveText("Planning");
    // En fondu : le label porte une animation d'opacité courte à chaque changement.
    expect(await label.evaluate((el) => getComputedStyle(el).animationName)).not.toBe("none");
    await expect(nav.getByRole("link", { name: "Planning" })).toHaveAttribute("aria-current", "page");
  });

  test("membre : le pied porte l'initiale, le nom, la cloche et la langue ; l'initiale ouvre le menu « Compte »", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const pied = barreLaterale(page).getByTestId("pied-barre");
    await expect(pied).toContainText("Ruth K.");
    await expect(pied.getByRole("button", { name: "Notifications" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "切换为中文" })).toBeVisible();
    await expect(barreLaterale(page).getByRole("button", { name: /mode (clair|sombre)/i }), "le thème d'un membre est dans Moi").toHaveCount(0);
    await sansIndicateurDeNext(page);
    await pied.getByRole("button", { name: "Compte" }).click();
    const menu = page.getByRole("menu");
    for (const nom of ["Mon profil", "Guide d'utilisation", "Ton avis sur le site", "Signaler un problème", "Déconnexion"]) {
      await expect(menu.getByRole("menuitem", { name: nom })).toBeVisible();
    }
    // Le menu s'ouvre à côté de la barre, pas dessous.
    expect((await menu.boundingBox())!.x).toBeGreaterThanOrEqual(240);
  });

  test("visiteur : Chants · Évènements ; en bas « Connexion », la langue et le thème", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveText(["Chants", "Évènements"]);
    const pied = barreLaterale(page).getByTestId("pied-barre");
    await expect(pied.getByRole("link", { name: "Connexion" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "切换为中文" })).toBeVisible();
    await expect(pied.getByRole("button", { name: /Mode (clair|sombre)/ })).toBeVisible();
  });

  test("la place du sélecteur App ↔ Back-Office existe, vide, sous le label (U6 la remplira)", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const place = barreLaterale(page).getByTestId("place-selecteur");
    await expect(place).toHaveCount(1);
    expect(await place.evaluate((el) => el.childElementCount)).toBe(0);
  });

  test("Tab parcourt le logo, « Réduire », puis les entrées, puis le pied", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Les entrées arrivent une fois la session connue (visiteur ici), comme dans la barre du bas.
    await expect(navigation(page).getByRole("link")).toHaveCount(2);
    await barreLaterale(page).getByRole("link").first().focus();
    const ordre: string[] = [];
    for (let i = 0; i < 5; i++) {
      ordre.push(await focusActuel(page));
      await page.keyboard.press("Tab");
    }
    expect(ordre[0]).toMatch(/GCC/);
    expect(ordre.slice(1, 4)).toEqual(["Réduire la barre latérale", "Chants", "Évènements"]);
    // Focus à l'encre, visible même sur l'entrée courante (pastille d'encre) : décalé de 2 px.
    const focus = await page.evaluate(() => {
      const st = getComputedStyle(document.activeElement!);
      return { couleur: st.outlineColor, style: st.outlineStyle, decalage: st.outlineOffset };
    });
    expect(focus).toEqual({ couleur: ENCRE, style: "solid", decalage: "2px" });
  });

  test("fenêtre trop basse : la barre défile seule, son pied reste joignable", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 300 });
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const barre = barreLaterale(page);
    await expect(navigation(page).getByRole("link")).toHaveCount(5);
    expect(await barre.evaluate((el) => el.scrollHeight > el.clientHeight), "le contenu dépasse la fenêtre").toBe(true);
    const pied = barre.getByTestId("pied-barre");
    await pied.scrollIntoViewIfNeeded();
    await expect(pied).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY), "c'est la barre qui a défilé, pas la page").toBe(0);
  });
});

// ── N2 : ce qui se pose à côté de la barre, le dimanche, l'impression, la zone sûre ──────────

const MUSICIEN: FakeProfile = { ...MEMBRE, serviceRoles: { "Culte Francophone": ["musicien"] } };
const SETLIST_ID = "setlist-u4";
const chantDeSetlist = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
// Privée et à la membre : « Partager » affiche alors le message de la setlist, qu'on mesure.
const SETLIST = {
  title: "Culte du 4 octobre", leader: "Présidence", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "", ownerId: MEMBRE.uid, isPrivate: true,
  items: [chantDeSetlist({ songSlug: "abba-pere", position: 1 }), chantDeSetlist({ songSlug: "爱的约定", position: 2 })],
};
const ouvrirSetlist = (page: Page) => signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, `/setlists/${SETLIST_ID}`);
const debordement = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** Vrai si le point (x, y) de l'écran appartient à un élément qui correspond à `selecteur`. */
const auPoint = (page: Page, x: number, y: number, selecteur: string) =>
  page.evaluate(([px, py, sel]) => !!document.elementFromPoint(px as number, py as number)?.closest(sel as string), [x, y, selecteur] as const);

/** La barre du haut d'une setlist : la barre d'outils (un volet, G) ou l'en-tête des deux
 *  volets (lot U5, docs/spec-deux-volets.md, T4) — 900 px utiles au moins à côté de la barre. */
const barreDeSetlist = (page: Page) => page.locator('[data-testid="barre-outils"], [data-en-tete]');
const LECTURE = 1440; // --largeur-lecture : les deux volets, centrés au-delà

/** La barre du haut part du bord de la barre latérale (`bord`) ; les deux volets, bornés à
 *  1 440 px, restent centrés dans la zone de contenu au-delà. Le halo part du bord ; rien ne
 *  déborde en largeur. */
async function barreDeSetlistAuBord(page: Page, largeur: number, bord: number) {
  const barre = barreDeSetlist(page);
  const deuxVolets = largeur - bord >= 900;
  const contenu = largeur - bord;
  const x = deuxVolets ? bord + Math.max(0, (contenu - LECTURE) / 2) : bord;
  const l = deuxVolets ? Math.min(contenu, LECTURE) : contenu;
  await expect(page.locator("[data-en-tete]"), `${largeur} px : ${deuxVolets ? "deux volets" : "un volet"}`).toHaveCount(deuxVolets ? 1 : 0);
  await expect.poll(async () => Math.round((await barre.boundingBox())!.x), `${largeur} px : barre du haut`).toBe(Math.round(x));
  expect(Math.round((await barre.boundingBox())!.width), `${largeur} px : sa largeur`).toBe(Math.round(l));
  expect(Math.round((await page.getByTestId("halo").boundingBox())!.x), `${largeur} px : halo`).toBe(bord);
  expect(await debordement(page), `${largeur} px`).toBe(0);
}

/** Le Sommaire des deux volets : le volet de gauche, jamais sous la barre latérale, à
 *  gauche des partitions. */
async function sommaireAGauche(page: Page, bord: number) {
  const sommaire = page.getByRole("navigation", { name: "Sommaire" });
  await expect(sommaire).toBeVisible();
  const s = (await sommaire.boundingBox())!;
  expect(s.x, "jamais sous la barre").toBeGreaterThanOrEqual(bord);
  const chant = (await page.locator("[data-outline-item]").first().boundingBox())!;
  expect(s.x + s.width, "il ne mord pas sur les partitions").toBeLessThanOrEqual(chant.x);
}

test.describe("navigation sur grand écran (U4) : rien ne passe sous la barre, ordinateur", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
  });

  test("setlist : barre du haut (barre d'outils ou en-tête des deux volets) et halo au bord de la barre, aucun défilement horizontal, de 1 024 à 1 920 px", async ({ page }) => {
    await ouvrirSetlist(page);
    await barreDeSetlist(page).first().waitFor();
    await animationsFinies(page);
    for (const largeur of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await barreDeSetlistAuBord(page, largeur, 248);
    }
  });

  test("setlist : le sommaire est le volet de gauche dès 900 px utiles (1 148 px de fenêtre), absent en dessous", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await ouvrirSetlist(page);
    await sommaireAGauche(page, 248);
    await page.setViewportSize({ width: 1440, height: 900 });
    await sommaireAGauche(page, 248);
    // 1 147 px, barre dépliée : 899 px utiles, un volet (G).
    await page.setViewportSize({ width: 1147, height: 900 });
    await expect(page.getByRole("navigation", { name: "Sommaire" })).toHaveCount(0);
    await expect(page.getByTestId("bascule-vues")).toBeVisible();
  });

  test("setlist : le message (« Partager » une setlist privée) est centré dans la zone de contenu", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ouvrirSetlist(page);
    const outils = barreDeSetlist(page);
    await outils.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Partager" }).click();
    const message = page.getByText("Setlist privée — visible uniquement par toi");
    await expect(message).toBeVisible();
    await animationsFinies(page);
    const m = (await message.boundingBox())!;
    expect(m.x).toBeGreaterThan(248);
    expect(Math.abs(m.x + m.width / 2 - (248 + (1440 - 248) / 2)), "centré à droite de la barre").toBeLessThanOrEqual(2);
  });

  test("éditeur : la barre d'action commence au bord de la barre et laisse son pied visible", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/setlists/new");
    const publier = page.getByRole("button", { name: "Publier" });
    await publier.waitFor();
    await sansIndicateurDeNext(page);
    const action = publier.locator("xpath=../..");
    expect(Math.round((await action.boundingBox())!.x)).toBe(248);
    const pied = (await barreLaterale(page).getByTestId("pied-barre").boundingBox())!;
    expect(await auPoint(page, pied.x + 12, pied.y + pied.height / 2, '[data-testid="pied-barre"]'), "le pied n'est pas recouvert").toBe(true);
  });
});

test.describe("navigation sur grand écran (U4) : dimanche, ordinateur et tablette en paysage", () => {
  test("« Mode louange » couvre tout l'écran, barre comprise ; en quittant, la barre revient et la page est à sa place", async ({ page }, info) => {
    test.skip(!aBarreLaterale(info), "ordinateur et tablette en paysage seulement");
    // Ordinateur : la barre dépliée ; tablette en paysage : réduite, toujours (N4).
    const bord = estOrdinateur(info) ? 248 : 68;
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await ouvrirSetlist(page);
    const outils = barreDeSetlist(page);
    await outils.waitFor();
    const b = (await barreLaterale(page).boundingBox())!;
    await outils.getByRole("button", { name: /Mode Louange/ }).click();
    await expect(page.getByText("Mise en page…")).toHaveCount(0);
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    expect(await auPoint(page, b.x + b.width / 2, b.y + b.height / 2, "[data-performance-mode]"), "le centre de la barre appartient au mode louange").toBe(true);
    // Rendre la page où elle était : Playwright fait défiler sa cible pendant la sortie du plein écran
    // (voir `quitter` dans performance-mode.spec.ts) — l'outil de test, pas le site.
    const y = await page.evaluate(() => window.scrollY);
    await page.getByRole("button", { name: "Quitter" }).click();
    await page.evaluate((to) => window.scrollTo(0, to), y);
    await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
    await expect(barreLaterale(page)).toBeVisible();
    await expect.poll(async () => Math.round((await outils.boundingBox())!.x)).toBe(bord);
    expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingLeft)).toBe(`${bord}px`);
  });
});

test.describe("navigation sur grand écran (U4) : impression, zone sûre, couleurs, 中文 — ordinateur", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
  });

  test("impression : ni barre ni marge", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.emulateMedia({ media: "print" });
    await expect(barreLaterale(page)).toBeHidden();
    expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingLeft)).toBe("0px");
    expect(await pxVar(page, "--barre-laterale")).toBe(0);
  });

  test("zone sûre : le haut de la barre réserve --sat, le logo reste dessous", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.addStyleTag({ content: ":root { --sat: 24px !important; }" });
    await expect.poll(async () => (await barreLaterale(page).locator("img").first().boundingBox())!.y).toBeGreaterThanOrEqual(24);
    expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingTop), "la page aussi descend sous l'heure").toBe("24px");
  });

  test("clair : fond #f7f7f8, filet #ececee à droite, label de 17 px", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const barre = barreLaterale(page);
    expect(await barre.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(247, 247, 248)");
    expect(await barre.evaluate((el) => getComputedStyle(el).borderRightColor)).toBe("rgb(236, 236, 238)");
    expect(await barre.evaluate((el) => getComputedStyle(el).borderRightWidth)).toBe("1px");
    expect(await barre.getByTestId("label-section").evaluate((el) => getComputedStyle(el).fontSize)).toBe("17px");
  });

  test("sombre : fond #1c1c1e, filet du thème, pastille inversée comme la barre du bas", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const barre = barreLaterale(page);
    await expect.poll(() => barre.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(28, 28, 30)");
    expect(await barre.evaluate((el) => getComputedStyle(el).borderRightColor)).toBe("rgb(55, 55, 57)");
    const chants = navigation(page).getByRole("link", { name: "Chants" });
    // La pastille arrive en fondu (on vient de la page de connexion) : attendre la fin.
    await expect.poll(() => chants.evaluate((a) => getComputedStyle(a).backgroundColor)).toBe("rgb(242, 242, 247)");
    expect(await chants.evaluate((a) => getComputedStyle(a).color)).toBe(ENCRE);
  });

  test("中文 : entrées, label et noms des boutons traduits", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const nav = page.getByRole("navigation", { name: "主导航" });
    await expect(nav.getByRole("link")).toHaveText(["诗歌", "歌单", "排班表", "活动", "我"]);
    await expect(barreLaterale(page).getByTestId("label-section")).toHaveText("敬拜");
    const pied = barreLaterale(page).getByTestId("pied-barre");
    await expect(pied.getByRole("button", { name: "账户" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "通知" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "Changer en français" })).toHaveText("中文");
    // N3 : les deux boutons de la barre (中文 à relire par Timothée).
    await barreLaterale(page).getByRole("button", { name: "收起侧边栏" }).click();
    await expect(barreLaterale(page).getByRole("button", { name: "展开侧边栏" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "歌单" })).toHaveAttribute("title", "歌单");
  });
});

// ── N3 : réduire, déplier, s'en souvenir (ordinateur) ─────────────────────────────────────
// Q5 : barre réduite de 68 px, entrées en icônes de 44 px (nom lu par les lecteurs d'écran,
// infobulle au survol), « Déplier » sous les entrées, cloche et initiale en bas. Q6 : le choix
// est retenu par appareil (`localStorage` « barre-laterale »), reflété sur
// `<html data-barre="reduite">` par une ligne de script dans l'en-tête, avant le premier affichage.

const ENTREES_MEMBRE = ["Chants", "Setlists", "Planning", "Évènements", "Moi"];
const reduire = (page: Page) => barreLaterale(page).getByRole("button", { name: "Réduire la barre latérale" });
const deplier = (page: Page) => barreLaterale(page).getByRole("button", { name: "Déplier la barre latérale" });
const largeurBarre = async (page: Page) => Math.round((await barreLaterale(page).boundingBox())!.width);
const paddingGaucheMain = (page: Page) => mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingLeft);
const barreRetenue = (page: Page) => page.evaluate(() => localStorage.getItem("barre-laterale"));
/** Ouvre la page avec la barre déjà réduite sur cet appareil. */
const dejaReduite = (page: Page) => page.addInitScript(() => localStorage.setItem("barre-laterale", "reduite"));

test.describe("navigation sur grand écran (U4) : réduire, déplier, s'en souvenir — ordinateur", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
  });

  test("dépliée par défaut ; « Réduire » : 248 → 68 px, la zone de contenu suit ; icônes de 44 px, nom et infobulle", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    const barre = barreLaterale(page);
    const nav = navigation(page);
    await expect(nav.getByRole("link")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.dataset.barre ?? null), "dépliée par défaut").toBeNull();
    await expect(reduire(page)).toBeVisible();
    await expect(reduire(page), "bouton en icône : son nom en infobulle").toHaveAttribute("title", "Réduire la barre latérale");
    await expect(deplier(page)).toBeHidden();

    const titre = page.getByRole("heading", { level: 1, name: "Chants" });
    const titreDeplie = (await titre.boundingBox())!.x;
    await sansIndicateurDeNext(page);
    await reduire(page).click();
    await expect.poll(() => largeurBarre(page)).toBe(68);
    expect(await pxVar(page, "--barre-laterale")).toBe(68);
    expect(await paddingGaucheMain(page), "la zone de contenu suit").toBe("68px");
    // La page, centrée dans la zone de contenu, se décale de la moitié des 180 px rendus. Chants en
    // deux volets (lot U5) : les volets remplissent la zone (moins de 1 440 px), la liste en
    // tient le bord gauche et se décale des 180 px entiers.
    const deuxVolets = await page.locator(".chants-volets").evaluate((el) => getComputedStyle(el).display === "grid");
    expect(Math.round(titreDeplie - (await titre.boundingBox())!.x), "le titre suit la zone de contenu").toBe(deuxVolets ? 180 : 90);
    expect(Math.round((await page.getByTestId("halo").boundingBox())!.x), "halo au bord de la barre").toBe(68);
    expect(await debordement(page)).toBe(0);
    expect(await barreRetenue(page)).toBe("reduite");

    // Entrées en icônes de 44 × 44, dans la barre ; nom accessible et infobulle ; libellé caché.
    await expect(nav.getByRole("link")).toHaveCount(5);
    for (const nom of ENTREES_MEMBRE) {
      const lien = nav.getByRole("link", { name: nom, exact: true });
      await expect(lien).toHaveAttribute("title", nom);
      await expect(lien.getByText(nom, { exact: true })).toBeHidden();
      const b = (await lien.boundingBox())!;
      expect([Math.round(b.width), Math.round(b.height)], `${nom} : 44 × 44`).toEqual([44, 44]);
      expect(b.x + b.width, `${nom} dans la barre`).toBeLessThanOrEqual(68);
    }
    await expect(nav.getByRole("link", { name: "Chants", exact: true })).toHaveAttribute("aria-current", "page");
    // Ni label, ni langue, ni nom, ni place du sélecteur ; « Déplier » sous les entrées.
    await expect(barre.getByTestId("label-section")).toBeHidden();
    await expect(barre.getByTestId("place-selecteur")).toBeHidden();
    await expect(reduire(page)).toBeHidden();
    await expect(deplier(page)).toBeVisible();
    await expect(deplier(page)).toHaveAttribute("title", "Déplier la barre latérale");
    const d = (await deplier(page).boundingBox())!;
    const moi = (await nav.getByRole("link", { name: "Moi", exact: true }).boundingBox())!;
    expect(d.y, "« Déplier » sous les entrées").toBeGreaterThan(moi.y + moi.height);
    expect([Math.round(d.width), Math.round(d.height)]).toEqual([44, 44]);
    const pied = barre.getByTestId("pied-barre");
    await expect(pied.getByText("Ruth K.")).toBeHidden();
    await expect(pied.getByRole("button", { name: "切换为中文" })).toBeHidden();
    const cloche = (await pied.getByRole("button", { name: "Notifications" }).boundingBox())!;
    const initiale = (await pied.getByRole("button", { name: "Compte" }).boundingBox())!;
    expect(cloche.y + cloche.height, "cloche au-dessus de l'initiale").toBeLessThanOrEqual(initiale.y);
    for (const b of [cloche, initiale]) expect(b.x + b.width).toBeLessThanOrEqual(68);

    // « Déplier » rend la barre, ses libellés en fondu, sans infobulle superflue.
    await deplier(page).click();
    await expect.poll(() => largeurBarre(page)).toBe(248);
    expect(await paddingGaucheMain(page)).toBe("248px");
    expect(await barreRetenue(page)).toBe("depliee");
    await expect(barre.getByTestId("label-section")).toBeVisible();
    const chants = nav.getByRole("link", { name: "Chants", exact: true });
    await expect(chants.getByText("Chants", { exact: true })).toBeVisible();
    expect(await chants.getByText("Chants", { exact: true }).evaluate((el) => getComputedStyle(el).animationName), "libellés en fondu").not.toBe("none");
    expect(await chants.getAttribute("title"), "dépliée, le libellé se lit : pas d'infobulle").toBeNull();
    await expect(pied.getByText("Ruth K.")).toBeVisible();
    await expect(deplier(page)).toBeHidden();
  });

  test("le choix est retenu : rechargée, puis sur une autre page, la barre reste réduite ; dépliée, de même", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await reduire(page).click();
    await expect.poll(() => largeurBarre(page)).toBe(68);
    await page.reload();
    // Avant même l'hydratation : la ligne de script de l'en-tête a posé l'attribut.
    expect(await paddingGaucheMain(page), "rechargée : réduite").toBe("68px");
    expect(await page.evaluate(() => document.documentElement.dataset.barre)).toBe("reduite");
    await page.getByRole("searchbox").waitFor();
    await navigation(page).getByRole("link", { name: "Planning", exact: true }).click();
    await expect(page).toHaveURL(/\/planning\/?$/);
    expect(await largeurBarre(page), "autre page : toujours réduite").toBe(68);
    await deplier(page).click();
    await expect.poll(() => largeurBarre(page)).toBe(248);
    await page.reload();
    expect(await paddingGaucheMain(page), "rechargée : dépliée").toBe("248px");
    expect(await page.evaluate(() => document.documentElement.dataset.barre ?? null)).toBeNull();
  });

  test("premier affichage sans saut : scripts de Next bloqués, la zone est déjà à 68 px", async ({ page }) => {
    await dejaReduite(page);
    // Sans React : seuls le HTML du serveur, le CSS et la ligne de script de l'en-tête jouent.
    await page.route(/\/_next\/static\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto("/songs");
    expect(await page.evaluate(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__react"))), "React n'a pas hydraté").toBe(false);
    expect(await paddingGaucheMain(page)).toBe("68px");
    expect(await largeurBarre(page)).toBe(68);
    expect(await pxVar(page, "--barre-laterale")).toBe(68);
  });

  // Relecture du 05/10/2026 : la navbar, qui n'est plus montrée ici, avait ce test (look-barres) ;
  // la barre latérale prend sa place : fond et halo ne doivent rien attendre de React.
  test("premier affichage sans React : la barre est peinte, le halo part de son bord, dépliée comme réduite", async ({ page }) => {
    await page.route(/\/_next\/.*\.js(\?|$)/, (route) => route.abort());
    await page.goto("/songs");
    expect(await page.evaluate(() => Object.keys(document.querySelector("main")!).some((k) => k.startsWith("__react"))), "React n'a pas hydraté").toBe(false);
    await expect(barreLaterale(page)).toBeVisible();
    expect(await barreLaterale(page).evaluate((el) => getComputedStyle(el).backgroundColor), "fond de la barre").toBe("rgb(247, 247, 248)");
    const halo = page.getByTestId("halo");
    expect(Math.round((await halo.boundingBox())!.x), "dépliée : le halo part de 248 px").toBe(248);
    expect(await halo.evaluate((el) => getComputedStyle(el, "::before").backgroundColor), "le halo a sa couleur").not.toBe("rgba(0, 0, 0, 0)");
    await page.evaluate(() => localStorage.setItem("barre-laterale", "reduite"));
    await page.goto("/songs");
    expect(Math.round((await halo.boundingBox())!.x), "réduite : le halo part de 68 px").toBe(68);
  });

  test("visiteur, barre réduite : langue, thème et « Connexion » en icônes", async ({ page }) => {
    await dejaReduite(page);
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveCount(2);
    expect(await largeurBarre(page)).toBe(68);
    const pied = barreLaterale(page).getByTestId("pied-barre");
    const connexion = pied.getByRole("link", { name: "Connexion" });
    await expect(connexion).toBeVisible();
    await expect(connexion).toHaveAttribute("title", "Connexion");
    await expect(connexion.getByText("Connexion", { exact: true })).toBeHidden();
    for (const bouton of [connexion, pied.getByRole("button", { name: "切换为中文" }), pied.getByRole("button", { name: /Mode (clair|sombre)/ })]) {
      await expect(bouton).toBeVisible();
      const b = (await bouton.boundingBox())!;
      expect(b.x, "dans la barre").toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, "dans la barre").toBeLessThanOrEqual(68);
    }
  });

  test("barre réduite : Tab parcourt le logo, les entrées, « Déplier », puis le pied ; le menu « Compte » s'ouvre à côté", async ({ page }) => {
    await dejaReduite(page);
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveCount(5);
    await barreLaterale(page).getByRole("link").first().focus();
    const ordre: string[] = [];
    for (let i = 0; i < 8; i++) {
      ordre.push(await focusActuel(page));
      await page.keyboard.press("Tab");
    }
    expect(ordre[0]).toMatch(/GCC/);
    expect(ordre.slice(1, 8)).toEqual([...ENTREES_MEMBRE, "Déplier la barre latérale", "Compte"]);
    await sansIndicateurDeNext(page);
    await barreLaterale(page).getByRole("button", { name: "Compte" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Déconnexion" })).toBeVisible();
    expect((await menu.boundingBox())!.x, "à côté de la barre réduite").toBeGreaterThanOrEqual(68);
  });

  test("barre réduite, setlist : en-tête des deux volets et halo au bord de la barre, aucun défilement horizontal, de 1 024 à 1 920 px", async ({ page }) => {
    await dejaReduite(page);
    await ouvrirSetlist(page);
    await barreDeSetlist(page).first().waitFor();
    await animationsFinies(page);
    for (const largeur of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await barreDeSetlistAuBord(page, largeur, 68);
    }
  });

  test("barre réduite, setlist : le sommaire est là dès 1 024 px (956 px utiles à côté de la barre de 68 px)", async ({ page }) => {
    await dejaReduite(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ouvrirSetlist(page);
    await sommaireAGauche(page, 68);
    await page.setViewportSize({ width: 1024, height: 900 });
    await sommaireAGauche(page, 68);
  });

  test("impression, barre réduite : ni barre ni marge", async ({ page }) => {
    await dejaReduite(page);
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.emulateMedia({ media: "print" });
    await expect(barreLaterale(page)).toBeHidden();
    expect(await paddingGaucheMain(page)).toBe("0px");
  });
});

// ── N4 : tablette en paysage ──────────────────────────────────────────────────────────────
// La barre réduite, toujours (décision du 04/10/2026), sans « Réduire » ; ni barre du haut ni
// barre du bas. « Déplier » pose la barre dépliée PAR-DESSUS la page (question 1 : oui), sur un
// voile à 35 % ; elle se referme au choix d'une entrée, sur un toucher du voile, par Échap ou
// « Réduire », et ne retient rien.

const barreParDessus = (page: Page) => page.getByTestId("barre-par-dessus");
const voile = (page: Page) => page.getByTestId("voile-barre");
/** Boîte arrondie, pour comparer au pixel. */
const boite = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return [b.x, b.y, b.width, b.height].map(Math.round);
};
/** Attendre que la barre par-dessus soit arrivée (glissé terminé). */
const barreArrivee = async (page: Page) => {
  await expect(barreParDessus(page)).toBeVisible();
  await animationsFinies(page);
  await expect.poll(async () => Math.round((await barreParDessus(page).boundingBox())!.x)).toBe(0);
};

test.describe("navigation sur grand écran (U4) : tablette en paysage", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estTablettePaysage(info), "tablette en paysage seulement");
  });

  test("tablette en paysage : la barre réduite seule, 68 px, sans « Réduire » ; ni barre du haut ni barre du bas", async ({ page }) => {
    // Même si l'appareil avait retenu « dépliée » : sur la tablette couchée, `data-barre` ne compte pas.
    await page.addInitScript(() => localStorage.setItem("barre-laterale", "depliee"));
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect.poll(() => barresVisibles(page)).toEqual({ haut: false, bas: false, laterale: true });
    expect(await largeurBarre(page)).toBe(68);
    expect(await pxVar(page, "--barre-laterale")).toBe(68);
    expect(await paddingGaucheMain(page), "la page commence au bord de la barre").toBe("68px");
    expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingTop), "plus de barre du haut").toBe("0px");
    expect(await debordement(page)).toBe(0);
    // La cale de la barre du bas part avec elle : rien ne réserve sa place en bas de page.
    expect(await page.getByTestId("barre-du-bas").locator("xpath=preceding-sibling::div[1]").isVisible()).toBe(false);

    const nav = navigation(page);
    await expect(nav.getByRole("link")).toHaveCount(5);
    for (const nom of ENTREES_MEMBRE) {
      const lien = nav.getByRole("link", { name: nom, exact: true });
      await expect(lien.getByText(nom, { exact: true })).toBeHidden();
      expect((await boite(lien)).slice(2), `${nom} : 44 × 44`).toEqual([44, 44]);
    }
    await expect(nav.getByRole("link", { name: "Chants", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(reduire(page), "jamais « Réduire » : elle l'est toujours").toBeHidden();
    await expect(deplier(page)).toBeVisible();
    await expect(barreLaterale(page).getByTestId("label-section")).toBeHidden();
    const pied = barreLaterale(page).getByTestId("pied-barre");
    await expect(pied.getByRole("button", { name: "Notifications" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "Compte" })).toBeVisible();
    await expect(pied.getByText("Ruth K.")).toBeHidden();
  });

  test("tablette en paysage, visiteur : Chants · Évènements, « Connexion », langue et thème en icônes", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveText(["Chants", "Évènements"]);
    expect(await largeurBarre(page)).toBe(68);
    const pied = barreLaterale(page).getByTestId("pied-barre");
    for (const bouton of [pied.getByRole("link", { name: "Connexion" }), pied.getByRole("button", { name: "切换为中文" }), pied.getByRole("button", { name: /Mode (clair|sombre)/ })]) {
      await expect(bouton).toBeVisible();
      const b = (await bouton.boundingBox())!;
      expect(b.x + b.width, "dans la barre").toBeLessThanOrEqual(68);
    }
  });

  test("tablette en paysage : « Déplier » ouvre la barre par-dessus la page, qui ne bouge pas d'un pixel ; « Planning » navigue et referme", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveCount(5);
    await animationsFinies(page);
    // Par CSS, pas par rôle : la barre ouverte, Radix cache la page aux lecteurs d'écran (modale).
    const titre = page.locator("main h1");
    const recherche = page.locator('main input[type="search"]');
    const avant = { titre: await boite(titre), recherche: await boite(recherche), defilement: await page.evaluate(() => window.scrollY) };

    await deplier(page).tap();
    await barreArrivee(page);
    expect(await boite(barreParDessus(page)), "la barre de la planche Main, de haut en bas").toEqual([0, 0, 248, 810]);
    // La page n'a pas bougé : ni décalée, ni mise à l'échelle, ni défilée.
    expect(await boite(titre)).toEqual(avant.titre);
    expect(await boite(recherche)).toEqual(avant.recherche);
    expect(await page.evaluate(() => window.scrollY)).toBe(avant.defilement);
    expect(await paddingGaucheMain(page)).toBe("68px");
    // Le voile à 35 %, sur toute la page.
    await expect(voile(page)).toBeVisible();
    expect(await voile(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0.35)");
    expect(await boite(voile(page))).toEqual([0, 0, 1080, 810]);

    // Dépliée : le label, les libellés, le nom, la langue ; des lignes de 44 px au moins.
    const dessus = barreParDessus(page);
    await expect(dessus.getByTestId("label-section")).toHaveText("Louange");
    const nav = dessus.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("link")).toHaveText(ENTREES_MEMBRE);
    await expect(nav.getByRole("link", { name: "Chants", exact: true })).toHaveAttribute("aria-current", "page");
    for (const nom of ENTREES_MEMBRE) {
      expect((await nav.getByRole("link", { name: nom, exact: true }).boundingBox())!.height, `${nom} : 44 px au moins`).toBeGreaterThanOrEqual(44);
    }
    await expect(dessus.getByRole("button", { name: "Réduire la barre latérale" })).toBeVisible();
    await expect(dessus.getByRole("button", { name: "Déplier la barre latérale" })).toHaveCount(0);
    const pied = dessus.getByTestId("pied-barre");
    await expect(pied.getByText("Ruth K.")).toBeVisible();
    await expect(pied.getByRole("button", { name: "切换为中文" })).toBeVisible();
    await expect(pied.getByRole("button", { name: "Notifications" })).toBeVisible();

    await nav.getByRole("link", { name: "Planning", exact: true }).tap();
    await expect(page).toHaveURL(/\/planning\/?$/);
    await expect(dessus).toHaveCount(0);
    await expect(voile(page)).toHaveCount(0);
    expect(await largeurBarre(page)).toBe(68);
    await expect(navigation(page).getByRole("link", { name: "Planning", exact: true })).toHaveAttribute("aria-current", "page");
    expect(await barreRetenue(page), "ne retient rien").toBeNull();
  });

  test("tablette en paysage : Échap, un toucher du voile et « Réduire » referment la barre, le focus revient sur « Déplier »", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveCount(5);

    await deplier(page).focus();
    await page.keyboard.press("Enter");
    await barreArrivee(page);
    await page.keyboard.press("Escape");
    await expect(barreParDessus(page)).toHaveCount(0);
    expect(await focusActuel(page), "Échap : le focus revient").toBe("Déplier la barre latérale");

    await deplier(page).tap();
    await barreArrivee(page);
    await page.touchscreen.tap(800, 400);
    await expect(barreParDessus(page)).toHaveCount(0);
    expect(await focusActuel(page), "toucher du voile : le focus revient").toBe("Déplier la barre latérale");
    await expect(page, "le toucher n'a rien ouvert dessous").toHaveURL(/\/songs\/?$/);

    await deplier(page).tap();
    await barreArrivee(page);
    await barreParDessus(page).getByRole("button", { name: "Réduire la barre latérale" }).tap();
    await expect(barreParDessus(page)).toHaveCount(0);
    expect(await focusActuel(page), "« Réduire » : le focus revient").toBe("Déplier la barre latérale");
    expect(await largeurBarre(page)).toBe(68);
    expect(await barreRetenue(page), "ne retient rien").toBeNull();
  });

  test("tablette en paysage : on tourne l'iPad, barre ouverte ; debout, barre du haut et barre du bas, la barre par-dessus est partie", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await deplier(page).tap();
    await barreArrivee(page);
    await page.setViewportSize({ width: 810, height: 1080 });
    await expect(barreParDessus(page)).toHaveCount(0);
    await expect.poll(() => barresVisibles(page)).toEqual({ haut: true, bas: true, laterale: false });
    await page.setViewportSize({ width: 1080, height: 810 });
    await expect.poll(() => barresVisibles(page)).toEqual({ haut: false, bas: false, laterale: true });
  });

  test("tablette en paysage, mouvement réduit : la barre arrive en fondu, sans glisser", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await deplier(page).tap();
    await expect(barreParDessus(page)).toBeVisible();
    expect(await barreParDessus(page).evaluate((el) => getComputedStyle(el).animationName)).toBe("barre-fondu");
  });

  test("tablette en paysage, setlist : en-tête des deux volets et halo au bord de la barre, aucun défilement horizontal, iPad de 1 024 à 1 366 px", async ({ page }) => {
    await ouvrirSetlist(page);
    await barreDeSetlist(page).first().waitFor();
    await animationsFinies(page);
    for (const [largeur, hauteur] of [[1024, 768], [1080, 810], [1180, 820], [1366, 1024]]) {
      await page.setViewportSize({ width: largeur, height: hauteur });
      await barreDeSetlistAuBord(page, largeur, 68);
    }
  });

  test("tablette en paysage, setlist : le sommaire est là sur tout iPad couché, de 1 024 à 1 366 px", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 1024 });
    await ouvrirSetlist(page);
    await sommaireAGauche(page, 68);
    await page.setViewportSize({ width: 1024, height: 768 });
    await sommaireAGauche(page, 68);
  });

  test("tablette en paysage, éditeur : la barre d'action commence au bord de la barre et laisse son pied visible", async ({ page }) => {
    await sansSheet(page);
    await signInAs(page, MUSICIEN, {}, "/setlists/new");
    const publier = page.getByRole("button", { name: "Publier" });
    await publier.waitFor();
    await sansIndicateurDeNext(page);
    expect(Math.round((await publier.locator("xpath=../..").boundingBox())!.x)).toBe(68);
    const pied = (await barreLaterale(page).getByTestId("pied-barre").boundingBox())!;
    expect(await auPoint(page, pied.x + pied.width / 2, pied.y + pied.height - 8, '[data-testid="pied-barre"]'), "le pied n'est pas recouvert").toBe(true);
  });

  test("tablette en paysage : impression sans barre ni marge ; zone sûre réservée en haut de la barre", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await page.addStyleTag({ content: ":root { --sat: 24px !important; }" });
    await expect.poll(async () => (await barreLaterale(page).locator("img").first().boundingBox())!.y).toBeGreaterThanOrEqual(24);
    expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingTop), "la page aussi descend sous l'heure").toBe("24px");
    await page.emulateMedia({ media: "print" });
    await expect(barreLaterale(page)).toBeHidden();
    expect(await paddingGaucheMain(page)).toBe("0px");
  });

  test("tablette en paysage, 中文 : « 展开侧边栏 », puis la barre dépliée en 中文", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await barreLaterale(page).getByRole("button", { name: "展开侧边栏" }).tap();
    await barreArrivee(page);
    const dessus = barreParDessus(page);
    await expect(dessus.getByRole("navigation", { name: "主导航" }).getByRole("link")).toHaveText(["诗歌", "歌单", "排班表", "活动", "我"]);
    await expect(dessus.getByTestId("label-section")).toHaveText("敬拜");
    await expect(dessus.getByRole("button", { name: "收起侧边栏" })).toBeVisible();
  });

  // Relecture du 05/10/2026 : la barre par-dessus est une modale (Radix) ; un formulaire ouvert
  // hors d'elle, sous son calque, ne recevait ni toucher ni focus.
  test("tablette en paysage : « Signaler un problème » depuis la barre par-dessus la referme, et le formulaire répond", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveCount(5);
    await deplier(page).tap();
    await barreArrivee(page);
    await sansIndicateurDeNext(page);
    await barreParDessus(page).getByTestId("pied-barre").getByRole("button", { name: "Compte" }).tap();
    await page.getByRole("menuitem", { name: "Signaler un problème" }).tap();
    await expect(barreParDessus(page), "la barre s'efface d'abord").toHaveCount(0);
    await expect(voile(page)).toHaveCount(0);
    // Puis le formulaire, qui répond au toucher et au clavier…
    const resume = page.locator('input[name="title"]');
    await resume.tap();
    await page.keyboard.type("Accord ");
    // … sans que la barre partie lui reprenne le focus (Radix le rend à « Déplier »).
    await animationsFinies(page);
    await page.waitForTimeout(300);
    await page.keyboard.type("faux");
    await expect(resume).toHaveValue("Accord faux");
    await expect(resume).toBeFocused();
    await page.getByRole("button", { name: "Fermer", exact: true }).tap();
    await expect(resume).toHaveCount(0);
    expect(await focusActuel(page), "fermé : le focus revient sur « Déplier »").toBe("Déplier la barre latérale");
  });

  test("tablette en paysage : « Déconnexion » depuis la barre par-dessus la referme", async ({ page }) => {
    await signInAs(page, MEMBRE, {}, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(navigation(page).getByRole("link")).toHaveCount(5);
    await deplier(page).tap();
    await barreArrivee(page);
    await sansIndicateurDeNext(page);
    await barreParDessus(page).getByTestId("pied-barre").getByRole("button", { name: "Compte" }).tap();
    await page.getByRole("menuitem", { name: "Déconnexion" }).tap();
    await expect(barreParDessus(page)).toHaveCount(0);
    await expect(voile(page)).toHaveCount(0);
    await expect(navigation(page).getByRole("link"), "la barre réduite du visiteur").toHaveText(["Chants", "Évènements"]);
    expect(await largeurBarre(page)).toBe(68);
  });
});

// Captures à regarder à l'œil (PW_CAPTURES=<dossier>) : clair et sombre, membre et visiteur.
test("captures de la barre (PW_CAPTURES)", async ({ page }, info) => {
  const dir = process.env.PW_CAPTURES;
  test.skip(!dir, "seulement avec PW_CAPTURES");
  await sansSheet(page);
  // Les entrées arrivent une fois la session connue : chaque capture les attend.
  const entreesArrivees = () => page.getByRole("link", { name: "Évènements" }).filter({ visible: true }).first().waitFor();
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await entreesArrivees();
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-visiteur-${theme}-${info.project.name}.png` });
  }
  await ouvrirSetlist(page);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`/setlists/${SETLIST_ID}`);
    await page.getByTestId("barre-outils").waitFor();
    await entreesArrivees();
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-setlist-${theme}-${info.project.name}.png` });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await entreesArrivees();
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-chants-${theme}-${info.project.name}.png` });
  }
  // N4 : la tablette couchée, barre dépliée par-dessus la setlist.
  if (estTablettePaysage(info)) {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`/setlists/${SETLIST_ID}`);
      await page.getByTestId("barre-outils").waitFor();
      await entreesArrivees();
      await deplier(page).tap();
      await barreArrivee(page);
      await page.screenshot({ path: `${dir}/u4-par-dessus-setlist-${theme}-${info.project.name}.png` });
    }
  }
  // N3 : la barre réduite (ordinateur), sur la setlist comme la planche `ordinateur-barre-reduite`.
  if (!estOrdinateur(info)) return;
  await page.evaluate(() => localStorage.setItem("barre-laterale", "reduite"));
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`/setlists/${SETLIST_ID}`);
    await page.getByTestId("barre-outils").waitFor();
    await entreesArrivees();
    await sansIndicateurDeNext(page);
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-reduite-setlist-${theme}-${info.project.name}.png` });
  }
});
