import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  HALO_BACK_OFFICE, HALO_BACK_OFFICE_SOMBRE, enTete, estGrandEcran, estTelephone, fenetreDuSite, interdireDialoguesNatifs,
  margeAttendue, ongletsRail, ouvrirAvecBarre, pilules, verifierAgencement, verifierPleineLargeur, zoneDeContenu,
} from "./helpers/agencement";

// Agencement v18, tranche F1 (docs/spec-agencement-v18.md) : les composants et règles communes.
// Essayés d'abord sur une page d'essai, portés par la tranche Z sur des pages réelles (la page
// d'essai est retirée) : Mon profil, Setlists, Statistiques, Équipes, Planning, les fiches d'une
// tâche et d'un évènement au Back-Office. Les règles de chaque page sont dans
// `agencement-v18-regles.spec.ts` ; ici, le comportement des composants eux-mêmes.
// Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN). Données fictives.

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.",
  poles: ["da"], plannings: ["culte"],
};

const tache = (titre: string, echeance: string) => ({
  pole: "da", titre, responsableUid: null, responsableNom: "", echeance, repetition: null, lien: "", note: "",
  prevenir: null, evenement: null, auteurUid: "uid-admin", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
});
const EV = {
  titre: "Foot au parc", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "14:00", heureFin: "16:00", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: 10, inscriptions: "auto", inscriptionOuverte: true,
  sansCompte: false, contact: "Alix D.", organisateurUid: "uid-admin", organisateurNom: "Alix D.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});

const DOCS: Record<string, Record<string, unknown>> = {
  "poles/da/taches/t1": tache("Préparer les affiches", "2026-10-08"),
  "poles/da/taches/t2": tache("Fond PPT du culte", "2026-10-12"),
  "evenements/foot": EV,
  "setlists/s1": {
    title: "Culte du 11 octobre", leader: "Alix D.", category: "Culte Francophone", date: "2026-10-11", language: "mixed",
    notes: "", ownerId: "uid-admin", isPrivate: false, items: [item("hosanna", 1), item("abba-pere", 2)],
  },
};

async function ouvrir(page: Page, chemin: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-06T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, DOCS, chemin);
  await expect(enTete(page).locator("h1").filter({ visible: true }).first()).toBeVisible();
}

/** Capture à regarder à l'œil et à comparer aux planches v18 (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300); // fondus finis
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

test.describe("EnTetePage (R1, R2, R3, R8)", () => {
  test("Mon profil : « ‹ Moi », titre, sous-titre, puis l'action à droite du titre", async ({ page }, info) => {
    await ouvrir(page, "/profil");
    const entete = enTete(page);
    const retour = entete.getByRole("link", { name: "Moi" });
    const h1 = entete.getByRole("heading", { level: 1 });
    const sous = entete.getByText(ADMIN_EMAIL);
    for (const l of [retour, h1, sous]) await expect(l).toBeVisible();
    const y = async (l: typeof h1) => (await l.boundingBox())!.y;
    expect(await y(retour)).toBeLessThan(await y(h1));
    expect(await y(h1)).toBeLessThan(await y(sous));
    // Le seul retour : « ‹ Section », 14 px gras gris, vers la section.
    await expect(retour).toHaveAttribute("href", /^\/moi\/?$/); // trailingSlash de next.config
    expect(await retour.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).fontWeight])).toEqual(["14px", "600"]);
    expect(await sous.evaluate((el) => getComputedStyle(el).fontSize)).toBe("14px");
    if (!estTelephone(info)) {
      // L'action principale est à droite du titre, sur sa ligne.
      const action = entete.getByRole("button", { name: "Enregistrer" });
      const bA = (await action.boundingBox())!;
      const bT = (await h1.boundingBox())!;
      expect(bA.x).toBeGreaterThan(bT.x + bT.width);
      expect(bA.y).toBeLessThan(bT.y + bT.height);
    }
  });

  test("Statistiques : le titre, puis le rail, puis la rangée (filtres en pilules)", async ({ page }) => {
    await ouvrir(page, "/back-office/statistiques");
    const entete = enTete(page);
    const h1 = entete.getByRole("heading", { level: 1, name: "Statistiques" });
    const rail = entete.locator('[data-onglets="rail"]');
    const rangee = entete.locator('[data-onglets="pilules"]').first();
    for (const l of [h1, rail, rangee]) await expect(l).toBeVisible();
    const y = async (l: typeof h1) => (await l.boundingBox())!.y;
    expect(await y(h1)).toBeLessThan(await y(rail));
    expect(await y(rail)).toBeLessThan(await y(rangee));
  });

  test("la marge de la page est un jeton CSS (--marge-page) qui suit la barre ; la pleine largeur mord", async ({ page }, info) => {
    await ouvrir(page, "/setlists");
    const jeton = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--marge-page").trim());
    expect(jeton).toBe(`${await margeAttendue(page)}px`);
    // En grand, les deux volets prennent toute la zone (un volet : la liste de la page elle-même).
    await verifierAgencement(page, { contenu: estGrandEcran(info) ? page.locator("[data-deux-volets]") : undefined });
    // La vérification de pleine largeur mord : le titre n'occupe pas la zone.
    await expect(verifierPleineLargeur(page, enTete(page).locator("h1"))).rejects.toThrow();
  });

  test("barre réduite : la marge passe à 28 px (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la barre latérale n'existe qu'en grand");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrir(page, "/setlists");
    expect(await margeAttendue(page)).toBe(28);
    await verifierAgencement(page);
  });
});

test.describe("ConfirmerProvider, useConfirmer (R9)", () => {
  test("« ⋯ › Supprimer » d'une tâche : Échap répond non, la tâche reste", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da/t1");
    await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    const fenetre = fenetreDuSite(page);
    await expect(fenetre).toBeVisible();
    await capture(page, "f1-confirmer");
    await page.keyboard.press("Escape");
    await expect(fenetre).toBeHidden();
    await expect(page.getByRole("heading", { name: "Préparer les affiches" }).filter({ visible: true })).toBeVisible();
  });

  test("la page change pendant que la fenêtre est ouverte (Précédent) : la fenêtre se ferme", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da");
    // Une navigation dans le site (un clic dans la liste), puis la fenêtre sur la fiche ouverte.
    await page.locator('[data-volet="liste"], main').getByText("Fond PPT du culte").first().click();
    await page.waitForURL(/\/back-office\/taches\/da\/t2/);
    await page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    const fenetre = fenetreDuSite(page);
    await expect(fenetre).toBeVisible();
    // Précédent, fenêtre ouverte : sa demande ne doit pas survivre sur la page d'avant (un clic sur
    // « Supprimer » agirait pour une fiche quittée).
    await page.goBack();
    await page.waitForURL(/\/back-office\/taches\/da\/?$/);
    await expect(fenetre).toBeHidden();
  });
});

test.describe("MenuActions (R9)", () => {
  test("« ⋯ » d'un évènement s'ouvre au clavier ; Début et Fin ; « Supprimer » passe par la fenêtre du site", async ({ page }) => {
    await ouvrir(page, "/back-office/evenements/foot");
    const declencheur = page.getByRole("button", { name: "Plus d'actions" }).filter({ visible: true });
    await declencheur.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await capture(page, "f1-menu");
    // Au clavier : Début et Fin vont à la première et à la dernière action.
    await page.keyboard.press("Home");
    await expect(menu.getByRole("menuitem", { name: "Dupliquer" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(menu.getByRole("menuitem", { name: "Supprimer" })).toBeFocused();
    await page.keyboard.press("Enter");
    const fenetre = fenetreDuSite(page);
    await expect(fenetre.getByRole("heading", { name: "Supprimer « Foot au parc » ?" })).toBeVisible();
    await fenetre.getByRole("button", { name: "Annuler" }).click();
    await expect(fenetre).toBeHidden();
    await expect(page).toHaveURL(/\/back-office\/evenements\/foot\/?$/);
  });
});

test.describe("OngletsRail et Pilules (R4, R5)", () => {
  test("rail en boutons (Statistiques) : un tablist, un seul arrêt de tabulation, les flèches, Entrée choisit", async ({ page }) => {
    await ouvrir(page, "/back-office/statistiques");
    const rail = enTete(page).locator('[data-onglets="rail"]');
    await expect(rail).toHaveAttribute("role", "tablist");
    const premier = rail.getByRole("tab", { name: "Les plus joués" });
    const second = rail.getByRole("tab", { name: "Jamais joués" });
    const dernier = rail.getByRole("tab", { name: "À redécouvrir" });
    await expect(premier).toHaveAttribute("aria-selected", "true");
    await expect(rail.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await premier.focus();
    await page.keyboard.press("ArrowRight");
    await expect(second).toBeFocused();
    // Activation manuelle : la flèche déplace le focus, elle ne change pas la vue.
    await expect(premier).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(dernier).toBeFocused();
    await page.keyboard.press("ArrowRight"); // le rail boucle
    await expect(premier).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(dernier).toBeFocused();
    await page.keyboard.press("Home");
    await expect(premier).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(second).toHaveAttribute("tabindex", "0");
    await expect(premier).toHaveAttribute("tabindex", "-1");
  });

  test("rail en liens (Équipes) : l'adresse courante porte aria-current=page", async ({ page }) => {
    await ouvrir(page, "/back-office/equipes/personnes");
    const rail = ongletsRail(page).filter({ has: page.getByRole("link", { name: "Organigramme" }) });
    await expect(rail.getByRole("link", { name: "Personnes" })).toHaveAttribute("aria-current", "page");
    await expect(rail.getByRole("link", { name: "Organigramme" })).not.toHaveAttribute("aria-current", "page");
  });

  test("pilules des plannings (en grand) : l'actif à la couleur de son service", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand, les plannings sont des pilules dans l'en-tête (R6)");
    await ouvrir(page, "/planning/culte");
    const culte = pilules(page).filter({ visible: true }).first().getByRole("link", { name: "Culte" });
    await expect(culte).toHaveAttribute("aria-current", "page");
    // La couleur du service (#2d5a65), après le fondu de 150 ms.
    await expect.poll(() => culte.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(45, 90, 101)");
  });
});

test.describe("DeuxVolets en liste-carte (R10)", () => {
  for (const etat of ["depliee", "reduite"] as const) {
    test(`Setlists, barre ${etat === "depliee" ? "dépliée" : "réduite"} : liste en carte à la marge, fiche jusqu'à la marge, sans filet (grands écrans)`, async ({ page }, info) => {
      test.skip(!estGrandEcran(info), "deux volets : grands écrans");
      test.skip(etat === "depliee" && info.project.name === "tablette-paysage", "la tablette couchée a toujours la barre réduite");
      await ouvrirAvecBarre(page, etat);
      await ouvrir(page, "/setlists");
      const liste = page.locator('[data-volet="liste"]');
      const detail = page.locator('[data-volet="detail"]');
      await expect(detail.getByRole("heading", { level: 2, name: "Culte du 11 octobre" })).toBeVisible();
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

  test("un volet (téléphone, tablette portrait), Back-Office › Tâches : la liste seule", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet : petits écrans");
    await ouvrir(page, "/back-office/taches/da");
    await expect(page.locator('[data-volet="liste"]').getByText("Fond PPT du culte")).toBeVisible();
    await expect(page.locator('[data-volet="detail"]')).toHaveCount(0);
  });
});

test.describe("Halo du Back-Office (R12)", () => {
  test("sous /back-office, sans halo à elle, la page prend le bleu gris", async ({ page }) => {
    await ouvrir(page, "/back-office");
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
    await page.emulateMedia({ colorScheme: "dark" });
    await ouvrir(page, "/back-office");
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

  test("hors du Back-Office (Mon profil), le halo par défaut reste l'encre", async ({ page }) => {
    await ouvrir(page, "/profil");
    const halo = page.getByTestId("halo-defaut");
    await expect(halo).toBeVisible();
    expect(await halo.evaluate((el) => getComputedStyle(el, "::before").backgroundColor)).toBe("rgb(28, 28, 30)");
  });
});
