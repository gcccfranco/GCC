import type { Page } from "@playwright/test";

/** Une entrée du menu « ⋯ » de la page d'une setlist (dimanche-16 : lien de la présentation et export FreeShow y vivent). */
export async function cliquerMenuSetlist(page: Page, nom: string | RegExp) {
  await page.getByRole("button", { name: "Plus d'actions" }).first().click();
  await page.getByRole("menuitem", { name: nom }).click();
}
