import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS, isAdminEmail, canChangeSetlistCategory, canDeleteSetlist, canEditSetlist, canDuplicateSetlist } from "../src/lib/access";
type AuthUser = { uid: string; email?: string | null };
import type { UserProfile } from "../src/types/user";
import type { FSSetlist } from "../src/lib/firebase/setlists";
import { normalizeName } from "../src/lib/planning/names";
import { NOTIF_TYPES, DEFAULT_NOTIF_PREFS } from "../src/types/user";
import { planningReleaseMessage, setlistReadyMessage } from "../src/lib/push/messages";

// Lot « cohérence » (audit du 19/09/2026, décision D11) : les cinq bugs réels et
// les petites incohérences relevées par l'audit du code, chacun gardé par un
// test écrit avant la correction.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ADMIN_EMAIL = ADMIN_EMAILS[0];
const ADMIN: FakeProfile = {
  uid: "admin1", email: ADMIN_EMAIL, firstName: "Aurèle", lastName: "V.",
  planningName: "Aurèle V.", dansEquipes: ["da"], referentDe: ["da"], equipes: true, plannings: ["culte"], coordination: true,
};
const MEMBRE_DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Denis", lastName: "F.", dansEquipes: ["da"], referentDe: ["da"] };
const MEMBRE: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", serviceRoles: { "Groupe Paix": ["chanteur"] } };

/** Réunion du pôle DA créée par Alice : un évènement `pour: "equipe:da"` (lot 7). */
const REUNION_DA = {
  titre: "Réunion DA", type: "info", pour: "equipe:da", date: "2026-10-03", heure: "20:00", heureFin: "", dateFin: "",
  lieu: "Salle 2", description: "", liens: [], images: [], placesMax: null, inscriptions: "fermees",
  inscriptionDebut: "", inscriptionFin: "", sansCompte: false, lienExterne: "", contact: "",
  organisateurUid: "uid-alice", organisateurNom: "Alice", epingle: false, expiresAt: "", inscrits: 0,
  createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z",
};

async function open(page: Page, who: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-09-19T10:00:00"));
  // Les pages qui lisent le Google Sheet (profil, harmonie) reçoivent une feuille vide.
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, who, docs, to);
}

// ─── C4 : le profil ne remplace plus le document entier ────────────────────

test("profil : un admin qui enregistre son profil garde ses équipes et ses plannings", async ({ page }) => {
  const db = await open(page, ADMIN, "/profil");
  await page.getByLabel("Prénom").fill("Aurel");
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await page.waitForURL(/\/setlists\/?$/);
  const doc = db.doc("users/admin1");
  expect(doc?.firstName).toBe("Aurel");
  expect(doc?.dansEquipes).toEqual(["da"]);
  expect(doc?.equipes).toBe(true);
  expect(doc?.plannings).toEqual(["culte"]);
  expect(doc?.coordination).toBe(true);
  // L'écriture ne porte que les champs du formulaire : jamais les droits.
  const patch = db.writes.find((w) => w.path === "users/admin1");
  expect(patch).toBeDefined();
  expect(Object.keys(patch!.data)).not.toContain("dansEquipes");
  expect(Object.keys(patch!.data)).not.toContain("plannings");
  expect(Object.keys(patch!.data)).not.toContain("coordination");
});

// ─── C2 : la cloche connaît les réunions d'équipe ───────────────────────────

test("cloche : une réunion d'équipe apparaît pour un membre de l'équipe, pas pour un autre membre", async ({ page }) => {
  await open(page, MEMBRE_DA, "/evenements", { "evenements/reunion-da": REUNION_DA });
  const cloche = page.getByRole("button", { name: /notification/i });
  await expect(cloche).toContainText("1");
  await cloche.click();
  await expect(page.getByRole("menuitem", { name: /Réunion DA/ })).toBeVisible();
});

test("cloche : la réunion d'un pôle reste invisible pour qui n'en est pas", async ({ page }) => {
  await open(page, MEMBRE, "/evenements", { "evenements/reunion-da": REUNION_DA });
  const cloche = page.getByRole("button", { name: /notification/i });
  await expect(cloche).toBeVisible();
  await expect(cloche).not.toContainText("1");
});

// ─── C1 et harmonie : Équipes et Harmonie se trouvent depuis le menu ───────

test("ordinateur : le menu du compte mène à Équipes, et à Harmonie pour qui y a accès", async ({ page }) => {
  test.skip(test.info().project.name !== "ordinateur", "le menu du compte n'existe que sur ordinateur");
  await open(page, ADMIN, "/evenements");
  // L'indicateur de Next (développement seulement) est posé en bas à gauche, sur l'initiale
  // du pied de la barre latérale (lot U4).
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.getByRole("button", { name: "Compte" }).click();
  await expect(page.getByRole("menuitem", { name: "Équipes" })).toHaveAttribute("href", /\/equipes/);
  await expect(page.getByRole("menuitem", { name: "Harmonie" })).toHaveAttribute("href", /\/harmonie/);
});

test("Moi : la ligne Harmonie n'apparaît qu'à qui a accès au catalogue", async ({ page }) => {
  test.skip(test.info().project.name === "ordinateur", "la page Moi est celle du tactile");
  await open(page, ADMIN, "/moi");
  await expect(page.getByRole("link", { name: "Harmonie" })).toHaveAttribute("href", /\/harmonie/);
  await open(page, MEMBRE, "/moi");
  await expect(page.getByRole("link", { name: "Équipes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Harmonie" })).toHaveCount(0);
});

// ─── C3 : un seul manifeste ────────────────────────────────────────────────

test("manifeste : une seule source, celle de l'app, au nom et à la couleur du look", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = (await res.json()) as { name: string; short_name: string; theme_color: string; start_url: string; orientation?: string };
  expect(m.name).toBe("GCC");
  expect(m.short_name).toBe("GCC");
  expect(m.theme_color).toBe("#ffffff"); // fond blanc de 5C1 (docs/spec-look.md § 20/09/2026)
  // A3 bis : barre finale, pour que la copie hors ligne se retrouve (la redirection 308 n est pas gardée).
  expect(m.start_url).toBe("/planning/");
  // Lot U5 (docs/spec-deux-volets.md, question 7) : l'app installée tourne avec la
  // tablette, sinon ni deux volets ni deux colonnes sur une tablette Android couchée.
  expect(m.orientation, "aucune orientation imposée").toBeUndefined();
  const layout = lire("src/app/layout.tsx");
  expect(layout).not.toContain('rel="manifest"');
});

// ─── C5 : plus de préférence sans expéditeur ───────────────────────────────

test("préférences : la bascule « Annonces » a disparu avec les annonces", () => {
  // « petitDej » ajouté au lot U3 (docs/spec-petit-dej.md, PD4) : il a son expéditeur, le rappel du mercredi.
  expect(NOTIF_TYPES).toEqual(["reminders", "setlists", "evenements", "taches", "petitDej"]);
  expect(Object.keys(DEFAULT_NOTIF_PREFS).sort()).toEqual([...NOTIF_TYPES].sort());
});

// ─── I1 : une setlist privée ne se modifie ni ne se supprime en REST ───────

test("règles : la modification d'une setlist passe par canEditSetlistDoc, la suppression par canDeleteSetlistDoc", () => {
  const rules = lire("firestore.rules");
  const bloc = rules.slice(rules.indexOf("match /setlists/{id}"), rules.indexOf("match /history/{entryId}"));
  const update = bloc.slice(bloc.indexOf("allow update"), bloc.indexOf("allow delete"));
  const del = bloc.slice(bloc.indexOf("allow delete"));
  expect(update).toContain("canEditSetlistDoc(resource.data)");
  expect(del).toContain("canDeleteSetlistDoc(resource.data)");
  // Changer de catégorie : miroir de canChangeSetlistCategory (= canDeleteSetlist : propriétaire, admin), pas l'équipe.
  expect(update).toContain("resource.data.get('ownerId', '') == request.auth.uid\n          || isAdmin()\n          || request.resource.data.category == resource.data.category\n        )");
  expect(canChangeSetlistCategory).toBe(canDeleteSetlist);
  // Une privée ne se supprime pas en REST par un autre que son propriétaire.
  const sup = rules.slice(rules.indexOf("function canDeleteSetlistDoc"));
  const fonction = sup.slice(0, sup.indexOf("\n    }"));
  expect(fonction).toContain("!setlist.get('isPrivate', false) && isAdmin()");
  // SC1 : le niveau « edit » de la catégorie (musiciens, présidence) ne donne plus la suppression.
  expect(fonction).not.toContain("isEditorOf");
});

// ─── SC1 : le créateur seul modifie et supprime (docs/spec-createur-corbeille-absences.md) ───

test("SC1 : créateur, admin, équipe, musicien de la catégorie — modifier, supprimer, dupliquer", () => {
  const createur = { uid: "u-createur", email: "createur@exemple.test" } as AuthUser;
  const musicien = { uid: "u-musicien", email: "musicien@exemple.test" } as AuthUser;
  const choriste = { uid: "u-choriste", email: "choriste@exemple.test" } as AuthUser;
  const equipier = { uid: "u-equipier", email: "equipier@exemple.test" } as AuthUser;
  const admin = { uid: "u-admin", email: ADMIN_EMAIL } as AuthUser;
  const profil = (roles: string[]) => ({ serviceRoles: { "Culte Francophone": roles } }) as unknown as UserProfile;
  const s = { ownerId: createur.uid, category: "Culte Francophone", isPrivate: false, editeurs: [equipier.uid], items: [] } as unknown as FSSetlist;

  expect(canEditSetlist(createur, profil(["chanteur"]), s)).toBe(true);
  expect(canDeleteSetlist(createur, profil(["chanteur"]), s)).toBe(true);
  // Musicien et présidence du service : voient et dupliquent, ne modifient ni ne suppriment plus.
  for (const role of ["musicien", "presidence"]) {
    expect(canEditSetlist(musicien, profil([role]), s), role).toBe(false);
    expect(canDeleteSetlist(musicien, profil([role]), s), role).toBe(false);
    expect(canDuplicateSetlist(musicien, profil([role]), s), role).toBe(true);
  }
  // Choriste (niveau « create ») et régie (« view ») : dupliquent aussi (copie privée, Q4).
  expect(canDuplicateSetlist(choriste, profil(["regie"]), s)).toBe(true);
  expect(canDuplicateSetlist(choriste, null, s)).toBe(false);
  // Équipe : modifie, ne supprime pas (Q2).
  expect(canEditSetlist(equipier, null, s)).toBe(true);
  expect(canDeleteSetlist(equipier, null, s)).toBe(false);
  // Admin : modifie et supprime une setlist non privée (Q1), pas une privée.
  expect(canEditSetlist(admin, null, s)).toBe(true);
  expect(canDeleteSetlist(admin, null, s)).toBe(true);
  expect(canDeleteSetlist(admin, null, { ...s, isPrivate: true })).toBe(false);
  // Fête : pas de copie (CF15).
  expect(canDuplicateSetlist(admin, null, { ...s, fete: { programme: "p1", passage: "a1", qui: "musique" } } as unknown as FSSetlist)).toBe(false);
});

// ─── I3 : un seul rapprochement de noms ────────────────────────────────────

test("noms de planning : une seule normalisation, celle du serveur", () => {
  expect(normalizeName("Oriane H.")).toBe(normalizeName("Oriane H"));
  expect(normalizeName("  Chloé  W. ")).toBe(normalizeName("chloe w"));
  // Lot U6, B2 : les blocs de l'administration et Notifier ont déménagé dans src/components.
  for (const rel of ["src/components/auth/ProfileFields.tsx", "src/components/admin/Personnes.tsx", "src/components/admin/SansCompte.tsx", "src/components/messages/Notifier.tsx"]) {
    const src = lire(rel);
    expect(src, rel).not.toMatch(/function normalize(Name)?\(/);
    expect(src, rel).toMatch(/normalizeName[\s\S]{0,40}from "@\/lib\/planning\/names"/);
  }
});

// ─── I4 : les deux derniers messages push en français seul ─────────────────

test("push : « Setlist prête » et « Planning en ligne » existent en français et en 中文", () => {
  expect(setlistReadyMessage({ title: "Culte du 27/09", leader: "Christelle", songCount: 5 }, "fr")).toEqual({
    title: "Setlist prête — Culte du 27/09",
    body: "Christelle a préparé la setlist (5 chants).",
  });
  expect(setlistReadyMessage({ title: "", leader: "", songCount: 4, category: "Culte Francophone" }, "fr")).toEqual({
    title: "Setlist prête — Culte Francophone",
    body: "Le responsable a préparé la setlist (4 chants).",
  });
  expect(setlistReadyMessage({ title: "Culte du 27/09", leader: "Christelle", songCount: 5 }, "zh-CN")).toEqual({
    title: "敬拜歌单已就绪 — Culte du 27/09",
    body: "Christelle 已准备好歌单（5 首）。",
  });
  expect(planningReleaseMessage({ label: "Culte Franco", tri: "T4" }, "fr")).toEqual({
    title: "Planning T4 en ligne",
    body: "Le planning Culte Franco du T4 est disponible.",
  });
  expect(planningReleaseMessage({ label: "Culte Franco", tri: "T4" }, "zh-CN")).toEqual({
    title: "T4 服事表已上线",
    body: "Culte Franco 的 T4 服事表已可查看。",
  });
});

// ─── I11 : la casse d'un e-mail admin ne compte pas, côté serveur non plus ─

test("admin : l'adresse est reconnue quelle que soit sa casse, partout", () => {
  expect(isAdminEmail(ADMIN_EMAIL.toUpperCase())).toBe(true);
  expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
  expect(isAdminEmail("jo@example.com")).toBe(false);
  expect(isAdminEmail(null)).toBe(false);
  for (const rel of [
    "src/lib/equipes/serveur.ts", "src/app/api/planning/release/route.ts", "src/app/api/planning/changements/route.ts", "src/app/api/push/notify-audience/route.ts",
    "src/app/api/push/notify-setlist/route.ts", "src/lib/fetes/serveur.ts",
  ]) {
    expect(lire(rel), rel).not.toContain("ADMIN_EMAILS.includes(");
  }
});
