import { expect, test, type Page } from "@playwright/test";

// Une alternative `[X (Y)]` (01 : « l'accord principal, puis l'alternative
// entre parenthèses ») se transpose en entier : `[D (Bm)]` un ton plus haut
// s'écrit « E (C#m) », pas « E (Bm) » — l'alternative restait dans
// l'ancienne tonalité (relevé du 27/09, rapport final).

/** Ouvre un chant dans une tonalité donnée, paroles affichées (pas le scan). */
async function ouvrir(page: Page, slug: string, tonalite: string) {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.goto(`/songs/${encodeURIComponent(slug)}?key=${encodeURIComponent(JSON.stringify(tonalite))}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("select").first()).toHaveValue(tonalite);
}

/** Les accords rendus dans les sections, dans l'ordre du document. */
const accordsRendus = (page: Page) =>
  page
    .locator("main.song-zoom [data-section] [data-copy-line] span[data-copy-ignore]:first-child")
    .evaluateAll((els) =>
      els
        .filter((e) => getComputedStyle(e).visibility !== "hidden")
        .map((e) => (e.textContent ?? "").trim())
        .filter(Boolean)
    );

for (const { slug, de, vers, attendu } of [
  { slug: "谢谢你成为我的家", de: "D", vers: "E", attendu: "B7 (B/D#)" },
  { slug: "定睛在耶稣身上", de: "C", vers: "D", attendu: "D (Bm)" },
  { slug: "parfaitement-imparfait", de: "Ab", vers: "Bb", attendu: "Dm7 (F)" },
]) {
  test(`${slug} — de ${de} à ${vers}, l'alternative entre parenthèses est transposée aussi (« ${attendu} »)`, async ({ page }) => {
    await ouvrir(page, slug, vers);
    await expect.poll(() => accordsRendus(page)).toContain(attendu);
  });
}
