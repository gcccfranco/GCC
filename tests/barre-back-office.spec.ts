import { devices, expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { entreesBackOffice } from "../src/lib/access";
import { barreAffichee, barreDeLaFeuille, barreParDefaut, basculer, listeDeLaFeuille } from "../src/lib/tableauDeBord/barre";
import type { Entree } from "../src/types/backOffice";
import type { UserProfile } from "../src/types/user";

// Lot U6 (docs/spec-back-office.md), tranche B6 — la barre du bas du Back-Office, sur
// téléphone et tablette en portrait : 4 onglets + « Plus » (Q13 : exactement 4, toutes
// s'il y en a moins ; défaut Accueil · Calendrier · Tâches · Planning, complété dans l'ordre
// du menu ; une entrée sans droit n'y figure pas), la page « Plus » (une carte par entrée
// hors barre, contenu selon les droits, pastille ; « Personnaliser la barre », question 9 ;
// « Revenir à l'app »), la feuille « Ta barre du bas » (4 au plus, ordre aux poignées,
// aperçu, « Remettre la barre par défaut », « Terminé »), l'enregistrement dans
// `backOffice/{uid}` (`barreDuBas`, Q5) ; la barre de l'App ne change pas.
// Planches : bo-telephone-accueil, bo-telephone-plus, bo-telephone-barre-perso,
// tablette-portrait-back-office. Aucun nom réel.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Pôle Événement (Réussite 2) : coordination. */
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["evenement"] };
const PLANNINGS: FakeProfile = { uid: "uid-pl", email: "pl@example.com", firstName: "Paul", lastName: "N.", plannings: ["culte"] };
/** Droit de notifier un groupe (Messages › Notifier seulement), et Planning par la publication. */
const NOTIFY: FakeProfile = { uid: "uid-no", email: "no@example.com", firstName: "Nora", lastName: "V.", notify: ["Groupe Paix"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: p.planningName ?? "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], poles: p.poles ?? [],
    equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes, referentDe: p.referentDe,
  }) as UserProfile;
const permises = (p: FakeProfile) => entreesBackOffice(user(p), profil(p));

const estGrandEcran = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
const barre = (page: Page) => page.getByTestId("barre-du-bas");
const onglets = (page: Page) => barre(page).getByRole("link");
const feuille = (page: Page) => page.getByRole("dialog", { name: "Ta barre du bas" });
const ecrituresBO = (db: FakeDb, uid: string) => db.writes.filter((w) => w.path === `backOffice/${uid}`);

async function ouvrir(page: Page, p: FakeProfile, docs: Record<string, Record<string, unknown>> = {}, to = "/back-office") {
  await sansSheet(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const db = await signInAs(page, p, docs, to);
  await expect(onglets(page).first()).toBeVisible();
  return db;
}

async function ouvrirFeuille(page: Page) {
  await barre(page).getByRole("link", { name: "Plus" }).click();
  await expect(page).toHaveURL(/\/back-office\/plus\/?$/);
  await page.getByRole("button", { name: "Personnaliser la barre" }).click();
  await expect(feuille(page)).toBeVisible();
  // La feuille monte du bas : on attend qu'elle soit posée (deux mesures égales).
  let avant = -1;
  await expect.poll(async () => {
    const y = (await feuille(page).boundingBox())?.y ?? -2;
    const pose = y === avant;
    avant = y;
    return pose;
  }, { intervals: [150] }).toBe(true);
}
const caseDe = (page: Page, nom: string) => feuille(page).getByRole("checkbox", { name: nom, exact: true });
const apercu = (page: Page) => feuille(page).getByRole("list", { name: "Aperçu" }).getByRole("listitem");

// ─── Règles pures ────────────────────────────────────────────────────────────────

test.describe("Barre du bas (B6) : règles pures (Q13)", () => {
  test("défaut : Accueil · Calendrier · Tâches · Planning, complété dans l'ordre du menu", () => {
    // Calendrier est une entrée depuis U8 C3 (fusion dans U9).
    expect(barreParDefaut(permises(ADMIN))).toEqual(["tableau", "calendrier", "taches", "planning"]);
    expect(barreParDefaut(["tableau", "calendrier", "planning", "taches", "evenements", "equipes", "messages", "statistiques"]))
      .toEqual(["tableau", "calendrier", "taches", "planning"]);
    // Réussite 2 : Alice n'a que quatre entrées, toutes dans la barre.
    expect(barreParDefaut(permises(ALICE))).toEqual(["tableau", "calendrier", "taches", "evenements"]);
    expect(barreParDefaut(permises(PLANNINGS))).toEqual(["tableau", "calendrier", "planning"]);
    expect(barreParDefaut([])).toEqual([]);
  });

  test("barre enregistrée : son ordre, sans entrée inconnue, en double ni sans droit, complétée jusqu'à 4", () => {
    const admin = permises(ADMIN);
    expect(barreAffichee(undefined, admin), "absente = défaut").toEqual(barreParDefaut(admin));
    expect(barreAffichee(null, admin)).toEqual(barreParDefaut(admin));
    expect(barreAffichee(["messages", "tableau", "equipes", "taches"], admin)).toEqual(["messages", "tableau", "equipes", "taches"]);
    expect(barreAffichee(["messages", "zzz", "messages", 3, "tableau"], admin), "nettoyée puis complétée")
      .toEqual(["messages", "tableau", "calendrier", "planning"]);
    expect(barreAffichee(["equipes", "messages", "tableau", "taches", "planning"], admin), "4 au plus")
      .toEqual(["equipes", "messages", "tableau", "taches"]);
    // Un droit perdu : l'entrée sort, la barre se complète dans l'ordre du menu.
    expect(barreAffichee(["messages", "planning", "equipes", "tableau"], permises(PLANNINGS))).toEqual(["planning", "tableau", "calendrier"]);
    expect(barreAffichee(["evenements", "planning", "tableau"], permises(ALICE))).toEqual(["evenements", "tableau", "calendrier", "taches"]);
    expect(barreAffichee(["tableau"], [])).toEqual([]);
  });

  test("feuille : la barre d'abord, puis les autres entrées permises dans l'ordre du menu ; 4 cochées au plus", () => {
    const admin = permises(ADMIN);
    const liste = listeDeLaFeuille(["evenements", "tableau", "taches", "planning"], admin);
    expect(liste).toEqual(["evenements", "tableau", "taches", "planning", "calendrier", "equipes", "messages"]);
    const cochees: Entree[] = ["evenements", "tableau", "taches", "planning"];
    expect(basculer(cochees, "messages"), "une cinquième : refusée").toEqual(cochees);
    const sansPlanning = basculer(cochees, "planning");
    expect(sansPlanning).toEqual(["evenements", "tableau", "taches"]);
    const avecMessages = basculer(sansPlanning, "messages");
    expect(barreDeLaFeuille(liste, avecMessages), "l'ordre est celui de la liste").toEqual(["evenements", "tableau", "taches", "messages"]);
    expect(barreDeLaFeuille(["messages", ...liste.filter((e) => e !== "messages")], avecMessages))
      .toEqual(["messages", "evenements", "tableau", "taches"]);
  });
});

// ─── Écrans (téléphone et tablette en portrait) ────────────────────────────────────

test.describe("Barre du bas (B6) : la barre", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  test("un admin : Accueil · Calendrier · Tâches · Planning · Plus, Accueil marqué", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"]);
    await expect(barre(page).getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    await expect(barre(page).getByRole("link", { name: "Accueil" })).toHaveAttribute("href", /^\/back-office\/?$/);
    await expect(barre(page).getByRole("link", { name: "Tâches" })).toHaveAttribute("href", /^\/back-office\/taches\/?$/);
    // La liste « Tes modules » de B1 a laissé la place à la barre.
    await expect(page.getByTestId("menu-back-office")).toHaveCount(0);
  });

  test("Réussite 2 : Alice, Accueil · Calendrier · Tâches · Évènements · Plus (pas de Planning)", async ({ page }) => {
    await ouvrir(page, ALICE);
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Évènements", "Plus"]);
  });

  test("la barre de l'App ne change pas, pour un responsable comme pour les autres", async ({ page }) => {
    await ouvrir(page, ADMIN, {}, "/songs");
    await expect(onglets(page)).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
    await expect(barre(page).getByRole("link", { name: "Plus" })).toHaveCount(0);
  });

  test("repli : une entrée enregistrée sans droit n'y figure pas", async ({ page }) => {
    await ouvrir(page, PLANNINGS, { "backOffice/uid-pl": { barreDuBas: ["messages", "planning", "equipes", "tableau"], majLe: "2026-09-30T10:00:00Z" } });
    await expect(onglets(page)).toHaveText(["Planning", "Accueil", "Calendrier", "Plus"]);
  });

  // Relecture du lot U6 : sur un réseau qui accroche, la barre n'attend pas indéfiniment.
  test("la barre enregistrée ne répond pas : la barre par défaut s'affiche au bout de quelques secondes", async ({ page }) => {
    await sansSheet(page);
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, ADMIN, { "backOffice/uid-admin": { barreDuBas: ["tableau", "equipes"], majLe: "2026-09-30T10:00:00Z" } }, "/songs");
    // Posée après la base simulée, cette route passe avant elle : la lecture reste sans réponse.
    await page.route(/\/documents\/backOffice\/uid-admin$/, async (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      await new Promise((r) => setTimeout(r, 30_000));
      await route.fallback().catch(() => {});
    });
    await page.goto("/back-office");
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"], { timeout: 10_000 });
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("une page hors de la barre marque « Plus »", async ({ page }) => {
    await ouvrir(page, ADMIN, {}, "/back-office/equipes");
    await expect(barre(page).getByRole("link", { name: "Plus" })).toHaveAttribute("aria-current", "page");
    await barre(page).getByRole("link", { name: "Tâches" }).click();
    // L'entrée Tâches mène au premier pôle de la personne (B3).
    await expect(page).toHaveURL(/\/back-office\/taches\/da\/?$/);
    await expect(barre(page).getByRole("link", { name: "Tâches" })).toHaveAttribute("aria-current", "page");
    await expect(barre(page).getByRole("link", { name: "Plus" })).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("Barre du bas (B6) : « Plus »", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  test("un admin : une carte par entrée hors barre, selon les droits, avec la pastille de Messages", async ({ page }) => {
    await ouvrir(page, ADMIN, {
      "reports/r1": { kind: "site", title: "Lien mort", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
      "reports/r2": { kind: "site", title: "Réglé", status: "resolved", createdAt: "2026-09-29T10:00:00Z" },
      "songProposals/p1": { title: "Un chant", youtubeUrl: "https://example.com/v", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
    });
    await barre(page).getByRole("link", { name: "Plus" }).click();
    await expect(page.getByRole("heading", { name: "Plus", level: 1 })).toBeVisible();
    await expect(barre(page).getByRole("link", { name: "Plus" })).toHaveAttribute("aria-current", "page");
    const cartes = page.getByTestId("plus-entree");
    await expect(cartes).toHaveCount(3);
    await expect(cartes.filter({ hasText: "Évènements" })).toHaveAttribute("href", /^\/back-office\/evenements\/?$/);
    const equipes = cartes.filter({ hasText: "Équipes" });
    await expect(equipes).toHaveAttribute("href", /^\/back-office\/equipes\/?$/);
    await expect(equipes).toContainText("Organigramme, pôles · personnes et droits");
    const messages = cartes.filter({ hasText: "Messages" });
    await expect(messages).toContainText("Signalements, propositions de chants · notifier · questionnaire");
    await expect(messages.getByTestId("pastille")).toHaveText("2");
    // Ni le tableau de bord, ni une entrée déjà dans la barre.
    await expect(cartes.filter({ hasText: "Tâches" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Personnaliser la barre" })).toBeVisible();
    // Revenir à l'app : la dernière page de l'App, sinon /planning (mémoire du sélecteur).
    await expect(page.getByRole("link", { name: /Revenir à l'app/ })).toHaveAttribute("href", /^\/planning\/?$/);
    await page.getByRole("link", { name: /Revenir à l'app/ }).click();
    await expect(page).toHaveURL(/\/planning\/?$/);
    await expect(onglets(page)).toHaveText(["Chants", "Setlists", "Planning", "Évènements", "Moi"]);
  });

  test("le contenu d'une carte suit les droits : Messages = Notifier seul, sans pastille ; Équipes = Organigramme", async ({ page }) => {
    // Notifier un groupe, le droit Équipes et le pôle DA : sept entrées, trois dans « Plus ».
    await ouvrir(page, { ...NOTIFY, equipes: true, poles: ["da"] });
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"]);
    await barre(page).getByRole("link", { name: "Plus" }).click();
    const cartes = page.getByTestId("plus-entree");
    await expect(cartes).toHaveCount(3);
    const messages = cartes.filter({ hasText: "Messages" });
    await expect(messages).toContainText("Notifier");
    await expect(messages).not.toContainText("Signalements");
    await expect(messages.getByTestId("pastille")).toHaveCount(0);
    const equipes = cartes.filter({ hasText: "Équipes" });
    await expect(equipes).toContainText("Organigramme, pôles");
    await expect(equipes).not.toContainText("personnes");
  });

  test("Alice, ses quatre entrées toujours dans la barre : « Plus » n'a pas de carte d'entrée", async ({ page }) => {
    // Barre enregistrée à deux onglets : complétée jusqu'à toutes ses entrées (Q13).
    await ouvrir(page, ALICE, { "backOffice/uid-alice": { barreDuBas: ["tableau", "evenements"], majLe: "2026-09-30T10:00:00Z" } });
    await expect(onglets(page)).toHaveText(["Accueil", "Évènements", "Calendrier", "Tâches", "Plus"]);
    await barre(page).getByRole("link", { name: "Plus" }).click();
    await expect(page.getByRole("button", { name: "Personnaliser la barre" })).toBeVisible();
    await expect(page.getByTestId("plus-entree")).toHaveCount(0);
  });

  test("la pastille de Tâches compte ce qui est à faire pour soi (Q15)", async ({ page }) => {
    const qui: FakeProfile = { ...ALICE, plannings: ["culte"], equipes: true };
    await ouvrir(page, qui, {
      "backOffice/uid-alice": { barreDuBas: ["tableau", "planning", "evenements", "equipes"], majLe: "2026-09-30T10:00:00Z" },
      "poles/evenement/taches/t1": { titre: "Affiche", responsableUid: "uid-alice", responsableNom: "Alice Q.", echeance: "2026-09-28", repetition: null },
      "poles/evenement/taches/t2": { titre: "Salle", responsableUid: null, responsableNom: "", echeance: "2026-10-05", repetition: null },
      "poles/evenement/taches/t3": { titre: "Courses", responsableUid: "uid-autre", responsableNom: "Pers. B", echeance: "2026-10-05", repetition: null },
    });
    await expect(onglets(page)).toHaveText(["Accueil", "Planning", "Évènements", "Équipes", "Plus"]);
    await barre(page).getByRole("link", { name: "Plus" }).click();
    const taches = page.getByTestId("plus-entree").filter({ hasText: "Tâches" });
    await expect(taches).toHaveAttribute("href", /^\/back-office\/taches\/?$/);
    await expect(taches.getByTestId("pastille")).toHaveText("2");
  });
});

test.describe("Barre du bas (B6) : la feuille « Ta barre du bas »", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  test("entrées permises à cocher, 4 au plus, aperçu, Terminé enregistre la barre seule", async ({ page }) => {
    const disposition = [{ id: "scene", taille: "s", reglages: {} }];
    const db = await ouvrir(page, ADMIN, { "backOffice/uid-admin": { tableauDeBord: disposition, majLe: "2026-09-30T10:00:00Z" } });
    await ouvrirFeuille(page);
    await expect(feuille(page).getByRole("checkbox")).toHaveCount(7);
    for (const nom of ["Accueil", "Calendrier", "Tâches", "Planning"]) await expect(caseDe(page, nom)).toHaveAttribute("aria-checked", "true");
    // La barre d'abord, puis les autres dans l'ordre du menu ; Accueil dit ce qu'il ouvre.
    await expect(feuille(page).getByTestId("ligne-barre")).toHaveText([/Accueil.*tableau de bord/, /Calendrier/, /Tâches/, /Planning/, /Évènements.*\+ scène/, /Équipes/, /Messages/]);
    // 4 cochées : la cinquième est refusée.
    await expect(caseDe(page, "Équipes")).toBeDisabled();
    await expect(apercu(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"]);
    await caseDe(page, "Planning").click();
    await expect(caseDe(page, "Équipes")).toBeEnabled();
    await caseDe(page, "Messages").click();
    await expect(apercu(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Messages", "Plus"]);
    expect(ecrituresBO(db, "uid-admin"), "rien avant Terminé").toHaveLength(0);
    await feuille(page).getByRole("button", { name: "Terminé" }).click();
    await expect(feuille(page)).toBeHidden();
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Messages", "Plus"]);
    await expect.poll(() => db.doc("backOffice/uid-admin")?.barreDuBas).toEqual(["tableau", "calendrier", "taches", "messages"]);
    // Le masque ne touche que la barre : la disposition du tableau de bord reste.
    expect(db.doc("backOffice/uid-admin")!.tableauDeBord).toEqual(disposition);
    expect(db.doc("backOffice/uid-admin")!.majLe).toEqual(expect.stringMatching(/^2026-10-01T/));
    // Planning est passé dans « Plus ».
    await expect(page.getByTestId("plus-entree").filter({ hasText: "Planning" })).toBeVisible();
  });

  test("l'ordre se choisit aux poignées (clavier : Espace, flèches, Espace)", async ({ page }) => {
    const db = await ouvrir(page, ADMIN);
    await ouvrirFeuille(page);
    const poignee = feuille(page).getByRole("button", { name: "Déplacer Planning" });
    // Chaque touche attend l'effet de la précédente : @dnd-kit n'écoute les flèches qu'une fois l'onglet saisi.
    await poignee.focus();
    await page.keyboard.press("Space");
    await expect(poignee).toHaveAttribute("aria-pressed", "true");
    for (const position of [3, 2, 1]) {
      await page.keyboard.press("ArrowUp");
      await expect(page.getByText(`« Planning » en position ${position} sur 7.`)).toBeAttached();
    }
    await page.keyboard.press("Space");
    await expect(apercu(page)).toHaveText(["Planning", "Accueil", "Calendrier", "Tâches", "Plus"]);
    await feuille(page).getByRole("button", { name: "Terminé" }).click();
    await expect(onglets(page)).toHaveText(["Planning", "Accueil", "Calendrier", "Tâches", "Plus"]);
    await expect.poll(() => db.doc("backOffice/uid-admin")?.barreDuBas).toEqual(["planning", "tableau", "calendrier", "taches"]);
  });

  test("« Remettre la barre par défaut » : la barre du rôle, retirée du document", async ({ page }) => {
    const db = await ouvrir(page, ADMIN, { "backOffice/uid-admin": { barreDuBas: ["messages", "equipes", "tableau", "taches"], majLe: "2026-09-30T10:00:00Z" } });
    await expect(onglets(page)).toHaveText(["Messages", "Équipes", "Accueil", "Tâches", "Plus"]);
    await ouvrirFeuille(page);
    await feuille(page).getByRole("button", { name: "Remettre la barre par défaut" }).click();
    await expect(apercu(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"]);
    await feuille(page).getByRole("button", { name: "Terminé" }).click();
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"]);
    await expect.poll(() => ecrituresBO(db, "uid-admin").length).toBe(1);
    expect(db.doc("backOffice/uid-admin")!.barreDuBas, "absente = défaut, jamais recopié").toBeUndefined();
  });

  test("écriture refusée : la barre d'avant revient et un message le dit", async ({ page }) => {
    await ouvrir(page, ADMIN);
    await page.route(/firestore\.googleapis\.com.*backOffice/, (route) =>
      route.request().method() === "PATCH" ? route.fulfill({ status: 403, contentType: "application/json", body: "{}" }) : route.fallback());
    await ouvrirFeuille(page);
    await caseDe(page, "Planning").click();
    await feuille(page).getByRole("button", { name: "Terminé" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Barre non enregistrée" })).toBeVisible();
    await expect(onglets(page)).toHaveText(["Accueil", "Calendrier", "Tâches", "Planning", "Plus"]);
  });

  test("Réussite 3 : la barre choisie sur un appareil le suit sur la tablette", async ({ page, browser }) => {
    const db = await ouvrir(page, ADMIN);
    await ouvrirFeuille(page);
    await caseDe(page, "Planning").click();
    await caseDe(page, "Équipes").click();
    await feuille(page).getByRole("button", { name: "Terminé" }).click();
    await expect.poll(() => db.doc("backOffice/uid-admin")?.barreDuBas).toEqual(["tableau", "calendrier", "taches", "equipes"]);
    const { defaultBrowserType: _ignore, ...ipad } = devices["iPad (gen 7)"] as typeof devices[string] & { defaultBrowserType?: string };
    const autre = await browser.newContext({ ...ipad, baseURL: new URL(page.url()).origin });
    try {
      const tablette = await autre.newPage();
      await ouvrir(tablette, ADMIN, { "backOffice/uid-admin": db.doc("backOffice/uid-admin")! });
      await expect(onglets(tablette)).toHaveText(["Accueil", "Calendrier", "Tâches", "Équipes", "Plus"]);
    } finally {
      await autre.close();
    }
  });

  test("en 中文", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, ADMIN);
    await expect(onglets(page)).toHaveText(["首页", "日历", "任务", "排班表", "更多"]);
    await barre(page).getByRole("link", { name: "更多" }).click();
    await expect(page.getByRole("heading", { name: "更多", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "自定义底部栏" }).click();
    await expect(page.getByRole("dialog", { name: "你的底部栏" })).toBeVisible();
  });
});

test.describe("Barre du bas (B6) : grands écrans", () => {
  test("ordinateur et tablette en paysage : pas de barre du bas, la barre latérale suffit", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "propre aux grands écrans");
    await sansSheet(page);
    await signInAs(page, ADMIN, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await expect(barre(page)).toBeHidden();
  });
});

test.describe("Barre du bas (B6) : captures à regarder", () => {
  test.beforeEach(({}, info) => test.skip(estGrandEcran(info), "propre au téléphone et à la tablette en portrait"));

  // Comparées aux planches bo-telephone-accueil, bo-telephone-plus, bo-telephone-barre-perso, tablette-portrait-back-office.
  test("tableau de bord, « Plus », feuille", async ({ page }, info) => {
    await ouvrir(page, ADMIN, {
      "reports/r1": { kind: "site", title: "Lien mort", status: "pending", createdAt: "2026-09-30T10:00:00Z" },
    });
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: `test-results/barre-back-office-captures/${info.project.name}-accueil.png` });
    await barre(page).getByRole("link", { name: "Plus" }).click();
    await expect(page.getByTestId("plus-entree").first()).toBeVisible();
    await page.waitForTimeout(400); // fin du fondu de la page et de la pastille de l'onglet
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    await page.screenshot({ path: `test-results/barre-back-office-captures/${info.project.name}-plus.png` });
    await page.getByRole("button", { name: "Personnaliser la barre" }).click();
    await expect(feuille(page)).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `test-results/barre-back-office-captures/${info.project.name}-feuille.png` });
  });
});
