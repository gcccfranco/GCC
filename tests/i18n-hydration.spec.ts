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
  ["/login", "GCC 敬拜"],
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

// Lot U4 : sur ordinateur, la navbar est masquée (barre latérale) mais reste montée : on lit le texte qu'on voit.
test("le bouton de langue bascule en 中文, est retenu au rechargement, et revient en français", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login");
  // eglise-11 : sur /login, plus de « Connexion » dans la barre latérale ; « FR » glisse sous le badge de
  // développement de Next (absent en ligne), qui intercepterait le clic.
  const sansBadgeDev = () => page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await sansBadgeDev();
  await expect(page.getByText("GCC Louange", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "切换为中文" }).click();
  await expect(page.getByText("GCC 敬拜", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("i18nextLng"))).toBe("zh-CN");

  await page.reload();
  await expect(page.getByText("GCC 敬拜", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await sansBadgeDev();

  await page.getByRole("button", { name: "Changer en français" }).click();
  await expect(page.getByText("GCC Louange", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

// Visiteur sans compte sur téléphone : pas de page « Moi », le thème reste dans la barre du haut (Timothée, 21/11/2026).
test("téléphone : le visiteur a le thème dans la barre, qui bascule `dark` ; la barre tient à 360 et 412 px", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "propre au téléphone : ailleurs, la barre latérale ou le bouton existent déjà");
  await page.goto("/songs");
  const barre = page.locator("header");
  const theme = barre.getByRole("button", { name: /^(Mode sombre|Mode clair)$/ });
  const langue = barre.getByRole("button", { name: /^(Changer en français|切换为中文)$/ });
  const connexion = barre.getByRole("link", { name: "Connexion", exact: true });
  const mot = connexion.getByText("Connexion", { exact: true });
  for (const largeur of [360, 412, 430]) {
    await page.setViewportSize({ width: largeur, height: 740 });
    await expect(theme).toBeVisible();
    const cc = (await connexion.boundingBox())!;
    expect(cc.x + cc.width, `connexion à ${largeur} px`).toBeLessThanOrEqual(largeur - 8);
    expect(cc.height, "une seule ligne").toBeLessThanOrEqual(44);
    for (const b of [theme, langue]) {
      const r = (await b.boundingBox())!;
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(largeur);
    }
    if (largeur < 430) await expect(mot).toBeHidden();
    else await expect(mot).toBeVisible();
  }
  const dark = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
  await theme.click();
  await expect(page.locator("html")).toHaveClass(dark ? /^(?!.*\bdark\b)/ : /\bdark\b/);
});
