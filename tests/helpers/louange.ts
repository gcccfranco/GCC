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

/** Ouvre les Réglages du mode louange (FS-A : le bouton de la barre s'appelle « Options d'affichage », le
 *  dialogue qu'il ouvre garde le nom « Réglages »). La barre reste ouverte jusqu'à un
 *  toucher au centre, qui la montre ou la cache : si le bouton n'est pas
 *  visible on la rappelle, et on clique jusqu'à ce que la fenêtre s'ouvre. */
export async function ouvrirReglages(page: Page) {
  const bouton = page.getByRole("button", { name: "Options d'affichage" });
  const reglages = page.getByRole("dialog", { name: "Réglages" });
  await expect(async () => {
    // Une tentative précédente a pu ouvrir la feuille (animation lente) : ne pas recommencer.
    if (await reglages.isVisible()) return;
    // Barre masquée = opacity 0 + aria-hidden : isVisible() la dit visible, le rôle (count) non.
    if ((await bouton.count()) === 0) {
      const ecran = page.viewportSize()!;
      await page.mouse.click(ecran.width / 2, ecran.height / 2);
    }
    await bouton.click({ timeout: 2_000 });
    await expect(reglages).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return reglages;
}

/** Le curseur de page du mode louange (il n'y a plus d'étiquette « page n / N » : FS-A). */
export const curseurPage = (page: Page) => page.locator("[data-performance-mode] [data-curseur-page] input[type=range]");

/** « n / N » lu sur le curseur de page (valeur 0-based, max = N - 1) ; sans curseur, une seule page. */
export async function lireCompteur(page: Page): Promise<string> {
  const curseur = curseurPage(page);
  if ((await curseur.count()) === 0) {
    // Pas de curseur : une seule page, une fois le mode ouvert et sa mise en page faite (« — » avant).
    const pret = (await page.locator("[data-performance-mode]").count()) > 0 && (await page.getByText("Mise en page…").count()) === 0;
    return pret ? "1 / 1" : "—";
  }
  const [valeur, max] = await Promise.all([curseur.inputValue(), curseur.getAttribute("max")]);
  return `${Number(valeur) + 1} / ${Number(max) + 1}`;
}

/** Attend que le compteur « n / N » (lu sur le curseur) corresponde à un motif ou soit égal à un texte. */
export async function attendreCompteur(page: Page, motif: string | RegExp, timeout = 15_000) {
  const poll = expect.poll(() => lireCompteur(page), { timeout });
  if (typeof motif === "string") await poll.toBe(motif);
  else await poll.toMatch(motif);
}

/** Entre dans l'annotation ou en sort. Au téléphone (< 768 px) la barre de titre n'a plus « Annoter » (FS-A) :
 *  la fonction est une ligne du tiroir des options, qu'on ouvre d'abord (elle le referme en s'exécutant). */
export async function basculerAnnoter(page: Page) {
  if (page.viewportSize()!.width < 768) {
    const reglages = await ouvrirReglages(page);
    await reglages.getByRole("button", { name: "Annoter" }).click();
    await expect(reglages).toBeHidden();
    return;
  }
  await page.getByRole("button", { name: "Annoter" }).click();
}
