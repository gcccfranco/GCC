import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { parsePetitDej } from "../src/lib/planning/sheets";
import { findMyServices, type PlanningData } from "../src/lib/planning/names";
import { reminderBody, reminderServicesFor } from "../src/lib/push/reminderMessage";

// Lot 1b (docs/spec-planning-petits-lots.md), codé sans attendre le fichier de
// Christelle : le petit déj se lit dans le bloc « PETIT DÉJEUNER » de l'onglet
// existant Franco_Table_PtD (colonnes 17 DATE / 18 NOM pour janvier → juin,
// 19 / 20 pour juillet → décembre). Ce dimanche, Mes services, rappels ; pas
// d'onglet. Visible seulement quand la case est remplie.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Même forme que la vraie feuille : la Prépa. Table à gauche (index 1 à 5),
// les colonnes de personnes disponibles au milieu, le petit déj à droite.
const col = (cells: Record<number, string>) =>
  Array.from({ length: 21 }, (_, i) => cells[i] ?? "");

const TABLE_PTD = csv([
  col({ 1: "PRÉPARATION TABLE", 17: "PETIT DÉJEUNER 2026 DATE", 18: "NOM", 19: "DATE", 20: "DATE" }),
  col({ 1: "13/09", 2: "Daniel F.", 3: "Lucas W.", 17: "15/03", 18: "Julien & Stéphane", 19: "13/09", 20: "" }),
  col({ 1: "20/09", 2: "Ruth K.", 3: "Charlie B.", 17: "22/03", 18: "Alice Q.", 19: "20/09", 20: "Charlie B. & Isabelle L." }),
]);

const CHARLIE: FakeProfile = { uid: "uid-charlie", email: "charlie@example.com", planningName: "Charlie B." };

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

async function open(page: Page, dimanche: string, to: string) {
  const vendredi = new Date(`${dimanche}T10:00:00`);
  vendredi.setDate(vendredi.getDate() - 2);
  await page.clock.setFixedTime(vendredi);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({
      status: 200,
      contentType: "text/csv",
      body: sheet === "Franco_Table_PtD" ? TABLE_PTD : "",
    });
  });
  await signInAs(page, CHARLIE, {}, to);
}

// ─── Lecture de la feuille ───────────────────────────────────────────────────

test("les deux blocs de dates sont lus, et « A & B » fait deux noms", () => {
  const rows = [
    col({ 17: "PETIT DÉJEUNER 2026 DATE", 18: "NOM", 19: "DATE", 20: "DATE" }),
    col({ 17: "04/01", 18: "Stéphane", 19: "05/07", 20: "" }),
    col({ 17: "11/01", 18: "", 19: "12/07", 20: "Alice Q. & Xinyao W." }),
    col({ 17: "25/01", 18: "Charlie B. & Isabelle L.", 19: "26/07", 20: "" }),
  ];
  expect(parsePetitDej(rows), "en-tête et cases vides ignorés, noms séparés par des virgules").toEqual([
    ["2026-01-04", "Stéphane"],
    ["2026-07-12", "Alice Q., Xinyao W."],
    ["2026-01-25", "Charlie B., Isabelle L."],
  ]);
});

// ─── Services et rappels ─────────────────────────────────────────────────────

const vide: PlanningData = {
  culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], fideliteMusic: [],
  bonte: [], edd: {}, campus: [], intergroupe: [], interfranco: [],
};

const planning: PlanningData = {
  ...vide,
  culte: [["2026-09-20", "Paul W.", "", "", "Ruth K.", "Éloïse M.", "", "", "", "Hewei", "", ""]],
  petitDej: [["2026-09-20", "Charlie B., Isabelle L."]],
};

test("le petit déj est un service de la personne, sans rôle à afficher", () => {
  expect(findMyServices(planning, "Charlie B.")).toEqual([
    { date: "2026-09-20", service: "Petit déj", role: "Équipe", leader: "" },
  ]);
  expect(findMyServices(planning, "Isabelle L."), "le second nom de la case compte aussi").toHaveLength(1);
  expect(reminderServicesFor(planning, "Charlie B.", "2026-09-20")).toEqual([
    { service: "Petit déj", roles: [] },
  ]);
});

test("le rappel nomme le petit déj, en français et en 中文", () => {
  const charlie = reminderServicesFor(planning, "Charlie B.", "2026-09-20");
  expect(reminderBody("2026-09-20", "J1", charlie, "fr")).toBe("Dimanche 20 septembre (demain) : Petit déj");
  expect(reminderBody("2026-09-20", "J1", charlie, "zh-CN")).toBe("9月20日星期日（明天）：早餐");
  const ruth = reminderServicesFor(planning, "Ruth K.", "2026-09-20");
  expect(reminderBody("2026-09-20", "J3", ruth, "fr"), "un seul message, le petit déj à la suite des autres services").toBe(
    "Dimanche 20 septembre (dans 3 jours) : Culte Franco (Piano)",
  );
});

// ─── Écran ───────────────────────────────────────────────────────────────────

test("Ce dimanche : la ligne Petit déj apparaît quand la case est remplie", async ({ page }) => {
  await open(page, "2026-09-20", "/planning");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Petit déj", { exact: true })).toBeVisible();
  await expect(dimanche.getByText("Charlie B., Isabelle L.")).toBeVisible();
  await capture(page, "ce-dimanche-petit-dej");
});

test("Ce dimanche : pas de ligne Petit déj quand la case est vide", async ({ page }) => {
  await open(page, "2026-09-13", "/planning");
  const dimanche = page.getByRole("region", { name: /Ce dimanche/ });
  await expect(dimanche.getByText("Daniel F.", { exact: false }), "la Prépa. Table reste").toBeVisible();
  await expect(dimanche.getByText("Petit déj", { exact: true })).toHaveCount(0);
});

test("Mes services : le petit déj est un service à part entière", async ({ page }) => {
  await open(page, "2026-09-20", "/mes-services");
  await expect(page.getByText("Petit déj", { exact: true })).toBeVisible();
  await capture(page, "mes-services-petit-dej");
});

test("en 中文 : libellé traduit", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, "2026-09-20", "/planning");
  const dimanche = page.getByRole("region", { name: /本主日/ });
  await expect(dimanche.getByText("早餐", { exact: true })).toBeVisible();
});
