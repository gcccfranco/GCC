import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage } from "./helpers/louange";

// PU-2 (docs/spec-entree-musiciens.md « Bloc Mon prochain service ») : en tête de l'onglet Setlists, le prochain service du
// compte relié à une setlist, « Jouer » à l'encre, les chants (rangées au téléphone, vignettes dès la tablette) ; un toucher
// sur un chant ouvre le mode louange sur ce chant. En deux volets, le bloc tient le volet de droite tant qu'aucune setlist
// n'est choisie. Sheet, comptes et setlists simulés, noms inventés ; aucune vraie base.
// Aucun chant français du répertoire n'a de scan 简谱 : les trois chants FR n'ont que la structure, les trois ZH ont un scan.
test.use({ serviceWorkers: "block", deviceScaleFactor: 1 });

const AUJOURDHUI = new Date(2026, 10, 9);
const SERVICE = new Date(2026, 10, 15);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jjmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const SETLIST_ID = "setlist-pupitre";
const NOM = "Ondine Verdier";
const PRESIDENT = "Basile Corbin";
const MUSICIENNE: FakeProfile = {
  uid: "uid-ondine", email: "ondine-verdier@example.com", firstName: "Ondine", lastName: "Verdier", planningName: NOM,
  dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue: ["piano"],
};
const CHANTS: [string, string][] = [
  ["abba-pere", "Abba Père"], ["abrite-moi", "Abrite-moi"], ["a-jamais-tu-es-saint", "À jamais Tu es saint"],
  ["一切都更新", "一切都更新"], ["一同齐声宣扬", "一同齐声宣扬"], ["一生敬拜你", "一生敬拜你"],
];
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const culteDuJour = (date: Date, extra: Record<string, unknown> = {}) => ({
  title: "Culte d'essai du pupitre", leader: PRESIDENT, category: "Culte Francophone", date: iso(date), language: "mixed",
  notes: "", ownerId: "uid-autre", isPrivate: false, items: CHANTS.map(([s], i) => item(s, i + 1)), ...extra,
});

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
/** Le Sheet : le culte Franco du dimanche à venir, la musicienne (`piano`) au piano ; `statut` = en panne. */
async function simulerSheet(page: Page, piano: string) {
  const suivi = { n: 0 };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    suivi.n++;
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    const rows = sheet === "Franco_Louange" ? [["DATE"], [jjmm(SERVICE), PRESIDENT, "", "", piano, "", ""]] : [];
    return route.fulfill({ status: 200, contentType: "text/csv", body: csv(rows) });
  });
  return suivi;
}
async function attendreSheet(page: Page, suivi: { n: number }) {
  await expect.poll(() => suivi.n, { timeout: 20_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1_000);
}

type Options = { piano?: string; setlist?: Record<string, unknown> | null; sombre?: boolean; profil?: FakeProfile; to?: string };
/** Ouvre l'onglet Setlists (ou `to`) ; rend le suivi du Sheet. */
async function ouvrir(page: Page, o: Options = {}) {
  await page.clock.setFixedTime(new Date(`${iso(AUJOURDHUI)}T10:00:00`));
  if (o.sombre) {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ } });
  }
  const suivi = await simulerSheet(page, o.piano ?? NOM);
  const docs: Record<string, Record<string, unknown>> = {};
  if (o.setlist !== null) docs[`setlists/${SETLIST_ID}`] = o.setlist ?? culteDuJour(SERVICE);
  await signInAs(page, o.profil ?? MUSICIENNE, docs, o.to ?? "/setlists");
  await attendreSheet(page, suivi);
  return suivi;
}

const pupitre = (page: Page) => page.locator("[data-pupitre]");
const largeur = (page: Page) => page.viewportSize()!.width;
const estTelephone = (page: Page) => largeur(page) < 768;
/** Deux volets : la liste vit dans son volet. */
const estGrand = async (page: Page) => (await page.locator('[data-volet="liste"]').count()) > 0;

test.describe("Mon prochain service", () => {
  test("le bloc est en tête, sous le titre, au-dessus du rail ; le rôle du planning est dit", async ({ page }) => {
    await ouvrir(page);
    await expect(pupitre(page)).toBeVisible();
    await expect(pupitre(page).getByRole("heading", { level: 2, name: "Mon prochain service" })).toBeVisible();
    await expect(pupitre(page)).toContainText("Tu joues piano d'après le planning");
    await expect(page.getByRole("heading", { level: 1, name: "Setlists" })).toBeVisible();
    if (!(await estGrand(page))) {
      const bloc = (await pupitre(page).boundingBox())!;
      const titre = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
      const rail = (await page.locator('[data-onglets="rail"]').first().boundingBox())!;
      expect(bloc.y, "sous le titre").toBeGreaterThan(titre.y);
      expect(bloc.y + bloc.height, "au-dessus du rail").toBeLessThanOrEqual(rail.y + 1);
    }
  });

  test("téléphone : les six chants et le premier service de la liste tiennent dans le premier écran à 390 × 844", async ({ page }) => {
    test.skip(!estTelephone(page), "propre au téléphone");
    await page.setViewportSize({ width: 390, height: 844 });
    await ouvrir(page);
    await expect(pupitre(page)).toBeVisible();
    const chants = pupitre(page).locator("[data-pupitre-chant]");
    await expect(chants).toHaveCount(6);
    const dernier = (await chants.nth(5).boundingBox())!;
    expect(dernier.y + dernier.height, "le sixième chant est dans l'écran").toBeLessThanOrEqual(844);
    const carte = (await page.getByText("Culte d'essai du pupitre").first().boundingBox())!;
    expect(carte.y + 48, "le premier service de la liste est visible dessous").toBeLessThanOrEqual(844);
  });

  test("tablette et deux volets : les six chants sont dans la première fenêtre", async ({ page }) => {
    test.skip(estTelephone(page), "le téléphone a son propre test");
    await ouvrir(page);
    const chants = pupitre(page).locator("[data-pupitre-chant]");
    await expect(chants).toHaveCount(6);
    const hauteur = page.viewportSize()!.height;
    for (let i = 0; i < 6; i++) {
      const b = (await chants.nth(i).boundingBox())!;
      expect(b.y + Math.min(b.height, 40), `chant ${i + 1} dans la fenêtre`).toBeLessThanOrEqual(hauteur);
    }
  });

  test("« Jouer » ouvre le mode louange sur le chant 1 ; un toucher sur le chant 4 l'ouvre sur ce chant", async ({ page }) => {
    await ouvrir(page);
    const jouer = pupitre(page).locator("[data-pupitre-jouer]");
    await expect(jouer).toHaveAttribute("href", new RegExp(`^/setlists/${SETLIST_ID}/?\\?louange=1$`));
    await jouer.click();
    await attendreMiseEnPage(page);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText(CHANTS[0][1]);

    await page.goto("/setlists");
    await attendreSheet(page, { n: 1 });
    const quatre = pupitre(page).locator("[data-pupitre-chant]").nth(3);
    await expect(quatre).toHaveAttribute("href", new RegExp(`^/setlists/${SETLIST_ID}/?\\?louange=1&chant=4$`));
    await quatre.click();
    await attendreMiseEnPage(page);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText(CHANTS[3][1]);
    // Le saut tient après la mise en page.
    await page.waitForTimeout(800);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText(CHANTS[3][1]);
  });

  for (const chant of ["99", "x", "0"]) {
    test(`?louange=1&chant=${chant} ouvre sur le chant 1`, async ({ page }) => {
      await ouvrir(page, { to: `/setlists/${SETLIST_ID}?louange=1&chant=${chant}` });
      await attendreMiseEnPage(page);
      await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText(CHANTS[0][1]);
      await expect.poll(() => new URL(page.url()).search, "l'adresse a perdu ses paramètres").toBe("");
    });
  }

  test("?chant=2 ouvre sur le chant 2 (le témoin des cas ignorés ci-dessus)", async ({ page }) => {
    await ouvrir(page, { to: `/setlists/${SETLIST_ID}?louange=1&chant=2` });
    await attendreMiseEnPage(page);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText(CHANTS[1][1]);
    await expect.poll(() => new URL(page.url()).search).toBe("");
  });

  // Une proposition (pas d'en-tête) puis une fusion de deux chants (deux en-têtes) avant le chant visé : le rang affiché n
  // reste celui du pupitre (la fusion compte pour un chant, la proposition pour aucun).
  const AVEC_PROPOSITION = culteDuJour(SERVICE, {
    items: [
      { ...item("", 1), type: "proposition", proposition: { id: "prop-essai", titre: "Chant en attente" } },
      { ...item("abba-pere", 2), type: "fusion", fusionSongs: ["abba-pere", "abrite-moi"].map((songSlug) => ({ songSlug, keyOverride: null, structureOverride: null, sectionNotes: {} })) },
      item("a-jamais-tu-es-saint", 3), item("一切都更新", 4), item("一同齐声宣扬", 5),
    ],
  });

  test("une proposition et une fusion avant le chant visé : le pupitre compte 4 chants et chant=3 ouvre sur le bon", async ({ page }) => {
    await ouvrir(page, { setlist: AVEC_PROPOSITION });
    const chants = pupitre(page).locator("[data-pupitre-chant]");
    await expect(chants).toHaveCount(4);
    await expect(chants.first()).toContainText("Abba Père / Abrite-moi");
    const trois = chants.nth(2);
    await expect(trois).toHaveAttribute("href", new RegExp(`chant=3$`));
    await expect(trois).toContainText("一切都更新");
    await trois.click();
    await attendreMiseEnPage(page);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText("一切都更新");
    await page.waitForTimeout(800);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText("一切都更新");
  });

  test("chant=5 sur cette setlist (4 chants) est ignoré : le premier chant s'ouvre", async ({ page }) => {
    await ouvrir(page, { setlist: AVEC_PROPOSITION, to: `/setlists/${SETLIST_ID}?louange=1&chant=5` });
    await attendreMiseEnPage(page);
    await expect(page.locator("[data-performance-mode] [data-barre-haut]")).toContainText("Abba Père");
  });

  test("compte sans service : aucun bloc", async ({ page }) => {
    await ouvrir(page, { piano: "Personne Dautre" });
    await expect(page.getByRole("heading", { level: 1, name: "Setlists" })).toBeVisible();
    await expect(pupitre(page)).toHaveCount(0);
  });

  test("service sans setlist reliée : aucun bloc", async ({ page }) => {
    await ouvrir(page, { setlist: culteDuJour(new Date(2026, 10, 22)) });
    await expect(page.getByRole("heading", { level: 1, name: "Setlists" })).toBeVisible();
    await expect(pupitre(page)).toHaveCount(0);
  });

  test("le « + » reste visible pour qui peut créer", async ({ page }) => {
    await ouvrir(page);
    await expect(pupitre(page)).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouvelle setlist" })).toBeVisible();
  });

  test("rangées sans vignette au téléphone, vignettes dès la tablette", async ({ page }) => {
    await ouvrir(page);
    await expect(pupitre(page).locator("[data-pupitre-chant]")).toHaveCount(6);
    if (estTelephone(page)) {
      await expect(pupitre(page).locator("[data-vignette]")).toHaveCount(0);
    } else {
      await expect(pupitre(page).locator("[data-vignette]")).toHaveCount(6);
      await expect(pupitre(page).locator("[data-vignette-scan]").first()).toBeVisible();
      await expect(pupitre(page).locator("[data-vignette-scan]")).toHaveCount(3);
      await expect(pupitre(page).locator("[data-vignette-structure]")).toHaveCount(3);
    }
  });

  test("deux volets : le bloc tient le volet de droite sans setlist choisie, l'aperçu après un choix, le retour par la rangée", async ({ page }) => {
    await ouvrir(page);
    test.skip(!(await estGrand(page)), "propre aux deux volets");
    const detail = page.locator('[data-volet="detail"]');
    await expect(detail.locator("[data-pupitre]")).toBeVisible();
    await expect(page.locator("[data-pupitre-retour]")).toHaveAttribute("aria-pressed", "true");
    await page.locator('[data-volet="liste"]').getByText("Culte d'essai du pupitre").first().click();
    await expect(detail.locator("[data-pupitre]")).toHaveCount(0);
    await expect(detail.locator(".apercu-setlist")).toBeVisible();
    await expect(page.locator("[data-pupitre-retour]")).toHaveAttribute("aria-pressed", "false");
    await page.locator("[data-pupitre-retour]").click();
    await expect(detail.locator("[data-pupitre]")).toBeVisible();
    expect(page.url()).not.toContain("apercu=");
  });

  test("« Jouer » est à l'encre : fond = couleur du texte de la page", async ({ page }) => {
    await ouvrir(page);
    const [fond, encre] = await pupitre(page).locator("[data-pupitre-jouer]").evaluate((el) => [
      getComputedStyle(el).backgroundColor, getComputedStyle(document.body).color,
    ]);
    expect(fond).toBe(encre);
  });

  test("en sombre, le scan 简谱 d'une vignette est inversé (tablette et deux volets)", async ({ page }) => {
    test.skip(estTelephone(page), "pas de vignette au téléphone");
    await ouvrir(page, { sombre: true });
    await expect(page.locator("html")).toHaveClass(/dark/);
    const image = pupitre(page).locator("[data-vignette-scan] img").first();
    await expect(image).toBeVisible();
    expect(await image.evaluate((el) => getComputedStyle(el).filter)).toContain("invert");
  });
});
