import { expect, test, type Download, type Page, type Route } from "@playwright/test";
import { fsDoc, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, ongletsRail, repondreDansLeSite, verifierAgencement,
} from "./helpers/agencement";

// Agencement v18 (docs/spec-agencement-v18.md), tranche T2b — Back-Office › Évènements (B3, piste A)
// et Back-Office › Réunions (B4) en deux volets : l'en-tête de l'entrée au-dessus, la liste dans le
// layout (carte à gauche), à droite la fiche de gestion ou la fiche de la réunion — en grand, la
// prochaine d'office ; « Nouvel évènement », « Nouvelle réunion » et « Modifier » dans le volet ; en un
// volet (téléphone, tablette debout), la liste puis la fiche en page avec « ‹ Évènements ».
// Personnes fictives.

/** Pôle Événement : la coordination (gère tous les évènements, a la scène). */
const COORD: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
/** Pôle DA, sans droit d'annonces : n'a que Réunions. */
const DA: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };

const EV = {
  titre: "", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "14:00", heureFin: "16:00", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: 10, inscriptions: "auto", inscriptionOuverte: true,
  sansCompte: false, contact: "Alice Q.", organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const REU = { ...EV, type: "eglise", pour: "pole:da", placesMax: null, inscriptions: "fermees", inscriptionOuverte: false, lieu: "Salle 2", heure: "20:00", heureFin: "", contact: "", organisateurUid: "uid-bruno", organisateurNom: "Bruno M." };
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/foot": { ...EV, titre: "Foot au parc", date: "2026-10-10", lieu: "Parc de Bercy", inscrits: 3 },
  "evenements/foot/inscriptions/uid-noe": { uid: "uid-noe", nom: "Noé T.", invites: 1, createdAt: "2026-10-02T10:00:00Z" },
  "evenements/foot/inscriptions/x1": { uid: null, nom: "Paul D.", invites: 0, createdAt: "2026-10-03T10:00:00Z" },
  "evenements/fete": { ...EV, titre: "Fête de rentrée", date: "2026-10-17" },
  "evenements/vieux": { ...EV, titre: "Pique-nique de juin", date: "2026-06-14" },
  "evenements/reu-da": { ...REU, titre: "Réunion DA", date: "2026-10-10" },
  "evenements/reu-da-nov": { ...REU, titre: "Réunion DA de novembre", date: "2026-11-07" },
  "evenements/reu-da-sept": { ...REU, titre: "Réunion DA de septembre", date: "2026-09-05" },
};

/** Ouvre `to` le lundi 5 octobre 2026, après une connexion sur `/moi`. */
async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, qui, docs, "/moi");
  await page.goto(to);
  return db;
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const volet = (page: Page) => page.locator('[data-volet="detail"]');
const titreFiche = (page: Page, nom: string) => volet(page).getByRole("heading", { level: 2, name: nom, exact: true });
/** Le bloc de contenu sous l'en-tête (`verifierAgencement`, pleine zone) : les deux volets, ou la liste
 *  seule, ou la fiche en page. */
const contenu = (page: Page) => page.locator('[data-volet="liste"], [data-volet="detail"]').first().locator("..");

// ─── Évènements (B3) ─────────────────────────────────────────────────────────────

test.describe("T2b : Back-Office › Évènements", () => {
  test("l'agencement commun : en-tête « Évènements », sous-titre, rail des sous-parties", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
    await expect(enTete(page)).toContainText("Ce que voit l'assemblée, et sa gestion");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Scène"]);
    await expect(liste(page).getByRole("link", { name: /Foot au parc/ })).toBeVisible();
    await verifierAgencement(page, { contenu: contenu(page), onglets: { rail: 1, pilules: 0 } });
  });

  test("en grand : la liste et le prochain évènement en fiche de gestion", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(liste(page)).toBeVisible();
    await expect(titreFiche(page, "Foot au parc")).toBeVisible();
    // La ligne de l'évènement ouvert est marquée dans la liste.
    await expect(liste(page).getByRole("link", { name: /Foot au parc/ })).toHaveAttribute("aria-current", "page");
    const fiche = volet(page);
    await expect(fiche.getByRole("link", { name: "Voir comme un membre" })).toHaveAttribute("href", /^\/evenements\/foot\/?$/);
    await expect(fiche.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", /^\/back-office\/evenements\/foot\/modifier\/?$/);
    // Bandeau d'infos, Inscrits (jauge et liste), Période d'inscription, Tâches.
    await expect(fiche.getByTestId("infos-gestion")).toContainText("Parc de Bercy");
    await expect(fiche.getByTestId("infos-gestion")).toContainText("Alice Q.");
    const inscrits = fiche.getByRole("region", { name: "Inscrits" });
    await expect(inscrits).toContainText("3");
    await expect(inscrits).toContainText("sur 10 places");
    await expect(inscrits.getByRole("listitem")).toHaveCount(2);
    await expect(fiche.getByRole("region", { name: "Période d'inscription" })).toBeVisible();
    await expect(fiche.getByTestId("taches-carte")).toBeVisible();
  });

  test("« Voir comme un membre » mène à la fiche de l'App", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, COORD, "/back-office/evenements");
    await volet(page).getByRole("link", { name: "Voir comme un membre" }).click();
    await expect(page).toHaveURL(/\/evenements\/foot\/?$/);
  });

  test("toucher une ligne change l'adresse et la fiche ; la liste reste", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, COORD, "/back-office/evenements");
    await liste(page).getByRole("link", { name: /Fête de rentrée/ }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/fete\/?$/);
    await expect(titreFiche(page, "Fête de rentrée")).toBeVisible();
    await expect(liste(page)).toBeVisible();
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
  });

  test("« Nouvel évènement » : une seule action, dans l'en-tête ; plus de bouton calé à gauche dans la liste", async ({ page }, info) => {
    await ouvrir(page, COORD, "/back-office/evenements");
    const bouton = page.getByRole("link", { name: "Nouvel évènement" });
    await expect(bouton).toHaveCount(1);
    await expect(enTete(page).getByRole("link", { name: "Nouvel évènement" })).toHaveCount(1);
    if (estTelephone(info)) {
      // Téléphone : le rond « + » en bas à droite, sans libellé visible.
      const boite = (await bouton.boundingBox())!;
      const vue = page.viewportSize()!;
      expect(boite.width).toBeLessThan(60);
      expect(boite.x + boite.width).toBeGreaterThan(vue.width - 30);
      expect(boite.y).toBeGreaterThan(vue.height / 2);
    }
  });

  test("en grand : « Nouvel évènement » s'ouvre dans le volet, la liste reste", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, COORD, "/back-office/evenements");
    await enTete(page).getByRole("link", { name: "Nouvel évènement" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/nouveau\/?$/);
    await expect(volet(page).getByLabel("Nom de l'évènement")).toBeVisible();
    await expect(liste(page)).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
  });

  test("créer un évènement l'ajoute à la liste et ouvre sa fiche", async ({ page }, info) => {
    await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
    await ouvrir(page, COORD, "/back-office/evenements/nouveau");
    await page.getByLabel("Nom de l'évènement").fill("Soirée jeux");
    // Jusqu'au 31/12/2026, ceux de toute l'église s'écrivent dans le Sheet (U9) : une date de 2027.
    await page.getByLabel("Date", { exact: true }).fill("2027-01-16");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    if (estGrandEcran(info)) {
      await expect(titreFiche(page, "Soirée jeux")).toBeVisible();
      await expect(liste(page).getByRole("link", { name: /Soirée jeux/ })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { level: 1, name: "Soirée jeux" })).toBeVisible();
    }
  });

  test("en grand : « Modifier » s'ouvre dans le volet ; enregistrer revient à la fiche", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    const db = await ouvrir(page, COORD, "/back-office/evenements/foot");
    await volet(page).getByRole("link", { name: "Modifier" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/foot\/modifier\/?$/);
    await expect(liste(page)).toBeVisible();
    await volet(page).getByLabel("Nom de l'évènement").fill("Foot au parc de Bercy");
    await volet(page).getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/foot\/?$/);
    await expect(titreFiche(page, "Foot au parc de Bercy")).toBeVisible();
    expect(db.doc("evenements/foot")).toMatchObject({ titre: "Foot au parc de Bercy" });
  });

  test("« ⋯ » : Dupliquer mène au formulaire pré-rempli, Supprimer confirme dans le site puis retire", async ({ page }) => {
    const db = await ouvrir(page, COORD, "/back-office/evenements/fete");
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Dupliquer" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/nouveau\/?\?from=fete$/);
    await expect(page.getByLabel("Nom de l'évènement")).toHaveValue("Fête de rentrée");

    await page.goto("/back-office/evenements/fete");
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Annuler");
    expect(db.doc("evenements/fete")).toBeTruthy();
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(page).toHaveURL(/\/back-office\/evenements\/?$/);
    await expect.poll(() => db.doc("evenements/fete")).toBeUndefined();
    await expect(page.getByRole("link", { name: /Fête de rentrée/ })).toHaveCount(0);
  });

  test("« Exporter » télécharge la liste des inscrits", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements/foot");
    const inscrits = page.getByRole("region", { name: "Inscrits" });
    await expect(inscrits.getByRole("listitem")).toHaveCount(2);
    const [fichier] = await Promise.all([page.waitForEvent("download"), inscrits.getByRole("button", { name: "Exporter" }).click()]);
    expect(fichier.suggestedFilename()).toMatch(/\.csv$/);
    const texte = await (await fichier.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8"));
    expect(texte).toContain("Noé T.");
    expect(texte).toContain("Paul D.");
  });

  test("les passés derrière « Évènements passés (n) »", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(page.getByRole("link", { name: /Pique-nique de juin/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Évènements passés \(1\)/ }).click();
    await expect(page.getByRole("link", { name: /Pique-nique de juin/ })).toBeVisible();
  });

  test("l'onglet Scène : pas la liste des évènements, et le h1 « Évènements » garde son x et son y", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements");
    const h1 = enTete(page).getByRole("heading", { level: 1, name: "Évènements" });
    await expect(h1).toBeVisible();
    await expect(page.getByRole("link", { name: /Foot au parc/ }).first()).toBeVisible();
    const avant = (await h1.boundingBox())!;
    await ongletsRail(page).getByRole("link", { name: "Scène" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/scene\/?$/);
    await expect(ongletsRail(page).getByRole("link", { name: "Scène" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: /Foot au parc/ })).toHaveCount(0);
    await expect(liste(page)).toHaveCount(0);
    // Sur la scène, pas d'action principale (planche R17).
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveCount(0);
    const apres = (await h1.boundingBox())!;
    expect(Math.round(apres.x)).toBe(Math.round(avant.x));
    expect(Math.round(apres.y)).toBe(Math.round(avant.y));
    await verifierAgencement(page, { contenu: enTete(page).locator("xpath=following-sibling::*[1]"), onglets: { rail: 1, pilules: 0 } });
  });

  test("un volet : la fiche en page, avec « ‹ Évènements » pour seul retour", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet : téléphone et tablette en portrait");
    await ouvrir(page, COORD, "/back-office/evenements");
    await page.getByRole("link", { name: /Foot au parc/ }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/foot\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Foot au parc" })).toBeVisible();
    const retour = enTete(page).getByRole("link", { name: "Évènements" });
    await expect(retour).toHaveAttribute("href", /^\/back-office\/evenements\/?$/);
    await expect(page.getByText("←")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Voir comme un membre" })).toBeVisible();
    await verifierAgencement(page, { contenu: contenu(page), onglets: { rail: 0, pilules: 0 } });
  });

  test("en 中文 : le sous-titre de l'en-tête", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(enTete(page)).toContainText("会众看到的活动，以及它们的管理");
  });
});

// ─── Réunions (B4) ───────────────────────────────────────────────────────────────

test.describe("T2b : Back-Office › Réunions", () => {
  test("l'agencement commun : en-tête « Réunions », sous-titre, sans rail", async ({ page }) => {
    await ouvrir(page, DA, "/back-office/reunions");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
    await expect(enTete(page)).toContainText("Les réunions de tes pôles et de tes équipes");
    await expect(ongletsRail(page)).toHaveCount(0);
    await expect(enTete(page).getByRole("link", { name: "Nouvelle réunion" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?$/);
    await verifierAgencement(page, { contenu: contenu(page), onglets: { rail: 0, pilules: 0 } });
  });

  test("la liste : « À venir » puis « Passées », sans évènement", async ({ page }) => {
    await ouvrir(page, DA, "/back-office/reunions");
    const titres = page.locator("section > h2");
    await expect(titres.filter({ hasText: /^(À venir|Passées)$/ })).toHaveText(["À venir", "Passées"]);
    await expect(page.getByRole("link", { name: /Réunion DA de septembre/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Foot au parc/ })).toHaveCount(0);
  });

  test("en grand : la prochaine réunion ouverte d'office, avec ses cartes", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, DA, "/back-office/reunions");
    await expect(liste(page)).toBeVisible();
    await expect(titreFiche(page, "Réunion DA")).toBeVisible();
    await expect(liste(page).locator('[aria-current="page"]')).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/?$/);
    const fiche = volet(page);
    await expect(fiche.getByText("Réunion de pôle · DA")).toBeVisible();
    await expect(fiche.getByRole("link", { name: "Dupliquer pour la prochaine" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?from=reu-da$/);
    await expect(fiche.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/modifier\/?$/);
    await expect(fiche.getByTestId("sujets-carte")).toBeVisible();
    await expect(fiche.getByRole("region", { name: "Réunions précédentes" })).toBeVisible();
    await expect(fiche.getByTestId("taches-carte")).toBeVisible();
    // « Sujets à aborder » à gauche, compte rendu, réunions précédentes et tâches à droite, dès que le
    // volet a 640 px (1 440 px) ; l'un sous l'autre sinon (1 280 px barre dépliée, iPad en paysage).
    const sujets = (await fiche.getByTestId("sujets-carte").boundingBox())!;
    const taches = (await fiche.getByTestId("taches-carte").boundingBox())!;
    const compteRendu = (await fiche.getByTestId("compte-rendu-carte").boundingBox())!;
    if ((await fiche.boundingBox())!.width >= 640) {
      expect(taches.x).toBeGreaterThan(sujets.x + sujets.width - 1);
      expect(compteRendu.x).toBeGreaterThan(sujets.x + sujets.width - 1);
    } else {
      expect(compteRendu.y).toBeLessThan(sujets.y);
      expect(taches.y).toBeGreaterThan(sujets.y + sujets.height - 1);
    }
  });

  test("ordinateur-1440 : la fiche d'une réunion sur deux colonnes", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "1 440 px, barre dépliée");
    await ouvrir(page, DA, "/back-office/reunions");
    const fiche = volet(page);
    await expect(fiche.getByTestId("sujets-carte")).toBeVisible();
    const sujets = (await fiche.getByTestId("sujets-carte").boundingBox())!;
    const taches = (await fiche.getByTestId("taches-carte").boundingBox())!;
    expect(taches.x).toBeGreaterThan(sujets.x + sujets.width - 1);
  });

  test("ordinateur-1440 : la fiche d'un évènement sur deux colonnes, Inscrits à gauche", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "1 440 px, barre dépliée");
    await ouvrir(page, COORD, "/back-office/evenements");
    const fiche = volet(page);
    await expect(fiche.getByRole("region", { name: "Inscrits" })).toBeVisible();
    const inscrits = (await fiche.getByRole("region", { name: "Inscrits" }).boundingBox())!;
    const periode = (await fiche.getByRole("region", { name: "Période d'inscription" }).boundingBox())!;
    expect(periode.x).toBeGreaterThan(inscrits.x + inscrits.width - 1);
  });

  test("un lien direct vers une réunion ouvre liste et fiche sous l'entrée Réunions", async ({ page }, info) => {
    await ouvrir(page, DA, "/back-office/reunions/reu-da-sept");
    await expect(page).toHaveURL(/\/back-office\/reunions\/reu-da-sept\/?$/);
    if (estGrandEcran(info)) {
      await expect(enTete(page).getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
      await expect(titreFiche(page, "Réunion DA de septembre")).toBeVisible();
      await expect(liste(page).getByRole("link", { name: /Réunion DA de septembre/ })).toHaveAttribute("aria-current", "page");
    } else {
      await expect(page.getByRole("heading", { level: 1, name: "Réunion DA de septembre" })).toBeVisible();
      await expect(enTete(page).getByRole("link", { name: "Réunions" })).toHaveAttribute("href", /^\/back-office\/reunions\/?$/);
      await verifierAgencement(page, { contenu: contenu(page), onglets: { rail: 0, pilules: 0 } });
    }
  });

  test("en grand : « Nouvelle réunion » s'ouvre dans le volet", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, DA, "/back-office/reunions");
    await enTete(page).getByRole("link", { name: "Nouvelle réunion" }).click();
    await expect(page).toHaveURL(/\/back-office\/reunions\/nouvelle\/?$/);
    await expect(volet(page).getByLabel("Nom de l'évènement")).toBeVisible();
    await expect(liste(page)).toBeVisible();
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
  });

  test("« ⋯ › Supprimer » confirme dans le site, retire la réunion et revient à la liste", async ({ page }) => {
    const db = await ouvrir(page, DA, "/back-office/reunions/reu-da-nov");
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(page).toHaveURL(/\/back-office\/reunions\/?$/);
    await expect.poll(() => db.doc("evenements/reu-da-nov")).toBeUndefined();
    await expect(page.getByRole("link", { name: /Réunion DA de novembre/ })).toHaveCount(0);
  });
});

// ─── Relecture du lot (07/10/2026) ───────────────────────────────────────────────

/** Lire un fichier téléchargé. */
const lireTelechargement = async (fichier: Download) =>
  (await (await fichier.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8")));
/** La lecture de la liste des évènements (`listEvenements`), pas une autre requête sur la collection. */
function estLaListe(route: Route): boolean {
  const r = route.request();
  if (r.method() !== "POST" || !new URL(r.url()).pathname.endsWith("/documents:runQuery")) return false;
  const q = (r.postDataJSON() as { structuredQuery: { from: { collectionId: string }[]; where?: unknown; orderBy?: { field: { fieldPath: string } }[] } }).structuredQuery;
  return q.from[0]?.collectionId === "evenements" && !q.where && q.orderBy?.[0]?.field.fieldPath === "date";
}
/** Ce que la page fait après une création, une modification ou une suppression. */
const relire = (page: Page) => page.evaluate(() => window.dispatchEvent(new Event("evenements-changed")));

test.describe("T2b, relecture : l'export et la liste", () => {
  test("« Exporter » : un nom en formule reste du texte, la date d'inscription est celle de Paris", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements/foot", {
      ...DOCS,
      // Sans compte, le 4 octobre à 00:30 à Paris (22:30 UTC la veille), sous un nom qui est une formule.
      "evenements/foot/inscriptions/x2": { uid: null, nom: "=1+1", invites: 0, createdAt: "2026-10-03T22:30:00Z" },
    });
    const inscrits = page.getByRole("region", { name: "Inscrits" });
    await expect(inscrits.getByRole("listitem")).toHaveCount(3);
    const [fichier] = await Promise.all([page.waitForEvent("download"), inscrits.getByRole("button", { name: "Exporter" }).click()]);
    const lignes = (await lireTelechargement(fichier)).split("\n");
    expect(lignes).toContain("'=1+1;0;✓;2026-10-04");
    expect(lignes).toContain("Paul D.;0;✓;2026-10-03");
  });

  test("hors ligne, une relecture qui échoue garde la liste affichée", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(page.getByRole("link", { name: /Foot au parc/ })).toBeVisible();
    let echecs = 0;
    await page.route(/firestore\.googleapis\.com/, (route) => {
      if (!estLaListe(route)) return route.fallback();
      echecs++;
      return route.abort("internetdisconnected");
    });
    await relire(page);
    await expect.poll(() => echecs).toBe(1);
    await page.waitForTimeout(500);
    await expect(page.getByRole("link", { name: /Foot au parc/ })).toBeVisible();
    await expect(page.getByText("Aucun évènement à gérer.")).toHaveCount(0);
  });

  test("une relecture plus ancienne, arrivée après la dernière, ne l'écrase pas", async ({ page }) => {
    const db = await ouvrir(page, COORD, "/back-office/evenements");
    await expect(page.getByRole("link", { name: /Foot au parc/ })).toBeVisible();
    // La première relecture est retenue ; elle répondra la liste d'avant la création.
    const avant = Object.entries(DOCS).filter(([p]) => /^evenements\/[^/]+$/.test(p)).map(([p, d]) => ({ document: fsDoc(p, d) }));
    const retenues: Route[] = [];
    await page.route(/firestore\.googleapis\.com/, (route) => {
      if (retenues.length === 0 && estLaListe(route)) { retenues.push(route); return; }
      return route.fallback();
    });
    await relire(page);
    await expect.poll(() => retenues.length).toBe(1);
    db.set("evenements/jeux", { ...EV, titre: "Soirée jeux", date: "2026-11-14" });
    await relire(page);
    await expect(page.getByRole("link", { name: /Soirée jeux/ })).toBeVisible();
    await retenues[0].fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(avant) });
    await page.waitForTimeout(500);
    await expect(page.getByRole("link", { name: /Soirée jeux/ })).toBeVisible();
  });

  test("en grand : supprimer la fiche ouverte d'office ne la laisse pas à l'écran sous la suivante", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grand écran");
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(titreFiche(page, "Foot au parc")).toBeVisible();
    // La fiche suivante tarde à se lire.
    const retenues: Route[] = [];
    await page.route(/firestore\.googleapis\.com/, (route) => {
      const r = route.request();
      if (r.method() === "GET" && new URL(r.url()).pathname.endsWith("/documents/evenements/fete")) { retenues.push(route); return; }
      return route.fallback();
    });
    await volet(page).getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect.poll(() => retenues.length).toBeGreaterThan(0);
    await expect(titreFiche(page, "Foot au parc")).toHaveCount(0);
    for (const r of retenues) await r.fallback();
    await expect(titreFiche(page, "Fête de rentrée")).toBeVisible();
  });
});
