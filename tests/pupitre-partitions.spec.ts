import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirListe, ouvrirPartitions } from "./helpers/setlist";

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
  "setlists/stxt": setlist([item("hosanna", 1, {}, NOTE), item("一切歌颂赞美", 2, { jianpuSheet: false })]),
  // T2 : premier chant en texte chinois, même note
  "setlists/szh": setlist([item("一切歌颂赞美", 1, { jianpuSheet: false }, NOTE), item("hosanna", 2)]),
};

// Valeurs de la base (avant T1), codées en dur : --lyric-size = 0.88rem × 1,1 (écran) ou × 1,2 (dès 768 px) ; couleur
// calculée de « Couplet 1 » de Hosanna en clair (`--sec-c` de la section, que T1 ne touche pas).
const PAROLES_PX = { telephone: 0.88 * 1.1 * 16, tablette: 0.88 * 1.2 * 16 };
const COULEUR_COUPLET = "rgb(44, 138, 125)";
const COLONNE_DEUX_VOLETS = 860; // `--colonne-partition` posée par le volet de droite (SetlistDetailClient)

const FENETRES: Record<string, { width: number; height: number }> = {
  telephone: { width: 390, height: 844 },
  tablette: { width: 820, height: 1180 },
};

async function ouvrir(page: Page, id: "sjp" | "stxt" | "szh", projet?: string, sombre = false, aideVue = true) {
  if (projet && FENETRES[projet]) await page.setViewportSize(FENETRES[projet]);
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

test("deux volets : la colonne de partition garde son plafond de 860 px", async ({ page }, info) => {
  test.skip(volet(info.project.name), pasDeuxVolets);
  await ouvrir(page, "sjp", info.project.name);
  // Le plafond des deux volets est inchangé : la colonne garde `max-width: 860px` (posé par `--colonne-partition`).
  const m = await page.locator("[data-outline-item]").first().evaluate((el) => {
    const c = el.querySelector("[class*='max-w-[var(--colonne-partition']")!;
    return { plafond: getComputedStyle(c).maxWidth, largeur: c.getBoundingClientRect().width };
  });
  expect(m.plafond).toBe(`${COLONNE_DEUX_VOLETS}px`);
  expect(m.largeur).toBeLessThanOrEqual(COLONNE_DEUX_VOLETS + 0.5);
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
