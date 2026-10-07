import { expect, test, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estReunion, publicDeReunion } from "../src/lib/access";
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
