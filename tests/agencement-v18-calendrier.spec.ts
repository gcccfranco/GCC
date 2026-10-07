import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, estTelephone, interdireDialoguesNatifs, margeAttendue, ongletsRail, verifierAgencement,
  verifierPleineLargeur, zoneDeContenu,
} from "./helpers/agencement";
import { ADMIN_EMAILS } from "../src/lib/access";

// Agencement v18, tranche T3 (docs/spec-agencement-v18.md, B5 ; planche `v18-bo-calendrier-agenda-a`) :
// Back-Office › Calendrier. En-tête « Calendrier », « + Nouvel évènement », rail Mois · Agenda ; dans la
// rangée dessous, « ‹ Octobre 2026 › », « Aujourd'hui », filet, sources en pilules, « Seulement moi ».
// Agenda (piste A) : semaines, une ligne par jour, une ligne par entrée (trait, heure, titre, détail,
// étiquette), sur toute la largeur moins le volet du jour (300 px à droite, en agenda comme en Mois) ;
// le volet : titre du jour, « Ajouter ce jour-là » et son menu (évènement, tâche, réunion), une carte par
// entrée. Toucher un jour de l'agenda le choisit. Firestore, Sheets et date simulés ; personnes fictives.

const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };
/** Responsable des plannings, sans pôle ni section : ne crée rien depuis le calendrier. */
const PLANNINGS: FakeProfile = { uid: "u-pl", email: "pl@example.org", firstName: "Noa", lastName: "V.", plannings: ["culte"] };

const MAINTENANT = "2026-09-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "pole:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
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
  "poles/da/taches/noel": {
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
  await expect(entete.getByTestId("mois-affiche")).toHaveText(estTelephone(test.info()) ? "Octobre" : "Octobre 2026");
  await expect(entete.getByRole("button", { name: "Mois suivant" })).toBeVisible();
  await expect(entete.getByRole("button", { name: "Aujourd'hui" })).toBeVisible();
  // Sous l'en-tête, le calendrier (et le volet du jour) prend toute la zone ; un rail (Mois · Agenda)
  // et une rangée de pilules (les sources ; sur téléphone, « Tout · Seulement moi »).
  const communes = {
    contenu: page.locator('[data-testid="calendrier"] > header[data-entete-page] + div'),
    onglets: { rail: 1, pilules: 1 },
  };
  await verifierAgencement(page, communes);
  await vue(page, "Agenda");
  await expect(entete.getByTestId("mois-affiche")).toHaveText(estTelephone(test.info()) ? "Octobre" : "Octobre 2026");
  await verifierAgencement(page, communes);
});

test("téléphone : « Tout · Seulement moi » en pilules ; retoucher « Seulement moi » revient à « Tout »", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "téléphone seulement");
  await ouvrir(page);
  const groupe = page.getByRole("group", { name: "Entrées affichées" });
  await expect(groupe).toHaveAttribute("data-onglets", "pilules");
  const tout = groupe.getByRole("button", { name: "Tout" });
  const moi = groupe.getByRole("button", { name: "Seulement moi" });
  await expect(tout).toHaveAttribute("aria-pressed", "true");
  await moi.click();
  await expect(moi).toHaveAttribute("aria-pressed", "true");
  await expect(tout).toHaveAttribute("aria-pressed", "false");
  await moi.click();
  await expect(tout).toHaveAttribute("aria-pressed", "true");
  // « Sources » suit les pilules, à leur hauteur.
  const sources = page.getByRole("button", { name: "Sources" });
  expect(Math.round((await sources.boundingBox())!.height)).toBe(Math.round((await tout.boundingBox())!.height));
});

test("« + Nouvel évènement » dans l'en-tête dès 768 px ; sur téléphone, le rond « Créer » propose le jour affiché", async ({ page }) => {
  await ouvrir(page);
  if (estTelephone(test.info())) {
    await page.getByRole("button", { name: "Créer", exact: true }).click();
    const feuille = page.getByRole("dialog", { name: "Créer" });
    await expect(feuille.getByRole("link", { name: "Nouvel évènement le 01/10" })).toHaveAttribute("href", /\?date=2026-10-01$/);
    await expect(feuille.getByRole("button", { name: "Nouvelle tâche pour le 01/10" })).toBeVisible();
    await expect(feuille.getByRole("link", { name: "Nouvelle réunion le 01/10" })).toHaveAttribute("href", /\?reunion=1&date=2026-10-01$/);
    return;
  }
  const action = page.locator("header[data-entete-page]").getByRole("link", { name: "Nouvel évènement" });
  await expect(action).toBeVisible();
  await expect(action).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
});

test("grand écran : en agenda, le volet du jour à droite (300 px), « Ajouter ce jour-là » et son menu", async ({ page }) => {
  test.skip(!estGrandEcran(test.info()), "le volet à droite : ordinateur et tablette couchée");
  await ouvrir(page);
  await vue(page, "Agenda");
  const volet = voletDuJour(page, "Jeudi 1er octobre");
  await expect(volet).toBeVisible();
  expect(Math.round((await volet.boundingBox())!.width)).toBe(300);
  await volet.getByRole("button", { name: "Ajouter ce jour-là" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Nouvel évènement le 01/10", "Nouvelle tâche pour le 01/10", "Nouvelle réunion le 01/10"]);
  await expect(menu.getByRole("menuitem", { name: "Nouvel évènement le 01/10" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?\?date=2026-10-01$/);
  await expect(menu.getByRole("menuitem", { name: "Nouvelle réunion le 01/10" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?\?reunion=1&date=2026-10-01$/);
  await capture(page, "v18-bo-calendrier-menu");
  await menu.getByRole("menuitem", { name: "Nouvelle tâche pour le 01/10" }).click();
  const form = page.getByRole("dialog", { name: "Nouvelle tâche" });
  await expect(form.getByLabel("Échéance")).toHaveValue("2026-10-01");
});

test("en agenda, toucher un jour le choisit (volet à droite en grand, feuille du jour sur tablette debout)", async ({ page }) => {
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
  await expect(moisAffiche(page)).toHaveText(estTelephone(test.info()) ? "Novembre" : "Novembre 2026");
  await expect(agenda(page).locator('[data-jour="2026-11-07"]')).toContainText("Marche d'automne");
  await expect(agenda(page).locator('[data-jour="2026-10-03"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Aujourd'hui" }).click();
  await expect(moisAffiche(page)).toHaveText(estTelephone(test.info()) ? "Octobre" : "Octobre 2026");
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

test("sans droit de créer : ni « Nouvel évènement », ni « Ajouter ce jour-là », ni « Créer »", async ({ page }) => {
  await ouvrir(page, PLANNINGS);
  await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Créer", exact: true })).toHaveCount(0);
  if (estGrandEcran(test.info())) {
    await vue(page, "Agenda");
    await expect(voletDuJour(page, "Jeudi 1er octobre")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter ce jour-là" })).toHaveCount(0);
  }
});

test("中文 : titre, rail, semaine, « Ajouter ce jour-là » et son menu", async ({ page }) => {
  await ouvrir(page, ADMIN, "zh-CN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("日历");
  const onglets = page.getByRole("tablist", { name: "视图" });
  await expect(onglets.getByRole("tab")).toHaveText(["月", "日程"]);
  await onglets.getByRole("tab", { name: "日程" }).click();
  await expect(moisAffiche(page)).toHaveText(estTelephone(test.info()) ? "10月" : "2026年10月");
  if (!estGrandEcran(test.info())) return;
  await expect(agenda(page).getByRole("heading", { level: 2, name: "9月28日那一周" })).toBeVisible();
  await page.getByRole("complementary").getByRole("button", { name: "在这天添加" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["新建10月1日的活动", "新建10月1日截止的任务", "新建10月1日的会议"]);
});

test("captures : l'agenda et le volet du jour, le Mois", async ({ page }) => {
  test.skip(!process.env.PW_CAPTURES, "captures à regarder : PW_CAPTURES=<dossier>");
  await ouvrir(page);
  await vue(page, "Agenda");
  await capture(page, "v18-bo-calendrier-agenda-page");
  await vue(page, "Mois");
  await capture(page, "v18-bo-calendrier-mois-page");
});
