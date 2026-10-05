import { expect, test, type Page, type TestInfo } from "@playwright/test";
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

  test("Tab parcourt le logo, puis les entrées, puis le pied", async ({ page }) => {
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Les entrées arrivent une fois la session connue (visiteur ici), comme dans la barre du bas.
    await expect(navigation(page).getByRole("link")).toHaveCount(2);
    await barreLaterale(page).getByRole("link").first().focus();
    const ordre: string[] = [];
    for (let i = 0; i < 5; i++) {
      ordre.push(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent || "").trim()));
      await page.keyboard.press("Tab");
    }
    expect(ordre[0]).toMatch(/GCC/);
    expect(ordre.slice(1, 3)).toEqual(["Chants", "Évènements"]);
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

test.describe("navigation sur grand écran (U4) : rien ne passe sous la barre, ordinateur", () => {
  test.beforeEach(({}, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement");
  });

  test("setlist : barre d'outils et halo au bord de la barre, aucun défilement horizontal, de 1 024 à 1 920 px", async ({ page }) => {
    await ouvrirSetlist(page);
    const outils = page.getByTestId("barre-outils");
    await outils.waitFor();
    await animationsFinies(page);
    for (const largeur of [1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      await expect.poll(async () => Math.round((await outils.boundingBox())!.x), `${largeur} px : barre d'outils`).toBe(248);
      expect(Math.round((await outils.boundingBox())!.width), `${largeur} px : jusqu'au bord droit`).toBe(largeur - 248);
      expect(Math.round((await page.getByTestId("halo").boundingBox())!.x), `${largeur} px : halo`).toBe(248);
      expect(await debordement(page), `${largeur} px`).toBe(0);
    }
  });

  test("setlist : le sommaire se cale dans la zone de contenu, et se masque s'il n'y tient pas", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await ouvrirSetlist(page);
    await page.getByRole("button", { name: "Partitions" }).click();
    const sommaire = page.getByRole("navigation", { name: "Déroulé" });
    await expect(sommaire).toBeVisible();
    const s = (await sommaire.boundingBox())!;
    expect(s.x, "jamais sous la barre").toBeGreaterThanOrEqual(248 + 16);
    // Colonne des partitions : 42rem centrés dans la zone de contenu.
    const colonne = 248 + (1920 - 248) / 2 - 336;
    expect(s.x + s.width, "il ne mord pas sur les partitions").toBeLessThanOrEqual(colonne - 16);
    // 1 440 px, barre dépliée : 1 192 px de contenu, moins que les 1 280 px où il tenait avant.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(sommaire).toBeHidden();
  });

  test("setlist : le message (« Partager » une setlist privée) est centré dans la zone de contenu", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ouvrirSetlist(page);
    const outils = page.getByTestId("barre-outils");
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

test.describe("navigation sur grand écran (U4) : dimanche, ordinateur", () => {
  test("« Mode louange » couvre tout l'écran, barre comprise ; en quittant, la barre revient et la page est à sa place", async ({ page }, info) => {
    test.skip(!estOrdinateur(info), "ordinateur seulement (la tablette en paysage vient en N4)");
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await ouvrirSetlist(page);
    const outils = page.getByTestId("barre-outils");
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
    await expect.poll(async () => Math.round((await outils.boundingBox())!.x)).toBe(248);
    expect(await mainDuSite(page).evaluate((m) => getComputedStyle(m).paddingLeft)).toBe("248px");
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
  });
});

// Captures à regarder à l'œil (PW_CAPTURES=<dossier>) : clair et sombre, membre et visiteur.
test("captures de la barre (PW_CAPTURES)", async ({ page }, info) => {
  const dir = process.env.PW_CAPTURES;
  test.skip(!dir, "seulement avec PW_CAPTURES");
  await sansSheet(page);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    // Les entrées arrivent une fois la session connue.
    await page.getByRole("link", { name: "Évènements" }).filter({ visible: true }).first().waitFor();
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-visiteur-${theme}-${info.project.name}.png` });
  }
  await ouvrirSetlist(page);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(`/setlists/${SETLIST_ID}`);
    await page.getByTestId("barre-outils").waitFor();
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-setlist-${theme}-${info.project.name}.png` });
    await page.goto("/songs");
    await page.getByRole("searchbox").waitFor();
    await animationsFinies(page);
    await page.screenshot({ path: `${dir}/u4-chants-${theme}-${info.project.name}.png` });
  }
});
