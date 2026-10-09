import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { paginateColumns, pagesUneColonne, twoColumnsPossible, type PerfPage } from "../src/lib/performance/columns";

// Lot U5, tranche T1 (docs/spec-deux-volets.md, Q2 à Q5) : le mode louange en deux
// colonnes sur tablette couchée et sur ordinateur, avec l'interrupteur « 2 colonnes ».
// Téléphone et tablette debout gardent exactement leurs pages. Setlist et compte
// simulés : aucune lecture ni écriture du Firestore de production.

// ─── Pagination, sans navigateur ──────────────────────────────────────────────

test.describe("paginateColumns (pur)", () => {
  /** Tous les blocs d'une suite de pages, dans l'ordre de lecture. */
  const lus = (pages: PerfPage[]) => pages.flatMap((p) => (p.header != null ? [p.header, ...p.cols.flat()] : p.cols.flat()));
  const hauteur = (idxs: number[], h: number[]) => idxs.reduce((s, i) => s + h[i], 0);

  test("un chant qui tient sur une colonne garde les pages d'aujourd'hui", () => {
    // En-tête 0 (60 px), trois sections de 100 px pleine largeur (130 px en colonne).
    const heightsFull = [60, 100, 100, 100];
    const heightsColumn = [60, 130, 130, 130];
    const pages = paginateColumns({ flow: [1, 2, 3], header: 0, heightsFull, heightsColumn, pageHeight: 400 });
    expect(pages).toEqual(pagesUneColonne([0, 1, 2, 3], heightsFull, 400, new Set()));
    expect(pages).toEqual([{ header: null, cols: [[0, 1, 2, 3]], scale: 1 }]);
  });

  test("mesure en colonne absente : les pages d'aujourd'hui", () => {
    const heightsFull = [60, 200, 200, 200];
    const pages = paginateColumns({ flow: [1, 2, 3], header: 0, heightsFull, heightsColumn: [], pageHeight: 400 });
    expect(pages).toEqual(pagesUneColonne([0, 1, 2, 3], heightsFull, 400, new Set()));
    expect(pages.every((p) => p.cols.length === 1 && !p.twoColumns)).toBe(true);
  });

  test("trop long pour une colonne : en-tête au-dessus, gauche puis droite, aucun bloc coupé ni perdu", () => {
    // Six sections de 80 px pleine largeur (550 px > 400) et 100 px en colonne.
    const heightsFull = [50, 80, 80, 80, 80, 80, 80];
    const heightsColumn = [50, 100, 100, 100, 100, 100, 100];
    const pages = paginateColumns({ flow: [1, 2, 3, 4, 5, 6], header: 0, heightsFull, heightsColumn, pageHeight: 400 });
    expect(pages).toHaveLength(1);
    const [p] = pages;
    expect(p.header, "l'en-tête passe en pleine largeur au-dessus des colonnes").toBe(0);
    expect(p.twoColumns).toBe(true);
    expect(p.cols).toEqual([[1, 2, 3], [4, 5, 6]]);
    expect(lus(pages), "chaque bloc une fois, dans l'ordre joué").toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(p.scale).toBe(1);
  });

  test("dernière page équilibrée : la plus haute colonne la plus courte possible", () => {
    // Remplissage glouton : 300 | 100 ; équilibré : 200 | 200.
    const heightsFull = [0, 150, 150, 150, 150];
    const heightsColumn = [0, 100, 100, 100, 100];
    const pages = paginateColumns({ flow: [1, 2, 3, 4], header: null, heightsFull, heightsColumn, pageHeight: 350 });
    expect(pages).toHaveLength(1);
    expect(pages[0].cols).toEqual([[1, 2], [3, 4]]);
    // À hauteur égale, la colonne de gauche prend le bloc du milieu.
    const impair = paginateColumns({ flow: [1, 2, 3], header: null, heightsFull, heightsColumn, pageHeight: 250 });
    expect(impair[0].cols).toEqual([[1, 2], [3]]);
  });

  test("chant long : pages suivantes en deux colonnes, en-tête sur la première seulement", () => {
    const heightsFull = [50, ...Array(12).fill(90)];
    const heightsColumn = [50, ...Array(12).fill(100)];
    const flow = Array.from({ length: 12 }, (_, i) => i + 1);
    const pages = paginateColumns({ flow, header: 0, heightsFull, heightsColumn, pageHeight: 400 });
    expect(pages.map((p) => p.header)).toEqual([0, null]);
    // Page 1 : 350 px sous l'en-tête → trois blocs par colonne. Page 2 : le reste, équilibré.
    expect(pages[0].cols).toEqual([[1, 2, 3], [4, 5, 6]]);
    expect(pages[1].cols).toEqual([[7, 8, 9], [10, 11, 12]]);
    expect(lus(pages)).toEqual([0, ...flow]);
    for (const p of pages) {
      expect(p.twoColumns).toBe(true);
      const room = 400 - (p.header != null ? heightsFull[p.header] : 0);
      for (const col of p.cols) expect(hauteur(col, heightsColumn)).toBeLessThanOrEqual(room);
    }
  });

  test("une section plus haute qu'une colonne réduit la page, sans être coupée", () => {
    const heightsFull = [50, 700, 80];
    const heightsColumn = [50, 900, 100];
    const pages = paginateColumns({ flow: [1, 2], header: 0, heightsFull, heightsColumn, pageHeight: 400 });
    expect(pages).toHaveLength(1);
    expect(pages[0].cols).toEqual([[1], [2]]);
    expect(pages[0].scale).toBeCloseTo(350 / 900, 5);
  });
});

test.describe("twoColumnsPossible (pur)", () => {
  test("tablette couchée de 1 080 px : oui à 100 %, non à 120 % ; hors grand écran : non", () => {
    expect(twoColumnsPossible(true, 1080, 1)).toBe(true);
    expect(twoColumnsPossible(true, 1080, 1.2)).toBe(false);
    expect(twoColumnsPossible(true, 960, 1)).toBe(true);
    expect(twoColumnsPossible(false, 1440, 1)).toBe(false);
  });
});

// ─── À l'écran ────────────────────────────────────────────────────────────────

const SETLIST_ID = "setlist-colonnes";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

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

const setlist = (items: Record<string, unknown>[]) => ({
  title: "Culte du 4 octobre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items,
});

/** Dispositions « ordinateur » et « tablette paysage » de U4 (spec-navigation-grand-ecran.md, Q1). */
const GRAND_ECRAN =
  "(pointer: fine) and (min-width: 1024px), (pointer: coarse) and (orientation: landscape) and (min-width: 1024px)";
const grandEcran = (page: Page) => page.evaluate((q) => matchMedia(q).matches, GRAND_ECRAN);

async function ouvrirMode(page: Page, items: Record<string, unknown>[], role = "pianiste"): Promise<FakeDb> {
  await page.addInitScript((r) => localStorage.setItem("perf-role-preset", r), role);
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist(items) }, `/setlists/${SETLIST_ID}`);
  await lancer(page);
  return db;
}

const compteur = (page: Page) => page.locator("[data-performance-mode] span.tabular-nums").last();

async function lancer(page: Page) {
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  // Les pages sont comptées : la mise en page est faite.
  await expect(compteur(page)).toHaveText(/^\d+ \/ \d+$/);
}

/** Quitte le mode louange en rendant la page setlist où elle était (voir performance-mode.spec.ts). */
async function quitter(page: Page) {
  const y = await page.evaluate(() => window.scrollY);
  await montrerChrome(page);
  await page.getByRole("button", { name: "Quitter" }).click();
  await page.evaluate((to) => window.scrollTo(0, to), y);
}

/** Page affichée du mode louange, sans la page setlist dessous ni les copies de mesure. */
const onStage = (page: Page, selector: string) =>
  page.locator(`[data-performance-mode] ${selector}:not([aria-hidden=true] *)`);

/** L'interrupteur, même quand les barres se sont effacées (aria-hidden). */
const interrupteur = (page: Page) => page.locator("[data-performance-mode] button", { hasText: "2 colonnes" });

/** Les barres s'effacent après 3 s : un toucher au centre les rappelle. */
async function montrerChrome(page: Page) {
  if (await page.getByRole("button", { name: "Quitter" }).isVisible()) return;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.click(w / 2, h / 2);
  await expect(page.getByRole("button", { name: "Quitter" })).toBeVisible();
}

async function toucherInterrupteur(page: Page) {
  await montrerChrome(page);
  await page.getByRole("button", { name: "2 colonnes" }).click();
}

/** Bords gauches distincts des sections de la page affichée : 1 = une colonne, 2 = deux. */
async function colonnes(page: Page): Promise<number> {
  await expect(onStage(page, "[data-section]").first()).toBeVisible();
  const lefts = await onStage(page, "[data-section]").evaluateAll((els) =>
    els.map((e) => Math.round(e.getBoundingClientRect().left)),
  );
  return new Set(lefts).size;
}

const totalPages = async (page: Page) => Number((await compteur(page).innerText()).split("/")[1]);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>). */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

/** Les comportements du grand écran, joués sur la disposition donnée par le projet
 *  (`ordinateur`, `tablette-paysage` et `ordinateur-1440`, SPECS_GRAND_ECRAN). */
function grandEcranTests(nom: string) {
  // 一生爱你 en entier tient sur une page (il reste en une colonne, Q4) : joué
  // deux fois, il n'y tient plus.
  const CHANTS = [
    { slug: "abba-pere", structureOverride: null },
    { slug: "一生爱你", structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "verse-2-3", "chorus-3-4", "chorus-3-5"] },
  ];
  for (const { slug, structureOverride } of CHANTS) {
    test(`${nom} : deux colonnes d'office, en-tête au-dessus, aucune section coupée (${slug})`, async ({ page }) => {
      test.skip(!(await grandEcran(page)), "deux colonnes : tablette paysage et ordinateur seulement");
      await ouvrirMode(page, [item({ songSlug: slug, position: 1, structureOverride })]);
      await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "true");
      expect(await colonnes(page)).toBe(2);
      const sections = await onStage(page, "[data-section]").evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect),
      );
      const hauteur = await page.evaluate(() => innerHeight);
      for (const s of sections) expect(s.bottom, "section entière à l'écran").toBeLessThanOrEqual(hauteur);
      const titre = (await onStage(page, "h2").first().boundingBox())!;
      expect(titre.y + titre.height, "en-tête au-dessus des colonnes").toBeLessThanOrEqual(Math.min(...sections.map((s) => s.top)));
      await capture(page, `louange-2-colonnes-${slug}`);
    });
  }

  test(`${nom} : « 2 colonnes » coupé → une colonne, retenu à la réouverture (FR)`, async ({ page }) => {
    test.skip(!(await grandEcran(page)), "deux colonnes : tablette paysage et ordinateur seulement");
    await ouvrirMode(page, [item({ songSlug: "abba-pere", position: 1 })]);
    expect(await colonnes(page)).toBe(2);
    const enDeux = await totalPages(page);

    await toucherInterrupteur(page);
    await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => colonnes(page)).toBe(1);
    expect(await totalPages(page), "une colonne : au moins autant de pages").toBeGreaterThanOrEqual(enDeux);
    expect(await page.evaluate(() => localStorage.getItem("perf-two-columns"))).toBe("0");

    await quitter(page);
    await lancer(page);
    await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "false");
    expect(await colonnes(page)).toBe(1);

    await toucherInterrupteur(page);
    await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => colonnes(page)).toBe(2);
  });

  test(`${nom} : scan 简谱 entier, sur sa page (ZH)`, async ({ page }) => {
    test.skip(!(await grandEcran(page)), "deux colonnes : tablette paysage et ordinateur seulement");
    await ouvrirMode(page, [
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["verse-2-0"] }),
      item({ songSlug: "一生爱你", position: 2, jianpuSheet: true }),
    ]);
    await expect(interrupteur(page)).toHaveAttribute("aria-pressed", "true");
    const scan = onStage(page, "[data-jianpu-page] img");
    // Le scan arrive avec le manifeste 简谱 : le chant 2 passe alors sur sa partition.
    await expect(onStage(page, "h2").first()).toBeVisible();
    for (let p = 2; p <= 3 && !(await scan.first().isVisible()); p++) {
      await page.keyboard.press("ArrowRight");
      await expect(compteur(page)).toHaveText(new RegExp(`^${p} /`));
    }
    await expect(scan.first()).toBeVisible();
    await expect(onStage(page, "[data-section]")).toHaveCount(0);
    const boite = (await scan.first().boundingBox())!;
    const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    expect(boite.y).toBeGreaterThanOrEqual(0);
    expect(boite.y + boite.height, "scan entier en hauteur").toBeLessThanOrEqual(h + 0.5);
    expect(boite.x + boite.width, "scan entier en largeur").toBeLessThanOrEqual(w + 0.5);
    await capture(page, "louange-2-colonnes-scan");
  });

  test(`${nom} : vue structure inchangée, sans interrupteur (FR)`, async ({ page }) => {
    test.skip(!(await grandEcran(page)), "deux colonnes : tablette paysage et ordinateur seulement");
    await ouvrirMode(page, [item({ songSlug: "abba-pere", position: 1 })], "batteur");
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(interrupteur(page)).toHaveCount(0);
    const boites = () => onStage(page, "[data-section]").evaluateAll((els) =>
      els.map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }),
    );
    const avant = await boites();
    await page.evaluate(() => localStorage.setItem("perf-two-columns", "0"));
    await quitter(page);
    await lancer(page);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    expect(await boites()).toEqual(avant);
  });

  // Structure seule vient aussi d'« Affichage » (lot 2 du chantier 简谱, D15) :
  // même vue structure, sans rôle, toujours sans interrupteur.
  test(`${nom} : Affichage › Structure seule, vue structure sans interrupteur (FR)`, async ({ page }) => {
    test.skip(!(await grandEcran(page)), "deux colonnes : tablette paysage et ordinateur seulement");
    await page.addInitScript(() => localStorage.setItem("partition-layout", "structure"));
    await ouvrirMode(page, [item({ songSlug: "abba-pere", position: 1 })]);
    await expect(onStage(page, "[data-section]").first()).toBeVisible();
    await expect(onStage(page, "[data-copy-line]")).toHaveCount(0);
    await expect(interrupteur(page)).toHaveCount(0);
  });

  test(`${nom} : un trait posé en une colonne ne se charge pas en deux colonnes et revient en une (FR)`, async ({ page }) => {
    test.skip(!(await grandEcran(page)), "deux colonnes : tablette paysage et ordinateur seulement");
    const lues: string[] = [];
    page.on("request", (r) => {
      const m = r.url().match(/\/documents\/(annotations\/[^?]+)/);
      if (m && r.method() === "GET") lues.push(decodeURIComponent(m[1]));
    });
    const db = await ouvrirMode(page, [item({ songSlug: "abba-pere", position: 1 })]);
    const trait = (n: number) => page.locator("[data-performance-mode] > canvas").count().then((c) => c === n);

    await expect.poll(() => lues.at(-1) ?? "").toContain("x2");
    const enDeux = lues.at(-1)!;
    await toucherInterrupteur(page);
    await expect.poll(() => lues.at(-1)).not.toBe(enDeux);
    const enUne = lues.at(-1)!;
    expect(enUne, "une page en une colonne garde sa clé").not.toContain("x2");

    // Un trait sur la page en une colonne (enregistré comme le ferait « Annoter »).
    db.set(enUne, {
      strokes: JSON.stringify({ w: 1000, h: 700, strokes: [{ tool: "pen", size: 3, color: "#dc2626", points: [[100, 100], [300, 300]] }] }),
    });
    await toucherInterrupteur(page);
    await expect.poll(() => lues.at(-1)).toBe(enDeux);
    await page.waitForTimeout(300);
    expect(await trait(0), "pas de trait en deux colonnes").toBe(true);

    await toucherInterrupteur(page);
    await expect.poll(() => lues.at(-1)).toBe(enUne);
    await expect.poll(() => trait(1), "le trait revient en une colonne").toBe(true);
  });
}

grandEcranTests("grand écran");

test("téléphone et tablette portrait : pas d'interrupteur, une colonne, même nombre de pages quel que soit le réglage", async ({ page }) => {
  test.skip(await grandEcran(page), "téléphone et tablette portrait seulement");
  await ouvrirMode(page, [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })]);
  await expect(onStage(page, "[data-section]").first()).toBeVisible();
  await expect(interrupteur(page)).toHaveCount(0);
  const total = await totalPages(page);
  for (let p = 0; p < total; p++) {
    await expect(compteur(page)).toHaveText(`${p + 1} / ${total}`);
    expect(await colonnes(page), `page ${p + 1} en une colonne`).toBe(1);
    await page.keyboard.press("ArrowRight");
  }

  await page.evaluate(() => localStorage.setItem("perf-two-columns", "1"));
  await quitter(page);
  await lancer(page);
  await expect(interrupteur(page)).toHaveCount(0);
  expect(await totalPages(page)).toBe(total);
});
