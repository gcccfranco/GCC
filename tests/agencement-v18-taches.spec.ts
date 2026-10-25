import { expect, test, type Page, type Request, type Route, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import {
  estGrandEcran, estTelephone, fenetreDuSite, interdireDialoguesNatifs, margeAttendue, ouvrirAvecBarre,
  repondreDansLeSite, verifierAgencement,
} from "./helpers/agencement";

// Agencement v18, tranche T1 (docs/spec-agencement-v18.md, B1 et B2 ; planches `v18-bo-taches`,
// `v18-bo-tache-nouvelle`), reprise à la piste A (BO-D, BO7) : plus de deux volets ni de rail des équipes.
// La liste de l'équipe est la section « Tâches » de sa page `/back-office/equipes/<équipe>` (En retard ·
// Cette semaine · Plus tard, « Terminées (n) » repliées, « Nouvelle tâche » en lien) ; la fiche (état,
// infos, Note et Historique, « Modifier » et « ⋯ › Supprimer ») et le formulaire sont en une colonne, sous
// un retour « ‹ <équipe> ». En grand, « Nouvelle tâche » et « Modifier » ouvrent le formulaire dans la page ;
// sur un volet, la feuille.
// Firestore et date simulés, personnes fictives, aucune vraie notification.

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "K.", dansEquipes: ["da", "medias"], referentDe: ["da", "medias"] };

const LEA = {
  email: "lea@example.com", firstName: "Léa", lastName: "M.", planningName: "", serviceRoles: {}, annonces: [], notify: [], dansEquipes: ["da"], referentDe: ["da"],
};

function tacheDoc(over: Record<string, unknown> = {}) {
  return {
    equipe: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-05",
    repetition: null, lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-ruth",
    createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
  };
}

const DOCS = {
  "users/uid-lea": LEA,
  "equipes/da/taches/t1": tacheDoc({
    titre: "Affiche de Noël", responsableUid: "uid-ruth", responsableNom: "Ruth K.", echeance: "2026-09-28",
    evenement: { id: "noel", titre: "Culte de Noël" }, prevenir: { equipe: "medias" },
    lien: "https://example.com/affiche-noel", note: "Format A3 et version Instagram",
    auteurUid: "uid-lea", createdAt: "2026-09-21T10:00:00Z",
  }),
  "equipes/da/taches/t1/fois/2026-09-28": {
    date: "2026-09-28", parUid: "uid-ruth", parNom: "Ruth K.", le: "2026-09-29T09:00:00Z", etat: "encours", debutLe: "2026-09-29T09:00:00Z",
  },
  "equipes/da/taches/t2": tacheDoc({ titre: "Fond PPT du culte", echeance: "2026-10-01", repetition: { rythme: "semaine" } }),
  "equipes/da/taches/t3": tacheDoc({ titre: "Livret de l'Avent", echeance: "2026-11-16" }),
  "equipes/da/taches/t4": tacheDoc({ titre: "Visuel du repas", echeance: "2026-09-25" }),
  "equipes/da/taches/t4/fois/2026-09-25": {
    date: "2026-09-25", parUid: "uid-ruth", parNom: "Ruth K.", le: "2026-09-26T09:00:00Z", etat: "terminee", debutLe: "2026-09-25T09:00:00Z",
  },
  "equipes/medias/taches/m1": tacheDoc({ equipe: "medias", titre: "Vidéo d'annonce", echeance: "2026-10-04" }),
};

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, RUTH, DOCS, adresse);
}

/** La page de l'équipe (BO7) : sa section « Tâches » est la liste ; la fiche et le formulaire ont leur adresse. */
const PAGE_DA = "/back-office/equipes/da";
const liste = (page: Page) => page.getByRole("region", { name: "Tâches", exact: true });
const detail = (page: Page) => page.locator("article");
const formulaire = (page: Page, nom: string) => page.getByRole("form", { name: nom });
const ligne = (page: Page, titre: string) => liste(page).getByRole("button", { name: new RegExp(`^${titre}`) });
/** La page de l'équipe : la section « Tâches » prend toute la zone moins deux marges (BO-G, 2 : la largeur d'« À faire », plus de
 *  plafond à 720 px) ; ni rail ni pilules. */
const surLaListe = (page: Page) => ({ contenu: liste(page), onglets: { rail: 0, pilules: 0 } });
const nouvelleTache = (page: Page) => page.getByRole("link", { name: "Nouvelle tâche" });

/** Chemin Firestore d'une requête (`equipes/da:runQuery`, `equipes/da/taches/t3`), sans le préfixe du projet. */
const cheminFirestore = (url: string) => decodeURIComponent(new URL(url).pathname.split("/documents")[1] ?? "").replace(/^\//, "");

/** Retient les réponses aux requêtes choisies jusqu'à `relacher()` (lecture lente simulée). À poser
 *  après `signInAs` : la dernière route posée passe d'abord, puis la base simulée répond. */
async function retenir(page: Page, choisir: (r: Request) => boolean) {
  let relacher!: () => void;
  const porte = new Promise<void>((r) => { relacher = r; });
  let vues = 0;
  await page.route(/firestore\.googleapis\.com/, async (route: Route) => {
    if (!choisir(route.request())) return route.fallback();
    vues++;
    await porte;
    await route.fallback();
  });
  return { relacher, vues: () => vues };
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

test("l'agencement commun : en-tête = le nom de l'équipe, section « Tâches » avec ses lignes, aucune fenêtre native", async ({ page }) => {
  await ouvrir(page, PAGE_DA);
  await expect(ligne(page, "Affiche de Noël")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("DA");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Tâches", "Réunions", "Membres"]);
  // Les trois tâches de TEAM DA à faire (le compte de l'ancien rail « DA · 3 ») : quatre lignes, la tâche répétée en a deux.
  await expect(liste(page).getByRole("checkbox")).toHaveCount(4);
  for (const titre of ["Affiche de Noël", "Fond PPT du culte", "Livret de l'Avent"]) await expect(ligne(page, titre).first()).toBeVisible();
  await verifierAgencement(page, surLaListe(page));
  await capture(page, "v18-bo-taches");
  // Une autre équipe, sa page : le titre et une seule tâche (« Médias · 1 »).
  await page.goto("/back-office/equipes/medias");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Médias");
  await expect(liste(page).getByRole("checkbox")).toHaveCount(1);
});

test("pendant la lecture des tâches : ni « Aucune tâche », ni compte à zéro dans la section", async ({ page }) => {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, RUTH, DOCS, "/back-office");
  // Les tâches de TEAM DA tardent à venir (réseau lent).
  const lecture = await retenir(page, (r) => cheminFirestore(r.url()) === "equipes/da:runQuery");
  await page.goto(PAGE_DA);
  await expect.poll(lecture.vues).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("DA");
  await expect(liste(page)).toBeVisible();
  await expect(page.getByText(/^Aucune tâche pour l'instant/)).toHaveCount(0);
  await expect(liste(page).getByRole("checkbox")).toHaveCount(0);
  lecture.relacher();
  await expect(ligne(page, "Affiche de Noël")).toBeVisible();
  await expect(liste(page).getByRole("checkbox")).toHaveCount(4);
});

test("changer l'état d'une tâche ne relit que son équipe", async ({ page }) => {
  const db = await ouvrir(page, "/back-office/taches/da/t3");
  const etat = page.getByRole("radiogroup", { name: "État" }).filter({ visible: true });
  await expect(etat.getByRole("radio", { name: "À faire" })).toHaveAttribute("aria-checked", "true");
  const relues: string[] = [];
  page.on("request", (r) => { if (r.url().includes("firestore.googleapis.com") && r.method() !== "PATCH") relues.push(cheminFirestore(r.url())); });
  await etat.getByRole("radio", { name: "Terminée" }).click();
  // L'état affiché vient de la relecture : quand il change, elle est finie.
  await expect(etat.getByRole("radio", { name: "Terminée" })).toHaveAttribute("aria-checked", "true");
  expect(db.writes.some((w) => w.path === "equipes/da/taches/t3/fois/2026-11-16")).toBe(true);
  expect(relues).toContain("equipes/da:runQuery");
  expect(relues.filter((c) => c.startsWith("equipes/medias")), "TEAM MÉDIAS n'est pas relue").toEqual([]);
});

test("« Modifier » : le responsable est déjà choisi pendant la lecture des membres", async ({ page }) => {
  await ouvrir(page, "/back-office/taches/da/t1");
  const membres = await retenir(page, (r) => cheminFirestore(r.url()) === ":runQuery" && (r.postData() ?? "").includes("\"users\""));
  await page.getByRole("button", { name: "Modifier" }).click();
  await expect.poll(membres.vues).toBeGreaterThan(0);
  const responsable = page.getByLabel("Responsable");
  await expect(responsable).toHaveValue("uid-ruth");
  await expect(responsable.locator("option:checked")).toHaveText("Ruth K.");
  membres.relacher();
  await expect(responsable).toHaveValue("uid-ruth");
});

test("la liste : En retard, Cette semaine, Plus tard ; « Terminées (1) » repliées puis dépliées", async ({ page }) => {
  await ouvrir(page, PAGE_DA);
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
  test.beforeEach(({}, info: TestInfo) => { test.skip(!estGrandEcran(info), "formulaire dans la page : ordinateur et iPad paysage"); });

  test("la section « Tâches » en carte ; toucher une tâche ouvre sa fiche à lire, titrée en h2", async ({ page }) => {
    await ouvrir(page, PAGE_DA);
    await expect(liste(page).locator(".raised").first()).toBeVisible();
    // (Plus de première tâche ouverte à côté, ni de ligne allumée : la fiche a son adresse, R11 n'existe plus.)
    await ligne(page, "Affiche de Noël").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t1\/?$/);
    await expect(detail(page).getByRole("heading", { level: 2, name: "Affiche de Noël" })).toBeVisible();
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
    await ouvrir(page, PAGE_DA);
    await ligne(page, "Livret de l'Avent").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t3\/?$/);
    await expect(detail(page).getByRole("heading", { level: 2, name: "Livret de l'Avent" })).toBeVisible();
    await expect(detail(page).locator("section", { has: page.getByRole("heading", { name: "Historique" }) }).getByRole("listitem"))
      .toHaveText(["Créée par Ruth K. · 1 sept."]);
  });

  test("un lien direct vers une tâche ouvre sa fiche, et « ‹ DA » ramène à la page de l'équipe, sur sa ligne", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da/t2?date=2026-10-08");
    await expect(detail(page).getByRole("heading", { level: 2, name: "Fond PPT du culte" })).toBeVisible();
    await verifierAgencement(page, { contenu: detail(page), lecture: true, onglets: { rail: 0, pilules: 0 } });
    await page.getByRole("link", { name: "DA", exact: true }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
    await expect(ligne(page, "Affiche de Noël")).toBeVisible();
    await expect(liste(page).getByRole("button", { name: /^Fond PPT du culte.*8 oct/ })).toBeVisible();
    await verifierAgencement(page, surLaListe(page));
  });

  test("« + Nouvelle tâche » ouvre le formulaire dans la page ; créer ouvre sa fiche", async ({ page }) => {
    const db = await ouvrir(page, PAGE_DA);
    await nouvelleTache(page).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/nouvelle\/?$/);
    const form = formulaire(page, "Nouvelle tâche");
    await expect(form).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(form.getByRole("group", { name: "Équipe" }).getByRole("button", { name: "DA" })).toHaveAttribute("aria-pressed", "true");
    await form.getByLabel("Titre").fill("Affiche de la retraite");
    await form.getByLabel("Échéance").fill("2026-10-06");
    await form.getByRole("tablist", { name: "Répétition" }).getByRole("tab", { name: "Semaine", exact: true }).click();
    await capture(page, "v18-bo-tache-nouvelle");
    // Annuler, puis le bouton plein, en bas à droite (R13).
    await expect(form.getByRole("button", { name: /^(Annuler|Créer la tâche)$/ })).toHaveText(["Annuler", "Créer la tâche"]);
    await form.getByRole("button", { name: "Créer la tâche" }).click();
    await expect.poll(() => db.writes.find((w) => w.method === "POST" && w.path.startsWith("equipes/da/taches/"))).toBeTruthy();
    const cree = db.writes.find((w) => w.method === "POST" && w.path.startsWith("equipes/da/taches/"))!;
    expect(cree.data).toMatchObject({ titre: "Affiche de la retraite", equipe: "da", echeance: "2026-10-06", repetition: { rythme: "semaine" }, auteurUid: "uid-ruth" });
    const id = cree.path.split("/").pop();
    await expect(page).toHaveURL(new RegExp(`/back-office/taches/da/${id}/?$`));
    await expect(detail(page).getByRole("heading", { level: 2, name: "Affiche de la retraite" })).toBeVisible();
    // Et la tâche est dans la section « Tâches » de la page de l'équipe.
    await page.getByRole("link", { name: "DA", exact: true }).click();
    await expect(ligne(page, "Affiche de la retraite")).toBeVisible();
  });

  test("la page « Nouvelle tâche » : l'agencement commun ; « Annuler · Créer la tâche » en bas à droite (R13)", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da/nouvelle");
    const form = formulaire(page, "Nouvelle tâche");
    await expect(form).toBeVisible();
    // Le formulaire a l'équipe en pilules et la répétition en rail (B2, planche `v18-bo-tache-nouvelle`) ; le rail des équipes a disparu (BO7).
    await verifierAgencement(page, { contenu: form, lecture: true, onglets: { rail: 1, pilules: 1 } });
    const carte = (await form.boundingBox())!;
    const annuler = (await form.getByRole("button", { name: "Annuler" }).boundingBox())!;
    const creer = (await form.getByRole("button", { name: "Créer la tâche" }).boundingBox())!;
    expect(annuler.x + annuler.width, "Annuler à gauche du bouton plein").toBeLessThanOrEqual(creer.x);
    expect(creer.x, "les deux boutons à droite de la carte").toBeGreaterThan(carte.x + carte.width / 2);
    expect(carte.x + carte.width - (creer.x + creer.width), "le bouton plein au bord droit (marge de la carte)").toBeLessThanOrEqual(21);
  });

  test("barre réduite : l'en-tête et la colonne suivent (marge de 28 px)", async ({ page }, info) => {
    test.skip(!info.project.name.startsWith("ordinateur"), "la barre se réduit sur ordinateur ; l'iPad couché l'a toujours réduite");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrir(page, PAGE_DA);
    await expect(ligne(page, "Affiche de Noël")).toBeVisible();
    expect(await margeAttendue(page), "la barre est bien réduite").toBe(28);
    await verifierAgencement(page, surLaListe(page));
    await ligne(page, "Livret de l'Avent").click();
    await expect(detail(page).getByRole("heading", { level: 2, name: "Livret de l'Avent" })).toBeVisible();
    await verifierAgencement(page, { contenu: detail(page), lecture: true, onglets: { rail: 0, pilules: 0 } });
  });

  test("l'équipe d'une nouvelle tâche se choisit en pilules", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da/nouvelle");
    const form = formulaire(page, "Nouvelle tâche");
    await form.getByRole("group", { name: "Équipe" }).getByRole("button", { name: "Médias" }).click();
    await form.getByLabel("Titre").fill("Montage du teaser");
    await form.getByLabel("Échéance").fill("2026-10-12");
    await form.getByRole("button", { name: "Créer la tâche" }).click();
    await expect(page).toHaveURL(/\/back-office\/taches\/medias\/[^/]+\/?$/);
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("equipes/medias/taches/"))?.data).toMatchObject({ titre: "Montage du teaser", equipe: "medias" });
  });

  test("Annuler referme le formulaire sans rien écrire", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da/nouvelle");
    await formulaire(page, "Nouvelle tâche").getByRole("button", { name: "Annuler" }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
    await expect(ligne(page, "Affiche de Noël")).toBeVisible();
    expect(db.writes.filter((w) => w.path.startsWith("equipes/"))).toEqual([]);
  });

  test("« Modifier » ouvre le formulaire dans le volet ; enregistrer met la fiche à jour", async ({ page }) => {
    const db = await ouvrir(page, "/back-office/taches/da/t3");
    await detail(page).getByRole("button", { name: "Modifier" }).click();
    const form = formulaire(page, "Modifier la tâche");
    await expect(form).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(form.getByLabel("Titre")).toHaveValue("Livret de l'Avent");
    await form.getByLabel("Titre").fill("Livret de l'Avent 2026");
    await form.getByRole("button", { name: "Enregistrer" }).click();
    await expect(detail(page).getByRole("heading", { level: 2, name: "Livret de l'Avent 2026" })).toBeVisible();
    expect(db.doc("equipes/da/taches/t3")).toMatchObject({ titre: "Livret de l'Avent 2026" });
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
  await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
  await expect.poll(() => db.doc("equipes/da/taches/t3")).toBeUndefined();
  await expect(ligne(page, "Livret de l'Avent")).toHaveCount(0);
});

test("« ⋯ › Supprimer » refusé par la base : un message, la fiche reste, aucune erreur non rattrapée", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  const db = await ouvrir(page, "/back-office/taches/da/t3");
  // Hors ligne ou droit perdu : Firestore refuse la suppression.
  await page.route(/firestore\.googleapis\.com/, (route) => (route.request().method() === "DELETE"
    ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "Missing or insufficient permissions.", status: "PERMISSION_DENIED" } }) })
    : route.fallback()));
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await repondreDansLeSite(page, "Supprimer");
  await expect(page.getByRole("status").filter({ hasText: "L'enregistrement a échoué. Réessaie." })).toBeVisible();
  await expect(page).toHaveURL(/\/back-office\/taches\/da\/t3\/?$/);
  await expect(page.getByRole("heading", { name: "Livret de l'Avent" })).toBeVisible();
  expect(db.doc("equipes/da/taches/t3")).toBeDefined();
  expect(erreurs).toEqual([]);
});

test.describe("un volet (téléphone, tablette portrait)", () => {
  test.beforeEach(({}, info: TestInfo) => { test.skip(estGrandEcran(info), "un volet : téléphone et tablette portrait"); });

  test("la liste, puis la fiche en page avec « ‹ Tâches »", async ({ page }) => {
    await ouvrir(page, PAGE_DA);
    await expect(ligne(page, "Livret de l'Avent")).toBeVisible();
    await verifierAgencement(page, surLaListe(page));
    await ligne(page, "Livret de l'Avent").click();
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/t3\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Livret de l'Avent");
    await expect(liste(page)).toHaveCount(0);
    // La fiche en page : ni rail ni pilules (« ‹ Tâches » ramène à la page de l'équipe).
    await verifierAgencement(page, { contenu: detail(page), lecture: true, onglets: { rail: 0, pilules: 0 } });
    await capture(page, "v18-bo-tache-fiche");
    await page.locator("header[data-entete-page]").getByRole("link", { name: "Tâches", exact: true }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/da\/?$/);
    await expect(ligne(page, "Livret de l'Avent")).toBeVisible();
  });

  test("« Nouvelle tâche » ouvre la feuille d'aujourd'hui ; créer ouvre la fiche de la tâche", async ({ page }) => {
    const db = await ouvrir(page, PAGE_DA);
    await nouvelleTache(page).click();
    const feuille = page.getByRole("dialog", { name: "Nouvelle tâche" });
    await expect(feuille).toBeVisible();
    await feuille.getByLabel("Titre").fill("Affiche de la retraite");
    await feuille.getByLabel("Échéance").fill("2026-10-09");
    await feuille.getByRole("button", { name: "Enregistrer" }).click();
    await expect(feuille).toHaveCount(0);
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("equipes/da/taches/"))?.data).toMatchObject({ titre: "Affiche de la retraite" });
    // La page de la nouvelle tâche, puis la liste de l'équipe l'a.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Affiche de la retraite");
    await page.locator("header[data-entete-page]").getByRole("link", { name: "Tâches", exact: true }).click();
    await expect(ligne(page, "Affiche de la retraite")).toBeVisible();
  });

  test("« Modifier » ouvre la feuille d'aujourd'hui", async ({ page }) => {
    await ouvrir(page, "/back-office/taches/da/t3");
    await page.getByRole("button", { name: "Modifier" }).click();
    await expect(page.getByRole("dialog", { name: "Modifier la tâche" })).toBeVisible();
  });
});

test("téléphone : « Nouvelle tâche » est un lien dans la section « Tâches », plus de rond « + » flottant", async ({ page }) => {
  test.skip(!estTelephone(test.info()), "téléphone seulement");
  await ouvrir(page, PAGE_DA);
  // Piste A, BO7 : le rond fixe de `BoutonNouveau` (52 px) n'existe plus sur la page d'une équipe ; le bouton est dans l'en-tête de la section.
  const lien = liste(page).getByRole("link", { name: "Nouvelle tâche" });
  await expect(lien).toBeVisible();
  expect((await lien.boundingBox())!.height).toBeGreaterThanOrEqual(32);
  await expect(page.getByRole("link", { name: "Nouvelle tâche" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Nouvelle tâche" })).toHaveCount(0);
});
