import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { formatSectionName, parseChordPro } from "../src/lib/chordpro/parser";
import { halfStepUp, loadChords, openSheet } from "./helpers/jianpu";

// Chantier « Nouveau chant » (docs/spec-guidelines-cho.md) : un chant qu'on
// vient d'ajouter, contrôlé tel que le navigateur le rend, sur les trois
// appareils. Paramétré par le slug :
//   PW_CHANT=<slug> npm test -- tests/nouveau-chant.spec.ts
// Sans la variable, tout est ignoré. Les captures vont dans
// test-results/nouveau-chant/<slug>-<appareil>.png, à regarder à l'œil.

const ROOT = path.resolve(__dirname, "..");
const CAPTURES = path.join(ROOT, "test-results", "nouveau-chant");
const slug = process.env.PW_CHANT ?? "";

/** Le `.cho` lu sur le disque, par le parseur du site. */
const ast = slug
  ? parseChordPro(fs.readFileSync(path.join(ROOT, "content/songs", `${slug}.cho`), "utf8"))
  : null;
const sections = ast?.sections ?? [];
const key = ast?.metadata.key ?? "";

/** Les libellés que la page doit écrire : ceux du site, en français (la
 *  langue par défaut), calculés par la fonction même qu'elle utilise. */
const fr = JSON.parse(fs.readFileSync(path.join(ROOT, "src/locales/fr.json"), "utf8"));
const attendus = sections.map((s) => formatSectionName(s, fr));

/** Les accords du `.cho`, chacun une fois. `[ ]` (espaceur) n'en est pas un. */
const accords = [
  ...new Set(
    sections.flatMap((s) =>
      s.lines.flatMap((l) => l.tokens.filter((t) => t.type === "chord").map((t) => t.value.trim()))
    )
  ),
].filter(Boolean);

/** Un demi-ton au-dessus : la tonalité où aucun accord ne garde son nom.
 *  Table indépendante du code testé (helpers/jianpu). Une tonalité hors des
 *  douze (« Am ») n'y est pas : le contrôle est alors ignoré, pas inventé. */
const up = (() => {
  try {
    return halfStepUp(key);
  } catch {
    return null;
  }
})();

/** Ouvre le chant dans une tonalité donnée. La page lit `key` en JSON
 *  (`safeParseParam`) et l'applique après l'hydratation : on attend que le
 *  sélecteur la porte, les accords étant rendus dans le même passage. Sans
 *  `key`, un chant à tonalité recommandée démarrerait transposé — on vise
 *  toujours la tonalité explicitement, l'originale comprise. */
async function ouvrir(page: Page, tonalite: string) {
  const query = `?key=${encodeURIComponent(JSON.stringify(tonalite))}`;
  await page.goto(`/songs/${encodeURIComponent(slug)}${query}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("select").first()).toHaveValue(tonalite);
}

/** Libellés des sections affichées, dans l'ordre — le texte tel que la page
 *  l'écrit (`textContent`), avant la capitale que la CSS lui ajoute. */
const libelles = (page: Page) =>
  page
    .locator("main.song-zoom [data-section] > div:first-child > span:last-child")
    .evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()));

/** Les accords rendus dans les sections, dans l'ordre du document. Chaque
 *  colonne d'une ligne ouvre sur un span `data-copy-ignore` qui porte
 *  l'accord — ou, sans accord, un blanc (`ChordLine`, français) ou un « x »
 *  invisible (`ZhLine`, chinois) : on ne garde que ce qui se lit. Seule la
 *  ligne française écrit `.font-chord` ; cette forme-ci vaut pour les deux. */
const accordsRendus = (page: Page) =>
  page
    .locator("main.song-zoom [data-section] [data-copy-line] span[data-copy-ignore]:first-child")
    .evaluateAll((els) =>
      els
        .filter((e) => getComputedStyle(e).visibility !== "hidden")
        .map((e) => (e.textContent ?? "").trim())
        .filter(Boolean)
    );

/** Capture pleine page, une par appareil. Après les animations : prise
 *  pendant le fondu d'entrée (`.page-fade`), elle montre tout délavé. */
async function capture(page: Page, nom: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: path.join(CAPTURES, `${nom}-${test.info().project.name}.png`), fullPage: true });
}

test.describe(`nouveau chant : ${slug || "(PW_CHANT absent)"}`, () => {
  test.skip(!ast, "PW_CHANT absent — PW_CHANT=<slug> npm test -- tests/nouveau-chant.spec.ts");

  test(`${slug} — les libellés de sections sont ceux du .cho`, async ({ page }) => {
    await ouvrir(page, key);
    await expect.poll(() => libelles(page)).toEqual(attendus);
  });

  test(`${slug} — chaque accord du .cho est rendu`, async ({ page }) => {
    await ouvrir(page, key);
    const rendus = new Set(await accordsRendus(page));
    const absents = accords.filter((a) => !rendus.has(a));
    expect(absents).toEqual([]);
  });

  test(`${slug} — un demi-ton au-dessus (${up ?? "?"}), aucun accord ne garde son nom`, async ({ page }) => {
    test.skip(!up, `tonalité « ${key} » hors des douze : contrôle non applicable`);
    await ouvrir(page, key);
    const originaux = await accordsRendus(page);
    // Une liste vide ferait passer le contrôle sans rien contrôler.
    expect(originaux.length).toBeGreaterThan(0);
    await ouvrir(page, up!);
    const transposes = await accordsRendus(page);
    expect(transposes).toHaveLength(originaux.length);
    // Même document, même ordre : on compare position par position.
    const restes = originaux.filter((c, i) => transposes[i] === c);
    expect(restes).toEqual([]);
  });

  test(`${slug} — capture pleine page`, async ({ page }) => {
    await ouvrir(page, key);
    await capture(page, slug);
  });

  test(`${slug} — la partition 简谱 s'affiche`, async ({ page }) => {
    test.skip(!(slug in loadChords()), `pas d'entrée « ${slug} » dans public/jianpu/chords.json`);
    const pages = await openSheet(page, slug);
    await expect(pages.first().locator("img")).toBeVisible();
    await capture(page, `${slug}-jianpu`);
  });
});
