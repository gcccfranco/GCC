import { expect, test } from "@playwright/test";

// Une ligne chinoise se coupe colonne par colonne quand elle est trop longue.
// Le texte latin qu'elle contient (« So we say, "Merry Christmas" today » de
// 一同齐声宣扬) ne doit se couper qu'entre deux mots : sur tablette, « say, »
// s'écrivait sur deux rangées (relevé du 27/09, captures du lot 8).

test("一同齐声宣扬 — le texte latin d'une ligne chinoise ne se coupe qu'entre deux mots", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.goto(`/songs/${encodeURIComponent("一同齐声宣扬")}`);
  await page.locator("main.song-zoom [data-copy-line]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);

  // Les colonnes de chaque ligne : leur caractère et la hauteur de leur rangée
  // (les accords et le pinyin de la colonne sont à part, data-copy-ignore).
  const lignes = await page.locator("main.song-zoom [data-copy-line]").evaluateAll((els) =>
    els.map((el) =>
      [...el.querySelectorAll(":scope > span > span")].map((col) => {
        const char = [...col.children].find((c) => !c.hasAttribute("data-copy-ignore"));
        return { c: char?.textContent ?? "", top: Math.round(col.getBoundingClientRect().top) };
      })
    )
  );
  const colonnes = lignes.find((l) => l.map((x) => x.c).join("").includes("Christ"));
  expect(colonnes, "la ligne « So we say, \"Merry Christmas\" today »").toBeTruthy();

  const lettre = (c: string) => /^[A-Za-z'’"-]$/.test(c);
  const coupes = colonnes!
    .map((x, i) => ({ ...x, prev: colonnes![i - 1] }))
    .filter((x) => x.prev && lettre(x.c) && lettre(x.prev.c) && x.top !== x.prev.top)
    .map((x) => `${x.prev!.c}|${x.c}`);
  expect(coupes).toEqual([]);
});
