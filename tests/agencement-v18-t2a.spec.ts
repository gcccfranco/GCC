import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { notifie, presidentGroupe, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, interdireDialoguesNatifs, repondreDansLeSite } from "./helpers/agencement";
import { droitsDesPages, entreesBackOffice, sousPartiesEvenements, widgetsPermis } from "../src/lib/access";
import { entreesBarre } from "../src/lib/navigation";
import { raccourcisPermis } from "../src/lib/tableauDeBord/donnees";
import type { UserProfile } from "../src/types/user";

// Agencement v18 (docs/spec-agencement-v18.md), tranche T2a — l'entrée Réunions (B15) :
// (neuf entrées au menu du Back-Office jusqu'à la piste A, BO1 : Réunions et Évènements n'en sont plus, leurs
// pages gardent leur adresse et leurs droits, `droitsDesPages`) ; Évènements = admin,
// coordination ou droit d'annonces ; Réunions = admin, un pôle (Louange compris), référent
// ou membre d'une équipe ; adresses `/back-office/reunions/*` qui montent les composants
// d'aujourd'hui ; les trois anciennes adresses redirigent ; « Plus », la barre du bas et sa
// feuille ; le rail d'Évènements perd « Réunions » ; libellés FR et 中文. Personnes fictives.
// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md, EQ-B) : le pôle DA devient
// TEAM DA, dont Bruno est référent ; un référent gagne Tâches et Évènements (décision 43). Qui n'a que
// Réunions, sans Évènements : un responsable membre d'une équipe, non référent (NOTIFY_EQUIPE).

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** TEAM ÉVÉNEMENTIEL et la coordination (cochée) ; son pôle sert encore aux tâches jusqu'à EQ-C. */
const COORD: FakeProfile = {
  uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", dansEquipes: ["evenementiel", "edd"], referentDe: ["edd"], coordination: true,
};
/** Référent de TEAM DA, sans droit d'annonces ; son pôle sert encore aux tâches jusqu'à EQ-C. */
const DA: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", dansEquipes: ["da"], referentDe: ["da"] };
const ANNONCEUR: FakeProfile = { uid: "uid-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "B.", annonces: ["Culte Francophone"] };
const REFERENTE: FakeProfile = { uid: "uid-ref", email: "ref@example.com", dansEquipes: ["regie"], referentDe: ["regie"] };
/** Responsable (notifier) et membre d'une équipe, sans en être référent. */
const NOTIFY_EQUIPE: FakeProfile = { uid: "uid-ne", email: "ne@example.com", notify: ["Campus"], ...notifie("Campus"), dansEquipes: ["regie"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: p.planningName ?? "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], coordination: p.coordination,
    equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes, referentDe: p.referentDe,
  }) as UserProfile;
const permises = (p: FakeProfile) => entreesBackOffice(user(p), profil(p));

const EV = {
  titre: "", type: "loisir", pour: "eglise", date: "2026-10-17", heure: "14:00", heureFin: "", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: null, inscriptions: "auto", inscriptionOuverte: true,
  sansCompte: false, contact: "", organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const REU = { ...EV, type: "eglise", pour: "equipe:da", inscriptions: "fermees", inscriptionOuverte: false, lieu: "Salle 2", heure: "20:00", organisateurUid: "uid-bruno", organisateurNom: "Bruno M." };
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/fete": { ...EV, titre: "Fête de rentrée" },
  "evenements/reu-da": { ...REU, titre: "Réunion DA", date: "2026-10-10" },
  "evenements/reu-da-sept": { ...REU, titre: "Réunion DA", date: "2026-09-05" },
};

/** Ouvre `to` le lundi 5 octobre 2026, après une connexion sur `/moi` (une adresse qui
 *  redirige ne se laisse pas attendre par `signInAs`). */
async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, qui, docs, "/moi");
  await page.goto(to);
  return db;
}

/** Le menu du Back-Office en grand : la barre latérale (dépliée par-dessus sur l'iPad en paysage). */
async function menuLateral(page: Page, info: TestInfo) {
  if (info.project.name === "tablette-paysage") {
    await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale|展开侧边栏/ }).tap();
    return page.getByTestId("barre-par-dessus").getByRole("navigation", { name: /Navigation principale|主导航/ });
  }
  return page.getByTestId("barre-laterale").getByRole("navigation", { name: /Navigation principale|主导航/ });
}
const barreDuBas = (page: Page) => page.getByTestId("barre-du-bas");
const sousParties = (page: Page) => page.getByRole("navigation", { name: "Sous-parties" });

// ─── Règles pures ────────────────────────────────────────────────────────────────

test.describe("T2a : les droits d'affichage (B15)", () => {
  test("un admin a les cinq entrées de la piste A et ouvre les pages Réunions, Évènements, Tâches", () => {
    expect(permises(ADMIN)).toEqual(["afaire", "calendrier", "planning", "equipes", "messages"]);
    expect(droitsDesPages(user(ADMIN), profil(ADMIN))).toEqual({ taches: true, evenements: true, reunions: true });
  });

  test("membre d'équipe responsable sans droit d'annonces : Réunions, pas Évènements ; droit d'annonces seul : l'inverse ; coordination, référent : les deux", () => {
    const pages = (p: FakeProfile) => droitsDesPages(user(p), profil(p));
    expect(pages(NOTIFY_EQUIPE)).toEqual({ taches: true, evenements: false, reunions: true });
    expect(permises(NOTIFY_EQUIPE)).toEqual(["afaire", "calendrier", "messages"]);
    expect(pages(DA), "référent (décision 43)").toEqual({ taches: true, evenements: true, reunions: true });
    expect(pages(ANNONCEUR)).toEqual({ taches: false, evenements: true, reunions: false });
    expect(pages(COORD)).toEqual({ taches: true, evenements: true, reunions: true });
  });

  test("un référent, ou un responsable membre d'une équipe, a Réunions ; le référent, Tâches et Évènements aussi (décision 43)", () => {
    expect(droitsDesPages(user(REFERENTE), profil(REFERENTE))).toEqual({ taches: true, evenements: true, reunions: true });
    expect(droitsDesPages(user(NOTIFY_EQUIPE), profil(NOTIFY_EQUIPE)).reunions).toBe(true);
    expect(permises(REFERENTE)).toEqual(["afaire", "calendrier"]);
  });

  test("les sous-parties d'Évènements n'ont plus « Réunions »", () => {
    expect(sousPartiesEvenements(user(ADMIN), null)).toEqual(["evenements", "scene"]);
    expect(sousPartiesEvenements(user(COORD), profil(COORD))).toEqual(["evenements", "scene"]);
    expect(sousPartiesEvenements(user(ANNONCEUR), profil(ANNONCEUR))).toEqual(["evenements"]);
    expect(sousPartiesEvenements(user(NOTIFY_EQUIPE), profil(NOTIFY_EQUIPE))).toEqual([]);
    expect(sousPartiesEvenements(user(DA), profil(DA)), "référent (décision 43)").toEqual(["evenements"]);
  });

  test("« Prochains évènements » et le raccourci « Nouvel évènement » suivent Évènements seul (TB2-corrections)", () => {
    // Depuis TB2, les réunions ont leur widget : Réunions seul ne permet plus celui des évènements.
    expect(widgetsPermis(user(NOTIFY_EQUIPE), profil(NOTIFY_EQUIPE))).not.toContain("evenements");
    expect(widgetsPermis(user(NOTIFY_EQUIPE), profil(NOTIFY_EQUIPE))).toContain("reunions");
    expect(widgetsPermis(user(ANNONCEUR), profil(ANNONCEUR))).toContain("evenements");
    expect(raccourcisPermis(user(NOTIFY_EQUIPE), profil(NOTIFY_EQUIPE), {}).map((r) => r.id)).not.toContain("evenement");
    expect(raccourcisPermis(user(DA), profil(DA), {}).map((r) => r.id), "référent (décision 43)").toContain("evenement");
    expect(raccourcisPermis(user(ANNONCEUR), profil(ANNONCEUR), {}).map((r) => r.id)).toContain("evenement");
  });

  test("la barre latérale n'a plus d'entrée Évènements ni Réunions (piste A, BO1) : leurs adresses restent", () => {
    const hrefs = entreesBarre("back-office", { connecte: true, backOffice: true, permises: permises(ADMIN) }).map((e) => e.href);
    expect(hrefs).not.toContain("/back-office/evenements");
    expect(hrefs).not.toContain("/back-office/reunions");
  });
});

// ─── Menu ────────────────────────────────────────────────────────────────────────

test.describe("T2a : le menu", () => {
  test("un admin : cinq entrées ; sur une page Réunions, aucune n'est la page courante (Réunions n'est plus une entrée)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "la barre latérale : grand écran");
    await ouvrir(page, ADMIN, "/back-office/reunions/reu-da");
    await expect(page.getByRole("heading", { name: "Réunion DA", exact: true })).toBeVisible();
    const menu = await menuLateral(page, info);
    await expect(menu.getByRole("link")).toHaveText(["À faire", "Calendrier", "Planning", "Équipes", "Messages"]);
    await expect(menu.locator("[aria-current]")).toHaveCount(0);
  });

  test("membre d'équipe responsable : sa barre du bas (téléphone, tablette portrait) n'a plus Réunions, la page reste joignable", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "la barre du bas : téléphone et tablette en portrait");
    await ouvrir(page, NOTIFY_EQUIPE, "/back-office/reunions");
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["À faire", "Calendrier", "App"]);
    await expect(barreDuBas(page).locator("[aria-current]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
  });

  test("une barre enregistrée avec Évènements est ignorée : la barre est fixe", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "la barre du bas : téléphone et tablette en portrait");
    await ouvrir(page, NOTIFY_EQUIPE, "/back-office", {
      ...DOCS, "backOffice/uid-ne": { barreDuBas: ["tableau", "evenements", "calendrier", "taches"], majLe: "2026-09-30T10:00:00Z" },
    });
    await expect(barreDuBas(page).getByRole("link")).toHaveText(["À faire", "Calendrier", "App"]);
  });

  test("en 中文 : « 会议 » titre sa page (plus d'entrée de menu)", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, ADMIN, "/back-office/reunions");
    await expect(page.getByRole("heading", { level: 1, name: "会议" })).toBeVisible();
  });
});

// ─── Pages et redirections ───────────────────────────────────────────────────────

test.describe("T2a : les adresses /back-office/reunions/*", () => {
  test("la liste : titre « Réunions », sans sous-parties ; ses lignes et « Nouvelle réunion » restent sous Réunions", async ({ page }) => {
    await ouvrir(page, DA, "/back-office/reunions");
    await expect(page.getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
    await expect(sousParties(page)).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Réunion DA/ }).first()).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/?$/);
    await expect(page.getByRole("link", { name: "Nouvelle réunion" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?$/);
    await expect(page.getByRole("link", { name: /Fête de rentrée/ })).toHaveCount(0);
  });

  test("le rail d'Évènements n'a plus « Réunions »", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/evenements");
    await expect(page.getByRole("heading", { level: 1, name: "Évènements" })).toBeVisible();
    await expect(sousParties(page).getByRole("link")).toHaveText(["Évènements", "Pâques", "Noël"]);
  });

  test("la fiche : Modifier, Dupliquer pour la prochaine et les réunions précédentes restent sous Réunions", async ({ page }, info) => {
    await ouvrir(page, DA, "/back-office/reunions/reu-da");
    await expect(page.getByRole("heading", { name: "Réunion DA", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Modifier" })).toHaveAttribute("href", /^\/back-office\/reunions\/reu-da\/modifier\/?$/);
    await expect(page.getByRole("link", { name: "Dupliquer pour la prochaine" })).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?from=reu-da$/);
    await expect(page.getByRole("region", { name: "Réunions précédentes" }).getByRole("link", { name: "5 sept.", exact: true }))
      .toHaveAttribute("href", /^\/back-office\/reunions\/reu-da-sept\/?$/);
    // En un volet, la fiche est une page : « ‹ Réunions » pour seul retour (agencement v18, T2b) ; en grand, la liste est à côté.
    if (!estGrandEcran(info)) {
      await expect(page.locator("header[data-entete-page]").getByRole("link", { name: "Réunions" })).toHaveAttribute("href", /^\/back-office\/reunions\/?$/);
    }
  });

  test("supprimer une réunion ramène à la liste des réunions", async ({ page }) => {
    await ouvrir(page, DA, "/back-office/reunions/reu-da");
    await page.getByRole("button", { name: "Plus d'actions" }).click();
    await page.getByRole("menuitem", { name: "Supprimer" }).click();
    await repondreDansLeSite(page, "Supprimer");
    await expect(page).toHaveURL(/\/back-office\/reunions\/?$/);
  });

  test("créer une réunion : seulement les réunions au choix, puis sa fiche sous Réunions", async ({ page }) => {
    await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
    await ouvrir(page, DA, "/back-office/reunions/nouvelle");
    await expect(page.getByLabel("Public")).toBeVisible();
    const publics = await page.getByLabel("Public").locator("option").allTextContents();
    expect(publics.length).toBeGreaterThan(0);
    expect(publics.every((p) => p.startsWith("TEAM"))).toBe(true);
    await page.getByLabel("Nom de l'évènement").fill("Réunion de rentrée");
    await page.getByLabel("Date", { exact: true }).fill("2026-10-20");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await expect(page).toHaveURL(/\/back-office\/reunions\/fake-\d+\/?$/);
    await expect(page.getByRole("heading", { name: "Réunion de rentrée", exact: true })).toBeVisible();
  });

  test("« Annuler » dans « Nouvelle réunion » ramène à la liste des réunions", async ({ page }) => {
    await ouvrir(page, DA, "/back-office/reunions/nouvelle");
    await page.getByRole("button", { name: "Annuler" }).click();
    await expect(page).toHaveURL(/\/back-office\/reunions\/?$/);
  });

  test("modifier une réunion : enregistrer ramène à sa fiche sous Réunions", async ({ page }) => {
    const db = await ouvrir(page, DA, "/back-office/reunions/reu-da/modifier");
    await page.getByLabel("Nom de l'évènement").fill("Réunion DA d'octobre");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/back-office\/reunions\/reu-da\/?$/);
    expect(db.doc("evenements/reu-da")).toMatchObject({ titre: "Réunion DA d'octobre" });
  });

  test("anciennes adresses : la liste, la fiche d'une réunion et « nouveau?reunion=1 » redirigent", async ({ page }) => {
    await ouvrir(page, DA, "/back-office/evenements/reunions");
    await expect(page).toHaveURL(/\/back-office\/reunions\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
    await page.goto("/back-office/evenements/reu-da");
    await expect(page).toHaveURL(/\/back-office\/reunions\/reu-da\/?$/);
    await expect(page.getByRole("heading", { name: "Réunion DA", exact: true })).toBeVisible();
    await page.goto("/back-office/evenements/nouveau?reunion=1");
    await expect(page).toHaveURL(/\/back-office\/reunions\/nouvelle\/?$/);
    await page.goto("/back-office/evenements/nouveau?reunion=1&from=reu-da");
    await expect(page).toHaveURL(/\/back-office\/reunions\/nouvelle\/?\?from=reu-da$/);
  });

  test("un évènement ouvert sous Réunions repart sous Évènements", async ({ page }) => {
    await ouvrir(page, COORD, "/back-office/reunions/fete");
    await expect(page).toHaveURL(/\/back-office\/evenements\/fete\/?$/);
  });

  test("App : l'adresse d'une réunion mène sous Réunions", async ({ page }) => {
    // Retouches v18, lot G (G2) : plus de fiche de réunion dans l'App, son adresse y renvoie.
    await ouvrir(page, DA, "/evenements/reu-da");
    await expect(page).toHaveURL(/\/back-office\/reunions\/reu-da\/?$/);
  });
});

// ─── Relecture du lot (07/10/2026) ───────────────────────────────────────────────

test.describe("T2a, relecture : là où mènent le widget et le guide", () => {
  /** Les widgets demandés au tableau de bord (par défaut, « Prochains évènements » seul). */
  const avecLeWidget = (p: FakeProfile, ids: string[] = ["evenements"]) => ({
    ...DOCS,
    [`backOffice/${p.uid}`]: { tableauDeBord: ids.map((id) => ({ id, taille: "m", reglages: {} })), versionTableau: 2, majLe: "2026-10-01T09:00:00Z" },
  });
  const widget = (page: Page, nom = "Évènements") => page.getByTestId("grille-widgets").getByRole("region", { name: nom, exact: true });

  test("membre d'équipe responsable (Réunions sans Évènements) : pas de widget Évènements, celui des Réunions mène à ses réunions (TB2-corrections)", async ({ page }) => {
    await ouvrir(page, NOTIFY_EQUIPE, "/back-office", avecLeWidget(NOTIFY_EQUIPE, ["evenements", "reunions"]));
    await expect(widget(page, "Réunions")).toBeVisible();
    await expect(widget(page, "Réunions").getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", /^\/back-office\/reunions\/?$/);
    await expect(widget(page)).toHaveCount(0);
  });

  test("droit d'annonces (Évènements) : « Tout voir » du widget mène aux Évènements", async ({ page }) => {
    // Lot AO : le droit d'annonces d'une section vient de l'organigramme (ici : président du Groupe Bonté).
    const president: FakeProfile = { uid: "uid-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "B.", ...presidentGroupe("bonte") };
    await ouvrir(page, president, "/back-office", avecLeWidget(president));
    await expect(widget(page).getByRole("link", { name: "Tout voir" })).toHaveAttribute("href", /^\/back-office\/evenements\/?$/);
  });

  test("le guide dit que les réunions d'équipe se créent dans Réunions", async ({ page }) => {
    await ouvrir(page, DA, "/guide");
    await expect(page.locator("section#taches")).toContainText("Les réunions d'équipe se créent dans Back-Office › Réunions.");
    await expect(page.locator("section#evenements")).toContainText("Les réunions d'équipe se créent dans Back-Office › Réunions › « Nouvelle réunion ».");
    await expect(page.locator("section#evenements")).not.toContainText("comme les sorties de section et les réunions d'équipe");
  });

  test("en 中文 : le guide dit que les réunions d'équipe se créent dans 会议", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, DA, "/guide");
    await expect(page.locator("section#taches")).toContainText("团队会议请在 后台 › 会议中创建。");
    await expect(page.locator("section#evenements")).toContainText("团队会议请在 后台 › 会议 ›「新建会议」中创建。");
  });
});
