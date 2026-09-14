import { expect, test } from "@playwright/test";

// Pinyin agrandi (0,6 → 0,7 × la taille de base, décision du 13/09/2026) :
// une colonne chinoise mesure au moins 1,6 em, mais une syllabe longue
// (« chuàng », « shuāng ») la déborde et venait toucher sa voisine
// (« quánnéngchuàng »). Un espace doit rester visible entre deux pinyins.
test("chant ZH : un espace reste visible entre deux pinyins voisins", async ({ page }) => {
  await page.goto(`/songs/${encodeURIComponent("有一位神")}`);
  await page.locator("[data-copy-pinyin]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);

  const collisions = await page.evaluate(() => {
    const out: { between: string; gap: number; min: number }[] = [];
    for (const line of document.querySelectorAll("[data-copy-pinyin]")) {
      // Encre du texte (Range), pas la boîte du span : c'est ce qui se lit.
      const syllables = Array.from(line.children).flatMap((col) => {
        const py = col.lastElementChild as HTMLElement | null;
        const text = py?.firstChild;
        if (!py?.hasAttribute("data-copy-ignore") || !text || !py.textContent?.trim()) return [];
        const range = document.createRange();
        range.selectNodeContents(text);
        const r = range.getBoundingClientRect();
        return [{ text: py.textContent.trim(), left: r.left, right: r.right, top: r.top, size: parseFloat(getComputedStyle(py).fontSize) }];
      });
      for (let i = 1; i < syllables.length; i++) {
        const [a, b] = [syllables[i - 1], syllables[i]];
        if (Math.abs(a.top - b.top) > 2) continue; // passage à la ligne
        const gap = b.left - a.right;
        const min = a.size * 0.2;
        if (gap < min) out.push({ between: `${a.text} ${b.text}`, gap: Math.round(gap * 10) / 10, min: Math.round(min * 10) / 10 });
      }
    }
    return out;
  });

  expect(collisions, "pinyins collés").toEqual([]);
});
