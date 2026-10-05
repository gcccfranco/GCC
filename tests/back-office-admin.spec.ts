import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { planningsDuBackOffice } from "../src/lib/access";

// Lot U6 (docs/spec-back-office.md), tranche B2 — l'Admin fusionnée dans le
// Back-Office (table Q3, adresses Q4) : Planning (plannings en modification
// directe, Import, Sans compte), Équipes (Organigramme, Personnes, Inscriptions,
// Import), Messages (Réception, Notifier, Questionnaire) ; `/admin` et
// `/notifier` redirigent ; Moi et le menu du compte perdent Notifier et
// Administration ; le planning de l'App passe en lecture (Q14), l'onglet Table y
// montre la carte Petit déj et la carte compacte « Prépa. Table du Seigneur ».

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Paul W.", "Christelle Z.", "Inès L.", "Ruth K.", "", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "", ""],
  ["27/09", "Jonathan Z.", "Daniela W.", "Alice Q.", "Eva C.", "Christelle C.", "Yiyi C.", "Lorenzo S.", "Denis F.", "Belka", "", "", ""],
]);
// Onglet Franco_Table_PtD : la date en colonne 1, l'équipe dans les colonnes 2 à 5.
const TABLE = csv([
  ["", "PRÉPARATION TABLE"],
  ["", "20/09", "Charlie", "Isabelle"],
  ["", "27/09", "Lydie", "Samuel"],
  ["", "04/10", "Ruth", "Marc"],
]);

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Remplit le Culte Franco, rien d'autre. */
const ECRIVAIN: FakeProfile = { uid: "uid-ecr", email: "ecr@example.com", firstName: "Christelle", lastName: "Z.", planningName: "Christelle Z.", plannings: ["culte"] };
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

test.describe("B2 : Équipes (Organigramme, Personnes, Inscriptions, Import)", () => {
  test("admin : l'organigramme se modifie ici ; Personnes, Inscriptions, Import à côté", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes");
    await expect(page.getByRole("heading", { level: 1, name: "Équipes" })).toBeVisible();
    await expect(sousParties(page).getByRole("link")).toHaveText(["Organigramme", "Personnes", "Inscriptions", "Import"]);
    await expect(page.getByTestId("equipe-orga").getByRole("button", { name: "Modifier" })).toBeVisible();

    await sousParties(page).getByRole("link", { name: "Personnes" }).click();
    await expect(page).toHaveURL(/\/back-office\/equipes\/personnes\/?$/);
    await expect(page.getByPlaceholder(/Rechercher un membre/)).toBeVisible();

    await sousParties(page).getByRole("link", { name: "Inscriptions" }).click();
    await expect(page.getByRole("heading", { name: "Inscriptions" })).toBeVisible();

    await sousParties(page).getByRole("link", { name: "Import" }).click();
    await expect(page.getByRole("button", { name: "Importer l'organigramme du Sheet" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Recalculer depuis l'organigramme" })).toBeVisible();
  });

  test("droit Équipes sans être admin : l'organigramme seul, Personnes réservée", async ({ page }) => {
    await ouvrir(page, EQUIPIER, "/back-office/equipes");
    await expect(page.getByTestId("equipe-orga").getByRole("button", { name: "Modifier" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Personnes" })).toHaveCount(0);
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

test.describe("B2 : Planning (plannings, Import, Sans compte)", () => {
  test("admin : tous les plannings, Import et Sans compte", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/planning");
    await expect(page).toHaveURL(/\/back-office\/planning\/culte\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Planning" })).toBeVisible();
    await expect(sousParties(page).getByRole("link")).toHaveText(["Plannings", "Import", "Sans compte"]);
    await expect(plannings(page).getByRole("link")).toHaveText(["Culte Franco", "Prépa. Table", "Groupes", "EDD", "Campus", "Intergroupe", "Interfranco"]);

    await sousParties(page).getByRole("link", { name: "Import" }).click();
    await expect(page.getByRole("button", { name: "Importer le Culte Franco depuis le Google Sheet" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reprendre les noms du petit déj" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Planning sans compte/ })).toHaveCount(0);

    await sousParties(page).getByRole("link", { name: "Sans compte" }).click();
    await expect(page.getByRole("heading", { name: /Planning sans compte/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Importer le Culte Franco/ })).toHaveCount(0);
  });

  test("qui remplit le Culte : son planning seul, la grille ouverte en modification, l'export", async ({ page }) => {
    await ouvrir(page, ECRIVAIN, "/back-office/planning");
    await expect(page).toHaveURL(/\/back-office\/planning\/culte\/?$/);
    await expect(plannings(page).getByRole("link")).toHaveText(["Culte Franco"]);
    await expect(page.getByRole("link", { name: "Import" })).toHaveCount(0);
    // Pas de « Modifier » à toucher d'abord : les cases sont déjà des boutons.
    await expect(laCase(page, "2026-09-27", "presidence").getByRole("button")).toHaveText("Jonathan Z.");
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
    await expect(laCase(page, "2026-09-27", "presidence")).toHaveText("Jonathan Z.");
    await expect(laCase(page, "2026-09-27", "presidence").getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Modifier", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
  });

  test("dans l'App, l'onglet Table : la carte Petit déj et la carte compacte de la Table, sans grille", async ({ page }) => {
    await ouvrir(page, ADMIN, "/planning/table");
    await expect(page.getByRole("region", { name: "Petit déj" })).toBeVisible();
    const table = page.getByRole("region", { name: "Prépa. Table du Seigneur" });
    await expect(table).toContainText("Charlie, Isabelle");
    await expect(table, "le prochain dimanche seulement").not.toContainText("Lydie");
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
    await expect(page.getByRole("link", { name: "Mon profil" })).toBeVisible();
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
  await expect(page.getByRole("region", { name: "Prépa. Table du Seigneur" })).toContainText("Charlie, Isabelle");
  await capture("app-table");
});
