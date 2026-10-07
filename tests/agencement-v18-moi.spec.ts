import { expect, test, type Page } from "@playwright/test";
import { BASE_URL_COUPE } from "../playwright.config";
import { abonneAuxNotifications, ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, margeAttendue, verifierAgencement, zoneDeContenu } from "./helpers/agencement";

// Agencement v18, tranche T10 (docs/spec-agencement-v18.md, A12 à A15 ; planches `v18-app-moi-a`,
// `v18-app-profil`, `v18-app-guide`, `v18-app-questionnaire`, v17 sur téléphone et tablette portrait).
// Moi : en-tête commun, la carte du compte et les réglages à gauche, des aperçus utiles à droite
// (Mes services, Mes tâches, Harmonie, Mes équipes), trois cartes d'aide dessous. Profil :
// « Enregistrer » dans l'en-tête dès 768 px, en bas sur téléphone, la carte Notifications revient.
// Guide et Questionnaire : lecture (sommaire de 260 px, colonne de 720 px), titre au x du sommaire.
// Feuilles Google, Firestore et date simulés ; personnes fictives. Cinq projets.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, piano: string) =>
  [date, "Léa M.", "Inès V.", "", piano, "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ENTETE_CULTE,
    culte("27/09", "Noé T."), // passé
    culte("04/10", "Noé T."),
    culte("11/10", "Noé T."),
    culte("18/10", "Noé T."),
    culte("25/10", "Noé T."),
  ]),
};

const ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Noé", lastName: "T.", planningName: "Noé T.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
/** Un membre sans service ni pôle : ni tâches ni Harmonie. */
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "lea@example.com", firstName: "Léa", lastName: "M.", planningName: "", serviceRoles: {} };

const tache = (pole: string, titre: string, echeance: string, responsableUid: string | null = null) => ({
  pole, titre, responsableUid, responsableNom: responsableUid ? "Autre P." : "", echeance, repetition: null, lien: "", note: "",
  prevenir: null, evenement: null, auteurUid: "uid-autre", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
});
const membre = (nom: string, uid: string, over: Record<string, unknown> = {}) => ({ nom, uid, mention: "", referent: false, essai: false, groupe: "", ...over });
const equipe = (pole: string | null, membres: unknown[]) => ({ pole, membres, updatedAt: "2026-09-01T10:00:00Z", parUid: "uid-autre", parNom: "Autre P." });

const DOCS = {
  "poles/da/taches/t1": tache("da", "Fond PPT", "2026-10-05"),
  "poles/da/taches/t2": tache("da", "Affiche de Noël", "2026-10-08"),
  "poles/da/taches/t2/fois/2026-10-08": { date: "2026-10-08", parUid: "uid-admin", parNom: "Noé T.", le: "2026-09-28T10:00:00Z", etat: "encours", debutLe: "2026-09-28T10:00:00Z" },
  "poles/orga/taches/t3": tache("orga", "Planning du trimestre", "2026-10-12"),
  "poles/louange/taches/t4": tache("louange", "Choisir les chants de Noël", "2026-10-15"),
  "poles/media/taches/t5": tache("media", "Photos du culte", "2026-10-06", "uid-autre"), // pas pour moi
  "coursProgres/uid-admin": { fini: { "le-son-les-notes-et-le-clavier": "2026-09-01T10:00:00Z", "le-rythme-et-la-mesure": "2026-09-02T10:00:00Z" } },
  "equipes/da": equipe("da", [membre("Noé T.", "uid-admin", { referent: true }), membre("Zoé R.", "uid-zoe")]),
  "equipes/louange": equipe(null, [membre("Noé T.", "uid-admin", { groupe: "Pianistes" }), membre("Ruth K.", "uid-ruth"), membre("Yann B.", "")]),
  "equipes/orga": equipe("orga", [membre("Autre P.", "uid-autre")]),
};

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  return signInAs(page, qui, docs, to);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

const apercu = (page: Page, nom: string) => page.getByRole("region", { name: nom, exact: true });
const lignes = (page: Page, nom: string) => apercu(page, nom).getByTestId("apercu-ligne");
const boite = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;
/** Le bloc de contenu sous l'en-tête (dans l'enveloppe qui pose la marge) : toute la zone moins deux marges. */
const contenuSousEnTete = (page: Page) => enTete(page).locator("xpath=following-sibling::div[1]/*[1]");
/** Ces pages n'ont ni rail ni pilules (R4) : un onglet qui apparaîtrait passerait par l'un des deux. */
const SANS_ONGLETS = { rail: 0, pilules: 0 };

/** Largeur de la colonne de lecture (R14) : 720 px, ou ce qui reste à côté du sommaire (260 px + 40 px)
 *  quand la zone est plus étroite (1 280 px barre dépliée, iPad paysage). */
async function colonneAttendue(page: Page) {
  const zone = await zoneDeContenu(page);
  return Math.min(720, zone.droite - zone.gauche - 2 * (await margeAttendue(page)) - 300);
}

// ── Moi (A12) ───────────────────────────────────────────────────────────────────────────────

test.describe("Moi (A12)", () => {
  test("l'agencement commun : en-tête « Moi », sous-titre « <nom> · Admin »", async ({ page }) => {
    await ouvrir(page, ADMIN, "/moi");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Moi" })).toBeVisible();
    await expect(enTete(page).getByText("Noé T. · Admin", { exact: true })).toBeVisible();
    await verifierAgencement(page, { contenu: contenuSousEnTete(page), onglets: SANS_ONGLETS });
  });

  test("les aperçus d'un admin : services, tâches, Harmonie, équipes, puis l'aide", async ({ page }) => {
    await ouvrir(page, ADMIN, "/moi");

    // Mes services : les trois prochains, « 4 à venir », « Tout voir » vers la page.
    await expect(lignes(page, "Mes services")).toHaveCount(3);
    await expect(lignes(page, "Mes services").first()).toContainText("Culte Franco");
    await expect(lignes(page, "Mes services").first()).toContainText("dans 3 j");
    await expect(apercu(page, "Mes services").getByRole("link", { name: /4 à venir/ })).toHaveAttribute("href", /^\/mes-services\/?$/);

    // Mes tâches : trois à faire (la tâche d'un autre n'y est pas), la plus proche d'abord.
    await expect(lignes(page, "Mes tâches")).toHaveCount(3);
    await expect(lignes(page, "Mes tâches")).toContainText(["Fond PPT", "Affiche de Noël", "Planning du trimestre"]);
    await expect(lignes(page, "Mes tâches").nth(1)).toContainText("En cours");
    await expect(apercu(page, "Mes tâches").getByText("Photos du culte")).toHaveCount(0);
    await expect(apercu(page, "Mes tâches").getByRole("link", { name: /4 à faire/ })).toHaveAttribute("href", /^\/taches\/?$/);
    await expect(lignes(page, "Mes tâches").first().getByRole("link")).toHaveAttribute("href", /^\/taches\/da\/t1\/?$/);

    // Harmonie : le cours (2 / 23 chapitres, le prochain), les fiches et les sons.
    const h = apercu(page, "Harmonie");
    await expect(h.getByText("2 / 23 chapitres")).toBeVisible();
    await expect(h.getByText("Prochain chapitre : 3. Lire la musique")).toBeVisible();
    await expect(h.getByRole("link", { name: /Prochain chapitre/ })).toHaveAttribute("href", /^\/harmonie\/cours\/lire-la-musique\/?$/);
    await expect(h.getByRole("link", { name: "Les fiches de réharmonisation" })).toHaveAttribute("href", /^\/harmonie\/?$/);
    await expect(h.getByRole("link", { name: "Sons du RD-2000" })).toHaveAttribute("href", /^\/harmonie\/rd2000\/?$/);

    // Mes équipes : celles où je figure, dans l'ordre de l'organigramme, mon rôle et le nombre.
    await expect(lignes(page, "Mes équipes")).toHaveCount(2);
    await expect(lignes(page, "Mes équipes").nth(0)).toContainText("DA");
    await expect(lignes(page, "Mes équipes").nth(0)).toContainText("Référent · 2 membres");
    await expect(lignes(page, "Mes équipes").nth(1)).toContainText("Pianistes · 3 membres");
    await expect(apercu(page, "Mes équipes").getByRole("link", { name: /Organigramme/ })).toHaveAttribute("href", /^\/equipes\/?$/);

    // L'aide : Guide, Ton avis, Signaler un problème (qui ouvre sa fenêtre).
    await expect(page.getByRole("link", { name: /Guide d'utilisation/ })).toHaveAttribute("href", /^\/guide\/?$/);
    await expect(page.getByRole("link", { name: /Ton avis sur le site/ })).toHaveAttribute("href", /^\/questionnaire\/?$/);
    await page.getByRole("button", { name: /Signaler un problème/ }).click();
    await expect(page.getByPlaceholder("Décris le problème en une phrase…")).toBeVisible();
    await page.getByRole("button", { name: "Annuler" }).click();
    await capture(page, "t10-moi");
  });

  test("un membre sans pôle ni instrument : ni Mes tâches ni Harmonie ; services et équipes vides le disent", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/moi");
    await expect(enTete(page).getByText("Léa M.", { exact: true })).toBeVisible();
    await expect(apercu(page, "Mes services")).toBeVisible();
    await expect(apercu(page, "Mes équipes")).toContainText("Tu n'es dans aucune équipe");
    await expect(apercu(page, "Mes tâches")).toHaveCount(0);
    await expect(apercu(page, "Harmonie")).toHaveCount(0);
  });

  test("disposition : compte à gauche et aperçus sur deux colonnes en grand ; compte et réglages côte à côte sur tablette ; une colonne sur téléphone", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/moi");
    await expect(lignes(page, "Mes équipes")).toHaveCount(2);
    const compte = await boite(page.getByRole("region", { name: "Mon compte" }));
    const reglages = await boite(page.getByRole("region", { name: "Réglages" }));
    const services = await boite(apercu(page, "Mes services"));
    const taches = await boite(apercu(page, "Mes tâches"));
    const harmonie = await boite(apercu(page, "Harmonie"));
    if (estGrandEcran(info)) {
      expect(Math.round(compte.width), "le compte : 340 px").toBe(340);
      expect(reglages.y, "les réglages sous le compte").toBeGreaterThan(compte.y + compte.height - 1);
      expect(services.x, "les aperçus à droite du compte").toBeGreaterThan(compte.x + compte.width - 1);
      expect(Math.abs(services.y - compte.y), "ils partent ensemble").toBeLessThan(2);
      expect(Math.abs(taches.y - services.y), "deux colonnes d'aperçus").toBeLessThan(2);
      expect(taches.x).toBeGreaterThan(services.x + services.width - 1);
      expect(harmonie.y, "Harmonie sous les services").toBeGreaterThan(services.y + services.height - 1);
    } else if (info.project.name === "tablette") {
      expect(Math.abs(reglages.y - compte.y), "compte et réglages côte à côte").toBeLessThan(2);
      expect(reglages.x).toBeGreaterThan(compte.x + compte.width - 1);
      expect(services.y, "les aperçus dessous").toBeGreaterThan(compte.y + compte.height - 1);
      expect(Math.abs(taches.y - services.y), "en deux colonnes").toBeLessThan(2);
    } else {
      expect(services.y, "une colonne : les services sous le compte").toBeGreaterThan(compte.y + compte.height - 1);
      expect(taches.y).toBeGreaterThan(services.y + services.height - 1);
      expect(reglages.y, "les réglages après les aperçus").toBeGreaterThan(harmonie.y + harmonie.height - 1);
    }
    await capture(page, "t10-moi-disposition");
  });
});

// Le second serveur, sans l'interrupteur : ce que verra le site en ligne (R17).
test.describe("Moi, back-office coupé (A12, R17)", () => {
  test.use({ baseURL: BASE_URL_COUPE });

  test("ni Mes tâches ni Mes équipes ; Notifier et Admin restent", async ({ page }) => {
    await ouvrir(page, ADMIN, "/moi");
    await expect(lignes(page, "Mes services")).toHaveCount(3);
    await expect(apercu(page, "Harmonie")).toBeVisible();
    await expect(apercu(page, "Mes tâches")).toHaveCount(0);
    await expect(apercu(page, "Mes équipes")).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Notifier" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Admin" })).toBeVisible();
  });
});

// ── Profil (A13) ────────────────────────────────────────────────────────────────────────────

test.describe("Profil (A13)", () => {
  test("« ‹ Moi », titre, e-mail ; l'agencement commun", async ({ page }) => {
    await ouvrir(page, ADMIN, "/profil", {});
    const entete = enTete(page);
    await expect(entete.getByRole("link", { name: "Moi" })).toHaveAttribute("href", /^\/moi\/?$/);
    await expect(entete.getByRole("heading", { level: 1, name: "Mon profil" })).toBeVisible();
    await expect(entete.getByText(ADMIN_EMAIL, { exact: true })).toBeVisible();
    await verifierAgencement(page, { contenu: page.locator("form#formulaire-profil"), onglets: SANS_ONGLETS });
  });

  test("« Enregistrer » dans l'en-tête dès 768 px, en bas sur téléphone ; il enregistre", async ({ page }, info) => {
    const db = await ouvrir(page, ADMIN, "/profil", {});
    // Un seul nom pour les deux : « Enregistrer mon profil » (le libellé court est dedans).
    const enHaut = enTete(page).getByRole("button", { name: "Enregistrer mon profil", includeHidden: true });
    const enBas = page.locator("form").getByRole("button", { name: "Enregistrer mon profil", includeHidden: true });
    const services = page.getByRole("group", { name: "Tes services et rôles" });
    await expect(services.getByText("Culte Franco").first()).toBeVisible();
    let bouton = enHaut;
    if (estTelephone(info)) {
      await expect(enHaut).toBeHidden();
      await expect(enBas).toBeVisible();
      // Les champs se remplissent après la lecture des plannings : on mesure une fois la page posée.
      await expect.poll(async () => {
        const s = await boite(services);
        return (await boite(enBas)).y - (s.y + s.height);
      }, { message: "« Enregistrer » en bas" }).toBeGreaterThan(0);
      bouton = enBas;
    } else {
      await expect(enHaut).toBeVisible();
      await expect(enHaut).toHaveText("Enregistrer");
      await expect(enBas).toBeHidden();
      const h1 = await boite(enTete(page).getByRole("heading", { level: 1 }));
      expect((await boite(enHaut)).x, "à droite du titre").toBeGreaterThan(h1.x + h1.width);
    }
    await page.getByLabel("Prénom").fill("Noémie");
    await bouton.click();
    await expect.poll(() => db.doc("users/uid-admin")?.firstName).toBe("Noémie");
  });

  test("la carte Notifications : sous l'identité dès la tablette, services à droite", async ({ page }, info) => {
    await abonneAuxNotifications(page);
    await ouvrir(page, ADMIN, "/profil", {});
    const notifs = page.getByRole("region", { name: "Notifications" });
    await expect(notifs.getByRole("switch", { name: "Notifications" })).toBeChecked();
    await expect(notifs.getByRole("switch", { name: "Rappels de service" })).toBeVisible();
    const identite = page.getByRole("group", { name: "Identité" });
    const services = page.getByRole("group", { name: "Tes services et rôles" });
    // Les champs se remplissent après la lecture des plannings : on mesure une fois la page posée.
    await expect.poll(async () => {
      const i = await boite(identite);
      return (await boite(notifs)).y - (i.y + i.height);
    }, { message: "sous l'identité" }).toBeGreaterThan(0);
    if (!estTelephone(info)) {
      const i = await boite(identite);
      const s = await boite(services);
      expect(Math.abs((await boite(notifs)).x - i.x)).toBeLessThan(2);
      expect(s.x, "les services à droite").toBeGreaterThan(i.x + i.width - 1);
      expect(Math.abs(s.y - i.y)).toBeLessThan(2);
    }
    await capture(page, "t10-profil");
  });
});

// ── Guide (A14) et Questionnaire (A15) : la lecture (R14) ─────────────────────────────────────

test.describe("Guide (A14)", () => {
  test("« ‹ Moi », titre sans icône, l'agencement commun ; titre au x du sommaire, colonne de 720 px", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/guide", {});
    const entete = enTete(page);
    await expect(entete.getByRole("link", { name: "Moi" })).toHaveAttribute("href", /^\/moi\/?$/);
    const h1 = entete.getByRole("heading", { level: 1, name: "Guide d'utilisation" });
    await expect(h1).toBeVisible();
    await expect(entete.getByText("Tout ce qu'il faut savoir pour utiliser le site GCC Louange.")).toBeVisible();
    await expect(h1.locator("xpath=..").locator("svg"), "plus d'icône devant le titre").toHaveCount(0);
    await verifierAgencement(page, { contenu: page.locator("section#songs"), lecture: true, onglets: SANS_ONGLETS });
    const lecture = await boite(page.locator("section#songs"));
    if (estGrandEcran(info)) {
      const nav = await boite(page.getByRole("navigation", { name: "Sur cette page" }));
      expect(Math.round(nav.width), "sommaire de 260 px").toBe(260);
      expect(Math.abs(nav.x - (await boite(h1)).x), "le titre part du bord du sommaire").toBeLessThanOrEqual(1);
      expect(Math.abs(lecture.width - (await colonneAttendue(page))), "colonne de 720 px (ou le reste)").toBeLessThanOrEqual(1);
      expect(lecture.x).toBeGreaterThan(nav.x + nav.width - 1);
    }
    await capture(page, "t10-guide");
  });
});

test.describe("Questionnaire (A15)", () => {
  test("« ‹ Moi », titre, l'agencement commun ; étapes en sommaire au x du titre, questions à 720 px", async ({ page }, info) => {
    await ouvrir(page, ADMIN, "/questionnaire", {});
    const entete = enTete(page);
    await expect(entete.getByRole("link", { name: "Moi" })).toHaveAttribute("href", /^\/moi\/?$/);
    const h1 = entete.getByRole("heading", { level: 1, name: "Ton avis sur le site" });
    await expect(h1).toBeVisible();
    await verifierAgencement(page, { contenu: page.getByTestId("questions"), lecture: true, onglets: SANS_ONGLETS });

    await expect(page.getByText("Les questions qui ne te concernent pas sont sautées.", { exact: false })).toBeVisible();
    const questions = await boite(page.getByTestId("questions"));
    if (estGrandEcran(info)) {
      // La lecture : les étapes en sommaire, l'étape en cours en encre.
      const etapes = page.getByRole("navigation", { name: "Étapes" });
      await expect(etapes.locator('[aria-current="step"]')).toHaveText(/Toi et le site/);
      await expect(etapes.getByText(/^Étape 1 \/ \d$/)).toBeVisible();
      const nav = await boite(etapes);
      expect(Math.round(nav.width), "sommaire de 260 px").toBe(260);
      expect(Math.abs(nav.x - (await boite(h1)).x), "le titre part du bord du sommaire").toBeLessThanOrEqual(1);
      expect(Math.abs(questions.width - (await colonneAttendue(page))), "colonne de 720 px (ou le reste)").toBeLessThanOrEqual(1);
      expect(questions.x).toBeGreaterThan(nav.x + nav.width - 1);
    } else {
      // Téléphone et tablette portrait : la progression d'avant, au-dessus des questions.
      await expect(page.getByText(/^Étape 1 \/ \d$/)).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Étapes" })).toHaveCount(0);
    }
    // Même parcours : « Suivant » sans réponse demande les questions obligatoires.
    await page.getByRole("button", { name: "Suivant" }).click();
    await expect(page.getByText("Merci de répondre aux questions marquées d'une étoile.")).toBeVisible();
    // Une réponse est une pilule, en encre une fois choisie.
    const choix = page.getByRole("button", { name: "Chaque semaine" });
    await choix.click();
    await expect(choix).toHaveAttribute("aria-pressed", "true");
    await capture(page, "t10-questionnaire");
  });
});
