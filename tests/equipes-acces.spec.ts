import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ongletsRail } from "./helpers/agencement";
import {
  canCreateEvenement, creatableEvenementPours, entreesBackOffice, equipesDe, equipesDesTaches, equipesOuCreer, estDeLEquipe,
  estReferentDe, estResponsable, isCoordination, peutCocher, sousPartiesEvenements, widgetsPermis,
} from "../src/lib/access";
import { aFairePour, type Ligne } from "../src/lib/taches/echeances";
import type { Tache } from "../src/types/tache";
import { barreParDefaut } from "../src/lib/tableauDeBord/barre";
import { raccourcisPermis } from "../src/lib/tableauDeBord/donnees";
import { ANNONCE_SECTIONS } from "../src/types/annonce";
import { EQUIPES } from "../src/lib/equipes/table";
import type { UserProfile } from "../src/types/user";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-B :
// être d'une équipe (`dansEquipes`) ou du public Louange (TEAM LOUANGE, plus toute personne qui a
// un rôle de service : décisions 5 et 42), en être référent (`referentDe`) ; ce que cela ouvre au
// Back-Office (EQ17, EQ18, décisions 4 et 43). Un pôle ne donne plus rien. Tranche EQ-C : qui coche
// une tâche (`peutCocher`), ce qui est « à moi » (`aFairePour`), ses équipes de tâches (EQ8, EQ9,
// EQ15, décision 41). Base simulée, noms fictifs.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Référente de TEAM MÉDIAS, sans autre droit (Réussite 1 et 6). */
const LEA: FakeProfile = { uid: "u-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", dansEquipes: ["medias"], referentDe: ["medias"] };
/** Simple membre de TEAM MÉDIAS (Réussite 2). */
const JOEL: FakeProfile = { uid: "u-joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", dansEquipes: ["medias"] };
/** Membre de TEAM DA (Réussite 3). */
const HUGO: FakeProfile = { uid: "u-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "L.", dansEquipes: ["da"] };
/** Choriste sans équipe (Réussite 4). */
const MAELLE: FakeProfile = {
  uid: "u-maelle", email: "maelle@example.com", firstName: "Maëlle", lastName: "T.", serviceRoles: { "Culte Francophone": ["chanteur"] },
};
/** Membre de TEAM LOUANGE sans rôle de service. */
const PAUL: FakeProfile = { uid: "u-paul", email: "paul@example.com", firstName: "Paul", lastName: "V.", dansEquipes: ["louange"] };
/** Membre d'un groupe sans rôle (décision 42). */
const SACHA: FakeProfile = { uid: "u-sacha", email: "sacha@example.com", firstName: "Sacha", lastName: "R.", serviceRoles: { "Groupe Paix": [] } };
/** Coordination cochée, sans équipe. */
const IRIS: FakeProfile = { uid: "u-iris", email: "iris@example.com", firstName: "Iris", lastName: "D.", coordination: true };
/** Un profil d'avant la migration : son ancien champ `poles` (resté sur le document) ne donne plus rien. */
const ANCIEN: FakeProfile & { poles: string[] } = { uid: "u-ancien", email: "ancien@example.com", firstName: "Noé", lastName: "B.", poles: ["evenement", "louange"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: "",
    serviceRoles: p.serviceRoles ?? {}, annonces: p.annonces ?? [], notify: p.notify ?? [], 
    coordination: p.coordination, equipes: p.equipes ?? false, plannings: p.plannings ?? [], dansEquipes: p.dansEquipes,
    referentDe: p.referentDe,
    // Champ résiduel (hors du type) : un profil d'avant la migration le garde, et il ne doit rien donner.
    poles: (p as { poles?: string[] }).poles,
  }) as unknown as UserProfile;

// ─── Pur : être d'une équipe, en être référent ───────────────────────────────

test.describe("pur : les équipes d'une personne (EQ3 à EQ5)", () => {
  test("equipesDe : ses équipes dans l'ordre de la table, Louange ajouté par un rôle de service", () => {
    expect(equipesDe(profil(HUGO))).toEqual(["da"]);
    expect(equipesDe(profil(MAELLE)), "choriste sans équipe").toEqual(["louange"]);
    expect(equipesDe(profil(PAUL)), "TEAM LOUANGE sans rôle de service").toEqual(["louange"]);
    expect(equipesDe(profil(SACHA)), "membre de groupe sans rôle (décision 42)").toEqual(["louange"]);
    expect(equipesDe({ dansEquipes: ["edd", "da"], serviceRoles: { "Culte Francophone": ["musicien"] } }), "ordre de la table")
      .toEqual(["da", "louange", "edd"]);
    expect(equipesDe({ dansEquipes: ["louange"], serviceRoles: { "Groupe Paix": ["chanteur"] } }), "Louange une seule fois").toEqual(["louange"]);
    expect(equipesDe(profil(ANCIEN)), "un pôle ne fait pas une équipe").toEqual([]);
    expect(equipesDe(null)).toEqual([]);
  });

  test("estDeLEquipe : ses membres, le public Louange élargi, les admins", () => {
    expect(estDeLEquipe(user(JOEL), profil(JOEL), "medias")).toBe(true);
    expect(estDeLEquipe(user(HUGO), profil(HUGO), "medias")).toBe(false);
    expect(estDeLEquipe(user(MAELLE), profil(MAELLE), "louange")).toBe(true);
    expect(estDeLEquipe(user(SACHA), profil(SACHA), "louange")).toBe(true);
    expect(estDeLEquipe(user(MAELLE), profil(MAELLE), "medias"), "un rôle de service n'ouvre que Louange").toBe(false);
    expect(estDeLEquipe(user(ANCIEN), profil(ANCIEN), "da"), "le pôle DA ne fait pas un membre de TEAM DA").toBe(false);
    expect(estDeLEquipe(user(ADMIN), null, "theologie"), "un admin est de toutes les équipes").toBe(true);
    expect(estDeLEquipe(null, profil(JOEL), "medias")).toBe(false);
  });

  test("estReferentDe : `referentDe`, et les admins", () => {
    expect(estReferentDe(user(LEA), profil(LEA), "medias")).toBe(true);
    expect(estReferentDe(user(JOEL), profil(JOEL), "medias")).toBe(false);
    expect(estReferentDe(user(LEA), profil(LEA), "da")).toBe(false);
    expect(estReferentDe(user(MAELLE), profil(MAELLE), "louange"), "un choriste n'est pas référent de Louange").toBe(false);
    expect(estReferentDe(user(ADMIN), null, "louange")).toBe(true);
    expect(estReferentDe(null, profil(LEA), "medias")).toBe(false);
  });

  test("garde-fou : la coordination est la case, pas un pôle (EQ-A)", () => {
    expect(isCoordination(user(ANCIEN), profil(ANCIEN))).toBe(false);
    expect(isCoordination(user(IRIS), profil(IRIS))).toBe(true);
  });
});

// ─── Pur : cocher une tâche, « à moi » (tranche EQ-C) ───────────────────────

test.describe("pur : cocher une tâche et « à moi » (EQ8, EQ9, EQ15, décision 41)", () => {
  const tache = (over: Partial<Tache>): Tache => ({
    id: "t", equipe: "medias", titre: "Tâche", responsableUid: null, responsableNom: "", echeance: "2026-10-12", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-lea", createdAt: "", updatedAt: "", ...over,
  });

  test("peutCocher : le responsable s'il est de l'équipe ; « toute l'équipe » : les référents et les admins seulement", () => {
    expect(peutCocher(user(JOEL), profil(JOEL), tache({ responsableUid: "u-joel" })), "sa tâche").toBe(true);
    expect(peutCocher(user(JOEL), profil(JOEL), tache({ responsableUid: "u-lea" })), "celle d'un autre membre").toBe(false);
    expect(peutCocher(user(JOEL), profil(JOEL), tache({ responsableUid: null })), "toute l'équipe : un simple membre non").toBe(false);
    expect(peutCocher(user(LEA), profil(LEA), tache({ responsableUid: null })), "toute l'équipe : la référente oui").toBe(true);
    expect(peutCocher(user(LEA), profil(LEA), tache({ responsableUid: "u-joel" })), "la référente coche toute tâche de l'équipe").toBe(true);
    expect(peutCocher(user(ADMIN), null, tache({ equipe: "theologie", responsableUid: null })), "un admin oui").toBe(true);
    expect(peutCocher(user(HUGO), profil(HUGO), tache({ responsableUid: "u-hugo" })), "responsable sorti de l'équipe").toBe(false);
    expect(peutCocher(user(MAELLE), profil(MAELLE), tache({ equipe: "louange", responsableUid: "u-maelle" })), "Louange élargi").toBe(true);
    expect(peutCocher(user(MAELLE), profil(MAELLE), tache({ equipe: "louange", responsableUid: null }))).toBe(false);
    expect(peutCocher(null, null, tache({ responsableUid: null }))).toBe(false);
  });

  test("aFairePour : une tâche sans responsable est « à moi » pour une référente, pas pour un simple membre", () => {
    const ligne = (over: Partial<Tache>): Ligne => ({ tache: tache(over), date: "2026-10-12", fois: null });
    const lignes = [
      ligne({ id: "sienne", responsableUid: "u-joel" }),
      ligne({ id: "tous", responsableUid: null }),
      ligne({ id: "autre", responsableUid: "u-lea" }),
      { ...ligne({ id: "faite", responsableUid: "u-joel" }), fois: { date: "2026-10-12", parUid: "u-joel", parNom: "Joël F.", le: "", etat: "terminee" as const, debutLe: "" } },
    ];
    const ids = (l: Ligne[]) => l.map((x) => x.tache.id);
    expect(ids(aFairePour(lignes, user(JOEL), profil(JOEL)))).toEqual(["sienne"]);
    expect(ids(aFairePour(lignes, user(LEA), profil(LEA)))).toEqual(["tous", "autre"]);
    expect(ids(aFairePour(lignes, user(ADMIN), null)), "un admin : toute l'équipe partout").toEqual(["tous"]);
  });

  test("equipesDesTaches : ses équipes (toutes pour un admin) ; equipesOuCreer : celles dont on est référent", () => {
    expect(equipesDesTaches(user(JOEL), profil(JOEL))).toEqual(["medias"]);
    expect(equipesDesTaches(user(MAELLE), profil(MAELLE))).toEqual(["louange"]);
    expect(equipesDesTaches(user(ADMIN), null)).toEqual(EQUIPES.map((e) => e.id));
    expect(equipesDesTaches(null, profil(JOEL))).toEqual([]);
    expect(equipesOuCreer(user(JOEL), profil(JOEL))).toEqual([]);
    expect(equipesOuCreer(user(LEA), profil(LEA))).toEqual(["medias"]);
    expect(equipesOuCreer(user(MAELLE), profil(MAELLE)), "un choriste ne crée rien").toEqual([]);
    expect(equipesOuCreer(user(ADMIN), null)).toEqual(EQUIPES.map((e) => e.id));
  });
});

// ─── Pur : le Back-Office ────────────────────────────────────────────────────

test.describe("pur : qui est responsable, ses entrées (EQ17, EQ18, décision 43)", () => {
  test("responsable : la coordination oui ; un membre seul, le public Louange seul, un ancien pôle seul : non", () => {
    expect(estResponsable(user(IRIS), profil(IRIS))).toBe(true);
    expect(estResponsable(user(LEA), profil(LEA)), "référente").toBe(true);
    for (const p of [JOEL, HUGO, MAELLE, PAUL, SACHA, ANCIEN]) expect(estResponsable(user(p), profil(p)), p.uid).toBe(false);
  });

  test("un simple membre ou un choriste : Tâches et Réunions, rien d'autre ; un ancien pôle seul : rien", () => {
    for (const p of [JOEL, HUGO, MAELLE, PAUL, SACHA]) expect(entreesBackOffice(user(p), profil(p)), p.uid).toEqual(["taches", "reunions"]);
    expect(entreesBackOffice(user(ANCIEN), profil(ANCIEN))).toEqual([]);
  });

  test("une référente sans autre droit : tableau, calendrier, tâches, évènements, réunions (décision 43)", () => {
    expect(entreesBackOffice(user(LEA), profil(LEA))).toEqual(["tableau", "calendrier", "taches", "evenements", "reunions"]);
    expect(sousPartiesEvenements(user(LEA), profil(LEA))).toEqual(["evenements"]);
    expect(sousPartiesEvenements(user(JOEL), profil(JOEL))).toEqual([]);
  });

  test("la coordination seule : Évènements, ni Tâches ni Réunions (elle n'ouvre aucune équipe, EQ25)", () => {
    expect(entreesBackOffice(user(IRIS), profil(IRIS))).toEqual(["tableau", "calendrier", "evenements"]);
  });

  test("barre du bas par défaut d'une référente : Évènements prend la place de Réunions sans Planning", () => {
    expect(barreParDefaut(entreesBackOffice(user(LEA), profil(LEA)))).toEqual(["tableau", "calendrier", "taches", "evenements"]);
    const avecPlanning = { ...LEA, plannings: ["culte"] };
    expect(barreParDefaut(entreesBackOffice(user(avecPlanning), profil(avecPlanning)))).toEqual(["tableau", "calendrier", "taches", "planning"]);
    expect(barreParDefaut(entreesBackOffice(user(JOEL), profil(JOEL)))).toEqual(["taches", "reunions"]);
  });

  test("raccourcis d'une référente : « Nouvel évènement » compris", () => {
    expect(raccourcisPermis(user(LEA), profil(LEA), {}).map((r) => r.id)).toContain("evenement");
  });

  test("widgets : rien pour qui n'est pas responsable, même avec Tâches et Réunions", () => {
    expect(widgetsPermis(user(JOEL), profil(JOEL))).toEqual([]);
    expect(widgetsPermis(user(MAELLE), profil(MAELLE))).toEqual([]);
  });
});

test.describe("pur : plus de public de pôle (EQ19, EQ21)", () => {
  test("creatableEvenementPours : les équipes dont on est référent, plus aucun « pole: »", () => {
    expect(creatableEvenementPours(user(LEA), profil(LEA), ANNONCE_SECTIONS)).toEqual(["equipe:medias"]);
    expect(creatableEvenementPours(user(JOEL), profil(JOEL), ANNONCE_SECTIONS)).toEqual([]);
    expect(creatableEvenementPours(user(MAELLE), profil(MAELLE), ANNONCE_SECTIONS)).toEqual([]);
    expect(creatableEvenementPours(user(ANCIEN), profil(ANCIEN), ANNONCE_SECTIONS)).toEqual([]);
    const admin = creatableEvenementPours(user(ADMIN), null, ANNONCE_SECTIONS);
    expect(admin.filter((p) => p.startsWith("pole:"))).toEqual([]);
    expect(admin).toEqual(["eglise", ...ANNONCE_SECTIONS, ...EQUIPES.map((e) => `equipe:${e.id}`)]);
    expect(creatableEvenementPours(user(IRIS), profil(IRIS), ANNONCE_SECTIONS)).toEqual(["eglise", ...ANNONCE_SECTIONS]);
  });

  test("canCreateEvenement : un public « pole: » ne se crée plus, même par la coordination ou un admin", () => {
    for (const [p, prof] of [[IRIS, profil(IRIS)], [ADMIN, null], [ANCIEN, profil(ANCIEN)]] as const) {
      expect(canCreateEvenement(user(p), prof, "pole:da"), p.uid).toBe(false);
    }
    expect(canCreateEvenement(user(LEA), profil(LEA), "equipe:medias")).toBe(true);
    expect(canCreateEvenement(user(JOEL), profil(JOEL), "equipe:medias"), "un simple membre ne crée plus (EQ21)").toBe(false);
  });
});

// ─── Écrans ──────────────────────────────────────────────────────────────────

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const selecteur = (page: Page) => page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true });
/** Le menu du Back-Office : la barre latérale sur ordinateur ; la barre du bas ailleurs. */
const menu = (page: Page, info: TestInfo) => estOrdinateur(info)
  ? page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" })
  : page.getByTestId("barre-du-bas");

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

test.describe("écrans : le Back-Office d'un simple membre (EQ17)", () => {
  test("Joël F. voit App · Back-Office ; le menu n'a que Tâches et Réunions", async ({ page }, info) => {
    await ouvrir(page, JOEL, "/songs");
    await page.getByRole("searchbox").waitFor();
    await expect(selecteur(page).getByRole("link", { name: "Back-Office" })).toBeVisible();
    await selecteur(page).getByRole("link", { name: "Back-Office" }).click();
    // Pas de tableau de bord : sa première entrée, Tâches.
    await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toHaveCount(0);
    await expect(menu(page, info).getByRole("link")).toHaveText(estOrdinateur(info) ? ["Tâches", "Réunions"] : ["Tâches", "Réunions", "Plus"]);
    await page.goto("/back-office/reunions");
    await expect(page.getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
    await capture(page, "membre-reunions");
  });

  test("/back-office, le calendrier et Évènements le ramènent à Tâches ; Réunions et Plus restent", async ({ page }) => {
    await ouvrir(page, JOEL, "/back-office/reunions");
    await expect(page.getByRole("heading", { level: 1, name: "Réunions" })).toBeVisible();
    for (const ailleurs of ["/back-office", "/back-office/calendrier", "/back-office/evenements"]) {
      await page.goto(ailleurs);
      await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
    }
    await page.goto("/back-office/plus");
    await expect(page).toHaveURL(/\/back-office\/plus\/?$/);
  });

  test("un choriste sans équipe : le Back-Office s'ouvre, Tâches ne montre que Louange", async ({ page }, info) => {
    await ouvrir(page, MAELLE, "/back-office", {
      "equipes/louange/taches/t1": { equipe: "louange", titre: "Choisir les chants de Noël", responsableUid: null, responsableNom: "", echeance: "2026-10-15", repetition: null },
    });
    await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
    await expect(ongletsRail(page).getByRole("link")).toHaveText([/^Louange/]);
    // « Tâches » peut porter sa pastille (le compte de ce qui est à faire).
    await expect(menu(page, info).getByRole("link")).toHaveText(estOrdinateur(info) ? [/^Tâches/, "Réunions"] : [/^Tâches/, "Réunions", "Plus"]);
    await capture(page, "choriste-taches");
  });

  test("un ancien pôle seul, sans équipe : « Réservé aux responsables »", async ({ page }) => {
    // Le document porte encore son ancien champ `poles` (la fausse base ne l'écrit pas d'elle-même).
    const { poles, ...base } = ANCIEN;
    await ouvrir(page, ANCIEN, "/back-office", {
      [`users/${ANCIEN.uid}`]: { ...base, email: ANCIEN.email, planningName: "", serviceRoles: {}, annonces: [], notify: [], equipes: false, plannings: [], poles },
    });
    await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
    await expect(page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true })).toHaveCount(0);
  });
});
