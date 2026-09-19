import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 17, tranche G6 « EDD » (Timothée, 19/09/2026 : « pouvoir modifier tous
// les plannings sur le site ») : une grille par classe (中班, 大班, 高班),
// cinq cases par dimanche, la période choisie comme avant.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Onglet EDD : le nom de la classe en colonne 7 ouvre un bloc ; cinq cases par ligne. */
const EDD = csv([
  ["DATE", "Présidence", "Suppléant", "Piano", "Cajon", "Guitare", "", ""],
  ["20/09", "Alice Q.", "Belka", "Esther C.", "Yiyi C.", "Éloïse M.", "", "中班"],
  ["27/09", "Lydie W.", "Samuel L.", "Jo M.", "Chloé W.", "Christelle C.", "", ""],
  ["20/09", "Paul W.", "Wendy L.", "Timothée C.", "Stéphane Z.", "Éloïse M.", "", "大班"],
  ["27/09", "Viviane H.", "Oriane H.", "Eva C.", "Yiyi C.", "Christelle C.", "", ""],
  ["20/09", "Jonathan Z.", "Daniela W.", "Esther C.", "Chloé W.", "Éloïse M.", "", "高班"],
]);

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };
const PROF: FakeProfile = {
  uid: "uid-prof", email: "prof@example.com", firstName: "Lydie", lastName: "Wang", planningName: "Lydie W.",
  plannings: ["eddZhongban"],
};

/** Ouvre `to` le vendredi 18/09/2026 : dimanche courant = 20/09, période Sep–Oct. */
async function open(page: Page, who: FakeProfile, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "EDD" ? EDD : "" });
  });
  return signInAs(page, who, {}, to);
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

test("la grille EDD : la classe 中班 de la période courante, cinq colonnes, bandeau avec la classe", async ({ page }) => {
  await open(page, MEMBRE, "/planning/edd");
  await expect(page.getByTestId("grille-bandeau")).toContainText("中班");
  await expect(page.getByTestId("grille-bandeau")).toContainText("Sep–Oct");
  await expect(laCase(page, "2026-09-20", "presidence")).toContainText("Alice Q.");
  await expect(laCase(page, "2026-09-27", "guitare")).toContainText("Christelle C.");
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);

  await page.getByRole("button", { name: "大班", exact: true }).click();
  await expect(page.getByTestId("grille-bandeau")).toContainText("大班");
  await expect(laCase(page, "2026-09-20", "presidence")).toContainText("Paul W.");
});

test("avec le droit sur 中班 : une case s'écrit dans la grille de la classe, 大班 reste en lecture", async ({ page }) => {
  const db = await open(page, PROF, "/planning/edd");
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-27", "piano").getByRole("button").click();
  const champ = laCase(page, "2026-09-27", "piano").getByLabel("Piano", { exact: true });
  await champ.fill("Esther C.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Esther C.");
  await expect(page.getByText("Enregistré")).toBeVisible();

  const doc = db.doc("plannings/eddZhongban/dimanches/2026-09-27")!;
  expect(doc.piano).toBe("Esther C.");
  expect(doc.presidence, "les autres cases du dimanche sont recopiées du Sheet").toBe("Lydie W.");
  expect(db.doc("plannings/eddDaban/dimanches/2026-09-27")).toBeUndefined();

  await page.reload();
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Esther C.");
  await page.getByRole("button", { name: "大班", exact: true }).click();
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Eva C.");
});

test("« Exporter en CSV » : la classe et la période affichées", async ({ page }) => {
  await open(page, MEMBRE, "/planning/edd");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("EDD_中班_2026-09-20_2026-09-27.csv");
  const texte = readFileSync(await download.path(), "utf8");
  expect(texte).toContain("Date,Présidence,Suppléant,Piano,Cajon,Guitare");
  expect(texte).toContain("27/09,Lydie W.,Samuel L.,Jo M.,Chloé W.,Christelle C.");
});

test("en 中文 : les colonnes de l'EDD sont traduites", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, MEMBRE, "/planning/edd");
  await expect(page.getByText("替补").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("箱鼓").filter({ visible: true }).first()).toBeVisible();
});
