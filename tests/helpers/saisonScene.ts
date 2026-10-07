import { expect, test, type Locator, type Page } from "@playwright/test";
import { estGrandEcran, estTelephone } from "./agencement";

// La saison de la scène au Back-Office (docs/spec-scene-paques-noel.md, Q22, P9) : la carte
// entière sur tablette et grands écrans ; sur téléphone, un résumé dont chaque ligne ouvre une
// feuille avec ce réglage seul.

export type ReglageSaison = "Jour J" | "Réservations" | "Jours et plages" | "Un créneau dure" | "Qui peut réserver";

/** Le résumé de la saison (téléphone). */
export const resumeSaison = (page: Page) => page.getByRole("list", { name: "Réglages de la saison" });

/** Où se règle `titre` : la carte de la saison, ou, sur téléphone, la feuille de ce réglage
 *  (une feuille déjà ouverte se ferme d'abord). Dans les deux cas, la région « Mettre en place
 *  la saison ». */
export async function reglageSaison(page: Page, titre: ReglageSaison): Promise<Locator> {
  const carte = page.getByRole("region", { name: "Mettre en place la saison" });
  if (!estTelephone(test.info())) return carte;
  const feuille = page.getByRole("dialog");
  await fermerFeuille(page);
  await resumeSaison(page).getByRole("button", { name: new RegExp(`^${titre}`) }).click();
  await expect(feuille.getByRole("heading", { name: titre, exact: true })).toBeVisible();
  return feuille.getByRole("region", { name: "Mettre en place la saison" });
}

/** Referme la feuille ouverte, s'il y en a une (elle cache le reste de la page aux lecteurs d'écran). */
export async function fermerFeuille(page: Page) {
  const feuille = page.getByRole("dialog");
  if (!(await feuille.count())) return;
  await page.keyboard.press("Escape");
  await expect(feuille).toHaveCount(0);
}

/** « Toutes les réservations » : l'entrée de la colonne en deux volets ; sur une colonne (P9), la
 *  vue par défaut d'une saison ouverte est « Cette semaine » et le tableau s'ouvre en page. */
export async function versToutesLesReservations(page: Page) {
  await fermerFeuille(page);
  if (estGrandEcran(test.info())) {
    await page.getByRole("region", { name: "Cette fête" }).getByRole("button", { name: /^Toutes les réservations/ }).click();
  } else {
    // `/back-office/evenements/scene` mène d'abord à la fête : on part de son adresse.
    await page.waitForURL(/\/scene\/(paques|noel)/);
    const adresse = new URL(page.url());
    adresse.searchParams.set("vue", "reservations");
    adresse.searchParams.delete("semaine");
    await page.goto(adresse.pathname + adresse.search);
  }
  await expect(page.getByRole("table")).toBeVisible();
}
