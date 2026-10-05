import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ADMIN_EMAILS } from "../src/lib/access";
import { BASCULE_EVENEMENTS, avantBascule } from "../src/lib/evenements/bascule";

// Lot U9 (docs/spec-evenements-2027.md) : les évènements sur le site à partir de janvier 2027.
// B1 : la bascule (`bascule.ts`), le refus du formulaire avant la bascule pour « Toute
// l'église », la pastille du calendrier. Sheet, Firestore et horloge simulés ; titres et
// noms inventés.

const SHEET = "https://docs.google.com/spreadsheets/d/12FxK1sMrk08bFrVnL7BjCTJd6FXTqvRXyZoyDYhgPU8";
const GID_DECEMBRE = "484545153";
// L'onglet d'octobre de U8, rebaptisé décembre : mêmes numéros de jour, donc le 6 porte
// « Soirée louange » (responsable et téléphones inventés).
const FIXTURE_DECEMBRE = readFileSync(join(__dirname, "fixtures", "sheet-evenements-mois.csv"), "utf8")
  .replace("OCTOBRE 2026", "DÉCEMBRE 2026");

const REFUS = "Jusqu'au 31/12/2026, les évènements de toute l'église s'écrivent dans le Sheet des évènements.";

/** Coordination (pôle Évènement) : « Toute l'église », les sections, la réunion du pôle. */
const COORD: FakeProfile = { uid: "uid-coord", email: "coord@example.org", firstName: "Lison", lastName: "R.", poles: ["evenement"] };
const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };

const EV = {
  titre: "", type: "loisir", pour: "eglise", date: "2026-11-07", heure: "14:00", heureFin: "", dateFin: "",
  lieu: "Jardin", description: "", liens: [], images: [], placesMax: null, inscriptions: "auto",
  sansCompte: false, lienExterne: "", contact: "", organisateurUid: "uid-coord", organisateurNom: "Lison R.", epingle: false, expiresAt: null,
  inscrits: 0, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/kermesse": { ...EV, titre: "Kermesse", date: "2026-11-07" },
  "evenements/galette": { ...EV, titre: "Galette", date: "2027-01-16" },
  "evenements/paix": { ...EV, titre: "Sortie du groupe", pour: "Groupe Paix", date: "2026-12-12" },
};

/** Le Sheet des évènements (export par gid) et le planning (gviz) : jamais les vrais. Compte les
 *  lectures du Sheet des évènements. */
async function sheets(page: Page) {
  const lus: string[] = [];
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/export")) {
      const gid = url.searchParams.get("gid") ?? "";
      lus.push(gid);
      return route.fulfill({ status: 200, contentType: "text/csv", body: gid === GID_DECEMBRE ? FIXTURE_DECEMBRE : "" });
    }
    return route.fulfill({ status: 200, contentType: "text/csv", body: "" });
  });
  return lus;
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, maintenant: string) {
  await page.clock.setFixedTime(new Date(maintenant));
  const lus = await sheets(page);
  await page.route("**/api/push/notify-evenement", (route) => route.fulfill({ json: { ok: true } }));
  const db = await signInAs(page, qui, DOCS, "/moi");
  await page.goto(to);
  return { db, lus };
}

const creer = (page: Page) => page.getByRole("button", { name: "Créer l'évènement" }).click();
const ecrit = (db: Awaited<ReturnType<typeof signInAs>>) =>
  db.writes.find((w) => w.method === "POST" && /^evenements\/[^/]+$/.test(w.path));

test.describe("B1 : la bascule (pur)", () => {
  test("la date de l'évènement décide : 31/12/2026 avant, 01/01/2027 après", () => {
    expect(BASCULE_EVENEMENTS).toBe("2027-01-01");
    expect(avantBascule("2026-08-01")).toBe(true);
    expect(avantBascule("2026-12-31")).toBe(true);
    expect(avantBascule("2026-12-31T23:59")).toBe(true);
    expect(avantBascule("2027-01-01")).toBe(false);
    expect(avantBascule("2027-01-01T00:00")).toBe(false);
    expect(avantBascule("2027-01-10")).toBe(false);
  });
});

test.describe("B1 : le formulaire refuse « Toute l'église » avant la bascule", () => {
  test("le 20/12/2026 refusé avec le lien du Sheet ; le 10/01/2027 créé, inscriptions dans l'app", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
    await expect(page.getByLabel("Public")).toHaveValue("eglise");
    await page.getByLabel("Nom de l'évènement").fill("Concert de Noël");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toBeVisible();
    const lien = page.getByRole("link", { name: "Ouvrir le Sheet des évènements" });
    await expect(lien).toHaveAttribute("href", `${SHEET}/edit#gid=${GID_DECEMBRE}`);
    await expect(lien).toHaveAttribute("target", "_blank");
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/nouveau\/?$/);
    await page.waitForTimeout(300);
    expect(ecrit(db)).toBeUndefined();

    await page.getByLabel("Date", { exact: true }).fill("2027-01-10");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    expect(ecrit(db)?.data).toMatchObject({ titre: "Concert de Noël", pour: "eglise", date: "2027-01-10", inscriptions: "auto" });
  });

  test("une section le 20/12/2026 passe", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
    await page.getByLabel("Nom de l'évènement").fill("Sortie raquettes");
    await page.getByLabel("Public").selectOption("Groupe Paix");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    expect(ecrit(db)?.data).toMatchObject({ pour: "Groupe Paix", date: "2026-12-20" });
  });

  test("une réunion de pôle le 20/12/2026 passe", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
    await page.getByLabel("Nom de l'évènement").fill("Réunion de fin d'année");
    await page.getByLabel("Public").selectOption("pole:evenement");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await creer(page);
    await expect(page).toHaveURL(/\/back-office\/evenements\/fake-\d+\/?$/);
    expect(ecrit(db)?.data).toMatchObject({ pour: "pole:evenement", date: "2026-12-20" });
  });

  test("modifier : un évènement déjà là se corrige ; le reculer en 2026 ou le passer à « Toute l'église » est refusé", async ({ page }) => {
    const { db } = await ouvrir(page, COORD, "/back-office/evenements/kermesse/modifier", "2026-12-15T10:00:00");
    // Déjà dans l'app (créé avant la bascule) : le corriger ne fait pas de doublon.
    await page.getByLabel("Nom de l'évènement").fill("Kermesse d'automne");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/\/back-office\/evenements\/kermesse\/?$/);
    expect(db.doc("evenements/kermesse")).toMatchObject({ titre: "Kermesse d'automne" });

    // Un évènement de janvier 2027 reculé au 20/12/2026 : refusé.
    await page.goto("/back-office/evenements/galette/modifier");
    await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
    await expect(page.getByText(REFUS)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(/\/galette\/modifier\/?$/);
    expect(db.doc("evenements/galette")).toMatchObject({ date: "2027-01-16" });

    // Une sortie de section de décembre passée à « Toute l'église » : refusée.
    await page.goto("/back-office/evenements/paix/modifier");
    await expect(page.getByText(REFUS)).toHaveCount(0);
    await page.getByLabel("Public").selectOption("eglise");
    await expect(page.getByText(REFUS)).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await page.waitForTimeout(300);
    expect(db.doc("evenements/paix")).toMatchObject({ pour: "Groupe Paix" });
  });
});

/** Les pastilles des sources : en rangée, ou dans la feuille « Sources » sur téléphone. */
async function pastilles(page: Page, info: TestInfo) {
  if (info.project.name === "telephone") {
    await page.getByRole("button", { name: "Sources", exact: true }).click();
    return page.getByRole("dialog", { name: "Sources" }).getByRole("group", { name: "Sources affichées" });
  }
  return page.getByRole("group", { name: "Sources affichées" });
}
async function fermer(page: Page, info: TestInfo) {
  if (info.project.name !== "telephone") return;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Sources" })).toHaveCount(0);
}
async function enMois(page: Page) {
  const bouton = page.getByRole("group", { name: "Affichage" }).getByRole("button", { name: "Mois" });
  if ((await bouton.getAttribute("aria-pressed")) !== "true") await bouton.click();
  await expect(bouton).toHaveAttribute("aria-pressed", "true");
}
const pret = (page: Page) => expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");

test.describe("B1 : la pastille du calendrier selon l'horloge", () => {
  test("le 15/12/2026 : « Évènements (Sheet) », et décembre lit le Sheet", async ({ page }, info) => {
    const { lus } = await ouvrir(page, ADMIN, "/back-office/calendrier", "2026-12-15T10:00:00");
    await expect(page.getByRole("heading", { level: 1, name: /^Décembre( 2026)?$/ })).toBeVisible();
    await enMois(page);
    await pret(page);
    const groupe = await pastilles(page, info);
    await expect(groupe.getByRole("button", { name: "Évènements (Sheet)" })).toBeVisible();
    await fermer(page, info);
    await expect.poll(() => lus.includes(GID_DECEMBRE)).toBe(true);
  });

  test("le 02/01/2027 : « Évènements », janvier sans requête au Sheet, décembre le lit encore", async ({ page }, info) => {
    const { lus } = await ouvrir(page, ADMIN, "/back-office/calendrier", "2027-01-02T10:00:00");
    await expect(page.getByRole("heading", { level: 1, name: /^Janvier( 2027)?$/ })).toBeVisible();
    await pret(page);
    await enMois(page);
    await pret(page);
    const groupe = await pastilles(page, info);
    await expect(groupe.getByRole("button", { name: "Évènements", exact: true })).toBeVisible();
    await expect(groupe.getByRole("button", { name: "Évènements (Sheet)" })).toHaveCount(0);
    await fermer(page, info);
    // La grille de janvier commence le lundi 28/12/2026 : pas même ces jours-là.
    await page.waitForTimeout(300);
    expect(lus).toEqual([]);

    await page.getByRole("button", { name: "Mois précédent" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /^Décembre( 2026)?$/ })).toBeVisible();
    await pret(page);
    await expect.poll(() => lus.includes(GID_DECEMBRE)).toBe(true);
    if (info.project.name !== "telephone") {
      await expect(page.locator('[data-jour="2026-12-06"] [data-source="evenements"]').first()).toContainText("Soirée louange");
    }
  });
});

test("captures B1 : le refus sous la date, la pastille de janvier", async ({ page }, info) => {
  const dossier = join(process.cwd(), "test-results", "evenements-2027-captures", info.project.name);
  await ouvrir(page, COORD, "/back-office/evenements/nouveau", "2026-12-15T10:00:00");
  await page.getByLabel("Nom de l'évènement").fill("Concert de Noël");
  await page.getByLabel("Date", { exact: true }).fill("2026-12-20");
  await expect(page.getByText(REFUS)).toBeVisible();
  await page.getByText(REFUS).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${dossier}-refus.png`, animations: "disabled" });
});
