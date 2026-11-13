import { expect, test, type Page } from "@playwright/test";
import { basculerMode, choisirDestination } from "./helpers/menuSetlist";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ligneHistorique, ouvrirPartitions } from "./helpers/setlist";
import { loadChords } from "./helpers/jianpu";
import { readFileSync } from "node:fs";
import { attendreMiseEnPage, lireCompteur, onStage } from "./helpers/louange";

// Lot 9, tranche « 简谱 » (docs/spec-harmonie.md) : retoucher un accord sur le
// scan. Toucher un accord imprimé le change ou l'efface, toucher la ligne
// d'accords en ajoute un — dans « Adapter » (pour la présidence, historique
// compris) comme dans « Ma version » (pour soi). Le calque publié
// (`public/jianpu/chords.json`) n'est jamais écrit : les retouches vivent dans
// l'item de setlist ou dans ma version.

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
  ...musicien("piano", "guitare"),
};

/** Chant chinois affiché en scan : calque certifié, gravé en G, une page.
 *  Deux rangées d'accords bien séparées — y = 344 (G G7 D) et y = 1163
 *  (Em7 G/D C D G) — de quoi viser un accord et un espace de ligne. */
const SLUG = "到各山岭去传扬";
const CHORDS = loadChords()[SLUG];

const SETLIST_ID = "setlist-jianpu";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const PARTITION_DOC = `partitions/${MUSICIEN.uid}__${SLUG}`;

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

const setlist = (over: Record<string, unknown> = {}) => ({
  title: "Culte du 21 septembre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-09-21",
  language: "mixed",
  notes: "",
  // Depuis SC1 (18/10/2026), seul le créateur adapte une setlist : la musicienne est la créatrice de la sienne.
  ownerId: "uid-musicien",
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1 }),
    item({ songSlug: SLUG, position: 2, jianpuSheet: true, ...over }),
  ],
});

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function openPartitions(page: Page, docs: Record<string, Record<string, unknown>> = {}) {
  // Retouche sur la page entière : les trois appareils seulement (la spec tourne aussi sur les grands écrans pour JV-5c ;
  // à 1 440 la vue Partitions passe en deux volets, JV-3).
  test.skip(["tablette-paysage", "ordinateur-1440"].includes(test.info().project.name), "retouche : trois appareils");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIEN, { [SETLIST_DOC]: setlist(), ...docs }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  // Le scan pèse 1 à 2 Mo et le calque vient d'un fetch à part : sans ces
  // attentes, on touche une image absente ou une géométrie pas encore lue.
  await page.locator('[data-jianpu-page="0"] img').waitFor();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
  return db;
}

/** Touche le scan au point (x, y) exprimé en pixels de l'image d'origine. */
async function toucher(page: Page, x: number, y: number) {
  const zone = page.locator("[data-jianpu-retouche-zone]");
  const box = (await zone.boundingBox())!;
  await zone.click({
    position: { x: (x / CHORDS.w) * box.width, y: (y / CHORDS.h) * box.height },
  });
}

/** Pavé d'accord de la feuille : fondamentale, altération, qualité, valider ; puis le choix du lieu (MP-3 : la
 *  musicienne règle le culte, « Enregistrer » lui demande Pour moi ou Pour tout le culte). */
async function pave(page: Page, destination: "moi" | "culte", ...touches: string[]) {
  const feuille = page.getByRole("dialog");
  for (const nom of touches) await feuille.getByRole("button", { name: nom, exact: true }).click();
  await feuille.getByRole("button", { name: "Valider l'accord" }).click();
  await choisirDestination(page, destination);
}

/** Dernier état des items écrit dans la setlist. */
function itemsEcrits(db: { writes: { path: string; data: Record<string, unknown> }[] }) {
  const last = db.writes.filter((w) => w.path === SETLIST_DOC).at(-1);
  return (last?.data.items ?? []) as Record<string, unknown>[];
}

const scanItem = (db: Parameters<typeof itemsEcrits>[0]) => itemsEcrits(db)[1];

test("Crayon, pour tout le culte : toucher un accord imprimé le change, et l'historique le dit", async ({ page }) => {
  const db = await openPartitions(page);
  await basculerMode(page);
  // Étiquette 0 : « G » gravé en haut à gauche (x 80, y 344).
  await toucher(page, 90, 356);
  await capture(page, "jianpu-pave");
  await pave(page, "culte", "E", "m7");

  const retouche = page.locator('[data-jianpu-retouche="0"]');
  await expect(retouche).toHaveText("Em7");
  await capture(page, "jianpu-accord-change");

  expect(scanItem(db).jianpuChords).toEqual({ changed: { "0": "Em7" } });

  // Même phrase que les autres retouches d'Adapter.
  await (await ligneHistorique(page, /Modifiée par Ruth K\./)).click();
  const histoire = page.getByRole("dialog", { name: "Historique des modifications" });
  await expect(histoire.getByText(`Adaptation de ${SLUG} modifiée (accords ou paroles)`)).toBeVisible();
});

test("Crayon, pour tout le culte : un accord touché puis effacé disparaît du scan", async ({ page }) => {
  const db = await openPartitions(page);
  await basculerMode(page);
  // Étiquette 1 : « G7 » (x 638, y 344).
  await toucher(page, 655, 356);
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer l'accord" }).click();
  await choisirDestination(page, "culte");

  await expect(page.locator('[data-jianpu-retouche="1"]')).toHaveText("");
  await capture(page, "jianpu-accord-efface");
  expect(scanItem(db).jianpuChords).toEqual({ changed: { "1": "" } });
});

test("Crayon, pour tout le culte : toucher la ligne d'accords en ajoute un à la hauteur des autres", async ({ page }) => {
  // Setlist jouée en A : le calque est entièrement écrit, l'accord ajouté doit
  // s'aligner sur ses voisins gravés.
  const db = await openPartitions(page, { [SETLIST_DOC]: setlist({ keyOverride: "A" }) });
  await basculerMode(page);
  // Rangée du bas (y 1163), entre le « C » (x 662) et le « D » (x 920).
  await toucher(page, 800, 1176);
  await pave(page, "culte", "A");

  const ajout = page.locator('[data-jianpu-ajout="0"]');
  await expect(ajout).toHaveText("A");
  const voisin = page.locator('[data-jianpu-label="C"]');
  const [a, v] = [await ajout.boundingBox(), await voisin.boundingBox()];
  expect(Math.abs(a!.y - v!.y), "accord ajouté à la hauteur de sa ligne").toBeLessThan(3);
  await capture(page, "jianpu-accord-ajoute");

  // Stocké en tonalité d'origine (G) : A jouée en A s'écrit G sur la gravure.
  // x : le clic en pixels d'écran, ramené aux pixels du scan, s'arrondit (798 pour 800).
  const ajouts = (scanItem(db).jianpuChords as { added: { x: number }[] }).added;
  expect(ajouts).toHaveLength(1);
  expect(ajouts[0]).toMatchObject({ page: 0, y: 1163, c: "G" });
  expect(Math.abs(ajouts[0].x - 800)).toBeLessThanOrEqual(4);
});

test("retouche transposée : saisie dans la tonalité jouée, stockée dans celle de la gravure", async ({ page }) => {
  const db = await openPartitions(page, { [SETLIST_DOC]: setlist({ keyOverride: "A" }) });
  await basculerMode(page);
  // Le « G » gravé s'affiche « A » : on le remplace par F#m, qui vaut Em en G.
  await expect(page.locator('[data-jianpu-label="G"]').first()).toHaveText("A");
  await toucher(page, 90, 356);
  await pave(page, "culte", "F", "♯", "m");

  await expect(page.locator('[data-jianpu-retouche="0"]')).toHaveText("F#m");
  expect(scanItem(db).jianpuChords).toEqual({ changed: { "0": "Em" } });
  await capture(page, "jianpu-retouche-transposee");
});

test("Crayon, pour moi : même geste, écrit dans ma partition et jamais dans la setlist", async ({ page }) => {
  const db = await openPartitions(page);
  await basculerMode(page);
  await toucher(page, 90, 356);
  await pave(page, "moi", "C");

  await expect(page.locator('[data-jianpu-retouche="0"]')).toHaveText("C");
  await capture(page, "jianpu-ma-version");

  const miennes = db.writes.filter((w) => w.path === PARTITION_DOC);
  expect(miennes.length).toBeGreaterThan(0);
  expect(miennes.at(-1)!.data.jianpuChords).toEqual({ changed: { "0": "C" } });
  expect(
    db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)),
    "la setlist et son historique ne bougent pas",
  ).toHaveLength(0);
});

test("hors Crayon : les retouches s'affichent, rien ne se touche", async ({ page }) => {
  await openPartitions(page, {
    [SETLIST_DOC]: setlist({ jianpuChords: { changed: { "0": "Em7" } } }),
  });
  await expect(page.locator('[data-jianpu-retouche="0"]')).toHaveText("Em7");
  await expect(page.locator("[data-jianpu-retouche-zone]")).toHaveCount(0);
  await capture(page, "jianpu-lecture-seule");
});

// ── JV-5c (docs/spec-jianpu-deux-volets.md, point 2, « Reprise du 13/11 ») ─────────────────────────────────────────────
// Sur un scan 简谱, une étiquette par ligne où commence une section (`sections.json`), dans le rail laissé à gauche du
// scan (jamais sur l'encre ni dans le calque) ; langue de l'interface, forme courte, initiale seule sous 640 px. Le toucher
// ouvre le volet Harmonie au bloc du passage : page chant, vue Partitions, mode louange (réglage « Idées d'harmonie »).
// 为我而来 : Couplets 1 et 2 sur la ligne 3 de la page 1, Refrain ligne 6, Pont ligne 3 de la page 2. Noms fictifs.

const SCAN = "为我而来";
const SYSTEMES = JSON.parse(readFileSync("public/jianpu/systemes.json", "utf8")).chants[SCAN].pages as { h: number; lignes: { y0: number }[] }[];
const ATTENDUES = [
  { page: 0, ligne: 2, fr: "Couplets 1–2", zh: "主歌 1–2", ini: { fr: "C", zh: "主" }, passage: { fr: /^Couplet 1/, zh: /^主歌 1/ } },
  { page: 0, ligne: 5, fr: "Refrain", zh: "副歌", ini: { fr: "R", zh: "副" }, passage: { fr: /^Refrain/, zh: /^副歌/ } },
  { page: 1, ligne: 2, fr: "Pont", zh: "桥段", ini: { fr: "P", zh: "桥" }, passage: { fr: /^Pont/, zh: /^桥段/ } },
];
const LECTRICE: FakeProfile = {
  uid: "uid-lectrice-jv5c", email: "lectrice-jv5c@example.com", firstName: "Maëlle", lastName: "Fontaine", planningName: "Maëlle F.",
  serviceRoles: { "Culte Francophone": ["musicien"] }, ...musicien("piano"),
};
const SANS_HARMONIE: FakeProfile = { uid: "uid-visiteur-jv5c", email: "visiteur-jv5c@example.com", firstName: "Hugo", lastName: "Marchal", planningName: "Hugo M." };
const etiquettes = (page: Page) => page.locator("[data-jianpu-etiquette]");
const voletOuvert = (page: Page) => page.locator("[data-harmonie-colonne], [data-idees-harmonie]").first();
/** Texte visible (la forme courte et l'initiale sont toutes deux dans le DOM, l'une cachée selon la largeur). */
const visible = (l: ReturnType<Page["locator"]>) => l.evaluate((el) => (el as HTMLElement).innerText.trim());
const etroit = (page: Page) => (page.viewportSize()?.width ?? 0) < 640;

async function prefs(page: Page, { zh = false, louange = false, sombre = false } = {}) {
  await page.addInitScript(({ zh, louange, sombre, u }) => {
    localStorage.setItem("jianpu-sheet-pref", "always");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    if (sombre) localStorage.setItem("theme", "dark");
    if (louange) { localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem(`perf-idees-harmonie-${u}`, "1"); }
  }, { zh, louange, sombre, u: LECTRICE.uid });
}

async function scanCharge(page: Page) {
  await page.locator('[data-jianpu-page] img').first().waitFor();
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));
}

/** Chaque étiquette : texte attendu, à gauche de sa fenêtre (hors de l'encre), à la hauteur de sa ligne (page chant). */
async function verifierEtiquettes(page: Page, langue: "fr" | "zh", hauteurs = true) {
  await expect(etiquettes(page)).toHaveCount(ATTENDUES.length, { timeout: 15_000 });
  for (const [n, a] of ATTENDUES.entries()) {
    const e = etiquettes(page).nth(n);
    await expect.poll(() => visible(e)).toBe(etroit(page) ? a.ini[langue] : a[langue]);
    const g = await e.evaluate((el) => {
      const f = el.parentElement!.getBoundingClientRect(), b = el.getBoundingClientRect();
      return { droite: b.right, gauche: b.left, haut: b.top, fG: f.left, fH: f.top, fh: f.height, fen: Number(el.parentElement!.dataset.jianpuFenetre) };
    });
    expect(g.droite, "l'étiquette reste à gauche de la fenêtre du scan").toBeLessThanOrEqual(g.fG + 0.5);
    expect(g.gauche, "l'étiquette ne sort pas de l'écran").toBeGreaterThanOrEqual(-0.5);
    if (hauteurs) {
      const p = SYSTEMES[a.page];
      const attendu = g.fH + ((p.lignes[a.ligne].y0 - g.fen) / (p.h - g.fen)) * g.fh;
      expect(Math.abs(g.haut - attendu), "à la hauteur de la ligne où la section commence").toBeLessThan(2);
    }
  }
}

for (const langue of ["fr", "zh"] as const) {
  test(`JV-5c, page chant (${langue}) : une étiquette par ligne de début, dans le rail ; le toucher ouvre le volet au bloc du passage`, async ({ page }) => {
    await prefs(page, { zh: langue === "zh" });
    await signInAs(page, LECTRICE, {}, `/songs/${encodeURIComponent(SCAN)}`);
    await scanCharge(page);
    await verifierEtiquettes(page, langue);
    await capture(page, `jv5c-chant-${langue}`);
    for (const n of [0, 2]) {
      await etiquettes(page).nth(n).click();
      await expect(voletOuvert(page)).toBeVisible();
      const bloc = voletOuvert(page).locator("[data-passage-uids]").filter({ has: page.getByRole("heading", { name: ATTENDUES[n].passage[langue] }) }).first();
      await expect(bloc).toBeInViewport({ timeout: 10_000 });
      if (n === 0) await capture(page, `jv5c-chant-volet-${langue}`);
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-idees-harmonie]:not([data-harmonie-colonne])")).toHaveCount(0);
    }
  });
}

test("JV-5c, sans accès harmonie : ni étiquette ni rail, le scan garde sa largeur", async ({ page }) => {
  await prefs(page);
  await signInAs(page, SANS_HARMONIE, {}, `/songs/${encodeURIComponent(SCAN)}`);
  await scanCharge(page);
  await expect(page.locator("[data-jianpu-fenetre]").first()).toBeVisible();
  await expect(etiquettes(page)).toHaveCount(0);
  expect(await page.locator("[data-jianpu-fenetre]").first().evaluate((f) => getComputedStyle(f).overflow)).toBe("hidden");
});

test("JV-5c, vue Partitions : étiquettes du scan, le toucher ouvre le volet au bloc du Refrain", async ({ page }) => {
  await prefs(page);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, LECTRICE, { [SETLIST_DOC]: { ...setlist(), ownerId: "uid-owner", items: [item({ songSlug: SCAN, position: 1 })] } }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await scanCharge(page);
  // Deux volets dès 1 000 px de zone : les fenêtres sont des demi-lignes, seule la hauteur n'est pas recalculée ici.
  await verifierEtiquettes(page, "fr", false);
  await capture(page, "jv5c-partitions-fr");
  await etiquettes(page).nth(1).click();
  await expect(voletOuvert(page)).toBeVisible();
  await expect(voletOuvert(page).locator("[data-passage-uids]").filter({ has: page.getByRole("heading", { name: /^Refrain/ }) }).first()).toBeInViewport({ timeout: 10_000 });
});

for (const langue of ["fr", "zh"] as const) {
  test(`JV-5c, mode louange (${langue}) : réglage allumé, les étiquettes ouvrent le volet sans tourner la page`, async ({ page }) => {
    await prefs(page, { zh: langue === "zh", louange: true, sombre: langue === "zh" });
    await signInAs(page, LECTRICE, { [SETLIST_DOC]: { ...setlist(), ownerId: "uid-owner", items: [item({ songSlug: SCAN, position: 1 })] } }, `/setlists/${SETLIST_ID}`);
    await page.getByRole("button", { name: langue === "zh" ? /敬拜模式/ : /Mode Louange/ }).first().click();
    await attendreMiseEnPage(page);
    await scanCharge(page);
    const premiere = onStage(page, "[data-jianpu-etiquette]").first();
    await expect(premiere).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => visible(premiere)).toBe(etroit(page) ? ATTENDUES[0].ini[langue] : ATTENDUES[0][langue]);
    const g = await premiere.evaluate((el) => ({ d: el.getBoundingClientRect().right, f: el.parentElement!.getBoundingClientRect().left }));
    expect(g.d).toBeLessThanOrEqual(g.f + 0.5);
    await capture(page, `jv5c-louange-${langue}`);
    const avant = await lireCompteur(page);
    await premiere.click();
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    expect(await lireCompteur(page), "le toucher ne tourne pas la page").toBe(avant);
    await capture(page, `jv5c-louange-volet-${langue}`);
  });
}

test("JV-5c, mode louange : réglage éteint, aucune étiquette", async ({ page }) => {
  await prefs(page);
  await signInAs(page, LECTRICE, { [SETLIST_DOC]: { ...setlist(), ownerId: "uid-owner", items: [item({ songSlug: SCAN, position: 1 })] } }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  await scanCharge(page);
  await expect(page.locator("[data-performance-mode] [data-jianpu-page]").first()).toBeVisible();
  // La page de la setlist, dessous, garde les siennes (accès harmonie) : seul le mode louange compte.
  await expect(onStage(page, "[data-jianpu-etiquette]")).toHaveCount(0);
});
