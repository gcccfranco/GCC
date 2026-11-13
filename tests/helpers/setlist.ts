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
  page.getByRole("button", { name: vue === "Liste" ? /^(Liste|曲目列表)$/ : /^(Partitions|歌谱预览)$/ });

/** Un bloc par chant affiché en partition (`data-outline-item`, PartitionView). */
const partitions = (page: Page) => page.locator("[data-outline-item]");

/** La page a lu la setlist : la bascule ou les partitions sont là. Attente
 *  bornée par le test seul, comme le clic qu'elle remplace (le premier passage
 *  compile la page sous `next dev`). */
/** Le toucher glisse la vue (T5) : on rend la main une fois posée, sans transform. */
const vuePosee = (page: Page) =>
  expect.poll(() => page.evaluate(() => (document.querySelector("[data-vue]") as HTMLElement | null)?.style.transform ?? "")).toBe("");

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
  await vuePosee(page);
}

/** Revient à la Liste : touche « Liste » si la bascule est là. En deux volets
 *  il n'y a pas de liste (le sommaire en tient lieu) : rien à faire. */
export async function ouvrirListe(page: Page): Promise<void> {
  const bouton = bascule(page, "Liste");
  await setlistAffichee(page, bouton);
  if (!(await bouton.isVisible())) return;
  await bouton.click();
  await expect(partitions(page)).toHaveCount(0);
  await vuePosee(page);
}

/** Ouvre les réglages d'affichage (ordre joué, sections uniques, structure seule,
 *  Pinyin, couleurs par section, 简谱) : le bouton « Affichage » de la barre sur G,
 *  le sous-menu « Affichage » du ⋯ de l'en-tête en deux volets (T4, Q7), le sous-menu
 *  « Affichage » du ⋯ de la barre au téléphone en vue Partitions (T2 du lot exemples d'usage). */
export async function ouvrirAffichage(page: Page): Promise<void> {
  const bouton = page.getByTestId("barre-outils").getByRole("button", { name: /^(Affichage|显示)$/ });
  await bouton.or(page.locator("[data-en-tete]")).or(page.getByTestId("barre-outils")).first().waitFor();
  if (await bouton.isVisible()) {
    await bouton.click();
    return;
  }
  const hote = (await page.locator("[data-en-tete]").count()) > 0 ? page.locator("[data-en-tete]") : page.getByTestId("barre-outils");
  await hote.getByRole("button", { name: /Plus d'actions|更多操作/ }).click();
  await page.getByRole("menuitem", { name: /^(Affichage|显示)$/ }).click();
}

/** Referme les menus ouverts (un réglage d'affichage laisse le sien ouvert). */
export async function fermerMenus(page: Page): Promise<void> {
  for (let i = 0; i < 3 && (await page.getByRole("menu").count()) > 0; i++) await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
}

/** Montre ou cache les accords : le bouton « Accords » de la barre sur G, la case
 *  « Accords » du ⋯ de l'en-tête en deux volets (T4, Q7) ou du ⋯ de la barre au téléphone en vue Partitions. */
export async function basculerAccords(page: Page): Promise<void> {
  const bouton = page.getByTestId("barre-outils").getByRole("button", { name: "Accords", exact: true });
  await bouton.or(page.locator("[data-en-tete]")).or(page.getByTestId("barre-outils")).first().waitFor();
  if (await bouton.isVisible()) {
    await bouton.click();
    return;
  }
  const hote = (await page.locator("[data-en-tete]").count()) > 0 ? page.locator("[data-en-tete]") : page.getByTestId("barre-outils");
  await hote.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Accords" }).click();
  await fermerMenus(page);
}

/** La setlist est-elle posée en deux volets (en-tête collant, sommaire) ? Attend la
 *  page : la barre d'outils de G ou l'en-tête des deux volets. */
export async function enDeuxVolets(page: Page): Promise<boolean> {
  const enTete = page.locator("[data-en-tete]");
  await page.getByTestId("barre-outils").or(enTete).first().waitFor();
  return enTete.isVisible();
}

/** Le sommaire en deux volets (T3 du lot exemples d'usage) : un rail de numéros, dont le bouton ouvre le
 *  panneau « Sommaire » par-dessus la partition. Le panneau se referme après un choix, un toucher en
 *  dehors ou Échap : à rouvrir avant chaque geste dans le sommaire. Rend la nav « Sommaire ». */
export async function ouvrirSommaire(page: Page): Promise<Locator> {
  const nav = page.getByRole("navigation", { name: /^(Sommaire|目录)$/ });
  // Le panneau qui se ferme est encore visible (400 ms) mais inerte : le bouton dit « Ouvrir », on le clique.
  const ouvrir = page.getByRole("button", { name: /^(Ouvrir le sommaire|展开目录)$/ });
  if (!(await nav.isVisible()) || (await ouvrir.isVisible())) await ouvrir.click();
  await expect(nav).toBeVisible();
  // Le panneau glisse en ressort (T5) : on rend la main une fois posé.
  await expect.poll(() => page.evaluate(() => {
    const el = document.getElementById("sommaire-panneau");
    return !el || (el.hasAttribute("data-ouvert") && getComputedStyle(el).transform === "none");
  })).toBe(true);
  return nav;
}

/** La ligne « Modifiée par … » de l'historique. En vue Partitions et en deux volets, elle est dans l'en-tête
 *  replié (T2 et T3 du lot exemples d'usage, docs/spec-exemples-usage.md § Avancement) : le bouton titre le
 *  déplie d'abord. Rend le bouton de l'historique. */
export async function ligneHistorique(page: Page, name: RegExp): Promise<Locator> {
  await page.getByTestId("barre-outils").or(page.locator("[data-en-tete]")).first().waitFor();
  // Par l'attribut, pas par le rôle : une feuille qui se ferme (confirmation « Rétablir ») cache un instant le reste
  // de la page aux rôles.
  const titre = page.locator('button[aria-expanded][aria-label$=", Afficher les détails de la setlist"], button[aria-expanded][aria-label$=", 显示歌单详情"]');
  if (!(await titre.isVisible())) return page.getByRole("button", { name });
  // La barre s'escamote quand on descend (on remonte, comme au doigt) ; une feuille qui se ferme peut prendre le clic.
  await expect(async () => {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(titre).toBeInViewport({ timeout: 1_000 });
    if ((await titre.getAttribute("aria-expanded")) === "false") await titre.click({ timeout: 1_000 });
    await expect(titre).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass();
  return page.getByRole("button", { name });
}
