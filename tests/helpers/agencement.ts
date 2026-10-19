import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";

// Vérifications communes de l'agencement v18 (docs/spec-agencement-v18.md, « Tests », tranche F1).
// Chaque tranche de pages les appelle sur ses pages, sur les cinq projets :
//
//   import { interdireDialoguesNatifs, ouvrirAvecBarre, verifierAgencement } from "./helpers/agencement";
//
//   test("BO Tâches : l'agencement commun", async ({ page }) => {
//     interdireDialoguesNatifs(page);            // avant toute action : aucune fenêtre grise
//     await ouvrirAvecBarre(page, "reduite");     // facultatif : barre réduite sur ordinateur
//     await signInAs(page, ADMIN, DOCS, "/back-office/taches/da");
//     await verifierAgencement(page, {            // en-tête, x du titre, débordement, halo, et :
//       contenu: page.locator("[data-deux-volets]"),  // le bloc de contenu prend toute la zone (une lecture : `lecture: true`)
//       onglets: { rail: 1, pilules: 0 },         // les onglets de la page passent par OngletsRail et Pilules
//     });
//   });
//
// `contenu` et `onglets` sont facultatifs pour ne pas casser les appels déjà écrits, mais chaque
// tranche de pages les donne : la spec range la pleine largeur et les deux sortes d'onglets parmi
// les vérifications communes.
//
// Les mesures attendues sont écrites ici en dur, d'après la spec (R2), et non lues dans le CSS :
// ces tests vérifient le CSS, ils ne le recopient pas.

/** Grand écran : barre latérale à gauche (ordinateur, ordinateur-1440, tablette couchée). */
export const estGrandEcran = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
export const estTelephone = (info: TestInfo) => info.project.name === "telephone";

/** Barre de l'ordinateur dépliée ou réduite, posée avant le chargement (la tablette couchée l'a toujours réduite). */
export async function ouvrirAvecBarre(page: Page, etat: "reduite" | "depliee") {
  await page.addInitScript((e) => {
    try { localStorage.setItem("barre-laterale", e); } catch { /* navigation privée */ }
  }, etat);
}

/** La zone de contenu : du bord droit de la barre latérale (0 sans elle) au bord droit de la fenêtre. */
export async function zoneDeContenu(page: Page) {
  return page.evaluate(() => {
    const barre = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barre-laterale")) || 0;
    return { gauche: barre, droite: document.documentElement.clientWidth };
  });
}

/** La marge de la zone (R2) : 40 px barre dépliée, 28 px barre réduite et tablette couchée,
 *  24 px tablette portrait (dès 768 px), 16 px téléphone. */
export async function margeAttendue(page: Page): Promise<number> {
  return page.evaluate(() => {
    const barre = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barre-laterale")) || 0;
    if (barre >= 200) return 40;
    if (barre > 0) return 28;
    return document.documentElement.clientWidth >= 768 ? 24 : 16;
  });
}

/** Taille du titre de page (R2) : 30 px dès 768 px de large, 24 px en dessous. */
export async function tailleDuTitreAttendue(page: Page): Promise<number> {
  return page.evaluate(() => (document.documentElement.clientWidth >= 768 ? 30 : 24));
}

/** L'en-tête commun de la page (`EnTetePage`). */
export const enTete = (page: Page) => page.locator("header[data-entete-page]");
/** Le rail gris : sections et vues (R4). */
export const ongletsRail = (page: Page) => page.locator('[data-onglets="rail"]');
/** Les pilules : sous-onglets, filtres, plannings (R4). */
export const pilules = (page: Page) => page.locator('[data-onglets="pilules"]');

/**
 * Un seul `header[data-entete-page]` visible, un seul h1 dedans, à la bonne taille ; le h1 part de
 * la zone + la marge (au pixel près) ; `premierBloc` (le premier bloc de contenu sous l'en-tête,
 * par défaut l'élément qui suit l'en-tête) commence au même x.
 */
export async function verifierEnTete(page: Page, options: { premierBloc?: Locator } = {}) {
  const entete = enTete(page).filter({ visible: true });
  await expect(entete, "un seul en-tête de page").toHaveCount(1);
  const h1 = entete.locator("h1");
  await expect(h1, "un seul h1 dans l'en-tête").toHaveCount(1);
  await expect(page.locator("h1").filter({ visible: true }), "un seul h1 dans la page").toHaveCount(1);

  const taille = await tailleDuTitreAttendue(page);
  expect(await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)), "taille du titre").toBe(taille);

  const zone = await zoneDeContenu(page);
  const marge = await margeAttendue(page);
  await expect
    .poll(async () => Math.round((await h1.boundingBox())!.x - zone.gauche), { message: "bord gauche du titre = zone + marge" })
    .toBe(marge);

  // Par défaut, le premier frère VISIBLE de l'en-tête : un bloc masqué à cette taille (la barre
  // collante des plannings, cachée en grand, R6) ne compte pas.
  const bloc = options.premierBloc ?? entete.locator("xpath=following-sibling::*").filter({ visible: true }).first();
  if (await bloc.count()) {
    // Le bloc peut porter la marge en dedans (pleine zone, `px-[var(--marge-page)]`) ou en dehors
    // (carte à la marge). Un enveloppant collé au bord, sans marge (deux volets sur téléphone), ne
    // compte pas : on descend dans son premier enfant jusqu'à ce qui pose la marge.
    const { x, contenu } = await bloc.first().evaluate((el, gauche) => {
      let e: Element = el;
      for (let i = 0; i < 8; i++) {
        const r = e.getBoundingClientRect();
        const pad = parseFloat(getComputedStyle(e).paddingLeft) || 0;
        if (Math.abs(r.x - gauche) > 1 || pad > 0 || !e.firstElementChild) return { x: r.x, contenu: r.x + pad };
        e = e.firstElementChild;
      }
      const r = e.getBoundingClientRect();
      return { x: r.x, contenu: r.x };
    }, zone.gauche);
    expect(Math.abs(contenu - zone.gauche - marge) <= 1 || Math.abs(x - zone.gauche - marge) <= 1,
      `le premier bloc commence au x du titre (bloc ${Math.round(x)}, contenu ${Math.round(contenu)}, attendu ${zone.gauche + marge})`).toBe(true);
  }
}

/** Rien ne déborde en largeur. */
export async function verifierSansDebordement(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), "aucun défilement horizontal").toBeLessThanOrEqual(0);
}

/** Le bleu gris du halo du Back-Office (R12), clair et sombre. */
export const HALO_BACK_OFFICE = "#e4e7f6";
export const HALO_BACK_OFFICE_SOMBRE = "#262b45";

/** Un halo visible ; sous `/back-office`, sans halo propre à la page, `--halo` vaut le bleu gris. */
export async function verifierHalo(page: Page) {
  const halos = page.locator('[data-testid="halo"], [data-testid="halo-defaut"]').filter({ visible: true });
  await expect(halos, "un halo visible").toHaveCount(1);
  const auBackOffice = new URL(page.url()).pathname.startsWith("/back-office");
  if (auBackOffice && (await halos.getAttribute("data-testid")) === "halo-defaut") {
    const [halo, attendu] = await page.evaluate(() => {
      const st = getComputedStyle(document.documentElement);
      return [st.getPropertyValue("--halo").trim(), st.getPropertyValue("--halo-back-office").trim()];
    });
    expect(halo, "halo du Back-Office : le bleu gris").toBe(attendu);
  }
}

/** Un bloc de contenu prend toute la zone moins deux marges (une lecture : 720 px). */
export async function verifierPleineLargeur(page: Page, bloc: Locator, options: { lecture?: boolean } = {}) {
  const zone = await zoneDeContenu(page);
  const marge = await margeAttendue(page);
  const largeur = (await bloc.boundingBox())!.width;
  if (options.lecture) expect(largeur, "une lecture : 720 px au plus").toBeLessThanOrEqual(721);
  else expect(largeur, "toute la zone moins deux marges").toBeGreaterThanOrEqual(zone.droite - zone.gauche - 2 * marge - 1);
}

/** Les onglets visibles de la page (R4, R5) : `rail` rails gris (sections, vues), `pilules` rangées de
 *  pilules (sous-onglets, filtres, plannings). Un onglet qui ne passe ni par `OngletsRail` ni par
 *  `Pilules` n'a pas de `data-onglets` : le compte le montre. */
export async function verifierOnglets(page: Page, attendus: { rail?: number; pilules?: number }) {
  if (attendus.rail !== undefined) await expect(ongletsRail(page).filter({ visible: true }), "rails gris (sections, vues)").toHaveCount(attendus.rail);
  if (attendus.pilules !== undefined) await expect(pilules(page).filter({ visible: true }), "rangées de pilules (sous-onglets, filtres, plannings)").toHaveCount(attendus.pilules);
}

/** Aucune fenêtre native (`window.confirm`, `alert`) : chacune fait échouer le test (R9). À appeler avant d'agir. */
export function interdireDialoguesNatifs(page: Page) {
  page.on("dialog", async (dialogue) => {
    expect.soft(`${dialogue.type()} : ${dialogue.message()}`, "aucune fenêtre native du navigateur").toBe("");
    await dialogue.dismiss().catch(() => {});
  });
}

/** La fenêtre de confirmation du site (`useConfirmer`, R9). */
export const fenetreDuSite = (page: Page) => page.getByRole("alertdialog");

/** Répond à la fenêtre du site par l'un de ses deux boutons (« Annuler » ou l'action), puis attend qu'elle se ferme. */
export async function repondreDansLeSite(page: Page, bouton: string) {
  const fenetre = fenetreDuSite(page);
  await expect(fenetre).toBeVisible();
  await fenetre.getByRole("button", { name: bouton, exact: true }).click();
  await expect(fenetre).toBeHidden();
}

/**
 * Les vérifications communes en un appel : en-tête, débordement, halo ; avec `contenu`, ce bloc prend
 * toute la zone moins deux marges (`lecture` : 720 px au plus) ; avec `onglets`, le compte des rails
 * et des rangées de pilules visibles.
 */
export async function verifierAgencement(
  page: Page,
  options: { premierBloc?: Locator; contenu?: Locator; lecture?: boolean; onglets?: { rail?: number; pilules?: number } } = {},
) {
  await verifierEnTete(page, options);
  await verifierSansDebordement(page);
  await verifierHalo(page);
  if (options.contenu) await verifierPleineLargeur(page, options.contenu, { lecture: options.lecture });
  if (options.onglets) await verifierOnglets(page, options.onglets);
}
