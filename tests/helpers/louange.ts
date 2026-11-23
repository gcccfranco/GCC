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
// RU-5 : « jejoue » et « options » n'existent plus, la marge « Affichage » les remplace (les deux noms ouvrent la marge).
export type Menu = "setlist" | "reperes" | "affichage" | "jejoue" | "outils" | "tempo" | "options";
/** Nom du bouton de la barre de titre, qui est aussi le nom du dialogue qu'il ouvre (FS-B). */
export const NOM_MENU: Record<Langue, Record<Menu, string>> = {
  fr: { setlist: "Setlist", reperes: "Repères", affichage: "Affichage", jejoue: "Affichage", outils: "Outils", tempo: "Tempo", options: "Affichage" },
  zh: { setlist: "歌单", reperes: "段落", affichage: "显示", jejoue: "显示", outils: "工具", tempo: "节拍", options: "显示" },
};

/** Ouvre un menu du mode louange (FS-B : Setlist, Repères, Outils, Tempo, Options d'affichage). La barre reste ouverte
 *  jusqu'à un toucher au centre, qui la montre ou la cache : si le bouton n'est pas visible on la rappelle, et on clique
 *  jusqu'à ce que le dialogue s'ouvre. Rend le dialogue. */
export async function ouvrirMenu(page: Page, menu: Menu, langue: Langue = "fr") {
  // « tempo » : la feuille Tempo est devenue le panneau Métronome (MT-2).
  if (menu === "tempo") return ouvrirMetronome(page, langue);
  if (menu === "jejoue" || menu === "options") menu = "affichage";
  // Au téléphone, Repères est une ligne d'Outils : ♩ a pris sa place dans la barre (Timothée, 14/11).
  if (menu === "reperes" && page.viewportSize()!.width < 768) {
    const reperes = page.getByRole("dialog", { name: NOM_MENU[langue].reperes, exact: true });
    await expect(async () => {
      if (await reperes.isVisible()) return;
      const outils = await ouvrirMenu(page, "outils", langue);
      await outils.locator("[data-reperes-ouvrir]").click({ timeout: 2_000 });
      await expect(reperes).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    return reperes;
  }
  const nom = NOM_MENU[langue][menu];
  const bouton = page.locator("[data-performance-mode]").getByRole("button", { name: nom, exact: true });
  // La marge « Affichage » n'est pas un dialogue : un volet (colonne ou feuille basse) qui reste ouvert pendant la lecture.
  const dialogue = menu === "affichage" ? page.locator('[data-testid="marge-affichage"][data-mode="louange"][data-ouvert="true"]') : page.getByRole("dialog", { name: nom, exact: true });
  await expect(async () => {
    // Une tentative précédente a pu ouvrir le menu (animation lente) : ne pas recommencer.
    if (await dialogue.isVisible()) return;
    // Barre masquée = opacity 0 + aria-hidden : isVisible() la dit visible, le rôle (count) non.
    if ((await bouton.count()) === 0) {
      await toucherCentre(page);
    }
    await bouton.click({ timeout: 2_000 });
    await expect(dialogue).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return dialogue;
}

/** Un toucher au centre de la page, qui bascule la barre. Depuis AL-2 un accord touché au centre ouvre son panneau :
 *  on touche au centre en largeur, à la première hauteur proche du milieu qui n'est pas sur un accord. */
export async function toucherCentre(page: Page) {
  const ecran = page.viewportSize()!;
  const y = await page.evaluate(({ w, h }) => {
    for (let d = 0; d < h / 3; d += 8) {
      for (const yy of [h / 2 + d, h / 2 - d]) {
        if (!document.elementFromPoint(w / 2, yy)?.closest("[data-accord-touchable]")) return yy;
      }
    }
    return h / 2;
  }, { w: ecran.width, h: ecran.height });
  await page.mouse.click(ecran.width / 2, y);
}

/** Ouvre le panneau Métronome (MT-2) : par la pastille ♩ de la barre à partir de 768 px, par la ligne « Métronome » d'Outils
 *  au téléphone. Rend le panneau. */
export async function ouvrirMetronome(page: Page, langue: Langue = "fr") {
  const panneau = page.getByTestId("panneau-metronome");
  if (page.viewportSize()!.width < 768) {
    await expect(async () => {
      if (await panneau.isVisible()) return;
      await ouvrirMenu(page, "outils", langue);
      await page.locator("[data-metronome-ouvrir]").click({ timeout: 2_000 });
      await expect(panneau).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    return panneau;
  }
  const bouton = page.locator('[data-performance-mode] [data-menu-declencheur="metronome"]');
  await expect(async () => {
    if (await panneau.isVisible()) return;
    if ((await page.locator("[data-performance-mode] [data-barre-haut]").getByRole("button", { name: NOM_MENU[langue].tempo, exact: true }).count()) === 0) {
      await toucherCentre(page);
    }
    await bouton.click({ timeout: 2_000 });
    await expect(panneau).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return panneau;
}

/** Ferme la barre de titre si elle est ouverte (première ouverture du mode sur l'appareil : elle l'est, et l'en-tête du
 *  chant est alors invisible puisque la barre porte déjà le titre, FS-A). Un toucher au centre la cache. */
export async function fermerBarre(page: Page) {
  const chrome = page.locator("[data-performance-mode] [data-barre-haut]").locator("xpath=..");
  if ((await page.locator("[data-barre-ouverte]").count()) > 0) {
    await toucherCentre(page);
    await expect(page.locator("[data-barre-ouverte]")).toHaveCount(0);
  }
  await expect(chrome).toHaveCSS("opacity", "0");
}

/** Ouvre la marge « Affichage » du mode louange (c'était le menu « Options d'affichage », avant RU-5). */
export const ouvrirOptions = (page: Page, langue: Langue = "fr") => ouvrirMenu(page, "options", langue);
/** Ancien nom d'`ouvrirOptions`, gardé pour les specs qui le citent. */
export const ouvrirReglages = ouvrirOptions;
/** Ouvre la marge « Affichage » (le rôle « Je joue » en est le premier groupe, RU-5). */
export const ouvrirJeJoue = (page: Page, langue: Langue = "fr") => ouvrirMenu(page, "jejoue", langue);
/** Ouvre Outils (son bouton est dans la barre à toutes tailles depuis RU-5). */
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
export async function basculerAnnoter(page: Page, langue: Langue = "fr") {
  // En Crayon, la barre d'annotation (AN-3a) remplace la barre de titre : on en sort par « Terminé ».
  const termine = page.locator("[data-performance-mode] [data-crayon-barre]").getByRole("button", { name: langue === "zh" ? "完成" : "Terminé", exact: true });
  if (await termine.count()) {
    await termine.click();
    return;
  }
  if (page.viewportSize()!.width < 768) {
    const outils = await ouvrirOutils(page, langue);
    await outils.getByRole("button", { name: langue === "zh" ? "画笔" : "Crayon", exact: true }).click();
    await expect(outils).toBeHidden();
    return;
  }
  // Dans la barre de titre : l'outil « Crayon » (stylo) du panneau d'outils porte le même nom.
  const bouton = page.locator("[data-performance-mode] [data-barre-haut]").getByRole("button", { name: langue === "zh" ? "画笔" : "Crayon", exact: true });
  // Barre masquée (inert) après un rechargement : un toucher au centre la rappelle.
  if ((await bouton.count()) === 0) await toucherCentre(page);
  await bouton.click();
}
