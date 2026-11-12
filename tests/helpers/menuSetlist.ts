import { expect, type Page } from "@playwright/test";

/** Une entrée du menu « ⋯ » de la page d'une setlist (dimanche-16 : lien de la présentation et export FreeShow y vivent). */
export async function cliquerMenuSetlist(page: Page, nom: string | RegExp) {
  await page.getByRole("button", { name: "Plus d'actions" }).first().click();
  await page.getByRole("menuitem", { name: nom }).click();
}

/** Le « Crayon » de la page d'une setlist (MP-3 : il remplace « Adapter » et « Ma version »), dans la barre ou, sous 431 px
 *  de fenêtre, dans le menu « ⋯ » (lot CD, T4a, dimanche-15 : la barre ne tient plus sur un téléphone en portrait). Le
 *  seuil suit le CSS (`max-[430px]:hidden` / `min-[431px]:hidden`). Les anciens noms sont acceptés : ils visent le Crayon. */
export type NomMode = "Crayon" | "Adapter" | "Ma version";
export async function basculerMode(page: Page, _nom: NomMode = "Crayon") {
  void _nom;
  if (page.viewportSize()!.width >= 431) {
    await page.getByRole("button", { name: "Crayon", exact: true }).click();
    return;
  }
  await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).first().click();
  await page.getByRole("menuitemcheckbox", { name: "Crayon" }).click();
}

/** Le Crayon est offert (et, avec `actif`, dans cet état) : le bouton de la barre dès 431 px, sinon l'entrée du menu « ⋯ »,
 *  refermé ensuite. */
export async function verifierMode(page: Page, _nom: NomMode = "Crayon", actif?: boolean) {
  void _nom;
  if (page.viewportSize()!.width >= 431) {
    const bouton = page.getByRole("button", { name: "Crayon", exact: true });
    await expect(bouton).toBeVisible();
    if (actif !== undefined) await expect(bouton).toHaveAttribute("aria-pressed", String(actif));
    return;
  }
  await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).first().click();
  const entree = page.getByRole("menuitemcheckbox", { name: "Crayon" });
  await expect(entree).toBeVisible();
  if (actif !== undefined) await expect(entree).toHaveAttribute("aria-checked", String(actif));
  await page.keyboard.press("Escape");
}

/** Qui règle le culte (`canEditSetlist`) choisit, à « Enregistrer », Pour moi ou Pour tout le culte : on choisit, puis on enregistre. */
export async function choisirDestination(page: Page, destination: "moi" | "culte") {
  const feuille = page.locator("[data-choix-destination]");
  await expect(feuille).toBeVisible();
  await feuille.getByRole("radio", { name: destination === "moi" ? /^Pour moi/ : /^Pour tout le culte/ }).check();
  await feuille.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(feuille).toBeHidden();
}
