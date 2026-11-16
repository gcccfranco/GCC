import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierSansDebordement } from "./helpers/agencement";

// Chantier AR (docs/spec-salles.md), lot 2, tranche T2c : la vue Grille (SA3 : neuf colonnes, 8:00 à 22:00, un bloc
// par occupation à sa hauteur ; au téléphone, défilement horizontal, colonne des heures figée), le sélecteur
// « Liste · Grille », la vue par défaut selon l'appareil et le choix retenu (SA5, `gcc-salles-vue`), le détail d'un
// bloc (SA4 : celui d'un créneau de scène mène à la fête). Firestore, planning et date simulés ; personnes fictives.

const MAINTENANT = "2026-11-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "programmes/noel": { nom: "Noël", jourJ: "2026-12-20", debut: "2026-10-04", visible: true, passages: [], createdBy: "uid-oriane", updatedAt: MAINTENANT },
  // Dimanche 15 novembre, 17:30–18:30 : un créneau de scène.
  "programmes/noel/creneaux/c15": {
    dimanche: "2026-11-15", debut: "17:30", fin: "18:30", quoi: "Chorale", qui: ["Jeunes"], note: "",
    auteurUid: "uid-oriane", auteurNom: "Oriane", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};

const MEMBRE: FakeProfile = { uid: "uid-leandre", email: "leandre@example.com", firstName: "Léandre", lastName: "Mazurier", serviceRoles: { "Groupe Bonté": ["chanteur"] } };

/** Dimanche 15 novembre 2026 (dimanche ordinaire : planning vide), à 14:00 de Paris. */
const DIMANCHE_14H = "2026-11-15T14:00:00+01:00";

async function ouvrir(page: Page, { vue, zh = false }: { vue?: "liste" | "grille"; zh?: boolean } = {}) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(DIMANCHE_14H));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(({ v, z }) => {
    try {
      if (z) localStorage.setItem("i18nextLng", "zh-CN");
      // Une seule fois : le choix fait ensuite dans la page doit survivre au rechargement.
      if (v && !sessionStorage.getItem("vue-posee")) { localStorage.setItem("gcc-salles-vue", v); sessionStorage.setItem("vue-posee", "1"); }
    } catch {}
  }, { v: vue, z: zh });
  await signInAs(page, MEMBRE, DOCS, "/evenements/salles");
}

const selecteur = (page: Page) => page.getByRole("tablist", { name: /^(Vue|视图)$/ });
const grille = (page: Page) => page.locator("[data-grille-salles]");
const liste = (page: Page) => page.getByRole("list", { name: /^(Salles|场地)$/ });
const colonne = (page: Page, id: string) => grille(page).locator(`[data-colonne="${id}"]`);
const bloc = (page: Page, id: string, debut: string) => colonne(page, id).locator(`[data-bloc][data-debut="${debut}"]`);

/** Position d'un bloc dans le corps de sa colonne (8:00 → 0, 22:00 → 1). */
async function position(page: Page, id: string, debut: string) {
  const corps = await colonne(page, id).locator("[data-corps]").boundingBox();
  const b = await bloc(page, id, debut).boundingBox();
  if (!corps || !b) throw new Error("bloc introuvable");
  return { haut: (b.y - corps.y) / corps.height, bas: (b.y + b.height - corps.y) / corps.height };
}

test.describe("AR, T2c : Salles en Grille", () => {
  test("vue par défaut : Liste au téléphone et en tablette portrait, Grille en tablette paysage et à l'ordinateur", async ({ page }, info) => {
    await ouvrir(page);
    await expect(selecteur(page).getByRole("tab")).toHaveText(["Liste", "Grille"]);
    if (estGrandEcran(info)) {
      await expect(selecteur(page).getByRole("tab", { name: "Grille" })).toHaveAttribute("aria-selected", "true");
      await expect(grille(page)).toBeVisible();
      await expect(liste(page)).toHaveCount(0);
    } else {
      await expect(selecteur(page).getByRole("tab", { name: "Liste" })).toHaveAttribute("aria-selected", "true");
      await expect(liste(page)).toBeVisible();
      await expect(grille(page)).toHaveCount(0);
    }
  });

  test("neuf colonnes dans l'ordre ; heures de 8:00 à 22:00 ; les blocs à leur heure", async ({ page }) => {
    await ouvrir(page, { vue: "grille" });
    await expect(grille(page).locator("[data-colonne]")).toHaveCount(9);
    const ordre = await grille(page).locator("[data-colonne]").evaluateAll((els) => els.map((e) => e.getAttribute("data-colonne")));
    expect(ordre).toEqual(["grande", "scene", "fidelite", "paix", "amour", "bonte", "zhongban", "imprimante", "reunion"]);
    await expect(colonne(page, "fidelite").locator("[data-entete]")).toContainText("小班");
    await expect(grille(page).locator("[data-heure]").first()).toHaveText("08:00");
    await expect(grille(page).locator("[data-heure]").last()).toHaveText("22:00");
    // Groupe Joie dans la Grande salle, 13:00–14:30 : de 5/14 à 6,5/14 de la hauteur.
    await expect(bloc(page, "grande", "13:00")).toContainText("Groupe Joie");
    const joie = await position(page, "grande", "13:00");
    expect(joie.haut).toBeCloseTo(5 / 14, 2);
    expect(joie.bas).toBeCloseTo(6.5 / 14, 2);
    // Salle 中班 : 15:30–17:00 seulement.
    await expect(colonne(page, "zhongban").locator("[data-bloc]")).toHaveCount(1);
    const zhongban = await position(page, "zhongban", "15:30");
    expect(zhongban.haut).toBeCloseTo(7.5 / 14, 2);
    // Salle de réunion : vide.
    await expect(colonne(page, "reunion").locator("[data-bloc]")).toHaveCount(0);
    // Couleur AR17 : le culte sinophone en gris de repli.
    await expect(bloc(page, "grande", "15:00")).toHaveAttribute("data-couleur", "#64748b");
    // Le créneau de scène : dans la colonne Scène.
    await expect(bloc(page, "scene", "17:30")).toContainText("Chorale");
  });

  test("le choix « Liste · Grille » survit au rechargement", async ({ page }, info) => {
    await ouvrir(page);
    const autre = estGrandEcran(info) ? "Liste" : "Grille";
    await selecteur(page).getByRole("tab", { name: autre }).click();
    await expect(selecteur(page).getByRole("tab", { name: autre })).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => localStorage.getItem("gcc-salles-vue"))).toBe(autre === "Liste" ? "liste" : "grille");
    await page.reload();
    await expect(selecteur(page).getByRole("tab", { name: autre })).toHaveAttribute("aria-selected", "true");
    await expect(autre === "Grille" ? grille(page) : liste(page)).toBeVisible();
  });

  test("la bande de jours et le repère d'heure servent aussi à la Grille", async ({ page }) => {
    await ouvrir(page, { vue: "grille" });
    await expect(grille(page).locator("[data-repere]")).toBeVisible();
    await page.getByRole("button", { name: /mardi 17 novembre/i }).click();
    await expect(grille(page).locator("[data-bloc]")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Heure" })).toHaveValue("08:00");
  });

  test("toucher un bloc ouvre son détail ; celui d'un créneau de scène mène à la fête", async ({ page }) => {
    await ouvrir(page, { vue: "grille" });
    await bloc(page, "fidelite", "13:00").scrollIntoViewIfNeeded();
    await bloc(page, "fidelite", "13:00").click();
    const detail = page.getByRole("dialog");
    await expect(detail.getByRole("heading")).toHaveText("Groupe Fidélité");
    await expect(detail).toContainText("Salle Fidélité");
    await expect(detail).toContainText("13:00 – 14:30");
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await bloc(page, "scene", "17:30").scrollIntoViewIfNeeded();
    await bloc(page, "scene", "17:30").click();
    await expect(detail.getByRole("heading")).toHaveText("Chorale · Jeunes");
    await expect(detail).toContainText("Oriane");
    await detail.getByRole("link", { name: /Noël/ }).click();
    await expect(page).toHaveURL(/\/evenements\/scene\/noel\/?$/);
  });

  test("téléphone : la grille défile à l'horizontale, la colonne des heures reste figée", async ({ page }, info) => {
    test.skip(!estTelephone(info), "propre au téléphone");
    await ouvrir(page, { vue: "grille" });
    const defile = grille(page).locator("[data-defile]");
    const largeurs = await defile.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(largeurs.scroll).toBeGreaterThan(largeurs.client);
    const heures = grille(page).locator("[data-heures]");
    const avant = await heures.boundingBox();
    await defile.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
    await expect(colonne(page, "reunion").locator("[data-entete]")).toBeInViewport();
    const apres = await heures.boundingBox();
    expect(apres!.x).toBeCloseTo(avant!.x, 0);
    await verifierSansDebordement(page);
  });

  test("grand écran : la grille tient sans défiler à l'horizontale", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre au grand écran");
    await ouvrir(page, { vue: "grille" });
    const defile = grille(page).locator("[data-defile]");
    const largeurs = await defile.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }));
    expect(largeurs.scroll).toBeLessThanOrEqual(largeurs.client + 1);
    await verifierSansDebordement(page);
  });

  test("中文 : 列表 · 网格", async ({ page }) => {
    await ouvrir(page, { vue: "grille", zh: true });
    await expect(selecteur(page).getByRole("tab")).toHaveText(["列表", "网格"]);
    await expect(bloc(page, "grande", "13:00")).toContainText("喜乐团契");
  });
});
