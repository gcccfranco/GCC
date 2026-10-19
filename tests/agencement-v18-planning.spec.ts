import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, fenetreDuSite, interdireDialoguesNatifs, margeAttendue, ouvrirAvecBarre, repondreDansLeSite, verifierAgencement, zoneDeContenu } from "./helpers/agencement";
import { PLANNING_COLORS } from "../src/lib/serviceColors";

// Agencement v18, tranches T4a et T4b (docs/spec-agencement-v18.md, B6, B7, A1 à A4) : l'en-tête et la
// rangée de grille communes du Planning, la période unique (année et T1–T4 en rail), les groupes
// au rail ; le Planning du Back-Office en piste A (deux rangées de commandes au lieu de cinq).
// Cinq projets. Noms fictifs seulement.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["08/11", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", "", ""],
  ["15/11", "Président J.", "Choriste K.", "Choriste L.", "Pianiste M.", "Guitariste N.", "Batteur O.", "Sono P.", "Projection Q.", "Orateur R.", "", "", ""],
  ["22/11", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "Guitariste N.", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", "", ""],
]);

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T.", planningName: "Pianiste D." };
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Pianiste D." };

/** Le dimanche 15/11/2026 (T4), le Sheet simulé (le Culte seul a des lignes). */
async function ouvrir(page: Page, qui: FakeProfile, vers: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, qui, {}, vers);
}

/** La rangée de la grille (`BarreDeGrille`) : service, période, filtres. */
const barre = (page: Page) => page.getByTestId("barre-grille").filter({ visible: true });
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const fond = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
const milieuY = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return b.y + b.height / 2;
};

// ─── Back-Office (B6, B7) ─────────────────────────────────────────────────────

test.describe("BO Planning, piste A", () => {
  test("l'agencement commun ; le titre « Planning », le planning et ses cases vides en sous-titre, « Exporter » dans l'en-tête", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    await expect(page.locator('[data-grille="culte"]')).toBeVisible();
    // La grille pleine zone ; les sous-parties, l'année et le trimestre en rail, les plannings en pilules.
    await verifierAgencement(page, { premierBloc: barre(page), contenu: page.locator('[data-grille="culte"]'), onglets: { rail: 3, pilules: 1 } });
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    const sousTitre = enTete(page).locator("p").first();
    await expect(sousTitre).toContainText("Culte Franco");
    await expect(sousTitre).toContainText("Dimanche 10:30");
    await expect(sousTitre).toContainText(/\d+ cases? vides? ce trimestre/);
    await expect(enTete(page).getByRole("button", { name: /Exporter/ })).toBeVisible();
    // Le rail des sous-parties (admins) dans l'en-tête.
    await expect(enTete(page).locator('[data-onglets="rail"]').getByRole("link")).toHaveText(["Plannings", "Sans compte"]);
  });

  test("deux rangées de commandes : le rail, puis les plannings en pilules, la période et « Mes dates »", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    const plannings = barre(page).getByRole("navigation", { name: "Plannings" });
    await expect(plannings).toHaveAttribute("data-onglets", "pilules");
    await expect(plannings.getByRole("link")).toHaveText(["Culte Franco", "Prépa. Table", "Groupes", "EDD", "Campus", "Intergroupe", "Interfranco"]);
    const actif = plannings.getByRole("link", { name: "Culte Franco" });
    await expect(actif).toHaveAttribute("aria-current", "page");
    expect(await fond(actif), "l'actif à la couleur du service").toBe(rgb(PLANNING_COLORS.culte));
    const periode = barre(page).getByRole("tablist", { name: "Trimestre" });
    await expect(periode).toHaveAttribute("data-onglets", "rail");
    await expect(periode.getByRole("tab", { name: "T4" })).toHaveAttribute("aria-selected", "true");
    await expect(barre(page).getByRole("button", { name: "Mes dates" })).toBeVisible();
    // Plus de bandeau de couleur au-dessus de la grille, plus d'export dans la grille.
    await expect(page.getByTestId("grille-bandeau")).toHaveCount(0);
    await expect(page.locator('[data-grille="culte"]').getByRole("button", { name: /Exporter/ })).toHaveCount(0);

    if (estGrandEcran(info)) {
      // Plannings et période sur la même rangée, sous le rail ; la grille juste dessous.
      expect(Math.abs((await milieuY(plannings)) - (await milieuY(periode)))).toBeLessThan(12);
      const rail = enTete(page).locator('[data-onglets="rail"]');
      expect(await milieuY(rail)).toBeLessThan(await milieuY(plannings));
      const finBarre = (await barre(page).boundingBox())!;
      const grille = (await page.getByTestId("grille-defilement").boundingBox())!;
      expect(grille.y - (finBarre.y + finBarre.height), "rien entre la rangée et la grille").toBeLessThan(32);
    }
  });

  test("la période unique : l'année et le trimestre en rail, dans la rangée de la grille", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    const annees = barre(page).getByRole("tablist", { name: "Année" });
    await expect(annees).toHaveAttribute("data-onglets", "rail");
    await expect(annees.getByRole("tab")).toHaveText(["2026", "2027"]);
    await annees.getByRole("tab", { name: "2027" }).click();
    await expect(annees.getByRole("tab", { name: "2027" })).toHaveAttribute("aria-selected", "true");
    await expect(barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: /^T1/ })).toHaveAttribute("aria-selected", "true");
  });

  test("le halo est celui du service", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    await expect(page.getByTestId("halo")).toHaveCount(1);
    expect(await page.getByTestId("halo").evaluate((el) => (el as HTMLElement).style.getPropertyValue("--halo"))).toBe(PLANNING_COLORS.culte);
  });

  test("Sans compte : même en-tête, sans rangée de grille", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/sans-compte");
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    await expect(enTete(page).locator('[data-onglets="rail"]').getByRole("link", { name: "Sans compte" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("barre-grille")).toHaveCount(0);
  });

  // Relecture : sur téléphone, le sous-titre était coupé (« … · 4 cas… ») ; il passe à la ligne.
  test("téléphone : le sous-titre tient en entier, cases vides comprises", async ({ page }, info) => {
    test.skip(!estTelephone(info), "la largeur du téléphone");
    await ouvrir(page, ADMIN, "/back-office/planning/culte");
    const sousTitre = enTete(page).locator("p").first();
    await expect(sousTitre).toContainText(/\d+ cases? vides? ce trimestre/);
    expect(await sousTitre.evaluate((p) => p.scrollWidth - p.clientWidth), "rien de coupé en largeur").toBeLessThanOrEqual(0);
  });
});

// ─── Relecture : chaque planning, App et Back-Office ─────────────────────────

// Spec, « Tests », T4 : « App : le h1 est Planning sur chaque planning, le service est un h2 » ; au
// Back-Office, chaque page écrit son sous-titre (planning, cases vides) et garde sa rangée de pilules.
// Intergroupe et Interfranco passent par `PageDatesChoisies`, les autres par leur page.
const CHAQUE_PLANNING: { cle: string; onglet: string; service: string; sousTitreBO: RegExp }[] = [
  { cle: "culte", onglet: "Culte Franco", service: "Culte Franco", sousTitreBO: /^Culte Franco · .*\d+ cases? vides? ce trimestre$/ },
  { cle: "table", onglet: "Prépa. Table", service: "Prépa. Table du Seigneur", sousTitreBO: /^Prépa\. Table du Seigneur · \d+ cases? vides? ce trimestre$/ },
  { cle: "groupes", onglet: "Groupes", service: "Groupes", sousTitreBO: /^Paix · .*\d+ cases? vides? ce trimestre$/ },
  { cle: "edd", onglet: "EDD", service: "EDD — École du Dimanche", sousTitreBO: /^EDD — École du Dimanche · .*\d+ cases? vides? sur la période$/ },
  { cle: "campus", onglet: "Campus", service: "Campus", sousTitreBO: /^Campus · \d+ cases? vides? cette année$/ },
  { cle: "intergroupe", onglet: "Intergroupe", service: "Intergroupe", sousTitreBO: /^Intergroupe · \d+ cases? vides? cette année$/ },
  { cle: "interfranco", onglet: "Interfranco", service: "Interfranco", sousTitreBO: /^Interfranco · \d+ cases? vides? cette année$/ },
];

test.describe("Relecture : chaque planning a l'en-tête « Planning » et sa rangée", () => {
  for (const { cle, onglet, service, sousTitreBO } of CHAQUE_PLANNING) {
    test(`App, ${service} : h1 « Planning », le service en h2 dans la rangée`, async ({ page }, info) => {
      await ouvrir(page, MEMBRE, `/planning/${cle}`);
      await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText(service);
      await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
      // Les plannings en pilules dans l'en-tête en grand seulement ; aucune autre rangée de pilules.
      await verifierAgencement(page, { premierBloc: barre(page), contenu: barre(page), onglets: { pilules: estGrandEcran(info) ? 1 : 0 } });
    });

    test(`Back-Office, ${service} : h1 « Planning », le planning et ses cases vides en sous-titre, les plannings en pilules`, async ({ page }) => {
      await ouvrir(page, ADMIN, `/back-office/planning/${cle}`);
      const plannings = barre(page).getByRole("navigation", { name: "Plannings" });
      await expect(plannings.getByRole("link", { name: onglet, exact: true })).toHaveAttribute("aria-current", "page");
      await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
      await expect(enTete(page).locator("p").first()).toHaveText(sousTitreBO);
      await expect(barre(page).getByRole("heading", { level: 2 }), "le service n'est pas répété en h2").toHaveCount(0);
      await verifierAgencement(page, { premierBloc: barre(page), contenu: barre(page), onglets: { pilules: 1 } });
    });
  }
});

// ─── App (A2, A3, R6) ─────────────────────────────────────────────────────────

test.describe("App Planning : le titre « Planning », le service en h2", () => {
  test("Culte : l'agencement commun, h1 « Planning », h2 du service avec son horaire et sa période", async ({ page }, info) => {
    await ouvrir(page, MEMBRE, "/planning/culte");
    await expect(page.locator('[data-grille="culte"]')).toBeVisible();
    // Le trimestre en rail (une seule année pour un membre) ; les plannings en pilules en grand
    // seulement (ailleurs, la barre collante de V7).
    await verifierAgencement(page, {
      premierBloc: barre(page), contenu: page.locator('[data-grille="culte"]'),
      onglets: { rail: 1, pilules: estGrandEcran(info) ? 1 : 0 },
    });
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    await expect(enTete(page)).toContainText("Qui sert quand, dans tous les plannings de l'église");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Culte Franco");
    await expect(barre(page)).toContainText("Dimanche 10:30 · 4e trimestre 2026");
    await expect(barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: "T4" })).toHaveAttribute("aria-selected", "true");
  });

  test("grand écran : les plannings en pilules dans l'en-tête, l'actif à sa couleur ; la grille à en-tête gris", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand seulement : téléphone et tablette gardent la barre collante");
    await ouvrir(page, MEMBRE, "/planning/culte");
    const plannings = enTete(page).getByRole("navigation", { name: "Plannings" });
    await expect(plannings).toHaveAttribute("data-onglets", "pilules");
    await expect(plannings.getByRole("link")).toHaveCount(8);
    const actif = plannings.getByRole("link", { name: "Culte Franco" });
    await expect(actif).toHaveAttribute("aria-current", "page");
    expect(await fond(actif)).toBe(rgb(PLANNING_COLORS.culte));
    await expect(page.getByTestId("barre-section")).toBeHidden();
    // A2 : la couleur du service sur les dates seulement, pas sur l'en-tête de la grille.
    const th = page.getByTestId("grille-colonnes").locator("th").first();
    expect(await fond(th)).not.toBe(rgb(PLANNING_COLORS.culte));
  });

  test("téléphone : la feuille des plannings (V7) marche toujours, sous le titre", async ({ page }, info) => {
    test.skip(!estTelephone(info), "la feuille est celle du téléphone");
    await ouvrir(page, MEMBRE, "/planning/culte");
    const bouton = page.getByTestId("menu-plannings");
    await expect(bouton).toBeVisible();
    await bouton.click();
    await page.getByTestId("feuille-plannings").getByRole("link", { name: "Groupes" }).click();
    await expect(page).toHaveURL(/\/planning\/groupes\/?$/);
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Groupes");
  });

  test("tablette : la rangée collante des plannings, posée sous le titre", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait");
    await ouvrir(page, MEMBRE, "/planning/culte");
    const rangee = page.getByTestId("onglets-section");
    await expect(rangee).toBeVisible();
    const tete = (await enTete(page).boundingBox())!;
    expect((await rangee.boundingBox())!.y).toBeGreaterThanOrEqual(tete.y + tete.height - 1);
    await rangee.getByRole("link", { name: "Groupes" }).click();
    await expect(page).toHaveURL(/\/planning\/groupes\/?$/);
  });

  // Lot F (spec-retouches-v18.md, D24) : Fidélité n'a plus qu'un planning, plus de pilules Groupe · Musiciens.
  test("Groupes : Paix · Fidélité · Bonté en rail, Fidélité en un seul planning", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning/groupes");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Groupes");
    const groupes = barre(page).getByRole("tablist", { name: "Groupes" });
    await expect(groupes).toHaveAttribute("data-onglets", "rail");
    await expect(groupes.getByRole("tab")).toHaveText(["Paix", "Fidélité", "Bonté"]);
    await expect(groupes.getByRole("tab", { name: "Paix" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: "Paix", exact: true }), "plus de grands boutons de couleur").toHaveCount(0);
    await expect(barre(page).locator('[data-onglets="pilules"]')).toHaveCount(0);

    await groupes.getByRole("tab", { name: "Fidélité" }).click();
    await expect(page.locator('[data-grille="fidelite"]')).toBeVisible();
    await expect(barre(page).locator('[data-onglets="pilules"]'), "plus de pilules Groupe · Musiciens").toHaveCount(0);
    await groupes.getByRole("tab", { name: "Bonté" }).click();
    await expect(page.locator('[data-grille="bonte"]')).toBeVisible();
    await expect(barre(page).locator('[data-onglets="pilules"]')).toHaveCount(0);
  });

  test("EDD et Campus : la classe et la vue en rail, dans la rangée", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning/edd");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("EDD — École du Dimanche");
    await expect(barre(page).getByRole("tablist", { name: "Classe" }).getByRole("tab")).toHaveText(["中班", "大班", "高班"]);
    await expect(barre(page).getByRole("tablist", { name: "Période" }).getByRole("tab")).toHaveCount(6);
    await page.goto("/planning/campus");
    await expect(barre(page).getByRole("heading", { level: 2 })).toHaveText("Campus");
    const vues = barre(page).getByRole("tablist", { name: "Vue" });
    await expect(vues.getByRole("tab")).toHaveText(["Louange", "Répétition", "Grille"]);
  });

  // Relecture : planches `v18-app-planning-grille-a` et `v18-bo-planning-a`, « 4/10 » puis « Cette
  // semaine » dessous ; le badge remplaçait la date. Le téléphone (cartes) montrait déjà les deux.
  for (const [espace, qui, vers] of [["App", MEMBRE, "/planning/culte"], ["Back-Office", ADMIN, "/back-office/planning/culte"]] as const) {
    test(`${espace} : la ligne de cette semaine garde sa date, le badge dessous`, async ({ page }) => {
      await ouvrir(page, qui, vers);
      const ligne = page.locator('[data-date-cell="2026-11-15"], [data-date-carte="2026-11-15"]').filter({ visible: true });
      await expect(ligne).toContainText("15/11");
      await expect(ligne).toContainText("Cette semaine");
    });
  }

  // Relecture : un prénom effacé (enregistré vide sur l'appareil) était remis par le profil.
  test("un prénom effacé le reste après un rechargement : le profil ne le remet pas", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning/culte");
    const champ = barre(page).getByPlaceholder("Mon prénom…");
    await expect(champ, "prérempli depuis le profil").toHaveValue("Pianiste D.");
    await barre(page).getByRole("button", { name: "Effacer" }).click();
    await expect(champ).toHaveValue("");
    const profilLu = page.waitForResponse((r) => r.url().includes("/documents/users/uid-membre"));
    await page.reload();
    await profilLu;
    await expect(page.locator('[data-case="2026-11-15|presidence"]').filter({ visible: true })).toContainText("Président J.");
    // Le profil est lu : laisser à React le temps d'en tirer le prénom, s'il le faisait.
    await page.waitForTimeout(500);
    await expect(champ).toHaveValue("");
    await expect(barre(page).getByRole("button", { name: "Mes dates" })).toHaveCount(0);
  });

  test("accueil : un seul h1, « Planning », dans l'en-tête commun", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/planning");
    await expect(page.locator("h1").filter({ visible: true })).toHaveCount(1);
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
  });
});

// ─── T4b : accueil (A1) ───────────────────────────────────────────────────────

// Jeudi 1er octobre 2026 : « Ce dimanche » est le 4 octobre (T4). Noms fictifs.
const ACCUEIL_CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["04/10", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "Guitariste N.", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "Traducteur J.", "Servant K.", ""],
  ["18/10", "Président J.", "Choriste K.", "Choriste L.", "Pianiste D.", "", "Batteur O.", "Sono P.", "Projection Q.", "Orateur R.", "", "", ""],
]);
const groupeCsv = (pres: string, musiciens: string) => csv([["DATE", "Présidence", "Musiciens", "Orateur"], ["04/10", pres, musiciens, "Orateur Z."]]);
const ACCUEIL_EDD = csv([
  ["DATE", "Présidence", "Suppléant", "Piano", "Cajon", "Guitare", "", "Classe"],
  ["04/10", "Moniteur S.", "", "", "", "", "", "中班"],
  ["04/10", "Moniteur T.", "", "", "", "", "", "大班"],
  ["04/10", "Moniteur U.", "", "", "", "", "", "高班"],
]);
/** Franco_Table_PtD : la Prépa. Table à gauche (date en colonne 1, noms en 2 à 5). */
const tableCsv = (lignes: [string, string][]) =>
  csv(lignes.map(([d, n]) => Array.from({ length: 21 }, (_, i) => (i === 1 ? d : i === 2 ? n : ""))));
const ACCUEIL_TABLE = tableCsv([["27/09", "Famille Z."], ["04/10", "Famille Test"], ["11/10", "Famille Y."], ["06/12", "Famille X."]]);
const FEUILLES_ACCUEIL: Record<string, string> = {
  Franco_Louange: ACCUEIL_CULTE,
  Paix_T4: groupeCsv("Président P.", "Musicien Q."),
  "Fidélité_T4": groupeCsv("Président R.", ""),
  "Bonté_T4": groupeCsv("Président S.", "Musicien T."),
  EDD: ACCUEIL_EDD,
  Franco_Table_PtD: ACCUEIL_TABLE,
};
const MUSICIEN: FakeProfile = { uid: "uid-musicien", email: "musicien@example.com", firstName: "Pianiste", lastName: "D.", planningName: "Pianiste D.", serviceRoles: { "Culte Francophone": ["musicien"] } };
const accueilItem = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const SETLIST_ACCUEIL = {
  title: "Culte du 4 octobre", leader: "Président A.", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [accueilItem("hosanna", 1), accueilItem("abba-pere", 2)],
};

/** `quand` : l'heure simulée (par défaut le jeudi 1er octobre 2026) ; `feuilles` : des feuilles en plus. */
async function ouvrirAccueilOuTable(page: Page, vers: string, docs: Record<string, Record<string, unknown>> = {},
  { quand = "2026-10-01T10:00:00", feuilles = {} }: { quand?: string; feuilles?: Record<string, string> } = {}) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(quand));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: { ...FEUILLES_ACCUEIL, ...feuilles }[feuille] ?? "" });
  });
  return signInAs(page, MUSICIEN, { "setlists/sl-1": SETLIST_ACCUEIL, ...docs }, vers);
}

const ceDimanche = (page: Page) => page.getByRole("region", { name: /Ce dimanche/ });
const carteDeLaTable = (page: Page) => ceDimanche(page).getByTestId("carte-table");
const carteDesGroupes = (page: Page) => ceDimanche(page).getByTestId("ligne-groupe").first().locator("xpath=ancestor::article[1]");
const carteEdd = (page: Page) => ceDimanche(page).getByTestId("ligne-edd").first().locator("xpath=ancestor::article[1]");
const boite = async (l: Locator) => (await l.boundingBox())!;

test.describe("T4b — Planning, accueil (A1)", () => {
  test("l'agencement commun ; les plannings sous le titre ; « Pour moi » avec la setlist du service", async ({ page }, info) => {
    await ouvrirAccueilOuTable(page, "/planning");
    const pourMoi = page.getByRole("region", { name: "Pour moi" });
    await expect(pourMoi.getByText("Présidence : Président A.")).toBeVisible();
    await expect(pourMoi.getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
    // Le premier bloc : le contenu de la section (`main`, à la marge de la zone).
    const contenu = page.locator("main").filter({ has: ceDimanche(page) }).last();
    await verifierAgencement(page, { premierBloc: contenu, contenu, onglets: { rail: 0, pilules: estGrandEcran(info) ? 1 : 0 } });
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("Planning");
    if (estGrandEcran(info)) {
      const plannings = enTete(page).getByRole("navigation", { name: "Plannings" });
      await expect(plannings.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
      expect((await boite(plannings)).y, "les plannings sous le titre").toBeGreaterThan((await boite(enTete(page).locator("h1"))).y);
      // « Pour moi » à droite de « Ce dimanche ».
      expect((await boite(pourMoi)).x).toBeGreaterThan((await boite(ceDimanche(page))).x + 100);
    }
  });

  test("barre dépliée : la Table sous Groupes et EDD, sur une ligne", async ({ page }, info) => {
    test.skip(!estGrandEcran(info) || info.project.name === "tablette-paysage", "ordinateur, barre dépliée");
    await ouvrirAvecBarre(page, "depliee");
    await ouvrirAccueilOuTable(page, "/planning");
    await expect(carteDeLaTable(page)).toContainText("Famille Test");
    const groupes = await boite(carteDesGroupes(page));
    const table = await boite(carteDeLaTable(page));
    expect(table.y, "la Table sous les groupes").toBeGreaterThan(groupes.y + groupes.height - 1);
    // Une ligne : le libellé et le nom côte à côte.
    const libelle = await boite(carteDeLaTable(page).getByText("Prépa. Table", { exact: true }));
    const nom = await boite(carteDeLaTable(page).getByText("Famille Test", { exact: true }));
    expect(Math.abs(libelle.y - nom.y)).toBeLessThan(4);
    await expect(carteDeLaTable(page).getByRole("heading", { name: "Table" }), "l'en-tête « Table » : sur deux étages seulement").toBeHidden();
  });

  test("ordinateur-1440, barre réduite : Groupes, EDD et Table sur une rangée, la Table sur deux étages ; le Culte en trois colonnes", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "1 440 px, barre réduite : la colonne « Ce dimanche » dépasse 720 px");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrirAccueilOuTable(page, "/planning");
    await expect(carteDeLaTable(page)).toContainText("Famille Test");
    const [g, e, t] = [await boite(carteDesGroupes(page)), await boite(carteEdd(page)), await boite(carteDeLaTable(page))];
    expect(Math.abs(g.y - e.y), "Groupes et EDD à la même hauteur").toBeLessThan(2);
    expect(Math.abs(g.y - t.y), "la Table sur la même rangée").toBeLessThan(2);
    expect(e.x).toBeGreaterThan(g.x + g.width - 1);
    expect(t.x).toBeGreaterThan(e.x + e.width - 1);
    // Deux étages : le libellé au-dessus du nom.
    const libelle = await boite(carteDeLaTable(page).getByText("Prépa. Table", { exact: true }));
    const nom = await boite(carteDeLaTable(page).getByText("Famille Test", { exact: true }));
    expect(nom.y, "le nom sous son libellé").toBeGreaterThan(libelle.y + libelle.height - 1);
    // Comme Groupes et EDD, un en-tête (planche : « Table · 10:00 », table_empilee).
    const entete = await boite(carteDeLaTable(page).getByRole("heading", { name: "Table" }));
    expect(libelle.y, "l'en-tête au-dessus du libellé").toBeGreaterThan(entete.y + entete.height - 1);
    await expect(carteDeLaTable(page).getByRole("link", { name: "Je m'inscris" })).toBeVisible();
    // Le Culte : trois colonnes de rôles.
    const xs = await ceDimanche(page).getByTestId("carte-culte").locator("dt").evaluateAll((dts) => [...new Set(dts.map((d) => Math.round(d.getBoundingClientRect().x)))]);
    expect(xs, "trois colonnes de rôles").toHaveLength(3);
  });

  // Relecture : la barre est réduite sur l'iPad couché aussi (R15), mais le seuil est celui du
  // conteneur : à 1 080 px, « Ce dimanche » (à côté de « Pour moi ») reste sous 720 px.
  test("tablette couchée, barre réduite : « Ce dimanche » sous 720 px, la Table sous Groupes et EDD, sur une ligne", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette-paysage", "iPad couché");
    await ouvrirAccueilOuTable(page, "/planning");
    await expect(carteDeLaTable(page)).toContainText("Famille Test");
    expect((await boite(ceDimanche(page))).width, "la colonne « Ce dimanche »").toBeLessThan(720);
    const [g, e, t] = [await boite(carteDesGroupes(page)), await boite(carteEdd(page)), await boite(carteDeLaTable(page))];
    expect(Math.abs(g.y - e.y), "Groupes et EDD côte à côte").toBeLessThan(2);
    expect(t.y, "la Table dessous").toBeGreaterThan(Math.max(g.y + g.height, e.y + e.height) - 1);
    const libelle = await boite(carteDeLaTable(page).getByText("Prépa. Table", { exact: true }));
    const nom = await boite(carteDeLaTable(page).getByText("Famille Test", { exact: true }));
    expect(Math.abs(libelle.y - nom.y), "une ligne").toBeLessThan(4);
    await expect(carteDeLaTable(page).getByRole("heading", { name: "Table" })).toBeHidden();
  });

  // Relecture : un dimanche d'Interfranco, la carte du service remplace Groupes ; la Table reste
  // sous elle et sous EDD, sur une ligne, même barre réduite (pas de rangée à trois).
  test("ordinateur-1440, barre réduite, dimanche d'Interfranco : la Table reste dessous, sur une ligne", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "1 440 px, barre réduite");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrirAccueilOuTable(page, "/planning", {}, {
      feuilles: {
        Interfranco: csv([
          ["INTERFRANCO Année 2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Cajon/Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur"],
          ["04/10", "Président V.", "Choriste W.", "Choriste X.", "Pianiste Y.", "", "", "", "", "", ""],
        ]),
      },
    });
    const inter = ceDimanche(page).getByTestId("carte-inter");
    await expect(inter).toContainText("Président V.");
    await expect(carteDeLaTable(page)).toContainText("Famille Test");
    const [i, e, t] = [await boite(inter), await boite(carteEdd(page)), await boite(carteDeLaTable(page))];
    expect(t.y, "la Table sous Interfranco et EDD").toBeGreaterThan(Math.max(i.y + i.height, e.y + e.height) - 1);
    const libelle = await boite(carteDeLaTable(page).getByText("Prépa. Table", { exact: true }));
    const nom = await boite(carteDeLaTable(page).getByText("Famille Test", { exact: true }));
    expect(Math.abs(libelle.y - nom.y), "une ligne").toBeLessThan(4);
    await expect(carteDeLaTable(page).getByRole("heading", { name: "Table" })).toHaveCount(0);
  });
});

// ─── T4b : Prépa. Table (A4) ──────────────────────────────────────────────────

const petitDejDoc = (dimanche: string, nom: string, uid: string) => ({
  dimanche, nom, uid, auteurUid: uid, creeLe: "2026-09-01T10:00:00.000Z", modifieLe: "2026-09-01T10:00:00.000Z",
});
const cartePetitDej = (page: Page) => page.getByRole("region", { name: "Petit déj", exact: true });
const carteTableDuSeigneur = (page: Page) => page.getByRole("region", { name: "Prépa. Table du Seigneur", exact: true });
const carteTonPetitDej = (page: Page) => page.getByRole("region", { name: "Ton petit déj", exact: true });

test.describe("T4b — Prépa. Table (A4)", () => {
  test("petit déj et Table du Seigneur côte à côte en grand, l'un sous l'autre sur téléphone ; plus de colonne de 512 px", async ({ page }, info) => {
    await ouvrirAccueilOuTable(page, "/planning/table");
    await expect(cartePetitDej(page).locator('[data-dimanche="2026-10-04"]')).toBeVisible();
    await expect(carteTableDuSeigneur(page)).toBeVisible();
    await expect(carteTonPetitDej(page)).toBeVisible();
    await verifierAgencement(page, { premierBloc: barre(page), contenu: barre(page), onglets: { rail: 1, pilules: estGrandEcran(info) ? 1 : 0 } });
    const pd = await boite(cartePetitDej(page));
    const table = await boite(carteTableDuSeigneur(page));
    const ton = await boite(carteTonPetitDej(page));
    if (estGrandEcran(info)) {
      expect(Math.abs(pd.y - table.y), "les deux colonnes partent ensemble").toBeLessThan(2);
      expect(table.x, "la Table à droite").toBeGreaterThan(pd.x + pd.width - 1);
      expect(ton.y, "« Ton petit déj » sous la Table").toBeGreaterThan(table.y + table.height - 1);
      // Plus de colonne de 512 px : les deux colonnes prennent toute la zone, moins ses marges.
      const { droite } = await zoneDeContenu(page);
      expect(Math.abs(table.x + table.width - (droite - (await margeAttendue(page)))), "jusqu'à la marge de droite").toBeLessThan(2);
    } else if (estTelephone(info)) {
      expect(table.y, "la Table sous le petit déj").toBeGreaterThan(pd.y + pd.height - 1);
      expect(ton.y).toBeGreaterThan(table.y + table.height - 1);
    }
  });

  test("Prépa. Table du Seigneur : les équipes du trimestre choisi, rien des autres", async ({ page }) => {
    await ouvrirAccueilOuTable(page, "/planning/table");
    const table = carteTableDuSeigneur(page);
    await expect(table.getByText("Famille Test", { exact: true })).toBeVisible();
    await expect(table.getByText("Famille Y.", { exact: true })).toBeVisible();
    await expect(table.getByText("Famille X.", { exact: true })).toBeVisible();
    await expect(table.getByText("Famille Z.", { exact: true }), "le 27/09 est au T3").toHaveCount(0);
    // Planche v18-app-planning-table-a : une tuile de date et « Dimanche de sainte cène » par équipe ;
    // la mention « un dimanche par mois » est retirée (retouches v18, D15).
    await expect(table.getByText("un dimanche par mois")).toHaveCount(0);
    await expect(table.locator('[data-dimanche="2026-10-04"]').getByTestId("tuile")).toContainText("4");
    await expect(table.getByText("Dimanche de sainte cène")).toHaveCount(3);
    await barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: /^T3/ }).click();
    await expect(table.getByText("Famille Z.", { exact: true })).toBeVisible();
    await expect(table.getByText("Famille Test", { exact: true })).toHaveCount(0);
  });

  test("le petit déj : « n libres sur N » ; ma ligne en encre avec « ⋯ » (Modifier, Retirer), sans boutons dans la rangée", async ({ page }) => {
    const db = await ouvrirAccueilOuTable(page, "/planning/table", {
      "petitDej/m": petitDejDoc("2026-10-11", "Pianiste D.", MUSICIEN.uid),
      "petitDej/a": petitDejDoc("2026-10-18", "Famille Autre", "uid-autre"),
    });
    const carte = cartePetitDej(page);
    // T4 2026 : 13 dimanches, deux pris.
    await expect(carte.getByText("11 libres sur 13")).toBeVisible();
    const le11 = carte.locator('[data-dimanche="2026-10-11"]');
    await expect(le11.getByTestId("moi")).toHaveText("Pianiste D.");
    await expect(le11.getByRole("button", { name: "Retirer" })).toHaveCount(0);
    await expect(le11.getByRole("button", { name: "Modifier" })).toHaveCount(0);
    await expect(carte.locator('[data-dimanche="2026-10-18"]').getByRole("button"), "la ligne d'un autre : le texte seul").toHaveCount(0);

    await le11.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Modifier" }).click();
    const champ = le11.getByRole("textbox", { name: "Modifier" });
    await expect(champ).toBeFocused();
    await champ.fill("Famille Test D.");
    await champ.press("Enter");
    await expect(le11.getByText("Famille Test D.", { exact: true })).toBeVisible();
    expect(db.doc("petitDej/m")).toMatchObject({ nom: "Famille Test D." });

    await le11.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Retirer" }).click();
    await expect(fenetreDuSite(page).getByRole("heading", { name: "Retirer cette ligne ?" })).toBeVisible();
    await repondreDansLeSite(page, "Retirer");
    await expect(le11.getByText("Libre", { exact: true })).toBeVisible();
    expect(db.doc("petitDej/m")).toBeUndefined();
  });

  test("« Ton petit déj » : mon prochain dimanche, « ⋯ › Modifier » écrit dans la rangée ; sans inscription, il le dit", async ({ page }) => {
    const db = await ouvrirAccueilOuTable(page, "/planning/table", {
      "petitDej/m": petitDejDoc("2026-12-06", "Pianiste D.", MUSICIEN.uid),
    });
    const ton = carteTonPetitDej(page);
    await expect(ton.getByText("Dimanche 6 décembre")).toBeVisible();
    await expect(ton.getByText("dans 66 jours")).toBeVisible();
    await expect(ton.getByText("Tu peux écrire « Famille … » à la place de ton nom.")).toBeVisible();
    await ton.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Modifier" }).click();
    const champ = cartePetitDej(page).locator('[data-dimanche="2026-12-06"]').getByRole("textbox", { name: "Modifier" });
    await expect(champ).toBeFocused();
    await champ.fill("Famille Test D.");
    await champ.press("Enter");
    await expect.poll(() => (db.doc("petitDej/m") as { nom?: string } | undefined)?.nom).toBe("Famille Test D.");

    await ton.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Retirer" }).click();
    await repondreDansLeSite(page, "Retirer");
    await expect(ton.getByText("Aucun petit déj à venir à ton nom.")).toBeVisible();
    await expect(ton.getByRole("button", { name: "Plus d'actions" })).toHaveCount(0);
  });

  // Relecture : le champ n'existait que dans la carte du trimestre affiché ; un prochain petit déj
  // d'un autre trimestre ne s'ouvrait nulle part, sans un mot.
  test("« Ton petit déj » : « ⋯ › Modifier » ouvre le champ sur place quand son dimanche n'est pas dans le trimestre affiché", async ({ page }) => {
    const db = await ouvrirAccueilOuTable(page, "/planning/table", {
      "petitDej/m": petitDejDoc("2026-12-06", "Pianiste D.", MUSICIEN.uid),
    });
    const ton = carteTonPetitDej(page);
    await expect(ton.getByText("Dimanche 6 décembre")).toBeVisible();
    await barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: /^T3/ }).click();
    await expect(cartePetitDej(page).locator('[data-dimanche="2026-12-06"]')).toHaveCount(0);
    await ton.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Modifier" }).click();
    const champ = ton.getByRole("textbox", { name: "Modifier" });
    await expect(champ).toBeFocused();
    await expect(champ).toHaveValue("Pianiste D.");
    await champ.fill("Famille Test D.");
    await champ.press("Enter");
    await expect.poll(() => (db.doc("petitDej/m") as { nom?: string } | undefined)?.nom).toBe("Famille Test D.");
    await expect(ton.getByRole("textbox")).toHaveCount(0);
    // Dans le trimestre affiché, le champ reste celui de la rangée (un seul champ).
    await barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: /^T4/ }).click();
    await ton.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Modifier" }).click();
    await expect(cartePetitDej(page).locator('[data-dimanche="2026-12-06"]').getByRole("textbox", { name: "Modifier" })).toBeFocused();
    await expect(page.getByRole("textbox", { name: "Modifier" })).toHaveCount(1);
  });

  // Relecture : « 1 libres sur 13 ».
  test("le petit déj : « 1 libre sur 13 » au singulier", async ({ page }) => {
    // Jeudi 24 décembre : du T4, seul le 27 décembre reste à venir.
    await ouvrirAccueilOuTable(page, "/planning/table", {}, { quand: "2026-12-24T10:00:00" });
    await expect(cartePetitDej(page).getByText("1 libre sur 13", { exact: true })).toBeVisible();
  });
});

// ─── Captures, à regarder (cinq tailles) ──────────────────────────────────────

test("captures : BO Planning, Culte et Groupes de l'App", async ({ page }, info) => {
  const capture = async (nom: string) => {
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.screenshot({ path: `test-results/agencement-v18-planning/${nom}-${info.project.name}.png` });
  };
  /** Les lignes du Sheet simulé sont là (plus de « Chargement… »). */
  const culteCharge = () => expect(page.locator('[data-case="2026-11-15|presidence"]').filter({ visible: true })).toContainText("Président J.");
  await ouvrir(page, ADMIN, "/back-office/planning/culte");
  await culteCharge();
  await capture("bo-culte");
  await page.goto("/planning/culte");
  await culteCharge();
  await capture("app-culte");
  await page.goto("/planning/groupes");
  await expect(page.locator('[data-grille="paix"]')).toBeVisible();
  await barre(page).getByRole("tablist", { name: "Groupes" }).getByRole("tab", { name: "Fidélité" }).click();
  await capture("app-groupes");
});

test("captures T4b : accueil et Prépa. Table", async ({ page }, info) => {
  const capture = async (nom: string) => {
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
    await page.screenshot({ path: `test-results/agencement-v18-planning/${nom}-${info.project.name}.png`, fullPage: true });
  };
  if (info.project.name === "ordinateur-1440") await ouvrirAvecBarre(page, "reduite");
  await ouvrirAccueilOuTable(page, "/planning", { "petitDej/m": petitDejDoc("2026-12-06", "Pianiste D.", MUSICIEN.uid) });
  await expect(page.getByRole("region", { name: "Pour moi" }).getByText("Présidence : Président A.")).toBeVisible();
  await capture("app-accueil");
  await page.goto("/planning/table");
  await expect(carteTonPetitDej(page).getByText("Dimanche 6 décembre")).toBeVisible();
  await capture("app-table");
  // Relecture : « Ton petit déj › ⋯ › Modifier » quand la carte montre un autre trimestre.
  await barre(page).getByRole("tablist", { name: "Trimestre" }).getByRole("tab", { name: /^T3/ }).click();
  await carteTonPetitDej(page).getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();
  await expect(carteTonPetitDej(page).getByRole("textbox", { name: "Modifier" })).toBeFocused();
  await capture("app-table-ton-petit-dej-modifier");
});
