import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ADMIN_EMAIL, coordination, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { canCreateEvenement, canSeeEvenement, estDeLaReunion, estReunion, publicDeReunion } from "../src/lib/access";
import { destinatairesEvenement, inscrire } from "../src/lib/evenements/serveur";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-B :
// les réunions et les évènements de pôle deviennent ceux d'une équipe (décision 8, EQ19 à EQ23).
// Le public `pole:<id>` disparaît ; `equipe:louange` est le public Louange élargi (TEAM LOUANGE et
// toute personne qui a un rôle de service, décisions 5 et 42). Les référents (et les admins) créent
// réunions et évènements d'équipe (décisions 3 et 43) ; les membres voient, proposent des sujets.
// Base, routes et Sheets simulés ; noms fictifs.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** Samedi 10 octobre, 20:00. */
const BASE = {
  type: "loisir", date: "2026-10-10", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "u-ines", organisateurNom: "Inès P.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};
const REUNION_LOUANGE = { ...BASE, titre: "Réunion Louange", pour: "equipe:louange", reunion: true };
const REUNION_DA = { ...BASE, titre: "Réunion DA", pour: "equipe:da", reunion: true, organisateurUid: "u-zoe", organisateurNom: "Zoé K." };
/** Évènements d'équipe (lot E devenu d'équipe) : avec inscriptions. */
const SOIREE_DA = { ...REUNION_DA, titre: "Soirée DA", reunion: false, inscriptions: "ouvertes", date: "2026-10-12" };
const SOIREE_LOUANGE = { ...REUNION_LOUANGE, titre: "Soirée Louange", reunion: false, inscriptions: "ouvertes", date: "2026-10-13" };
/** Une réunion de pôle d'avant la migration : plus un public de réunion. */
const ANCIENNE_DA = { ...REUNION_DA, titre: "Point DA", pour: "pole:da" };

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Référente de TEAM LOUANGE. */
const INES: FakeProfile = { uid: "u-ines", email: "ines@example.com", firstName: "Inès", lastName: "P.", dansEquipes: ["louange"], referentDe: ["louange"] };
/** Choriste sans équipe. */
const MAELLE: FakeProfile = {
  uid: "u-maelle", email: "maelle@example.com", firstName: "Maëlle", lastName: "T.", serviceRoles: { "Culte Francophone": ["chanteur"] },
};
/** Membre de groupe sans rôle (décision 42). */
const SACHA: FakeProfile = { uid: "u-sacha", email: "sacha@example.com", firstName: "Sacha", lastName: "R.", serviceRoles: { "Groupe Paix": [] } };
/** Simple membre de TEAM DA. */
const HUGO: FakeProfile = { uid: "u-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "L.", dansEquipes: ["da"] };
/** Référente de TEAM MÉDIAS, sans droit d'annonces. */
const LEA: FakeProfile = { uid: "u-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", dansEquipes: ["medias"], referentDe: ["medias"] };
/** Simple membre de TEAM MÉDIAS. */
const JOEL: FakeProfile = { uid: "u-joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", dansEquipes: ["medias"] };
/** Coordination cochée, sans équipe. */
const IRIS: FakeProfile = { uid: "u-iris", email: "iris@example.com", firstName: "Iris", lastName: "D.", coordination: true, ...coordination() };

const qui = (p: FakeProfile) => ({ uid: p.uid, email: p.email });

// ─── Purs ───────────────────────────────────────────────────────────────────

test.describe("pur : réunions et évènements d'équipe (EQ19 à EQ22)", () => {
  test("Louange : un choriste, un membre de groupe sans rôle et TEAM LOUANGE en sont ; pas TEAM DA", () => {
    for (const p of [MAELLE, SACHA, INES]) {
      expect(canSeeEvenement(qui(p), p, REUNION_LOUANGE), p.uid).toBe(true);
      expect(estDeLaReunion(qui(p), p, { ...REUNION_LOUANGE, organisateurUid: "u-autre" }), p.uid).toBe(true);
    }
    expect(canSeeEvenement(qui(HUGO), HUGO, REUNION_LOUANGE)).toBe(false);
    expect(estDeLaReunion(qui(HUGO), HUGO, REUNION_LOUANGE)).toBe(false);
    // La coordination n'entre pas dans une réunion ; elle voit l'évènement d'équipe (D22).
    expect(canSeeEvenement(qui(IRIS), IRIS, REUNION_LOUANGE)).toBe(false);
    expect(canSeeEvenement(qui(IRIS), IRIS, SOIREE_LOUANGE)).toBe(true);
    expect(canSeeEvenement(qui(MAELLE), MAELLE, SOIREE_LOUANGE)).toBe(true);
    expect(canSeeEvenement(qui(HUGO), HUGO, SOIREE_LOUANGE)).toBe(false);
  });

  test("créer : les référents de l'équipe et les admins ; ni un choriste ni un simple membre", () => {
    expect(canCreateEvenement(qui(INES), INES, "equipe:louange")).toBe(true);
    expect(canCreateEvenement(qui(ADMIN), null, "equipe:louange")).toBe(true);
    expect(canCreateEvenement(qui(MAELLE), MAELLE, "equipe:louange")).toBe(false);
    expect(canCreateEvenement(qui(HUGO), HUGO, "equipe:da")).toBe(false);
    expect(canCreateEvenement(qui(IRIS), IRIS, "equipe:da"), "la coordination ne crée pas pour une équipe").toBe(false);
  });

  test("un public « pole: » n'est plus celui d'une réunion ; une réunion de pôle non migrée ne se voit plus", () => {
    expect(publicDeReunion("pole:da")).toBe(false);
    expect(publicDeReunion("equipe:louange")).toBe(true);
    expect(estReunion({ pour: "pole:da" })).toBe(false);
    const hugoAvecPole = { ...HUGO, poles: ["louange"] } as FakeProfile; // champ résiduel, hors du type
    expect(canSeeEvenement(qui(HUGO), hugoAvecPole, ANCIENNE_DA)).toBe(false);
  });

  test("notification de publication : aux seuls membres de l'équipe, Louange élargi", async () => {
    const users: Record<string, Record<string, unknown>> = {
      "u-ines": { dansEquipes: ["louange"], referentDe: ["louange"] },
      "u-maelle": { serviceRoles: { "Culte Francophone": ["chanteur"] } },
      "u-sacha": { serviceRoles: { "Groupe Paix": [] } },
      "u-hugo": { dansEquipes: ["da"], poles: ["louange"] },
      "u-lea": { dansEquipes: ["medias"], referentDe: ["medias"] },
      "u-joel": { dansEquipes: ["medias"] },
      "u-noe": { poles: ["media"] },
    };
    const db = {
      collection: () => ({ get: async () => ({ docs: Object.entries(users).map(([id, d]) => ({ id, data: () => d })) }) }),
    } as unknown as Parameters<typeof destinatairesEvenement>[0];
    expect((await destinatairesEvenement(db, { pour: "equipe:louange" })).sort()).toEqual(["u-ines", "u-maelle", "u-sacha"]);
    expect((await destinatairesEvenement(db, { pour: "equipe:medias" })).sort()).toEqual(["u-joel", "u-lea"]);
  });

  test("s'inscrire à l'évènement de Louange : un choriste oui ; TEAM DA, 403 « réservé aux membres de l'équipe »", async () => {
    const soiree = { ...SOIREE_LOUANGE, date: "2099-10-13", organisateurUid: "u-autre" };
    const docs: Record<string, Record<string, unknown>> = {
      "evenements/soiree": soiree,
      "users/u-maelle": { firstName: "Maëlle", lastName: "T.", serviceRoles: { "Culte Francophone": ["chanteur"] } },
      "users/u-hugo": { firstName: "Hugo", lastName: "L.", dansEquipes: ["da"] },
    };
    const ecrits: Record<string, Record<string, unknown>> = {};
    const lireDoc = async (chemin: string) => ({ exists: chemin in docs, data: () => docs[chemin] });
    type Ref = { path: string; get: () => ReturnType<typeof lireDoc>; collection: (c: string) => { doc: (id?: string) => Ref } };
    const ref = (chemin: string): Ref => ({
      path: chemin, get: () => lireDoc(chemin), collection: (c) => ({ doc: (id) => ref(`${chemin}/${c}/${id ?? "auto"}`) }),
    });
    const db = {
      collection: (c: string) => ({ doc: (id: string) => ref(`${c}/${id}`) }),
      runTransaction: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({
        get: (r: Ref) => lireDoc(r.path),
        set: (r: Ref, d: Record<string, unknown>) => { ecrits[r.path] = d; },
        update: (r: Ref, d: Record<string, unknown>) => { ecrits[r.path] = { ...docs[r.path], ...d }; },
      }),
    } as unknown as Parameters<typeof inscrire>[0];
    await expect(inscrire(db, qui(MAELLE), { evenementId: "soiree", invites: 0, nomLibre: "" })).resolves.toMatchObject({ inscrits: 1 });
    await expect(inscrire(db, qui(HUGO), { evenementId: "soiree", invites: 0, nomLibre: "" }))
      .rejects.toMatchObject({ status: 403, message: "Évènement réservé aux membres de l'équipe." });
  });

  test("règles : estDeLEquipe (Louange élargi), estReferentDe ; plus de branche de pôle pour les réunions", () => {
    const rules = lire("firestore.rules");
    expect(rules).toMatch(/function estDeLEquipe\(equipe\) \{[\s\S]*?equipe in profile\(\)\.get\('dansEquipes', \[\]\)[\s\S]*?equipe == 'louange' && \(?profile\(\)\.get\('serviceRoles', \{\}\)\.size\(\) > 0/);
    expect(rules).toMatch(/function estReferentDe\(equipe\) \{\s*return isAdmin\(\) \|\| \(hasProfile\(\) && equipe in profile\(\)\.get\('referentDe', \[\]\)\);/);
    const reunion = rules.match(/function estDeLaReunion\(e\) \{[\s\S]*?\n {4}\}/)![0];
    expect(reunion).toMatch(/e\.pour\.matches\('equipe:\[a-z0-9-\]\+'\) && estDeLEquipe\(e\.pour\.split\(':'\)\[1\]\)/);
    expect(reunion).not.toMatch(/pole/);
    const create = rules.match(/match \/evenements\/\{id\} \{[\s\S]*?allow update/)![0];
    expect(create).toMatch(/request\.resource\.data\.pour\.matches\('equipe:\[a-z0-9-\]\+'\)\s*&& estReferentDe\(request\.resource\.data\.pour\.split\(':'\)\[1\]\)/);
    expect(create).not.toMatch(/pour\.matches\('pole:/);
    // La garde reste : plus personne ne crée de public « pole: » (EQ21).
    expect(create).toMatch(/!request\.resource\.data\.pour\.matches\('\(pole\|equipe\):\.\*'\)/);
  });
});

// ─── Écrans ─────────────────────────────────────────────────────────────────

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTelephone = (info: TestInfo) => info.project.name === "telephone";
const sansPush = (page: Page) => page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
const carteSujets = (page: Page) => page.getByRole("region", { name: /^Sujets/ });
const creee = (db: Awaited<ReturnType<typeof signInAs>>) =>
  db.writes.filter((w) => w.method === "POST" && /^evenements\/[^/]+$/.test(w.path)).pop()!;

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, p: FakeProfile, vers: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, p, {
    "evenements/reunion-louange": REUNION_LOUANGE, "evenements/reunion-da": REUNION_DA, ...docs,
  }, vers);
}

test.describe("écrans : Louange, public élargi (décision 5)", () => {
  // Piste A (BO4, BO7) : un choriste n'a plus de Back-Office ; la réunion de Louange est dans la page de
  // l'équipe, `/equipes/louange`, et sa fiche dans l'App (`/evenements/<id>`).
  test("un choriste sans équipe trouve la réunion de Louange sur la page de l'équipe Louange et y propose un sujet", async ({ page }) => {
    const db = await ouvrir(page, MAELLE, "/equipes/louange");
    const reunions = page.getByRole("region", { name: "Réunions" });
    await expect(reunions.getByRole("link", { name: /Réunion Louange/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Réunion DA/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Nouvelle réunion/ })).toHaveCount(0);
    await reunions.getByRole("link", { name: /Réunion Louange/ }).first().click();
    await page.waitForURL(/\/evenements\/reunion-louange\/?$/);
    // L'en-tête « Réunion d'équipe · Louange » est celui du Back-Office (vérifié en 中文 plus bas) : dans l'App, le titre et la pastille.
    await expect(page.getByRole("heading", { level: 2, name: "Réunion Louange" })).toBeVisible();
    await expect(page.locator("main").getByText("Louange", { exact: true }).first()).toBeVisible();
    await capture(page, "reunion-louange-choriste");
    await carteSujets(page).getByRole("textbox", { name: "Nouveau sujet" }).fill("Chants de Noël : la liste");
    await carteSujets(page).getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect.poll(() => db.writes.filter((w) => w.method === "POST" && w.path.startsWith("evenements/reunion-louange/sujets/")).length).toBe(1);
    const [post] = db.writes.filter((w) => w.method === "POST" && w.path.startsWith("evenements/reunion-louange/sujets/"));
    expect(post.data).toMatchObject({ texte: "Chants de Noël : la liste", auteurUid: "u-maelle", auteurNom: "Maëlle T." });
  });

  test("le choriste ne crée rien : « Nouvelle réunion » lui répond « réservé aux responsables » (BO4)", async ({ page }) => {
    await ouvrir(page, MAELLE, "/back-office/reunions/nouvelle");
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await expect(page.getByLabel("Nom de l'évènement")).toHaveCount(0);
  });

  // G2 (une réunion s'ouvre dans le Back-Office pour qui l'a), inversé par la piste A (BO4) : qui n'a pas de
  // Back-Office reste dans l'App, et l'adresse du Back-Office le ramène à la fiche de l'App.
  test("l'adresse de la réunion de Louange : le choriste reste dans l'App, et l'adresse du Back-Office l'y ramène (G2, BO4)", async ({ page }) => {
    await ouvrir(page, MAELLE, "/evenements/reunion-louange");
    await expect(carteSujets(page)).toBeVisible();
    await expect(page).toHaveURL(/\/evenements\/reunion-louange\/?$/);
    await page.goto("/back-office/reunions/reunion-louange");
    await page.waitForURL(/\/evenements\/reunion-louange\/?$/);
    await expect(carteSujets(page)).toBeVisible();
  });

  test("la référente de TEAM LOUANGE crée une réunion de Louange", async ({ page }) => {
    const db = await ouvrir(page, INES, "/back-office/reunions/nouvelle");
    await sansPush(page);
    await expect(page.getByLabel("Public").locator("option")).toHaveText(["Louange"]);
    await expect(page.getByLabel("Public")).toHaveValue("equipe:louange");
    await page.getByLabel("Nom de l'évènement").fill("Réunion Louange de novembre");
    await page.getByLabel("Date", { exact: true }).fill("2026-11-07");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await page.waitForURL(/\/back-office\/reunions\/fake-\d+\/?$/);
    expect(creee(db).data).toMatchObject({ pour: "equipe:louange", reunion: true, organisateurUid: "u-ines" });
  });

  test("pastilles : « TEAM DA » et « Louange », plus de « Pôle »", async ({ page }) => {
    await ouvrir(page, MAELLE, "/evenements", { "evenements/soiree-louange": SOIREE_LOUANGE });
    const carte = page.locator('a[href^="/evenements/soiree-louange"]').first();
    await expect(carte).toBeVisible();
    await expect(carte.getByText("Louange", { exact: true })).toBeVisible();
    await expect(page.getByText(/Pôle/)).toHaveCount(0);
    await capture(page, "pastille-louange");
    await page.goto("/evenements/soiree-louange");
    await expect(page.getByRole("heading", { name: "Soirée Louange" }).first()).toBeVisible();
    await expect(page.locator("main").getByText("Louange", { exact: true }).first()).toBeVisible();
    await expect(page.locator("main").getByText(/Pôle/)).toHaveCount(0);
  });

  // Piste A (BO4) : l'en-tête de réunion d'équipe est celui du Back-Office, donc de la référente (un choriste lit la fiche dans l'App).
  test("en 中文 : « 团队会议 · 敬拜 » en tête de la réunion de Louange, 敬拜 en pastille", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page, INES, "/back-office/reunions/reunion-louange", { "evenements/soiree-louange": SOIREE_LOUANGE });
    await expect(page.getByText("团队会议 · 敬拜", { exact: true })).toBeVisible();
    await capture(page, "reunion-louange-zh");
    await page.goto("/evenements");
    const carte = page.locator('a[href^="/evenements/soiree-louange"]').first();
    await expect(carte.getByText("敬拜", { exact: true })).toBeVisible();
    await capture(page, "pastille-louange-zh");
  });

  test("pastille d'un évènement de TEAM DA pour un membre", async ({ page }) => {
    await ouvrir(page, HUGO, "/evenements", { "evenements/soiree-da": SOIREE_DA });
    const carte = page.locator('a[href^="/evenements/soiree-da"]').first();
    await expect(carte.getByText("TEAM DA", { exact: true })).toBeVisible();
    await expect(page.getByText(/Pôle/)).toHaveCount(0);
  });
});

// BO16 (d) (docs/spec-back-office-piste-a.md) : « Nouvelle réunion » depuis la page d'une équipe choisit cette équipe.
test.describe("écrans : « Nouvelle réunion » depuis la page d'une équipe (BO16 d)", () => {
  test("depuis TEAM DA, le formulaire s'ouvre avec le public « equipe:da » ; sans équipe dans l'adresse, rien n'est imposé", async ({ page }) => {
    await ouvrir(page, ADMIN, "/back-office/equipes/da");
    const lien = page.getByRole("link", { name: "Nouvelle réunion" }).first();
    await expect(lien).toHaveAttribute("href", /^\/back-office\/reunions\/nouvelle\/?\?equipe=da$/);
    await lien.click();
    await page.waitForURL(/\/back-office\/reunions\/nouvelle\/?\?equipe=da$/);
    await expect(page.getByLabel("Public")).toHaveValue("equipe:da");
    await page.goto("/back-office/reunions/nouvelle");
    await expect(page.getByLabel("Public")).not.toHaveValue("equipe:da");
  });

  test("une équipe où l'on ne peut pas créer n'est pas imposée : la référente de Louange garde Louange", async ({ page }) => {
    await ouvrir(page, INES, "/back-office/reunions/nouvelle?equipe=da");
    await expect(page.getByLabel("Public")).toHaveValue("equipe:louange");
  });
});

test.describe("écrans : un simple membre ne crée pas (décision 3)", () => {
  test("Hugo L. (TEAM DA) voit la réunion de son équipe sur la page de l'équipe, sans « Nouvelle réunion » (BO4, BO7)", async ({ page }) => {
    await ouvrir(page, HUGO, "/equipes/da");
    await expect(page.getByRole("link", { name: /Réunion DA/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Réunion Louange/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Nouvelle réunion/ })).toHaveCount(0);
  });

  test("Joël F. n'a ni « Nouvel évènement » ni l'entrée : « …/evenements/nouveau » lui répond « réservé » ; sa page d'équipe n'offre rien à créer (BO4)", async ({ page }) => {
    await ouvrir(page, JOEL, "/back-office/evenements/nouveau");
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await page.goto("/equipes/medias");
    await expect(page.getByRole("heading", { level: 2, name: "Réunions" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Nouvel évènement|Nouvelle réunion/ })).toHaveCount(0);
  });
});

test.describe("écrans : réunions précédentes et reprise, au public migré", () => {
  const CR = { url: "https://docs.google.com/document/d/sept", parUid: "u-lea", parNom: "Léa M.", le: "2026-09-06T10:00:00Z" };
  const MEDIAS = { ...BASE, titre: "Réunion Médias", pour: "equipe:medias", reunion: true, organisateurUid: "u-lea", organisateurNom: "Léa M." };
  const HISTORIQUE = {
    "evenements/reunion-medias": MEDIAS,
    // Une réunion d'avant la migration, passée de « pole:media » à « equipe:medias ».
    "evenements/reunion-sept": { ...MEDIAS, date: "2026-09-05", compteRendu: CR },
    "evenements/reunion-sept/sujets/v1": {
      texte: "Vidéo de rentrée", auteurUid: "u-joel", auteurNom: "Joël F.", creeLe: "2026-09-01T09:00:00Z", ordre: 0,
      traite: false, reprisDans: null, repriseDe: null,
    },
  };

  test("Joël F. retrouve la réunion de septembre dans « Réunions précédentes »", async ({ page }) => {
    await ouvrir(page, JOEL, "/back-office/reunions/reunion-medias", HISTORIQUE);
    const rangs = page.getByRole("region", { name: "Réunions précédentes" }).getByRole("listitem");
    await expect(rangs).toHaveCount(1);
    await expect(rangs.nth(0)).toContainText("5 sept.");
    await expect(rangs.nth(0).getByRole("link", { name: "Compte rendu" })).toHaveAttribute("href", CR.url);
  });

  test("Léa M. crée la réunion suivante : le sujet laissé en septembre lui est proposé", async ({ page }) => {
    const db = await ouvrir(page, LEA, "/back-office/reunions/nouvelle", HISTORIQUE);
    await sansPush(page);
    await expect(page.getByLabel("Public")).toHaveValue("equipe:medias");
    await page.getByLabel("Nom de l'évènement").fill("Réunion Médias de novembre");
    await page.getByLabel("Date", { exact: true }).fill("2026-11-07");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    const question = page.getByRole("alertdialog", { name: "Reprendre les sujets non traités ?" });
    await expect(question.getByRole("listitem")).toHaveText([/^Vidéo de rentrée/]);
    await question.getByRole("button", { name: "Oui, les reprendre" }).click();
    await page.waitForURL(/\/back-office\/reunions\/fake-\d+\/?$/);
    const nouvelle = creee(db).path.split("/")[1];
    expect(db.writes.filter((w) => w.method === "PATCH" && w.path.includes("/sujets/")).map((w) => [w.path, w.data]))
      .toEqual([["evenements/reunion-sept/sujets/v1", { reprisDans: nouvelle }]]);
  });
});

/** Le jour touché du calendrier : en grand, le menu « Ajouter ce jour-là » du volet du jour ; sur la
 *  tablette debout, la feuille du jour ; sur téléphone, la feuille du « + » (aujourd'hui, en Agenda). */
async function creationsDuCalendrier(page: Page, info: TestInfo): Promise<{ lien: (nom: RegExp) => Locator }> {
  if (estTelephone(info)) {
    // BO8 : le rond « Créer » du téléphone s'appelle « Ajouter », sa feuille aussi.
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    const feuille = page.getByRole("dialog", { name: "Ajouter" });
    return { lien: (nom) => feuille.getByRole("link", { name: nom }) };
  }
  await page.locator('[data-jour="2026-10-11"]').click();
  if (!estOrdinateur(info)) {
    const feuille = page.getByRole("dialog", { name: "Dimanche 11 octobre" });
    return { lien: (nom) => feuille.getByRole("link", { name: nom }) };
  }
  await page.getByRole("complementary", { name: "Dimanche 11 octobre" }).getByRole("button", { name: "Ajouter ce jour-là" }).click();
  return { lien: (nom) => page.getByRole("menu").getByRole("menuitem", { name: nom }) };
}

test.describe("écrans : une référente crée un évènement d'équipe (décision 43)", () => {
  // BO8 : « Nouvel évènement » n'est plus en tête de BO › Évènements, mais dans « Ajouter › Évènement » du Calendrier.
  test("Léa M. : « Ajouter › Évènement » en tête du Calendrier ; le formulaire ne propose que TEAM MÉDIAS", async ({ page }, info) => {
    const db = await ouvrir(page, LEA, "/back-office/calendrier");
    await sansPush(page);
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
    await (estTelephone(info)
      ? page.getByRole("dialog", { name: "Ajouter" }).getByRole("link", { name: /^(Nouvel )?évènement/i })
      : page.getByRole("menuitem", { name: /^Évènement/ })).click();
    await page.waitForURL(/\/back-office\/evenements\/nouveau\/?(\?.*)?$/);
    await expect(page.getByLabel("Public").locator("option")).toHaveText(["TEAM MÉDIAS"]);
    await expect(page.getByRole("radiogroup", { name: "Inscriptions" })).toBeVisible();
    await capture(page, "nouvel-evenement-referente");
    await page.getByLabel("Nom de l'évènement").fill("Atelier photo");
    await page.getByLabel("Date", { exact: true }).fill("2026-10-17");
    await page.getByRole("button", { name: "Créer l'évènement" }).click();
    await page.waitForURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    expect(creee(db).data).toMatchObject({ pour: "equipe:medias", reunion: false, organisateurUid: "u-lea" });
    // BO8 : l'ancienne adresse mène à l'Agenda filtré sur les évènements, où le nouvel évènement s'ouvre.
    await page.goto("/back-office/evenements");
    await expect(page.getByRole("button", { name: /Atelier photo/ }).first()).toBeVisible();
  });

  test("Léa M. : « Nouvel évènement » aussi au Calendrier (panneau du jour, « + » du téléphone)", async ({ page }, info) => {
    await ouvrir(page, LEA, "/back-office/calendrier");
    await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
    const ou = await creationsDuCalendrier(page, info);
    await expect(ou.lien(/^Nouvel évènement le/)).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?\?date=2026-10-(09|11)$/);
  });
});
