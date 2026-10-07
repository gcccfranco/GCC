import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { repondreDansLeSite } from "./helpers/agencement";
import { readFileSync } from "node:fs";
import { planningsDuBackOffice, sousPartiesEvenements } from "../src/lib/access";

// Lot U6 (docs/spec-back-office.md), tranche B2 — l'Admin fusionnée dans le
// Back-Office (table Q3, adresses Q4) : Planning (plannings en modification
// directe, Sans compte), Équipes (Organigramme, Personnes — Import et Inscriptions
// retirés le 06/10/2026), Messages (Réception, Notifier, Questionnaire) ; `/admin` et
// `/notifier` redirigent ; Moi et le menu du compte perdent Notifier et
// Administration ; le planning de l'App passe en lecture (Q14), l'onglet Table y
// montre la carte Petit déj et la carte compacte « Prépa. Table du Seigneur ».

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Président A.", "Choriste B.", "Choriste C.", "Pianiste D.", "", "Batteur F.", "Sono G.", "Projection H.", "Orateur I.", "", "", ""],
  ["27/09", "Président J.", "Choriste K.", "Alice Q.", "Pianiste M.", "Guitariste N.", "Batteur O.", "Sono P.", "Projection Q.", "Orateur R.", "", "", ""],
]);
// Onglet Franco_Table_PtD : la date en colonne 1, l'équipe dans les colonnes 2 à 5.
const TABLE = csv([
  ["", "PRÉPARATION TABLE"],
  ["", "20/09", "Membre A.", "Membre B."],
  ["", "27/09", "Membre C.", "Membre D."],
  ["", "04/10", "Membre E.", "Membre F."],
]);

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Remplit le Culte Franco, rien d'autre. */
const ECRIVAIN: FakeProfile = { uid: "uid-ecr", email: "ecr@example.com", firstName: "Choriste", lastName: "B.", planningName: "Choriste B.", plannings: ["culte"] };
/** Notifie le Groupe Paix (et publie donc son planning). */
const NOTIFY: FakeProfile = { uid: "uid-no", email: "no@example.com", firstName: "Noé", lastName: "T.", notify: ["Groupe Paix"] };
/** Tient l'organigramme, sans être admin. */
const EQUIPIER: FakeProfile = { uid: "uid-eq", email: "eq@example.com", firstName: "Elsa", lastName: "N.", equipes: true };

/** Ouvre `to` le vendredi 18/09/2026 (dimanche courant = 20/09, T3), Sheet simulé. */
async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    const body = sheet === "Franco_Louange" ? CULTE : sheet === "Franco_Table_PtD" ? TABLE : "";
    return route.fulfill({ status: 200, contentType: "text/csv", body });
  });
  return signInAs(page, qui, docs, to);
}

/** Les sous-parties d'une entrée (contrôle segmenté). */
const sousParties = (page: Page) => page.getByRole("navigation", { name: "Sous-parties" });
/** Les plannings du Back-Office (pilules). */
const plannings = (page: Page) => page.getByRole("navigation", { name: "Plannings" });
const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

// ─── Purs ────────────────────────────────────────────────────────────────────

test("planningsDuBackOffice : ceux qu'on remplit ou publie ; tous pour un admin", () => {
  const u = (email: string) => ({ email });
  expect(planningsDuBackOffice(u(ADMIN.email), null)).toEqual(["culte", "table", "groupes", "edd", "campus", "intergroupe", "interfranco"]);
  expect(planningsDuBackOffice(u(ECRIVAIN.email), { plannings: ["culte"] })).toEqual(["culte"]);
  expect(planningsDuBackOffice(u("x@example.com"), { plannings: ["fideliteMusiciens", "eddDaban", "campusSoir"] })).toEqual(["groupes", "edd", "campus"]);
  // Publier un trimestre : le Culte (« Culte Francophone » ou « * ») et les groupes.
  expect(planningsDuBackOffice(u(NOTIFY.email), { notify: ["Groupe Paix"] })).toEqual(["groupes"]);
  expect(planningsDuBackOffice(u("x@example.com"), { notify: ["*"] })).toEqual(["culte", "groupes"]);
  expect(planningsDuBackOffice(u("x@example.com"), { notify: ["Campus"] })).toEqual([]);
  expect(planningsDuBackOffice(null, null)).toEqual([]);
});

// ─── Messages ────────────────────────────────────────────────────────────────

test.describe("B2 : Messages (Réception, Notifier, Questionnaire)", () => {
  test("admin : Réception par défaut, avec les signalements et les propositions de chants", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/messages");
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
    const onglets = sousParties(page);
    await expect(onglets.getByRole("link")).toHaveText(["Réception", "Notifier", "Questionnaire"]);
    await expect(onglets.getByRole("link", { name: "Réception" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Signalements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Propositions de chants" })).toBeVisible();
    // L'ancienne page n'est plus là : ni son titre ni ses onglets.
    await expect(page.getByRole("heading", { name: "Administration" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Membres/ })).toHaveCount(0);
  });

  test("admin : Notifier compose une notification, sans « Publier un planning » ni la destination « Annonces »", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/messages");
    await sousParties(page).getByRole("link", { name: "Notifier" }).click();
    await expect(page).toHaveURL(/\/back-office\/messages\/notifier\/?$/);
    await expect(page.getByText("Audience", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publier un planning" })).toHaveCount(0);
    await expect(page.locator("option", { hasText: "Annonces" })).toHaveCount(0);
  });

  test("admin : Questionnaire", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/messages/questionnaire");
    await expect(page.getByRole("heading", { name: "Questionnaire" })).toBeVisible();
  });

  test("droit de notifier seul : Messages mène à Notifier, sans Réception ni Questionnaire", async ({ page }) => {
    await ouvrir(page, NOTIFY, "/back-office/messages");
    await expect(page).toHaveURL(/\/back-office\/messages\/notifier\/?$/);
    await expect(page.getByText("Audience", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Réception" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Questionnaire" })).toHaveCount(0);
    await page.goto("/back-office/messages/questionnaire");
    await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
  });
});

// ─── Équipes ─────────────────────────────────────────────────────────────────

test.describe("B2 : Équipes (Organigramme, Personnes)", () => {
  // Retours du 06/10/2026 : plus d'onglet Import (« on va tout faire manuellement ») ni
  // d'onglet Inscriptions — l'ouverture des comptes passe en tête de Personnes, et
  // « Recalculer depuis l'organigramme » au bas de l'Organigramme, pour les admins.
  test("admin : l'organigramme se modifie ici ; Personnes à côté, inscriptions en tête", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes");
    await expect(page.getByRole("heading", { level: 1, name: "Équipes" })).toBeVisible();
    await expect(sousParties(page).getByRole("link")).toHaveText(["Organigramme", "Personnes"]);
    await expect(page.getByTestId("equipe-orga").getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recalculer depuis l'organigramme" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Importer/ })).toHaveCount(0);

    await sousParties(page).getByRole("link", { name: "Personnes" }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/personnes\/?$/);
    await expect(page.getByPlaceholder(/Rechercher un membre/)).toBeVisible();
    const inscriptions = page.getByRole("heading", { name: "Inscriptions" });
    await expect(inscriptions).toBeVisible();
    await expect(page.getByRole("button", { name: /(Fermer|Ouvrir) les inscriptions/ })).toBeVisible();
    // En tête : le bloc des inscriptions passe avant la liste des membres.
    const yInscriptions = (await inscriptions.boundingBox())!.y;
    const yMembres = (await page.getByRole("heading", { name: "Membres" }).boundingBox())!.y;
    expect(yInscriptions).toBeLessThan(yMembres);
  });

  test("admin : Import et Inscriptions n'existent plus comme pages", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes");
    for (const chemin of ["/back-office/equipes/import", "/back-office/equipes/inscriptions", "/back-office/planning/import"]) {
      const reponse = await page.goto(chemin);
      expect(reponse?.status(), chemin).toBe(404);
    }
  });

  test("droit Équipes sans être admin : l'organigramme seul, Personnes réservée", async ({ page }) => {
    await ouvrir(page, EQUIPIER, "/back-office/equipes");
    await expect(page.getByTestId("equipe-orga").getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Personnes" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Recalculer depuis l'organigramme" }), "réservé aux admins").toHaveCount(0);
    await page.goto("/back-office/equipes/personnes");
    await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
  });

  test("dans l'App, l'organigramme se lit sans « Modifier », même pour un admin", async ({ page }) => {
    await ouvrir(page, ADMIN, "/equipes");
    await expect(page.getByTestId("equipe-orga")).toBeVisible();
    await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  });
});

// ─── Planning ────────────────────────────────────────────────────────────────

test.describe("B2 : Planning (plannings, Sans compte)", () => {
  // Retours du 06/10/2026 : plus d'onglet Import (ni import du Sheet, ni reprise du petit déj).
  test("admin : tous les plannings et Sans compte, sans Import", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning");
    await expect(page).toHaveURL(/\/back-office\/planning\/culte\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Planning" })).toBeVisible();
    await expect(sousParties(page).getByRole("link")).toHaveText(["Plannings", "Sans compte"]);
    await expect(plannings(page).getByRole("link")).toHaveText(["Culte Franco", "Prépa. Table", "Groupes", "EDD", "Campus", "Intergroupe", "Interfranco"]);

    await sousParties(page).getByRole("link", { name: "Sans compte" }).click();
    await expect(page.getByRole("heading", { name: /Planning sans compte/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Importer|Reprendre les noms/ })).toHaveCount(0);
  });

  test("les routes d'import n'existent plus, même interrupteur ouvert", async ({ request }) => {
    for (const route of ["/api/admin/importer-planning", "/api/equipes/importer", "/api/admin/reprendre-petit-dej"]) {
      const reponse = await request.post(`${route}/`, { data: {} });
      expect(reponse.status(), route).toBe(404);
    }
  });

  test("qui remplit le Culte : son planning seul, la grille ouverte en modification, l'export", async ({ page }) => {
    await ouvrir(page, ECRIVAIN, "/back-office/planning");
    await expect(page).toHaveURL(/\/back-office\/planning\/culte\/?$/);
    await expect(plannings(page).getByRole("link")).toHaveText(["Culte Franco"]);
    await expect(page.getByRole("link", { name: "Import" })).toHaveCount(0);
    // Pas de « Modifier » à toucher d'abord : les cases sont déjà des boutons.
    await expect(laCase(page, "2026-09-27", "presidence").getByRole("button")).toHaveText("Président J.");
    await expect(laCase(page, "2026-09-20", "guitare").getByRole("button", { name: /Choisir/ })).toBeVisible();
    await expect(page.locator('[data-grille="culte"]').getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Exporter (modèle du Sheet)" })).toBeVisible();
  });

  test("qui publie le Groupe Paix : les groupes seuls, et « Publier le T… » ici (plus dans Notifier)", async ({ page }) => {
    await ouvrir(page, NOTIFY, "/back-office/planning");
    await expect(page).toHaveURL(/\/back-office\/planning\/groupes\/?$/);
    await expect(plannings(page).getByRole("link")).toHaveText(["Groupes"]);
    // Le trimestre suivant, pas encore publié (cadenas) : « Publier le T4 ».
    await page.getByRole("button", { name: /^T4/ }).click();
    await expect(page.getByRole("button", { name: "Publier le T4" })).toBeVisible();
  });

  test("dans l'App, qui publie ne trouve ni « Publier le T… » ni export", async ({ page }) => {
    await ouvrir(page, NOTIFY, "/planning/groupes");
    await expect(page.locator('[data-grille]')).toBeVisible();
    await expect(page.getByRole("button", { name: /^T4/ }), "le brouillon ne se montre qu'au Back-Office").toHaveCount(0);
    await expect(page.getByRole("button", { name: /^(Publier|Masquer) le T\d/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
  });

  test("un planning qu'on ne remplit ni ne publie n'est pas dans le Back-Office", async ({ page }) => {
    await ouvrir(page, ECRIVAIN, "/back-office/planning/groupes");
    await expect(page.locator("[data-grille]")).toHaveCount(0);
    await expect(page.getByText("Page réservée aux responsables de ce planning.")).toBeVisible();
  });

  test("dans l'App, le planning se lit : ni case à remplir, ni export, même pour qui le remplit", async ({ page }) => {
    await ouvrir(page, ECRIVAIN, "/planning/culte");
    await expect(laCase(page, "2026-09-27", "presidence")).toHaveText("Président J.");
    await expect(laCase(page, "2026-09-27", "presidence").getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
  });

  test("dans l'App, l'onglet Table : la carte Petit déj et la carte compacte de la Table, sans grille", async ({ page }) => {
    await ouvrir(page, ADMIN, "/planning/table");
    await expect(page.getByRole("region", { name: "Petit déj" })).toBeVisible();
    const table = page.getByRole("region", { name: "Prépa. Table du Seigneur" });
    await expect(table).toContainText("Membre A., Membre B.");
    await expect(table, "le prochain dimanche seulement").not.toContainText("Membre C.");
    await expect(page.locator("[data-grille]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
  });

  test("dans le Back-Office, la Table est la grille, sans la carte Petit déj", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning/table");
    await expect(page.locator('[data-grille="table"]')).toBeVisible();
    await expect(laCase(page, "2026-09-27", "equipe").getByRole("button")).toBeVisible();
    await expect(page.getByRole("region", { name: "Petit déj" })).toHaveCount(0);
  });
});

// ─── Anciennes adresses, Moi et menu du compte ─────────────────────────────

test.describe("B2 : anciennes adresses et menus", () => {
  test("/admin mène au tableau de bord, /notifier à Messages › Notifier", async ({ page }) => {
    await ouvrir(page, ADMIN, "/admin");
    await expect(page).toHaveURL(/\/back-office\/?$/);
    await page.goto("/notifier");
    await expect(page).toHaveURL(/\/back-office\/messages\/notifier\/?$/);
  });

  test("Moi n'a plus Notifier ni Administration", async ({ page }) => {
    await ouvrir(page, ADMIN, "/moi");
    await expect(page.getByRole("link", { name: "Mon profil" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Notifier" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("ordinateur : le menu du compte n'a plus Notifier ni Administration", async ({ page }) => {
    test.skip(test.info().project.name !== "ordinateur", "menu du compte du pied de la barre latérale : ordinateur");
    await ouvrir(page, ADMIN, "/songs");
    await page.getByRole("searchbox").waitFor();
    // En développement, l'indicateur de Next couvre l'initiale du pied (il n'existe pas en ligne).
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.getByTestId("barre-laterale").getByTestId("pied-barre").getByRole("button", { name: "Compte" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem", { name: "Mon profil" })).toBeVisible();
    await expect(menu.getByRole("menuitem", { name: "Notifier" })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "Admin" })).toHaveCount(0);
  });
});

// ─── Captures, regardées à l'œil (trois appareils) ─────────────────────────

test("captures : Planning, Équipes, Messages au Back-Office ; la Table dans l'App", async ({ page }, info) => {
  const dossier = "test-results/back-office-captures";
  const capture = (nom: string) => page.screenshot({ path: `${dossier}/b2-${nom}-${info.project.name}.png` });
  await ouvrir(page, ADMIN, "/back-office/planning/culte");
  await expect(laCase(page, "2026-09-27", "presidence").getByRole("button")).toBeVisible();
  await capture("planning-culte");
  await page.goto("/back-office/equipes");
  await expect(page.getByTestId("equipe-orga")).toBeVisible();
  await capture("equipes");
  await page.goto("/back-office/messages");
  await expect(page.getByRole("heading", { name: "Signalements" })).toBeVisible();
  await capture("messages");
  await page.goto("/planning/table");
  await expect(page.getByRole("region", { name: "Prépa. Table du Seigneur" })).toContainText("Membre A., Membre B.");
  await capture("app-table");
});

// ═══ B3 — Tâches et Évènements ═══════════════════════════════════════════════
// `/back-office/taches[/pôle]` ; `/taches` = « À faire pour moi » ; Évènements ·
// Scène (écran de U1) ; Réunions, entrée à part depuis l'agencement v18 (B15) ; nouveau, fiche de gestion, modifier ;
// redirections ; « Gérer dans le Back-Office » sur la fiche de l'App (Q14).

const COORD: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
const DA_ORG: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };
const DA_MEMBRE: FakeProfile = { uid: "uid-dora", email: "dora@example.com", firstName: "Dora", lastName: "P.", poles: ["da"] };
const ANNONCEUR: FakeProfile = { uid: "uid-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "B.", annonces: ["Culte Francophone"] };
/** Musicien : le pôle Louange implicite, sans être responsable (question 2). */
const MUSICIEN: FakeProfile = { uid: "uid-mu", email: "mu@example.com", firstName: "Léo", lastName: "V.", serviceRoles: { "Culte Francophone": ["musicien"] } };
const REFERENTE: FakeProfile = { uid: "uid-ref", email: "ref@example.com", dansEquipes: ["regie"], referentDe: ["regie"] };

const EV = {
  titre: "", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "14:00", heureFin: "", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: null, inscriptions: "auto", inscriptionOuverte: true,
  sansCompte: false, contact: "", organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const REU = { ...EV, type: "eglise", pour: "pole:da", inscriptions: "fermees", inscriptionOuverte: false, lieu: "Salle 2", heure: "20:00", organisateurUid: "uid-bruno", organisateurNom: "Bruno M." };
const DOCS_EV: Record<string, Record<string, unknown>> = {
  "evenements/fete": { ...EV, titre: "Fête de rentrée" },
  "evenements/culte": { ...EV, titre: "Repas du culte", pour: "Culte Francophone", date: "2026-10-24", organisateurUid: "uid-hugo", organisateurNom: "Hugo B." },
  "evenements/reu-da": { ...REU, titre: "Réunion DA", date: "2026-10-10" },
  "evenements/reu-da-sept": { ...REU, titre: "Réunion DA", date: "2026-09-05", compteRendu: { url: "https://docs.google.com/document/d/x", parUid: "uid-bruno", parNom: "Bruno M.", le: "2026-09-06T10:00:00Z" } },
  "evenements/reu-media": { ...REU, titre: "Réunion Média", pour: "pole:media", organisateurUid: "uid-marc", organisateurNom: "Marc V." },
};
const TACHE = {
  pole: "da", titre: "Fond PPT", responsableUid: null, responsableNom: "", echeance: "2026-10-06",
  repetition: null, lien: "", note: "", prevenir: null, auteurUid: "uid-bruno",
  createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
};

/** Ouvre `to` le lundi 5 octobre 2026 à 10:00, après une connexion sur `/moi` (une adresse
 *  qui redirige ne se laisse pas attendre par `signInAs`). */
async function ouvrirB3(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = DOCS_EV) {
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, qui, docs, "/moi");
  await page.goto(to);
  return db;
}

// Agencement v18 (B15) : les réunions ont leur entrée ; Évènements garde Évènements · Scène.
test("sousPartiesEvenements : Évènements, Scène selon les droits (table Q2)", () => {
  const u = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
  expect(sousPartiesEvenements(u(ADMIN), null)).toEqual(["evenements", "scene"]);
  expect(sousPartiesEvenements(u(COORD), COORD)).toEqual(["evenements", "scene"]);
  expect(sousPartiesEvenements(u(ANNONCEUR), ANNONCEUR)).toEqual(["evenements"]);
  expect(sousPartiesEvenements(u(DA_ORG), DA_ORG)).toEqual([]);
  expect(sousPartiesEvenements(u(REFERENTE), REFERENTE)).toEqual([]);
  expect(sousPartiesEvenements(null, null)).toEqual([]);
});

test.describe("B3 : Tâches", () => {
  test("un membre du pôle DA : Tâches mène à son pôle, où les tâches se gèrent", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/back-office/taches", { "poles/da/taches/t1": TACHE });
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tâches" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "DA" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouvelle tâche" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Fond PPT/ })).toBeVisible();
    // Un seul pôle : pas de contrôle segmenté.
    await expect(sousParties(page)).toHaveCount(0);
  });

  test("admin : un onglet par pôle, dans l'ordre", async ({ page }) => {
    await ouvrirB3(page, ADMIN, "/back-office/taches/media");
    await expect(sousParties(page).getByRole("link")).toHaveText(["DA", "Média", "Orga", "Louange", "Événement"]);
    await expect(sousParties(page).getByRole("link", { name: "Média" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 2, name: "Média" })).toBeVisible();
  });

  test("ancienne adresse : /taches/da mène à Back-Office › Tâches › DA", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/taches/da");
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
    await expect(page.getByRole("heading", { level: 2, name: "DA" })).toBeVisible();
  });

  test("App : /taches = « À faire pour moi », et une ligne vers les tâches des pôles pour un responsable", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/taches", { "poles/da/taches/t1": TACHE });
    await expect(page.getByRole("heading", { name: "À faire pour moi" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Fond PPT/ })).toBeVisible();
    // Plus de liste des pôles dans l'App.
    await expect(page.getByRole("link", { name: "DA", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Les tâches des pôles/ })).toHaveAttribute("href", /^\/back-office\/taches\/?$/);
  });

  test("App : un musicien (pôle Louange implicite) coche ses tâches, sans ligne vers le Back-Office", async ({ page }) => {
    await ouvrirB3(page, MUSICIEN, "/taches", { "poles/louange/taches/t1": { ...TACHE, pole: "louange", titre: "Envoyer la setlist" } });
    await expect(page.getByRole("checkbox", { name: /Envoyer la setlist/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Les tâches des pôles/ })).toHaveCount(0);
  });

  test("liens de la cloche : une tâche confiée ou terminée ouvre « À faire pour moi »", () => {
    // Une page de pôle est au Back-Office, fermée à qui n'est pas responsable (un musicien du pôle Louange).
    for (const route of ["src/app/api/taches/assigne/route.ts", "src/app/api/taches/fait/route.ts"]) {
      const code = readFileSync(route, "utf8");
      expect(code).not.toMatch(/url ?[:=] ?`\/taches\/\$\{/);
      expect(code).toMatch(/url ?[:=] ?"\/taches"/);
    }
  });
});

test.describe("B3 : Évènements", () => {
  test("coordination : Évènements · Pâques · Noël ; ses évènements, sans les réunions", async ({ page }) => {
    await ouvrirB3(page, COORD, "/back-office/evenements");
    await expect(page.getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
    await expect(sousParties(page).getByRole("link")).toHaveText(["Évènements", "Pâques", "Noël"]);
    await expect(sousParties(page).getByRole("link", { name: "Évènements" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: /Fête de rentrée/ })).toHaveAttribute("href", /^\/back-office\/evenements\/fete\/?$/);
    await expect(page.getByRole("link", { name: /Repas du culte/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Réunion (DA|Média)/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
  });

  test("droit d'annonces : seulement les évènements qu'il organise, sans sous-parties", async ({ page }) => {
    await ouvrirB3(page, ANNONCEUR, "/back-office/evenements");
    await expect(page.getByRole("link", { name: /Repas du culte/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fête de rentrée/ })).toHaveCount(0);
    await expect(sousParties(page)).toHaveCount(0);
  });

  test("membre du pôle DA : Réunions montre les réunions de son pôle", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/back-office/reunions");
    await expect(page.getByRole("link", { name: /Réunion DA/ }).first()).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/?$/);
    await expect(page.getByRole("link", { name: /Réunion Média/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Fête de rentrée/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nouvelle réunion" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?$/);
  });

  test("fiche d'une réunion au Back-Office : en-tête de la planche, Modifier, Dupliquer pour la prochaine, cartes", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/back-office/reunions/reu-da");
    await expect(page.getByText("Réunion de pôle · DA")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Réunion DA", exact: true })).toBeVisible();
    await expect(page.getByText(/organisée par Bruno M\./)).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/modifier\/?$/);
    await expect(page.getByRole("link", { name: "Dupliquer pour la prochaine" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?from=reu-da$/);
    await expect(page.getByRole("region", { name: "Compte rendu", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Réunions précédentes" })).toBeVisible();
  });

  // Relecture du lot U6 : on reste dans l'espace où l'on est.
  test("fiche d'une réunion au Back-Office : une date des « Réunions précédentes » ouvre sa fiche au Back-Office", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/back-office/reunions/reu-da");
    const precedente = page.getByRole("region", { name: "Réunions précédentes" }).getByRole("link", { name: "5 sept.", exact: true });
    await expect(precedente).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da-sept\/?$/);
    await precedente.click();
    await expect(page).toHaveURL(/\/back-office\/reunions\/reu-da-sept\/?$/);
    await expect(page.getByRole("link", { name: "Dupliquer pour la prochaine" })).toBeVisible();
  });

  test("fiche d'une réunion d'équipe au Back-Office : « Réunion d'équipe · Régie » (nom court de l'équipe)", async ({ page }) => {
    await ouvrirB3(page, REFERENTE, "/back-office/reunions/reu-regie", {
      ...DOCS_EV,
      "evenements/reu-regie": { ...REU, titre: "Réunion Régie", pour: "equipe:regie", organisateurUid: "uid-ref", organisateurNom: "Rose T." },
    });
    await expect(page.getByRole("heading", { name: "Réunion Régie", exact: true })).toBeVisible();
    await expect(page.getByText("Réunion d'équipe · Régie", { exact: true })).toBeVisible();
  });

  test("supprimer une réunion supprime aussi ses sujets", async ({ page }) => {
    const sujet = (texte: string, ordre: number) => ({
      texte, auteurUid: "uid-dora", auteurNom: "Dora P.", creeLe: "2026-10-01T09:00:00Z", ordre, traite: false, reprisDans: null, repriseDe: null,
    });
    const db = await ouvrirB3(page, DA_ORG, "/back-office/reunions/reu-da", {
      ...DOCS_EV, "evenements/reu-da/sujets/s1": sujet("Affiche", 0), "evenements/reu-da/sujets/s2": sujet("Budget", 1),
    });
    await expect(page.getByRole("region", { name: /^Sujets/ }).getByText("Budget")).toBeVisible();
    // Agencement v18 (B4) : Supprimer est dans « ⋯ ».
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(page).toHaveURL(/\/back-office\/reunions\/?$/);
    expect(db.writes.filter((w) => w.method === "DELETE").map((w) => w.path).sort())
      .toEqual(["evenements/reu-da", "evenements/reu-da/sujets/s1", "evenements/reu-da/sujets/s2"]);
  });

  test("supprimer : un refus le dit, et la fiche reste", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/back-office/reunions/reu-da");
    await expect(page.getByRole("heading", { name: "Réunion DA", exact: true })).toBeVisible();
    // Posée après la base simulée, cette route passe avant elle.
    await page.route(/\/documents\/evenements\/reu-da$/, (route) => route.request().method() === "DELETE"
      ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refusé" } }) })
      : route.fallback());
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(page.getByRole("alert").filter({ hasText: "Suppression impossible. Réessaie." })).toBeVisible();
    await expect(page).toHaveURL(/\/back-office\/reunions\/reu-da\/?$/);
  });

  test("une réunion n'est jamais une « Info » : pas de catégorie Info, la date reste demandée", async ({ page }) => {
    await ouvrirB3(page, COORD, "/back-office/evenements/nouveau");
    const categorie = page.getByLabel("Catégorie");
    await categorie.selectOption("info");
    await expect(page.getByLabel("Date", { exact: true })).toHaveCount(0);
    // Passer à une réunion de pôle : la catégorie quitte « Info », la date revient.
    await page.getByLabel("Public").selectOption("pole:evenement");
    await expect(categorie).not.toHaveValue("info");
    await expect(categorie.locator('option[value="info"]')).toHaveCount(0);
    await expect(page.getByLabel("Date", { exact: true })).toBeVisible();
    // « Nouvelle réunion » : pas d'Info non plus.
    await page.goto("/back-office/reunions/nouvelle");
    await expect(page.getByLabel("Catégorie").locator('option[value="loisir"]')).toHaveCount(1);
    await expect(page.getByLabel("Catégorie").locator('option[value="info"]')).toHaveCount(0);
  });

  test("fiche d'une réunion au Back-Office : un autre membre du pôle a les cartes, sans Modifier", async ({ page }) => {
    await ouvrirB3(page, DA_MEMBRE, "/back-office/reunions/reu-da");
    await expect(page.getByRole("heading", { name: "Réunion DA", exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Dupliquer pour la prochaine" })).toHaveCount(0);
  });

  test("fiche d'un évènement au Back-Office : Modifier, Dupliquer, Supprimer ramène à la liste", async ({ page }) => {
    const db = await ouvrirB3(page, COORD, "/back-office/evenements/fete");
    // Agencement v18 (B3) : « Modifier » à côté du titre, Dupliquer et Supprimer dans « ⋯ ».
    const gestion = page.getByTestId("fiche-gestion");
    await expect(gestion.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", /^\/back-office\/evenements\/fete\/modifier\/?$/);
    await gestion.getByRole("button", { name: "Plus d'actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Dupliquer" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(page).toHaveURL(/\/back-office\/evenements\/?$/);
    expect(db.writes.some((w) => w.method === "DELETE" && w.path === "evenements/fete")).toBe(true);
  });

  test("créer au Back-Office : la fiche de gestion s'ouvre ensuite", async ({ page }) => {
    await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
    const db = await ouvrirB3(page, COORD, "/back-office/evenements/nouveau");
    await page.getByLabel("Nom de l'évènement").fill("Pique-nique");
    // U9 (B1) : « Toute l'église » avant 2027 s'écrit dans le Sheet.
    await page.getByLabel("Date", { exact: true }).fill("2027-01-30");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    await expect(page.getByTestId("fiche-gestion")).toContainText("Pique-nique");
    expect(db.writes.find((w) => w.method === "POST" && w.path.startsWith("evenements/"))?.data).toMatchObject({ titre: "Pique-nique" });
  });

  test("« Nouvelle réunion » propose seulement les réunions", async ({ page }) => {
    await ouvrirB3(page, COORD, "/back-office/reunions/nouvelle");
    await expect(page.getByLabel("Public")).toBeVisible();
    const publics = await page.getByLabel("Public").locator("option").allTextContents();
    expect(publics.length).toBeGreaterThan(0);
    expect(publics.every((p) => p.startsWith("Pôle ") || p.startsWith("TEAM"))).toBe(true);
    await expect(page.getByRole("radiogroup", { name: "Inscriptions" })).toHaveCount(0);
  });

  test("modifier au Back-Office : enregistrer ramène à la fiche de gestion", async ({ page }) => {
    const db = await ouvrirB3(page, COORD, "/back-office/evenements/fete/modifier");
    await page.getByLabel("Nom de l'évènement").fill("Fête de la rentrée");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/fete\/?$/);
    expect(db.doc("evenements/fete")).toMatchObject({ titre: "Fête de la rentrée" });
  });

  test("anciennes adresses : nouveau (avec ?from=) et modifier mènent au Back-Office", async ({ page }) => {
    await ouvrirB3(page, COORD, "/evenements/nouveau?from=fete");
    await expect(page).toHaveURL(/\/back-office\/evenements\/nouveau\/?\?from=fete$/);
    await page.goto("/evenements/fete/modifier");
    await expect(page).toHaveURL(/\/back-office\/evenements\/fete\/modifier\/?$/);
  });

  test("App : la fiche garde l'inscription ; « Gérer dans le Back-Office » pour qui la gère, sans Modifier ni Supprimer", async ({ page }) => {
    await ouvrirB3(page, COORD, "/evenements/fete");
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toHaveAttribute("href", /^\/back-office\/evenements\/fete\/?$/);
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Dupliquer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Supprimer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "S'inscrire" })).toBeVisible();
  });

  test("App : un membre de la réunion qui ne la gère pas n'a pas « Gérer dans le Back-Office »", async ({ page }) => {
    await ouvrirB3(page, DA_MEMBRE, "/evenements/reu-da");
    await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toHaveCount(0);
  });

  test("App : « Nouvel évènement » du calendrier ouvre le formulaire du Back-Office", async ({ page }) => {
    await ouvrirB3(page, COORD, "/evenements");
    await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
  });

  // Pâques · Noël, P7 (docs/spec-scene-paques-noel.md) : l'onglet de la fête, sa saison et son ordre de passage.
  test("Scène : la saison de la fête est au Back-Office ; l'App garde les réservations", async ({ page }) => {
    const NOEL = { nom: "Noël 2026", jourJ: "2026-12-24", debut: "2026-10-01", fin: "2026-12-20", ouvert: true, visible: false, passages: [], createdBy: "uid-alice", updatedAt: "2026-10-01T10:00:00Z",
      jours: [6, 0], plages: [{ jour: 6, debut: "10:00", fin: "12:00" }, { jour: 0, debut: "14:00", fin: "19:00" }], duree: 60, quiAutorises: [] };
    await ouvrirB3(page, COORD, "/back-office/evenements/scene", { "programmes/noel": NOEL });
    await expect(sousParties(page).getByRole("link", { name: "Noël" })).toHaveAttribute("aria-current", "page");
    // P8-P9 : une saison lancée s'ouvre sur ses réservations ; la saison est à un toucher.
    await page.getByRole("region", { name: "Cette fête" }).getByRole("button", { name: /^Saison/ }).click();
    await expect(page.getByRole("heading", { name: "Saison de Noël 2026" })).toBeVisible();
    await expect(page.getByText("Réservations lancées")).toBeVisible();
    await page.goto("/evenements/scene");
    await expect(page.getByRole("heading", { name: "Noël 2026" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saison de Noël 2026" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toHaveAttribute("href", /^\/back-office\/evenements\/scene\/noel\/?$/);
  });

  test("Scène : réservée à la coordination", async ({ page }) => {
    await ouvrirB3(page, DA_ORG, "/back-office/evenements/scene");
    await expect(page.getByText("Réservé à la coordination.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nouveau programme" })).toHaveCount(0);
  });

  test("en 中文 : la fiche d'une réunion au Back-Office", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrirB3(page, DA_ORG, "/back-office/reunions/reu-da");
    await expect(page.getByText("部门会议 · 美工")).toBeVisible();
    await expect(page.getByRole("link", { name: "复制为下一次" })).toBeVisible();
  });
});

test("captures B3 : Tâches, Évènements, Réunions, fiche d'une réunion, Scène", async ({ page }, info) => {
  const dossier = "test-results/back-office-captures";
  const capture = (nom: string) => page.screenshot({ path: `${dossier}/b3-${nom}-${info.project.name}.png`, fullPage: true });
  await ouvrirB3(page, ADMIN, "/back-office/taches/da", { ...DOCS_EV, "poles/da/taches/t1": TACHE });
  await expect(page.getByRole("checkbox", { name: /Fond PPT/ })).toBeVisible();
  await capture("taches");
  await page.goto("/back-office/evenements");
  await expect(page.getByRole("link", { name: /Fête de rentrée/ })).toBeVisible();
  await capture("evenements");
  await page.goto("/back-office/reunions");
  await expect(page.getByRole("link", { name: /Réunion Média/ })).toBeVisible();
  await capture("reunions");
  await page.goto("/back-office/reunions/reu-da");
  await expect(page.getByRole("region", { name: "Réunions précédentes" })).toBeVisible();
  await capture("reunion");
  await page.goto("/taches");
  await expect(page.getByRole("link", { name: /Les tâches des pôles/ })).toBeVisible();
  await capture("app-taches");
});
