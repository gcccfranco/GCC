import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  HALO_BACK_OFFICE, HALO_BACK_OFFICE_SOMBRE, enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, margeAttendue,
  ongletsRail, ouvrirAvecBarre, pilules, verifierAgencement, verifierPleineLargeur, zoneDeContenu,
} from "./helpers/agencement";

// Agencement v18, tranche F1 (docs/spec-agencement-v18.md) : les composants et règles communes,
// essayés sur la page d'essai `/essai-agencement` (servie en développement seulement : 404 en
// production), plus le halo bleu gris du Back-Office sur sa vraie page.
// Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN).

const ESSAI = "/essai-agencement";

/** Capture à regarder à l'œil et à comparer aux planches v18 (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300); // fondus finis
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

async function ouvrirEssai(page: Page) {
  interdireDialoguesNatifs(page);
  await page.goto(ESSAI);
  await expect(enTete(page).getByRole("heading", { level: 1, name: "Essai d'agencement" })).toBeVisible();
}

test.describe("EnTetePage (R1, R2, R3, R8)", () => {
  test("retour, titre, sous-titre, action, rail puis rangée, dans cet ordre", async ({ page }, info) => {
    await ouvrirEssai(page);
    const entete = enTete(page);
    const retour = entete.getByRole("link", { name: "Moi" });
    const h1 = entete.getByRole("heading", { level: 1 });
    const sous = entete.getByText("Les composants communs de la v18");
    const rail = entete.locator('[data-onglets="rail"]');
    const rangee = entete.locator('[data-onglets="pilules"]');
    for (const l of [retour, h1, sous, rail, rangee]) await expect(l).toBeVisible();
    const y = async (l: typeof h1) => (await l.boundingBox())!.y;
    expect(await y(retour)).toBeLessThan(await y(h1));
    expect(await y(h1)).toBeLessThan(await y(sous));
    expect(await y(sous)).toBeLessThan(await y(rail));
    expect(await y(rail)).toBeLessThan(await y(rangee));
    // Le seul retour : « ‹ Section », 14 px gras gris, vers la section.
    await expect(retour).toHaveAttribute("href", /^\/moi\/?$/); // trailingSlash de next.config
    expect(await retour.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).fontWeight])).toEqual(["14px", "600"]);
    // Sous-titre 14 px.
    expect(await sous.evaluate((el) => getComputedStyle(el).fontSize)).toBe("14px");
    if (!estTelephone(info)) {
      // L'action principale est à droite du titre, sur sa ligne.
      const action = entete.getByRole("button", { name: "Nouvel essai" });
      const bA = (await action.boundingBox())!;
      const bT = (await h1.boundingBox())!;
      expect(bA.x).toBeGreaterThan(bT.x + bT.width);
      expect(bA.y).toBeLessThan(bT.y + bT.height);
    }
  });

  test("vérifications communes : un h1 à la marge, 30 px dès 768 px (24 sur téléphone), rien ne déborde, un halo, contenu pleine zone, onglets", async ({ page }) => {
    await ouvrirEssai(page);
    // Le contenu : les deux volets (ou la liste seule), sur toute la zone ; trois rails (en-tête,
    // adresses, vues par adresse) et une rangée de pilules.
    const volets = page.locator('[data-volet="liste"]').locator("..");
    await verifierAgencement(page, { contenu: volets, onglets: { rail: 3, pilules: 1 } });
    // La vérification de pleine largeur mord : un bouton n'occupe pas la zone.
    await expect(verifierPleineLargeur(page, page.getByRole("button", { name: "Demander" }))).rejects.toThrow();
    await capture(page, "f1-essai");
  });

  test("barre réduite : le titre passe à barre + 28 px (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la barre latérale n'existe qu'en grand");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrirEssai(page);
    expect(await margeAttendue(page)).toBe(28);
    await verifierAgencement(page);
    await capture(page, "f1-essai-reduite");
  });

  test("la marge de la page est un jeton CSS (--marge-page) qui suit la barre", async ({ page }) => {
    await ouvrirEssai(page);
    const jeton = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--marge-page").trim());
    expect(jeton).toBe(`${await margeAttendue(page)}px`);
  });
});

test.describe("BoutonNouveau (R7)", () => {
  test("dès 768 px : pilule noire à libellé dans l'en-tête", async ({ page }, info) => {
    test.skip(estTelephone(info), "le téléphone a le rond");
    await ouvrirEssai(page);
    const bouton = enTete(page).getByRole("button", { name: "Nouvel essai" });
    await expect(bouton).toBeVisible();
    await expect(bouton.getByText("Nouvel essai")).toBeVisible();
    const b = (await bouton.boundingBox())!;
    expect(b.width).toBeGreaterThan(b.height * 2);
    expect(await bouton.evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
    await bouton.click();
    await expect(page.getByTestId("resultat")).toHaveText("nouveau");
  });

  test("téléphone : rond de 52 px en bas à droite, au-dessus de la barre d'onglets, sans pilule à libellé", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone");
    await ouvrirEssai(page);
    const rond = page.getByRole("button", { name: "Nouvel essai" });
    await expect(rond).toBeVisible();
    // Le libellé n'est lu que par les lecteurs d'écran : aucune pilule à libellé à l'écran.
    expect(await rond.locator("span").evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
    const b = (await rond.boundingBox())!;
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([52, 52]);
    const largeur = await page.evaluate(() => document.documentElement.clientWidth);
    expect(Math.round(largeur - (b.x + b.width))).toBe(16);
    const barre = (await page.getByTestId("barre-du-bas").boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(barre.y - 8);
    await rond.click();
    await expect(page.getByTestId("resultat")).toHaveText("nouveau");
  });
});

test.describe("ConfirmerProvider, useConfirmer (R9)", () => {
  test("une fenêtre du site : « Annuler » et Échap rendent false, l'action rend true", async ({ page }) => {
    await ouvrirEssai(page);
    const demander = page.getByRole("button", { name: "Demander" });
    const reponse = page.getByTestId("reponse");
    const fenetre = page.getByRole("alertdialog");

    await demander.click();
    await expect(fenetre).toBeVisible();
    await expect(fenetre.getByRole("heading", { name: "Retirer l'essai ?" })).toBeVisible();
    await expect(fenetre.getByText("Il ne sera plus dans la liste.")).toBeVisible();
    await capture(page, "f1-confirmer");
    await fenetre.getByRole("button", { name: "Annuler" }).click();
    await expect(fenetre).toBeHidden();
    await expect(reponse).toHaveText("false");

    await demander.click();
    await expect(fenetre).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(fenetre).toBeHidden();
    await expect(reponse).toHaveText("false");

    await demander.click();
    await fenetre.getByRole("button", { name: "Retirer" }).click();
    await expect(fenetre).toBeHidden();
    await expect(reponse).toHaveText("true");
  });

  test("la page change pendant que la fenêtre est ouverte (Précédent, Suivant) : la fenêtre se ferme", async ({ page }) => {
    await ouvrirEssai(page);
    // Une navigation dans le site puis Précédent : l'historique a une page après l'essai. « Ailleurs »
    // mène aux Chants, publics (Moi renverrait un visiteur à la connexion, et Précédent avec lui).
    await page.getByRole("link", { name: "Ailleurs" }).click();
    await page.waitForURL(/\/songs\/?$/);
    await page.goBack();
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Essai d'agencement" })).toBeVisible();
    const fenetre = page.getByRole("alertdialog");
    await page.getByRole("button", { name: "Demander" }).click();
    await expect(fenetre).toBeVisible();
    // Suivant, fenêtre ouverte : la page de l'essai est quittée, sa demande ne doit pas survivre
    // par-dessus la page suivante (un clic sur « Retirer » agirait pour une page démontée).
    await page.goForward();
    await page.waitForURL(/\/songs\/?$/);
    await expect(fenetre).toBeHidden();
  });
});

test.describe("MenuActions (R9)", () => {
  test("« ⋯ » s'ouvre au clavier ; « Supprimer » passe par la fenêtre du site", async ({ page }) => {
    await ouvrirEssai(page);
    const declencheur = enTete(page).getByRole("button", { name: "Plus d'actions" });
    await declencheur.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Dupliquer" })).toBeVisible();
    await capture(page, "f1-menu");
    // Au clavier : Début et Fin vont à la première et à la dernière action. (Pas de « la première a le
    // focus à l'ouverture » : vu manquer 2 fois sur 20 sous charge, le menu ayant alors le focus
    // lui-même ; Début et Fin marchent dans les deux cas.)
    await page.keyboard.press("Home");
    await expect(menu.getByRole("menuitem", { name: "Dupliquer" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem", { name: "Supprimer" })).toBeFocused();
    await page.keyboard.press("Enter");
    const fenetre = page.getByRole("alertdialog");
    await expect(fenetre.getByRole("heading", { name: "Supprimer l'essai ?" })).toBeVisible();
    // Annuler : rien n'est fait.
    await fenetre.getByRole("button", { name: "Annuler" }).click();
    await expect(page.getByTestId("resultat")).toHaveText("");
    // De nouveau, et cette fois l'action.
    await declencheur.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
    await expect(page.getByTestId("resultat")).toHaveText("supprimé");
  });
});

test.describe("OngletsRail et Pilules (R4, R5)", () => {
  test("rail en boutons : un tablist, l'onglet choisi marqué ; pilules : le choix actif à sa couleur", async ({ page }) => {
    await ouvrirEssai(page);
    const rail = enTete(page).locator('[data-onglets="rail"]');
    await expect(rail).toHaveAttribute("role", "tablist");
    await expect(rail.getByRole("tab", { name: "À venir" })).toHaveAttribute("aria-selected", "true");
    await rail.getByRole("tab", { name: "Passés" }).click();
    await expect(rail.getByRole("tab", { name: "Passés" })).toHaveAttribute("aria-selected", "true");
    await expect(rail.getByRole("tab", { name: "À venir" })).toHaveAttribute("aria-selected", "false");
    await expect(page.getByTestId("vue")).toHaveText("passes");

    const rangee = pilules(page).first();
    await expect(rangee).toHaveAttribute("role", "group");
    const culte = rangee.getByRole("button", { name: "Culte" });
    await culte.click();
    await expect(culte).toHaveAttribute("aria-pressed", "true");
    // La couleur du service (#2d5a65) sur la pilule active.
    // (après le fondu de 150 ms)
    await expect.poll(() => culte.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(45, 90, 101)");
  });

  test("rail en boutons au clavier : un seul arrêt de tabulation, les flèches vont d'un onglet à l'autre, Entrée choisit", async ({ page }) => {
    await ouvrirEssai(page);
    const rail = enTete(page).locator('[data-onglets="rail"]');
    const avenir = rail.getByRole("tab", { name: "À venir" });
    const passes = rail.getByRole("tab", { name: "Passés" });
    // Un seul onglet dans l'ordre de tabulation : le choisi.
    await expect(rail.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(avenir).toHaveAttribute("tabindex", "0");
    await avenir.focus();
    await page.keyboard.press("ArrowRight");
    await expect(passes).toBeFocused();
    // Activation manuelle : la flèche déplace le focus, elle ne change pas la vue.
    await expect(page.getByTestId("vue")).toHaveText("avenir");
    await page.keyboard.press("ArrowRight"); // le rail boucle
    await expect(avenir).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(passes).toBeFocused();
    await page.keyboard.press("Home");
    await expect(avenir).toBeFocused();
    await page.keyboard.press("End");
    await expect(passes).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("vue")).toHaveText("passes");
    await expect(passes).toHaveAttribute("tabindex", "0");
    await expect(avenir).toHaveAttribute("tabindex", "-1");
  });

  test("rail en liens qui ne diffèrent que par la query : `actif` désigne l'onglet", async ({ page }) => {
    await ouvrirEssai(page);
    const rail = ongletsRail(page).filter({ has: page.getByRole("link", { name: "Vue A" }) });
    await expect(rail.getByRole("link", { name: "Vue B" })).toHaveAttribute("aria-current", "page");
    await expect(rail.getByRole("link", { name: "Vue A" })).not.toHaveAttribute("aria-current", "page");
  });

  test("rail en liens : l'adresse courante porte aria-current=page", async ({ page }) => {
    await ouvrirEssai(page);
    const rail = ongletsRail(page).filter({ has: page.getByRole("link", { name: "Ici" }) });
    await expect(rail.getByRole("link", { name: "Ici" })).toHaveAttribute("aria-current", "page");
    await expect(rail.getByRole("link", { name: "Ailleurs" })).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("DeuxVolets en liste-carte (R10)", () => {
  for (const etat of ["depliee", "reduite"] as const) {
    test(`barre ${etat === "depliee" ? "dépliée" : "réduite"} : liste en carte à la marge, fiche jusqu'à la marge, sans filet (grands écrans)`, async ({ page }, info) => {
      test.skip(!estGrandEcran(info), "deux volets : grands écrans");
      test.skip(etat === "depliee" && info.project.name === "tablette-paysage", "la tablette couchée a toujours la barre réduite");
      await ouvrirAvecBarre(page, etat);
      await ouvrirEssai(page);
      const liste = page.locator('[data-volet="liste"]');
      const detail = page.locator('[data-volet="detail"]');
      await expect(detail.getByRole("heading", { level: 2, name: "Premier essai" })).toBeVisible();
      const zone = await zoneDeContenu(page);
      const marge = await margeAttendue(page);
      const bL = (await liste.boundingBox())!;
      const bD = (await detail.boundingBox())!;
      // La liste : une carte en relief (rayon 16 px, ombre), à la marge de la zone, sans filet.
      expect(Math.round(bL.x - zone.gauche)).toBe(marge);
      const style = await liste.evaluate((el) => {
        const s = getComputedStyle(el);
        return { rayon: s.borderTopLeftRadius, ombre: s.boxShadow, filet: s.borderRightWidth };
      });
      expect(style.rayon).toBe("16px");
      expect(style.ombre).not.toBe("none");
      expect(style.filet).toBe("0px");
      // La fiche prend le reste, jusqu'à la marge de droite : aucune bande vide.
      expect(bD.x).toBeGreaterThan(bL.x + bL.width);
      expect(Math.round(zone.droite - (bD.x + bD.width))).toBe(marge);
      // Les deux volets occupent toute la zone de contenu.
      const bV = (await page.locator("[data-deux-volets]").boundingBox())!;
      expect([Math.round(bV.x - zone.gauche), Math.round(zone.droite - (bV.x + bV.width))]).toEqual([0, 0]);
    });
  }

  test("un volet (téléphone, tablette portrait) : la liste seule, sans carte", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet : petits écrans");
    await ouvrirEssai(page);
    await expect(page.locator('[data-volet="liste"]').getByText("Deuxième essai")).toBeVisible();
    await expect(page.locator('[data-volet="detail"]')).toHaveCount(0);
  });
});

test.describe("Halo du Back-Office (R12)", () => {
  const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T." };

  test("sous /back-office, sans halo à elle, la page prend le bleu gris", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, {}, "/back-office");
    await page.locator("main h1, main h2").first().waitFor();
    const halo = page.getByTestId("halo-defaut");
    await expect(halo).toBeVisible();
    const [variable, bleuGris] = await page.evaluate(() => {
      const st = getComputedStyle(document.documentElement);
      return [st.getPropertyValue("--halo").trim(), st.getPropertyValue("--halo-back-office").trim()];
    });
    expect(bleuGris).toBe(HALO_BACK_OFFICE);
    expect(variable).toBe(HALO_BACK_OFFICE);
    expect(await halo.evaluate((el) => getComputedStyle(el, "::before").backgroundColor)).toBe("rgb(228, 231, 246)");
    await capture(page, "f1-halo-back-office");
  });

  test("en sombre, le halo du Back-Office prend la valeur sombre du bleu gris", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await page.emulateMedia({ colorScheme: "dark" });
    await signInAs(page, ADMIN, {}, "/back-office");
    await page.locator("main h1, main h2").first().waitFor();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    const halo = page.getByTestId("halo-defaut");
    await expect(halo).toBeVisible();
    const lire = () => page.evaluate(() => {
      const st = getComputedStyle(document.documentElement);
      return [st.getPropertyValue("--halo").trim(), st.getPropertyValue("--halo-back-office").trim()];
    });
    await expect.poll(lire).toEqual([HALO_BACK_OFFICE_SOMBRE, HALO_BACK_OFFICE_SOMBRE]);
    expect(await halo.evaluate((el) => getComputedStyle(el, "::before").backgroundColor)).toBe("rgb(38, 43, 69)");
    await capture(page, "f1-halo-back-office-sombre");
  });

  test("hors du Back-Office, le halo par défaut reste l'encre", async ({ page }) => {
    await ouvrirEssai(page);
    const halo = page.getByTestId("halo-defaut");
    await expect(halo).toBeVisible();
    expect(await halo.evaluate((el) => getComputedStyle(el, "::before").backgroundColor)).toBe("rgb(28, 28, 30)");
  });
});
