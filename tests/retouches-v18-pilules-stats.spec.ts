import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, estTelephone, interdireDialoguesNatifs, margeAttendue, ouvrirAvecBarre, pilules, verifierSansDebordement, zoneDeContenu,
} from "./helpers/agencement";

// Retouches v18, tranches R5 et R6 (docs/spec-retouches-v18.md, D9 et D11).
// - R5 (D9), reprise par le lot CD, T3a (jeu B) : les pilules (`Pilules`) font 28 px (13 px, semi-gras) au pointeur
//   fin et 32 px au toucher (texte de 13 px dans les deux cas, échelle B), portées à 44 px par un `::after` (au toucher seulement), qui s'arrête à mi-écart
//   de la voisine. Une règle du composant commun : la rangée des plannings du Back-Office la suit aussi.
//   Le rail (`OngletsRail`) : piste de 36 px au pointeur fin, 40 px au toucher, onglets de 30 / 34 px dedans, zone de 44 px.
// - R6 (D11) : Statistiques › « Les plus joués » : sous ≈ 1 100 px de conteneur, les chiffres passent
//   au-dessus du tableau ; rien ne défile de côté.
// Cinq projets. Firestore, Sheets et date simulés ; personnes fictives.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Admin", lastName: "T.", planningName: "Pianiste D." };

/** Hauteur attendue des pilules selon l'appareil : fixée ici d'après le jeu B (T3a), pas lue dans le CSS. */
const hauteurAttendue = (projet: string) => (projet.startsWith("ordinateur") ? 28 : 32);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string, fullPage = false) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage });
}

// ─── Statistiques ────────────────────────────────────────────────────────────

const TONS = ["C", "D", "E", "F", "G", "A", "Bb"];
const num = (i: number) => String(i).padStart(3, "0");
const RECUEIL = [
  ...Array.from({ length: 40 }, (_, i) => ({
    slug: `chant-fr-${num(i + 1)}`, title: `Chant français numéro ${num(i + 1)}`, language: "fr", artist: `Auteur ${i + 1}`, originalKey: TONS[i % 7],
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    slug: `zh-${num(i + 1)}`, title: `中文诗歌 ${num(i + 1)}`, language: "zh", artist: `作者 ${i + 1}`, originalKey: TONS[(i + 3) % 7],
  })),
];
const chant = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: false, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (date: string, slugs: string[]) => ({
  title: `Setlist du ${date}`, date, category: "Culte Francophone", leader: "Président A.", language: "fr", notes: "",
  items: slugs.map(chant), isDraft: false, isPrivate: false,
});
/** Douze setlists de juin à septembre : un classement de plusieurs lignes, toutes les colonnes remplies. */
const SETLISTS = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => {
    const date = `2026-${String(6 + Math.floor(i / 3)).padStart(2, "0")}-${String(7 + (i % 3) * 7).padStart(2, "0")}`;
    return [`setlists/s${i}`, setlist(date, [`chant-fr-${num((i % 5) + 1)}`, `chant-fr-${num((i % 8) + 6)}`, `zh-${num((i % 3) + 1)}`])];
  }),
);

async function ouvrirStatistiques(page: Page) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
  await page.route(/\/songs-index\.json/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ generatedAt: "2026-10-01", songs: RECUEIL }) }));
  await signInAs(page, ADMIN, SETLISTS, "/songs/statistiques");
  await expect(page.getByRole("heading", { level: 1, name: "Statistiques" })).toBeVisible();
  await expect(page.getByTestId("setlists-comptees")).toBeVisible();
}

/** Le déclencheur d'un `Menu` (nom accessible « <critère> : <valeur> »). */
const menuNomme = (page: Page, nom: string) => page.locator(`[data-menu][aria-label^="${nom} :"]`);

/** La hauteur et la taille du texte de chaque pilule d'une rangée. */
const mesurer = (rangee: Locator) =>
  rangee.evaluate((el) =>
    [...el.querySelectorAll(":scope > a, :scope > button")].map((p) => ({
      nom: p.textContent?.trim() ?? "",
      hauteur: Math.round(p.getBoundingClientRect().height),
      texte: parseFloat(getComputedStyle(p).fontSize),
    })),
  );

function verifierTaille(mesures: { nom: string; hauteur: number; texte: number }[], projet: string) {
  expect(mesures.length, "des pilules").toBeGreaterThan(1);
  const hauteur = hauteurAttendue(projet);
  for (const m of mesures) {
    expect(Math.abs(m.hauteur - hauteur), `« ${m.nom} » : ${m.hauteur} px, attendu ≈ ${hauteur} px`).toBeLessThanOrEqual(1);
    expect(m.texte, `« ${m.nom} » : texte`).toBe(13);
  }
}

test.describe("R5 · T3a : les pilules de 28 px au pointeur fin, 32 px au doigt", () => {
  test.use({ serviceWorkers: "block" });

  test("Statistiques : les périodes en pilules, 28 px à la souris, 32 px au doigt", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    verifierTaille(await mesurer(periodes), info.project.name);
    await capture(page, "r5-pilules-statistiques");
  });

  test("Statistiques : les menus Service, Langue, Présidence à la hauteur des pilules", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    // Lot CD, T3b : les trois filtres sont des `Menu` (déclencheur en pilule), à la taille des pilules de période.
    const hauteur = hauteurAttendue(info.project.name);
    for (const nom of ["Service", "Langue", "Présidence"]) {
      const menu = menuNomme(page, nom);
      const h = Math.round((await menu.boundingBox())!.height);
      expect(Math.abs(h - hauteur), `« ${nom} » : ${h} px, attendu ≈ ${hauteur} px`).toBeLessThanOrEqual(1);
      if (hauteur === 28) expect(await menu.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)), `« ${nom} » : texte`).toBe(13);
    }
    await capture(page, "r5-menus-statistiques");
  });

  test("T3b : aucun <select> visible hors formulaire sur Statistiques ni sur la liste des chants", async ({ page }) => {
    await ouvrirStatistiques(page);
    await expect(page.locator("select:visible:not(form select)")).toHaveCount(0);
    await page.goto("/songs");
    await expect(page.locator("[data-menu]").first()).toBeVisible();
    await expect(page.locator("select:visible:not(form select)")).toHaveCount(0);
  });

  test("T3b : les périodes et les trois menus sont sur deux rangées distinctes, sans pilule de période sur la rangée des menus", async ({ page }) => {
    await ouvrirStatistiques(page);
    const periode = (await page.getByRole("button", { name: "3 mois" }).boundingBox())!;
    const periodes = (await Promise.all((await pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) }).locator(":scope > button").all()).map((b) => b.boundingBox())));
    const menus = await Promise.all(["Service", "Langue", "Présidence"].map(async (n) => (await menuNomme(page, n).boundingBox())!));
    const basPeriodes = Math.max(...periodes.map((b) => b!.y + b!.height));
    for (const m of menus) {
      expect(m.y, "un menu sous les périodes").toBeGreaterThanOrEqual(basPeriodes - 1);
      expect(Math.abs(m.y - menus[0].y), "les trois menus sur la même ligne").toBeLessThanOrEqual(1);
    }
    expect(periode.y + periode.height).toBeLessThanOrEqual(menus[0].y + 1);
  });

  test("T3b : le menu Service lit « Service » au repos, le nom du service une fois posé", async ({ page }) => {
    await ouvrirStatistiques(page);
    const menu = menuNomme(page, "Service");
    await expect(menu).toHaveText("Service");
    await expect(menu).not.toHaveAttribute("data-pose");
    await menu.click();
    const premiere = page.getByRole("menuitemradio").first();
    await expect(premiere).toHaveText("Tous les services");
    await page.getByRole("menuitemradio", { name: "Groupe Paix", exact: true }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(menu).toHaveAttribute("data-pose", "");
    await expect(menu).toHaveText("Groupe Paix");
    await menu.click();
    await expect(page.getByRole("menuitemradio").first()).toHaveText("Tous les services");
  });

  test("T3b : le menu Thème de la liste des chants lit « Thème » au repos", async ({ page }) => {
    await page.goto("/songs");
    const menu = page.locator("[data-menu]").first();
    await expect(menu).toBeVisible();
    await expect(menu).toHaveText("Thème");
    await expect(menu).not.toHaveAttribute("data-pose");
  });

  test("Back-Office › Planning : la rangée des plannings suit la même règle (plus de taille propre)", async ({ page }, info) => {
    interdireDialoguesNatifs(page);
    await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, {}, "/back-office/planning/culte");
    const plannings = page.getByTestId("barre-grille").filter({ visible: true }).getByRole("navigation", { name: "Plannings" });
    await expect(plannings.getByRole("link", { name: "Culte Franco" })).toBeVisible();
    verifierTaille(await mesurer(plannings), info.project.name);
    await capture(page, "r5-pilules-planning");
  });

  test("ordinateur sous 1 024 px : 28 px aussi, c'est le pointeur qui décide (ordinateur)", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "ordinateur seulement : la fenêtre passe à 1 000 px");
    await page.setViewportSize({ width: 1000, height: 800 });
    await ouvrirStatistiques(page);
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    verifierTaille(await mesurer(periodes), "ordinateur");
  });

  test("zones de toucher : 44 px de haut au doigt (::after, rail comme pilules), aucune au pointeur fin", async ({ page }, info) => {
    await ouvrirStatistiques(page);
    const coarse = !info.project.name.startsWith("ordinateur");
    const zone = (el: Element) => {
      const c = getComputedStyle(el, "::after");
      return { contenu: c.content, haut: parseFloat(c.height), gauche: parseFloat(c.left), largeur: parseFloat(c.width) };
    };
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    const unePilule = periodes.getByRole("button").first();
    const rail = page.locator('[data-onglets="rail"]').first();
    const unOnglet = rail.getByRole("tab").first();
    const [zp, zr] = [await unePilule.evaluate(zone), await unOnglet.evaluate(zone)];
    if (coarse) {
      expect(zp.haut, "pilule : ::after").toBe(44);
      expect(zr.haut, "rail : ::after").toBe(44);
      // La pilule : 3 px de plus de chaque côté (mi-écart), l'onglet du rail : à sa largeur.
      expect(zp.gauche).toBe(-3);
      const boite = (await unePilule.boundingBox())!;
      expect(Math.round(zp.largeur)).toBe(Math.round(boite.width) + 6);
      expect(zr.gauche).toBe(0);
      // La piste du rail, 40 px, et l'onglet, 34 : le défilant garde les 44 px, rien ne rogne la zone.
      expect(Math.round((await rail.boundingBox())!.height)).toBe(40);
      expect(Math.round((await unOnglet.boundingBox())!.height)).toBe(34);
      const defilant = rail.locator("..");
      expect(Math.round((await defilant.boundingBox())!.height), "le défilant du rail").toBe(44);
    } else {
      expect(zp.contenu, "pilule au pointeur fin : pas de ::after").toBe("none");
      expect(zr.contenu, "rail au pointeur fin : pas de ::after").toBe("none");
      expect(Math.round((await rail.boundingBox())!.height)).toBe(36);
      expect(Math.round((await unOnglet.boundingBox())!.height)).toBe(30);
    }
    expect(await unOnglet.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(13);
  });

  test("téléphone : un toucher à 2 px du bord d'une pilule va à elle, pas à sa voisine", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement : page.touchscreen");
    await ouvrirStatistiques(page);
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    const boutons = periodes.getByRole("button");
    await expect(boutons.nth(1)).toBeVisible();
    const a = boutons.nth(0);
    const b = boutons.nth(1);
    const [ba, bb] = [(await a.boundingBox())!, (await b.boundingBox())!];
    expect(Math.round(bb.x - (ba.x + ba.width)), "6 px entre deux pilules").toBe(6);
    const y = ba.y + ba.height / 2;
    const pressee = (l: Locator) => l.getAttribute("aria-pressed");
    // Juste hors de A (1 px) : la zone prolongée de A, 3 px de chaque côté, la reçoit.
    await page.touchscreen.tap(ba.x + ba.width + 1, y);
    await expect.poll(() => pressee(a)).toBe("true");
    expect(await pressee(b)).toBe("false");
    // Juste hors de B (1 px, côté A) : B.
    await page.touchscreen.tap(bb.x - 1, y);
    await expect.poll(() => pressee(b)).toBe("true");
    expect(await pressee(a)).toBe("false");
  });

  test("téléphone : dans une zone commune (prolongée de 6 px), le toucher va à la pilule la plus tardive du DOM (raison des 3 px)", async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "téléphone seulement : page.touchscreen");
    await ouvrirStatistiques(page);
    const periodes = pilules(page).filter({ has: page.getByRole("button", { name: "3 mois" }) });
    const boutons = periodes.getByRole("button");
    await expect(boutons.nth(1)).toBeVisible();
    await page.addStyleTag({ content: '[data-onglets="pilules"] > *::after { left: -6px !important; right: -6px !important; width: auto !important; }' });
    const [ba, bb] = [(await boutons.nth(0).boundingBox())!, (await boutons.nth(1).boundingBox())!];
    // À 1 px de A, dans le vide de 6 px, donc bien plus près de A que de B : B, plus tardive dans le DOM, reçoit quand même.
    await page.touchscreen.tap(ba.x + ba.width + 1, ba.y + ba.height / 2);
    await expect.poll(() => boutons.nth(1).getAttribute("aria-pressed")).toBe("true");
    expect(await boutons.nth(0).getAttribute("aria-pressed")).toBe("false");
    expect(bb.x - (ba.x + ba.width)).toBeCloseTo(6, 0);
  });
});

// ─── R6 : « Les plus joués » ─────────────────────────────────────────────────

const chiffres = (page: Page) => page.getByTestId("setlists-comptees");
const chantsDifferents = (page: Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Chants différents" }) });
const carteTableau = (page: Page) => page.locator("table").locator("..");

/** Le tableau ne défile pas dans sa carte, et la page ne déborde pas. */
async function verifierSansDefilement(page: Page) {
  const carte = carteTableau(page);
  await expect(carte).toBeVisible();
  expect(await carte.evaluate((el) => el.scrollWidth - el.clientWidth), "le tableau ne défile pas de côté").toBeLessThanOrEqual(0);
  await verifierSansDebordement(page);
}

/** Les chiffres à gauche du tableau (dans une colonne à part), ou au-dessus (en grand : sur une rangée).
 *  « À gauche » d'abord : dans la colonne de droite, les dix premiers précèdent le tableau, et la carte
 *  des chiffres finit donc plus haut que lui dans les deux dispositions. */
async function disposition(page: Page) {
  const c = (await chiffres(page).boundingBox())!;
  const t = (await carteTableau(page).boundingBox())!;
  if (c.x + c.width <= t.x + 1) return "gauche";
  if (c.y + c.height <= t.y + 1) return "dessus";
  return "autre";
}

test.describe("R6 · D11 : « Les plus joués », les chiffres au-dessus du tableau sous ≈ 1 100 px", () => {
  test.use({ serviceWorkers: "block" });

  for (const largeur of [1024, 1060, 1100]) {
    test(`fenêtre de ${largeur} px, barre dépliée : les chiffres sur une rangée au-dessus, rien ne défile de côté (ordinateur)`, async ({ page }, info) => {
      test.skip(info.project.name !== "ordinateur", "ordinateur seulement : la fenêtre change de largeur");
      await page.setViewportSize({ width: largeur, height: 800 });
      await ouvrirAvecBarre(page, "depliee");
      await ouvrirStatistiques(page);
      expect(await disposition(page)).toBe("dessus");
      // Les trois chiffres de la planche restent, côte à côte : Setlists comptées, Chants différents, Jamais joués.
      const c = (await chiffres(page).boundingBox())!;
      const d = (await chantsDifferents(page).boundingBox())!;
      expect(Math.abs(d.y - c.y), "« Chants différents » sur la rangée des chiffres").toBeLessThanOrEqual(1);
      expect(d.x).toBeGreaterThan(c.x + c.width);
      await expect(page.getByRole("button", { name: /Jamais joués/ }).filter({ hasText: "voir l'onglet" })).toBeVisible();
      await verifierSansDefilement(page);
      if (largeur === 1024) await capture(page, "r6-plus-joues-1024", true);
    });
  }

  test("à chaque appareil : au-dessus sous 1 100 px de conteneur, à gauche au-delà ; jamais de défilement de côté", async ({ page }, info) => {
    if (info.project.name === "ordinateur-1440") await ouvrirAvecBarre(page, "depliee");
    await ouvrirStatistiques(page);
    if (estTelephone(info)) {
      // Le téléphone garde sa liste : pas de tableau.
      await expect(page.locator("table")).toBeHidden();
      await verifierSansDebordement(page);
      return;
    }
    const zone = await zoneDeContenu(page);
    const conteneur = zone.droite - zone.gauche - 2 * (await margeAttendue(page));
    expect(await disposition(page), `conteneur de ${conteneur} px`).toBe(conteneur < 1100 ? "dessus" : "gauche");
    // La planche (1 440 px, barre dépliée) : les chiffres à gauche.
    if (info.project.name === "ordinateur-1440") expect(conteneur).toBeGreaterThanOrEqual(1100);
    if (estGrandEcran(info) && conteneur < 1100) await expect(chantsDifferents(page)).toBeVisible();
    await verifierSansDefilement(page);
    await capture(page, "r6-plus-joues", true);
  });
});

// ─── musiciens-4 : la rangée de pastilles s'estompe au bord au lieu d'être tranchée ──────────────

test.describe("musiciens-4 : le fondu latéral des pilules, sur le catalogue d'Harmonie", () => {
  const fondu = (rangee: Locator, nom: string) => rangee.evaluate((el, n) => parseFloat(el.style.getPropertyValue(n) || "0"), nom);

  test("la rangée « Sensation » s'estompe à droite puis à gauche ; « Période » (Statistiques), quand elle tient, n'a aucun masque", async ({ page }) => {
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, ADMIN, {}, "/harmonie");
    const sensation = page.getByRole("group", { name: "Sensation" });
    await expect(sensation).toBeVisible();
    await expect(sensation).toHaveClass(/fondu-lateral/);
    const deborde = await sensation.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
    if (deborde) {
      await expect.poll(() => fondu(sensation, "--fondu-droite")).toBeGreaterThan(0);
      expect(await fondu(sensation, "--fondu-gauche")).toBe(0);
      await sensation.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
      await expect.poll(() => fondu(sensation, "--fondu-gauche")).toBeGreaterThan(0);
      expect(await fondu(sensation, "--fondu-droite")).toBe(0);
    }
    // Niveau est devenu un Menu (musiciens-2, T3b) : la rangée qui tient se vérifie sur les périodes de Statistiques.
    await expect(page.locator('[data-menu][aria-label^="Niveau :"]')).toBeVisible();
    await ouvrirStatistiques(page);
    const periode = page.getByRole("group", { name: "Période" });
    if (!(await periode.evaluate((el) => el.scrollWidth > el.clientWidth + 1))) {
      expect(await fondu(periode, "--fondu-gauche")).toBe(0);
      expect(await fondu(periode, "--fondu-droite")).toBe(0);
    }
  });
});
