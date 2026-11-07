import { expect, type Page } from "@playwright/test";

/** Une entrée du menu « ⋯ » de la page d'une setlist (dimanche-16 : lien de la présentation et export FreeShow y vivent). */
export async function cliquerMenuSetlist(page: Page, nom: string | RegExp) {
  await page.getByRole("button", { name: "Plus d'actions" }).first().click();
  await page.getByRole("menuitem", { name: nom }).click();
}

/** « Adapter » ou « Ma version » de la page d'une setlist : dans la barre, ou dans le menu « ⋯ » sous 431 px de fenêtre
 *  (lot CD, T4a, dimanche-15 : libellés de 12 px et pastilles à 8 px de marge, la barre ne tient plus sur un téléphone
 *  en portrait). Le seuil suit le CSS (`max-[430px]:hidden` / `min-[431px]:hidden`). */
export async function basculerMode(page: Page, nom: "Adapter" | "Ma version") {
  if (page.viewportSize()!.width >= 431) {
    await page.getByRole("button", { name: nom }).click();
    return;
  }
  await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).first().click();
  await page.getByRole("menuitemcheckbox", { name: nom }).click();
}

/** « Adapter » ou « Ma version » est offert (et, avec `actif`, dans cet état) : le bouton de la barre dès 431 px, sinon
 *  l'entrée du menu « ⋯ », refermé ensuite. */
export async function verifierMode(page: Page, nom: "Adapter" | "Ma version", actif?: boolean) {
  if (page.viewportSize()!.width >= 431) {
    const bouton = page.getByRole("button", { name: nom });
    await expect(bouton).toBeVisible();
    if (actif !== undefined) await expect(bouton).toHaveAttribute("aria-pressed", String(actif));
    return;
  }
  await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).first().click();
  const entree = page.getByRole("menuitemcheckbox", { name: nom });
  await expect(entree).toBeVisible();
  if (actif !== undefined) await expect(entree).toHaveAttribute("aria-checked", String(actif));
  await page.keyboard.press("Escape");
}
