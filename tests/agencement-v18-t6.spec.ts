import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, ouvrirAvecBarre, verifierAgencement, verifierSansDebordement,
} from "./helpers/agencement";
import {
  COLONNES_DEUX, COLONNES_TROIS, fractionsPour, repartirWidgets, repartitionSuivante,
} from "../src/lib/tableauDeBord/colonnes";
import type { Taille } from "../src/types/backOffice";

// Agencement v18, tranche T6 (docs/spec-agencement-v18.md, B13, B14) : Back-Office › Statistiques
// (titre « Statistiques », rail des vues sous le titre, filtres dessous, « Jamais joués » en deux
// cartes) et Tableau de bord en colonnes (deux barre dépliée, trois barre réduite dès 1 440 px,
// `repartirWidgets`), la grille en personnalisation, sur tablette et sur téléphone.
// Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN). Données simulées (fakeSession).

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };

/** Le Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string, fullPage = false) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(600); // le fondu d'arrivée de la page
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage });
}

// ─── Statistiques (B13) ──────────────────────────────────────────────────────

const TONS = ["C", "D", "E", "F", "G", "A", "Bb"];
const num = (i: number) => String(i).padStart(3, "0");
/** Un recueil assez long pour que « Jamais joués » ait besoin de « Tout afficher » : 120 FR, 60 中文. */
const RECUEIL = [
  ...Array.from({ length: 120 }, (_, i) => ({
    slug: `chant-fr-${num(i + 1)}`, title: `Chant français ${num(i + 1)}`, language: "fr", artist: `Auteur ${i + 1}`, originalKey: TONS[i % 7],
  })),
  ...Array.from({ length: 60 }, (_, i) => ({
    slug: `zh-${num(i + 1)}`, title: `中文诗歌 ${num(i + 1)}`, language: "zh", artist: `作者 ${i + 1}`, originalKey: TONS[(i + 3) % 7],
  })),
];
const chant = (songSlug: string) => ({
  songSlug, position: 0, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, items: unknown[]) => ({
  title: `Setlist du ${date}`, date, category: "Culte Francophone", leader: "Marc L.", language: "fr", notes: "", items, isDraft: false, isPrivate: false,
});
const SETLISTS = {
  "setlists/s1": setlist("2026-05-31", [chant("chant-fr-001")]),
  "setlists/s2": setlist("2026-09-20", [chant("zh-001")]),
};

async function ouvrirStatistiques(page: Page, chemin = "/back-office/statistiques") {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  await signInAs(page, ADMIN, SETLISTS, chemin);
  await expect(page.getByRole("heading", { level: 1, name: "Statistiques" })).toBeVisible();
}

const vue = (page: Page, nom: string) => page.getByRole("tablist", { name: "Vue" }).getByRole("tab", { name: nom, exact: true });
const carteFr = (page: Page) => page.getByTestId("jamais-fr");
const carteZh = (page: Page) => page.getByTestId("jamais-zh");
const lignesVisibles = (carte: ReturnType<typeof carteFr>) => carte.locator('[data-testid="ligne-jamais"]:visible');

test.describe("T6 — Statistiques (B13)", () => {
  test.use({ serviceWorkers: "block" });

  test("le h1 est « Statistiques » sur les trois vues ; le sous-titre compte les setlists ; l'agencement commun", async ({ page }) => {
    await ouvrirStatistiques(page);
    // Le contenu de « Les plus joués » (chiffres et classement) sur toute la zone ; un rail (les vues)
    // et une rangée de pilules (les périodes).
    await verifierAgencement(page, {
      contenu: page.getByTestId("dix-premiers").locator("../.."),
      onglets: { rail: 1, pilules: 1 },
    });
    await expect(enTete(page).locator("p").first()).toHaveText(
      "Visible par les admins seulement · 2 setlists comptées, du 31 mai 2026 au 20 septembre 2026");
    for (const nom of ["Jamais joués", "À redécouvrir", "Les plus joués"]) {
      await vue(page, nom).click();
      await expect(vue(page, nom)).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("h1").filter({ visible: true })).toHaveText(["Statistiques"]);
    }
  });

  test("le rail des vues est sous le titre, dans l'en-tête ; les périodes en pilules dessous, avec les listes", async ({ page }) => {
    await ouvrirStatistiques(page);
    const h1 = (await enTete(page).locator("h1").boundingBox())!;
    const rail = enTete(page).locator('[data-onglets="rail"]');
    await expect(rail).toHaveAttribute("aria-label", "Vue");
    const r = (await rail.boundingBox())!;
    expect(r.y, "le rail sous le titre").toBeGreaterThanOrEqual(h1.y + h1.height);
    expect(Math.abs(r.x - h1.x), "le rail au bord du titre").toBeLessThanOrEqual(1);

    const periodes = enTete(page).locator('[data-onglets="pilules"]');
    await expect(periodes).toHaveAttribute("aria-label", "Période");
    await expect(periodes.getByRole("button", { name: "12 mois" })).toHaveAttribute("aria-pressed", "true");
    expect((await periodes.boundingBox())!.y, "les filtres sous le rail").toBeGreaterThanOrEqual(r.y + r.height);
    await expect(enTete(page).getByRole("combobox", { name: "Service" })).toBeVisible();
    await expect(enTete(page).getByRole("combobox", { name: "Présidence" })).toBeVisible();

    await periodes.getByRole("button", { name: "3 mois" }).click();
    await expect(page).toHaveURL(/periode=3/);
    await expect(enTete(page).locator("p").first()).toContainText("1 setlist comptée, du 20 septembre 2026 au 20 septembre 2026");
    await capture(page, "t6-statistiques");
  });

  test("« Jamais joués » : deux cartes, « En français » puis « En chinois », ne dépassent pas deux écrans avant « Tout afficher »", async ({ page }, info) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues");
    await expect(carteFr(page).getByRole("heading", { name: "En français · 119" })).toBeVisible();
    await expect(carteZh(page).getByRole("heading", { name: "En chinois · 59" })).toBeVisible();
    const [fr, zh] = estTelephone(info) ? [10, 10] : [40, 20];
    await expect(lignesVisibles(carteFr(page))).toHaveCount(fr);
    await expect(lignesVisibles(carteZh(page))).toHaveCount(zh);
    expect(await page.evaluate(() => document.documentElement.scrollHeight / window.innerHeight), "deux écrans au plus").toBeLessThanOrEqual(2);
    await capture(page, "t6-statistiques-jamais");

    // Une ligne : le titre (lien vers le chant), l'artiste, la dernière fois, la tonalité.
    const premiere = lignesVisibles(carteFr(page)).first();
    await expect(premiere.getByRole("link", { name: "Chant français 002" })).toHaveAttribute("href", /^\/songs\/chant-fr-002\/?$/);
    await expect(premiere.locator('[data-champ="artiste"]')).toHaveText("Auteur 2");
    await expect(premiere.locator('[data-champ="derniere"]')).toHaveText("jamais");
    await expect(premiere.locator('[data-champ="tonalite"]')).toHaveText("D");

    await carteFr(page).getByRole("button", { name: "Tout afficher" }).click();
    await expect(lignesVisibles(carteFr(page))).toHaveCount(119);
    await expect(carteFr(page).getByRole("button", { name: "Tout afficher" })).toHaveCount(0);
    await expect(lignesVisibles(carteZh(page))).toHaveCount(zh);
  });

  test("« Jamais joués » en grand : le français sur deux colonnes, le chinois sur une, côte à côte", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand seulement (ordinateur, tablette couchée)");
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues");
    await expect(lignesVisibles(carteFr(page))).toHaveCount(40);
    const xs = async (carte: ReturnType<typeof carteFr>) =>
      new Set(await lignesVisibles(carte).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x))));
    expect((await xs(carteFr(page))).size, "FR : deux colonnes").toBe(2);
    expect((await xs(carteZh(page))).size, "中文 : une colonne").toBe(1);
    const f = (await carteFr(page).boundingBox())!;
    const z = (await carteZh(page).boundingBox())!;
    expect(z.x, "côte à côte").toBeGreaterThan(f.x + f.width - 1);
    expect(Math.abs(z.y - f.y)).toBeLessThanOrEqual(1);
    expect(f.width / z.width).toBeCloseTo(2, 0);
  });

  test("« Jamais joués » avec la langue « FR » : la seule carte en français", async ({ page }) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues&langue=fr");
    await expect(carteFr(page)).toBeVisible();
    await expect(carteZh(page)).toHaveCount(0);
  });

  // Relecture de T6 : « Tout afficher » restait ouvert après un changement de filtre, sans bouton
  // pour replier (sur téléphone, des centaines de lignes).
  test("« Jamais joués » : un filtre changé replie la carte dépliée par « Tout afficher »", async ({ page }, info) => {
    await ouvrirStatistiques(page, "/back-office/statistiques?vue=jamais-joues");
    await carteFr(page).getByRole("button", { name: "Tout afficher" }).click();
    await expect(lignesVisibles(carteFr(page))).toHaveCount(119);
    await enTete(page).locator('[data-onglets="pilules"]').getByRole("button", { name: "3 mois" }).click();
    await expect(carteFr(page).getByRole("heading", { name: "En français · 120" })).toBeVisible();
    await expect(lignesVisibles(carteFr(page))).toHaveCount(estTelephone(info) ? 10 : 40);
    await expect(carteFr(page).getByRole("button", { name: "Tout afficher" })).toBeVisible();
  });

  // Relecture de T6 : en deux colonnes dès 1 024 px, la colonne des chiffres (260 px) ne laissait
  // qu'environ 420 px au tableau de sept colonnes, qui sortait de sa carte et de la fenêtre.
  test("« Les plus joués » sur un ordinateur de 1 040 px, barre dépliée : le tableau ne sort pas de sa carte (ordinateur)", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("ordinateur"), "ordinateur seulement : la fenêtre passe à 1 040 px");
    await page.setViewportSize({ width: 1040, height: 800 });
    await ouvrirAvecBarre(page, "depliee");
    await ouvrirStatistiques(page);
    const tableau = page.locator("table");
    await expect(tableau).toBeVisible();
    await verifierSansDebordement(page);
    // Juste à droite de la carte, à la hauteur de la première ligne : plus rien du tableau.
    const carte = (await tableau.locator("..").boundingBox())!;
    const ligne = (await tableau.locator("tbody tr").first().boundingBox())!;
    const dehors = await page.evaluate(({ x, y }) => {
      const e = document.elementFromPoint(x, y);
      return e ? e.closest("table") !== null : false;
    }, { x: carte.x + carte.width + 6, y: ligne.y + ligne.height / 2 });
    expect(dehors, "le tableau ne dépasse pas à droite de sa carte").toBe(false);
    await capture(page, "t6-statistiques-1040");
  });
});

// ─── Tableau de bord (B14), devenu « À faire » (piste A, BO-B) ───────────────
// Les widgets, leur grille et leurs colonnes sont partis avec le tableau de bord : l'agencement qui reste à voir est
// celui d'À faire (en-tête commun, liste, colonne de droite quand la barre latérale est là). `repartirWidgets` et
// `fractionsPour` restent des modules purs, testés plus bas.

async function ouvrirAFaire(page: Page, barre?: "depliee" | "reduite") {
  interdireDialoguesNatifs(page);
  if (barre) await ouvrirAvecBarre(page, barre);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sansSheet(page);
  await signInAs(page, ADMIN, {
    // Une ancienne disposition enregistrée n'a plus d'effet.
    "backOffice/uid-admin": {
      tableauDeBord: [{ id: "dimanche", taille: "m", reglages: {} }], versionTableau: 2, majLe: "2026-09-30T10:00:00Z",
    },
    // De quoi remplir « Ce dimanche » : sans lui, la colonne de droite est vide.
    "plannings/culte/dimanches/2026-10-04": { date: "2026-10-04", presidence: "Pers. A", choriste1: "Pers. B", piano: "Pers. D", sono: "Pers. G" },
    "equipes/da/taches/t1": { titre: "Fond du culte", responsableUid: null, responsableNom: "", echeance: "2026-09-28", repetition: null },
  }, "/back-office");
  await expect(page.getByTestId("ligne-a-faire").first()).toBeVisible();
}

test.describe("T6 — Tableau de bord (B14) : devenu À faire", () => {
  test("l'agencement commun : « À faire » en h1 et son sélecteur dans l'en-tête ; plus de « Personnaliser » ni de grille", async ({ page }) => {
    await ouvrirAFaire(page);
    await expect(enTete(page).getByRole("heading", { level: 1 })).toHaveText("À faire");
    await expect(enTete(page).getByRole("group", { name: "Afficher" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Personnaliser" })).toHaveCount(0);
    await expect(page.getByTestId("grille-widgets")).toHaveCount(0);
  });

  for (const barre of ["depliee", "reduite"] as const) {
    test(`en grand, barre ${barre === "depliee" ? "dépliée" : "réduite"} : la liste à gauche, la colonne de droite à côté, sans débordement`, async ({ page }, info) => {
      test.skip(!estGrandEcran(info), "en grand seulement (ordinateur, tablette couchée)");
      await ouvrirAFaire(page, barre);
      const colonne = page.getByTestId("colonne-droite");
      await expect(colonne).toBeVisible();
      const liste = (await page.getByTestId("ligne-a-faire").first().boundingBox())!;
      const droite = (await colonne.boundingBox())!;
      expect(liste.x + liste.width, "la liste est à gauche de la colonne").toBeLessThanOrEqual(droite.x);
      await verifierSansDebordement(page);
      await capture(page, `t6-a-faire-${barre}`);
    });
  }

  test("téléphone et tablette en portrait : la liste seule, pas de colonne de droite", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "téléphone et tablette en portrait seulement");
    await ouvrirAFaire(page);
    await expect(page.getByTestId("colonne-droite")).toHaveCount(0);
    await verifierSansDebordement(page);
    await capture(page, "t6-a-faire");
  });
});

// ─── repartirWidgets (pur) ───────────────────────────────────────────────────

const w = (id: string, taille: Taille = "m") => ({ id, taille });
const ids = (cols: { id: string }[][]) => cols.map((c) => c.map((x) => x.id));

test.describe("T6 — repartirWidgets (pur)", () => {
  test("sans « Grand », la colonne large prend le premier ; chaque suivant va dans la moins haute", () => {
    // a dans la large (300 / 1,55 ≈ 194) ; b dans l'étroite (0) ; c dans l'étroite (100 < 194) ;
    // d dans la large (194 < 200).
    const h = { a: 300, b: 100, c: 100, d: 100 };
    expect(ids(repartirWidgets([w("a"), w("b"), w("c"), w("d")], h, COLONNES_DEUX))).toEqual([["a", "d"], ["b", "c"]]);
  });

  test("les « Grand » vont dans la colonne large, et l'ordre est gardé dans chaque colonne", () => {
    const h = { a: 100, b: 400, c: 100, d: 100 };
    // b (L) dans la large (400 / 1,6 = 250) ; a, c, d vers la moins haute des deux étroites.
    expect(ids(repartirWidgets([w("a"), w("b", "l"), w("c"), w("d", "s")], h, COLONNES_TROIS))).toEqual([["b"], ["a", "d"], ["c"]]);
    // a, avant b dans le tableau, rejoint la large (à égalité, la plus à gauche) : il y reste avant b.
    const h2 = { a: 100, b: 0, c: 50 };
    expect(ids(repartirWidgets([w("a"), w("b", "l"), w("c")], h2, COLONNES_DEUX))).toEqual([["a", "b"], ["c"]]);
  });

  test("à hauteur égale, la colonne la plus à gauche ; rien à répartir, des colonnes vides", () => {
    expect(ids(repartirWidgets([w("a"), w("b"), w("c")], { a: 155, b: 100, c: 100 }, COLONNES_DEUX))).toEqual([["a", "c"], ["b"]]);
    expect(repartirWidgets([], {}, COLONNES_TROIS)).toEqual([[], [], []]);
  });

  // Relecture de T6 (constat écarté) : « chaque suivant va dans la moins haute », colonne large
  // comprise (plan de test de T6), et non « dans la colonne étroite » seule. Les planches le
  // tranchent : barre dépliée, « Prochains évènements », de taille M par défaut comme tous les
  // widgets d'un admin (aucun « Grand »), est sous « Ce dimanche » dans la colonne large. Les
  // seules colonnes étroites mettraient dix widgets sur onze dans l'étroite, sous un « Ce dimanche »
  // seul : le blanc que B14 retire.
  test("les deux planches : « Prochains évènements » (M) sous « Ce dimanche » barre dépliée, dans une étroite barre réduite", () => {
    // Hauteurs relevées sur la planche v18-bo-tableau-de-bord (1 440 px), ramenées à une colonne de
    // 1 fr (432 px) : × 670 / 432 pour les cartes de la colonne large.
    const h = { dimanche: 757, calendrier: 252, afaire: 263, evenements: 360 };
    const tableau = [w("dimanche"), w("calendrier"), w("afaire"), w("evenements")];
    expect(ids(repartirWidgets(tableau, h, COLONNES_DEUX))).toEqual([["dimanche", "evenements"], ["calendrier", "afaire"]]);
    expect(ids(repartirWidgets(tableau, h, COLONNES_TROIS))).toEqual([["dimanche"], ["calendrier", "evenements"], ["afaire"]]);
  });
});

/** La largeur du contenu de la zone (R2) : la fenêtre moins la barre (248 ou 68 px) et ses deux marges (40 ou 28 px). */
const contenuDeLaZone = (fenetre: number, barre: "depliee" | "reduite") => fenetre - (barre === "depliee" ? 248 + 2 * 40 : 68 + 2 * 28);

test.describe("T6 — deux ou trois colonnes (pur)", () => {
  test("trois colonnes barre réduite dès 1 440 px, même avec une barre de défilement ; deux en dessous ; deux barre dépliée jusqu'à 1 600 px", () => {
    expect(fractionsPour(contenuDeLaZone(1440, "reduite"))).toEqual(COLONNES_TROIS);
    expect(fractionsPour(contenuDeLaZone(1440, "reduite") - 17), "une barre de défilement de 17 px").toEqual(COLONNES_TROIS);
    expect(fractionsPour(contenuDeLaZone(1366, "reduite")), "un portable de 1 366 px, barre réduite").toEqual(COLONNES_DEUX);
    expect(fractionsPour(contenuDeLaZone(1280, "reduite"))).toEqual(COLONNES_DEUX);
    expect(fractionsPour(contenuDeLaZone(1440, "depliee"))).toEqual(COLONNES_DEUX);
    expect(fractionsPour(contenuDeLaZone(1600, "depliee")), "un écran de 1 600 px, barre dépliée").toEqual(COLONNES_DEUX);
  });
});

// Relecture de T6 : une carte qui change de colonne change de hauteur ; deux répartitions pouvaient
// se relayer sans fin (chacune plus courte de 24 px avec les mesures prises dans l'autre).
test.describe("T6 — repartitionSuivante (pur)", () => {
  const A = [["a"], ["b"]];
  const B = [["a", "b"], []];
  /** Les mesures du moment font paraître `courte` plus courte de 30 px que toute autre répartition. */
  const avantage = (courte: string[][]) => (cols: string[][]) => (JSON.stringify(cols) === JSON.stringify(courte) ? 100 : 130);

  test("une autre répartition est prise si elle raccourcit la page de 24 px ; jamais une déjà quittée pour la même clé", () => {
    let r = repartitionSuivante(null, "k", A, () => 0);
    expect(r.colonnes).toEqual(A);
    r = repartitionSuivante(r, "k", B, avantage(B));
    expect(r.colonnes, "B raccourcit la page de 30 px : prise").toEqual(B);
    r = repartitionSuivante(r, "k", A, avantage(A));
    expect(r.colonnes, "A, déjà quittée : B reste").toEqual(B);
    const C = [["b"], ["a"]];
    expect(repartitionSuivante(r, "k", C, (cols) => (JSON.stringify(cols) === JSON.stringify(C) ? 110 : 130)).colonnes,
      "un gain de 20 px ne suffit pas").toEqual(B);
    expect(repartitionSuivante(r, "k", C, avantage(C)).colonnes, "C, jamais quittée : prise").toEqual(C);
    expect(repartitionSuivante(r, "autre", A, () => 0).colonnes, "une autre clé repart de zéro").toEqual(A);
  });
});
