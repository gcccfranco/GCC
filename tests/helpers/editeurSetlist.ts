import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

/** Éditeur de setlist (lot U5 bis, docs/spec-editeur-setlist.md), « piste 2 ».
 *
 *  Ordinateur et tablette en paysage (T3) : deux colonnes — la setlist à gauche
 *  (liste courte), le volet de l'élément choisi à droite. Téléphone et tablette
 *  en portrait (T4) : la liste en grand, le volet dans une feuille qui s'ouvre
 *  quand on touche un élément (« OK » la ferme), la bibliothèque aussi.
 *  Le volet porte `data-volet` dans les deux cas : les specs passent par ces
 *  fonctions, qui valent pour les deux dispositions. */

/** Projets où l'éditeur est en deux colonnes (fenêtre ≥ 1 054 px barre dépliée,
 *  tablette couchée toujours) ; les autres l'ont en feuilles. */
export const PROJETS_DEUX_COLONNES = ["ordinateur", "tablette-paysage", "ordinateur-1440"];
export const deuxColonnesAttendues = (testInfo: TestInfo) => PROJETS_DEUX_COLONNES.includes(testInfo.project.name);

/** La page affichée est l'éditeur en deux colonnes. À appeler une fois l'éditeur à l'écran. */
export async function enDeuxColonnes(page: Page): Promise<boolean> {
  return (await page.locator("[data-editeur-deux-colonnes]").count()) > 0;
}

/** La liste courte (la setlist). */
export const listeCourte = (page: Page) => page.locator("[data-liste-courte]");

/** Le volet : colonne de droite, ou la feuille ouverte (réglages, choix à fusionner, bibliothèque). */
export const volet = (page: Page) => page.locator("[data-volet]");

/** Attend l'éditeur, une ligne de la liste à l'écran. */
export async function attendreEditeur(page: Page, titre: string): Promise<void> {
  await expect(listeCourte(page).getByRole("button", { name: titre, exact: true })).toBeVisible();
}

/** Ferme la feuille ouverte (feuilles seulement) : Échap, comme le clavier. */
export async function fermerFeuille(page: Page): Promise<void> {
  if (await enDeuxColonnes(page)) return;
  if ((await volet(page).count()) === 0) return;
  await page.keyboard.press("Escape");
  await expect(volet(page)).toHaveCount(0);
}

/** Ouvre les réglages d'un élément en le touchant dans la liste (un chant par son
 *  titre, une fusion « A / B », une transition « Transition »). */
export async function reglerElement(page: Page, titre: string): Promise<void> {
  await fermerFeuille(page);
  await listeCourte(page).getByRole("button", { name: titre, exact: true }).click();
  if (!(await enDeuxColonnes(page))) await expect(volet(page)).toBeVisible();
}

/** Groupe des tonalités d'un chant. */
export const groupeTonalites = (page: Page | Locator, titre: string) =>
  page.getByRole("radiogroup", { name: `Tonalité de ${titre}` });

/** Bouton d'une tonalité dans le groupe : « A », « A orig. », « D reco. »… */
export const boutonTonalite = (groupe: Locator, cle: string) =>
  groupe.getByRole("radio", { name: new RegExp(`^${cle.replace("#", "\\#")}( |$)`) });

/** Choisit la tonalité d'un chant ; `null` = sa tonalité d'origine. */
export async function choisirTonalite(page: Page, titre: string, cle: string | null): Promise<void> {
  await reglerElement(page, titre);
  const groupe = groupeTonalites(page, titre);
  await (cle === null ? groupe.locator("[data-origine]") : boutonTonalite(groupe, cle)).click();
}

/** Ligne d'une section dans « Par section » (attribut `title` sur Note · Nuance · Transition · 升调). */
export const ligneSection = (scope: Page | Locator, nom: string) => {
  const page = "keyboard" in scope ? scope : scope.page();
  return scope.locator("[data-ligne-section]").filter({
    has: page.locator("[data-nom-section]", { hasText: new RegExp(`^\\s*${nom}\\s*$`) }),
  });
};

/** Retire une étape de la structure (réglages du chant ouverts) : sa pastille, puis ✕. */
export async function retirerSection(page: Page, nom: string): Promise<void> {
  await volet(page).getByRole("button", { name: new RegExp(`^${nom},`) }).first().click();
  await volet(page).getByRole("button", { name: `Retirer l'étape ${nom}` }).click();
}

/** Champ « Note du chant ». */
export async function champNoteDuChant(page: Page, titre: string): Promise<Locator> {
  await reglerElement(page, titre);
  return volet(page).getByLabel("Note du chant");
}

/** Retire un chant de la setlist. */
export async function retirerChant(page: Page, titre: string): Promise<void> {
  await reglerElement(page, titre);
  await volet(page).getByRole("button", { name: "Retirer", exact: true }).click();
}

/** Ouvre la bibliothèque (« Ajouter des chants »), si elle ne l'est pas déjà. */
export async function ouvrirBibliotheque(page: Page): Promise<void> {
  if (await volet(page).getByRole("heading", { name: "Ajouter des chants" }).isVisible()) return;
  await fermerFeuille(page);
  await page.locator("[data-ouvrir-bibliotheque]").click();
  await expect(volet(page).getByRole("heading", { name: "Ajouter des chants" })).toBeVisible();
}

/** Champ de recherche de la bibliothèque. */
export const rechercheBibliotheque = (page: Page) => volet(page).getByPlaceholder("Chercher un chant à ajouter…");

/** Bouton « Ajouter <titre> » de la bibliothèque. */
export const boutonAjouter = (page: Page, titre: string) =>
  volet(page).getByRole("button", { name: `Ajouter ${titre}`, exact: true }).first();

/** Ajoute un chant par la bibliothèque, puis rend la page (la feuille se ferme). */
export async function ajouterChant(page: Page, titre: string): Promise<void> {
  await ouvrirBibliotheque(page);
  await rechercheBibliotheque(page).fill(titre);
  await boutonAjouter(page, titre).click();
  await fermerFeuille(page);
}

/** « + Transition » sous la liste. */
export const boutonPlusTransition = (page: Page) => page.locator("[data-ajouter-transition]");

/** Notes de la setlist : « Notes pour l'équipe » (en-tête). */
export const champNotes = (page: Page) => page.getByLabel(/^Notes pour l'équipe/);

/** Menu de la présidence. */
export const champPresidence = (page: Page) => page.getByLabel(/^Présidence$/);
