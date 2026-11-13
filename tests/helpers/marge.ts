import { expect, type Page } from "@playwright/test";

// La marge « Affichage » de la page chant (docs/spec-reglages-unifies.md, RU-3) : ouverte par le bouton de la barre.
export const marge = (page: Page) => page.getByTestId("marge-affichage");

export async function ouvrirMarge(page: Page) {
  const bouton = page.getByTestId("barre-outils").getByRole("button", { name: /^(Affichage|显示)$/ });
  // Un clic avant l'hydratation se perd : on recommence tant que la marge n'est pas ouverte.
  await expect(async () => {
    if ((await marge(page).getAttribute("data-ouvert")) !== "true") await bouton.click();
    await expect(marge(page)).toHaveAttribute("data-ouvert", "true", { timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(marge(page)).toBeVisible();
  await page.waitForTimeout(400); // fin du ressort
}
