import { expect, type Locator, type Page } from "@playwright/test";

/** Passer d'une vue à l'autre sur la page d'une setlist (lot U5, T0,
 *  docs/spec-deux-volets.md).
 *
 *  Aujourd'hui la setlist s'ouvre sur la Liste et la bascule « Liste |
 *  Partitions » change de vue. Avec U5, la bascule reste sur téléphone et
 *  tablette portrait (G), mais disparaît en deux volets (tablette paysage,
 *  ordinateur) : le sommaire est à gauche, les partitions toujours à droite.
 *  Les specs passent par ces deux fonctions plutôt que de toucher le bouton par
 *  son nom : elles valent pour les deux mises en page. */

const bascule = (page: Page, vue: "Liste" | "Partitions") =>
  page.getByRole("button", { name: vue, exact: true });

/** Un bloc par chant affiché en partition (`data-outline-item`, PartitionView). */
const partitions = (page: Page) => page.locator("[data-outline-item]");

/** La page a lu la setlist : la bascule ou les partitions sont là. Attente
 *  bornée par le test seul, comme le clic qu'elle remplace (le premier passage
 *  compile la page sous `next dev`). */
async function setlistAffichee(page: Page, bouton: Locator) {
  await bouton.or(partitions(page)).first().waitFor();
}

/** Affiche les partitions : touche « Partitions » si la bascule est là, sinon
 *  (deux volets) les attend. Rend la main quand le premier chant est à l'écran. */
export async function ouvrirPartitions(page: Page): Promise<void> {
  const bouton = bascule(page, "Partitions");
  await setlistAffichee(page, bouton);
  if (await bouton.isVisible()) await bouton.click();
  await partitions(page).first().waitFor();
}

/** Revient à la Liste : touche « Liste » si la bascule est là. En deux volets
 *  il n'y a pas de liste (le sommaire en tient lieu) : rien à faire. */
export async function ouvrirListe(page: Page): Promise<void> {
  const bouton = bascule(page, "Liste");
  await setlistAffichee(page, bouton);
  if (!(await bouton.isVisible())) return;
  await bouton.click();
  await expect(partitions(page)).toHaveCount(0);
}
