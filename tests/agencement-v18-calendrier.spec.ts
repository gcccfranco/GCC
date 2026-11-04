import { expect, test, type Page } from "@playwright/test";
import { remplit, signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, estTelephone, interdireDialoguesNatifs, margeAttendue, ongletsRail, ouvrirAvecBarre, verifierAgencement,
  verifierPleineLargeur, zoneDeContenu,
} from "./helpers/agencement";
import { ADMIN_EMAILS } from "../src/lib/access";

// Agencement v18, tranche T3 (docs/spec-agencement-v18.md, B5 ; planche `v18-bo-calendrier-agenda-a`) :
// Back-Office › Calendrier. En-tête « Calendrier », « + Nouvel évènement », rail Mois · Agenda ; dans la
// rangée dessous, « ‹ Octobre 2026 › », « Aujourd'hui », filet, filtre en pilules, « Seulement moi », « Sources »
// (BO-C : les pastilles des sources sont dans la feuille « Sources »).
// Agenda (piste A) : semaines, une ligne par jour, une ligne par entrée (trait, heure, titre, détail,
// étiquette), sur toute la largeur moins le volet du jour (300 px à droite, en agenda comme en Mois) ;
// le volet : titre du jour, « Ajouter ce jour-là » et son menu (évènement, tâche, réunion), une carte par
// entrée. Toucher un jour de l'agenda le choisit. Firestore, Sheets et date simulés ; personnes fictives.

const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };
/** Responsable des plannings, sans pôle ni section : ne crée rien depuis le calendrier. */
const PLANNINGS: FakeProfile = { uid: "u-pl", email: "pl@example.org", firstName: "Noa", lastName: "V.", ...remplit("paix") };

const MAINTENANT = "2026-09-01T10:00:00Z";
/** Le panneau fixe du jour n'existe qu'à partir de 1 600 px (bo-evenements-2) : en dessous, le jour s'ouvre dans un volet flottant
 *  en Mois comme en Agenda. Les tests qui lisent ce panneau élargissent d'abord la fenêtre. */
const largeFixe = (page: Page) => /^(ordinateur|tablette-paysage)/.test(test.info().project.name) ? page.setViewportSize({ width: 1600, height: 900 }) : Promise.resolve();

const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "equipe:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-22", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, organisateurUid: "u-autre", organisateurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/marche": {
    titre: "Marche d'automne", type: "sport", pour: "eglise", date: "2026-11-07", heure: "09:30", lieu: "Forêt",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "equipes/da/taches/noel": {
    titre: "Chants de Noël", responsableUid: null, responsableNom: "", echeance: "2026-10-15", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};

/** Jeudi 1er octobre 2026 ; les Sheets (évènements, planning) répondent vides. */
async function ouvrir(page: Page, profil: FakeProfile = ADMIN, lang?: "zh-CN") {
  interdireDialoguesNatifs(page);
  if (lang) await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, profil, DOCS, "/back-office/calendrier");
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  return db;
}

const rail = (page: Page) => page.getByRole("tablist", { name: "Affichage" });
async function vue(page: Page, nom: "Mois" | "Agenda") {
  const onglet = rail(page).getByRole("tab", { name: nom });
  await onglet.click();
  await expect(onglet).toHaveAttribute("aria-selected", "true");
}
const agenda = (page: Page) => page.getByTestId("agenda");
const voletDuJour = (page: Page, titre: string) => page.getByRole("complementary", { name: titre });
const moisAffiche = (page: Page) => page.getByTestId("mois-affiche");

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

test("l'agencement commun : titre « Calendrier », rail Mois · Agenda, le mois dans la rangée", async ({ page }) => {
  await ouvrir(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Calendrier");
  await expect(ongletsRail(page).filter({ visible: true })).toHaveCount(1);
  await expect(rail(page).getByRole("tab")).toHaveText(["Mois", "Agenda"]);
  const entete = page.locator("header[data-entete-page]");
  await expect(entete.getByTestId("mois-affiche")).toHaveText("Octobre 2026");
  await expect(entete.getByRole("button", { name: "Mois suivant" })).toBeVisible();
  await expect(entete.getByRole("button", { name: "Aujourd'hui" })).toBeVisible();
  // Sous l'en-tête, le calendrier (et le volet du jour) prend toute la zone ; un rail (Mois · Agenda)
  // et une rangée de pilules (le filtre Tout · Évènements · Réunions · Services · Scène).
  const communes = {
    contenu: page.locator('[data-testid="calendrier"] > header[data-entete-page] + div'),
    onglets: { rail: 1, pilules: 1 },
  };
  await verifierAgencement(page, communes);
  await vue(page, "Agenda");
  await expect(entete.getByTestId("mois-affiche")).toHaveText("Octobre 2026");
  await verifierAgencement(page, communes);
});

test("téléphone : le filtre en pilules, puis « Seulement moi » et « Sources » (BO-C) ; « Seulement moi » ne touche pas le filtre", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "téléphone seulement");
  await ouvrir(page);
  const groupe = page.getByRole("group", { name: "Filtrer le calendrier" });
  await expect(groupe).toHaveAttribute("data-onglets", "pilules");
  await expect(groupe.getByRole("button")).toHaveText(["Tout", "Évènements", "Réunions", "Services", "Scène"]);
  const tout = groupe.getByRole("button", { name: "Tout", exact: true });
  const moi = page.getByRole("button", { name: "Seulement moi" });
  await expect(tout).toHaveAttribute("aria-pressed", "true");
  await moi.click();
  await expect(moi).toHaveAttribute("aria-pressed", "true");
  await expect(tout).toHaveAttribute("aria-pressed", "true");
  await moi.click();
  await expect(moi).toHaveAttribute("aria-pressed", "false");
  // « Seulement moi » et « Sources » suivent les pilules, à leur hauteur.
  const sources = page.getByRole("button", { name: "Sources", exact: true });
  const hauteur = Math.round((await tout.boundingBox())!.height);
  expect(Math.round((await sources.boundingBox())!.height)).toBe(hauteur);
  expect(Math.round((await moi.boundingBox())!.height)).toBe(hauteur);
});

test("« Ajouter » (menu Évènement | Réunion | Tâche) dans l'en-tête dès 768 px ; sur téléphone, le rond « Ajouter » propose le jour affiché", async ({ page }) => {
  await ouvrir(page);
  if (estTelephone(test.info())) {
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    const feuille = page.getByRole("dialog", { name: "Ajouter" });
    await expect(feuille.getByRole("link", { name: "Nouvel évènement le 01/10" })).toHaveAttribute("href", /\?date=2026-10-01$/);
    await expect(feuille.getByRole("button", { name: "Nouvelle tâche pour le 01/10" })).toBeVisible();
    await expect(feuille.getByRole("link", { name: "Nouvelle réunion le 01/10" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?date=2026-10-01$/);
    return;
  }
  // BO-G, 4 : les trois mêmes créations qu'en feuille, à la date choisie (ici aujourd'hui), chacune ≥ 44 px avec son icône.
  const action = page.locator("header[data-entete-page]").getByRole("button", { name: "Ajouter", exact: true });
  await expect(action).toBeVisible();
  await action.click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Évènement", "Réunion", "Tâche"]);
  await expect(menu.getByRole("menuitem", { name: "Évènement" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?\?date=2026-10-01$/);
  await expect(menu.getByRole("menuitem", { name: "Réunion" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?date=2026-10-01$/);
  for (const entree of await menu.getByRole("menuitem").all()) {
    // Le menu s'ouvre en zoom : on attend la fin de l'animation.
    await expect.poll(async () => (await entree.boundingBox())!.height, { message: "chaque entrée tient sous le doigt" }).toBeGreaterThanOrEqual(44);
    await expect(entree.locator("svg"), "une icône").toHaveCount(1);
  }
  await menu.getByRole("menuitem", { name: "Tâche" }).click();
  await expect(page.getByRole("dialog", { name: "Nouvelle tâche" }).getByLabel("Échéance")).toHaveValue("2026-10-01");
});

// BO-G, 3 : la rangée de filtres passe à la ligne au lieu de défiler ; rien n'est coupé, « Seulement moi » est toujours là.
test("les filtres du calendrier passent à la ligne : rien de coupé, « Seulement moi » et « Sources » visibles", async ({ page }) => {
  await ouvrir(page);
  const largeur = page.viewportSize()!.width;
  const groupe = page.getByRole("group", { name: "Filtrer le calendrier" });
  const rangee = estTelephone(test.info()) ? groupe : page.getByTestId("filtres-calendrier");
  const boutons = [...(await groupe.getByRole("button").all()), page.getByRole("button", { name: "Seulement moi" }), page.getByRole("button", { name: "Sources", exact: true })];
  for (const bouton of boutons) {
    await expect(bouton).toBeVisible();
    const b = (await bouton.boundingBox())!;
    expect(b.x, "dans l'écran, à gauche").toBeGreaterThanOrEqual(0);
    expect(b.x + b.width, "dans l'écran, à droite").toBeLessThanOrEqual(largeur);
  }
  expect(await rangee.evaluate((el) => el.scrollWidth - el.clientWidth), "la rangée ne défile pas").toBeLessThanOrEqual(1);
  expect(await groupe.evaluate((el) => getComputedStyle(el).overflowX), "le groupe de pilules non plus").not.toBe("auto");
});

// BO-G, 3 : sur téléphone, le « + » flottant ne recouvre pas la dernière carte de l'Agenda.
test("téléphone : en Agenda, le « + » flottant ne recouvre pas la dernière carte", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "téléphone seulement");
  await ouvrir(page);
  const bouton = page.getByRole("button", { name: "Ajouter", exact: true });
  await expect(bouton).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const b = (await bouton.boundingBox())!;
  const cartes = await page.getByTestId("agenda").locator("li").all();
  expect(cartes.length).toBeGreaterThan(0);
  const derniere = (await cartes[cartes.length - 1].boundingBox())!;
  expect(derniere.y + derniere.height, "la dernière carte finit au-dessus du « + »").toBeLessThanOrEqual(b.y);
  const suite = (await page.getByRole("button", { name: /^Afficher/ }).boundingBox())!;
  expect(suite.y + suite.height, "« Afficher … » aussi").toBeLessThanOrEqual(b.y);
});

test("téléphone : en Agenda, « Ajouter » propose aujourd'hui, même après ‹ › (spec-calendrier, C5)", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "téléphone seulement");
  await ouvrir(page);
  await expect(agenda(page)).toBeVisible();
  await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(moisAffiche(page)).toHaveText("Novembre 2026");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  const feuille = page.getByRole("dialog", { name: "Ajouter" });
  await expect(feuille.getByRole("link", { name: "Nouvel évènement le 01/10" })).toHaveAttribute("href", /\?date=2026-10-01$/);
  await expect(feuille.getByRole("button", { name: "Nouvelle tâche pour le 01/10" })).toBeVisible();
});

test("barre réduite : l'agenda et le Mois prennent la zone (marge de 28 px)", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("ordinateur"), "la barre se réduit sur ordinateur ; l'iPad couché l'a toujours réduite");
  await ouvrirAvecBarre(page, "reduite");
  await ouvrir(page);
  expect(await margeAttendue(page), "la barre est bien réduite").toBe(28);
  const communes = {
    contenu: page.locator('[data-testid="calendrier"] > header[data-entete-page] + div'),
    onglets: { rail: 1, pilules: 1 },
  };
  await verifierAgencement(page, communes);
  await vue(page, "Agenda");
  await expect(agenda(page)).toBeVisible();
  await verifierAgencement(page, communes);
});

test("grand écran : en agenda, le volet du jour à droite (300 px), « Ajouter ce jour-là » et son menu", async ({ page }) => {
  await largeFixe(page);
  test.skip(!estGrandEcran(test.info()), "le volet à droite : ordinateur et tablette couchée");
  await ouvrir(page);
  await vue(page, "Agenda");
  const volet = voletDuJour(page, "Jeudi 1er octobre");
  await expect(volet).toBeVisible();
  expect(Math.round((await volet.boundingBox())!.width)).toBe(300);
  await volet.getByRole("button", { name: "Ajouter ce jour-là" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Nouvel évènement le 01/10", "Nouvelle réunion le 01/10", "Nouvelle tâche pour le 01/10"]);
  await expect(menu.getByRole("menuitem", { name: "Nouvel évènement le 01/10" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?\?date=2026-10-01$/);
  await expect(menu.getByRole("menuitem", { name: "Nouvelle réunion le 01/10" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?date=2026-10-01$/);
  await capture(page, "v18-bo-calendrier-menu");
  await menu.getByRole("menuitem", { name: "Nouvelle tâche pour le 01/10" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await expect(form.getByLabel("Échéance")).toHaveValue("2026-10-01");
});

test("« Nouvelle réunion le … » ouvre Réunions › Nouvelle avec la date du jour (T3 et T2a fusionnées)", async ({ page }) => {
  await largeFixe(page);
  test.skip(!estGrandEcran(test.info()), "le menu du volet du jour : ordinateur et tablette couchée");
  await ouvrir(page);
  await vue(page, "Agenda");
  await voletDuJour(page, "Jeudi 1er octobre").getByRole("button", { name: "Ajouter ce jour-là" }).click();
  await page.getByRole("menu").getByRole("menuitem", { name: "Nouvelle réunion le 01/10" }).click();
  await expect(page).toHaveURL(/\/back-office\/reunions\/nouvelle\/?\?date=2026-10-01$/);
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2026-10-01");
});

test("en agenda, toucher un jour le choisit (volet à droite en grand, feuille du jour sur tablette debout)", async ({ page }) => {
  await largeFixe(page);
  test.skip(estTelephone(test.info()), "le téléphone garde son agenda à cartes : une carte ouvre sa feuille");
  await ouvrir(page);
  await vue(page, "Agenda");
  const samedi = agenda(page).getByRole("button", { name: "Samedi 3 octobre" });
  await samedi.click();
  if (estGrandEcran(test.info())) {
    await expect(samedi).toHaveAttribute("aria-pressed", "true");
    await expect(voletDuJour(page, "Samedi 3 octobre")).toContainText("Réunion DA");
    // Une ligne d'entrée choisit aussi son jour.
    await agenda(page).locator('[data-jour="2026-10-15"] [data-source="taches"]').click();
    await expect(voletDuJour(page, "Jeudi 15 octobre")).toContainText("Chants de Noël");
    await expect(agenda(page).getByRole("button", { name: "Jeudi 15 octobre" })).toHaveAttribute("aria-pressed", "true");
    await expect(samedi).toHaveAttribute("aria-pressed", "false");
  } else {
    const feuille = page.getByRole("dialog", { name: "Samedi 3 octobre" });
    await expect(feuille).toContainText("Réunion DA");
    await expect(feuille.getByRole("link", { name: "Nouvel évènement le 03/10" })).toBeVisible();
  }
});

test("l'agenda occupe toute la largeur moins le volet", async ({ page }) => {
  await largeFixe(page);
  test.skip(estTelephone(test.info()), "le téléphone n'a qu'une colonne");
  await ouvrir(page);
  await vue(page, "Agenda");
  const bloc = agenda(page);
  if (!estGrandEcran(test.info())) {
    await verifierPleineLargeur(page, bloc);
    return;
  }
  const zone = await zoneDeContenu(page);
  const marge = await margeAttendue(page);
  const a = (await bloc.boundingBox())!;
  const v = (await voletDuJour(page, "Jeudi 1er octobre").boundingBox())!;
  expect(Math.abs(a.x - zone.gauche - marge), "l'agenda part de la marge").toBeLessThanOrEqual(1);
  expect(Math.abs(v.x + v.width - zone.droite), "le volet va jusqu'au bord").toBeLessThanOrEqual(1);
  expect(a.x + a.width, "l'agenda s'arrête avant le volet").toBeLessThanOrEqual(v.x + 1);
  expect(v.x - (a.x + a.width), "rien entre l'agenda et le volet que la marge").toBeLessThanOrEqual(marge + 1);
});

test("agenda : semaines, une ligne par jour, une ligne par entrée (heure, titre, détail, étiquette)", async ({ page }) => {
  test.skip(estTelephone(test.info()), "le téléphone garde son agenda à cartes (planche bo-telephone-calendrier)");
  await ouvrir(page);
  await vue(page, "Agenda");
  await expect(agenda(page).getByRole("heading", { level: 2, name: "Semaine du 28 septembre" })).toBeVisible();
  await expect(agenda(page).getByRole("heading", { level: 2, name: "Semaine du 12 octobre" })).toBeVisible();
  const samedi = agenda(page).locator('[data-jour="2026-10-03"]');
  await expect(samedi.getByRole("button", { name: "Samedi 3 octobre" })).toContainText(/sam\.\s*3/);
  const reunion = agenda(page).locator('[data-jour="2026-10-03"] [data-source="reunions"]');
  await expect(reunion.locator("[data-heure]")).toHaveText("20:00");
  await expect(reunion).toContainText("Réunion DA");
  await expect(reunion).toContainText("Salle 2");
  await expect(reunion).not.toContainText("20:00 · Salle 2");
  await expect(reunion.locator("[data-etiquette]")).toHaveText("Réunion");
  const tache = agenda(page).locator('[data-jour="2026-10-15"] [data-source="taches"]');
  await expect(tache.locator("[data-heure]")).toHaveText("–");
  await expect(tache.locator("[data-etiquette]")).toHaveText("Tâche");
  await capture(page, "v18-bo-calendrier-agenda");
});

test("‹ › changent le mois de l'agenda, « Aujourd'hui » y revient", async ({ page }) => {
  await ouvrir(page);
  await vue(page, "Agenda");
  await expect(agenda(page).locator('[data-jour="2026-10-03"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Mois suivant" }).click();
  await expect(moisAffiche(page)).toHaveText("Novembre 2026");
  await expect(agenda(page).locator('[data-jour="2026-11-07"]')).toContainText("Marche d'automne");
  await expect(agenda(page).locator('[data-jour="2026-10-03"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Aujourd'hui" }).click();
  await expect(moisAffiche(page)).toHaveText("Octobre 2026");
  await expect(agenda(page).locator('[data-jour="2026-10-03"]')).toHaveCount(1);
});

test("grand écran : en Mois aussi, le volet du jour a « Ajouter ce jour-là »", async ({ page }) => {
  test.skip(!estGrandEcran(test.info()), "le volet à droite : ordinateur et tablette couchée");
  await ouvrir(page);
  await vue(page, "Mois");
  await page.getByTestId("grille-mois").locator('[data-jour="2026-10-11"]').click();
  const volet = voletDuJour(page, "Dimanche 11 octobre");
  await volet.getByRole("button", { name: "Ajouter ce jour-là" }).click();
  await expect(page.getByRole("menuitem", { name: "Nouvel évènement le 11/10" })).toHaveAttribute("href", /\?date=2026-10-11$/);
  await capture(page, "v18-bo-calendrier-mois");
});

test("sans droit de créer : ni « Ajouter » (en-tête ni rond), ni « Ajouter ce jour-là »", async ({ page }) => {
  await largeFixe(page);
  await ouvrir(page, PLANNINGS);
  await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter", exact: true })).toHaveCount(0);
  if (estGrandEcran(test.info())) {
    await vue(page, "Agenda");
    await expect(voletDuJour(page, "Jeudi 1er octobre")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter ce jour-là" })).toHaveCount(0);
  }
});

test("中文 : titre, rail, semaine, « Ajouter ce jour-là » et son menu", async ({ page }) => {
  await largeFixe(page);
  await ouvrir(page, ADMIN, "zh-CN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("日历");
  const onglets = page.getByRole("tablist", { name: "视图" });
  await expect(onglets.getByRole("tab")).toHaveText(["月", "日程"]);
  await onglets.getByRole("tab", { name: "日程" }).click();
  await expect(moisAffiche(page)).toHaveText("2026年10月");
  if (!estGrandEcran(test.info())) return;
  await expect(agenda(page).getByRole("heading", { level: 2, name: "9月28日那一周" })).toBeVisible();
  await page.getByRole("complementary").getByRole("button", { name: "在这天添加" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["新建10月1日的活动", "新建10月1日的会议", "新建10月1日截止的任务"]);
});

test("captures : l'agenda et le volet du jour, le Mois", async ({ page }) => {
  test.skip(!process.env.PW_CAPTURES, "captures à regarder : PW_CAPTURES=<dossier>");
  await ouvrir(page);
  await vue(page, "Agenda");
  await capture(page, "v18-bo-calendrier-agenda-page");
  await vue(page, "Mois");
  await capture(page, "v18-bo-calendrier-mois-page");
});

// ─── Corrections du design, bo-evenements-2 : le volet du jour flottant sous 1 600 px ─────────────────────────────

const caseDuMois = (page: Page, date: string) => page.getByTestId("grille-mois").locator(`[data-jour="${date}"]`);
const voletFlottant = (page: Page) => page.getByTestId("volet-jour");

test("bo-evenements-2 — sous 1 600 px, la grille du Mois prend la largeur : pas de panneau fixe, des cases d'au moins 120 px (96 en tablette couchée)", async ({ page }, info) => {
  test.skip(!estGrandEcran(info), "le volet du jour : ordinateur et tablette couchée");
  await ouvrir(page);
  await expect(page.getByTestId("grille-mois")).toBeVisible();
  await expect(voletFlottant(page)).toBeHidden();
  await expect(page.locator('aside[aria-labelledby="calendrier-jour"]:visible')).toHaveCount(0);
  const largeur = (await caseDuMois(page, "2026-10-06").boundingBox())!.width;
  expect(largeur).toBeGreaterThanOrEqual(info.project.name === "tablette-paysage" ? 96 : 120);
});

test("bo-evenements-2 — le volet du jour entre du côté opposé au jour (lundi–jeudi à droite, vendredi–dimanche à gauche) ; le même jour, ✕ de 44 px et Échap le ferment", async ({ page }, info) => {
  test.skip(!estGrandEcran(info), "le volet du jour : ordinateur et tablette couchée");
  await ouvrir(page);
  const milieu = page.viewportSize()!.width / 2;
  const volet = voletFlottant(page);
  // Mardi 6 : par la droite.
  await caseDuMois(page, "2026-10-06").click();
  await expect(volet).toBeVisible();
  await expect(volet).toHaveAccessibleName("Mardi 6 octobre");
  expect((await volet.boundingBox())!.x).toBeGreaterThan(milieu);
  expect(Math.round((await volet.boundingBox())!.width)).toBe(340);
  await expect(caseDuMois(page, "2026-10-06")).toHaveCSS("outline-width", "2px");
  // Le même jour le ferme.
  await caseDuMois(page, "2026-10-06").click();
  await expect(volet).toBeHidden();
  // Dimanche 11 : par la gauche.
  await caseDuMois(page, "2026-10-11").click();
  await expect(volet).toBeVisible();
  expect((await volet.boundingBox())!.x).toBeLessThan(milieu);
  // Échap le ferme.
  await page.keyboard.press("Escape");
  await expect(volet).toBeHidden();
  // ✕ : une cible d'au moins 44 px, qui le ferme.
  await caseDuMois(page, "2026-10-08").click();
  const fermer = volet.getByRole("button", { name: "Fermer" });
  const f = (await fermer.boundingBox())!;
  expect(Math.min(f.width, f.height)).toBeGreaterThanOrEqual(44);
  await fermer.click();
  await expect(volet).toBeHidden();
  // « Ajouter ce jour-là » est dans le volet, avec la liste du jour.
  await caseDuMois(page, "2026-10-15").click();
  await expect(volet.getByRole("button", { name: "Ajouter ce jour-là" })).toBeVisible();
  await expect(volet).toContainText("Chants de Noël");
});

test("bo-evenements-2 — à 1 600 px, le panneau fixe de 300 px revient, sans volet flottant", async ({ page }, info) => {
  test.skip(!estGrandEcran(info), "le panneau fixe : ordinateur et tablette couchée");
  await page.setViewportSize({ width: 1600, height: 900 });
  await ouvrir(page);
  const panneau = voletDuJour(page, "Jeudi 1er octobre");
  await expect(panneau).toBeVisible();
  expect(Math.round((await panneau.boundingBox())!.width)).toBe(300);
  await expect(voletFlottant(page)).toHaveCount(0);
});

// ─── bo-evenements-7 : fonds sombres des pastilles hors service ─────────────────────────────────────────────

test("bo-evenements-7 — en sombre, les pastilles évènement, réunion et tâche prennent leur fond sombre ; en clair, les valeurs d'aujourd'hui", async ({ page }, info) => {
  test.skip(estTelephone(info), "la grille du Mois : ordinateur et tablettes");
  const fond = (source: string) => page.getByTestId("grille-mois").locator(`[data-source="${source}"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  await ouvrir(page);
  expect(await fond("evenements")).toBe("rgb(255, 243, 214)");
  expect(await fond("reunions")).toBe("rgb(240, 236, 249)");
  expect(await fond("taches")).toBe("rgb(242, 242, 244)");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.classList.remove("light"); });
  await expect.poll(() => fond("evenements")).toBe("rgb(67, 55, 26)");
  expect(await fond("reunions")).toBe("rgb(48, 40, 58)");
  expect(await fond("taches")).toBe("rgb(44, 44, 46)");
  // Le petit déj : ses deux jetons, lus sur la racine.
  const jeton = (nom: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), nom);
  expect(await jeton("--cal-petitdej-fond")).toBe("#423026");
  expect(await jeton("--cal-petitdej-texte")).toBe("#e8a878");
  // Un service (la setlist du culte, #2d5a65 gelé) reste plus lumineux que les quatre fonds sombres : mesuré sur la pastille
  // réelle de la grille (getComputedStyle), pas sur un hex codé en dur.
  const luminance = (rgb: string) => {
    const c = rgb.match(/\d+/g)!.slice(0, 3).map((v) => Number(v) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  await page.goto("about:blank");
  // Les setlists (couleur du service) sont éteintes d'office : la préférence de l'appareil les allume.
  await page.addInitScript(() => localStorage.setItem("calendrier", JSON.stringify({ sources: ["services", "evenements", "reunions", "scene", "taches", "petitDej", "setlists"], seulementMoi: false })));
  await signInAs(page, ADMIN, {
    ...DOCS,
    "setlists/culte-test": {
      title: "Culte du 11 octobre", leader: "Sam T.", category: "Culte Francophone", date: "2026-10-11", language: "fr", notes: "",
      createdAt: MAINTENANT, isDraft: false, isPrivate: false, ownerId: "u-autre",
      items: [1, 2].map((position) => ({ songSlug: `chant-${position}`, position })),
    },
  }, "/back-office/calendrier");
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.classList.remove("light"); });
  const service = page.getByTestId("grille-mois").locator('[data-source="setlists"]').first();
  await expect(service).toBeVisible();
  const fondService = await service.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(fondService, "la pastille de service garde son fond gelé").toBe("rgb(45, 90, 101)");
  for (const source of ["evenements", "reunions", "taches"]) {
    const sombre = await page.getByTestId("grille-mois").locator(`[data-source="${source}"]`).first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(luminance(fondService), source).toBeGreaterThan(luminance(sombre));
  }
  const petitDej = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--cal-petitdej-fond").trim());
  expect(luminance(fondService)).toBeGreaterThan(luminance(`rgb(${[1, 3, 5].map((i) => parseInt(petitDej.slice(i, i + 2), 16)).join(",")})`));
});

// ─── bo-evenements-8 : le compteur d'inscrits à droite du titre ──────────────────────────────────────────────

test("bo-evenements-8 — agenda : « 4/10 » à droite du titre (nom accessible « 4 inscrits sur 10 places »), le détail n'en parle plus ; plein : « Complet »", async ({ page }, info) => {
  await ouvrir(page, ADMIN, undefined);
  await vue(page, "Agenda");
  const ligne = agenda(page).locator('[data-jour="2026-10-22"] [data-source="evenements"]');
  const compteur = ligne.getByLabel("4 inscrits sur 10 places");
  await expect(compteur).toHaveText("4/10");
  await expect(ligne).not.toContainText("inscrit");
  const titre = ligne.getByText("Tournoi de ping", { exact: true });
  expect((await compteur.boundingBox())!.x, "à droite du titre").toBeGreaterThan((await titre.boundingBox())!.x + (await titre.boundingBox())!.width - 1);
  // Le compteur d'un évènement sans inscrit n'existe pas.
  await expect(agenda(page).locator('[data-jour="2026-11-07"] [data-source="evenements"]')).toHaveCount(0);
  void info;
});

test("bo-evenements-8 — évènement plein : « Complet » en encre pleine ; en 中文 « 已满 » et « 已报名 10 人，共 10 个名额 »", async ({ page }) => {
  const plein = { ...DOCS["evenements/ping"], titre: "Veillée complète", date: "2026-10-23", inscrits: 10 };
  interdireDialoguesNatifs(page);
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, { ...DOCS, "evenements/plein": plein }, "/back-office/calendrier");
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  await page.getByRole("tablist", { name: "视图" }).getByRole("tab", { name: "日程" }).click();
  const ligne = agenda(page).locator('[data-jour="2026-10-23"] [data-source="evenements"]');
  const compteur = ligne.getByLabel("已报名 10 人，共 10 个名额");
  await expect(compteur).toHaveText("已满");
  expect(await compteur.evaluate((el) => getComputedStyle(el).fontWeight)).toBe("600");
});
