import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { loadChords, openSheet, overlayLabels, songKey } from "./helpers/jianpu";

// 有一位神, signalé par Timothée le 01/10/2026 : « le .cho et le .json ne sont
// pas sur la même gamme ». Le .cho est en D ; le scan est la version « C调 »
// de la gravure (« 共3张：D(原调)、C调、级数 »). Ouvert dans la tonalité du
// .cho, le chant montrait ses paroles en D et son scan en C : les pages ne
// passaient de tonalité jouée au calque que si elle différait de celle du
// .cho, alors que le calque transpose depuis la tonalité GRAVÉE. Quatorze
// scans sont gravés dans une autre tonalité que leur .cho.

const SLUG = "有一位神";
const CHORDS = loadChords()[SLUG];
/** Première rangée gravée (C Em F G7), réécrite en D comme dans le .cho :
 *  « 有一位[D]神，有权能[F#m]创造宇宙万物，也有[G]温柔双手安慰受伤[A]灵魂[A7] ». */
const RANGEE_EN_D = ["D", "F#m", "G", "A7"];

/** Témoin : scan gravé en G, .cho en G. Rien à réécrire, la gravure reste intacte. */
const TEMOIN = "到各山岭去传扬";

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-tonalite-gravee";

const setlist = {
  title: "Culte du 4 octobre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    {
      songSlug: SLUG,
      position: 1,
      keyOverride: null,
      showChords: true,
      showPinyin: true,
      useJianpu: false,
      jianpuSheet: true,
      structureOverride: null,
      sectionNotes: {},
      notes: "",
    },
  ],
};

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

async function ouvrirSetlist(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) =>
    route.fulfill({ status: 200, contentType: "text/csv", body: "" }),
  );
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
}

test.describe("scan gravé dans une autre tonalité que le .cho", () => {
  test("page du chant : dans la tonalité du .cho (D), le scan gravé en C montre ses accords en D", async ({ page }) => {
    await openSheet(page, SLUG);
    await expect(page.locator("[data-jianpu-label]")).toHaveCount(CHORDS.labels.length);
    const { labels } = await overlayLabels(page);
    expect(labels.slice(0, 4).map((l) => l.shown)).toEqual(RANGEE_EN_D);
    await expect(page.locator("[data-jianpu-keylabel]")).toHaveText("1=D");
    await expect(page.getByText("（D调）")).toBeVisible();
    await capture(page, "tonalite-cho-page-chant");
  });

  test("page du chant : scan gravé dans la tonalité du .cho, la gravure reste intacte", async ({ page }) => {
    await openSheet(page, TEMOIN);
    // Le calque arrive par un fetch à part : attendre qu'il soit lu, sinon
    // « aucune étiquette » serait vrai pour une mauvaise raison.
    await page.waitForFunction(() =>
      performance.getEntriesByType("resource").some((e) => e.name.includes("/jianpu/chords.json")),
    );
    await page.waitForTimeout(300);
    await expect(page.locator("[data-jianpu-label]")).toHaveCount(0);
    await expect(page.locator("[data-jianpu-keylabel]")).toHaveCount(0);
  });

  test("setlist, vue partitions : sans tonalité choisie, le scan suit le .cho (D)", async ({ page }) => {
    await ouvrirSetlist(page);
    await page.getByRole("button", { name: "Partitions" }).click();
    await page.locator('[data-jianpu-page="0"] img').waitFor();
    await expect(page.locator("[data-jianpu-label]")).toHaveCount(CHORDS.labels.length);
    const { labels } = await overlayLabels(page);
    expect(labels.slice(0, 4).map((l) => l.shown)).toEqual(RANGEE_EN_D);
  });

  test("mode louange : sans tonalité choisie, le scan suit le .cho (D)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await ouvrirSetlist(page);
    await page.getByRole("button", { name: "Mode louange" }).click();
    await expect(page.getByText("Mise en page…")).toHaveCount(0);
    // Le mode louange rend chaque bloc deux fois (copie de mesure invisible) :
    // les deux copies portent le même calque.
    const visibles = page.locator("[data-performance-mode] [data-jianpu-label]");
    await expect(visibles.first()).toBeAttached();
    const premiers = await visibles.evaluateAll((els) =>
      els.slice(0, 4).map((el) => (el.textContent ?? "").trim()),
    );
    expect(premiers).toEqual(RANGEE_EN_D);
  });
});

// Les quatorze, un par un : sans tonalité demandée, aucun accord écrit ne reste
// dans la tonalité gravée, et le cadre « 1=X » dit celle du .cho. Liste lue dans
// les données, pas recopiée : un nouveau scan gravé ailleurs entre tout seul.
const chords = loadChords();
const graveesAilleurs = Object.keys(chords).filter((slug) => {
  const cho = songKey(slug);
  return cho && chords[slug].printedKey !== cho;
});

// Quatorze le 01/10/2026, onze après le remplacement de trois scans (02/10/2026).
test("la liste des scans gravés dans une autre tonalité que leur .cho n'est pas vide", () => {
  expect(graveesAilleurs.length).toBeGreaterThan(0);
});

/** La page démarre dans la tonalité recommandée s'il y en a une, sinon celle du .cho. */
const recommandee = (slug: string): string | undefined =>
  JSON.parse(readFileSync("public/songs-index.json", "utf8")).songs.find((s: { slug: string }) => s.slug === slug)?.recommendedKey ?? undefined;

for (const slug of graveesAilleurs) {
  const joue = recommandee(slug) ?? songKey(slug)!;
  test(`${slug} — gravé en ${chords[slug].printedKey}, ouvert en ${joue} : tout le calque est réécrit`, async ({ page }) => {
    await openSheet(page, slug);
    await expect(page.locator("[data-jianpu-label]")).toHaveCount(chords[slug].labels.length);
    const { labels } = await overlayLabels(page);
    const ecrites = labels.filter((l) => l.printed.trim() !== "" && l.opt !== "hidden");
    expect(ecrites.filter((l) => l.shown === l.printed).map((l) => l.printed), "accords restés dans la tonalité gravée").toEqual([]);
    const cadre = chords[slug].keyLabel;
    if (cadre && !cadre.c) await expect(page.locator("[data-jianpu-keylabel]")).toHaveText(`1=${joue}`);
  });
}

