import { expect, test, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, ongletsRail, ouvrirAvecBarre, verifierAgencement,
} from "./helpers/agencement";

// Agencement v18 (docs/spec-agencement-v18.md), tranche T7 — App › Évènements (A10 ; planches
// `v18-app-evenements`, `v18-app-evenements-reduite`). L'en-tête de toute la section (agenda et scène) :
// « Évènements », « Les rendez-vous de l'église et les inscriptions », « + Nouvel évènement » (pilule à
// libellé en grand, rond sur téléphone), les onglets en rail sous le titre ; sur l'onglet de la scène, le
// même en-tête sans action principale. En grand, la fiche dans le volet : titre en h2 de 24 px, une
// colonne sous 760 px de volet, deux au-delà ; sans image, elle commence par son titre (plus de cadre
// gris) ; « Gérer dans le Back-Office » en contour à côté du titre. Firestore et date simulés ;
// personnes fictives.

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const EV = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "21:00", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [], images: [] as string[], placesMax: 10, inscriptionOuverte: true,
  sansCompte: true, lienExterne: "", contact: "", organisateurUid: "uid-organisatrice", organisateurNom: "Organisatrice Essai", epingle: false,
  expiresAt: null, inscrits: 4, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const NOEL = { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, passages: [], createdBy: "uid-coordination", updatedAt: "2026-09-14T20:00:00Z" };
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/louange": { ...EV, titre: "Soirée louange", type: "musique", date: "2026-10-09", heure: "20:00", lieu: "Grande salle", placesMax: null },
  "evenements/foot": { ...EV, titre: "Foot au parc", images: [PIXEL] },
  "evenements/repas": { ...EV, titre: "Repas de rentrée", type: "loisir", date: "2026-10-17", heure: "12:30", lieu: "Salle du bas" },
  // Une image, ni description, ni lien, ni seconde image : le bloc du texte est vide.
  "evenements/photo": { ...EV, titre: "Photo de groupe", date: "2026-10-24", description: "", images: [PIXEL] },
  "programmes/noel": NOEL,
};

/** Membre d'un groupe, sans droit de création. */
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", firstName: "Membre", lastName: "Essai", serviceRoles: { "Groupe Paix": ["chanteur"] } };
/** Pôle Événement : la coordination, qui crée des évènements. */
const COORDINATION: FakeProfile = { uid: "uid-coordination", email: "coordination@example.com", firstName: "Coordination", lastName: "Essai", poles: ["evenement"] };

async function ouvrir(page: Page, qui: FakeProfile, to: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, DOCS, to);
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const volet = (page: Page) => page.locator('[data-volet="detail"]');
const nouvel = (page: Page) => page.getByRole("link", { name: "Nouvel évènement" });

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil : prise une fois les
 *  animations d'entrée finies (sinon la page est encore à moitié transparente). */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/t7-${nom}-${test.info().project.name}.png`, animations: "disabled" });
}

test.describe("T7 : l'en-tête de la section Évènements", () => {
  test("l'agencement commun : « Évènements », sous-titre, onglets en rail sous le titre", async ({ page }, info) => {
    await ouvrir(page, MEMBRE, "/evenements");
    const titre = enTete(page).getByRole("heading", { level: 1, name: "Évènements" });
    await expect(titre).toBeVisible();
    await expect(enTete(page)).toContainText("Les rendez-vous de l'église et les inscriptions");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Calendrier", "Noël"]);
    await expect(ongletsRail(page).getByRole("link", { name: "Calendrier" })).toHaveAttribute("aria-current", "page");
    const [h1, rail] = [(await titre.boundingBox())!, (await ongletsRail(page).boundingBox())!];
    expect(rail.y, "le rail sous le titre").toBeGreaterThan(h1.y + h1.height - 1);
    await expect(page.getByRole("link", { name: /Repas de rentrée/ }).first()).toBeVisible();
    await verifierAgencement(page, {
      contenu: estGrandEcran(info) ? page.locator("[data-deux-volets]") : undefined,
      onglets: { rail: 1, pilules: 0 },
    });
    await capture(page, "agenda");
  });

  test("en grand : la liste n'a plus de titre, la fiche se titre en h2 de 24 px", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, MEMBRE, "/evenements");
    await expect(liste(page).getByRole("heading", { name: "Évènements" })).toHaveCount(0);
    const titre = volet(page).getByRole("heading", { level: 2, name: "Soirée louange" });
    await expect(titre).toBeVisible();
    expect(await titre.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBe(24);
    // La liste est une carte en relief, sans marge de plus autour de la fiche (R10).
    const [l, d] = [(await liste(page).boundingBox())!, (await volet(page).boundingBox())!];
    const premier = (await titre.boundingBox())!;
    expect(Math.round(premier.x - d.x), "la fiche ne pose pas de marge à gauche").toBeLessThanOrEqual(1);
    expect(d.x).toBeGreaterThan(l.x + l.width);
  });

  test("responsable : « + Nouvel évènement » à libellé en grand et sur tablette, rond sur téléphone", async ({ page }, info) => {
    await ouvrir(page, COORDINATION, "/evenements");
    const bouton = nouvel(page);
    await expect(bouton).toHaveCount(1);
    await expect(bouton).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
    await expect(enTete(page).getByRole("link", { name: "Nouvel évènement" }), "dans l'en-tête").toHaveCount(1);
    const boite = (await bouton.boundingBox())!;
    if (estTelephone(info)) {
      expect(await bouton.evaluate((el) => getComputedStyle(el).position), "rond fixe").toBe("fixed");
      expect(Math.round(boite.width)).toBe(52);
      expect(Math.round(boite.height)).toBe(52);
      await expect(bouton.getByText("Nouvel évènement"), "libellé pour les lecteurs d'écran seulement").toHaveClass(/sr-only/);
    } else {
      await expect(bouton.getByText("Nouvel évènement")).toBeVisible();
      expect(boite.width, "pilule à libellé").toBeGreaterThan(120);
      const h1 = (await enTete(page).locator("h1").boundingBox())!;
      expect(boite.x, "à droite du titre").toBeGreaterThan(h1.x + 100);
    }
    await capture(page, "nouvel");
  });

  test("membre : pas de « Nouvel évènement »", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
    await expect(nouvel(page)).toHaveCount(0);
  });

  test("onglet de la scène : le même en-tête, sans action principale, le titre ne bouge pas", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements");
    const h1 = enTete(page).getByRole("heading", { level: 1, name: "Évènements" });
    await expect(h1).toBeVisible();
    await expect(nouvel(page)).toHaveCount(1);
    const avant = (await h1.boundingBox())!;
    await ongletsRail(page).getByRole("link", { name: "Noël" }).click();
    await expect(page).toHaveURL(/\/evenements\/scene\/?$/);
    await expect(ongletsRail(page).getByRole("link", { name: "Noël" })).toHaveAttribute("aria-current", "page");
    await expect(enTete(page)).toHaveCount(1);
    await expect(enTete(page)).toContainText("Les rendez-vous de l'église et les inscriptions");
    await expect(nouvel(page), "pas d'action principale sur la scène").toHaveCount(0);
    const apres = (await h1.boundingBox())!;
    expect(Math.round(apres.x)).toBe(Math.round(avant.x));
    expect(Math.round(apres.y)).toBe(Math.round(avant.y));
    await expect(page.getByTestId("barre-section"), "plus de barre d'onglets collante").toHaveCount(0);
    // Le contenu de la scène part du même bord que le titre : plus de borne de 1 080 px centrée (R2, R10).
    await verifierAgencement(page);
    await capture(page, "scene");
  });

  test("sans compte : l'en-tête, l'agenda, un seul onglet donc pas de rail", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await fakeFirestore(page, DOCS);
    await page.goto("/evenements");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
    await expect(ongletsRail(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Soirée louange/ }).first()).toBeVisible();
  });

  test("un volet : la fiche en page n'a que son retour « ‹ Évènements », sans l'en-tête de la section", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet : téléphone et tablette portrait");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(page.getByTestId("fiche-carte").getByRole("heading", { name: "Foot au parc" })).toBeVisible();
    await expect(enTete(page)).toHaveCount(0);
    await expect(page.getByTestId("barre-fiche").getByRole("link", { name: "Évènements" })).toHaveAttribute("href", /^\/evenements\/?$/);
  });
});

test.describe("T7 : la fiche dans le volet", () => {
  test.beforeEach(({}, info) => { test.skip(!estGrandEcran(info), "deux volets : grand écran"); });

  test("barre dépliée : une colonne quand le volet fait moins de 760 px, deux au-delà", async ({ page }, info) => {
    await ouvrir(page, MEMBRE, "/evenements/foot");
    const banniere = page.getByTestId("banniere");
    await expect(banniere.getByRole("img", { name: "Foot au parc" })).toBeVisible();
    const largeur = (await volet(page).boundingBox())!.width;
    if (info.project.name === "ordinateur") expect(largeur, "1 280 px, barre dépliée : volet sous 760 px").toBeLessThan(760);
    const [b, s] = [(await banniere.boundingBox())!, (await page.getByRole("button", { name: "S'inscrire" }).boundingBox())!];
    if (largeur < 760) {
      expect(s.y, "une colonne : l'inscription sous la bannière").toBeGreaterThan(b.y + b.height - 1);
      expect(b.width, "la bannière prend tout le volet").toBeGreaterThan(largeur - 2);
    } else {
      expect(s.x, "deux colonnes : l'inscription à droite de la bannière").toBeGreaterThan(b.x + b.width - 1);
    }
    await capture(page, "fiche-depliee");
  });

  test("barre réduite, 1 440 px : deux colonnes", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "ordinateur-1440, barre réduite");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    const banniere = page.getByTestId("banniere");
    await expect(banniere).toBeVisible();
    expect((await volet(page).boundingBox())!.width).toBeGreaterThanOrEqual(760);
    const [b, s] = [(await banniere.boundingBox())!, (await page.getByRole("button", { name: "S'inscrire" }).boundingBox())!];
    expect(s.x, "l'inscription à droite de la bannière").toBeGreaterThan(b.x + b.width - 1);
    const description = (await page.getByText("Match amical, venez nombreux.").boundingBox())!;
    expect(description.y, "la description sous la bannière").toBeGreaterThan(b.y + b.height - 1);
    await capture(page, "fiche-reduite");
  });

  test("un évènement sans image commence par son titre : pas de cadre gris", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements/repas");
    const titre = volet(page).getByRole("heading", { level: 2, name: "Repas de rentrée" });
    await expect(titre).toBeVisible();
    await expect(volet(page).getByTestId("banniere")).toHaveCount(0);
    const [t, infos] = [(await titre.boundingBox())!, (await page.getByTestId("fiche-carte").boundingBox())!];
    expect(infos.y, "les infos après le titre").toBeGreaterThan(t.y);
  });

  test("sans texte (ni description, ni lien), la carte de gestion reste à un seul écart du bloc au-dessus", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/photo");
    const gestion = volet(page).getByTestId("gestion-carte");
    await expect(gestion).toBeVisible();
    await expect(volet(page).getByTestId("banniere")).toBeVisible();
    const g = (await gestion.boundingBox())!;
    // Le bloc juste au-dessus, dans la même colonne : la bannière (deux colonnes) ou la carte des infos (une).
    let bas = -Infinity;
    for (const bloc of [volet(page).getByTestId("banniere"), volet(page).getByTestId("fiche-carte")]) {
      const r = (await bloc.boundingBox())!;
      if (r.x < g.x + g.width && g.x < r.x + r.width && r.y + r.height <= g.y + 1) bas = Math.max(bas, r.y + r.height);
    }
    expect(Math.round(g.y - bas), "un seul écart de 16 px, pas deux").toBe(16);
  });

  test("« Gérer dans le Back-Office » en contour, à côté du titre", async ({ page }) => {
    await ouvrir(page, COORDINATION, "/evenements/foot");
    const titre = volet(page).getByRole("heading", { level: 2, name: "Foot au parc" });
    const gerer = volet(page).getByRole("link", { name: "Gérer dans le Back-Office" });
    await expect(gerer).toHaveAttribute("href", /^\/back-office\/evenements\/foot\/?$/);
    const [t, g] = [(await titre.boundingBox())!, (await gerer.boundingBox())!];
    expect(g.x, "à droite du titre").toBeGreaterThan(t.x + t.width - 1);
    expect(g.y, "sur la rangée du titre").toBeLessThan(t.y + t.height);
    expect(parseFloat(await gerer.evaluate((el) => getComputedStyle(el).borderTopWidth)), "en contour").toBeGreaterThanOrEqual(1);
  });
});
