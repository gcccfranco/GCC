import { expect, type Page } from "@playwright/test";

/** Page affichée du mode louange : sans la page setlist restée dessous, ni la
 *  copie invisible qui sert à mesurer les hauteurs (elle contient aussi des
 *  `[data-jianpu-page]` et des `[data-section]`). */
export const onStage = (page: Page, selector: string) =>
  page.locator(`[data-performance-mode] ${selector}:not([aria-hidden=true] *)`);

/** Le mode louange s'ouvre sur « Mise en page… » le temps de charger les polices
 *  (les chinoises sont lourdes) et de mesurer : sous charge, plusieurs secondes.
 *  Vérifier l'absence du texte juste après le clic passait avant même qu'il
 *  n'apparaisse, et le test suivant attendait la page 5 s seulement (suite
 *  complète du 11/10/2026). On attend donc le mode louange, puis sa mise en page. */
export async function attendreMiseEnPage(page: Page) {
  await page.locator("[data-performance-mode]").waitFor();
  await expect(page.getByText("Mise en page…")).toHaveCount(0, { timeout: 20_000 });
}

/** Ouvre les Réglages du mode louange. La barre reste ouverte jusqu'à un
 *  toucher au centre, qui la montre ou la cache : si le bouton n'est pas
 *  visible on la rappelle, et on clique jusqu'à ce que la fenêtre s'ouvre. */
export async function ouvrirReglages(page: Page) {
  const bouton = page.getByRole("button", { name: "Réglages" });
  const reglages = page.getByRole("dialog", { name: "Réglages" });
  await expect(async () => {
    if (!(await bouton.isVisible())) {
      const ecran = page.viewportSize()!;
      await page.mouse.click(ecran.width / 2, ecran.height / 2);
    }
    await bouton.click({ timeout: 2_000 });
    await expect(reglages).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return reglages;
}
