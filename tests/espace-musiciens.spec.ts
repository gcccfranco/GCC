import { expect, test, type Page } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { entreesBarre, entreesMusiciens, espaceAffiche, espaceDe, estEntreeActive, labelDeSection, ongletsMusiciens } from "../src/lib/navigation";
import { estGrandEcran, interdireDialoguesNatifs } from "./helpers/agencement";

// EM-2 (docs/spec-espace-musiciens.md, Q1-Q3) : l'espace Musiciens, ses entrées, son sélecteur « App · Musiciens ·
// Back-Office » et sa barre du bas, sur les cinq dispositions (SPECS_GRAND_ECRAN). Plannings et profils simulés ;
// personnages fictifs. Captures de /accords du pianiste : test-results/captures-espace-musiciens/.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
// Le planning dit l'instrument : une pianiste, un batteur, un guitariste.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Mireille T.", "", "", "Odile V.", "Gaspard L.", "Hector B.", "", "", "Orateur Z.", "", ""],
]);

// Pianiste par l'organigramme (sous-équipe musiciens, joue piano) et le planning.
const PIANISTE: FakeProfile = { uid: "uid-odile", email: "odile@example.com", firstName: "Odile", lastName: "V.", planningName: "Odile V.", ...musicien("piano") };
// Batteur par le planning seul : ni sous-équipe, ni `joue` sur le profil.
const BATTEUR: FakeProfile = { uid: "uid-hector", email: "hector@example.com", firstName: "Hector", lastName: "B.", planningName: "Hector B." };
// Un membre sans instrument.
const MEMBRE: FakeProfile = { uid: "uid-sibylle", email: "sibylle@example.com", firstName: "Sibylle", lastName: "R.", planningName: "Sibylle R." };
// Responsable (plannings à remplir) et pianiste : les trois segments.
const RESPONSABLE: FakeProfile = { uid: "uid-armand", email: "armand@example.com", firstName: "Armand", lastName: "F.", plannings: ["culte"], ...musicien("piano"), planningName: "Odile V." };
// Responsable qui ne joue pas : les deux segments d'avant.
const RESPONSABLE_SEUL: FakeProfile = { uid: "uid-blandine", email: "blandine@example.com", firstName: "Blandine", lastName: "P.", plannings: ["culte"] };

async function entrer(page: Page, qui: FakeProfile | null, to: string) {
  interdireDialoguesNatifs(page);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  if (qui) await signInAs(page, qui, {}, to);
  else await page.goto(to);
}

const laterale = (page: Page) => page.getByTestId("barre-laterale");
const barreDuBas = (page: Page) => page.getByTestId("barre-du-bas");
// Le sélecteur en segments ; la version en icônes de la barre réduite (même rôle, même nom) se lit à part.
const selecteur = (page: Page) =>
  page.getByRole("group", { name: "Choisir l'espace" }).and(page.locator(':not([data-testid="selecteur-icones"])'));
const noms = (liens: ReturnType<Page["locator"]>) => liens.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.textContent?.trim() ?? ""));
/** Les entrées de la barre latérale (barre réduite comprise : le nom est dans `aria-label`). */
const entreesLaterale = (page: Page) => laterale(page).getByRole("navigation").getByRole("link");

async function capture(page: Page, nom: string) {
  await page.screenshot({ path: `test-results/captures-espace-musiciens/${nom}-${test.info().project.name}.png` });
}

// ─── Règles pures ────────────────────────────────────────────────────────────────

test.describe("Espace Musiciens : règles pures", () => {
  test("espaceDe : /accords et /harmonie (slash final compris) chez les musiciens", () => {
    for (const p of ["/accords", "/accords/", "/harmonie", "/harmonie/", "/harmonie/cours", "/harmonie/rd2000/", "/harmonie/une-fiche"]) {
      expect(espaceDe(p), p).toBe("musiciens");
    }
    for (const p of ["/planning", "/songs", "/accordsx", "/harmonies", "/back-office/"]) expect(espaceDe(p), p).not.toBe("musiciens");
    expect(espaceDe("/back-office/equipes")).toBe("back-office");
  });

  test("espaceAffiche : un non-musicien est ramené à l'App, le Back-Office ne change pas", () => {
    expect(espaceAffiche("/accords", { musicien: true })).toBe("musiciens");
    expect(espaceAffiche("/accords", { musicien: false })).toBe("app");
    expect(espaceAffiche("/harmonie/cours", { musicien: false })).toBe("app");
    expect(espaceAffiche("/back-office", { musicien: false })).toBe("back-office");
  });

  test("entreesMusiciens : Accords pour tout musicien, Harmonie et Théorie avec piano ou guitare, RD-2000 avec piano", () => {
    expect(entreesMusiciens({ musicien: false, peut: false, piano: false })).toEqual([]);
    expect(entreesMusiciens({ musicien: true, peut: false, piano: false })).toEqual(["accords"]);
    expect(entreesMusiciens({ musicien: true, peut: true, piano: false })).toEqual(["accords", "harmonie", "theorie"]);
    expect(entreesMusiciens({ musicien: true, peut: true, piano: true })).toEqual(["accords", "harmonie", "theorie", "rd2000"]);
  });

  test("entreesBarre et ongletsMusiciens : adresses, libellé court de Théorie, App en dernier", () => {
    const toutes = ["accords", "harmonie", "theorie", "rd2000"] as const;
    expect(entreesBarre("musiciens", { connecte: true, backOffice: true, musiciens: toutes }).map((e) => e.href))
      .toEqual(["/accords", "/harmonie", "/harmonie/cours", "/harmonie/rd2000"]);
    expect(entreesBarre("musiciens", { connecte: false, backOffice: true, musiciens: toutes })).toEqual([]);
    const onglets = ongletsMusiciens(toutes, "/setlists");
    expect(onglets.map((o) => o.cleCourte ?? o.cle)).toEqual([
      "musiciens.entrees.accords", "musiciens.entrees.harmonie", "musiciens.entrees.theorieCourt", "musiciens.entrees.rd2000", "backOffice.barre.app",
    ]);
    expect(onglets.at(-1)!.href).toBe("/setlists");
    expect(ongletsMusiciens([])).toEqual([]);
  });

  test("Harmonie est courante sur une fiche, pas sur les cours ni le RD-2000", () => {
    const [, harmonie, theorie, rd2000] = ongletsMusiciens(["accords", "harmonie", "theorie", "rd2000"]);
    expect(estEntreeActive(harmonie, "/harmonie")).toBe(true);
    expect(estEntreeActive(harmonie, "/harmonie/")).toBe(true);
    expect(estEntreeActive(harmonie, "/harmonie/une-fiche")).toBe(true);
    expect(estEntreeActive(harmonie, "/harmonie/cours")).toBe(false);
    expect(estEntreeActive(harmonie, "/harmonie/cours/un-chapitre")).toBe(false);
    expect(estEntreeActive(harmonie, "/harmonie/rd2000")).toBe(false);
    expect(estEntreeActive(theorie, "/harmonie/cours/un-chapitre")).toBe(true);
    expect(estEntreeActive(rd2000, "/harmonie/rd2000/")).toBe(true);
  });

  test("labelDeSection : « Musiciens » seulement pour un musicien", () => {
    expect(labelDeSection("/accords", true)).toBe("common.header.musiciens");
    expect(labelDeSection("/accords", false)).toBe("common.header.louange");
    expect(labelDeSection("/accords")).toBe("common.header.louange");
  });
});

// ─── Écrans ──────────────────────────────────────────────────────────────────────

test.describe("Espace Musiciens : le pianiste", () => {
  test("sélecteur App · Musiciens, barre « GCC Musiciens » et ses quatre entrées (ordinateur, tablette en paysage) ; barre du bas ailleurs", async ({ page }, info) => {
    await entrer(page, PIANISTE, "/accords");
    await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
    if (estGrandEcran(info)) {
      await expect(laterale(page).getByTestId("label-section")).toHaveText("Musiciens");
      await expect.poll(() => noms(entreesLaterale(page))).toEqual(["Accords", "Harmonie", "Théorie musicale", "RD-2000"]);
      await expect(entreesLaterale(page).first()).toHaveAttribute("aria-current", "page");
      await expect(barreDuBas(page), "la barre du bas est masquée sur ordinateur et tablette paysage").toBeHidden();
    } else {
      await expect(barreDuBas(page).getByRole("link")).toHaveText(["Accords", "Harmonie", "Théorie", "RD-2000", "App"]);
      await expect(barreDuBas(page).getByRole("link", { name: "Accords" })).toHaveAttribute("aria-current", "page");
    }
    // Le sélecteur visible (barre latérale dépliée, barre du haut) : deux segments, Musiciens courant.
    const visibles = selecteur(page).filter({ visible: true });
    if (await visibles.count()) {
      await expect(visibles.first().getByRole("link")).toHaveText(["App", "Musiciens"]);
      await expect(visibles.first().getByRole("link", { name: "Musiciens" })).toHaveAttribute("aria-current", "true");
    } else {
      // Barre réduite (tablette en paysage) : deux icônes, le nom en `aria-label`.
      await expect.poll(() => noms(page.getByTestId("selecteur-icones").first().getByRole("link"))).toEqual(["App", "Musiciens"]);
    }
    await capture(page, "accords-pianiste");
  });

  test("Théorie musicale mène aux cours, et Harmonie n'est plus courante dessus ; le rail de l'en-tête a disparu", async ({ page }, info) => {
    await entrer(page, PIANISTE, "/harmonie/cours");
    await expect(page.locator("[data-cours]").first()).toBeVisible();
    await expect(page.locator('[data-onglets="rail"]'), "plus de rail Fiches · Cours · RD-2000").toHaveCount(0);
    const courante = estGrandEcran(info)
      ? entreesLaterale(page).and(page.locator('[aria-current="page"]'))
      : barreDuBas(page).locator('a[aria-current="page"]');
    await expect(courante).toHaveCount(1);
    await expect.poll(async () => (await noms(courante))[0]).toMatch(/^Théorie/);
  });
});

test.describe("Espace Musiciens : les autres profils", () => {
  test("un batteur par le planning seul : Accords seul, et App dans la barre du bas", async ({ page }, info) => {
    await entrer(page, BATTEUR, "/accords");
    await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
    if (estGrandEcran(info)) {
      await expect.poll(() => noms(entreesLaterale(page))).toEqual(["Accords"]);
      await expect(laterale(page).getByTestId("label-section")).toHaveText("Musiciens");
    } else {
      await expect(barreDuBas(page).getByRole("link")).toHaveText(["Accords", "App"]);
    }
    await expect.poll(async () => await selecteur(page).count() + await page.getByTestId("selecteur-icones").count()).toBeGreaterThan(0);
  });

  test("un membre sans instrument : pas de sélecteur, et /accords garde les barres de l'App sans entrée active", async ({ page }, info) => {
    await entrer(page, MEMBRE, "/accords");
    await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
    if (estGrandEcran(info)) {
      await expect(laterale(page).getByTestId("label-section")).toHaveText("Louange");
      await expect.poll(() => noms(entreesLaterale(page))).toContain("Setlists");
      await expect(entreesLaterale(page).and(page.locator('[aria-current="page"]'))).toHaveCount(0);
    } else {
      await expect(barreDuBas(page).getByRole("link", { name: "Setlists" })).toBeVisible();
      await expect(barreDuBas(page).locator('a[aria-current="page"]')).toHaveCount(0);
    }
    for (const nom of ["Musiciens", "Théorie", "Théorie musicale", "RD-2000", "Harmonie"]) {
      await expect(page.getByRole("link", { name: nom, exact: true }).filter({ visible: true }), nom).toHaveCount(0);
    }
    await expect(selecteur(page).filter({ visible: true })).toHaveCount(0);
    await expect(page.getByTestId("selecteur-icones").filter({ visible: true })).toHaveCount(0);
  });

  test("un responsable qui joue : trois segments App · Musiciens · Back-Office", async ({ page }) => {
    await entrer(page, RESPONSABLE, "/accords");
    await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
    const visibles = selecteur(page).filter({ visible: true });
    if (await visibles.count()) {
      await expect(visibles.first().getByRole("link")).toHaveText(["App", "Musiciens", "Back-Office"]);
      await expect(visibles.first().getByRole("link", { name: "Musiciens" })).toHaveAttribute("aria-current", "true");
    } else {
      await expect.poll(() => noms(page.getByTestId("selecteur-icones").first().getByRole("link"))).toEqual(["App", "Musiciens", "Back-Office"]);
    }
  });

  test("un responsable qui ne joue pas : les deux segments d'avant", async ({ page }) => {
    await entrer(page, RESPONSABLE_SEUL, "/planning");
    const visibles = selecteur(page).filter({ visible: true });
    await expect.poll(async () => await visibles.count() + await page.getByTestId("selecteur-icones").filter({ visible: true }).count()).toBeGreaterThan(0);
    if (await visibles.count()) await expect(visibles.first().getByRole("link")).toHaveText(["App", "Back-Office"]);
    else await expect.poll(() => noms(page.getByTestId("selecteur-icones").first().getByRole("link"))).toEqual(["App", "Back-Office"]);
  });

  test("un visiteur sur /accords : la page s'affiche, pas de barre Musiciens", async ({ page }, info) => {
    await entrer(page, null, "/accords");
    await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
    await expect(selecteur(page).filter({ visible: true })).toHaveCount(0);
    await expect(barreDuBas(page).getByRole("link", { name: "Accords" })).toHaveCount(0);
    if (estGrandEcran(info)) await expect(laterale(page).getByTestId("label-section")).toHaveText("Louange");
  });
});

// ─── EM-3 : le panneau d'un accord reste celui de l'App ──────────────────────────
// Q3 : « Voir tout le dictionnaire » mène à /accords pour un membre sans instrument comme pour un visiteur ; la page
// s'affiche dans l'espace App, sans sélecteur ni barre Musiciens.

async function parcoursPanneau(page: Page, qui: FakeProfile | null, chant: string, info: Parameters<typeof estGrandEcran>[0]) {
  await page.addInitScript(() => { try { localStorage.setItem("accords-aide-vue", "1"); localStorage.setItem("jianpu-sheet-pref", "never"); } catch {} });
  await entrer(page, qui, `/songs/${encodeURIComponent(chant)}`);
  const accord = page.locator("[data-accord-touchable]").first();
  await expect(accord).toBeVisible();
  const nomAccord = (await accord.textContent())!.trim();
  await accord.click();
  await expect(page.locator("[data-accord-panneau] [data-accord-nom]")).toHaveText(nomAccord);
  await page.getByRole("link", { name: /Voir tout le dictionnaire/ }).click();
  await expect(page).toHaveURL(new RegExp(`/accords/?\\?accord=${encodeURIComponent(nomAccord).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  await expect(page.getByRole("heading", { level: 1, name: "Accords" })).toBeVisible();
  await expect(selecteur(page).filter({ visible: true })).toHaveCount(0);
  await expect(page.getByTestId("selecteur-icones").filter({ visible: true })).toHaveCount(0);
  await expect(barreDuBas(page).getByRole("link", { name: "Accords" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Théorie musicale", exact: true }).filter({ visible: true })).toHaveCount(0);
  if (estGrandEcran(info)) await expect(laterale(page).getByTestId("label-section")).toHaveText("Louange");
}

test.describe("EM-3 : du panneau d'un accord au dictionnaire", () => {
  test("un membre sans instrument, chant français", async ({ page }, info) => {
    await parcoursPanneau(page, MEMBRE, "abba-pere", info);
  });

  test("un membre sans instrument, chant chinois", async ({ page }, info) => {
    await parcoursPanneau(page, MEMBRE, "一切歌颂赞美", info);
  });

  test("un visiteur sans compte, chant français", async ({ page }, info) => {
    await parcoursPanneau(page, null, "abba-pere", info);
  });
});

test.describe("EM-3 : libellés en 中文", () => {
  test("le pianiste voit 乐手 et 乐理 dans la barre", async ({ page }, info) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    await entrer(page, PIANISTE, "/accords");
    await expect(page.getByRole("heading", { level: 1, name: "和弦" })).toBeVisible();
    if (estGrandEcran(info)) {
      await expect(laterale(page).getByTestId("label-section")).toHaveText("乐手");
      await expect.poll(() => noms(entreesLaterale(page))).toEqual(["和弦", "和声", "乐理", "RD-2000"]);
    } else {
      await expect(barreDuBas(page).getByRole("link", { name: "乐理", exact: true })).toBeVisible();
    }
    const visibles = page.getByRole("group", { name: "选择空间" }).filter({ visible: true });
    if (await visibles.count()) await expect(visibles.first().getByRole("link", { name: "乐手" })).toHaveAttribute("aria-current", "true");
    else await expect.poll(() => noms(page.getByTestId("selecteur-icones").first().getByRole("link"))).toContain("乐手");
  });
});
