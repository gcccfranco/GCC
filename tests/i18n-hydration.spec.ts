import { expect, test, type Page } from "@playwright/test";

// Langue 中文 mémorisée sur l'appareil : le serveur rend la page en français,
// le navigateur bascule ensuite. Les parties sous <Suspense> (connexion, page
// du chant) s'hydratent plus tard que la racine : elles ne doivent pas lire
// la nouvelle langue avant d'être hydratées (erreur « Hydration failed »).

function collectHydrationErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message.split("\n")[0]));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text().split("\n")[0]);
  });
  return errors;
}

for (const [path, zhText] of [
  ["/login", "GCC 敬拜诗歌"],
  ["/songs/abba-pere", "诗歌"],
] as const) {
  test(`${path} en 中文 : pas d'erreur d'hydratation, page affichée en chinois`, async ({ page }) => {
    const errors = collectHydrationErrors(page);
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.goto(path);
    // Texte visible, ou nom accessible d'un bouton réduit à son icône (téléphone).
    await expect(page.getByText(zhText, { exact: true }).filter({ visible: true }).or(page.getByRole("link", { name: zhText, exact: true })).first()).toBeVisible();
    await page.waitForTimeout(1000);
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  });
}

test("le bouton de langue bascule en 中文, est retenu au rechargement, et revient en français", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  await expect(page.getByText("GCC Louange", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "切换为中文" }).click();
  await expect(page.getByText("GCC 敬拜诗歌", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("i18nextLng"))).toBe("zh-CN");

  await page.reload();
  await expect(page.getByText("GCC 敬拜诗歌", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Changer en français" }).click();
  await expect(page.getByText("GCC Louange", { exact: true }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});
