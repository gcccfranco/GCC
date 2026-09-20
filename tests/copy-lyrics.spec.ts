import { expect, test, type Page } from "@playwright/test";

// La régie copie les paroles vers PowerPoint ou Canva. Le texte doit arriver
// ligne par ligne, sans accords, **quel que soit l'endroit où la sélection
// commence** : dans une setlist, elle part souvent du numéro du chant, qui est
// hors du chant. La page chant reproduit ce cas en partant du haut de la page.
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

async function copyFromPageTopToSongEnd(page: Page, slug: string) {
  await page.goto(`/songs/${encodeURIComponent(slug)}`);
  await page.locator("h1").first().waitFor();
  await page.locator("[data-copy-line]").first().waitFor();
  // Le copieur de paroles s'abonne à « copy » au montage : copier avant que
  // React ait hydraté la page donnerait la copie brute du navigateur.
  await page.waitForFunction(() => {
    const button = document.querySelector("button");
    return !!button && Object.keys(button).some((k) => k.startsWith("__reactProps"));
  });
  await page.evaluate(() => {
    const lines = document.querySelectorAll("[data-copy-line]");
    const r = document.createRange();
    r.setStart(document.body, 0);
    r.setEndAfter(lines[lines.length - 1]);
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
  });
  await page.keyboard.press("ControlOrMeta+c");
  return page.evaluate(async () => {
    const out: Record<string, string> = {};
    for (const item of await navigator.clipboard.read())
      for (const type of item.types) out[type] = await (await item.getType(type)).text();
    return out;
  });
}

test("chant FR : une ligne de chant par ligne copiée, sans accords", async ({ page }) => {
  const clip = await copyFromPageTopToSongEnd(page, "abba-pere");
  const lines = clip["text/plain"].split("\n");
  expect(lines).toContain("Bien avant le chant qui créa l'univers,");
  expect(lines).toContain("Tu rêvais du jour où Tu pourrais m'aimer.");
  expect(lines, "pas d'accord copié").not.toContain("F#m");
  expect(lines, "pas de nom de section").not.toContain("Couplet 1");
  expect(lines).not.toContain("Refrain");
  expect(clip["text/html"], "pas de HTML mis en page : PowerPoint le colle d'un bloc").toBeUndefined();
});

test("un morceau d'une seule ligne se copie sans ses accords", async ({ page }) => {
  await page.goto("/songs/abba-pere");
  const line = page.locator("[data-copy-line]", { hasText: "créa l'uni" }).first();
  await line.waitFor();
  await line.evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
  });
  await page.keyboard.press("ControlOrMeta+c");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBe("Bien avant le chant qui créa l'univers,");
});

test("chant ZH : caractères puis pinyin, ligne par ligne, sans accords ni sections", async ({ page }) => {
  const clip = await copyFromPageTopToSongEnd(page, "爱的约定");
  const lines = clip["text/plain"].split("\n");
  const at = lines.indexOf("两千年前的夜晚， 耶稣降生在伯利恒。");
  expect(at, "ligne de caractères copiée").toBeGreaterThanOrEqual(0);
  expect(lines[at + 1], "sa ligne de pinyin juste dessous").toBe(
    "liǎng qiān nián qián de yè wǎn yē sū jiàng shēng zài bó lì héng",
  );
  expect(lines).toContain("使爱和恩典被彰显。");
  expect(lines).not.toContain("主歌 1");
  expect(clip["text/html"]).toBeUndefined();
});

test("chant ZH : le pinyin est copié même masqué à l'écran", async ({ page }) => {
  await page.goto(`/songs/${encodeURIComponent("爱的约定")}`);
  const line = page.locator("[data-copy-line]", { hasText: "两" }).first();
  await line.waitFor();
  // Masque le pinyin à l'écran : la régie en a quand même besoin.
  await page.getByRole("button", { name: "Pinyin" }).click();
  await expect(line).not.toContainText("liǎng");
  await line.evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
  });
  await page.keyboard.press("ControlOrMeta+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "两千年前的夜晚， 耶稣降生在伯利恒。\nliǎng qiān nián qián de yè wǎn yē sū jiàng shēng zài bó lì héng",
  );
});
