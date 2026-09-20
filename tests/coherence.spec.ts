import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { isAdminEmail } from "../src/lib/access";
import { normalizeName } from "../src/lib/planning/names";
import { NOTIF_TYPES, DEFAULT_NOTIF_PREFS } from "../src/types/user";
import { planningReleaseMessage, setlistReadyMessage } from "../src/lib/push/messages";

// Lot « cohérence » (audit du 19/09/2026, décision D11) : les cinq bugs réels et
// les petites incohérences relevées par l'audit du code, chacun gardé par un
// test écrit avant la correction.

const ROOT = path.resolve(__dirname, "..");
const lire = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const ADMIN: FakeProfile = {
  uid: "admin1", email: "tc328829@gmail.com", firstName: "Timothée", lastName: "C.",
  planningName: "Timothée C.", poles: ["da"], equipes: true, plannings: ["culte"],
};
const MEMBRE_DA: FakeProfile = { uid: "uid-da", email: "da@example.com", firstName: "Denis", lastName: "F.", poles: ["da"] };
const MEMBRE: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", serviceRoles: { "Groupe Paix": ["chanteur"] } };

/** Réunion du pôle DA créée par Alice : un évènement `pour: "pole:da"` (lot 7). */
const REUNION_DA = {
  titre: "Réunion DA", type: "info", pour: "pole:da", date: "2026-10-03", heure: "20:00", heureFin: "", dateFin: "",
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

test("profil : un admin qui enregistre son profil garde ses pôles, ses équipes et ses plannings", async ({ page }) => {
  const db = await open(page, ADMIN, "/profil");
  await page.getByLabel("Prénom").fill("Timo");
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await page.waitForURL(/\/setlists\/?$/);
  const doc = db.doc("users/admin1");
  expect(doc?.firstName).toBe("Timo");
  expect(doc?.poles).toEqual(["da"]);
  expect(doc?.equipes).toBe(true);
  expect(doc?.plannings).toEqual(["culte"]);
  // L'écriture ne porte que les champs du formulaire : jamais les droits.
  const patch = db.writes.find((w) => w.path === "users/admin1");
  expect(patch).toBeDefined();
  expect(Object.keys(patch!.data)).not.toContain("poles");
  expect(Object.keys(patch!.data)).not.toContain("plannings");
});

// ─── C2 : la cloche connaît les réunions de pôle ───────────────────────────

test("cloche : une réunion de pôle apparaît pour un membre du pôle, pas pour un autre membre", async ({ page }) => {
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
  const m = (await res.json()) as { name: string; short_name: string; theme_color: string; start_url: string };
  expect(m.name).toBe("GCC");
  expect(m.short_name).toBe("GCC");
  expect(m.theme_color).toBe("#ffffff"); // fond blanc de 5C1 (docs/spec-look.md § 20/09/2026)
  expect(m.start_url).toBe("/planning");
  const layout = lire("src/app/layout.tsx");
  expect(layout).not.toContain('rel="manifest"');
});

// ─── C5 : plus de préférence sans expéditeur ───────────────────────────────

test("préférences : la bascule « Annonces » a disparu avec les annonces", () => {
  expect(NOTIF_TYPES).toEqual(["reminders", "setlists", "evenements", "taches"]);
  expect(Object.keys(DEFAULT_NOTIF_PREFS).sort()).toEqual([...NOTIF_TYPES].sort());
});

// ─── I1 : une setlist privée ne se modifie ni ne se supprime en REST ───────

test("règles : la modification et la suppression d'une setlist passent par canEditSetlistDoc", () => {
  const rules = lire("firestore.rules");
  const bloc = rules.slice(rules.indexOf("match /setlists/{id}"), rules.indexOf("match /history/{entryId}"));
  const update = bloc.slice(bloc.indexOf("allow update"), bloc.indexOf("allow delete"));
  const del = bloc.slice(bloc.indexOf("allow delete"));
  expect(update).toContain("canEditSetlistDoc(resource.data)");
  expect(del).toContain("canEditSetlistDoc(resource.data)");
});

// ─── I3 : un seul rapprochement de noms ────────────────────────────────────

test("noms de planning : une seule normalisation, celle du serveur", () => {
  expect(normalizeName("Oriane H.")).toBe(normalizeName("Oriane H"));
  expect(normalizeName("  Chloé  W. ")).toBe(normalizeName("chloe w"));
  for (const rel of ["src/components/auth/ProfileFields.tsx", "src/app/admin/page.tsx", "src/app/notifier/page.tsx"]) {
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
  expect(isAdminEmail("TC328829@GMAIL.COM")).toBe(true);
  expect(isAdminEmail("tc328829@gmail.com")).toBe(true);
  expect(isAdminEmail("jo@example.com")).toBe(false);
  expect(isAdminEmail(null)).toBe(false);
  for (const rel of [
    "src/lib/equipes/serveur.ts", "src/app/api/planning/release/route.ts", "src/app/api/push/notify-audience/route.ts",
    "src/app/api/admin/migrer-annonces/route.ts", "src/app/api/push/notify-setlist/route.ts",
  ]) {
    expect(lire(rel), rel).not.toContain("ADMIN_EMAILS.includes(");
  }
});
