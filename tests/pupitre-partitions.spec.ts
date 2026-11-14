import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirListe, ouvrirPartitions, ouvrirSommaire } from "./helpers/setlist";

// Lot « pupitre », tranche T1 (docs/spec-exemples-usage.md § 5) : en volet unique (téléphone, tablette debout) la vue
// Partitions va jusqu'à `--marge-page` des deux côtés, la vue Liste tient en 720 px au plus avec le même bord gauche,
// l'étiquette de section se lit « Couplet 1 » en gras (ni capitales ni interlettrage, même couleur), la 简谱 (image et
// calque) prend la nouvelle largeur sans déborder ; en deux volets (tablette couchée, ordinateur, 1 440) rien ne bouge.
// Captures en pleine page seulement en volet unique : une pleine page agrandit la fenêtre en hauteur et ferait repasser
// la tablette couchée en volet unique. Cinq projets (`SPECS_GRAND_ECRAN`) ; setlists et compte simulés, noms fictifs. Les captures sont dans test-results/t1-pupitre/.

const MEMBRE: FakeProfile = {
  uid: "uid-membre", email: "membre@example.com", firstName: "Zélie", lastName: "Aubrac", planningName: "Zélie A.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const item = (songSlug: string, position: number, over: Record<string, unknown> = {}, notes = "") => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes, ...over,
});
const setlist = (items: unknown[]) => ({
  title: "Culte du 8 novembre", leader: "Zélie A.", category: "Culte Francophone", date: "2026-11-08", language: "mixed",
  notes: NOTE, ownerId: "uid-membre", isPrivate: false, items,
});
const NOTE = "Intro douce, enchaîner sans pause";
const DOCS = {
  "setlists/sjp": setlist([item("hosanna", 1, {}, NOTE), item("一切歌颂赞美", 2)]),
  "setlists/stxt": setlist([item("hosanna", 1, {}, NOTE), item("一切歌颂赞美", 2)]),
  // T2 : premier chant en texte chinois, même note
  "setlists/szh": setlist([item("一切歌颂赞美", 1, {}, NOTE), item("hosanna", 2)]),
};

// Valeurs de la base (avant T1), codées en dur : --lyric-size = 0.88rem × 1,1 (écran) ou × 1,2 (dès 768 px) ; couleur
// calculée de « Couplet 1 » de Hosanna en clair (`--sec-c` de la section, que T1 ne touche pas).
const PAROLES_PX = { telephone: 0.88 * 1.1 * 16, tablette: 0.88 * 1.2 * 16 };
const COULEUR_COUPLET = "rgb(44, 138, 125)";
const COLONNE_DEUX_VOLETS = 920; // `--colonne-partition` posée par le volet de droite (SetlistDetailClient ; 860 avant T3)

const FENETRES: Record<string, { width: number; height: number }> = {
  telephone: { width: 390, height: 844 },
  tablette: { width: 820, height: 1180 },
  "tablette-paysage": { width: 1080, height: 810 },
  ordinateur: { width: 1280, height: 720 },
  "ordinateur-1440": { width: 1440, height: 900 },
};

async function ouvrir(page: Page, id: "sjp" | "stxt" | "szh", projet?: string, sombre = false, aideVue = true) {
  if (projet && FENETRES[projet]) await page.setViewportSize(FENETRES[projet]);
  // « stxt » et « szh » : le chant à scan en paroles, par la préférence de l'appareil.
  if (id !== "sjp") await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.addInitScript(([dark, vue]) => {
    if (vue) localStorage.setItem("accords-aide-vue", "1");
    if (dark) localStorage.setItem("theme", "dark");
  }, [sombre, aideVue] as const);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, MEMBRE, DOCS, `/setlists/${id}`);
  await ouvrirPartitions(page);
  await page.evaluate(() => document.fonts.ready);
}

const margePage = (page: Page) =>
  page.evaluate(() => {
    const sonde = document.createElement("i");
    sonde.style.display = "block";
    sonde.style.width = "var(--marge-page)";
    document.body.append(sonde);
    const px = sonde.getBoundingClientRect().width;
    sonde.remove();
    return px;
  });

const volet = (projet: string) => projet === "telephone" || projet === "tablette";
const pasVolet = "Test propre au volet unique (téléphone, tablette debout)";
const pasDeuxVolets = "Test propre aux deux volets (tablette couchée, ordinateur, 1 440)";

for (const projet of ["telephone", "tablette"]) {
  test(`${projet} : la partition va jusqu'à la marge de droite, paroles à la taille d'avant`, async ({ page }, info) => {
    test.skip(info.project.name !== projet, pasVolet);
    await ouvrir(page, "sjp", projet);
    const marge = await margePage(page);
    const mesures = await page.evaluate(() => {
      // La carte de la première section (pas seulement le bloc du chant) : c'est elle qui portait le plafond de 42rem.
      const bloc = document.querySelector("[data-outline-item] [data-section]")!.getBoundingClientRect();
      // Taille des paroles : celle des lignes de paroles (`[data-copy-line]`, `font-size: var(--lyric-size)`).
      const taille = parseFloat(getComputedStyle(document.querySelector("[data-outline-item] [data-copy-line]")!).fontSize);
      return { gauche: bloc.left, droit: bloc.right, fenetre: document.documentElement.clientWidth, taille };
    });
    expect(Math.abs(mesures.gauche - marge), "bord gauche = --marge-page").toBeLessThanOrEqual(2);
    expect(Math.abs(mesures.droit - (mesures.fenetre - marge)), "bord droit = fenêtre - --marge-page").toBeLessThanOrEqual(2);
    expect(Math.abs(mesures.taille - PAROLES_PX[projet as "telephone" | "tablette"]), "taille des paroles inchangée").toBeLessThan(0.1);
  });

  test(`${projet} : la vue Liste tient en 720 px au plus, bord gauche sur celui des partitions`, async ({ page }, info) => {
    test.skip(info.project.name !== projet, pasVolet);
    await ouvrir(page, "sjp", projet);
    const gaucheBloc = await page.locator("[data-outline-item]").first().evaluate((el) => el.getBoundingClientRect().left);
    await ouvrirListe(page);
    const liste = page.locator("[data-vue='liste'] ol").first();
    await expect(liste).toBeVisible();
    const b = (await liste.boundingBox())!;
    expect(b.width).toBeLessThanOrEqual(720 + 0.5);
    expect(Math.abs(b.x - gaucheBloc), "bord gauche de la liste").toBeLessThanOrEqual(1);
  });
}

test("téléphone et tablette debout : « Couplet 1 » de Hosanna, gras, casse et interlettrage normaux, couleur d'avant", async ({ page }, info) => {
  test.skip(!volet(info.project.name), pasVolet);
  await ouvrir(page, "stxt", info.project.name);
  const etiquette = page.locator("main [data-section] > [data-copy-ignore] span.font-semibold").filter({ hasText: /^Couplet 1/ }).first();
  await expect(etiquette).toBeVisible();
  expect((await etiquette.innerText()).trim()).toBe("Couplet 1");
  const s = await etiquette.evaluate((el) => {
    const c = getComputedStyle(el);
    return { casse: c.textTransform, lettres: c.letterSpacing, graisse: c.fontWeight, couleur: c.color };
  });
  expect(s.casse).toBe("none");
  expect(["normal", "0px"]).toContain(s.lettres);
  expect(s.graisse).toBe("600");
  expect(s.couleur).toBe(COULEUR_COUPLET);
});

test("page chant de Hosanna : « Couplet 1 » en gras, sans capitales", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "Test propre au téléphone");
  await page.setViewportSize(FENETRES.telephone);
  await page.addInitScript(() => localStorage.setItem("accords-aide-vue", "1"));
  await page.goto("/songs/hosanna");
  const etiquette = page.locator("main [data-section] > [data-copy-ignore] span.font-semibold").filter({ hasText: /^Couplet 1/ }).first();
  await expect(etiquette).toBeVisible();
  expect((await etiquette.innerText()).trim()).toBe("Couplet 1");
  expect(await etiquette.evaluate((el) => getComputedStyle(el).textTransform)).toBe("none");
  await page.screenshot({ path: "test-results/t1-pupitre/page-chant-hosanna-telephone.png" });
});

test("简谱 de 一切歌颂赞美 : image et calque de même largeur, rien ne déborde à droite", async ({ page }, info) => {
  const nom = info.project.name;
  if (FENETRES[nom]) await page.setViewportSize(FENETRES[nom]);
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await ouvrir(page, "sjp", nom);
  const zone = page.locator("[data-jianpu-page]").first();
  await zone.scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));
  const m = await page.evaluate(() => {
    const p = document.querySelector("[data-jianpu-page]")!;
    const img = p.querySelector("img")!.getBoundingClientRect();
    // Le calque (s'il est affiché) couvre la page en `inset-0` : on mesure la page qui le porte.
    const calque = (p.querySelector("[data-jianpu-calque]") ?? p).getBoundingClientRect();
    return { img: img.width, calque: calque.width, droit: img.right, fenetre: document.documentElement.clientWidth };
  });
  expect(Math.abs(m.img - m.calque), "image et calque de même largeur").toBeLessThanOrEqual(1);
  expect(m.droit, "rien ne déborde de la fenêtre").toBeLessThanOrEqual(m.fenetre);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "pas de défilement horizontal").toBe(true);
});

test("deux volets : la colonne de partition a son plafond de 920 px (T3)", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasDeuxVolets);
  await ouvrir(page, "sjp", info.project.name);
  // T3 : la colonne passe de 860 à 920 px (`max-width: 920px`, posé par `--colonne-partition`).
  const m = await page.locator("[data-outline-item]").first().evaluate((el) => {
    const c = el.querySelector("[class*='max-w-[var(--colonne-partition']")!;
    return { plafond: getComputedStyle(c).maxWidth, largeur: c.getBoundingClientRect().width };
  });
  // T4 : 1 080 px dès que la zone atteint 1 000 px (1 440), 920 px en dessous.
  const plafond = info.project.name === "ordinateur-1440" ? 1080 : COLONNE_DEUX_VOLETS;
  expect(m.plafond).toBe(`${plafond}px`);
  expect(m.largeur).toBeLessThanOrEqual(plafond + 0.5);
});

test("captures : vue Partitions et vue Liste, clair, puis sombre au téléphone et à 1 440", async ({ page }, info) => {
  const nom = info.project.name;
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await ouvrir(page, "sjp", nom);
  await page.screenshot({ path: `test-results/t1-pupitre/${nom}-partitions-clair.png`, fullPage: volet(nom) });
  await ouvrirListe(page);
  await page.screenshot({ path: `test-results/t1-pupitre/${nom}-liste-clair.png` });
});

test("captures sombres : téléphone et 1 440", async ({ page }, info) => {
  const nom = info.project.name;
  test.skip(nom !== "telephone" && nom !== "ordinateur-1440", "Sombre : téléphone et 1 440 seulement");
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await ouvrir(page, "sjp", nom, true);
  await page.screenshot({ path: `test-results/t1-pupitre/${nom}-partitions-sombre.png`, fullPage: volet(nom) });
  await ouvrirListe(page);
  await page.screenshot({ path: `test-results/t1-pupitre/${nom}-liste-sombre.png` });
});

// ─── T2 : barre compacte en vue Partitions (volet unique), bulle d'aide dans le flux ────────────────────────────────
// La note de la setlist (`NOTE`) se lit sur une ligne dans la barre ; les setlists ci-dessus la portent toutes.
const barre = (page: Page) => page.getByTestId("barre-outils");
const aide = (page: Page) => page.locator("[data-accords-aide]");
const boutonDetails = (page: Page) => barre(page).getByRole("button", { name: /^.+, (Afficher les détails de la setlist|显示歌单详情)$/ });

/** Haut de l'étiquette de la première section de couplet du premier chant, en % de la hauteur de la fenêtre, page en haut. */
async function hautEtiquette(page: Page, id: "sjp" | "stxt" | "szh") {
  const filtre = id === "szh" ? /./ : /^Couplet 1/;
  const etiquette = page.locator("[data-outline-item] [data-section] > [data-copy-ignore] span.font-semibold").filter({ hasText: filtre }).first();
  await expect(etiquette).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  let pct = 0;
  await expect.poll(async () => {
    pct = await etiquette.evaluate((el) => (el.getBoundingClientRect().top / innerHeight) * 100);
    return page.evaluate(() => window.scrollY);
  }).toBe(0);
  return pct;
}

const MESURES: { projet: string; id: "sjp" | "stxt" | "szh"; nom: string; aide: number; vue: number }[] = [
  { projet: "telephone", id: "sjp", nom: "Hosanna", aide: 48, vue: 39 },
  { projet: "tablette", id: "sjp", nom: "Hosanna", aide: 36, vue: 32 },
  { projet: "tablette", id: "szh", nom: "一切歌颂赞美 en texte", aide: 28, vue: 24 },
];
for (const m of MESURES) {
  test(`${m.projet} : « Couplet 1 » de ${m.nom} à ${m.aide} % au plus, aide affichée, au-dessus de la première section`, async ({ page }, info) => {
    test.skip(info.project.name !== m.projet, "Mesure propre au volet unique de cette fenêtre (les deux volets ne changent pas, T3)");
    await ouvrir(page, m.id, m.projet, false, false);
    await expect(aide(page)).toBeVisible();
    const pct = await hautEtiquette(page, m.id);
    expect(pct, `étiquette à ${pct.toFixed(1)} % de la hauteur`).toBeLessThanOrEqual(m.aide);
    // Dans le flux : au-dessus de la première section, pas par-dessus les paroles.
    const [a, section] = await Promise.all([aide(page).boundingBox(), page.locator("[data-outline-item] [data-section]").first().boundingBox()]);
    expect(a!.y + a!.height, "l'aide finit avant la première section").toBeLessThanOrEqual(section!.y + 1);
    await expect(aide(page)).toHaveAttribute("role", "status");
  });

  test(`${m.projet} : « Couplet 1 » de ${m.nom} à ${m.vue} % au plus, aide déjà vue`, async ({ page }, info) => {
    test.skip(info.project.name !== m.projet, "Mesure propre au volet unique de cette fenêtre (les deux volets ne changent pas, T3)");
    await ouvrir(page, m.id, m.projet);
    await expect(aide(page)).toHaveCount(0);
    const pct = await hautEtiquette(page, m.id);
    expect(pct, `étiquette à ${pct.toFixed(1)} % de la hauteur`).toBeLessThanOrEqual(m.vue);
  });
}

test("téléphone et tablette debout : l'en-tête se déplie au clavier (Entrée) et au toucher, la note se lit sur une ligne dans la barre", async ({ page }, info) => {
  test.skip(!volet(info.project.name), pasVolet);
  await ouvrir(page, "sjp", info.project.name);
  const entete = page.locator("#entete-setlist");
  const bouton = boutonDetails(page);
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
  // Replié : l'en-tête n'est pas là, la note tient sur une ligne dans la barre (un seul h1 lisible).
  await expect(entete).toBeHidden();
  const note = barre(page).getByText(NOTE);
  await expect(note).toBeVisible();
  expect(await note.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe("nowrap");
  await expect(page.getByRole("heading", { level: 1, name: "Culte du 8 novembre" })).toHaveCount(1);

  await bouton.focus();
  await page.keyboard.press("Enter");
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
  await expect(entete.getByText("Zélie A.")).toBeVisible();
  await expect(entete.getByText("Culte Francophone")).toBeVisible();
  await expect(entete.getByText(NOTE)).toBeVisible();
  await expect(entete.getByRole("heading", { level: 1 })).toBeVisible();

  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
  await expect(entete).toBeHidden();

  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
  await expect(entete.getByText("Zélie A.")).toBeVisible();
  await expect(entete.getByText("Culte Francophone")).toBeVisible();
  await expect(entete.getByText(NOTE)).toBeVisible();
});

test("téléphone et tablette debout : Entrée sur la bascule Liste / Partitions garde le focus sur le bouton pressé", async ({ page }, info) => {
  test.skip(!volet(info.project.name), pasVolet);
  await ouvrir(page, "sjp", info.project.name);
  for (const nom of ["Liste", "Partitions"]) {
    await page.getByTestId("bascule-vues").getByRole("button", { name: nom, exact: true }).focus();
    await page.keyboard.press("Enter");
    const presse = page.getByTestId("bascule-vues").getByRole("button", { name: nom, exact: true });
    await expect(presse).toHaveAttribute("aria-pressed", "true");
    await expect(presse).toBeFocused();
  }
});

test("téléphone : Mode Louange est un bouton rond de 44 × 44 px, sans texte visible, nommé pour les lecteurs d'écran", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "Test propre au téléphone");
  await ouvrir(page, "sjp", "telephone");
  const bouton = page.getByRole("button", { name: "Mode Louange" });
  await expect(bouton).toBeVisible();
  const b = (await bouton.boundingBox())!;
  expect(Math.abs(b.width - 44), "largeur").toBeLessThanOrEqual(1);
  expect(Math.abs(b.height - 44), "hauteur").toBeLessThanOrEqual(1);
  expect((await bouton.innerText()).trim(), "aucun texte visible").toBe("");
});

test("captures T2 : barre compacte, aide affichée, aide vue, en-tête déplié, sombre au téléphone", async ({ page }, info) => {
  const nom = info.project.name;
  test.skip(!volet(nom), pasVolet);
  const dossier = "test-results/t2-pupitre";
  await ouvrir(page, "sjp", nom, false, false);
  await expect(aide(page)).toBeVisible();
  await page.screenshot({ path: `${dossier}/${nom}-partitions-aide-affichee.png` });
  await aide(page).getByRole("button").click();
  await expect(aide(page)).toHaveCount(0);
  await page.screenshot({ path: `${dossier}/${nom}-partitions-aide-vue.png` });
  await boutonDetails(page).click();
  await expect(page.locator("#entete-setlist")).toBeVisible();
  await page.screenshot({ path: `${dossier}/${nom}-partitions-entete-deplie.png` });
});

test("capture T2 sombre : téléphone, vue Partitions", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "Test propre au téléphone");
  await ouvrir(page, "sjp", "telephone", true, false);
  await expect(aide(page)).toBeVisible();
  await page.screenshot({ path: "test-results/t2-pupitre/telephone-partitions-sombre.png" });
});

// ─── T3 : grand écran, rail du sommaire et colonne de 920 px (tablette couchée, ordinateur, 1 440) ─────────────────────
// Fenêtres : 1 080 × 810 (barre latérale de 68 px), 1 280 × 720 (248 px), 1 440 × 900, posées par `ouvrir` (FENETRES).
const pasGrand = "Test propre aux grands écrans (tablette couchée, ordinateur, 1 440)";
const enTeteDeux = (page: Page) => page.locator("[data-en-tete]");
const boutonRail = (page: Page) => page.getByRole("button", { name: /^(Ouvrir|Fermer) le sommaire$/ });
const numeroRail = (page: Page, n: number) => page.locator(`[data-rail-numero="${n}"]`);
/** Le panneau du sommaire a fini de glisser (ni transform ni transition en cours). */
const panneauPose = (page: Page) =>
  expect.poll(() => page.evaluate(() => { const el = document.getElementById("sommaire-panneau"); return !!el && getComputedStyle(el).transform === "none"; })).toBe(true);
const zonePartition = (page: Page) => page.locator("[class*='colonne-partition:920px']");

const LARGEUR_ZONE: Record<string, number> = { "tablette-paysage": 892, ordinateur: 920 };
test("grand écran : la zone de partition mesure 892 px ± 16 en 1 080 × 810, 920 px ± 16 en 1 280 × 720, 920 px au plus à 1 440", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasGrand);
  await ouvrir(page, "sjp", info.project.name);
  const l = (await zonePartition(page).boundingBox())!.width;
  const cible = LARGEUR_ZONE[info.project.name];
  if (cible) expect(Math.abs(l - cible), `zone de partition : ${l} px`).toBeLessThanOrEqual(16);
  else expect(l, "plafond de 1 080 px à 1 440 (T4)").toBeLessThanOrEqual(1080.5);
  // Alignée à gauche contre le rail, sans défilement horizontal.
  const [rail, zone] = await Promise.all([boutonRail(page).boundingBox(), zonePartition(page).boundingBox()]);
  expect(zone!.x, "la partition après le rail").toBeGreaterThanOrEqual(rail!.x + rail!.width);
  expect(zone!.x - (rail!.x + rail!.width), "écart rail → partition").toBeLessThanOrEqual(32);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("ordinateur : aucune ligne de paroles de Hosanna (FR) coupée sur deux lignes à 1 280 px", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur" && info.project.name !== "ordinateur-1440", "Largeur de 1 280 px et plus");
  await ouvrir(page, "sjp", info.project.name);
  const lignes = await page.locator('[data-outline-item="1"] [data-copy-line]').evaluateAll((els) =>
    els.map((el) => ({ texte: el.textContent?.slice(0, 40) ?? "", rangees: el.querySelectorAll("[data-rangee]").length })),
  );
  expect(lignes.length, "Hosanna a des lignes de paroles").toBeGreaterThan(5);
  expect(lignes.filter((x) => x.rangees > 1), "lignes coupées").toEqual([]);
});

const SEUILS_GRAND: { projet: string; aide: number; vue: number }[] = [
  { projet: "tablette-paysage", aide: 38, vue: 38 },
  { projet: "ordinateur", aide: 42, vue: 42 },
];
for (const m of SEUILS_GRAND) {
  test(`${m.projet} (grand écran) : « Couplet 1 » de Hosanna à ${m.aide} % au plus, avec et sans l'aide des accords`, async ({ page }, info) => {
    test.skip(info.project.name !== m.projet, "Mesure propre à cette fenêtre");
    await ouvrir(page, "sjp", m.projet, false, false);
    await expect(aide(page)).toBeVisible();
    const avec = await hautEtiquette(page, "sjp");
    expect(avec, `aide affichée : étiquette à ${avec.toFixed(1)} %`).toBeLessThanOrEqual(m.aide);
    await aide(page).getByRole("button").click();
    await expect(aide(page)).toHaveCount(0);
    const sans = await hautEtiquette(page, "sjp");
    expect(sans, `aide vue : étiquette à ${sans.toFixed(1)} %`).toBeLessThanOrEqual(Math.min(m.vue, avec));
  });
}

test("grand écran : le rail nomme chaque chant « n. titre », Tab atteint le bouton puis les numéros", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasGrand);
  await ouvrir(page, "sjp", info.project.name);
  await expect(boutonRail(page)).toHaveAttribute("aria-expanded", "false");
  await expect(boutonRail(page)).toHaveAttribute("aria-controls", "sommaire-panneau");
  await expect(page.getByRole("navigation", { name: /^(Sommaire|目录)$/ })).toHaveCount(0);
  for (const [n, titre] of [[1, /^1\. Hosanna/i], [2, /^2\. 一切歌颂赞美/]] as const) {
    const num = numeroRail(page, n);
    await expect(num).toHaveAttribute("aria-label", titre);
    await expect(num).toHaveAttribute("title", (await num.getAttribute("aria-label"))!);
    expect((await num.boundingBox())!.width, "numéro de 56 px").toBe(56);
  }
  await expect(numeroRail(page, 1)).toHaveAttribute("aria-current", "true");
  await expect(numeroRail(page, 2)).not.toHaveAttribute("aria-current", "true");
  // Tab : du dernier bouton de l'en-tête au bouton du rail, puis aux numéros.
  await enTeteDeux(page).getByRole("button", { name: "Mode Louange" }).focus();
  await page.keyboard.press("Tab");
  await expect(boutonRail(page)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(numeroRail(page, 1)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(numeroRail(page, 2)).toBeFocused();
});

test("grand écran : Entrée sur le bouton du rail ouvre le panneau (focus dedans), Échap le ferme et rend le focus, un toucher dehors aussi", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasGrand);
  await ouvrir(page, "sjp", info.project.name);
  const nav = page.getByRole("navigation", { name: /^(Sommaire|目录)$/ });
  await boutonRail(page).focus();
  await page.keyboard.press("Enter");
  await expect(nav).toBeVisible();
  await expect(boutonRail(page)).toHaveAttribute("aria-expanded", "true");
  await expect(boutonRail(page)).toHaveAccessibleName(/^(Fermer le sommaire|收起目录)$/);
  await expect(nav.locator("[data-sommaire-chant][aria-current]")).toBeFocused();
  // Par-dessus la partition, collé au rail, fond opaque.
  await panneauPose(page); // le panneau glisse en 400 ms : on mesure une fois posé
  const [r, p] = await Promise.all([boutonRail(page).boundingBox(), nav.locator("xpath=..").boundingBox()]);
  expect(p!.x, "collé au rail").toBeGreaterThanOrEqual(r!.x + r!.width - 1);
  expect(Math.abs(p!.width - 380), "panneau de 380 px").toBeLessThanOrEqual(5);
  // Rien de la partition (accords, pastilles collées) ne passe par-dessus le panneau : on teste une grille de points.
  const dessus = await page.evaluate(() => {
    const panneau = document.getElementById("sommaire-panneau")!;
    const b = panneau.getBoundingClientRect();
    const fautes: string[] = [];
    for (let x = b.left + 20; x < b.right - 10; x += 40)
      for (let y = b.top + 20; y < Math.min(b.bottom, innerHeight) - 10; y += 30) {
        const el = document.elementFromPoint(x, y);
        if (el && !panneau.contains(el)) fautes.push(`${Math.round(x)},${Math.round(y)} ${el.tagName}`);
      }
    return fautes;
  });
  expect(dessus, "le panneau est au-dessus de la partition").toEqual([]);
  await page.keyboard.press("Escape");
  await expect(nav).toHaveCount(0);
  await expect(boutonRail(page)).toBeFocused();
  await expect(boutonRail(page)).toHaveAttribute("aria-expanded", "false");
  // Un toucher en dehors du panneau et du bouton le ferme.
  await boutonRail(page).click();
  await expect(nav).toBeVisible();
  // (La marge droite de la page : le panneau couvre le début de la partition.)
  await page.mouse.click(page.viewportSize()!.width - 6, 500);
  await expect(nav).toHaveCount(0);
});

test("grand écran : un numéro du rail amène à son chant sans ouvrir le panneau ; le panneau se referme après un choix", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasGrand);
  await ouvrir(page, "sjp", info.project.name);
  const sousEnTete = async (n: number) =>
    page.evaluate((i) => document.querySelector(`[data-outline-item="${i}"]`)!.getBoundingClientRect().top - document.querySelector("[data-en-tete]")!.getBoundingClientRect().bottom, n);
  await numeroRail(page, 2).click();
  await expect.poll(async () => Math.round(await sousEnTete(2))).toBeLessThanOrEqual(40);
  expect(await sousEnTete(2), "pas au-dessus du bas de l'en-tête").toBeGreaterThanOrEqual(-2);
  await expect(page.getByRole("navigation", { name: /^(Sommaire|目录)$/ })).toHaveCount(0);
  await expect(numeroRail(page, 2)).toHaveAttribute("aria-current", "true");
  // Dans le panneau : le choix du chant 1 le referme.
  const nav = await ouvrirSommaire(page);
  await nav.locator('[data-sommaire="1"] [data-sommaire-chant]').click();
  await expect(nav).toHaveCount(0);
  await expect.poll(async () => Math.round(await sousEnTete(1))).toBeLessThanOrEqual(40);
});

test("grand écran : le titre de l'en-tête déplie `#entete-setlist-dv` (aria-expanded) ; l'en-tête tient sur une rangée", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasGrand);
  await ouvrir(page, "sjp", info.project.name);
  const titre = enTeteDeux(page).getByRole("button", { name: /^.+, (Afficher les détails de la setlist|显示歌单详情)$/ });
  const bloc = page.locator("#entete-setlist-dv");
  await expect(titre).toHaveAttribute("aria-controls", "entete-setlist-dv");
  await expect(titre).toHaveAttribute("aria-expanded", "false");
  await expect(bloc).toBeHidden();
  await expect(enTeteDeux(page).getByText(NOTE)).toBeVisible();
  const h = (await enTeteDeux(page).boundingBox())!.height;
  expect(h, `rangée de 52 à 64 px, mesurée ${h}`).toBeLessThanOrEqual(64);
  await titre.click();
  await expect(titre).toHaveAttribute("aria-expanded", "true");
  await expect(bloc).toBeVisible();
  await expect(bloc.getByText("Culte Francophone")).toBeVisible();
  await expect(bloc.getByRole("heading", { level: 1, name: "Culte du 8 novembre" })).toBeVisible();
  await titre.click();
  await expect(bloc).toBeHidden();
});

test("grand écran : un chant ZH (一切歌颂赞美) en texte, sans débordement horizontal à 1 080 px", async ({ page }, info) => {
  test.skip(info.project.name !== "tablette-paysage", "Largeur de 1 080 px");
  await ouvrir(page, "stxt", info.project.name);
  await page.locator('[data-outline-item="2"]').scrollIntoViewIfNeeded();
  const m = await page.evaluate(() => {
    const c = document.querySelector('[data-outline-item="2"]')!.getBoundingClientRect();
    return { droit: c.right, fenetre: document.documentElement.clientWidth, defile: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  expect(m.droit, "le chant ne dépasse pas la fenêtre").toBeLessThanOrEqual(m.fenetre);
  expect(m.defile, "pas de défilement horizontal").toBe(false);
  await page.screenshot({ path: "test-results/t3-pupitre/tablette-paysage-zh-1080.png" });
});

test("captures T3 : panneau fermé et ouvert, en clair ; sombre à 1 440", async ({ page }, info) => {
  const nom = info.project.name;
  test.skip(volet(nom), pasGrand);
  const dossier = "test-results/t3-pupitre";
  await ouvrir(page, "sjp", nom);
  await page.screenshot({ path: `${dossier}/${nom}-panneau-ferme-clair.png` });
  await boutonRail(page).click();
  await expect(page.getByRole("navigation", { name: /^(Sommaire|目录)$/ })).toBeVisible();
  await panneauPose(page);
  await page.screenshot({ path: `${dossier}/${nom}-panneau-ouvert-clair.png` });
});

test("capture T3 sombre : 1 440 px, panneau fermé puis ouvert", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "Sombre : 1 440 seulement");
  await ouvrir(page, "sjp", info.project.name, true);
  await page.screenshot({ path: "test-results/t3-pupitre/ordinateur-1440-panneau-ferme-sombre.png" });
  await boutonRail(page).click();
  await panneauPose(page);
  await page.screenshot({ path: "test-results/t3-pupitre/ordinateur-1440-panneau-ouvert-sombre.png" });
});

test("capture T5 : 1 440 px, panneau du sommaire en plein glissement (rien ne passe sur le rail)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "1 440 seulement");
  await ouvrir(page, "sjp", info.project.name);
  await boutonRail(page).click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: "test-results/t5-pupitre/ordinateur-1440-panneau-glisse.png" });
});

// ─── T4, JV-2 : lecture en colonnes dès 1 000 px de zone, 简谱 jamais en colonne ───────────────────────────────────────
const sectionsDe = (page: Page, n: number) =>
  page.locator(`[data-outline-item="${n}"] [data-section]`).evaluateAll((els) =>
    els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, droite: r.right }; }));
const lignesCoupees = (page: Page, n: number) =>
  page.locator(`[data-outline-item="${n}"] [data-copy-line]`).evaluateAll((els) =>
    els.filter((el) => el.querySelectorAll("[data-rangee]").length > 1).map((el) => el.textContent?.slice(0, 40)));

test("ordinateur-1440 : deux colonnes de 528 px en lecture en colonnes, gouttière de 24 px, aucune section ni ligne coupée (T4, JV-2)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "1 440 × 900");
  await ouvrir(page, "stxt", info.project.name);
  const s = await page.locator('[data-outline-item="1"] [data-section]').evaluateAll((els) =>
    els.map((el, i) => { const r = el.getBoundingClientRect(); return { i, x: r.x, y: r.y, w: r.width, droite: r.right, rects: el.getClientRects().length }; }));
  expect(s.length).toBeGreaterThanOrEqual(3);
  expect(Math.abs(s[0].w - 528), "colonne de 528").toBeLessThanOrEqual(16);
  const xs = [...new Set(s.map((x) => Math.round(x.x)))].sort((p, q) => p - q);
  expect(xs.length, "au plus deux colonnes").toBeLessThanOrEqual(2);
  expect(xs.length, "deux colonnes").toBe(2);
  const gauche = s.filter((x) => Math.abs(x.x - xs[0]) < 4);
  const droite = s.filter((x) => Math.abs(x.x - xs[1]) < 4);
  expect(Math.abs(droite[0].x - gauche[0].droite - 24), "gouttière de 24").toBeLessThanOrEqual(4);
  expect(gauche[0].i, "1re section en haut à gauche").toBe(0);
  for (const col of [gauche, droite]) {
    for (let k = 1; k < col.length; k++) expect(col[k].y, "de haut en bas dans la colonne").toBeGreaterThan(col[k - 1].y);
  }
  expect(droite[0].i, "gauche puis droite").toBeGreaterThan(Math.max(...gauche.map((x) => x.i)));
  expect(Math.abs(droite[0].y - s[0].y), "haut de la colonne droite aligné sur la 1re section").toBeLessThanOrEqual(4);
  expect(s.filter((x) => x.rects !== 1).length, "aucune section coupée entre deux colonnes").toBe(0);
  expect(Math.max(...s.map((x) => x.droite)), "rien au-delà de 1 440").toBeLessThanOrEqual(1440);
  expect(await lignesCoupees(page, 1), "Hosanna : lignes coupées").toEqual([]);
  expect(await lignesCoupees(page, 2), "一切歌颂赞美 en texte : lignes coupées").toEqual([]);
  await page.screenshot({ path: "test-results/t4-pupitre/ordinateur-1440-fr-clair.png" });
});

test("captures JV-2", async ({ page }, info) => {
  const p = info.project.name;
  await ouvrir(page, "stxt", p);
  await page.screenshot({ path: `test-results/jv2/${p}-fr-clair.png` });
  await page.locator('[data-outline-item="2"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/jv2/${p}-zh-clair.png` });
  if (p === "ordinateur-1440") {
    await ouvrir(page, "stxt", p, true);
    await page.screenshot({ path: `test-results/jv2/${p}-fr-sombre.png` });
    await page.locator('[data-outline-item="2"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/jv2/${p}-zh-sombre.png` });
  }
});

test("ordinateur : à 1 280 px, toujours une colonne de 920 px (T4)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "1 280 × 720");
  await ouvrir(page, "stxt", info.project.name);
  const s = await sectionsDe(page, 1);
  expect(new Set(s.map((x) => Math.round(x.x))).size, "une seule colonne").toBe(1);
  expect(Math.abs((await zonePartition(page).first().boundingBox())!.width - 920)).toBeLessThanOrEqual(16);
  await page.screenshot({ path: "test-results/t4-pupitre/ordinateur-1280.png" });
});

test("ordinateur-1440 sombre : captures FR et 简谱 (T4)", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur-1440", "Sombre : 1 440 seulement");
  await ouvrir(page, "stxt", info.project.name, true);
  await page.screenshot({ path: "test-results/t4-pupitre/ordinateur-1440-fr-sombre.png" });
});

test("简谱 : l'image et son calque ont la même largeur, au plus 920 px sous 1 000 px de zone, deux volets à 1 440, sans section à côté (T4)", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await ouvrir(page, "sjp", info.project.name);
  const zone = page.locator('[data-outline-item="2"] [data-jianpu-page]').first();
  await expect(zone).toBeVisible();
  await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));
  if (info.project.name === "ordinateur-1440") await expect(zone.locator("xpath=ancestor::*[@data-enveloppe-scan]")).toHaveAttribute("data-scan-volets", "2");
  const m = await zone.evaluate((p) => {
    const img = p.querySelector("img")!.getBoundingClientRect();
    const calque = (p.querySelector("[data-jianpu-calque]") ?? p).getBoundingClientRect();
    const item = p.closest("[data-outline-item]")!;
    const sections = Array.from(item.querySelectorAll("[data-section]")).map((e) => e.getBoundingClientRect());
    // La marge blanche du scan déborde volontairement de la colonne (JianpuSheet) : le plafond de 920 px se mesure sur l'enveloppe.
    const colonne = p.closest("[data-enveloppe-scan]")!.getBoundingClientRect().width;
    return { img: img.width, calque: calque.width, colonne, droite: img.right, fenetre: document.documentElement.clientWidth,
      voisines: sections.filter((r) => r.bottom > img.top && r.top < img.bottom && r.width > 0).length };
  });
  expect(Math.abs(m.img - m.calque), "image = calque").toBeLessThan(2);
  // JV-3 : dès 1 000 px de zone (1 440) le scan passe en deux volets (tests/jianpu-deux-volets.spec.ts) ; la garde de 920 px vaut en dessous.
  if (info.project.name !== "ordinateur-1440") expect(m.colonne, "enveloppe du scan").toBeLessThanOrEqual(920.5);
  expect(m.droite).toBeLessThanOrEqual(m.fenetre);
  expect(m.voisines, "aucune section à côté du scan").toBe(0);
  await zone.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/t4-pupitre/${info.project.name}-jianpu-clair.png` });
});

// T5 : le mouvement de la vue Partitions (docs/spec-exemples-usage.md § 4 « Mouvement »).
const LECTURE_MOUVEMENT = `new Promise((fin) => {
  const vu = { transforms: [], opacite150: false };
  const fin_ = performance.now() + 1500;
  const tour = () => {
    const v = document.querySelector("[data-vue]");
    if (v && v.style.transform) vu.transforms.push(v.style.transform);
    if (document.getAnimations().some((a) => a.effect && a.effect.getKeyframes().some((k) => "opacity" in k) && a.effect.getTiming().duration === 150)) vu.opacite150 = true;
    performance.now() < fin_ ? requestAnimationFrame(tour) : fin(vu);
  };
  tour();
})`;
const sourisBascule = (page: Page, nom: "Liste" | "Partitions") =>
  page.getByTestId("bascule-vues").getByRole("button", { name: nom, exact: true });

async function basculeEtLit(page: Page, nom: "Liste" | "Partitions") {
  const lecture = page.evaluate(LECTURE_MOUVEMENT) as Promise<{ transforms: string[]; opacite150: boolean }>;
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));
  await sourisBascule(page, nom).click();
  return lecture;
}

async function etatFinal(page: Page, nom: "Liste" | "Partitions") {
  await expect(sourisBascule(page, nom)).toHaveAttribute("aria-pressed", "true");
  if (nom === "Partitions") {
    await expect(page.locator("[data-outline-item]").first()).toBeVisible();
    expect(page.url()).toContain("vue=partitions");
  } else {
    await expect(page.locator("[data-outline-item]")).toHaveCount(0);
    expect(page.url()).not.toContain("vue=partitions");
  }
  await expect.poll(() => page.evaluate(() => (document.querySelector("[data-vue]") as HTMLElement).style.transform)).toBe("");
}

test.describe("T5 : toucher sur Liste | Partitions", () => {
  test("téléphone et tablette debout : le toucher glisse la vue comme le geste (transform non nul), état final du geste", async ({ page }, info) => {
    test.skip(!volet(info.project.name), pasVolet);
    await ouvrir(page, "sjp", info.project.name);
    for (const nom of ["Liste", "Partitions"] as const) {
      const vu = await basculeEtLit(page, nom === "Liste" ? "Liste" : "Partitions");
      expect(vu.transforms.length, `transform vu pendant la bascule vers ${nom}`).toBeGreaterThan(0);
      await etatFinal(page, nom);
    }
  });

  test.describe("mouvement réduit", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });
    test("téléphone et tablette debout : aucun transform, fondu d'opacité de 150 ms, état final du geste", async ({ page }, info) => {
      test.skip(!volet(info.project.name), pasVolet);
      await ouvrir(page, "sjp", info.project.name);
      for (const nom of ["Liste", "Partitions"] as const) {
        const vu = await basculeEtLit(page, nom);
        expect(vu.transforms, `aucun transform vers ${nom}`).toEqual([]);
        expect(vu.opacite150, `fondu de 150 ms vers ${nom}`).toBe(true);
        await etatFinal(page, nom);
      }
    });
  });
});

for (const [id, chant] of [["sjp", "Hosanna"], ["szh", "一切歌颂赞美"]] as const) {
  test(`téléphone et tablette debout : l'en-tête déplié se replie une fois sorti par le haut, sans décalage (${chant})`, async ({ page }, info) => {
    test.skip(!volet(info.project.name), pasVolet);
    await ouvrir(page, id, info.project.name);
    const bouton = boutonDetails(page);
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-expanded", "true");
    const haut = () => page.evaluate(() => document.querySelector("[data-outline-item] [data-section]")!.getBoundingClientRect().top);
    // Défile par petits pas jusqu'au repli ; la section visible doit suivre le défilement sans saut.
    let avant = await haut();
    let replie = false;
    for (let i = 0; i < 40 && !replie; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(60);
      const apres = await haut();
      expect(Math.abs(apres - avant + 60), `pas ${i} : décalage de ${(apres - avant + 60).toFixed(1)} px`).toBeLessThanOrEqual(1.5);
      avant = apres;
      replie = (await bouton.getAttribute("aria-expanded")) === "false";
    }
    expect(replie, "l'en-tête s'est replié").toBe(true);
    await expect(page.locator("#entete-setlist")).toBeHidden();
    // La barre d'outils reste escamotée (le défilement de compensation ne la rappelle pas).
    await page.waitForTimeout(300);
    await expect(barre(page)).toHaveCSS("transform", /matrix\(1, 0, 0, 1, 0, -\d+/);
    // Rouvert depuis le milieu de la page (barre revenue) : il se montre, il ne s'ouvre pas hors de l'écran.
    await page.mouse.wheel(0, -60);
    await expect(barre(page)).toHaveCSS("transform", /none|matrix\(1, 0, 0, 1, 0, 0\)/);
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => page.evaluate(() => document.getElementById("entete-setlist")!.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  });
}

test.describe("T5 : ressort du rail du sommaire", () => {
  test("grand écran : le panneau glisse (transform intermédiaire) ; Échap avant 400 ms le referme depuis là, focus au bouton", async ({ page }, info) => {
    test.skip(volet(info.project.name), pasGrand);
    await ouvrir(page, "sjp", info.project.name);
    const intermediaires: string[] = [];
    await page.exposeFunction("noterTransform", (t: string) => intermediaires.push(t));
    await page.evaluate(() => {
      const tour = () => {
        const el = document.getElementById("sommaire-panneau");
        if (el) (window as unknown as { noterTransform: (t: string) => void }).noterTransform(getComputedStyle(el).transform);
        requestAnimationFrame(tour);
      };
      tour();
    });
    await boutonRail(page).click();
    await expect.poll(() => intermediaires.some((t) => t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)")).toBe(true);
    await panneauPose(page);
    // Décalage horizontal du panneau (px) : 0 ouvert, -380 fermé.
    const decalage = () =>
      page.evaluate(() => {
        const el = document.getElementById("sommaire-panneau");
        return el ? new DOMMatrix(getComputedStyle(el).transform).m41 : null;
      });
    // Échap pendant la fermeture n'a rien à faire ; on ferme, puis on rouvre en pleine fermeture : le panneau repart de là où il est.
    await page.keyboard.press("Escape");
    await expect(boutonRail(page)).toHaveAttribute("aria-expanded", "false");
    await expect(boutonRail(page)).toBeFocused();
    await page.waitForTimeout(120);
    const enFermeture = (await decalage())!;
    expect(enFermeture, "en pleine fermeture").toBeLessThan(-5);
    expect(enFermeture, "en pleine fermeture").toBeGreaterThan(-375);
    await boutonRail(page).click();
    const repris = (await decalage())!;
    expect(repris, "rouvert depuis là, sans repartir du bord").toBeGreaterThan(-375);
    await panneauPose(page);
    // Échap pendant l'ouverture : il se referme depuis là, puis est retiré.
    await boutonRail(page).click();
    await expect(page.locator("#sommaire-panneau")).toHaveCount(0);
    await boutonRail(page).click();
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await expect(boutonRail(page)).toHaveAttribute("aria-expanded", "false");
    await expect(boutonRail(page)).toBeFocused();
    await expect(page.locator("#sommaire-panneau")).toHaveCount(0);
  });

  test.describe("mouvement réduit", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });
    test("grand écran : aucun transform, opacité animée, panneau ouvert puis fermé", async ({ page }, info) => {
      test.skip(volet(info.project.name), pasGrand);
      await ouvrir(page, "sjp", info.project.name);
      await page.evaluate(() => {
        (window as unknown as { vus: string[] }).vus = [];
        const tour = () => {
          const el = document.getElementById("sommaire-panneau");
          if (el) (window as unknown as { vus: string[] }).vus.push(getComputedStyle(el).transform);
          requestAnimationFrame(tour);
        };
        tour();
      });
      await boutonRail(page).click();
      await expect(page.locator("#sommaire-panneau")).toHaveCSS("opacity", "1");
      await boutonRail(page).click();
      await expect(page.locator("#sommaire-panneau")).toHaveCount(0);
      const vus = await page.evaluate(() => (window as unknown as { vus: string[] }).vus);
      expect(vus.length).toBeGreaterThan(0);
      expect(vus.filter((t) => t !== "none"), "aucun transform").toEqual([]);
    });
  });
});
