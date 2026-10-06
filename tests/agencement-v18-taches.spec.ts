import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, estTelephone, fenetreDuSite, interdireDialoguesNatifs, ongletsRail, repondreDansLeSite, verifierAgencement,
} from "./helpers/agencement";

// Agencement v18, tranche T1 (docs/spec-agencement-v18.md, B1 et B2 ; planches `v18-bo-taches`,
// `v18-bo-tache-nouvelle`) : Back-Office › Tâches en deux volets. En-tête « Tâches » au-dessus des
// deux volets, rail des pôles avec le compte, « + Nouvelle tâche » ; à gauche la liste du pôle en
// carte (En retard · Cette semaine · Plus tard, « Terminées (n) » repliées), à droite la fiche à
// lire (état, infos, Note et Historique), « Modifier » et « ⋯ › Supprimer ». En grand, « Nouvelle
// tâche » et « Modifier » ouvrent le formulaire dans le volet ; sur un volet, la feuille.
// Firestore et date simulés, personnes fictives, aucune vraie notification.

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", poles: ["da", "media"] };

const LEA = {
  email: "lea@example.com", firstName: "Léa", lastName: "M.", planningName: "", serviceRoles: {}, annonces: [], notify: [], poles: ["da"],
};

function tacheDoc(over: Record<string, unknown> = {}) {
  return {
    pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-05",
    repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-ruth",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
  };
}

const DOCS = {
  "users/uid-lea": LEA,
  "poles/da/taches/t1": tacheDoc({
    titre: "Affiche de Noël", responsableUid: "uid-ruth", responsableNom: "Ruth K.", echeance: "2026-09-28",
    evenement: { id: "noel", titre: "Culte de Noël" }, prevenir: { pole: "media" },
    lien: "https://example.com/affiche-noel", note: "Format A3 et version Instagram",
    auteurUid: "uid-lea", createdAt: "2026-09-21T10:00:00Z",
  }),
  "poles/da/taches/t1/fois/2026-09-28": {
    date: "2026-09-28", parUid: "uid-ruth", parNom: "Ruth K.", le: "2026-09-29T09:00:00Z", etat: "encours", debutLe: "2026-09-29T09:00:00Z",
  },
  "poles/da/taches/t2": tacheDoc({ titre: "Fond PPT du culte", echeance: "2026-10-01", repetition: { rythme: "semaine" } }),
  "poles/da/taches/t3": tacheDoc({ titre: "Livret de l'Avent", echeance: "2026-11-16" }),
  "poles/da/taches/t4": tacheDoc({ titre: "Visuel du repas", echeance: "2026-09-25" }),
  "poles/da/taches/t4/fois/2026-09-25": {
    date: "2026-09-25", parUid: "uid-ruth", parNom: "Ruth K.", le: "2026-09-26T09:00:00Z", etat: "terminee", debutLe: "2026-09-25T09:00:00Z",
  },
  "poles/media/taches/m1": tacheDoc({ pole: "media", titre: "Vidéo d'annonce", echeance: "2026-10-04" }),
};

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, RUTH, DOCS, adresse);
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const ligne = (page: Page, titre: string) => liste(page).getByRole("button", { name: new RegExp(`^${titre}`) });
const nouvelleTache = (page: Page) => page.getByRole(estGrandEcran(test.info()) ? "link" : "button", { name: "Nouvelle tâche" });

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

test("l'agencement commun : en-tête « Tâches », rail des pôles avec le compte, aucune fenêtre native", async ({ page }) => {
  await ouvrir(page, "/back-office/taches/da");
  await expect(ligne(page, "Affiche de Noël")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tâches");
  await expect(page.locator("header[data-entete-page]")).toContainText("Les tâches des pôles : ce qui est en retard d'abord");
  const rail = ongletsRail(page).filter({ visible: true });
  await expect(rail.getByRole("link")).toHaveText([/^DA\s*·\s*3$/, /^Média\s*·\s*1$/]);
  await expect(rail.getByRole("link", { name: /^DA/ })).toHaveAttribute("aria-current", "page");
  await verifierAgencement(page);
  await capture(page, "v18-bo-taches");
});

test("la liste : En retard, Cette semaine, Plus tard ; « Terminées (1) » repliées puis dépliées", async ({ page }) => {
  await ouvrir(page, "/back-office/taches/da");
  await expect(liste(page).getByRole("heading", { name: "En retard" })).toBeVisible();
  await expect(liste(page).getByRole("heading", { name: "Cette semaine" })).toBeVisible();
  await expect(liste(page).getByRole("heading", { name: "Plus tard" })).toBeVisible();
  await expect(ligne(page, "Visuel du repas")).toHaveCount(0);
  const terminees = liste(page).getByRole("button", { name: "Terminées (1)" });
  await expect(terminees).toHaveAttribute("aria-expanded", "false");
  await terminees.click();
  await expect(terminees).toHaveAttribute("aria-expanded", "true");
  await expect(ligne(page, "Visuel du repas")).toBeVisible();
});

test.describe("en grand (deux volets)", () => {
  test.beforeEach(({}, info: TestInfo) => { test.skip(!estGrandEcran(info), "deux volets : ordinateur et iPad paysage"); });

  test("la liste en carte et la première tâche à faire en fiche à lire, titrée en h2", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da");
    await expect(liste(page)).toHaveClass(/raised/);
    await expect(detail(page).getByRole("heading", { level: 2, name: "Affiche de Noël" })).toBeVisible();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
    await expect(ligne(page, "Affiche de Noël")).toHaveAttribute("aria-current", "page");
    // État, infos, Note et Historique.
    await expect(detail(page).getByRole("radio", { name: "En cours" })).toHaveAttribute("aria-checked", "true");
    await expect(detail(page).getByText("Culte de Noël")).toBeVisible();
    await expect(detail(page).getByText("Format A3 et version Instagram")).toBeVisible();
    const historique = detail(page).locator("section", { has: page.getByRole("heading", { name: "Historique" }) });
    await expect(historique.getByRole("listitem")).toHaveText(["Commencée par Ruth K. · 29 sept.", "Créée par Léa M. · 21 sept."]);
    await expect(detail(page).getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect(detail(page).getByRole("button", { name: "Plus d'actions" })).toBeVisible();
  });

  test("toucher une tâche change l'adresse et la fiche", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da");
    await ligne(page, "Livret de l'Avent").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t3\/?$/);
    await expect(detail(page).getByRole("heading", { level: 2, name: "Livret de l'Avent" })).toBeVisible();
    await expect(ligne(page, "Livret de l'Avent")).toHaveAttribute("aria-current", "page");
    await expect(detail(page).locator("section", { has: page.getByRole("heading", { name: "Historique" }) }).getByRole("listitem"))
      .toHaveText(["Créée par Ruth K. · 1 sept."]);
  });

  test("un lien direct vers une tâche ouvre la liste et sa fiche", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da/t2?date=2026-10-08");
    await expect(ligne(page, "Affiche de Noël")).toBeVisible();
    await expect(detail(page).getByRole("heading", { level: 2, name: "Fond PPT du culte" })).toBeVisible();
    await expect(liste(page).getByRole("button", { name: /^Fond PPT du culte.*8 oct/ })).toHaveAttribute("aria-current", "page");
    await verifierAgencement(page);
  });

  test("« + Nouvelle tâche » ouvre le formulaire dans le volet ; créer l'ajoute et ouvre sa fiche", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da");
    await nouvelleTache(page).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/nouvelle\/?$/);
    const form = detail(page).getByRole("form", { name: "Nouvelle tâche" });
    await expect(form).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(form.getByRole("group", { name: "Pôle" }).getByRole("button", { name: "DA" })).toHaveAttribute("aria-pressed", "true");
    await form.getByLabel("Titre").fill("Affiche de la retraite");
    await form.getByLabel("Échéance").fill("2026-10-06");
    await form.getByRole("tablist", { name: "Répétition" }).getByRole("tab", { name: "Semaine", exact: true }).click();
    await capture(page, "v18-bo-tache-nouvelle");
    // Annuler, puis le bouton plein, en bas à droite (R13).
    await expect(form.getByRole("button", { name: /^(Annuler|Créer la tâche)$/ })).toHaveText(["Annuler", "Créer la tâche"]);
    await form.getByRole("button", { name: "Créer la tâche" }).click();
    await expect.poll(() => db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/da/taches/"))).toBeTruthy();
    const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/da/taches/"))!;
    expect(cree.data).toMatchObject({ titre: "Affiche de la retraite", pole: "da", echeance: "2026-10-06", repetition: { rythme: "semaine" }, auteurUid: "uid-ruth" });
    const id = cree.path.split("/").pop();
    await expect(page).toHaveURL(new RegExp(`/back-office/taches/da/${id}/?$`));
    await expect(detail(page).getByRole("heading", { level: 2, name: "Affiche de la retraite" })).toBeVisible();
    await expect(ligne(page, "Affiche de la retraite")).toBeVisible();
  });

  test("le pôle d'une nouvelle tâche se choisit en pilules", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da/nouvelle");
    const form = detail(page).getByRole("form", { name: "Nouvelle tâche" });
    await form.getByRole("group", { name: "Pôle" }).getByRole("button", { name: "Média" }).click();
    await form.getByLabel("Titre").fill("Montage du teaser");
    await form.getByLabel("Échéance").fill("2026-10-12");
    await form.getByRole("button", { name: "Créer la tâche" }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/media\/[^/]+\/?$/);
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/media/taches/"))?.data).toMatchObject({ titre: "Montage du teaser", pole: "media" });
  });

  test("Annuler referme le formulaire sans rien écrire", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da/nouvelle");
    await detail(page).getByRole("button", { name: "Annuler" }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
    await expect(detail(page).getByRole("heading", { level: 2, name: "Affiche de Noël" })).toBeVisible();
    expect(db.writes.filter((w) => w.path.startsWith("poles/"))).toEqual([]);
  });

  test("« Modifier » ouvre le formulaire dans le volet ; enregistrer met la fiche à jour", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da/t3");
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const form = detail(page).getByRole("form", { name: "Modifier la tâche" });
    await expect(form).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(form.getByLabel("Titre")).toHaveValue("Livret de l'Avent");
    await form.getByLabel("Titre").fill("Livret de l'Avent 2026");
    await form.getByRole("button", { name: "Enregistrer" }).click();
    await expect(detail(page).getByRole("heading", { level: 2, name: "Livret de l'Avent 2026" })).toBeVisible();
    expect(db.doc("poles/da/taches/t3")).toMatchObject({ titre: "Livret de l'Avent 2026" });
  });
});

test("« ⋯ › Supprimer » : la fenêtre du site ; Annuler garde la tâche, Supprimer la retire", async ({ page }) => {
  const db = await ouvrir(page, "/back-office/taches/da/t3");
  const menu = page.getByRole("button", { name: "Plus d'actions" });
  await menu.click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Supprimer cette tâche et tout son historique ?" })).toBeVisible();
  await repondreDansLeSite(page, "Annuler");
  expect(db.writes.filter((w) => w.method === "DELETE")).toEqual([]);

  await menu.click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await repondreDansLeSite(page, "Supprimer");
  await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
  await expect.poll(() => db.doc("poles/da/taches/t3")).toBeUndefined();
  await expect(ligne(page, "Livret de l'Avent")).toHaveCount(0);
});

test.describe("un volet (téléphone, tablette portrait)", () => {
  test.beforeEach(({}, info: TestInfo) => { test.skip(estGrandEcran(info), "un volet : téléphone et tablette portrait"); });

  test("la liste, puis la fiche en page avec « ‹ Tâches »", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da");
    await verifierAgencement(page);
    await ligne(page, "Livret de l'Avent").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t3\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Livret de l'Avent");
    await expect(liste(page)).toHaveCount(0);
    await verifierAgencement(page);
    await capture(page, "v18-bo-tache-fiche");
    await page.locator("header[data-entete-page]").getByRole("link", { name: "Tâches", exact: true }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
    await expect(ligne(page, "Livret de l'Avent")).toBeVisible();
  });

  test("« Nouvelle tâche » ouvre la feuille d'aujourd'hui", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da");
    await nouvelleTache(page).click();
    const feuille = page.getByRole("dialog", { name: "Nouvelle tâche" });
    await expect(feuille).toBeVisible();
    await feuille.getByLabel("Titre").fill("Affiche de la retraite");
    await feuille.getByLabel("Échéance").fill("2026-10-09");
    await feuille.getByRole("button", { name: "Enregistrer" }).click();
    await expect(feuille).toHaveCount(0);
    await expect(ligne(page, "Affiche de la retraite")).toBeVisible();
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("poles/da/taches/"))?.data).toMatchObject({ titre: "Affiche de la retraite" });
  });

  test("« Modifier » ouvre la feuille d'aujourd'hui", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da/t3");
    await page.getByRole("button", { name: "Modifier" }).click();
    await expect(page.getByRole("dialog", { name: "Modifier la tâche" })).toBeVisible();
  });
});

test("téléphone : un rond « + » en bas à droite, aucune pilule « Nouvelle tâche »", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "téléphone seulement");
  await ouvrir(page, "/back-office/taches/da");
  const rond = page.getByRole("button", { name: "Nouvelle tâche" });
  await expect(rond).toBeVisible();
  const boite = (await rond.boundingBox())!;
  const fenetre = page.viewportSize()!;
  expect(Math.round(boite.width)).toBe(52);
  expect(boite.x + boite.width).toBeGreaterThan(fenetre.width - 30);
  expect(boite.y).toBeGreaterThan(fenetre.height / 2);
  // Un seul « Nouvelle tâche » : le rond, sans libellé visible (pas de pilule).
  await expect(page.getByRole("link", { name: "Nouvelle tâche" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nouvelle tâche" })).toHaveCount(1);
  expect(await rond.evaluate((el) => el.querySelector("span")!.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
});
