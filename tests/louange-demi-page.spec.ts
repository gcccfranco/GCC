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

async function ouvrir(page: Page, opts: { slugs?: string[]; langue?: Langue; theme?: "light" | "dark"; demi?: boolean; structure?: string[]; uneColonne?: boolean } = {}) {
  const { slugs, langue = "fr", theme = "light", demi = true, structure, uneColonne = false } = opts;
  await page.addInitScript(([zh, th, d, une]) => {
    try {
      // Coupe horizontale testée aussi en grand écran : « 2 colonnes » coupé (réglage par appareil), sinon automatique.
      if (une) localStorage.setItem("perf-two-columns", "0");
      if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      if (!localStorage.getItem("perf-font-scale")) localStorage.setItem("perf-font-scale", "1");
      if (d && !sessionStorage.getItem("demi-init")) {
        sessionStorage.setItem("demi-init", "1");
        localStorage.setItem("perf-demi-page", "1");
      }
    } catch { /* ignore */ }
  }, [langue === "zh", theme, demi, uneColonne]);
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
  // La poignée arrête les touchers (sa cible de 44 px ne tourne pas la page) : on touche à une hauteur qu'elle ne couvre pas.
  const loc = page.locator("[data-performance-mode] [data-demi-poignee]");
  const p = (await loc.count()) > 0 ? await loc.boundingBox({ timeout: 1000 }) : null;
  const y = p && Math.abs(p.y + p.height / 2 - e.height * 0.5) < 60 ? e.height * 0.8 : e.height * 0.5;
  await toucher(page, testInfo, e.width * (sens === 1 ? 0.85 : 0.15), y);
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
    const colonnes = document.querySelector("[data-performance-mode] [data-demi-colonnes]") !== null;
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
      colonnes,
      // Blanc entre le bas de la dernière rangée du haut et le filet, entre le filet et la première rangée du bas (px).
      margeHaut: visiblesHaut.length ? yCoupe - Math.max(...visiblesHaut.map((r) => r.bottom)) : Infinity,
      margeBas: visiblesBas.length ? Math.min(...visiblesBas.map((r) => r.top)) - yCoupe : Infinity,
      hauteurFilet: f.height,
      yCoupe, hauteurFenetre: window.innerHeight,
      // Coupe verticale (deux colonnes) : pas de filet horizontal, une rangée est tranchée si elle sort de sa zone.
      haut: { visibles: visiblesHaut.length, tranches: visiblesHaut.filter((r) => !r.entiere || (!colonnes && r.bottom > yCoupe + 1)).length },
      bas: { visibles: visiblesBas.length, tranches: visiblesBas.filter((r) => !r.entiere || (!colonnes && r.top < yCoupe - 1)).length },
      sousCoupe: sous.length,
      sousCoupeInvisibles: sous.filter((r) => !dansZone(r)).length,
      blanc,
      rangeeMax: rangees.length ? Math.max(...rangees.map((r) => r.height)) : 0,
      rappel: bas.parentElement!.querySelectorAll("[data-demi-rappel]").length,
      // Jusqu'où le contenu de chaque page va (le filet ne peut pas se tenir à mi-hauteur au-delà de ce qui existe).
      finHaut: visiblesHaut.length ? Math.max(...visiblesHaut.map((r) => r.bottom)) : 0,
      finBas: rangees.length ? Math.max(...rangees.map((r) => r.bottom)) : 0,
    };
  });
}

const TRAIT = (w: number, h: number) =>
  JSON.stringify({ w, h, strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, h * 0.5], [w * 0.5, h * 0.5]] }] });

for (const par of ["toucher", "fleche"] as const) {
  test(`demi-page : tour avant (${par}) = haut de la page 2 au-dessus du filet, fin de la page 1 dessous ; second tour = page 2 entière ; retour symétrique`, async ({ page }, testInfo) => {
    await ouvrir(page, { uneColonne: true });
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
    if (!m.colonnes) {
      expect(m.blanc, "le blanc sous le filet ne dépasse pas une rangée (le rappel de section s'y loge)").toBeLessThanOrEqual(m.rangeeMax + (m.rappel > 0 ? 14 : 0) + 1);
      expect(m.yCoupe).toBeGreaterThan(m.hauteurFenetre * 0.2);
      expect(m.yCoupe).toBeLessThan(m.hauteurFenetre * 0.8);
      expect(m.hauteurFilet, "filet de 1,5 px").toBeCloseTo(1.5, 1);
      expect(m.margeHaut, "12 px au moins entre la dernière rangée du haut et le filet").toBeGreaterThanOrEqual(11.5);
      expect(m.margeBas, "12 px au moins entre le filet et la première rangée du bas").toBeGreaterThanOrEqual(11.5);
    }
    if (!m.colonnes && m.bas.visibles > 0) {
      const premierBas = normaliser(await page.locator("[data-performance-mode] [data-demi-bas]").locator(PREMIER_BLOC).evaluateAll((els, y) => {
        // Premier bloc qui se prolonge sous le filet (une section plus haute que la part est coupée entre deux lignes : elle commence au-dessus).
        const e = els.find((el) => el.getBoundingClientRect().bottom > (y as number) + 1);
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
  await ouvrir(page, { uneColonne: true });
  await tourner(page, testInfo, 1, "fleche");
  await expect(enDemi(page)).toHaveCount(1);
  const p = poignee(page);
  await expect(p).toHaveAttribute("role", "slider");
  await expect(p).toHaveAttribute("aria-label", "Demi-page");
  await expect(p).toHaveAttribute("aria-valuenow", "50");
  const cible = await p.boundingBox();
  expect(cible!.width).toBeGreaterThanOrEqual(43);
  expect(cible!.height).toBeGreaterThanOrEqual(43);
  // À droite, la pastille (contour, fond de page) à 48 px du bord de la zone de lecture ; la cible de 44 px y reste centrée.
  const largeur = page.viewportSize()!.width;
  const pastille = (await p.locator("span").first().boundingBox())!;
  expect(largeur - (pastille.x + pastille.width), "pastille à 48 px du bord droit").toBeGreaterThan(46.5);
  expect(largeur - (pastille.x + pastille.width)).toBeLessThan(49.5);
  // Bord de 1,5 px (le navigateur l'arrondit au pixel d'écran).
  expect(parseFloat(await p.locator("span").first().evaluate((el) => getComputedStyle(el).borderTopWidth))).toBeGreaterThanOrEqual(1);
  expect(await p.locator("span").first().evaluate((el) => getComputedStyle(el).backgroundColor), "fond de page, pas de pastille pleine").not.toBe("rgba(0, 0, 0, 0)");

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
  // La valeur est la part de la moitié basse : le filet monte, elle augmente (70 % pour une part du haut de 30 %).
  await expect(p).toHaveAttribute("aria-valuenow", /^(69|70|71)$/);
  const part = Number(await page.evaluate(() => localStorage.getItem("perf-demi-page-part")));
  expect(part).toBeGreaterThan(0.28);
  expect(part).toBeLessThan(0.32);
  const apres = await mesurer(page);
  expect(apres.yCoupe, "la coupe monte avec la poignée").toBeLessThanOrEqual(avant + 1);
  expect(apres.haut.tranches).toBe(0);
  expect(apres.bas.tranches).toBe(0);

  // Au clavier : ↑ monte le filet et augmente la valeur de 5 (part de la moitié basse), ↓ la baisse ; bornée de 25 à 75.
  await p.focus();
  await page.keyboard.press("ArrowDown");
  await expect(p).toHaveAttribute("aria-valuenow", /^(64|65|66)$/);
  await page.keyboard.press("ArrowUp");
  await expect(p).toHaveAttribute("aria-valuenow", /^(69|70|71)$/);
  const yAvant = (await mesurer(page)).yCoupe;
  await page.keyboard.press("ArrowUp");
  await expect(p).toHaveAttribute("aria-valuenow", /^(74|75)$/);
  expect((await mesurer(page)).yCoupe, "↑ monte le filet").toBeLessThanOrEqual(yAvant + 1);
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowUp");
  await expect(p).toHaveAttribute("aria-valuenow", "75");
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowDown");
  await expect(p).toHaveAttribute("aria-valuenow", "25");
  expect(await lireCompteur(page), "les flèches de la poignée ne tournent pas la page").toMatch(/^1 \//);
  expect(Number(await page.evaluate(() => localStorage.getItem("perf-demi-page-part")))).toBeCloseTo(0.75, 2);
});

test.describe("demi-page : scan non certifié", () => {
  // Les scans sont tous certifiés : on retire le chant de systemes.json (hors de portée du service worker, d'où le blocage).
  test.use({ serviceWorkers: "block" });
  test("demi-page : sur un scan 简谱 non certifié, la demi-page reste éteinte et le tour est normal", async ({ page }, testInfo) => {
    await page.route("**/jianpu/systemes.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"version":1,"chants":{}}' }));
    await ouvrir(page, { slugs: SCAN });
    await expect(page.locator("[data-performance-mode] [data-jianpu-page] img").first()).toBeVisible();
    const total = Number((await lireCompteur(page)).split("/")[1]);
    expect(total).toBeGreaterThan(1);
    await tourner(page, testInfo, 1, "fleche");
    await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
    await expect(enDemi(page)).toHaveCount(0);
    await expect(filet(page)).toHaveCount(0);
  });
});

/** Ce que montrent les deux calques d'un scan en demi-page : pour chaque ligne du scan (bornes `data-jianpu-lignes`, échelle de
 *  la fenêtre), visible si elle rencontre la zone du calque, « tranchée » si elle n'y tient pas entière. */
async function mesurerScan(page: Page) {
  return page.evaluate(() => {
    const f = document.querySelector<HTMLElement>("[data-performance-mode] [data-demi-filet]")!.getBoundingClientRect();
    const yCoupe = f.top + f.height / 2;
    const lire = (sel: string) => {
      const calque = document.querySelector<HTMLElement>(`[data-performance-mode] ${sel}`)!;
      const zs = JSON.parse(calque.dataset.demiZones ?? "[]") as Array<[number, number, number, number]>;
      // Demi-lignes (téléphone en portrait, lot JP-C) : plusieurs fenêtres ; les deux moitiés d'une ligne n'en font qu'une.
      let bas = -Infinity;
      let fenetreHaut = Infinity;
      const lignes: Array<{ top: number; bottom: number }> = [];
      for (const fen of calque.querySelectorAll<HTMLElement>("[data-jianpu-tranche]")) {
        const q = fen.getBoundingClientRect();
        const [t0, t1] = fen.dataset.jianpuTranche!.split("-").map(Number);
        const echelle = q.height / (t1 - t0);
        bas = Math.max(bas, q.bottom);
        fenetreHaut = Math.min(fenetreHaut, q.top);
        const ls = fen.dataset.jianpuLignes!.split(",").map((l) => l.split("-").map(Number)).map(([a, b]) => ({ top: q.top + (a - t0) * echelle, bottom: q.top + (b - t0) * echelle }));
        if (fen.dataset.jianpuMoitie === "d" && lignes.length) lignes[lignes.length - 1].bottom = ls[0].bottom;
        else lignes.push(...ls);
      }
      const vues = lignes.flatMap((l) => {
        const z = zs.find(([, y0, , y1]) => l.top < y1 - 1 && l.bottom > y0 + 1);
        return z ? [{ ...l, entiere: l.top >= z[1] - 1 && l.bottom <= z[3] + 1 }] : [];
      });
      return { total: lignes.length, vues, bas, fenetreHaut };
    };
    const haut = lire("[data-demi-haut]");
    const bas = lire("[data-demi-bas]");
    return {
      yCoupe,
      haut: { visibles: haut.vues.length, tranchees: haut.vues.filter((l) => !l.entiere || l.bottom > yCoupe + 1).length, total: haut.total },
      bas: { visibles: bas.vues.length, tranchees: bas.vues.filter((l) => !l.entiere || l.top < yCoupe - 1).length, total: bas.total },
      // Le filet n'est dans aucune ligne visible.
      dansUneLigne: [...haut.vues, ...bas.vues].filter((l) => l.top < yCoupe - 1 && l.bottom > yCoupe + 1).length,
    };
  });
}

for (const slug of ["一生爱你", "为我而来"]) {
  test(`demi-page : un scan certifié (${slug}) se coupe entre deux lignes, jamais dans une portée`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await ouvrir(page, { slugs: [slug] });
    await expect(page.locator("[data-performance-mode] [data-jianpu-page] img").first()).toBeVisible();
    await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
    const total = Number((await lireCompteur(page)).split("/")[1]);
    test.skip(total < 2, "ce scan tient en un seul écran dans cette disposition");
    await tourner(page, testInfo, 1, "fleche");
    await expect(enDemi(page)).toHaveCount(1);
    await expect(filet(page)).toHaveCount(1);
    // La tête de feuille reste en haut.
    await expect(page.locator("[data-performance-mode] [data-demi-haut] [data-tete-feuille]")).toHaveCount(1);
    // Le demi-écran est (encore) la page 1 : le compteur n'a pas bougé.
    expect(await lireCompteur(page)).toMatch(/^1 \//);
    const m = await mesurerScan(page);
    expect(m.haut.visibles, "des lignes de l'écran suivant au-dessus du filet").toBeGreaterThan(0);
    expect(m.bas.visibles, "des lignes de l'écran courant sous le filet").toBeGreaterThan(0);
    expect(m.haut.tranchees, "aucune portée coupée en haut").toBe(0);
    expect(m.bas.tranchees, "aucune portée coupée en bas").toBe(0);
    expect(m.dansUneLigne, "le filet tombe entre deux lignes").toBe(0);
    // La poignée ne propose que des coupes entre lignes : à chaque cran, rien n'est tranché.
    await poignee(page).focus();
    for (const touche of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown"]) {
      await page.keyboard.press(touche);
      await page.waitForTimeout(150);
      const k = await mesurerScan(page);
      expect(k.haut.tranchees + k.bas.tranchees + k.dansUneLigne, touche).toBe(0);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test-results/jp-b3-${testInfo.project.name}-demi${slug === "一生爱你" ? "-1" : ""}.png` });
    // Un second tour passe à l'écran suivant, entier.
    await tourner(page, testInfo, 1, "fleche");
    await expect.poll(() => lireCompteur(page)).toMatch(/^2 \//);
    await expect(enDemi(page)).toHaveCount(0);
  });
}

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
  await ouvrir(page, { uneColonne: true });
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

/** Page 1 et page 2 portent chacune un trait (rouge) : page 2 en haut de l'écran, page 1 en bas ; puis retour en demi-page sur la page 1. */
async function ouvrirAvecTraits(page: Page) {
  const db = await ouvrir(page, { uneColonne: true });
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const cle1 = (await racine(page).getAttribute("data-cle-page"))!;
  await page.keyboard.press("ArrowRight");
  if ((await enDemi(page).count()) === 1) await page.keyboard.press("ArrowRight");
  await expect(enDemi(page)).toHaveCount(0);
  await expect.poll(() => lireCompteur(page)).toMatch(/^2 \/ \d+$/);
  const cle2 = (await racine(page).getAttribute("data-cle-page"))!;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const trait = (y: number) => JSON.stringify({ w, h, strokes: [{ tool: "pen", size: 6, color: "#dc2626", points: [[w * 0.2, h * y], [w * 0.5, h * y]] }] });
  db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${cle1}`, { strokes: trait(0.85), updatedAt: new Date() });
  db.set(`annotations/${MUSICIEN.uid}__${SETLIST_ID}__${cle2}`, { strokes: trait(0.2), updatedAt: new Date() });
  await page.reload();
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
  await page.keyboard.press("ArrowRight");
  await expect(enDemi(page)).toHaveCount(1);
  await expect(page.locator("[data-performance-mode] [data-strokes-demi]")).toHaveCount(2);
  return { db, w, h };
}

/** Pour le calque de traits n° `i` (0 = page suivante, 1 = page en cours) : le trait est dessiné à `y` (px) dans le canvas, et le point
 *  (x, y + décalage) tombe dans une zone visible du calque. Rend aussi la hauteur du filet. */
async function traitDemi(page: Page, i: number, x: number, y: number) {
  return page.evaluate(([i, x, y]) => {
    const cadre = document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-strokes-demi]")[i];
    const canvas = cadre.querySelector("canvas")!;
    const dpr = window.devicePixelRatio || 1;
    // Le trait de la page suivante est recalé du rappel de sa page (comme en page entière) : on cherche son ordonnée dans la colonne x.
    const data = canvas.getContext("2d")!.getImageData(Math.round(x * dpr), 0, 1, canvas.height).data;
    const k0 = Array.from({ length: data.length / 4 }, (_, k) => data[k * 4 + 3]).findIndex((a) => a > 0);
    const dessine = k0 >= 0;
    const yTrait = dessine ? k0 / dpr : y;
    y = yTrait;
    const decalage = canvas.getBoundingClientRect().top;
    const rects = (getComputedStyle(cadre).clipPath.match(/M[^M]*?Z/g) ?? []).map((m) => (m.match(/-?\d+(\.\d+)?/g) ?? []).map(Number));
    const visible = rects.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y + decalage >= y0 && y + decalage <= y1);
    const f = document.querySelector<HTMLElement>("[data-performance-mode] [data-demi-filet]")!.getBoundingClientRect();
    return { dessine, visible, decalage, filet: f.top + f.height / 2, y: yTrait };
  }, [i, x, y] as const);
}

test("demi-page : les traits de la page 2 se voient au-dessus du filet, ceux de la page 1 dessous, à leur place ; rien n'est écrit", async ({ page }) => {
  const { db, w, h } = await ouvrirAvecTraits(page);
  const haut = await traitDemi(page, 0, w * 0.35, h * 0.2);
  expect(haut.dessine, "trait de la page 2 dessiné").toBe(true);
  expect(haut.visible, "trait de la page 2 dans la zone haute").toBe(true);
  expect(haut.decalage, "la page suivante n'est pas décalée").toBe(0);
  expect(Math.abs(haut.y - h * 0.2), "trait de la page 2 près de sa place").toBeLessThan(h * 0.1);
  expect(haut.y, "au-dessus du filet").toBeLessThan(haut.filet);
  const bas = await traitDemi(page, 1, w * 0.35, h * 0.85);
  expect(bas.dessine, "trait de la page 1 dessiné à sa place d'origine").toBe(true);
  expect(bas.visible, "trait de la page 1 dans la zone basse").toBe(true);
  expect(Math.abs(bas.y - h * 0.85), "trait de la page 1 à sa place").toBeLessThan(5);
  expect(bas.y + bas.decalage, "sous le filet").toBeGreaterThan(bas.filet);
  expect(db.writes.filter((x) => x.path.startsWith("annotations/")), "aucune écriture").toEqual([]);
  // « Annoter » remet la page entière : les calques de demi-page disparaissent.
  await basculerAnnoter(page);
  await expect(page.locator("[data-performance-mode] [data-strokes-demi]")).toHaveCount(0);
  await expect(enDemi(page)).toHaveCount(0);
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

test("demi-page : à la part 0,5 le filet tient entre 40 % et 60 % de la hauteur, la coupe ne recule pas pour le rappel de section", async ({ page }) => {
  await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const mesures: string[] = [];
  for (let tour = 0; tour < 6; tour++) {
    await page.keyboard.press("ArrowRight");
    if ((await enDemi(page).count()) === 1) {
      await expect(filet(page)).toBeVisible();
      const m = await mesurer(page);
      // « Quand le contenu le permet » : la page en cours descend au-delà de 70 % de la hauteur de lecture.
      if (!m.colonnes && m.finBas > m.hauteurFenetre * 0.7) {
        const part = m.yCoupe / m.hauteurFenetre;
        mesures.push(`page ${(await lireCompteur(page)).split("/")[0].trim()} : ${(part * 100).toFixed(0)} %`);
        expect(part, `filet entre 40 % et 60 % (${mesures.join(" ; ")})`).toBeGreaterThanOrEqual(0.4);
        expect(part, `filet entre 40 % et 60 % (${mesures.join(" ; ")})`).toBeLessThanOrEqual(0.6);
      }
    }
  }
});

test("demi-page : une part de poignée qui rend la coupe impossible est refusée (calques et poignée restent, rien d'inutilisable n'est retenu)", async ({ page }) => {
  await ouvrir(page, { uneColonne: true });
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  // Le premier bloc de la page suivante commence à 30 % de la hauteur : à la part 0,5 la coupe existe, à 0,25 aucun bord ne tient
  // au-dessus du filet.
  await page.addStyleTag({ content: "[data-demi-haut] :is([data-entete-chant], [data-col-page] > :first-child) { padding-top: 30vh !important; }" });
  await page.keyboard.press("ArrowRight");
  await expect(enDemi(page)).toHaveCount(1);
  const p = poignee(page);
  await expect(p).toBeVisible();
  await p.focus();
  // ↓ descend le filet (la part du haut grandit) puis ↑ le remonte : on pousse jusqu'à la butée à 25 % (valeur 75).
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowDown");
  for (let i = 0; i < 8; i++) await page.keyboard.press("ArrowUp");
  await expect(p, "la poignée reste montée").toBeVisible();
  await expect(page.locator("[data-performance-mode] [data-demi-haut]"), "les calques ne se masquent pas").toBeVisible();
  await expect(page.locator("[data-performance-mode] [data-demi-bas]")).toBeVisible();
  await expect(filet(page)).toBeVisible();
  await expect(p, "la part refusée n'est pas atteinte").not.toHaveAttribute("aria-valuenow", "75");
  const retenue = await page.evaluate(() => localStorage.getItem("perf-demi-page-part"));
  expect(retenue === null || Number(retenue) > 0.26, `part retenue : ${retenue}`).toBe(true);
});

test("demi-page : une reprise posée au libellé d'une section ne montre pas de rappel du même nom", async ({ page }) => {
  await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  let auLibelle = 0;
  for (let tour = 0; tour < 8; tour++) {
    await page.keyboard.press("ArrowRight");
    if ((await enDemi(page).count()) !== 1) continue;
    await expect(filet(page)).toBeVisible();
    const r = await page.evaluate(() => {
      const racine = document.querySelector("[data-performance-mode]")!;
      if (racine.querySelector("[data-demi-colonnes]")) return null;
      const bas = racine.querySelector<HTMLElement>("[data-demi-bas]")!;
      const zones = JSON.parse(bas.dataset.demiZones ?? "[]") as Array<[number, number, number, number]>;
      const libelles = Array.from(bas.querySelectorAll("[data-section] > [data-copy-ignore]:first-child:not([data-repere-gouttiere])"), (e) => e.getBoundingClientRect());
      // Une zone dont la reprise tombe au haut d'un libellé : aucun rappel ne doit se loger au-dessus de lui.
      const rappels = Array.from(racine.querySelectorAll<HTMLElement>("[data-demi-rappel]"), (e) => e.getBoundingClientRect());
      let auLibelle = 0;
      const doubles: number[] = [];
      for (const [x0, y0, x1] of zones) {
        if (!libelles.some((q) => Math.abs(q.top - y0) < 1.5 && q.left < x1 && q.right > x0)) continue;
        auLibelle++;
        if (rappels.some((q) => q.left < x1 && q.right > x0 && Math.abs(q.bottom - y0) < 1.5)) doubles.push(y0);
      }
      return { auLibelle, doubles };
    });
    if (!r) continue;
    auLibelle += r.auLibelle;
    expect(r.doubles, "aucun rappel au-dessus d'un libellé de section").toEqual([]);
  }
  test.info().annotations.push({ type: "mesure", description: `${auLibelle} reprises au libellé vues` });
});

test("demi-page : le rappel de section a l'allure du libellé (tiret, couleur de la section), et un cadre rogné se prolonge jusqu'au filet", async ({ page }) => {
  await ouvrir(page);
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  let rappels = 0;
  let prolonges = 0;
  for (let tour = 0; tour < 8; tour++) {
    await page.keyboard.press("ArrowRight");
    if ((await enDemi(page).count()) !== 1) continue;
    await expect(filet(page)).toBeVisible();
    const r = await page.evaluate(() => {
      const racine = document.querySelector("[data-performance-mode]")!;
      const bas = racine.querySelector<HTMLElement>("[data-demi-bas]")!;
      const haut = racine.querySelector<HTMLElement>("[data-demi-haut]")!;
      const f = racine.querySelector("[data-demi-filet]")!.getBoundingClientRect();
      const yF = f.top + f.height / 2;
      if (racine.querySelector("[data-demi-colonnes]")) return null;
      const couleursLibelles = Array.from(bas.querySelectorAll("[data-section] > [data-copy-ignore] span")).map((e) => getComputedStyle(e).color);
      const rappels = Array.from(racine.querySelectorAll<HTMLElement>("[data-demi-rappel]")).map((e) => ({
        couleur: getComputedStyle(e).color,
        tiret: e.firstElementChild ? e.firstElementChild.getBoundingClientRect().width : 0,
        dansLibelles: couleursLibelles.includes(getComputedStyle(e).color),
        gris: getComputedStyle(e).color === getComputedStyle(document.body).color,
      }));
      // Sections du haut rognées par la coupe (leurs bords latéraux visibles s'arrêtent à la coupe) : un prolongement les rejoint.
      const zones = JSON.parse(haut.dataset.demiZones ?? "[]") as Array<[number, number, number, number]>;
      const prol = Array.from(racine.querySelectorAll<HTMLElement>("[data-demi-prolongement]")).map((e) => e.getBoundingClientRect());
      const ouverts: string[] = [];
      for (const sec of Array.from(haut.querySelectorAll<HTMLElement>("[data-section]"))) {
        const q = sec.getBoundingClientRect();
        const cs = getComputedStyle(sec);
        const z = zones.find(([x0, , x1]) => q.left >= x0 - 1 && q.right <= x1 + 1);
        if (!z || !(q.top < z[3] - 1 && q.bottom > z[3] + 1) || !(parseFloat(cs.borderLeftWidth) > 0)) continue;
        const ok = prol.some((p) => Math.abs(p.left - q.left) < 1.5 && Math.abs(p.top - z[3]) < 1.5 && Math.abs(p.bottom - yF) < 1.5);
        if (!ok) ouverts.push(sec.textContent?.slice(0, 20) ?? "");
      }
      return { rappels, ouverts, prolonges: prol.length };
    });
    if (!r) continue;
    rappels += r.rappels.length;
    prolonges += r.prolonges;
    for (const rp of r.rappels) {
      expect(rp.tiret, "tiret du rappel").toBeGreaterThan(8);
      expect(rp.dansLibelles, "couleur de la section, lue sur son libellé").toBe(true);
      expect(rp.gris, "pas de gris générique").toBe(false);
    }
    expect(r.ouverts, "aucun cadre rogné ne reste ouvert").toEqual([]);
  }
  test.info().annotations.push({ type: "mesure", description: `${rappels} rappels, ${prolonges} prolongements vus` });
});

test("demi-page : deux colonnes, la première colonne de la page suivante à gauche, la dernière de la page en cours à droite, un filet vertical entre elles", async ({ page }, testInfo) => {
  test.skip(!["tablette-paysage", "ordinateur-1440"].includes(testInfo.project.name), "la coupe verticale n'existe qu'en deux colonnes (tablette paysage, ordinateur)");
  // Structure rallongée par des répétitions : le chant tient sur trois pages à deux colonnes, la 2e et la 3e sans en-tête.
  await ouvrir(page, { slugs: ["abba-pere"], structure: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-5", "chorus-3-7", "chorus-3-8", "verse-2-9", "chorus-3-10", "verse-2-11", "chorus-3-12"] });
  await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
  const total = Number((await lireCompteur(page)).split("/")[1]);
  const colonnesEntieres = () => onStage(page, "[data-col-page]").evaluateAll((cols) => cols.map((c) => Array.from(c.children, (b) => (b.textContent ?? "").replace(/\s+/g, " ").trim())));
  // Avance de page en page jusqu'à un tour qui passe entre deux pages à deux colonnes sans en-tête pleine largeur.
  let trouve = false;
  for (let n = 1; n < total && !trouve; n++) {
    await page.keyboard.press("ArrowRight");
    if ((await enDemi(page).count()) === 1) {
      await expect(filet(page)).toBeVisible();
      if ((await page.locator("[data-performance-mode] [data-demi-colonnes]").count()) === 1) { trouve = true; break; }
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => lireCompteur(page)).toBe(`${n + 1} / ${total}`);
    }
  }
  expect(trouve, "une page à deux colonnes suivie d'une page à deux colonnes existe dans les chants d'essai").toBe(true);
  const e = page.viewportSize()!;
  const info = await page.evaluate(() => {
    const racine = document.querySelector("[data-performance-mode]")!;
    const lire = (c: Element) => Array.from(c.querySelectorAll("[data-col-page]"), (col) => {
      const q = col.getBoundingClientRect();
      return { x0: q.left, x1: q.right, blocs: Array.from(col.children, (b) => (b.textContent ?? "").replace(/\s+/g, " ").trim()) };
    });
    const haut = racine.querySelector<HTMLElement>("[data-demi-haut]")!;
    const bas = racine.querySelector<HTMLElement>("[data-demi-bas]")!;
    const f = racine.querySelector("[data-demi-filet]")!.getBoundingClientRect();
    return {
      haut: lire(haut), bas: lire(bas),
      zH: JSON.parse(haut.dataset.demiZones ?? "[]") as number[][], zB: JSON.parse(bas.dataset.demiZones ?? "[]") as number[][],
      filet: { x: f.left + f.width / 2, w: f.width, h: f.height, top: f.top },
      poignee: racine.querySelectorAll("[data-demi-poignee]").length,
      rappels: racine.querySelectorAll("[data-demi-rappel]").length,
    };
  });
  // La page suivante peut n'avoir qu'une colonne de contenu (page courte) ; la page en cours en a deux.
  expect(info.haut.length).toBeGreaterThanOrEqual(1);
  expect(info.bas.length).toBe(2);
  // Gauche : la première colonne de la page suivante ; droite : la dernière de la page en cours ; le filet (1,5 px) dans la gouttière.
  // Deux zones disjointes sur toute la hauteur : rien ne se superpose.
  expect(info.zH).toHaveLength(1);
  expect(info.zB).toHaveLength(1);
  const droite = info.zB[info.zB.length - 1];
  if (info.haut[1]) expect(info.zH[0][2], "la zone du haut s'arrête à la gouttière").toBeLessThanOrEqual(info.haut[1].x0 + 1);
  expect(info.zH[0][2], "les deux zones se touchent à la gouttière, sans se recouvrir").toBeCloseTo(droite[0], 0);
  expect(info.zH[0][2]).toBeGreaterThanOrEqual(info.haut[0].x1 - 1);
  expect(droite[0], "la zone du bas commence à la gouttière").toBeGreaterThanOrEqual(info.bas[0].x1 - 1);
  expect(droite[0]).toBeLessThanOrEqual(info.bas[1].x0 + 1);
  expect(info.filet.w).toBeCloseTo(1.5, 1);
  expect(info.filet.x).toBeGreaterThan(info.haut[0].x1 - 1);
  expect(info.filet.x).toBeLessThan(info.bas[1].x0 + 1);
  expect(info.filet.h, "filet sur toute la hauteur des colonnes").toBeGreaterThan(e.height * 0.6);
  expect(info.poignee, "pas de poignée : la proportion ne se règle pas ici").toBe(0);
  expect(info.rappels).toBe(0);
  const m = await mesurer(page);
  expect(m.haut.tranches).toBe(0);
  expect(m.bas.tranches).toBe(0);
  expect(m.haut.visibles, "la colonne de gauche se voit").toBeGreaterThan(0);
  expect(m.bas.visibles, "la colonne de droite se voit").toBeGreaterThan(0);
  const courante = info.bas[1].blocs;
  const suivante = info.haut[0].blocs;
  const pageEnCours = Number((await lireCompteur(page)).split("/")[0]);
  expect(courante.length).toBeGreaterThan(0);

  // Le tour suivant donne la page suivante entière : ses colonnes sont celles que montrait la demi-page (la première à gauche).
  await page.keyboard.press("ArrowRight");
  await expect(enDemi(page)).toHaveCount(0);
  await expect.poll(() => lireCompteur(page)).toBe(`${pageEnCours + 1} / ${total}`);
  const entieres = await colonnesEntieres();
  expect(entieres[0], "à gauche, la première colonne de la page suivante").toEqual(suivante);
  // Tour arrière symétrique : la demi-page de retour montre la page précédente à droite.
  await page.keyboard.press("ArrowLeft");
  await expect(enDemi(page)).toHaveCount(1);
  expect(await lireCompteur(page)).toBe(`${pageEnCours} / ${total}`);
  await page.keyboard.press("ArrowLeft");
  await expect(enDemi(page)).toHaveCount(0);
  await expect.poll(() => lireCompteur(page)).toBe(`${pageEnCours} / ${total}`);
  const retour = await colonnesEntieres();
  expect(retour[retour.length - 1], "à droite, la dernière colonne de la page en cours").toEqual(courante);
});

for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`demi-page : captures de l'état demi (${langue}, ${theme})`, async ({ page }, testInfo) => {
      await ouvrir(page, { langue, theme });
      await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ \d+$/);
      // État prêt avant le tour : polices chargées (les sous-ensembles chinois changent la mise en page) et mise en page terminée,
      // sinon la demi-page peut être calculée sur des mesures provisoires et le tour devient un tour entier.
      await page.evaluate(() => document.fonts.ready);
      await attendreMiseEnPage(page);
      await tourner(page, testInfo, 1, "fleche");
      await expect(enDemi(page)).toHaveCount(1);
      await expect(filet(page)).toBeVisible();
      const m = await mesurer(page);
      expect(m.haut.tranches).toBe(0);
      expect(m.bas.tranches).toBe(0);
      // Rangées sous le filet : notion de la coupe horizontale ; en colonnes le filet est vertical et la colonne cachée n'en est pas une.
      if (!m.colonnes) expect(m.sousCoupeInvisibles).toBe(0);
      // Deux colonnes : coupe verticale (filet sur la hauteur, pas de poignée) ; une colonne : coupe horizontale et poignée.
      if (m.colonnes) {
        await expect(page.locator("[data-performance-mode] [data-demi-colonnes]")).toHaveCount(1);
        await expect(poignee(page)).toHaveCount(0);
        const f = (await filet(page).boundingBox())!;
        expect(f.width).toBeCloseTo(1.5, 1);
        expect(f.height, "filet vertical sur la hauteur des colonnes").toBeGreaterThan(page.viewportSize()!.height * 0.6);
      } else {
        await expect(poignee(page)).toHaveCount(1);
        expect(m.hauteurFilet).toBeCloseTo(1.5, 1);
      }
      if (langue === "zh") {
        const options = await ouvrirOptions(page, "zh");
        await expect(options.getByRole("button", { name: "半页翻页", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(options).toBeHidden();
        if (!m.colonnes) await expect(poignee(page)).toHaveAttribute("aria-label", "半页");
      }
      // Menus fermés, barres fermées (toucher au centre, hors poignée), transition finie.
      const p = m.colonnes ? null : (await poignee(page).boundingBox())!;
      const e = page.viewportSize()!;
      await toucher(page, testInfo, e.width * 0.5, p && p.y + p.height / 2 < e.height / 2 ? e.height * 0.75 : e.height * 0.25);
      // L'opacité (fondu de 300 ms) est sur le conteneur des deux barres.
      await expect(page.locator("[data-barre-haut]").locator("xpath=..")).toHaveCSS("opacity", "0");
      await expect(enDemi(page)).toHaveCount(1);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      mkdirSync("test-results/fs-e", { recursive: true });
      await racine(page).screenshot({ path: `test-results/fs-e/demi-${langue}-${theme}-${testInfo.project.name}.png` });
    });
  }
}
