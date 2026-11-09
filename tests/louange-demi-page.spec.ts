import { mkdirSync } from "node:fs";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, basculerAnnoter, lireCompteur, onStage, ouvrirOptions, type Langue } from "./helpers/louange";

// Lot FS-E (docs/spec-mode-louange-forscore-2.md) : la demi-page du mode louange. Réglage retenu par appareil, un tour de page
// avance d'une demi-page (le haut de la page suivante au-dessus du filet, la fin de la page en cours dessous), la coupe tombe
// entre deux blocs, la poignée règle la proportion. Setlist et compte simulés : aucun accès au Firestore réel. Noms fictifs.

const SETLIST_ID = "setlist-demi-page";
const MUSICIEN: FakeProfile = {
  uid: "uid-demi-page",
  email: "musicien-demi-page@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});

const setlist = (slugs: string[], structure: string[] | null = null) => ({
  title: "Culte d'essai de la demi-page",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-09",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: slugs.map((s, i) => ({ ...item(s, i + 1), structureOverride: i === 0 ? structure : null })),
});

const FR = ["avec-nous", "abba-pere", "a-l-agneau"];
const ZH = ["谢谢你", "活着为要敬拜你", "耶和华所定的日子"];
// Un chant à scan 简谱 (deux pages de scan) : la demi-page ne s'y applique pas.
const SCAN = ["为我而来"];

async function ouvrir(page: Page, opts: { slugs?: string[]; langue?: Langue; theme?: "light" | "dark"; demi?: boolean; structure?: string[] } = {}) {
  const { slugs, langue = "fr", theme = "light", demi = true, structure } = opts;
  await page.addInitScript(([zh, th, d]) => {
    try {
      if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      if (!localStorage.getItem("perf-font-scale")) localStorage.setItem("perf-font-scale", "1");
      if (d && !sessionStorage.getItem("demi-init")) {
        sessionStorage.setItem("demi-init", "1");
        localStorage.setItem("perf-demi-page", "1");
      }
    } catch { /* ignore */ }
  }, [langue === "zh", theme, demi]);
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(slugs ?? (langue === "zh" ? ZH : FR), structure) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-barre-haut]")).toBeVisible();
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  return db;
}

const racine = (page: Page) => page.locator("[data-performance-mode]");
const enDemi = (page: Page) => page.locator("[data-performance-mode][data-demi-page]");
const filet = (page: Page) => page.locator("[data-performance-mode] [data-demi-filet]");
const poignee = (page: Page) => page.locator("[data-performance-mode] [data-demi-poignee]");
const PREMIER_BLOC = ":is([data-entete-chant], [data-col-page] > *)";
const normaliser = (t: string | null) => (t ?? "").replace(/\s+/g, " ").trim();

async function toucher(page: Page, testInfo: TestInfo, x: number, y: number) {
  if (testInfo.project.use.hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
/** Tour avant ou arrière : un toucher à 85 % ou 15 % de la largeur, ou la flèche. */
async function tourner(page: Page, testInfo: TestInfo, sens: 1 | -1, par: "toucher" | "fleche") {
  if (par === "fleche") {
    await page.keyboard.press(sens === 1 ? "ArrowRight" : "ArrowLeft");
    return;
  }
  const e = page.viewportSize()!;
  await toucher(page, testInfo, e.width * (sens === 1 ? 0.85 : 0.15), e.height * 0.5);
}
const textePremierBloc = async (page: Page) => normaliser(await onStage(page, PREMIER_BLOC).first().textContent());

/** Mesures de l'état demi : filet, et ce que chaque calque laisse voir de part et d'autre (lignes et sections entières). */
async function mesurer(page: Page) {
  return page.evaluate(() => {
    const haut = document.querySelector<HTMLElement>("[data-performance-mode] [data-demi-haut]")!;
    const bas = document.querySelector<HTMLElement>("[data-performance-mode] [data-demi-bas]")!;
    const f = document.querySelector<HTMLElement>("[data-performance-mode] [data-demi-filet]")!.getBoundingClientRect();
    const yCoupe = f.top + f.height / 2;
    // Chaque calque porte ses zones visibles (rectangles écran, une par colonne) : une ligne se voit si elle rencontre une zone,
    // et elle est « tranchée » si elle n'y tient pas entière ou si elle passe de l'autre côté du filet.
    const zones = (c: HTMLElement) => JSON.parse(c.dataset.demiZones ?? "[]") as Array<[number, number, number, number]>;
    // Rangées de paroles et d'accords : jamais coupées. Une section plus haute que la part est coupée entre deux lignes (repli décidé).
    const SEL = "[data-copy-line], [data-coupe], [data-feuille-route-ligne]";
    const lire = (c: HTMLElement) => {
      const zs = zones(c);
      // Une ligne coupée en plusieurs rangées se tranche entre deux rangées : l'unité est la rangée.
      const unites = Array.from(c.querySelectorAll(SEL)).flatMap((l) => {
        const r = l.querySelectorAll("[data-rangee]");
        return r.length > 0 ? Array.from(r) : [l];
      });
      return unites.map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 1)
        .map((r) => {
          const z = zs.find(([x0, y0, x1, y1]) => r.left < x1 - 1 && r.right > x0 + 1 && r.top < y1 - 1 && r.bottom > y0 + 1);
          if (!z) return null;
          return { top: r.top, bottom: r.bottom, entiere: r.top >= z[1] - 1 && r.bottom <= z[3] + 1 };
        })
        .filter((r): r is { top: number; bottom: number; entiere: boolean } => r !== null);
    };
    const visiblesHaut = lire(haut);
    const visiblesBas = lire(bas);
    // Rangées de la page en cours (calque bas) : celles qui sont sous le filet doivent toutes se voir, et le blanc entre le filet
    // et la reprise ne dépasse pas la plus haute rangée (le rappel du nom de section s'y loge).
    const rangees = Array.from(bas.querySelectorAll("[data-copy-line]"), (l) => {
      const r = l.querySelectorAll("[data-rangee]");
      return r.length > 0 ? Array.from(r) : [l];
    }).flat().map((el) => el.getBoundingClientRect()).filter((r) => r.height > 1);
    const zonesBas = zones(bas);
    const sous = rangees.filter((r) => r.top >= yCoupe - 1);
    const dansZone = (r: DOMRect) => zonesBas.some(([x0, y0, x1, y1]) => r.left < x1 - 1 && r.right > x0 + 1 && r.top >= y0 - 1 && r.bottom <= y1 + 1);
    const blanc = zonesBas.length ? Math.max(...zonesBas.map(([, y0]) => y0 - yCoupe)) : 0;
    return {
      yCoupe, hauteurFenetre: window.innerHeight,
      haut: { visibles: visiblesHaut.length, tranches: visiblesHaut.filter((r) => !r.entiere || r.bottom > yCoupe + 1).length },
      bas: { visibles: visiblesBas.length, tranches: visiblesBas.filter((r) => !r.entiere || r.top < yCoupe - 1).length },
      sousCoupe: sous.length,
      sousCoupeInvisibles: sous.filter((r) => !dansZone(r)).length,
      blanc,
      rangeeMax: rangees.length ? Math.max(...rangees.map((r) => r.height)) : 0,
      rappel: bas.parentElement!.querySelectorAll("[data-demi-rappel]").length,
    };
  });
}

const TRAIT = (w: number, h: number) =>
  JSON.stringify({ w, h, strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, h * 0.5], [w * 0.5, h * 0.5]] }] });

for (const par of ["toucher", "fleche"] as const) {
  test(`demi-page : tour avant (${par}) = haut de la page 2 au-dessus du filet, fin de la page 1 dessous ; second tour = page 2 entière ; retour symétrique`, async ({ page }, testInfo) => {
    await ouvrir(page);
    await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
    const total = (await lireCompteur(page)).split("/")[1].trim();
    expect(Number(total)).toBeGreaterThan(1);
    const blocsPage1 = (await onStage(page, PREMIER_BLOC).allTextContents()).map(normaliser);

    await tourner(page, testInfo, 1, par);
    await expect(enDemi(page)).toHaveCount(1);
    await expect(filet(page)).toBeVisible();
    // Le curseur et sa rangée comptent des pages entières : toujours la page 1.
    expect(await lireCompteur(page)).toBe(`1 / ${total}`);
    const premierHaut = normaliser(await page.locator("[data-performance-mode] [data-demi-haut]").locator(PREMIER_BLOC).first().textContent());
    expect(premierHaut.length).toBeGreaterThan(3);
    const m = await mesurer(page);
    // Au-dessus du filet : le premier bloc de la page 2 ; dessous : la fin de la page 1.
    expect(m.haut.visibles).toBeGreaterThan(0);
    expect(m.haut.tranches, "aucune ligne ni section du haut ne passe sous le filet").toBe(0);
    expect(m.bas.tranches, "aucune ligne ni section du bas ne passe au-dessus du filet").toBe(0);
    expect(m.sousCoupeInvisibles, "chaque rangée de la page 1 sous le filet se voit dans la moitié basse").toBe(0);
    expect(m.blanc, "le blanc sous le filet ne dépasse pas une rangée (le rappel de section s'y loge)").toBeLessThanOrEqual(m.rangeeMax + (m.rappel > 0 ? 18 : 0) + 1);
    expect(m.yCoupe).toBeGreaterThan(m.hauteurFenetre * 0.2);
    expect(m.yCoupe).toBeLessThan(m.hauteurFenetre * 0.8);
    if (m.bas.visibles > 0) {
      const premierBas = normaliser(await page.locator("[data-performance-mode] [data-demi-bas]").locator(PREMIER_BLOC).evaluateAll((els, y) => {
        const e = els.find((el) => el.getBoundingClientRect().top >= (y as number) - 1);
        return e ? e.textContent : "";
      }, m.yCoupe));
      expect(blocsPage1, "la moitié basse montre la page 1").toContain(premierBas);
    }

    await tourner(page, testInfo, 1, par);
    await expect(enDemi(page)).toHaveCount(0);
    await expect.poll(() => lireCompteur(page)).toBe(`2 / ${total}`);
    await expect(filet(page)).toHaveCount(0);
    expect(await textePremierBloc(page), "la page 2 entière commence par ce que montrait le haut").toBe(premierHaut);

    // Retour : page 2 entière → (page 1, demi) → page 1 entière.
    await tourner(page, testInfo, -1, par);
    await expect(enDemi(page)).toHaveCount(1);
    expect(await lireCompteur(page)).toBe(`1 / ${total}`);
    await tourner(page, testInfo, -1, par);
    await expect(enDemi(page)).toHaveCount(0);
    await expect.poll(() => lireCompteur(page)).toBe(`1 / ${total}`);
    expect((await onStage(page, PREMIER_BLOC).allTextContents()).map(normaliser)).toEqual(blocsPage1);
  });
}

test("demi-page : l'interrupteur « Demi-page » est dans Options d'affichage, coupé par défaut, et retenu après rechargement", async ({ page }) => {
  await ouvrir(page, { demi: false });
  const options = await ouvrirOptions(page);
  const bouton = options.getByRole("button", { name: "Demi-page", exact: true });
  await expect(bouton).toHaveAttribute("aria-pressed", "false");
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => localStorage.getItem("perf-demi-page"))).toBe("1");

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  const options2 = await ouvrirOptions(page);
  await expect(options2.getByRole("button", { name: "Demi-page", exact: true })).toHaveAttribute("aria-pressed", "true");
  await options2.getByRole("button", { name: "Demi-page", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("perf-demi-page"))).toBe("0");
});

test("demi-page : coupée, un tour de page est un tour entier", async ({ page }, testInfo) => {
  await ouvrir(page, { demi: false });
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \//);
  await tourner(page, testInfo, 1, "fleche");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
  await expect(enDemi(page)).toHaveCount(0);
  await expect(filet(page)).toHaveCount(0);
});

test("demi-page : la poignée (glisser, flèches) règle la coupe, retenue ; elle porte le nom « Demi-page »", async ({ page }, testInfo) => {
  await ouvrir(page);
  await tourner(page, testInfo, 1, "fleche");
  await expect(enDemi(page)).toHaveCount(1);
  const p = poignee(page);
  await expect(p).toHaveAttribute("role", "slider");
  await expect(p).toHaveAttribute("aria-label", "Demi-page");
  await expect(p).toHaveAttribute("aria-valuenow", "50");
  const cible = await p.boundingBox();
  expect(cible!.width).toBeGreaterThanOrEqual(43);
  expect(cible!.height).toBeGreaterThanOrEqual(43);

  const avant = (await mesurer(page)).yCoupe;
  const h = page.viewportSize()!.height;
  const x = cible!.x + cible!.width / 2;
  const y = cible!.y + cible!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, h * 0.4, { steps: 8 });
  await page.mouse.move(x, h * 0.3, { steps: 8 });
  await page.mouse.up();
  await expect(enDemi(page), "glisser la poignée ne tourne pas la page").toHaveCount(1);
  expect(await lireCompteur(page)).toMatch(/^1 \//);
  await expect(p).toHaveAttribute("aria-valuenow", /^(29|30|31)$/);
  const part = Number(await page.evaluate(() => localStorage.getItem("perf-demi-page-part")));
  expect(part).toBeGreaterThan(0.28);
  expect(part).toBeLessThan(0.32);
  const apres = await mesurer(page);
  expect(apres.yCoupe, "la coupe monte avec la poignée").toBeLessThanOrEqual(avant + 1);
  expect(apres.haut.tranches).toBe(0);
  expect(apres.bas.tranches).toBe(0);

  // Au clavier : ↓ de 5 %, bornée à 75 %.
  await p.focus();
  await page.keyboard.press("ArrowDown");
  await expect(p).toHaveAttribute("aria-valuenow", /^(34|35|36)$/);
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowDown");
  await expect(p).toHaveAttribute("aria-valuenow", "75");
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowUp");
  await expect(p).toHaveAttribute("aria-valuenow", "25");
  expect(await lireCompteur(page), "les flèches de la poignée ne tournent pas la page").toMatch(/^1 \//);
  expect(Number(await page.evaluate(() => localStorage.getItem("perf-demi-page-part")))).toBeCloseTo(0.25, 2);
});

test("demi-page : sur un chant à scan 简谱, le tour est normal", async ({ page }, testInfo) => {
  await ouvrir(page, { slugs: SCAN });
  await expect(page.locator("[data-performance-mode] [data-jianpu-page] img").first()).toBeVisible();
  const total = Number((await lireCompteur(page)).split("/")[1]);
  expect(total).toBeGreaterThan(1);
  await tourner(page, testInfo, 1, "fleche");
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
  await expect(enDemi(page)).toHaveCount(0);
  await expect(filet(page)).toHaveCount(0);
});

test("demi-page : « Annoter » remet la page entière", async ({ page }, testInfo) => {
  await ouvrir(page);
  await tourner(page, testInfo, 1, "fleche");
  await expect(enDemi(page)).toHaveCount(1);
  await basculerAnnoter(page);
  await expect(enDemi(page)).toHaveCount(0);
  await expect(filet(page)).toHaveCount(0);
  expect(await lireCompteur(page)).toMatch(/^1 \//);
  await basculerAnnoter(page);
  // Sortie de l'annotation : page entière, pas de demi-page tant qu'on n'a pas tourné.
  await expect(enDemi(page)).toHaveCount(0);
});

test("demi-page : tablette portrait, l'aperçu de la page suivante (L6) est présent demi-page coupée, absent allumée", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "l'aperçu n'existe qu'en tablette portrait");
  await ouvrir(page, { demi: false });
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  await expect(onStage(page, "[data-apercu-suivant]")).toHaveCount(1);
  const options = await ouvrirOptions(page);
  await options.getByRole("button", { name: "Demi-page", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(onStage(page, "[data-apercu-suivant]")).toHaveCount(0);
});

test("demi-page : deux tours rapprochés (pédale qui répète) passent de la page 1 à la page 2 entière", async ({ page }) => {
  await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const total = (await lireCompteur(page)).split("/")[1].trim();
  // Deux touches dans le même instant, sans attendre le rendu du premier tour.
  await page.evaluate(() => {
    for (let i = 0; i < 2; i++) window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  });
  await expect.poll(() => lireCompteur(page)).toBe(`2 / ${total}`);
  await expect(enDemi(page)).toHaveCount(0);
  await expect(filet(page)).toHaveCount(0);
  // Et à la volée par le clavier de Playwright.
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => lireCompteur(page)).toBe(`1 / ${total}`);
  await expect(enDemi(page)).toHaveCount(0);
});

test("demi-page : la pastille « Ensuite » reste visible et touchable sur la dernière page d'un chant", async ({ page }, testInfo) => {
  await ouvrir(page, { slugs: ["avec-nous", "abba-pere"] });
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  // Jusqu'à la dernière page du premier chant : la pastille « Ensuite » est dans le flux.
  for (let i = 0; i < 20 && (await onStage(page, "[data-suivant]").count()) === 0; i++) {
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
  }
  await expect(onStage(page, "[data-suivant]")).toHaveCount(1);
  await expect(enDemi(page)).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(enDemi(page)).toHaveCount(1);
  const pastille = onStage(page, "[data-suivant]");
  await expect(pastille).toHaveCount(1);
  await expect(pastille).toBeVisible();
  const b = (await pastille.boundingBox())!;
  const v = page.viewportSize()!;
  expect(b.y + b.height).toBeLessThanOrEqual(v.height + 1);
  // Rien ne la recouvre : le toucher qui l'atteint va au chant suivant.
  const dessus = await page.evaluate(([x, y]) => (document.elementFromPoint(x, y) as HTMLElement | null)?.closest("[data-suivant]") !== null, [b.x + b.width / 2, b.y + b.height / 2]);
  expect(dessus, "la pastille n'est recouverte par rien").toBe(true);
  await pastille.click();
  await expect(enDemi(page)).toHaveCount(0);
  await expect(onStage(page, "[data-entete-chant]").first()).toContainText(/Abba/i);
  void testInfo;
});

test("demi-page : aucune coupe ne convient, le tour est un tour normal", async ({ page }) => {
  await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const total = (await lireCompteur(page)).split("/")[1].trim();
  // Les rangées du haut de la demi-page deviennent plus hautes que la page : aucun bord ne tient au-dessus de la limite.
  await page.addStyleTag({ content: "[data-demi-haut] [data-rangee], [data-demi-haut] [data-copy-line], [data-demi-haut] [data-col-page] > *, [data-demi-haut] [data-entete-chant] { padding-bottom: 300vh !important; }" });
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => lireCompteur(page)).toBe(`2 / ${total}`);
  await expect(enDemi(page)).toHaveCount(0);
  await expect(filet(page)).toHaveCount(0);
});

test("demi-page : en vue structure (feuille de route du batteur), le tour passe par la demi-page sans trancher une ligne", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      if (!localStorage.getItem("perf-struct-init")) {
        localStorage.setItem("perf-struct-init", "1");
        localStorage.setItem("perf-role-preset", "batteur");
        localStorage.setItem("perf-font-scale", "1.5");
      }
    } catch { /* ignore */ }
  });
  const NEUF = ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-5", "chorus-3-7", "chorus-3-8"];
  await ouvrir(page, { slugs: ["abba-pere"], structure: NEUF });
  await expect(onStage(page, "[data-feuille-route-ligne]").first()).toBeVisible();
  const total = Number((await lireCompteur(page)).split("/")[1]);
  expect(total, "la feuille de route s'étend sur plusieurs pages à 150 %").toBeGreaterThan(1);
  await page.keyboard.press("ArrowRight");
  if ((await enDemi(page).count()) === 1) {
    const m = await mesurer(page);
    expect(m.haut.tranches).toBe(0);
    expect(m.bas.tranches).toBe(0);
    await page.keyboard.press("ArrowRight");
  }
  await expect(enDemi(page)).toHaveCount(0);
  await expect.poll(() => lireCompteur(page)).toBe(`2 / ${total}`);
});

test("demi-page : les traits sont masqués pendant la demi-page et reviennent à la page entière", async ({ page }) => {
  const db = await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const cle = (await racine(page).getAttribute("data-cle-page"))!;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${cle}`, { strokes: TRAIT(w, h), updatedAt: new Date() });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  const calque = page.locator("[data-performance-mode] > canvas");
  await expect(calque).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await expect(enDemi(page)).toHaveCount(1);
  await expect(calque).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(enDemi(page)).toHaveCount(0);
  await expect(calque).toHaveCount(1);
});

test("demi-page : tablette portrait, des traits posés avec l'aperçu (clé « ap ») donnent le bandeau « ancienne mise en page »", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "tablette", "l'aperçu de la page suivante n'existe qu'en tablette portrait");
  const db = await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const cle = (await racine(page).getAttribute("data-cle-page"))!;
  expect(cle, "page 1 sans ligne coupée").not.toMatch(/v2$/);
  expect(cle, "demi-page allumée : pas de suffixe ap").not.toMatch(/ap$/);
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const cleAp = `${cle}${cle.includes("-") ? "" : "-"}ap`;
  db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${cleAp}`, { strokes: TRAIT(w, h), updatedAt: new Date() });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  const bandeau = page.locator("[data-alerte-composition]");
  await expect(bandeau).toBeVisible();
  await expect(bandeau).toHaveText("Des annotations existent avec l'ancienne mise en page");
  await expect(page.locator("[data-performance-mode] > canvas")).toHaveCount(0);
  expect(db.writes.filter((x) => x.path.startsWith("annotations/")), "aucune écriture").toEqual([]);
});

for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`demi-page : captures de l'état demi (${langue}, ${theme})`, async ({ page }, testInfo) => {
      await ouvrir(page, { langue, theme });
      await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
      await tourner(page, testInfo, 1, "fleche");
      await expect(enDemi(page)).toHaveCount(1);
      await expect(filet(page)).toBeVisible();
      const m = await mesurer(page);
      expect(m.haut.tranches).toBe(0);
      expect(m.bas.tranches).toBe(0);
      expect(m.sousCoupeInvisibles).toBe(0);
      if (langue === "zh") {
        const options = await ouvrirOptions(page, "zh");
        await expect(options.getByRole("button", { name: "半页翻页", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(options).toBeHidden();
        await expect(poignee(page)).toHaveAttribute("aria-label", "半页");
      }
      // Menus fermés, barres fermées (toucher au centre, hors poignée), transition finie.
      const p = (await poignee(page).boundingBox())!;
      const e = page.viewportSize()!;
      await toucher(page, testInfo, e.width * 0.5, p.y + p.height / 2 < e.height / 2 ? e.height * 0.75 : e.height * 0.25);
      // L'opacité (fondu de 300 ms) est sur le conteneur des deux barres.
      await expect(page.locator("[data-barre-haut]").locator("xpath=..")).toHaveCSS("opacity", "0");
      await expect(enDemi(page)).toHaveCount(1);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      mkdirSync("test-results/fs-e", { recursive: true });
      await racine(page).screenshot({ path: `test-results/fs-e/demi-${langue}-${theme}-${testInfo.project.name}.png` });
    });
  }
}
