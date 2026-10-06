import type { Locator, Page, TestInfo } from "@playwright/test";

/** Éditeur de setlist (lot U5 bis, docs/spec-editeur-setlist.md).
 *
 *  T3 : sur ordinateur et tablette en paysage, l'éditeur est en deux colonnes —
 *  la setlist à gauche (liste courte), les réglages de l'élément choisi à droite.
 *  Téléphone et tablette en portrait gardent la page d'aujourd'hui jusqu'à T4 :
 *  réglages dépliés dans chaque ligne, `<select>` de tonalité, « Structure ».
 *  Les specs passent par ces fonctions plutôt que par les contrôles eux-mêmes :
 *  elles valent pour les deux pages. */

/** Projets où l'éditeur est en deux colonnes (fenêtre ≥ 1 054 px barre dépliée,
 *  tablette couchée toujours) ; les autres gardent la page d'aujourd'hui en T3. */
export const PROJETS_DEUX_COLONNES = ["ordinateur", "tablette-paysage", "ordinateur-1440"];
export const deuxColonnesAttendues = (testInfo: TestInfo) => PROJETS_DEUX_COLONNES.includes(testInfo.project.name);

/** La page affichée est l'éditeur en deux colonnes. À appeler une fois l'éditeur à l'écran. */
export async function enDeuxColonnes(page: Page): Promise<boolean> {
  return (await page.locator("[data-editeur-deux-colonnes]").count()) > 0;
}

/** La liste courte (colonne de gauche). */
export const listeCourte = (page: Page) => page.locator("[data-liste-courte]");

/** Le volet de droite (réglages, choix à fusionner, bibliothèque). */
export const volet = (page: Page) => page.locator("[data-volet]");

/** Ouvre les réglages d'un élément : en deux colonnes, le touche dans la liste
 *  (un chant par son titre, une fusion « A / B », une transition « Transition »).
 *  Sur la page d'aujourd'hui, rien : ses réglages sont dans sa ligne. */
export async function reglerElement(page: Page, titre: string): Promise<void> {
  if (!(await enDeuxColonnes(page))) return;
  await listeCourte(page).getByRole("button", { name: titre, exact: true }).click();
}

/** Groupe des tonalités d'un chant (deux colonnes). */
export const groupeTonalites = (page: Page | Locator, titre: string) =>
  page.getByRole("radiogroup", { name: `Tonalité de ${titre}` });

/** Bouton d'une tonalité dans le groupe : « A », « A orig. », « D reco. »… */
export const boutonTonalite = (groupe: Locator, cle: string) =>
  groupe.getByRole("radio", { name: new RegExp(`^${cle.replace("#", "\\#")}( |$)`) });

/** Choisit la tonalité d'un chant ; `null` = sa tonalité d'origine. */
export async function choisirTonalite(page: Page, titre: string, cle: string | null): Promise<void> {
  if (await enDeuxColonnes(page)) {
    await reglerElement(page, titre);
    const groupe = groupeTonalites(page, titre);
    await (cle === null ? groupe.locator("[data-origine]") : boutonTonalite(groupe, cle)).click();
    return;
  }
  await page.getByLabel(`Tonalité de ${titre}`).selectOption(cle ?? "");
}

/** Montre la structure d'un chant (ou du chant d'une fusion, `scope`) : la page
 *  d'aujourd'hui la replie derrière « Structure » ; le volet la montre toujours. */
export async function ouvrirStructure(scope: Page | Locator): Promise<void> {
  const bouton = scope.getByRole("button", { name: /^Structure/ }).first();
  if (await bouton.isVisible()) await bouton.click();
}

/** Ligne d'une section : « Par section » du volet, ou la ligne de l'éditeur de
 *  structure d'aujourd'hui (une fois ouvert). Porte Note · Nuance · Transition · 升调
 *  (attribut `title`). */
export const ligneSection = (scope: Page | Locator, nom: string) => {
  const page = "keyboard" in scope ? scope : scope.page();
  return scope.locator("[data-ligne-section]").filter({
    has: page.locator("[data-nom-section]", { hasText: new RegExp(`^\\s*${nom}\\s*$`) }),
  });
};

/** Retire une étape de la structure (structure déjà montrée) : en deux colonnes,
 *  on touche sa pastille puis ✕ ; sinon la corbeille de sa ligne. */
export async function retirerSection(page: Page, nom: string): Promise<void> {
  if (await enDeuxColonnes(page)) {
    await volet(page).getByRole("button", { name: new RegExp(`^${nom},`) }).first().click();
    await volet(page).getByRole("button", { name: `Retirer l'étape ${nom}` }).click();
    return;
  }
  await ligneSection(page, nom).getByRole("button").last().click();
}

/** Ligne d'un chant sur la page d'aujourd'hui (celle qui porte sa tonalité). */
const ligneDuChant = (page: Page, titre: string) =>
  page.locator("div.flex.items-start.gap-2.p-3").filter({ has: page.getByLabel(`Tonalité de ${titre}`) });

/** Champ « Note du chant ». */
export async function champNoteDuChant(page: Page, titre: string): Promise<Locator> {
  if (await enDeuxColonnes(page)) {
    await reglerElement(page, titre);
    return volet(page).getByLabel("Note du chant");
  }
  return ligneDuChant(page, titre).getByPlaceholder("Note (optionnel)…");
}

/** Retire un chant de la setlist. */
export async function retirerChant(page: Page, titre: string): Promise<void> {
  if (await enDeuxColonnes(page)) {
    await reglerElement(page, titre);
    await volet(page).getByRole("button", { name: "Retirer", exact: true }).click();
    return;
  }
  await ligneDuChant(page, titre).getByRole("button").last().click();
}

/** Montre les chants d'une fusion : « Voir les chants » sur la page d'aujourd'hui,
 *  la fusion touchée dans la liste en deux colonnes. */
export async function voirChantsFusion(page: Page, titre: string): Promise<void> {
  if (await enDeuxColonnes(page)) {
    await reglerElement(page, titre);
    return;
  }
  await page.getByRole("button", { name: "Voir les chants" }).click();
}

/** Bouton qui ajoute un chant trouvé : « Ajouter <titre> » dans la bibliothèque,
 *  « Ajouter » (le premier résultat) sur la page d'aujourd'hui. */
export const boutonAjouter = (page: Page, titre: string) =>
  page
    .getByRole("button", { name: `Ajouter ${titre}`, exact: true })
    .or(page.getByRole("button", { name: "Ajouter", exact: true }))
    .first();

/** Notes de la setlist : « Notes pour l'équipe » (en-tête), « Notes (optionnel) » aujourd'hui. */
export const champNotes = (page: Page) => page.getByLabel(/^Notes (\(optionnel\)|pour l'équipe)/);

/** Menu de la présidence : « Présidence » (en-tête), « Présidence * » aujourd'hui. */
export const champPresidence = (page: Page) => page.getByLabel(/^Présidence( \*)?$/);
