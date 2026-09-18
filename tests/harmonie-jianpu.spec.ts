import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { loadChords } from "./helpers/jianpu";

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
};

/** Chant chinois affiché en scan : calque certifié, gravé en G, une page.
 *  Deux rangées d'accords bien séparées — y = 344 (G G7 D) et y = 1163
 *  (Em7 G/D C D G) — de quoi viser un accord et un espace de ligne. */
const SLUG = "到各山岭去传扬";
const CHORDS = loadChords()[SLUG];

const SETLIST_ID = "setlist-jianpu";
const SETLIST_DOC = `setlists/${SETLIST_ID}`;
const VERSION_DOC = `setlists/${SETLIST_ID}/versions/${MUSICIEN.uid}`;

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
  ownerId: "uid-owner",
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
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  const db = await signInAs(page, MUSICIEN, { [SETLIST_DOC]: setlist(), ...docs }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: "Partitions" }).click();
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

/** Pavé d'accord de la feuille : fondamentale, altération, qualité, valider. */
async function pave(page: Page, ...touches: string[]) {
  const feuille = page.getByRole("dialog");
  for (const nom of touches) await feuille.getByRole("button", { name: nom, exact: true }).click();
  await feuille.getByRole("button", { name: "Valider l'accord" }).click();
}

/** Dernier état des items écrit dans la setlist. */
function itemsEcrits(db: { writes: { path: string; data: Record<string, unknown> }[] }) {
  const last = db.writes.filter((w) => w.path === SETLIST_DOC).at(-1);
  return (last?.data.items ?? []) as Record<string, unknown>[];
}

const scanItem = (db: Parameters<typeof itemsEcrits>[0]) => itemsEcrits(db)[1];

test("Adapter : toucher un accord imprimé le change, et l'historique le dit", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Adapter" }).click();
  // Étiquette 0 : « G » gravé en haut à gauche (x 80, y 344).
  await toucher(page, 90, 356);
  await capture(page, "jianpu-pave");
  await pave(page, "E", "m7");

  const retouche = page.locator('[data-jianpu-retouche="0"]');
  await expect(retouche).toHaveText("Em7");
  await capture(page, "jianpu-accord-change");

  expect(scanItem(db).jianpuChords).toEqual({ changed: { "0": "Em7" } });

  // Même phrase que les autres retouches d'Adapter.
  await page.getByRole("button", { name: /Modifiée par Ruth K\./ }).click();
  const histoire = page.getByRole("dialog", { name: "Historique des modifications" });
  await expect(histoire.getByText(`Adaptation de ${SLUG} modifiée (accords ou paroles)`)).toBeVisible();
});

test("Adapter : un accord touché puis effacé disparaît du scan", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Adapter" }).click();
  // Étiquette 1 : « G7 » (x 638, y 344).
  await toucher(page, 655, 356);
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer l'accord" }).click();

  await expect(page.locator('[data-jianpu-retouche="1"]')).toHaveText("");
  await capture(page, "jianpu-accord-efface");
  expect(scanItem(db).jianpuChords).toEqual({ changed: { "1": "" } });
});

test("Adapter : toucher la ligne d'accords en ajoute un à la hauteur des autres", async ({ page }) => {
  // Setlist jouée en A : le calque est entièrement écrit, l'accord ajouté doit
  // s'aligner sur ses voisins gravés.
  const db = await openPartitions(page, { [SETLIST_DOC]: setlist({ keyOverride: "A" }) });
  await page.getByRole("button", { name: "Adapter" }).click();
  // Rangée du bas (y 1163), entre le « C » (x 662) et le « D » (x 920).
  await toucher(page, 800, 1176);
  await pave(page, "A");

  const ajout = page.locator('[data-jianpu-ajout="0"]');
  await expect(ajout).toHaveText("A");
  const voisin = page.locator('[data-jianpu-label="C"]');
  const [a, v] = [await ajout.boundingBox(), await voisin.boundingBox()];
  expect(Math.abs(a!.y - v!.y), "accord ajouté à la hauteur de sa ligne").toBeLessThan(3);
  await capture(page, "jianpu-accord-ajoute");

  // Stocké en tonalité d'origine (G) : A jouée en A s'écrit G sur la gravure.
  expect(scanItem(db).jianpuChords).toEqual({ added: [{ page: 0, x: 800, y: 1163, c: "G" }] });
});

test("retouche transposée : saisie dans la tonalité jouée, stockée dans celle de la gravure", async ({ page }) => {
  const db = await openPartitions(page, { [SETLIST_DOC]: setlist({ keyOverride: "A" }) });
  await page.getByRole("button", { name: "Adapter" }).click();
  // Le « G » gravé s'affiche « A » : on le remplace par F#m, qui vaut Em en G.
  await expect(page.locator('[data-jianpu-label="G"]').first()).toHaveText("A");
  await toucher(page, 90, 356);
  await pave(page, "F", "♯", "m");

  await expect(page.locator('[data-jianpu-retouche="0"]')).toHaveText("F#m");
  expect(scanItem(db).jianpuChords).toEqual({ changed: { "0": "Em" } });
  await capture(page, "jianpu-retouche-transposee");
});

test("Ma version : même geste, écrit dans mon document et jamais dans la setlist", async ({ page }) => {
  const db = await openPartitions(page);
  await page.getByRole("button", { name: "Ma version" }).click();
  await toucher(page, 90, 356);
  await pave(page, "C");

  await expect(page.locator('[data-jianpu-retouche="0"]')).toHaveText("C");
  await capture(page, "jianpu-ma-version");

  const miennes = db.writes.filter((w) => w.path === VERSION_DOC);
  expect(miennes.length).toBeGreaterThan(0);
  const items = miennes.at(-1)!.data.items as Record<string, { jianpuChords: unknown }>;
  expect(items[SLUG].jianpuChords).toEqual({ changed: { "0": "C" } });
  expect(
    db.writes.filter((w) => w.path === SETLIST_DOC || w.path.startsWith(`${SETLIST_DOC}/history`)),
    "la setlist et son historique ne bougent pas",
  ).toHaveLength(0);
});

test("hors Adapter et Ma version : les retouches s'affichent, rien ne se touche", async ({ page }) => {
  await openPartitions(page, {
    [SETLIST_DOC]: setlist({ jianpuChords: { changed: { "0": "Em7" } } }),
  });
  await expect(page.locator('[data-jianpu-retouche="0"]')).toHaveText("Em7");
  await expect(page.locator("[data-jianpu-retouche-zone]")).toHaveCount(0);
  await capture(page, "jianpu-lecture-seule");
});
