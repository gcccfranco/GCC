import { expect, test, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { entreesBackOffice } from "../src/lib/access";
import { ficheEvenement } from "../src/lib/navigation";
import { notificationsDuMatin } from "../src/lib/reunions/rappels";
import { pushNouvelEvenement } from "../src/lib/evenements/rappel";
import type { Evenement } from "../src/types/evenement";
import type { UserProfile } from "../src/types/user";

// Retouches v18, lot G (docs/spec-retouches-v18.md, D28, D29) — les réunions seulement au
// Back-Office. G1 : Évènements (App) ne montre plus aucune réunion (liste, fiche du volet de
// droite, accueil) ; un évènement de pôle (lot E) y reste. G2 : l'adresse `/evenements/<id>`
// d'une réunion mène à sa fiche de Back-Office › Réunions ; rappels, notifications et cloche y
// mènent aussi. G3 : un membre d'équipe sans autre rôle a le sélecteur App · Back-Office et la
// seule entrée Réunions.
// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md, EQ-B) : le public de
// pôle devient celui d'une équipe (`equipe:da`, `equipe:louange` pour le public Louange élargi) ;
// un membre d'équipe ou un choriste a Tâches et Réunions (EQ17, décisions 4 et 5).

/** Samedi 10 octobre à 20:00, TEAM DA, organisé par Alice. */
const BASE = {
  type: "loisir", pour: "equipe:da", date: "2026-10-10", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};
/** Réunion de TEAM DA (« + Nouvelle réunion »). */
const REUNION_DA = { ...BASE, titre: "Réunion DA", reunion: true };
/** Réunion d'avant le lot E : public d'équipe, sans champ — toujours une réunion. */
const ANCIENNE = { ...BASE, titre: "Point DA", date: "2026-10-08" };
/** Évènement de TEAM DA (lot E) : il reste dans Évènements. */
const SOIREE = { ...BASE, titre: "Soirée DA", reunion: false, inscriptions: "ouvertes", date: "2026-10-12" };
/** Réunion de Louange : choristes et musiciens en sont, par un rôle de service (public élargi, décision 5). */
const REUNION_LOUANGE = { ...BASE, titre: "Réunion Louange", pour: "equipe:louange", reunion: true };
/** Réunion de l'équipe Régie de l'organigramme. */
const REUNION_REGIE = { ...BASE, titre: "Réunion Régie", pour: "equipe:regie", reunion: true, organisateurUid: "uid-rose", organisateurNom: "Rose T." };

const DOCS = { "evenements/reunion-da": REUNION_DA, "evenements/ancienne": ANCIENNE, "evenements/soiree": SOIREE };

const BRUNO: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", dansEquipes: ["da"] };
/** Hugo : membre de l'équipe Régie, sans autre rôle (D29). */
const HUGO: FakeProfile = { uid: "uid-hugo", email: "hugo@example.com", firstName: "Hugo", lastName: "B.", dansEquipes: ["regie"] };
const CHORISTE: FakeProfile = { uid: "uid-ch", email: "ch@example.com", firstName: "Chloé", lastName: "R.", serviceRoles: { "Culte Francophone": ["chanteur"] } };

const qui = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) => ({ serviceRoles: {}, annonces: [], notify: [], plannings: [], ...p }) as unknown as UserProfile;
const ev = (x: Record<string, unknown>, id: string) => ({ ...x, id }) as unknown as Evenement;

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTablettePaysage = (info: TestInfo) => info.project.name === "tablette-paysage";
const capture = (page: Page, info: TestInfo, nom: string) =>
  page.screenshot({ animations: "disabled", path: path.join(__dirname, "..", "test-results", "reunions-back-office-captures", `${info.project.name}-${nom}.png`) });
/** Jamais le vrai Google Sheet depuis les tests. */
const sansSheet = (page: Page) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));

async function ouvrir(page: Page, p: FakeProfile, vers: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await sansSheet(page);
  return signInAs(page, p, docs, vers);
}

/** Le menu du Back-Office : la barre latérale en grand, la barre du bas sinon. */
function menu(page: Page, info: TestInfo) {
  if (estOrdinateur(info)) return page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" });
  if (estTablettePaysage(info)) return page.getByTestId("barre-par-dessus").getByRole("navigation", { name: "Navigation principale" });
  return page.getByTestId("barre-du-bas");
}

// ─── Purs ───────────────────────────────────────────────────────────────────

test("G3 : un membre d'équipe sans autre rôle, comme un choriste, a Tâches et Réunions (EQ17, décisions 4 et 5)", () => {
  expect(entreesBackOffice(qui(HUGO), profil(HUGO))).toEqual(["taches", "reunions"]);
  expect(entreesBackOffice(qui(CHORISTE), profil(CHORISTE))).toEqual(["taches", "reunions"]);
  // Un référent est responsable : Tâches de son équipe, et Évènements (décision 43).
  const rose = { uid: "uid-rose", email: "rose@example.com", dansEquipes: ["regie"], referentDe: ["regie"] };
  expect(entreesBackOffice(qui(rose), profil(rose))).toEqual(["tableau", "calendrier", "taches", "evenements", "reunions"]);
});

test("G2 : la fiche d'une réunion est au Back-Office, celle d'un évènement (d'équipe compris) dans l'App", () => {
  expect(ficheEvenement({ id: "r", pour: "equipe:da", reunion: true })).toBe("/back-office/reunions/r");
  expect(ficheEvenement({ id: "a", pour: "equipe:da" })).toBe("/back-office/reunions/a");
  expect(ficheEvenement({ id: "e", pour: "equipe:regie" })).toBe("/back-office/reunions/e");
  expect(ficheEvenement({ id: "s", pour: "equipe:da", reunion: false })).toBe("/evenements/s");
  expect(ficheEvenement({ id: "f", pour: "eglise" })).toBe("/evenements/f");
});

test("G2 : le rappel du matin d'une réunion mène au Back-Office ; celui d'un évènement, à l'App", () => {
  const veille = (e: Evenement) => ({ kind: "veille" as const, evenement: e, sujets: 1 });
  const reunion = ev(REUNION_DA, "reunion-da");
  const seule = notificationsDuMatin({ services: [], taches: [], lignes: [veille(reunion)] }, "fr", "2026-10-09");
  expect(seule[0].url).toBe("/back-office/reunions/reunion-da");
  // Deux réunions : la liste des réunions du Back-Office.
  const deux = notificationsDuMatin({ services: [], taches: [], lignes: [veille(reunion), { kind: "compteRendu", evenement: ev(ANCIENNE, "ancienne") }] }, "zh-CN", "2026-10-09");
  expect(deux[0].url).toBe("/back-office/reunions");
  // Un évènement d'équipe : sa fiche de l'App ; une réunion et un évènement : l'agenda de l'App.
  const soiree = ev(SOIREE, "soiree");
  expect(notificationsDuMatin({ services: [], taches: [], lignes: [{ kind: "veille", evenement: soiree }] }, "fr", "2026-10-11")[0].url).toBe("/evenements/soiree");
  expect(notificationsDuMatin({ services: [], taches: [], lignes: [veille(reunion), { kind: "veille", evenement: soiree }] }, "fr", "2026-10-09")[0].url).toBe("/evenements");
});

test("G2 : la notification de publication d'une réunion mène au Back-Office ; d'un évènement, à l'App", () => {
  // Relecture du lot G : la route /api/push/notify-evenement compose son envoi avec pushNouvelEvenement.
  for (const lang of ["fr", "zh-CN"] as const) {
    expect(pushNouvelEvenement(ev(REUNION_DA, "reunion-da"), lang)).toMatchObject({ url: "/back-office/reunions/reunion-da", tag: "evenement-reunion-da" });
    expect(pushNouvelEvenement(ev(ANCIENNE, "ancienne"), lang).url).toBe("/back-office/reunions/ancienne");
    expect(pushNouvelEvenement(ev(SOIREE, "soiree"), lang)).toMatchObject({ url: "/evenements/soiree", tag: "evenement-soiree" });
  }
  expect(pushNouvelEvenement(ev(SOIREE, "soiree"), "fr").title).toBe("Évènement — Soirée DA");
  expect(pushNouvelEvenement(ev(SOIREE, "soiree"), "zh-CN").title).toBe("活动：Soirée DA");
});

// ─── Écrans ─────────────────────────────────────────────────────────────────

test("G1 : un membre de l'équipe ne voit aucune réunion dans Évènements ; l'évènement d'équipe y reste", async ({ page }, info) => {
  await ouvrir(page, BRUNO, "/evenements");
  await expect(page.getByRole("link", { name: /Soirée DA/ }).first()).toBeVisible();
  await expect(page.getByText("Réunion DA")).toHaveCount(0);
  await expect(page.getByText("Point DA")).toHaveCount(0);
  // En grand, la fiche de droite est celle du prochain évènement : la soirée, pas la réunion du 8.
  await expect(page.getByRole("region", { name: /^Sujets/ })).toHaveCount(0);
  await capture(page, info, "evenements");
});

test("G1 : Évènements ne lit aucune inscription pour une réunion", async ({ page }) => {
  // Relecture du lot G : une lecture d'inscription par évènement affiché, aucune pour une réunion.
  const lues: string[] = [];
  page.on("request", (r) => {
    const m = /\/evenements\/([\w-]+)\/inscriptions\//.exec(decodeURIComponent(r.url()));
    if (m) lues.push(m[1]);
  });
  await ouvrir(page, BRUNO, "/evenements");
  await expect(page.getByRole("link", { name: /Soirée DA/ }).first()).toBeVisible();
  await expect.poll(() => lues).toContain("soiree");
  expect(lues).not.toContain("reunion-da");
  expect(lues).not.toContain("ancienne");
});

test("G1 : l'accueil ne montre pas la réunion dans « Prochains évènements »", async ({ page }) => {
  await ouvrir(page, BRUNO, "/planning");
  const carte = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Prochains évènements" }) });
  await expect(carte.getByRole("link", { name: /Soirée DA/ })).toBeVisible();
  await expect(carte.getByText("Réunion DA")).toHaveCount(0);
  await expect(carte.getByText("Point DA")).toHaveCount(0);
});

test("G2 : l'adresse d'une réunion dans l'App mène à sa fiche de Back-Office › Réunions", async ({ page }, info) => {
  await ouvrir(page, BRUNO, "/evenements/reunion-da");
  await page.waitForURL(/\/back-office\/reunions\/reunion-da\/?$/);
  await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
  await capture(page, info, "fiche-reunion");
  // L'évènement d'équipe garde sa fiche de l'App.
  await page.goto("/evenements/soiree");
  await expect(page.getByRole("heading", { name: "Soirée DA" }).first()).toBeVisible();
  expect(new URL(page.url()).pathname).toMatch(/^\/evenements\/soiree\/?$/);
});

test("G2 : la cloche mène la réunion à sa fiche de Back-Office", async ({ page }) => {
  await ouvrir(page, BRUNO, "/songs");
  const cloche = page.getByRole("button", { name: /notification/i });
  await expect(cloche).toBeVisible();
  await cloche.click();
  await expect(page.getByRole("menuitem", { name: /Réunion DA/ })).toHaveAttribute("href", /\/back-office\/reunions\/reunion-da\/?$/);
  await expect(page.getByRole("menuitem", { name: /Soirée DA/ })).toHaveAttribute("href", /\/evenements\/soiree\/?$/);
});

test("G2 : un choriste (public Louange, EQ17) suit le lien d'une réunion de Louange jusqu'à sa fiche de Back-Office", async ({ page }) => {
  await ouvrir(page, CHORISTE, "/songs", { "evenements/reunion-louange": REUNION_LOUANGE });
  const cloche = page.getByRole("button", { name: /notification/i });
  await expect(cloche).toBeVisible();
  await cloche.click();
  const lien = page.getByRole("menuitem", { name: /Réunion Louange/ });
  await expect(lien).toHaveAttribute("href", /\/back-office\/reunions\/reunion-louange\/?$/);
  await lien.click();
  await page.waitForURL(/\/back-office\/reunions\/reunion-louange\/?$/);
  await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
});

test("G2 : sans l'entrée Réunions (l'organisatrice sortie de l'équipe, sans autre droit), le lien d'une réunion mène à sa fiche de l'App", async ({ page }) => {
  // Relecture du lot G : cloche, notification et rappel donnent l'adresse du Back-Office ; qui n'a
  // pas l'entrée Réunions est renvoyé à la fiche de l'App, où il propose ses sujets. Depuis le lot 1
  // du chantier « équipes et groupes », un choriste a l'entrée (public Louange) : l'organisatrice
  // qui n'est plus de l'équipe et n'a aucun droit est ce cas.
  // La cloche ne lui montre pas sa propre réunion : l'adresse vient d'un rappel ou d'une notification.
  const sortie: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q." };
  await ouvrir(page, sortie, "/songs", { "evenements/reunion-louange": REUNION_LOUANGE });
  await page.goto("/back-office/reunions/reunion-louange");
  await page.waitForURL(/\/evenements\/reunion-louange\/?$/);
  await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
  await expect(page.getByText("Réservé aux responsables.")).toHaveCount(0);
  // Le Back-Office lui reste fermé (lot U6, Réussite 1).
  await page.goto("/back-office/reunions");
  await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
});

test("G2 : sans compte, l'adresse d'une réunion au Back-Office propose de se connecter", async ({ page }) => {
  await page.goto("/back-office/reunions/reunion-louange");
  await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", /^\/login\/?\?from=%2Fback-office%2Freunions%2Freunion-louange$/);
});

test("G3 : un membre d'équipe sans autre rôle — sélecteur, Tâches et Réunions, ses réunions", async ({ page }, info) => {
  await ouvrir(page, HUGO, "/evenements", { "evenements/reunion-regie": REUNION_REGIE });
  await expect(page.getByRole("heading", { name: "Évènements" }).first()).toBeVisible();
  await expect(page.getByText("Réunion Régie")).toHaveCount(0);
  // Le sélecteur App · Back-Office (en paysage, dans la barre latérale dépliée).
  if (estTablettePaysage(info)) await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale/ }).tap();
  const selecteur = page.getByRole("group", { name: "Choisir l'espace" }).filter({ visible: true });
  await expect(selecteur.getByRole("link", { name: "Back-Office" })).toBeVisible();
  await selecteur.getByRole("link", { name: "Back-Office" }).click();
  // Pas de tableau de bord : le Back-Office s'ouvre sur sa première entrée, Tâches (EQ17).
  await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
  await page.goto("/back-office/reunions");
  await expect(page.getByRole("link", { name: /Réunion Régie/ }).first()).toBeVisible();
  if (estTablettePaysage(info)) await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale/ }).tap();
  await expect(menu(page, info).getByRole("link")).toHaveText(estOrdinateur(info) || estTablettePaysage(info) ? ["Tâches", "Réunions"] : ["Tâches", "Réunions", "Plus"]);
  await capture(page, info, "membre-equipe");
  // Ni tableau de bord, ni calendrier, ni autre entrée : retour à Tâches.
  for (const ailleurs of ["/back-office", "/back-office/calendrier", "/back-office/evenements"]) {
    await page.goto(ailleurs);
    await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
  }
  await expect(page.getByRole("heading", { name: "Tableau de bord" })).toHaveCount(0);
  // L'adresse de sa réunion dans l'App mène au Back-Office, avec les sujets.
  await page.goto("/evenements/reunion-regie");
  await page.waitForURL(/\/back-office\/reunions\/reunion-regie\/?$/);
  await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
});

test("G3 : un choriste a le sélecteur et le Back-Office, Tâches et Réunions (EQ17, décision 5)", async ({ page }) => {
  await ouvrir(page, CHORISTE, "/back-office", { "evenements/reunion-louange": REUNION_LOUANGE });
  await page.waitForURL(/\/back-office\/taches(\/[\w-]+)?\/?$/);
  await expect(page.getByText("Réservé aux responsables.")).toHaveCount(0);
  await page.goto("/back-office/reunions");
  await expect(page.getByRole("link", { name: /Réunion Louange/ }).first()).toBeVisible();
});
