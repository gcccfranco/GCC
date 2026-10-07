import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, ongletsRail, verifierAgencement } from "./helpers/agencement";

// Agencement v18, tranche T9 — App Setlists et Mes services (docs/spec-agencement-v18.md, A9 et
// A11) : l'en-tête commun (titre, sous-titre, « + Nouvelle setlist ») au-dessus des deux volets,
// la liste en carte, ses vues dans le rail (À venir · Archives · Mes setlists, À venir · Passés) ;
// la fiche de droite se titre en h2 de 24 px. « + Nouvelle setlist » : pilule à libellé dès
// 768 px, rond sur téléphone. Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN).
// Feuilles Google, Firestore et date simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, pres: string, piano: string) =>
  [date, pres, "Noé T.", "Inès V.", piano, "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ENTETE_CULTE,
    culte("27/09", "Léa M.", "Ruth K."),
    culte("04/10", "Léa M.", "Ruth K."),
    culte("11/10", "Noé T.", "Yann B."),
    culte("18/10", "Hugo L.", "Ruth K."),
  ]),
};

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] } };

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (title: string, date: string, leader: string) => ({
  title, leader, category: "Culte Francophone", date, language: "mixed", notes: "", ownerId: "uid-owner",
  isPrivate: false, items: [item("hosanna", 1), item("abba-pere", 2)],
});
const DOCS = {
  "setlists/sl-1": setlist("Culte du 4 octobre", "2026-10-04", "Léa M."),
  "setlists/sl-2": setlist("Culte du 18 octobre", "2026-10-18", "Hugo L."),
};

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, RUTH, DOCS, adresse);
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
/** Le bloc des deux volets (ou de la liste seule) : il prend toute la zone. */
const volets = (page: Page) => liste(page).locator("..");
/** Setlists n'a deux volets qu'en grand ; sinon la liste est posée à la marge, son rail en tête. */
const blocSetlists = (page: Page, info: TestInfo) => (estGrandEcran(info) ? volets(page) : ongletsRail(page).locator(".."));
const ligneSetlist = (page: Page, titre: string) => page.getByRole("link", { name: new RegExp(titre) }).first();

async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

/** La liste est une carte en relief (rayon 16 px, ombre), l'en-tête au-dessus des deux volets. */
async function verifierDeuxVolets(page: Page) {
  const l = liste(page);
  expect(await l.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("16px");
  expect(await l.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
  const [bEntete, bListe, bDetail] = await Promise.all([enTete(page).boundingBox(), l.boundingBox(), detail(page).boundingBox()]);
  expect(bEntete!.y + bEntete!.height, "l'en-tête au-dessus de la liste").toBeLessThanOrEqual(bListe!.y + 1);
  expect(bEntete!.y + bEntete!.height, "… et au-dessus de la fiche").toBeLessThanOrEqual(bDetail!.y + 1);
  expect(bListe!.x + bListe!.width, "la fiche à droite de la liste").toBeLessThan(bDetail!.x);
  // La fiche ne pose plus de marge (R10) : son contenu part à l'écart de la carte, et son haut est celui de la carte.
  const titre = detail(page).getByRole("heading", { level: 2 }).first();
  expect(await titre.evaluate((el) => getComputedStyle(el).fontSize), "la fiche : un h2 de 24 px").toBe("24px");
  const ecart = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ecart-volets")));
  expect(Math.abs(bDetail!.x - (bListe!.x + bListe!.width) - ecart)).toBeLessThanOrEqual(1);
}

test.describe("Setlists (A9)", () => {
  test("l'en-tête « Setlists » : h1 à la marge, sous-titre, au-dessus de la liste qui n'a plus de titre", async ({ page }, info) => {
    await ouvrir(page, "/setlists");
    await expect(ligneSetlist(page, "Culte du 4 octobre")).toBeVisible();
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Setlists", exact: true })).toBeVisible();
    await expect(enTete(page).getByText("Les chants prévus pour chaque service", { exact: true })).toBeVisible();
    await verifierAgencement(page, { contenu: blocSetlists(page, info), onglets: { rail: 1, pilules: 0 } });
    // Plus de titre dans la liste ; les vues dans le rail.
    await expect(page.getByRole("heading", { name: "Setlists" })).toHaveCount(1);
    const rail = ongletsRail(page).filter({ visible: true });
    await expect(rail).toHaveCount(1);
    await expect(rail.getByRole("tab", { name: "À venir" })).toHaveAttribute("aria-selected", "true");
    await rail.getByRole("tab", { name: "Archives" }).click();
    await expect(rail.getByRole("tab", { name: "Archives" })).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => new URL(page.url()).searchParams.get("tab")).not.toBeNull();
    expect((await enTete(page).boundingBox())!.y + 1, "le titre au-dessus du rail").toBeLessThan((await rail.boundingBox())!.y);
  });

  test("deux volets : la liste en carte, l'en-tête au-dessus des deux, l'aperçu en h2 de 24 px (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette couchée");
    await ouvrir(page, "/setlists");
    await expect(detail(page).getByRole("heading", { level: 2, name: "Culte du 4 octobre" })).toBeVisible();
    await verifierDeuxVolets(page);
    // Le rail et la recherche dans la carte, « Comment ça marche ? » en bas de la carte.
    await expect(liste(page).locator('[data-onglets="rail"]')).toBeVisible();
    await expect(liste(page).getByRole("searchbox")).toBeVisible();
    await capture(page, "v18-setlists");
  });

  test("« + Nouvelle setlist » : pilule à libellé dans l'en-tête dès 768 px, rond sur téléphone", async ({ page }, info) => {
    await ouvrir(page, "/setlists");
    await expect(ligneSetlist(page, "Culte du 4 octobre")).toBeVisible();
    const bouton = page.getByRole("link", { name: "Nouvelle setlist" });
    await expect(bouton).toHaveCount(1);
    await expect(bouton).toBeVisible();
    await expect(bouton).toHaveAttribute("href", /^\/setlists\/new\/?$/);
    const b = (await bouton.boundingBox())!;
    if (estTelephone(info)) {
      expect(Math.round(b.width), "un rond de 52 px").toBe(52);
      expect(Math.round(b.height)).toBe(52);
      await expect(bouton.getByText("Nouvelle setlist")).toHaveClass(/sr-only/);
      const fenetre = page.viewportSize()!;
      expect(b.x + b.width, "en bas à droite").toBeGreaterThan(fenetre.width - 30);
      expect(b.y).toBeGreaterThan(fenetre.height / 2);
    } else {
      await expect(enTete(page).getByRole("link", { name: "Nouvelle setlist" })).toBeVisible();
      await expect(bouton).toContainText("Nouvelle setlist");
      const titre = (await enTete(page).locator("h1").boundingBox())!;
      expect(b.x, "à droite du titre").toBeGreaterThan(titre.x + titre.width);
    }
  });

  test("en 中文 : l'en-tête traduit", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, "/setlists");
    await expect(enTete(page).getByText("每次服事预备的诗歌", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "新建歌单" })).toHaveCount(1);
  });
});

test.describe("Mes services (A11)", () => {
  test("l'en-tête « Mes services » : h1 à la marge, le nom et le nombre à venir, la liste sans titre", async ({ page }) => {
    await ouvrir(page, "/mes-services");
    await expect(page.getByRole("link", { name: /Culte Franco.*4 oct/ })).toBeVisible();
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Mes services", exact: true })).toBeVisible();
    await expect(enTete(page).getByText("Les dates où Ruth K. apparaît dans les plannings · 2 à venir", { exact: true })).toBeVisible();
    await verifierAgencement(page, { contenu: volets(page), onglets: { rail: 1, pilules: 0 } });
    await expect(page.getByRole("heading", { name: "Mes services" })).toHaveCount(1);
    // Aucune action principale ici.
    await expect(page.getByRole("link", { name: /^Nouvel/ })).toHaveCount(0);
    const rail = ongletsRail(page).filter({ visible: true });
    await expect(rail.getByRole("tab", { name: "À venir" })).toHaveAttribute("aria-selected", "true");
    await rail.getByRole("tab", { name: "Passés" }).click();
    await expect(page.getByRole("link", { name: /Culte Franco.*27 sept/ })).toBeVisible();
  });

  test("deux volets : la liste en carte, l'en-tête au-dessus des deux, le service en h2 de 24 px (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette couchée");
    await ouvrir(page, "/mes-services");
    await expect(detail(page).getByRole("heading", { level: 2, name: "Dimanche 4 octobre" })).toBeVisible();
    await verifierDeuxVolets(page);
    // Un lien direct vers un service : l'en-tête reste, au même endroit.
    const avant = (await enTete(page).locator("h1").boundingBox())!;
    await page.getByRole("link", { name: /Culte Franco.*18 oct/ }).click();
    await expect(page).toHaveURL(/\/mes-services\/2026-10-18\/?$/);
    await expect(detail(page).getByRole("heading", { level: 2, name: "Dimanche 18 octobre" })).toBeVisible();
    const apres = (await enTete(page).locator("h1").boundingBox())!;
    expect(Math.abs(apres.x - avant.x) + Math.abs(apres.y - avant.y), "le titre ne bouge pas").toBeLessThanOrEqual(1);
    await verifierAgencement(page, { contenu: volets(page), onglets: { rail: 1, pilules: 0 } });
    await capture(page, "v18-mes-services");
  });

  test("un volet : le service en page, avec « ‹ Mes services » et son titre en h1, sans l'en-tête de la liste", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet : téléphone et tablette portrait");
    await ouvrir(page, "/mes-services/2026-10-18");
    await expect(page.getByRole("heading", { level: 1, name: "Dimanche 18 octobre" })).toBeVisible();
    await expect(enTete(page)).toHaveCount(0);
    const retour = page.getByRole("link", { name: "Mes services", exact: true });
    await expect(retour).toBeVisible();
    await retour.click();
    await expect(page).toHaveURL(/\/mes-services\/?$/);
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Mes services" })).toBeVisible();
  });

  test("en 中文 : l'en-tête traduit", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, "/mes-services");
    await expect(enTete(page).getByText("Ruth K. 出现在排班表中的日期 · 2 个即将到来", { exact: true })).toBeVisible();
  });
});
