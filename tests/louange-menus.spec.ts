import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, NOM_MENU, onStage, ouvrirMenu, type Langue, type Menu } from "./helpers/louange";
import { CONTRASTE_MIN, FOND_CLAIR, SURFACE_MENU_CLAIRE, SURFACE_MENU_SOMBRE, TEINTES, contraste, garderContraste, hslVersHex } from "../src/lib/performance/couleurIcones";
import { getTransposedKey } from "../src/lib/transpose";

// Lot FS-B (docs/spec-mode-louange-forscore-2.md) : les menus du mode louange (Setlist, Repères, Outils, Tempo, Options
// d'affichage) : popover sous l'icône à partir de md, feuille du bas au téléphone. Setlist et compte simulés : aucun accès
// au Firestore réel. Noms fictifs.

const SETLIST_ID = "setlist-menus";
const MUSICIEN: FakeProfile = {
  uid: "uid-menus-louange",
  email: "musicien-menus@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});

const setlist = (slugs: string[]) => ({
  title: "Culte d'essai des menus",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-08",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: slugs.map((s, i) => item(s, i + 1)),
});

const FR = ["avec-nous", "abba-pere", "a-l-agneau"];
// Chants chinois sans scan 简谱 (ils ont des sections : Repères existe).
const ZH = ["谢谢你", "活着为要敬拜你", "耶和华所定的日子"];

async function ouvrir(page: Page, opts: { langue?: Langue; theme?: "light" | "dark" } = {}) {
  const { langue = "fr", theme = "light" } = opts;
  await page.addInitScript(([zh, th]) => {
    try {
      if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      // Texte agrandi : plus de pages, donc plus de gestes qui pourraient (à tort) les tourner.
      if (!localStorage.getItem("perf-font-scale")) localStorage.setItem("perf-font-scale", "1.5");
    } catch { /* ignore */ }
  }, [langue === "zh", theme]);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(langue === "zh" ? ZH : FR) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  // La pastille de développement de Next recouvre le coin bas gauche.
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

const telephone = (page: Page) => page.viewportSize()!.width < 768;
const ordinateur = (testInfo: TestInfo) => testInfo.project.name.startsWith("ordinateur");

/** Un toucher : au doigt sur les appareils tactiles, à la souris sinon. */
async function toucher(page: Page, testInfo: TestInfo, x: number, y: number) {
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Écran tactile (pointeur grossier) : un doigt, pas une souris. */
const tactile = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);

/** Points d'un menu où l'élément sous le doigt n'est ni un bouton ni un lien ni un champ : en-tête, titre de rubrique, espace
 *  entre deux lignes. Un point par abscisse demandée (part de la largeur du menu). */
async function pointsInertes(page: Page, boite: { x: number; y: number; width: number; height: number }, parts: number[]) {
  return page.evaluate(({ b, ps }) => {
    const dialogue = document.querySelector("[data-menu-louange]");
    return ps.map((part) => {
      const x = b.x + b.width * part;
      for (let y = b.y + 2; y < b.y + b.height - 2; y += 3) {
        const el = document.elementFromPoint(x, y);
        if (!el || !dialogue?.contains(el)) continue;
        if (!el.closest("button, a, input, [role=radio], [role=slider], [role=switch]")) return { x, y, tag: el.tagName };
      }
      return null;
    });
  }, { b: boite, ps: parts });
}

/** Passe à la page 2 (le clavier ne touche pas à la barre) : de là, un toucher à gauche ou à droite changerait la page. */
async function allerPage2(page: Page) {
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
}

const attendreOuverture = (page: Page) => page.waitForTimeout(500);

const MENUS: Menu[] = ["setlist", "reperes", "outils", "tempo", "options"];

for (const menu of MENUS) {
  test(`${menu} : s'ouvre sous son icône (feuille du bas au téléphone) ; un toucher dedans ne tourne jamais la page`, async ({ page }) => {
    test.skip((menu === "tempo" || menu === "outils") && telephone(page), "au téléphone le tempo et Outils sont en tête de la feuille Options d'affichage (testée sous « options »)");
    await ouvrir(page);
    await allerPage2(page);
    const avant = await lireCompteur(page);
    const dialogue = await ouvrirMenu(page, menu);
    await attendreOuverture(page);
    const nom = NOM_MENU.fr[menu];
    const declencheur = page.locator(`[data-menu-declencheur="${menu}"]`);
    await expect(declencheur).toHaveAttribute("aria-haspopup", "dialog");
    await expect(declencheur).toHaveAttribute("aria-expanded", "true");
    const boite = (await dialogue.boundingBox())!;
    const ecran = page.viewportSize()!;
    if (telephone(page)) {
      expect(boite.y + boite.height, `${nom} : feuille posée en bas`).toBeGreaterThanOrEqual(ecran.height - 2);
      expect(boite.width).toBeGreaterThanOrEqual(ecran.width * 0.95);
    } else {
      const barre = (await page.locator("[data-barre-haut]").boundingBox())!;
      const icone = (await declencheur.boundingBox())!;
      const centre = icone.x + icone.width / 2;
      expect(boite.y, `${nom} : bord haut sous la barre`).toBeGreaterThanOrEqual(barre.y + barre.height - 1);
      expect(boite.x, `${nom} : le menu couvre l'icône (à gauche)`).toBeLessThanOrEqual(centre + 1);
      expect(boite.x + boite.width, `${nom} : le menu couvre l'icône (à droite)`).toBeGreaterThanOrEqual(centre - 1);
      expect(boite.width).toBeLessThanOrEqual(420);
      expect(boite.x).toBeGreaterThanOrEqual(0);
      expect(boite.x + boite.width).toBeLessThanOrEqual(ecran.width);
    }
    // Toucher dans le menu, sur une zone non interactive (en-tête, titre de rubrique, espace entre lignes), à 15 %, 50 % et
    // 85 % de sa largeur : au doigt sur téléphone et tablette, à la souris sur ordinateur.
    const doigt = await tactile(page);
    const points = await pointsInertes(page, boite, [0.15, 0.5, 0.85]);
    for (const [i, part] of [0.15, 0.5, 0.85].entries()) {
      const pt = points[i];
      expect(pt, `${nom} : un point inerte existe à ${part * 100} %`).not.toBeNull();
      if (doigt) await page.touchscreen.tap(pt!.x, pt!.y);
      else await page.mouse.click(pt!.x, pt!.y);
      await page.waitForTimeout(250);
      await expect(dialogue, `${nom} : toujours ouvert après un toucher à ${part * 100} %`).toBeVisible();
      expect(await lireCompteur(page), `${nom} : la page n'a pas tourné (${part * 100} %)`).toBe(avant);
    }
  });

  test(`${menu} : un toucher dehors le ferme sans tourner la page ni masquer la barre ; flèches sans effet ; Échap ferme puis quitte`, async ({ page }, testInfo) => {
    test.skip((menu === "tempo" || menu === "outils") && telephone(page), "au téléphone le tempo et Outils sont en tête de la feuille Options d'affichage (testée sous « options »)");
    await ouvrir(page);
    await allerPage2(page);
    const avant = await lireCompteur(page);
    const ecran = page.viewportSize()!;
    // Dehors : la page (bas de l'écran) ; au téléphone le fond sombre de la feuille, en haut.
    const y = telephone(page) ? ecran.height * 0.02 : ecran.height * 0.88;
    const quitter = page.getByRole("button", { name: "Quitter" });
    for (const part of [0.15, 0.5, 0.85]) {
      const dialogue = await ouvrirMenu(page, menu);
      await attendreOuverture(page);
      // Le popover n'est plus plafonné en hauteur : si le point tombe dessus, on touche plus bas ou à côté de lui.
      const boite = (await dialogue.boundingBox())!;
      const dedans = (px: number, py: number) => px >= boite.x && px <= boite.x + boite.width && py >= boite.y && py <= boite.y + boite.height;
      let px = ecran.width * part, py = y;
      if (!telephone(page) && dedans(px, py)) {
        py = Math.min(ecran.height - 4, boite.y + boite.height + 8);
        if (dedans(px, py) || py > ecran.height - 6) { py = ecran.height * 0.88; px = boite.x > 40 ? boite.x - 12 : boite.x + boite.width + 12; }
      }
      await toucher(page, testInfo, px, py);
      await expect(dialogue, `dehors à ${part * 100} % : le menu se ferme`).toBeHidden();
      await page.waitForTimeout(400);
      expect(await lireCompteur(page), `dehors à ${part * 100} % : la page n'a pas tourné`).toBe(avant);
      await expect(quitter, `dehors à ${part * 100} % : la barre reste`).toBeVisible();
    }
    // Les flèches, PageUp / PageDown et Espace, menu ouvert, ne tournent pas la page.
    const dialogue = await ouvrirMenu(page, menu);
    await attendreOuverture(page);
    for (const touche of ["ArrowRight", "ArrowLeft", "PageDown", "PageUp", "Space"]) await page.keyboard.press(touche);
    await page.waitForTimeout(300);
    expect(await lireCompteur(page)).toBe(avant);
    // Échap ferme le menu seulement ; le second quitte le mode.
    await page.keyboard.press("Escape");
    await expect(dialogue).toBeHidden();
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    expect(await lireCompteur(page)).toBe(avant);
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  });
}

test("un menu ouvert en ferme un autre ; le focus revient au bouton à la fermeture", async ({ page }) => {
  await ouvrir(page);
  if (!telephone(page)) {
    // Au téléphone la feuille et son fond couvrent la barre : on ne passe pas d'un menu à l'autre sans la fermer.
    await ouvrirMenu(page, "setlist");
    await page.locator('[data-menu-declencheur="options"]').click();
    await expect(page.getByRole("dialog", { name: NOM_MENU.fr.options, exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: NOM_MENU.fr.setlist, exact: true })).toHaveCount(0);
  } else {
    await ouvrirMenu(page, "options");
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-menu-declencheur="options"]')).toBeFocused();
});

for (const langue of ["fr", "zh"] as const) {
  test(`Setlist (${langue}) : en-tête, une ligne par chant, chant en cours coché ; un toucher va au 2e chant`, async ({ page }) => {
    await ouvrir(page, { langue });
    const dialogue = await ouvrirMenu(page, "setlist", langue);
    await expect(dialogue.getByText("Culte d'essai des menus")).toBeVisible();
    await expect(dialogue.getByText(langue === "fr" ? /3 chants/ : /3 首/)).toBeVisible();
    await expect(dialogue.getByText(langue === "fr" ? /novembre 2026/ : /2026/)).toBeVisible();
    const lignes = dialogue.locator("li button");
    await expect(lignes).toHaveCount(3);
    await expect(lignes.nth(0)).toHaveAttribute("aria-current", "true");
    await expect(dialogue.locator('[aria-current="true"]')).toHaveCount(1);
    await lignes.nth(1).click();
    await expect(dialogue).toBeHidden();
    await expect(page.locator("[data-barre-haut] p").first()).toContainText(langue === "fr" ? "Abba" : "活着");
    const encore = await ouvrirMenu(page, "setlist", langue);
    await expect(encore.locator("li button").nth(1)).toHaveAttribute("aria-current", "true");
    await expect(encore.locator('[aria-current="true"]')).toHaveCount(1);
  });

  test(`Repères (${langue}) : les sections du chant en cours ; un toucher va à la page de la section`, async ({ page }) => {
    await ouvrir(page, { langue });
    const dialogue = await ouvrirMenu(page, "reperes", langue);
    const lignes = dialogue.locator("li button");
    expect(await lignes.count()).toBeGreaterThanOrEqual(2);
    await expect(dialogue.locator("[data-repere-sigle]").first()).toBeVisible();
    const derniere = lignes.last();
    const page_ = Number((await derniere.innerText()).match(/(\d+)/g)!.pop());
    await derniere.click();
    await expect(dialogue).toBeHidden();
    await expect.poll(() => lireCompteur(page)).toMatch(new RegExp(`^${page_} /`));
  });
}

test("Repères est absent quand le chant courant n'a pas de section (scan 简谱 seul)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(["一生爱你", "abba-pere"]) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Repères" })).toHaveCount(0);
});

test("Outils : + monte d'un demi-ton (barre), « Revenir à X » apparaît puis ramène ; plein écran ; raccourcis", async ({ page }, testInfo) => {
  await ouvrir(page);
  const cleBarre = page.locator("[data-barre-haut] p span.font-mono").first();
  const depart = (await cleBarre.innerText()).trim();
  const attendue = getTransposedKey(depart, 1);
  let outils = await ouvrirMenu(page, "outils");
  await expect(outils.getByRole("button", { name: `Revenir à ${depart}` })).toHaveCount(0);
  await expect(outils.locator("[data-cle-valeur]")).toHaveText(depart);
  await outils.getByRole("button", { name: "Monter d'un demi-ton" }).click();
  await expect(cleBarre).toHaveText(attendue);
  await expect(outils.locator("[data-cle-valeur]")).toHaveText(attendue);
  const revenir = outils.getByRole("button", { name: `Revenir à ${depart}` });
  await expect(revenir).toBeVisible();
  // Comme une tonalité choisie sur la page du chant : retenue pour cette setlist, sur l'appareil.
  expect(await page.evaluate(() => localStorage.getItem("perf-personal-keys"))).toContain(attendue);
  await revenir.click();
  await expect(cleBarre).toHaveText(depart);
  await expect(revenir).toHaveCount(0);
  // − depuis la tonalité de la setlist : « Revenir » apparaît ; + la ramène, sans « Revenir ».
  await outils.getByRole("button", { name: "Baisser d'un demi-ton" }).click();
  await expect(revenir).toHaveCount(1);
  await outils.getByRole("button", { name: "Monter d'un demi-ton" }).click();
  await expect(cleBarre).toHaveText(depart);
  await expect(revenir).toHaveCount(0);

  if (ordinateur(testInfo)) await expect(outils.getByRole("button", { name: "Plein écran" })).toHaveCount(1);
  // Raccourcis : sur ordinateur (pointeur précis) ; absents au téléphone tant qu'aucune touche n'a été frappée.
  if (ordinateur(testInfo)) await expect(outils.locator("[data-raccourcis]")).toBeVisible();
  if (telephone(page)) await expect(outils.locator("[data-raccourcis]")).toHaveCount(0);
  // Au téléphone, Annoter et le tempo sont des lignes d'Outils ; ailleurs ils sont dans la barre.
  if (telephone(page)) {
    await expect(outils.getByRole("button", { name: "Annoter" })).toBeVisible();
    await expect(outils.locator("[data-tempo-plus]")).toBeVisible();
  } else {
    await expect(outils.getByRole("button", { name: "Annoter" })).toHaveCount(0);
    await expect(outils.locator("[data-tempo-plus]")).toHaveCount(0);
  }
  // Au téléphone Outils est la tête de la feuille Options d'affichage : un titre de rubrique « Outils », pas de bouton dans la barre.
  if (telephone(page)) {
    await expect(page.locator('[data-menu-declencheur="outils"]')).toBeHidden();
    await expect(outils.getByText("Outils", { exact: true })).toBeVisible();
    await expect(outils.getByRole("radiogroup", { name: "Couleur des icônes" })).toBeVisible();
  } else {
    outils = page.getByRole("dialog", { name: "Outils" });
    await expect(outils).toBeVisible();
  }
});

test("Tempo : − / +, « Tempo du fichier », métronome visuel (bouton rond on/off)", async ({ page }) => {
  test.skip(telephone(page), "au téléphone le tempo est une ligne d'Outils, en tête d'Options");
  await ouvrir(page);
  const tempo = await ouvrirMenu(page, "tempo");
  await expect(tempo.locator("[data-tempo-valeur]")).toHaveText(/♩\s*94/);
  await expect(tempo.locator("[data-tempo-fichier]")).toHaveCount(0);
  await tempo.locator("[data-tempo-plus]").click();
  await expect(tempo.locator("[data-tempo-valeur]")).toHaveText(/♩\s*95/);
  await expect(tempo.locator("[data-tempo-fichier]")).toHaveCount(1);
  await tempo.locator("[data-tempo-fichier]").click();
  await expect(tempo.locator("[data-tempo-valeur]")).toHaveText(/♩\s*94/);
  const metronome = tempo.getByRole("button", { name: "Métronome visuel" });
  await expect(metronome).toHaveAttribute("aria-pressed", "false");
  await metronome.click();
  await expect(metronome).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-liseret]")).toHaveCount(1);
});

test("Métronome visuel : un bouton rond allumé / éteint dans Options aussi (plus de segmenté Activé / Désactivé)", async ({ page }) => {
  await ouvrir(page);
  const options = await ouvrirMenu(page, "options");
  await expect(options.getByText("Activé", { exact: true })).toHaveCount(0);
  const metronome = options.getByRole("button", { name: "Métronome visuel" });
  await expect(metronome).toHaveCount(1);
  await expect(metronome).toHaveAttribute("aria-pressed", "false");
  await metronome.click();
  await expect(metronome).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-liseret]")).toHaveCount(1);
});

test("Options : bouton rond Accords (aria-pressed) bascule les accords ; ronds d'au moins 44 px", async ({ page }) => {
  await ouvrir(page);
  await expect(onStage(page, ".font-chord").first()).toBeVisible();
  const options = await ouvrirMenu(page, "options");
  const accords = options.getByRole("button", { name: "Accords", exact: true });
  await expect(accords).toHaveAttribute("aria-pressed", "true");
  for (const rond of await options.locator("[aria-pressed]").all()) {
    const b = (await rond.boundingBox())!;
    if (b) expect(b.height).toBeGreaterThanOrEqual(43.5);
  }
  await accords.click();
  await expect(accords).toHaveAttribute("aria-pressed", "false");
  // Menu fermé : au téléphone la feuille modale cache la page aux lecteurs d'écran (aria-hidden), `onStage` l'exclurait.
  await page.keyboard.press("Escape");
  await expect(options).toBeHidden();
  await expect(onStage(page, ".font-chord")).toHaveCount(0);
  const encore = await ouvrirMenu(page, "options");
  await encore.getByRole("button", { name: "Accords", exact: true }).click();
  await expect(encore.getByRole("button", { name: "Accords", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(encore).toBeHidden();
  await expect(onStage(page, ".font-chord").first()).toBeVisible({ timeout: 15_000 });
});

test("stylet : un toucher au stylet hors du menu ne laisse pas le menu avaler le toucher du doigt qui suit", async ({ page }) => {
  await ouvrir(page);
  await allerPage2(page);
  const ecran = page.viewportSize()!;
  const dialogue = await ouvrirMenu(page, "setlist");
  await attendreOuverture(page);
  // Le stylet touche la page (hors du menu) : évènements de pointeur de type « pen », sans clic.
  await page.evaluate(({ x, y }) => {
    const cible = document.elementFromPoint(x, y) ?? document.body;
    const init = { bubbles: true, cancelable: true, composed: true, pointerType: "pen", pointerId: 7, isPrimary: true, clientX: x, clientY: y, button: 0, buttons: 1 };
    cible.dispatchEvent(new PointerEvent("pointerdown", init));
    cible.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
  }, { x: ecran.width * 0.5, y: telephone(page) ? ecran.height * 0.02 : ecran.height * 0.88 });
  await expect(dialogue).toBeHidden();
  await page.waitForTimeout(400);
  const avant = await lireCompteur(page);
  // Un doigt (ou la souris) sur la zone de droite : la page tourne, un seul toucher suffit.
  const x = ecran.width * 0.95, y = ecran.height * 0.5;
  if (await tactile(page)) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
  await expect.poll(() => lireCompteur(page)).not.toBe(avant);
});

test("plein écran : le bouton suit document.fullscreenElement (allumé en plein écran, éteint après en être sorti)", async ({ page }) => {
  await ouvrir(page);
  const outils = await ouvrirMenu(page, "outils");
  const plein = outils.locator("[data-plein-ecran]");
  await expect(plein).toHaveCount(1);
  // Ouvrir le mode louange demande le plein écran : l'état affiché est celui du document, jamais l'inverse.
  const enPleinEcran = await page.evaluate(() => document.fullscreenElement !== null);
  await expect(plein).toHaveAttribute("aria-pressed", String(enPleinEcran));
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(plein).toHaveAttribute("aria-pressed", "false");
  // Menu fermé puis rouvert : toujours éteint, le document n'est plus en plein écran.
  await page.keyboard.press("Escape");
  await expect(outils).toBeHidden();
  const encore = await ouvrirMenu(page, "outils");
  await expect(encore.locator("[data-plein-ecran]")).toHaveAttribute("aria-pressed", "false");
});

test("raccourcis clavier : absents au téléphone et sur tablette sans frappe (Échap n'y change rien), visibles après une frappe", async ({ page }, testInfo) => {
  test.skip(ordinateur(testInfo), "sur ordinateur (pointeur précis) les raccourcis sont toujours affichés");
  await ouvrir(page);
  // Aucune touche frappée avant : le menu s'ouvre sans raccourcis.
  const outils = await ouvrirMenu(page, "outils");
  await expect(outils.locator("[data-raccourcis]")).toHaveCount(0);
  // Échap (ferme le menu) n'allume pas le clavier.
  await page.keyboard.press("Escape");
  await expect(outils).toBeHidden();
  const encore = await ouvrirMenu(page, "outils");
  await expect(encore.locator("[data-raccourcis]")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(encore).toBeHidden();
  // Une touche de navigation les fait apparaître.
  await page.keyboard.press("ArrowRight");
  const enfin = await ouvrirMenu(page, "outils");
  await expect(enfin.locator("[data-raccourcis]")).toBeVisible();
  for (const kbd of await enfin.locator("[data-raccourcis] kbd").all()) expect((await kbd.innerText()).includes("·")).toBe(false);
  expect(await enfin.locator("[data-raccourcis] kbd").count()).toBeGreaterThanOrEqual(5);
});

test("Setlist et Repères : la ligne en cours est teintée (couleur des icônes à 12 %) et porte aria-current", async ({ page }) => {
  await ouvrir(page);
  await page.mouse.move(0, 0);
  const setlist = await ouvrirMenu(page, "setlist");
  await attendreOuverture(page);
  const fonds = await setlist.locator("li button").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
  const transparent = "rgba(0, 0, 0, 0)";
  expect(fonds[0], "chant en cours teinté").not.toBe(transparent);
  expect(fonds[1], "autre chant non teinté").toBe(transparent);
  await expect(setlist.locator('[aria-current="true"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(setlist).toBeHidden();

  const reperes = await ouvrirMenu(page, "reperes");
  await attendreOuverture(page);
  const lignes = reperes.locator("li button");
  await expect(reperes.locator('[aria-current="true"]')).toHaveCount(1);
  await expect(lignes.first()).toHaveAttribute("aria-current", "true");
  const f = await lignes.evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
  expect(f[0], "section en cours teintée").not.toBe(transparent);
  expect(f[f.length - 1], "autre section non teintée").toBe(transparent);
  // Aller à la dernière section : c'est elle (ou la première de sa page) qui devient la section en cours.
  await lignes.last().click();
  await expect(reperes).toBeHidden();
  const apres = await ouvrirMenu(page, "reperes");
  await attendreOuverture(page);
  await expect(apres.locator('[aria-current="true"]')).toHaveCount(1);
  const pages = await apres.locator("li button").evaluateAll((els) => els.map((el) => Number(el.textContent!.match(/(\d+)\s*$/)![1])));
  const courant = await apres.locator("li button").evaluateAll((els) => els.findIndex((el) => el.getAttribute("aria-current") === "true"));
  expect(courant).toBe(pages.indexOf(pages[pages.length - 1]));
});

test("Options : aucune 2e ligne d'un seul élément (ronds « Sur la page » et pastilles de couleur)", async ({ page }) => {
  await ouvrir(page);
  const options = await ouvrirMenu(page, "options");
  await attendreOuverture(page);
  const lignes = async (selecteur: string) => {
    const ys = await options.locator(selecteur).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
    const parLigne = new Map<number, number>();
    for (const y of ys) {
      const cle = [...parLigne.keys()].find((k) => Math.abs(k - y) <= 4) ?? y;
      parLigne.set(cle, (parLigne.get(cle) ?? 0) + 1);
    }
    return [...parLigne.values()];
  };
  const ronds = await lignes('[role=group][aria-labelledby="perf-sur-page"] > button');
  expect(ronds.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(4);
  if (ronds.length > 1) for (const n of ronds) expect(n, `ronds par ligne : ${ronds}`).toBeGreaterThanOrEqual(2);
  if (!telephone(page)) expect(ronds, "tous les ronds sur une ligne dans le popover").toHaveLength(1);
  const pastilles = await lignes('[role=radiogroup][aria-labelledby="perf-couleur-icones"] > button');
  expect(pastilles, `pastilles : ${pastilles}`).toEqual([7]);
  // Le popover garde sa largeur d'environ 26 rem et n'est pas plafonné en hauteur à 34 rem.
  if (!telephone(page)) {
    const boite = (await options.boundingBox())!;
    expect(boite.width).toBeGreaterThan(400);
  }
});

test("palette : framboise retenue après rechargement, et les actions des menus prennent la couleur corrigée (décision 23)", async ({ page }) => {
  await ouvrir(page);
  const attendue = `rgb(${[1, 3, 5].map((i) => parseInt(garderContraste("#c2185b", FOND_CLAIR).slice(i, i + 2), 16)).join(", ")})`;
  let options = await ouvrirMenu(page, "options");
  await options.getByRole("radiogroup", { name: "Couleur des icônes" }).getByRole("radio", { name: "Framboise" }).click();
  await page.keyboard.press("Escape");
  await expect(options).toBeHidden();
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  options = await ouvrirMenu(page, "options");
  await expect(options.getByRole("radiogroup", { name: "Couleur des icônes" }).getByRole("radio", { name: "Framboise" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(options).toBeHidden();
  const outils = await ouvrirMenu(page, "outils");
  const plus = outils.locator("[data-cle-plus]");
  await expect(plus).toBeVisible();
  expect(await plus.evaluate((el) => getComputedStyle(el).color)).toBe(attendue);
});

// Correction 1 de la relecture FS-A/FS-B : dans les menus, la couleur est corrigée contre la SURFACE du menu (#ffffff en clair,
// #1c1c1e en sombre), pas contre le fond de la barre (#000 en sombre) : le texte coloré y descendait à ~3,7:1.

test("garderContraste contre la surface des menus : au moins 4,5:1 pour les six teintes et une couleur sombre du cercle, en clair et en sombre", () => {
  const cercle = hslVersHex(240, 70, 20);
  for (const surface of [SURFACE_MENU_CLAIRE, SURFACE_MENU_SOMBRE]) {
    for (const hex of [...TEINTES.map((t) => t.hex), cercle]) {
      expect(contraste(garderContraste(hex, surface), surface), `${hex} sur ${surface}`).toBeGreaterThanOrEqual(CONTRASTE_MIN);
    }
  }
});

const rvb = (css: string) => (css.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
const versHex = (c: number[]) => `#${c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")}`;

const CHOIX: Array<[string, string]> = [...TEINTES.map((t): [string, string] => [t.id, t.hex]), ["cercle 240°, sombre", hslVersHex(240, 70, 20)]];
for (const theme of ["light", "dark"] as const) {
  for (const [nom, hex] of CHOIX) {
    test(`menus (${theme}) : l'action « ${nom} » contraste au moins 4,5:1 avec la surface du menu, mesuré à l'écran`, async ({ page }) => {
      await page.addInitScript((h) => { try { localStorage.setItem("perf-couleur-icones", h); } catch { /* ignore */ } }, hex);
      await ouvrir(page, { theme });
      const outils = await ouvrirMenu(page, "outils");
      const plus = outils.locator("[data-cle-plus]");
      await expect(plus).toBeVisible();
      await attendreOuverture(page);
      const [texte, surface] = await Promise.all([
        plus.evaluate((el) => getComputedStyle(el).color),
        outils.evaluate((el) => getComputedStyle(el).backgroundColor),
      ]);
      expect(contraste(versHex(rvb(texte)), versHex(rvb(surface))), `${texte} sur ${surface}`).toBeGreaterThanOrEqual(CONTRASTE_MIN);
    });
  }
}

// ─── Captures à regarder (test-results/fs-b/) ─────────────────────────────────

const SORTIE = "test-results/fs-b";
for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`captures FS-B : chaque menu ouvert, ${langue}, ${theme}`, async ({ page }, testInfo) => {
      await ouvrir(page, { langue, theme });
      for (const menu of MENUS) {
        if ((menu === "tempo" || menu === "outils") && telephone(page)) continue;
        const dialogue = await ouvrirMenu(page, menu, langue);
        await attendreOuverture(page);
        await page.screenshot({ path: `${SORTIE}/menu-${menu}-${langue}-${theme}-${testInfo.project.name}.png` });
        await page.keyboard.press("Escape");
        await expect(dialogue).toBeHidden();
      }
    });
  }
}
