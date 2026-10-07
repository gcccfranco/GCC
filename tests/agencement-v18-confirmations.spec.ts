import { expect, test, type BrowserContextOptions, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { fenetreDuSite, interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";

// Agencement v18, tranche F2 (docs/spec-agencement-v18.md, R9) : les dix `window.confirm` hors
// scène passent par la fenêtre du site (`useConfirmer`). Une confirmation par test : la fenêtre du
// site s'ouvre (jamais la fenêtre grise du navigateur), « Annuler » ne fait rien, l'action fait ce
// qu'elle faisait. Toutes les données sont simulées (fakeSession), aucune vraie notification.
// Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN).

type Docs = Record<string, Record<string, unknown>>;

/** Le Google Sheet public : jamais le vrai depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function ouvrir(page: Page, qui: FakeProfile, vers: string, docs: Docs, quand = "2026-10-01T10:00:00") {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date(quand));
  await sansSheet(page);
  return signInAs(page, qui, docs, vers);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.waitForTimeout(300); // la fenêtre finit d'apparaître
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

const ecritures = (db: FakeDb, method: string, prefixe: string) =>
  db.writes.filter((w) => w.method === method && w.path.startsWith(prefixe));

// ─── Évènements ──────────────────────────────────────────────────────────────

const FOOT = {
  titre: "Foot au parc", type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "", dateFin: "",
  lieu: "Parc", description: "", liens: [], images: [], placesMax: 10, inscriptionOuverte: true, sansCompte: true,
  lienExterne: "", contact: "", organisateurUid: "uid-steph", organisateurNom: "Steph R.", epingle: false, expiresAt: null,
  inscrits: 2, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const CULTE = { ...FOOT, titre: "Culte de Noël", type: "eglise", date: "2026-12-24", placesMax: null, inscriptionOuverte: false, inscrits: 0, organisateurUid: "uid-alice" };
const STEPH: FakeProfile = { uid: "uid-steph", email: "steph@example.com", firstName: "Steph", lastName: "R.", annonces: ["Groupe Bonté"] };
/** Coordination des évènements : elle duplique. */
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement", "da"] };

const tacheLiee = (over: Record<string, unknown>) => ({
  pole: "evenement", titre: "Réserver la salle", responsableUid: null, responsableNom: "", echeance: "2026-12-10",
  repetition: null, lien: "", note: "", prevenir: null, evenement: { id: "culte", titre: "Culte de Noël" }, auteurUid: "uid-alice",
  createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z", ...over,
});

test("supprimer un évènement : la fenêtre du site ; Annuler ne fait rien ; Supprimer le retire", async ({ page }) => {
  const db = await ouvrir(page, STEPH, "/back-office/evenements/foot", { "evenements/foot": FOOT });
  // Agencement v18 (B3) : Supprimer est dans le menu « ⋯ » de la fiche de gestion.
  const supprimer = async () => {
    await page.getByTestId("fiche-gestion").getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
  };
  await supprimer();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Supprimer « Foot au parc » ?" })).toBeVisible();
  await expect(fenetreDuSite(page)).toContainText("Les inscriptions seront perdues.");
  await capture(page, "confirmer-supprimer-evenement");
  await repondreDansLeSite(page, "Annuler");
  await expect(page).toHaveURL(/\/back-office\/evenements\/foot\/?$/);
  expect(ecritures(db, "DELETE", "evenements/")).toEqual([]);

  await supprimer();
  await repondreDansLeSite(page, "Supprimer");
  await expect(page).toHaveURL(/\/back-office\/evenements\/?$/);
  expect(ecritures(db, "DELETE", "evenements/").map((w) => w.path)).toEqual(["evenements/foot"]);
});

test("retirer un inscrit : la fenêtre du site ; Annuler le garde ; Retirer le désinscrit", async ({ page }) => {
  await ouvrir(page, STEPH, "/evenements/foot", {
    "evenements/foot": FOOT,
    "evenements/foot/inscriptions/uid-jo": { uid: "uid-jo", nom: "Jo L.", invites: 0, createdAt: "2026-09-21T10:00:00Z" },
    "evenements/foot/inscriptions/x1": { uid: null, nom: "Marie", invites: 0, createdAt: "2026-09-22T10:00:00Z" },
  });
  const envois: unknown[] = [];
  await page.route("**/api/evenements/desinscription", (route) => {
    envois.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true, inscrits: 1 } });
  });
  await page.getByRole("button", { name: "Voir les inscrits (2)" }).click();
  const liste = page.getByRole("list", { name: "Inscrits" });
  const retirer = liste.getByRole("listitem").filter({ hasText: "Marie" }).getByRole("button", { name: "Retirer" });
  await retirer.click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Retirer l'inscription de Marie ?" })).toBeVisible();
  await repondreDansLeSite(page, "Annuler");
  await expect(liste.getByRole("listitem")).toHaveCount(2);
  expect(envois).toEqual([]);

  await retirer.click();
  await repondreDansLeSite(page, "Retirer");
  await expect(liste.getByRole("listitem")).toHaveCount(1);
  expect(envois).toEqual([{ evenementId: "foot", inscriptionId: "x1" }]);
});

test("dupliquer un évènement qui a des tâches : la fenêtre du site demande ; Annuler le crée sans elles, Copier avec", async ({ page, browser }) => {
  const docs = {
    "evenements/culte": CULTE,
    "poles/evenement/taches/e1": tacheLiee({}),
    "poles/evenement/taches/e2": tacheLiee({ titre: "Commander le goûter", echeance: "2026-12-23" }),
  };
  async function dupliquer(p: Page, reponse: "Annuler" | "Copier les tâches") {
    await p.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
    const db = await ouvrir(p, ALICE, "/back-office/evenements/culte", docs);
    await p.getByTestId("fiche-gestion").getByRole("button", { name: "Plus d'actions" }).click();
    await p.getByRole("menuitem", { name: "Dupliquer" }).click();
    await p.getByLabel("Date", { exact: true }).fill("2027-12-24");
    await p.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(fenetreDuSite(p).getByRole("heading", { name: "Copier aussi ses 2 tâches, aux mêmes délais ?" })).toBeVisible();
    await repondreDansLeSite(p, reponse);
    await expect(p).toHaveURL(/\/evenements\/fake-\d+\/?$/);
    return db;
  }

  const refus = await dupliquer(page, "Annuler");
  expect(ecritures(refus, "POST", "evenements/"), "l'évènement est créé").toHaveLength(1);
  expect(ecritures(refus, "POST", "poles/"), "sans ses tâches").toEqual([]);

  // Une autre session, mêmes réglages d'appareil.
  const { defaultBrowserType: _ignore, ...use } = test.info().project.use as Record<string, unknown>;
  const contexte = await browser.newContext({ ...(use as BrowserContextOptions), baseURL: new URL(page.url()).origin });
  try {
    const accord = await dupliquer(await contexte.newPage(), "Copier les tâches");
    await expect.poll(() => ecritures(accord, "POST", "poles/evenement/taches/").length).toBe(2);
  } finally {
    await contexte.close();
  }
});

// ─── Tâches ──────────────────────────────────────────────────────────────────

const RUTH_DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Ruth", lastName: "K.", poles: ["da"] };

// La feuille du formulaire garde « Supprimer » dans l'App (`/taches`) ; au Back-Office, la suppression
// est dans « ⋯ » de la fiche (agencement v18, T1 : tests/agencement-v18-taches.spec.ts).
test("supprimer une tâche : la fenêtre du site ; Annuler la garde ; Supprimer la retire", async ({ page }) => {
  const db = await ouvrir(page, RUTH_DA, "/taches/da/t1", {
    "poles/da/taches/t1": { ...tacheLiee({}), pole: "da", titre: "Fond PPT", evenement: null, auteurUid: "uid-da" },
  });
  await page.getByRole("button", { name: "Modifier", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Modifier la tâche" });
  await form.getByRole("button", { name: "Supprimer" }).click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Supprimer cette tâche et tout son historique ?" })).toBeVisible();
  await capture(page, "confirmer-supprimer-tache");
  await repondreDansLeSite(page, "Annuler");
  await expect(form, "le formulaire reste ouvert").toBeVisible();
  expect(ecritures(db, "DELETE", "poles/")).toEqual([]);

  await form.getByRole("button", { name: "Supprimer" }).click();
  await repondreDansLeSite(page, "Supprimer");
  await expect(form).toHaveCount(0);
  await expect.poll(() => db.doc("poles/da/taches/t1")).toBeUndefined();
});

// ─── Planning ────────────────────────────────────────────────────────────────

test("retirer une date de la grille : la fenêtre du site ; Annuler la garde ; Retirer l'efface", async ({ page }) => {
  const qui: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", plannings: ["interfranco"] };
  const db = await ouvrir(page, qui, "/back-office/planning/interfranco", {
    "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
  }, "2026-11-15T10:00:00");
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  const retirer = page.getByRole("button", { name: "Retirer ce dimanche" }).filter({ visible: true });
  await retirer.click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: /^Retirer le .*17 janvier 2027 \?$/ })).toBeVisible();
  await expect(fenetreDuSite(page)).toContainText("Ses cases s'effacent.");
  await repondreDansLeSite(page, "Annuler");
  expect(db.doc("plannings/interfranco/dimanches/2027-01-17"), "refusé : rien ne bouge").toBeDefined();

  await retirer.click();
  await repondreDansLeSite(page, "Retirer");
  await expect.poll(() => db.doc("plannings/interfranco/dimanches/2027-01-17")).toBeUndefined();
});

test("retirer un petit déj : la fenêtre du site ; Annuler le garde ; Retirer rend le dimanche libre", async ({ page }) => {
  const charlie: FakeProfile = { uid: "uid-charlie", email: "charlie@example.com", planningName: "Charlie B." };
  const db = await ouvrir(page, charlie, "/planning/table", {
    "petitDej/m": {
      dimanche: "2026-09-27", nom: "Famille Martin", uid: "uid-charlie", auteurUid: "uid-charlie",
      creeLe: "2026-09-01T10:00:00.000Z", modifieLe: "2026-09-01T10:00:00.000Z",
    },
  }, "2026-09-18T10:00:00");
  const le27 = page.getByRole("region", { name: "Petit déj", exact: true }).locator('[data-dimanche="2026-09-27"]');
  // Agencement v18 (A4) : « Retirer » est dans le « ⋯ » de la ligne.
  const retirer = async () => {
    await le27.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Retirer" }).click();
  };
  await retirer();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Retirer cette ligne ?" })).toBeVisible();
  await repondreDansLeSite(page, "Annuler");
  await expect(le27.getByText("Famille Martin", { exact: true })).toBeVisible();
  expect(db.doc("petitDej/m")).toBeDefined();

  await retirer();
  await repondreDansLeSite(page, "Retirer");
  await expect(le27.getByText("Libre", { exact: true })).toBeVisible();
  expect(db.doc("petitDej/m")).toBeUndefined();
});

test("publier un trimestre : la fenêtre du site ; Annuler n'appelle rien ; Publier appelle la route", async ({ page }) => {
  const publieur: FakeProfile = { uid: "uid-publieur", email: "publieur@example.com", planningName: "Publieur P.", notify: ["Groupe Paix"] };
  const db = await ouvrir(page, publieur, "/back-office/planning/groupes", {
    "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Invité A." },
  }, "2026-11-15T10:00:00");
  const corps: unknown[] = [];
  // Route simulée : jamais de vraie notification.
  await page.route("**/api/planning/release", async (route) => {
    const body = route.request().postDataJSON() as { tri: string; publish: boolean };
    corps.push(body);
    const published = body.publish ? [body.tri] : [];
    db.set("planningReleases/paix_2027", { published });
    await route.fulfill({ json: { ok: true, published, notified: body.publish, sent: 0 } });
  });
  await page.getByRole("tab", { name: "2027", exact: true }).click();
  const publier = page.getByRole("button", { name: "Publier le T1" });
  await publier.click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: /^Publier le T1 2027 de .+ \?$/ })).toBeVisible();
  await expect(fenetreDuSite(page)).toContainText("Tous ses membres le verront et recevront une notification.");
  await capture(page, "confirmer-publier");
  await repondreDansLeSite(page, "Annuler");
  await expect(publier).toBeVisible();
  expect(corps).toEqual([]);

  await publier.click();
  await repondreDansLeSite(page, "Publier le T1");
  await expect(page.getByRole("button", { name: "Masquer le T1" })).toBeVisible();
  expect(corps).toEqual([{ key: "paix", tri: "T1", publish: true, year: 2027 }]);
});

// ─── Réunions ────────────────────────────────────────────────────────────────

const REUNION = {
  titre: "Réunion DA", type: "loisir", pour: "pole:da", date: "2026-10-03", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};
const BRUNO: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };

test("retirer un compte rendu : la fenêtre du site ; Annuler le garde ; Retirer efface le lien", async ({ page }) => {
  const cr = { url: "https://docs.google.com/document/d/oct", parUid: "uid-alice", parNom: "Alice Q.", le: "2026-10-04T09:30:00Z" };
  const db = await ouvrir(page, BRUNO, "/evenements/reunion-da", { "evenements/reunion-da": { ...REUNION, compteRendu: cr } }, "2026-10-04T18:00:00");
  const carte = page.getByRole("region", { name: "Compte rendu", exact: true });
  const retirer = carte.getByRole("button", { name: "Retirer le lien du compte rendu" });
  await retirer.click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Retirer le lien du compte rendu ?" })).toBeVisible();
  await repondreDansLeSite(page, "Annuler");
  await expect(carte.getByRole("link", { name: "Ouvrir" })).toBeVisible();
  expect(ecritures(db, "PATCH", "evenements/reunion-da")).toEqual([]);

  await retirer.click();
  await repondreDansLeSite(page, "Retirer");
  await expect.poll(() => ecritures(db, "PATCH", "evenements/reunion-da").map((w) => w.data)).toEqual([{ compteRendu: null }]);
  await expect(carte.getByRole("link", { name: "Ouvrir" })).toHaveCount(0);
});

test("retirer un sujet : la fenêtre du site ; Annuler le garde ; Retirer le supprime", async ({ page }) => {
  const db = await ouvrir(page, BRUNO, "/evenements/reunion-da", {
    "evenements/reunion-da": REUNION,
    "evenements/reunion-da/sujets/s1": {
      texte: "Budget impression du trimestre", auteurUid: "uid-bruno", auteurNom: "Bruno M.", creeLe: "2026-10-01T12:00:00Z",
      ordre: 0, traite: false, reprisDans: null, repriseDe: null,
    },
  }, "2026-10-02T18:00:00");
  const lignes = page.getByRole("region", { name: /^Sujets/ }).getByRole("list", { name: "Sujets à aborder" }).getByRole("listitem");
  const retirer = lignes.getByRole("button", { name: "Retirer « Budget impression du trimestre »" });
  await retirer.click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Retirer le sujet « Budget impression du trimestre » ?" })).toBeVisible();
  await repondreDansLeSite(page, "Annuler");
  await expect(lignes).toHaveCount(1);
  expect(ecritures(db, "DELETE", "evenements/")).toEqual([]);

  await retirer.click();
  await repondreDansLeSite(page, "Retirer");
  await expect(lignes).toHaveCount(0);
  expect(ecritures(db, "DELETE", "evenements/").map((w) => w.path)).toEqual(["evenements/reunion-da/sujets/s1"]);
});

// ─── Tableau de bord ─────────────────────────────────────────────────────────

test("revenir à la disposition par défaut : la fenêtre du site ; Annuler garde la disposition ; Remettre la remplace", async ({ page }) => {
  const coord: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
  const db = await ouvrir(page, coord, "/back-office", {
    "backOffice/uid-alice": { tableauDeBord: [{ id: "scene", taille: "l", reglages: {} }], majLe: "2026-09-30T10:00:00Z" },
  });
  const grille = page.getByTestId("grille-widgets");
  const affiches = () => grille.locator("[data-widget]").evaluateAll((els) => els.map((e) => e.getAttribute("data-widget")));
  await expect(grille.getByRole("region", { name: "Scène", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Personnaliser" }).click();
  const parDefaut = page.getByRole("button", { name: "Disposition par défaut" });
  await parDefaut.click();
  await expect(fenetreDuSite(page).getByRole("heading", { name: "Remettre la disposition par défaut de ton rôle ?" })).toBeVisible();
  await expect(fenetreDuSite(page)).toContainText("Tes widgets, leurs tailles et leurs réglages seront remplacés.");
  await repondreDansLeSite(page, "Annuler");
  expect(await affiches()).toEqual(["scene"]);
  expect(db.writes.filter((w) => w.path === "backOffice/uid-alice")).toEqual([]);

  await parDefaut.click();
  await repondreDansLeSite(page, "Remettre par défaut");
  await expect.poll(affiches).not.toEqual(["scene"]);
  await expect.poll(() => db.writes.filter((w) => w.path === "backOffice/uid-alice").length).toBe(1);
  expect(db.doc("backOffice/uid-alice")!.tableauDeBord).toBeUndefined();
});
