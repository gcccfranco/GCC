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

export type Langue = "fr" | "zh";
export type Menu = "setlist" | "reperes" | "jejoue" | "outils" | "tempo" | "options";
/** Nom du bouton de la barre de titre, qui est aussi le nom du dialogue qu'il ouvre (FS-B). */
export const NOM_MENU: Record<Langue, Record<Menu, string>> = {
  fr: { setlist: "Setlist", reperes: "Repères", jejoue: "Je joue", outils: "Outils", tempo: "Tempo", options: "Options d'affichage" },
  zh: { setlist: "歌单", reperes: "段落", jejoue: "我演奏", outils: "工具", tempo: "节拍", options: "显示选项" },
};

/** Ouvre un menu du mode louange (FS-B : Setlist, Repères, Outils, Tempo, Options d'affichage). La barre reste ouverte
 *  jusqu'à un toucher au centre, qui la montre ou la cache : si le bouton n'est pas visible on la rappelle, et on clique
 *  jusqu'à ce que le dialogue s'ouvre. Rend le dialogue. */
export async function ouvrirMenu(page: Page, menu: Menu, langue: Langue = "fr") {
  // Au téléphone (< 768 px) Outils n'a plus de bouton dans la barre : son contenu est en tête de la feuille Options d'affichage.
  if (menu === "outils" && page.viewportSize()!.width < 768) menu = "options";
  const nom = NOM_MENU[langue][menu];
  const bouton = page.locator("[data-performance-mode]").getByRole("button", { name: nom, exact: true });
  const dialogue = page.getByRole("dialog", { name: nom, exact: true });
  await expect(async () => {
    // Une tentative précédente a pu ouvrir le menu (animation lente) : ne pas recommencer.
    if (await dialogue.isVisible()) return;
    // Barre masquée = opacity 0 + aria-hidden : isVisible() la dit visible, le rôle (count) non.
    if ((await bouton.count()) === 0) {
      const ecran = page.viewportSize()!;
      await page.mouse.click(ecran.width / 2, ecran.height / 2);
    }
    await bouton.click({ timeout: 2_000 });
    await expect(dialogue).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return dialogue;
}

/** Ferme la barre de titre si elle est ouverte (première ouverture du mode sur l'appareil : elle l'est, et l'en-tête du
 *  chant est alors invisible puisque la barre porte déjà le titre, FS-A). Un toucher au centre la cache. */
export async function fermerBarre(page: Page) {
  const chrome = page.locator("[data-performance-mode] [data-barre-haut]").locator("xpath=..");
  if ((await page.locator("[data-barre-ouverte]").count()) > 0) {
    const ecran = page.viewportSize()!;
    await page.mouse.click(ecran.width / 2, ecran.height / 2);
    await expect(page.locator("[data-barre-ouverte]")).toHaveCount(0);
  }
  await expect(chrome).toHaveCSS("opacity", "0");
}

/** Ouvre le menu « Options d'affichage » du mode louange (c'était le tiroir « Réglages » avant FS-B). */
export const ouvrirOptions = (page: Page, langue: Langue = "fr") => ouvrirMenu(page, "options", langue);
/** Ancien nom d'`ouvrirOptions`, gardé pour les specs qui le citent. */
export const ouvrirReglages = ouvrirOptions;
/** Ouvre le menu « Je joue » (rôle, ordre des sections, paroles masquées ; FS-C). */
export const ouvrirJeJoue = (page: Page, langue: Langue = "fr") => ouvrirMenu(page, "jejoue", langue);
/** Ouvre Outils : son menu à partir de 768 px, la feuille Options d'affichage (dont il est la tête) au téléphone. */
export const ouvrirOutils = (page: Page, langue: Langue = "fr") => ouvrirMenu(page, "outils", langue);

/** Le curseur de page du mode louange (il n'y a plus d'étiquette « page n / N » : FS-A). */
export const curseurPage = (page: Page) => page.locator("[data-performance-mode] [data-curseur-page] input[type=range]");

/** « n / N » lu sur le curseur de page (valeur 0-based, max = N - 1) ; sans curseur, une seule page. */
export async function lireCompteur(page: Page): Promise<string> {
  // Une seule lecture, sans attente automatique : le curseur disparaît du DOM quand le chant tient sur une page.
  const lu = await page.evaluate(() => {
    const c = document.querySelector<HTMLInputElement>("[data-performance-mode] [data-curseur-page] input[type=range]");
    return c ? { valeur: c.value, max: c.max } : null;
  });
  if (!lu) {
    // Pas de curseur : une seule page, une fois le mode ouvert et sa mise en page faite (« — » avant).
    const pret = (await page.locator("[data-performance-mode]").count()) > 0 && (await page.getByText("Mise en page…").count()) === 0;
    return pret ? "1 / 1" : "—";
  }
  return `${Number(lu.valeur) + 1} / ${Number(lu.max) + 1}`;
}

/** Attend que le compteur « n / N » (lu sur le curseur) corresponde à un motif ou soit égal à un texte. */
export async function attendreCompteur(page: Page, motif: string | RegExp, timeout = 15_000) {
  const poll = expect.poll(() => lireCompteur(page), { timeout });
  if (typeof motif === "string") await poll.toBe(motif);
  else await poll.toMatch(motif);
}

/** Entre dans l'annotation ou en sort. Au téléphone (< 768 px) la barre de titre n'a plus « Crayon » (FS-A) :
 *  la fonction est une ligne d'Outils, en tête de la feuille Options d'affichage (FS-B), qu'on ouvre d'abord
 *  (elle la referme en s'exécutant). */
export async function basculerAnnoter(page: Page) {
  // En Crayon, la barre d'annotation (AN-3a) remplace la barre de titre : on en sort par « Terminé ».
  const termine = page.locator("[data-performance-mode] [data-crayon-barre]").getByRole("button", { name: "Terminé", exact: true });
  if (await termine.count()) {
    await termine.click();
    return;
  }
  if (page.viewportSize()!.width < 768) {
    const outils = await ouvrirOutils(page);
    await outils.getByRole("button", { name: "Crayon", exact: true }).click();
    await expect(outils).toBeHidden();
    return;
  }
  // Dans la barre de titre : l'outil « Crayon » (stylo) du panneau d'outils porte le même nom.
  const bouton = page.locator("[data-performance-mode] [data-barre-haut]").getByRole("button", { name: "Crayon", exact: true });
  // Barre masquée (inert) après un rechargement : un toucher au centre la rappelle.
  if ((await bouton.count()) === 0) await page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
  await bouton.click();
}
