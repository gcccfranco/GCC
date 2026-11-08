import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, NOM_MENU, onStage, ouvrirMenu, type Langue, type Menu } from "./helpers/louange";
import { FOND_CLAIR, garderContraste } from "../src/lib/performance/couleurIcones";
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

/** Passe à la page 2 (le clavier ne touche pas à la barre) : de là, un toucher à gauche ou à droite changerait la page. */
async function allerPage2(page: Page) {
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
}

const attendreOuverture = (page: Page) => page.waitForTimeout(500);

const MENUS: Menu[] = ["setlist", "reperes", "outils", "tempo", "options"];

for (const menu of MENUS) {
  test(`${menu} : s'ouvre sous son icône (feuille du bas au téléphone) ; un toucher dedans ne tourne jamais la page`, async ({ page }, testInfo) => {
    test.skip(menu === "tempo" && telephone(page), "au téléphone le tempo est une ligne du menu Outils");
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
      expect(boite.width).toBeLessThanOrEqual(400);
      expect(boite.x).toBeGreaterThanOrEqual(0);
      expect(boite.x + boite.width).toBeLessThanOrEqual(ecran.width);
    }
    // Toucher dans le menu, sur un fond sans bouton (le haut), à 15 %, 50 % et 85 % de sa largeur. À la souris : un doigt
    // est « aimanté » par Chrome vers le bouton le plus proche (une ligne de Repères), qui irait à sa page.
    for (const part of [0.15, 0.5, 0.85]) {
      await page.mouse.click(boite.x + boite.width * part, boite.y + 4);
      await page.waitForTimeout(250);
      await expect(dialogue, `${nom} : toujours ouvert après un toucher à ${part * 100} %`).toBeVisible();
      expect(await lireCompteur(page), `${nom} : la page n'a pas tourné (${part * 100} %)`).toBe(avant);
    }
  });

  test(`${menu} : un toucher dehors le ferme sans tourner la page ni masquer la barre ; flèches sans effet ; Échap ferme puis quitte`, async ({ page }, testInfo) => {
    test.skip(menu === "tempo" && telephone(page), "au téléphone le tempo est une ligne du menu Outils");
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
      await toucher(page, testInfo, ecran.width * part, y);
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
  outils = page.getByRole("dialog", { name: "Outils" });
  await expect(outils).toBeVisible();
});

test("Tempo : − / +, « Tempo du fichier », métronome visuel (bouton rond on/off)", async ({ page }) => {
  test.skip(telephone(page), "au téléphone le tempo est une ligne du menu Outils");
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

// ─── Captures à regarder (test-results/fs-b/) ─────────────────────────────────

const SORTIE = "test-results/fs-b";
for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`captures FS-B : chaque menu ouvert, ${langue}, ${theme}`, async ({ page }, testInfo) => {
      await ouvrir(page, { langue, theme });
      for (const menu of MENUS) {
        if (menu === "tempo" && telephone(page)) continue;
        const dialogue = await ouvrirMenu(page, menu, langue);
        await attendreOuverture(page);
        await page.screenshot({ path: `${SORTIE}/menu-${menu}-${langue}-${theme}-${testInfo.project.name}.png` });
        await page.keyboard.press("Escape");
        await expect(dialogue).toBeHidden();
      }
    });
  }
}
