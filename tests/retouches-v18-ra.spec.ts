import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, interdireDialoguesNatifs, ouvrirAvecBarre } from "./helpers/agencement";

// Retouches après le chantier v18 (docs/spec-retouches-v18.md), lot R, voie A.
// R1 (D1) : « Partager » sur la fiche d'un évènement de l'App — la feuille de partage du système au
// doigt (téléphone, tablette), sinon le lien copié et « Lien copié » (ordinateur).
// R2 (D2) : Date · Heure · Lieu en trois colonnes en grand (ordinateur, iPad couché) quand la carte des
// infos a la place, l'une sous l'autre sur téléphone et dans la colonne étroite de la fiche en deux
// colonnes (planche `v18-app-evenements-reduite`). Firestore, date, presse-papiers et partage simulés ;
// personnes fictives.

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const EV = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "21:00", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [], images: [PIXEL], placesMax: 10, inscriptionOuverte: true,
  sansCompte: true, lienExterne: "", contact: "", organisateurUid: "uid-organisatrice", organisateurNom: "Organisatrice Essai", epingle: false,
  expiresAt: null, inscrits: 4, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/foot": { ...EV, titre: "Foot au parc" },
};

/** Membre d'un groupe, sans droit de création. */
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", firstName: "Membre", lastName: "Essai", serviceRoles: { "Groupe Paix": ["chanteur"] } };
/** Pôle Événement : la coordination, qui gère les évènements. */
const COORDINATION: FakeProfile = { uid: "uid-coordination", email: "coordination@example.com", firstName: "Coordination", lastName: "Essai", poles: ["evenement"] };

/** Le partage et le presse-papiers simulés : chaque appel est noté dans `window.__partage`. */
async function simulerPartage(page: Page, avecShare: boolean) {
  await page.addInitScript((avec) => {
    const w = window as unknown as { __partage: { share: unknown[]; copie: string[] } };
    w.__partage = { share: [], copie: [] };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (texte: string) => { w.__partage.copie.push(texte); } },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: avec ? async (donnees: unknown) => { w.__partage.share.push(donnees); } : undefined,
    });
  }, avecShare);
}
const partage = (page: Page) => page.evaluate(() => (window as unknown as { __partage: { share: { url?: string; title?: string }[]; copie: string[] } }).__partage);

async function ouvrir(page: Page, qui: FakeProfile, to: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, DOCS, to);
}

const volet = (page: Page) => page.locator('[data-volet="detail"]');
const partager = (page: Page) => page.getByRole("button", { name: "Partager" });

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/ra-${nom}-${test.info().project.name}.png`, animations: "disabled" });
}

test.describe("R1 : « Partager » sur la fiche d'un évènement", () => {
  test("membre : « Partager » à droite du titre en grand, dans la barre de la fiche sinon", async ({ page }, info) => {
    await simulerPartage(page, false);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    const bouton = partager(page);
    await expect(bouton).toHaveCount(1);
    await expect(bouton).toBeVisible();
    const b = (await bouton.boundingBox())!;
    expect(b.height, "40 px au moins, au doigt comme à la souris").toBeGreaterThanOrEqual(36);
    if (estGrandEcran(info)) {
      const titre = volet(page).getByRole("heading", { level: 2, name: "Foot au parc" });
      const t = (await titre.boundingBox())!;
      expect(b.x, "à droite du titre").toBeGreaterThan(t.x + t.width - 1);
      expect(b.y, "sur la rangée du titre").toBeLessThan(t.y + t.height);
      await expect(bouton.getByText("Partager"), "libellé visible en grand").toBeVisible();
    } else {
      await expect(page.getByTestId("barre-fiche").getByRole("button", { name: "Partager" })).toHaveCount(1);
      const retour = (await page.getByTestId("barre-fiche").getByRole("link", { name: "Évènements" }).boundingBox())!;
      expect(b.x, "à droite du retour").toBeGreaterThan(retour.x + retour.width);
    }
    await capture(page, "partager");
  });

  test("à la souris (ordinateur) : le lien est copié et « Lien copié » s'affiche", async ({ page }, info) => {
    test.skip(!!info.project.use.hasTouch, "au doigt : la feuille de partage");
    // `navigator.share` existe (Safari, Chrome sur Mac) : à la souris, on copie quand même (D1).
    await simulerPartage(page, true);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    await expect(page.getByRole("status").filter({ hasText: "Lien copié" })).toBeVisible();
    const p = await partage(page);
    expect(p.share, "pas de feuille de partage à la souris").toHaveLength(0);
    expect(p.copie).toHaveLength(1);
    expect(p.copie[0]).toMatch(/^https?:\/\/[^/]+\/evenements\/foot$/);
  });

  test("au doigt (téléphone, tablette) : la feuille de partage du système, avec le titre et le lien", async ({ page }, info) => {
    test.skip(!info.project.use.hasTouch, "à la souris : le lien copié");
    await simulerPartage(page, true);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    await expect.poll(async () => (await partage(page)).share.length).toBe(1);
    const p = await partage(page);
    expect(p.share[0].title).toBe("Foot au parc");
    expect(p.share[0].url).toMatch(/^https?:\/\/[^/]+\/evenements\/foot$/);
    expect(p.copie, "rien de copié quand la feuille s'ouvre").toHaveLength(0);
  });

  test("au doigt sans feuille de partage : le lien est copié, « Lien copié »", async ({ page }, info) => {
    test.skip(!info.project.use.hasTouch, "au doigt seulement");
    await simulerPartage(page, false);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    await expect(page.getByRole("status").filter({ hasText: "Lien copié" })).toBeVisible();
    expect((await partage(page)).copie[0]).toMatch(/\/evenements\/foot$/);
  });

  test("coordination : « Partager » à côté de « Gérer dans le Back-Office », sans débordement", async ({ page }) => {
    await simulerPartage(page, false);
    await ouvrir(page, COORDINATION, "/evenements/foot");
    await expect(partager(page)).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toBeVisible();
    const [p, g] = [(await partager(page).boundingBox())!, (await page.getByRole("link", { name: "Gérer dans le Back-Office" }).boundingBox())!];
    expect(Math.abs((p.y + p.height / 2) - (g.y + g.height / 2)), "sur la même rangée").toBeLessThan(8);
    const largeur = await page.evaluate(() => document.documentElement.clientWidth);
    expect(p.x + p.width, "dans la fenêtre").toBeLessThanOrEqual(largeur);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "pas de défilement de côté").toBe(true);
    await capture(page, "partager-coordination");
  });

  test("中文 : 分享, puis 链接已复制", async ({ page }, info) => {
    test.skip(!!info.project.use.hasTouch, "à la souris : le lien copié");
    await simulerPartage(page, false);
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* navigation privée */ } });
    await ouvrir(page, MEMBRE, "/evenements/foot");
    const bouton = page.getByRole("button", { name: "分享" });
    await expect(bouton).toBeVisible();
    await bouton.click();
    await expect(page.getByRole("status").filter({ hasText: "链接已复制" })).toBeVisible();
  });
});

test.describe("R2 : Date · Heure · Lieu", () => {
  const ligne = (page: Page, libelle: string) => page.getByTestId("fiche-carte").locator("li").filter({ hasText: libelle });

  async function boites(page: Page) {
    const [d, h, l] = await Promise.all(["Samedi 10 octobre", "19:00 – 21:00", "Parc de Bercy"].map(async (v) => (await ligne(page, v).boundingBox())!));
    return { d, h, l };
  }

  test("en grand, la fiche sur une colonne : trois colonnes titrées Date · Heure · Lieu", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(ligne(page, "Parc de Bercy")).toBeVisible();
    const largeur = (await volet(page).boundingBox())!.width;
    test.skip(largeur >= 760, "volet de 760 px et plus : la fiche est sur deux colonnes (test suivant)");
    const carte = page.getByTestId("fiche-carte");
    for (const [libelle, valeur] of [["Date", "Samedi 10 octobre"], ["Heure", "19:00 – 21:00"], ["Lieu", "Parc de Bercy"]]) {
      await expect(ligne(page, valeur).getByText(libelle, { exact: true }), `libellé « ${libelle} »`).toBeVisible();
    }
    const { d, h, l } = await boites(page);
    expect(Math.round(h.y), "Heure sur la rangée de Date").toBe(Math.round(d.y));
    expect(Math.round(l.y), "Lieu sur la rangée de Date").toBe(Math.round(d.y));
    expect(h.x, "Heure à droite de Date").toBeGreaterThanOrEqual(d.x + d.width - 1);
    expect(l.x, "Lieu à droite d'Heure").toBeGreaterThanOrEqual(h.x + h.width - 1);
    const c = (await carte.boundingBox())!;
    expect(l.x + l.width, "dans la carte").toBeLessThanOrEqual(c.x + c.width);
    await capture(page, "infos-colonnes");
  });

  test("barre réduite, 1 440 px : la fiche sur deux colonnes, les infos l'une sous l'autre dans la colonne étroite", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "ordinateur-1440, barre réduite");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(ligne(page, "Parc de Bercy")).toBeVisible();
    expect((await volet(page).boundingBox())!.width).toBeGreaterThanOrEqual(760);
    await expect(ligne(page, "Samedi 10 octobre").getByText("Date", { exact: true })).toBeVisible();
    const { d, h, l } = await boites(page);
    expect(h.y, "Heure sous Date").toBeGreaterThanOrEqual(d.y + d.height - 1);
    expect(l.y, "Lieu sous Heure").toBeGreaterThanOrEqual(h.y + h.height - 1);
    await capture(page, "infos-reduite");
  });

  test("téléphone et tablette debout : l'une sous l'autre", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(ligne(page, "Parc de Bercy")).toBeVisible();
    const { d, h, l } = await boites(page);
    expect(h.y, "Heure sous Date").toBeGreaterThanOrEqual(d.y + d.height - 1);
    expect(l.y, "Lieu sous Heure").toBeGreaterThanOrEqual(h.y + h.height - 1);
    await capture(page, "infos-page");
  });
});
