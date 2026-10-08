import { expect, test, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { canInscrireEvenement, canSeeEvenement, entreesBackOffice, estReunion, publicDeReunion } from "../src/lib/access";
import { destinatairesEvenement, inscrire } from "../src/lib/evenements/serveur";
import { baseBackOffice } from "../src/lib/navigation";
import { ouvertureDuJour } from "../src/lib/evenements/rappel";
import { evenementsAVenir } from "../src/lib/tableauDeBord/donnees";
import type { Evenement } from "../src/types/evenement";
import type { UserProfile } from "../src/types/user";

// Retouches v18, lot E (docs/spec-retouches-v18.md) — évènements réservés à un pôle.
// Tranche E1-E2 : un évènement porte `reunion: true | false` ; absent = comme avant
// (une réunion si le public est un pôle ou une équipe). « + Nouvelle réunion » écrit
// `true`, « Nouvel évènement » écrit `false`, quel que soit le public. `estReunion`
// prend l'évènement (public et champ) ; cartes, fiche, listes du BO, création et
// rappels suivent.

/** Évènement du pôle DA, samedi 10 octobre à 20:00, organisé par Alice. Sans `reunion`. */
const BASE = {
  titre: "Soirée DA", type: "loisir", pour: "pole:da", date: "2026-10-10", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "ouvertes",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-alice", organisateurNom: "Alice Q.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};
/** Évènement de pôle (lot E) : `reunion: false`. */
const SOIREE = { ...BASE, reunion: false };
/** Réunion d'avant le lot E : public de pôle, pas de champ. */
const ANCIENNE = { ...BASE, titre: "Réunion DA", inscriptions: "fermees" };

const ev = (x: Record<string, unknown>) => ({ ...x, id: "x" }) as unknown as Evenement;

// Alice : pôle DA et droit d'annonces du Groupe Paix (Évènements et Réunions au Back-Office).
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", poles: ["da"], annonces: ["Groupe Paix"] };
const BRUNO: FakeProfile = { uid: "uid-bruno", email: "bruno@example.com", firstName: "Bruno", lastName: "M.", poles: ["da"] };

const capture = (page: Page, info: TestInfo, nom: string) =>
  page.screenshot({ path: path.join(__dirname, "..", "test-results", "evenements-pole-captures", `${info.project.name}-${nom}.png`) });
const sansPush = (page: Page) => page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
const creee = (db: Awaited<ReturnType<typeof signInAs>>) =>
  db.writes.filter((w) => w.method === "POST" && /^evenements\/[^/]+$/.test(w.path)).pop()!;

// ─── Purs ───────────────────────────────────────────────────────────────────

test("E1 : sans champ, un public de pôle ou d'équipe reste une réunion ; « reunion: false » en fait un évènement", () => {
  expect(estReunion({ pour: "pole:da" })).toBe(true);
  expect(estReunion({ pour: "equipe:regie" })).toBe(true);
  expect(estReunion({ pour: "eglise" })).toBe(false);
  expect(estReunion({ pour: "Groupe Paix" })).toBe(false);
  expect(estReunion({ pour: "pole:da", reunion: false })).toBe(false);
  expect(estReunion({ pour: "equipe:regie", reunion: false })).toBe(false);
  expect(estReunion({ pour: "pole:da", reunion: true })).toBe(true);
  // Une réunion a toujours un pôle ou une équipe : le champ seul n'en fait pas une.
  expect(estReunion({ pour: "eglise", reunion: true })).toBe(false);
  // Le public seul : peut-il être celui d'une réunion ?
  expect(publicDeReunion("pole:da")).toBe(true);
  expect(publicDeReunion("equipe:regie")).toBe(true);
  expect(publicDeReunion("eglise")).toBe(false);
});

test("E2 : au Back-Office, un évènement de pôle se gère sous Évènements, une réunion sous Réunions", () => {
  expect(baseBackOffice({ pour: "pole:da", reunion: false })).toBe("/back-office/evenements");
  expect(baseBackOffice({ pour: "pole:da" })).toBe("/back-office/reunions");
  expect(baseBackOffice({ pour: "pole:da", reunion: true })).toBe("/back-office/reunions");
  expect(baseBackOffice({ pour: "eglise" })).toBe("/back-office/evenements");
});

test("E2 : rappels — l'ouverture des inscriptions vaut pour un évènement de pôle, jamais pour une réunion", () => {
  const ouvre = { ...BASE, inscriptions: "auto", inscriptionDebut: "2026-10-01" };
  expect(ouvertureDuJour(ev({ ...ouvre, reunion: false }), "2026-10-01")).toBe(true);
  expect(ouvertureDuJour(ev(ouvre), "2026-10-01")).toBe(false);
});

test("E2 : tableau de bord — « Prochains évènements » montre l'évènement de pôle, pas la réunion", () => {
  const user = { uid: BRUNO.uid, email: BRUNO.email };
  const profil = { poles: ["da"] } as unknown as UserProfile;
  const liste = [{ ...ev(SOIREE), id: "soiree" }, { ...ev(ANCIENNE), id: "reunion" }];
  expect(evenementsAVenir(liste, user, profil, "2026-10-01", {}).map((x) => x.id)).toEqual(["soiree"]);
});

// ─── Écrans ─────────────────────────────────────────────────────────────────

test("« Nouvel évènement » pour un pôle : avec inscriptions, écrit « reunion: false », rangé sous Évènements et pas Réunions", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const db = await signInAs(page, ALICE, {}, "/back-office/evenements/nouveau");
  await sansPush(page);
  await page.getByLabel("Public").selectOption({ label: "Pôle DA" });
  await expect(page.getByRole("radiogroup", { name: "Inscriptions" })).toBeVisible();
  await page.getByLabel("Nom de l'évènement").fill("Soirée DA");
  await capture(page, info, "formulaire");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await page.waitForURL(/\/back-office\/evenements\/fake-\d+\/?$/);
  const ecrit = creee(db);
  expect(ecrit.data).toMatchObject({ pour: "pole:da", reunion: false });
  const id = ecrit.path.split("/")[1];

  // La fiche de gestion ne porte pas les sujets d'une réunion.
  await expect(page.getByRole("region", { name: /^Sujets/ })).toHaveCount(0);
  // Ouverte sous Réunions, elle repart sous Évènements.
  await page.goto(`/back-office/reunions/${id}`);
  await page.waitForURL(new RegExp(`/back-office/evenements/${id}/?$`));
  // Listée dans Évènements…
  await page.goto("/back-office/evenements");
  await expect(page.getByRole("link", { name: /Soirée DA/ }).first()).toBeVisible();
  await capture(page, info, "liste-evenements");
  // … et pas dans Réunions.
  await page.goto("/back-office/reunions");
  await expect(page.getByText("Aucune réunion").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Soirée DA/ })).toHaveCount(0);
});

test("« + Nouvelle réunion » : sans inscriptions, écrit « reunion: true », rangée sous Réunions", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const db = await signInAs(page, ALICE, {}, "/back-office/reunions/nouvelle");
  await sansPush(page);
  await expect(page.getByLabel("Public")).toHaveValue("pole:da");
  await expect(page.getByRole("radiogroup", { name: "Inscriptions" })).toHaveCount(0);
  await page.getByLabel("Nom de l'évènement").fill("Réunion DA");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await page.waitForURL(/\/back-office\/reunions\/fake-\d+\/?$/);
  expect(creee(db).data).toMatchObject({ pour: "pole:da", reunion: true, inscriptions: "fermees" });
});

test("ancienne réunion sans champ, public de pôle : toujours une réunion (Réunions, sujets, pas d'inscription)", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, ALICE, { "evenements/ancienne": ANCIENNE }, "/back-office/evenements/ancienne");
  await page.waitForURL(/\/back-office\/reunions\/ancienne\/?$/);
  await page.goto("/evenements/ancienne");
  await expect(page.getByRole("region", { name: /^Sujets/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "S'inscrire" })).toHaveCount(0);
});

test("fiche de l'App : un membre du pôle voit l'évènement de pôle avec « S'inscrire », sans sujets de réunion", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, BRUNO, { "evenements/soiree": SOIREE }, "/evenements/soiree");
  await expect(page.getByRole("heading", { name: "Soirée DA" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "S'inscrire" })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Sujets/ })).toHaveCount(0);
  await capture(page, info, "fiche-app");
});

// ─── Tranche E3-E6 ──────────────────────────────────────────────────────────
// Un évènement de pôle (`reunion: false`) se vit comme un évènement de l'assemblée
// (inscriptions, inscrits, rappel), mais ne se voit que des membres du pôle, des admins
// et de la coordination, avec le badge du pôle (D22) ; la notification de publication
// ne part qu'aux membres du pôle (D23) ; la route d'inscription refuse les autres (E6).

// Clara : pôle Média (pas DA). Chloé : coordination (pôle « evenement »).
const CLARA: FakeProfile = { uid: "uid-clara", email: "clara@example.com", firstName: "Clara", lastName: "V.", poles: ["media"] };
const CHLOE: FakeProfile = { uid: "uid-chloe", email: "chloe@example.com", firstName: "Chloé", lastName: "R.", poles: ["evenement"] };
const ADMIN = { uid: "uid-admin", email: "tc328829@gmail.com" };
const qui = (p: FakeProfile) => ({ uid: p.uid, email: p.email });

test("E4 : l'évènement de pôle se voit des membres du pôle, des admins et de la coordination, pas des autres", () => {
  const soiree = { ...SOIREE, organisateurUid: "uid-autre" };
  expect(canSeeEvenement(qui(BRUNO), BRUNO, soiree)).toBe(true);
  expect(canSeeEvenement(ADMIN, null, soiree)).toBe(true);
  expect(canSeeEvenement(qui(CHLOE), CHLOE, soiree)).toBe(true);
  expect(canSeeEvenement(qui(CLARA), CLARA, soiree)).toBe(false);
  expect(canSeeEvenement(null, null, soiree)).toBe(false);
  // Même règle pour une équipe.
  const equipe = { ...soiree, pour: "equipe:regie" };
  expect(canSeeEvenement(qui(CLARA), { dansEquipes: ["regie"] }, equipe)).toBe(true);
  expect(canSeeEvenement(qui(CHLOE), CHLOE, equipe)).toBe(true);
  expect(canSeeEvenement(qui(CLARA), CLARA, equipe)).toBe(false);
  // Une réunion reste celle de ses membres : la coordination n'y entre pas.
  expect(canSeeEvenement(qui(CHLOE), CHLOE, { ...ANCIENNE, organisateurUid: "uid-autre" })).toBe(false);
  expect(canSeeEvenement(qui(CHLOE), CHLOE, { ...ANCIENNE, pour: "equipe:regie", organisateurUid: "uid-autre" })).toBe(false);
});

test("E6 : s'inscrire à un évènement de pôle — ceux qui le voient ; les autres publics comme avant", () => {
  const soiree = { ...SOIREE, organisateurUid: "uid-autre" };
  expect(canInscrireEvenement(qui(BRUNO), BRUNO, soiree)).toBe(true);
  expect(canInscrireEvenement(qui(CHLOE), CHLOE, soiree)).toBe(true);
  expect(canInscrireEvenement(qui(CLARA), CLARA, soiree)).toBe(false);
  // Sans compte, même ouvert aux inscriptions sans compte : non.
  const sansCompte = { ...soiree, sansCompte: true };
  expect(canInscrireEvenement(null, null, sansCompte)).toBe(false);
  expect(canInscrireEvenement(qui(CLARA), CLARA, { ...soiree, pour: "equipe:regie" })).toBe(false);
  // L'église et les sections : la route ne filtrait pas, elle ne filtre toujours pas.
  expect(canInscrireEvenement(null, null, { ...soiree, pour: "eglise" })).toBe(true);
  expect(canInscrireEvenement(qui(CLARA), CLARA, { ...soiree, pour: "Groupe Paix" })).toBe(true);
});

test("E5 : la notification d'un évènement de pôle part aux seuls membres du pôle", async () => {
  const users: Record<string, Record<string, unknown>> = {
    "uid-bruno": { poles: ["da"] }, "uid-alice": { poles: ["da", "media"] },
    "uid-clara": { poles: ["media"] }, "uid-chloe": { poles: ["evenement"] }, "uid-noe": {},
  };
  const db = {
    collection: () => ({ get: async () => ({ docs: Object.entries(users).map(([id, d]) => ({ id, data: () => d })) }) }),
  } as unknown as Parameters<typeof destinatairesEvenement>[0];
  expect((await destinatairesEvenement(db, { pour: "pole:da" })).sort()).toEqual(["uid-alice", "uid-bruno"]);
});

test("E4 : dans l'App, un non-membre ne voit ni la carte ni la fiche de l'évènement de pôle", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, CLARA, { "evenements/soiree": SOIREE }, "/evenements");
  await expect(page.getByRole("heading", { name: "Évènements" }).first()).toBeVisible();
  await expect(page.getByText("Soirée DA")).toHaveCount(0);
  await page.goto("/evenements/soiree");
  await expect(page.getByText("Évènement introuvable.")).toBeVisible();
});

test("E4 : la coordination voit l'évènement de pôle, avec le badge du pôle sur la carte et la fiche", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, CHLOE, { "evenements/soiree": SOIREE }, "/evenements");
  // Téléphone et tablette : la grande carte porte le badge. Grand écran (deux volets) : la ligne
  // de l'agenda aussi (relecture), pas seulement la fiche montrée à droite.
  const versLaFiche = page.locator('a[href^="/evenements/soiree"]');
  await expect(versLaFiche.first()).toBeVisible();
  for (let i = 0; i < await versLaFiche.count(); i++) {
    await expect(versLaFiche.nth(i).getByText("Pôle DA", { exact: true })).toBeVisible();
  }
  await capture(page, info, "carte-coordination");
  await page.goto("/evenements/soiree");
  await expect(page.getByRole("heading", { name: "Soirée DA" }).first()).toBeVisible();
  await expect(page.getByText("Pôle DA", { exact: true }).first()).toBeVisible();
});

test("E3 : un membre du pôle s'inscrit à l'évènement de pôle, la fiche le dit inscrit", async ({ page }, info) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, BRUNO, { "evenements/soiree": SOIREE }, "/evenements/soiree");
  let sent: { evenementId: string; invites: number } | null = null;
  await page.route("**/api/evenements/inscription", (route) => {
    sent = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true, inscrits: 1, mine: { id: "uid-bruno", nom: "Bruno M.", invites: 0 } } });
  });
  await page.getByRole("button", { name: "S'inscrire" }).click();
  await page.getByRole("button", { name: "Confirmer" }).click();
  await expect(page.getByTestId("fiche-carte").getByText("Inscrit", { exact: true })).toBeVisible();
  expect(sent).toEqual({ evenementId: "soiree", invites: 0 });
  await capture(page, info, "inscrit");
});

test("E3 : au Back-Office, la fiche de gestion de l'évènement de pôle porte la carte des inscrits", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, ALICE, {
    "evenements/soiree": { ...SOIREE, inscrits: 1 },
    "evenements/soiree/inscriptions/uid-bruno": { uid: "uid-bruno", nom: "Bruno M.", invites: 0, createdAt: "2026-10-01T09:00:00Z" },
  }, "/back-office/evenements/soiree");
  await expect(page.getByText("Bruno M.").first()).toBeVisible();
  await expect(page.getByRole("region", { name: /^Sujets/ })).toHaveCount(0);
});

test("E5 : « Nouvel évènement » pour un pôle, « Prévenir les membres » coché, demande la notification de publication", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const db = await signInAs(page, ALICE, {}, "/back-office/evenements/nouveau");
  let notifie: { evenementId: string } | null = null;
  await page.route("**/api/push/notify-evenement", (route) => {
    notifie = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await page.getByLabel("Public").selectOption({ label: "Pôle DA" });
  await expect(page.getByRole("switch", { name: "Prévenir les membres" })).toBeChecked();
  await page.getByLabel("Nom de l'évènement").fill("Soirée DA");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await page.waitForURL(/\/back-office\/evenements\/fake-\d+\/?$/);
  const id = creee(db).path.split("/")[1];
  await expect.poll(() => notifie).toEqual({ evenementId: id });
});

// ─── Relecture du lot E ─────────────────────────────────────────────────────

test("relecture : « Nouvel évènement » et l'entrée Évènements restent aux admins, à la coordination et aux droits d'annonces ; un membre de pôle seul a Réunions", () => {
  // Choix consigné dans la spec (Avancement, V18POLE) : la règle d'affichage de l'agencement v18 (B15)
  // ne bouge pas avec le lot E. Un membre du pôle DA sans droit d'annonces crée des réunions, pas
  // d'évènement de pôle ; Alice, pôle DA et droit d'annonces, a le bouton et y choisit « Pôle DA ».
  const profil = (p: FakeProfile) => p as unknown as UserProfile;
  expect(entreesBackOffice(qui(BRUNO), profil(BRUNO))).toEqual(["tableau", "calendrier", "taches", "reunions"]);
  expect(entreesBackOffice(qui(ALICE), profil(ALICE))).toContain("evenements");
});

test("relecture : depuis l'en-tête de BO › Évènements, « Nouvel évènement » propose le pôle de la personne", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, ALICE, {}, "/back-office/evenements");
  await page.getByRole("link", { name: "Nouvel évènement" }).click();
  await page.waitForURL(/\/back-office\/evenements\/nouveau\/?$/);
  await expect(page.getByLabel("Public").locator("option")).toHaveText(["Groupe Paix", "Pôle DA"]);
});

test("relecture : un évènement de pôle n'a pas « sans compte » — la case disparaît et rien n'est écrit", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  const db = await signInAs(page, ALICE, {}, "/back-office/evenements/nouveau");
  await sansPush(page);
  await page.getByLabel("Nom de l'évènement").fill("Soirée DA");
  await page.getByLabel("Date", { exact: true }).fill("2026-10-10");
  // Pour une section, la case existe ; cochée, puis le public passe au pôle.
  await expect(page.getByLabel("Public")).toHaveValue("Groupe Paix");
  await page.getByText("Plus d'options").click();
  const sansCompte = page.getByRole("checkbox", { name: "Les personnes sans compte peuvent s'inscrire" });
  await sansCompte.check();
  await page.getByLabel("Public").selectOption({ label: "Pôle DA" });
  await expect(sansCompte).toHaveCount(0);
  // Les places, elles, restent.
  await expect(page.getByLabel("Places")).toBeVisible();
  await page.getByRole("button", { name: "Créer l'évènement" }).click();
  await page.waitForURL(/\/back-office\/evenements\/fake-\d+\/?$/);
  expect(creee(db).data).toMatchObject({ pour: "pole:da", reunion: false, sansCompte: false });
});

test("relecture : « Seulement moi » au calendrier ne lit pas l'inscription d'un évènement de pôle qu'on ne voit pas", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  // Aucun Sheet réel depuis les tests.
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const lues: string[] = [];
  page.on("request", (r) => {
    const m = /\/evenements\/([^/]+)\/inscriptions\//.exec(decodeURIComponent(r.url()));
    if (m && r.method() === "GET") lues.push(m[1]);
  });
  const FETE = { ...BASE, titre: "Fête de l'église", pour: "eglise", date: "2026-10-12", organisateurUid: "uid-autre" };
  // Clara est au pôle Média : la soirée du pôle DA ne lui est pas montrée, la fête de l'église si.
  await signInAs(page, CLARA, { "evenements/soiree": { ...SOIREE, organisateurUid: "uid-autre" }, "evenements/fete": FETE }, "/back-office/calendrier");
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  await page.getByRole("button", { name: "Seulement moi" }).click();
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  await expect.poll(() => lues).toContain("fete");
  expect(lues, "la soirée du pôle DA n'est pas lue").not.toContain("soiree");
});

/** Une base Firestore simulée pour `inscrire` : documents lus, écritures de la transaction gardées. */
function baseSimulee(docs: Record<string, Record<string, unknown>>) {
  const ecrits: Record<string, Record<string, unknown>> = {};
  let n = 0;
  const lire = async (chemin: string) => ({ exists: chemin in docs, data: () => docs[chemin] });
  type Ref = { path: string; id: string; get: () => ReturnType<typeof lire>; collection: (c: string) => { doc: (id?: string) => Ref } };
  const ref = (chemin: string): Ref => ({
    path: chemin,
    id: chemin.split("/").pop()!,
    get: () => lire(chemin),
    collection: (c) => ({ doc: (id) => ref(`${chemin}/${c}/${id ?? `auto-${++n}`}`) }),
  });
  const db = {
    collection: (c: string) => ({ doc: (id: string) => ref(`${c}/${id}`) }),
    runTransaction: async <T,>(fn: (tx: unknown) => Promise<T>) => fn({
      get: (r: Ref) => lire(r.path),
      set: (r: Ref, d: Record<string, unknown>) => { ecrits[r.path] = d; },
      update: (r: Ref, d: Record<string, unknown>) => { ecrits[r.path] = { ...docs[r.path], ...d }; },
    }),
  };
  return { db: db as unknown as Parameters<typeof inscrire>[0], ecrits };
}

test("E6 : la route d'inscription lit le profil en base — un membre du pôle (ou de l'équipe) s'inscrit, un autre reçoit 403", async () => {
  // Une date lointaine : la période d'inscription ne refuse rien, quel que soit le jour du test.
  const soiree = { ...SOIREE, date: "2099-10-10", organisateurUid: "uid-autre" };
  const { db, ecrits } = baseSimulee({
    "evenements/soiree": soiree,
    "evenements/regie": { ...soiree, pour: "equipe:regie" },
    "users/uid-bruno": { firstName: "Bruno", lastName: "M.", poles: ["da"] },
    "users/uid-clara": { firstName: "Clara", lastName: "V.", poles: ["media"] },
    "users/uid-rose": { firstName: "Rose", lastName: "L.", dansEquipes: ["regie"] },
  });
  const res = await inscrire(db, qui(BRUNO), { evenementId: "soiree", invites: 0, nomLibre: "" });
  expect(res.inscrits).toBe(1);
  expect(ecrits["evenements/soiree/inscriptions/uid-bruno"]).toMatchObject({ uid: "uid-bruno", nom: "Bruno M.", invites: 0 });

  await expect(inscrire(db, qui(CLARA), { evenementId: "soiree", invites: 0, nomLibre: "" })).rejects.toMatchObject({ status: 403 });
  expect(ecrits["evenements/soiree/inscriptions/uid-clara"]).toBeUndefined();

  // L'équipe se lit dans `dansEquipes` du profil.
  await expect(inscrire(db, { uid: "uid-rose", email: "rose@example.com" }, { evenementId: "regie", invites: 0, nomLibre: "" }))
    .resolves.toMatchObject({ inscrits: 1 });
  await expect(inscrire(db, qui(CLARA), { evenementId: "regie", invites: 0, nomLibre: "" })).rejects.toMatchObject({ status: 403 });
});
