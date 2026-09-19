import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Lot 17, tranche G6 « Table » (Timothée, 19/09/2026 : « pouvoir modifier tous
// les plannings sur le site ») : la Prépa. Table du Seigneur et le petit déj
// deviennent une grille remplie dans l'app, deux cases par dimanche.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Onglet Franco_Table_PtD : deux paires DATE / équipe côte à côte (colonnes 1–5
 *  et 7–11), et le bloc « PETIT DÉJEUNER » (colonnes 17–18 et 19–20). */
function ligne(cells: Record<number, string>): string[] {
  const r = Array<string>(21).fill("");
  for (const [i, v] of Object.entries(cells)) r[Number(i)] = v;
  return r;
}
const TABLE = csv([
  ligne({ 1: "DATE", 2: "Équipe", 7: "DATE", 8: "Équipe", 17: "DATE", 18: "NOM" }),
  ligne({ 1: "20/09", 2: "Charlie", 3: "Isabelle", 7: "27/09", 8: "Lydie", 9: "Samuel", 17: "27/09", 18: "Charlie & Isabelle" }),
  ligne({ 1: "04/10", 2: "Wendy", 7: "11/10", 8: "Olivier" }),
]);

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };
const RESPONSABLE: FakeProfile = {
  uid: "uid-resp", email: "resp@example.com", firstName: "Christelle", lastName: "Zhang", planningName: "Christelle Z.",
  plannings: ["table"],
};

/** Ouvre `to` le vendredi 18/09/2026 : dimanche courant = 20/09, trimestre T3. */
async function open(page: Page, who: FakeProfile, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Table_PtD" ? TABLE : "" });
  });
  return signInAs(page, who, {}, to);
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

test("la grille Table : une case Équipe et une case Petit déj par dimanche, lues dans le Sheet", async ({ page }) => {
  await open(page, MEMBRE, "/planning/table");
  await expect(page.getByTestId("grille-bandeau")).toContainText("Prépa. Table du Seigneur");
  await expect(laCase(page, "2026-09-20", "equipe")).toContainText("Charlie, Isabelle");
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Lydie, Samuel");
  await expect(laCase(page, "2026-09-27", "petitDej")).toContainText("Charlie, Isabelle");
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
});

test("avec le droit « table » : une case s'écrit, l'autre case du dimanche est recopiée, et tient au rechargement", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/planning/table");
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-27", "equipe").getByRole("button").click();
  const champ = laCase(page, "2026-09-27", "equipe").getByLabel("Équipe", { exact: true });
  await champ.fill("Ruth K.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Ruth K.");
  await expect(page.getByText("Enregistré")).toBeVisible();

  const doc = db.doc("plannings/table/dimanches/2026-09-27")!;
  expect(doc.equipe).toBe("Ruth K.");
  expect(doc.petitDej, "le petit déj du même dimanche est recopié du Sheet").toBe("Charlie, Isabelle");
  expect(doc.date).toBe("2026-09-27");

  await page.reload();
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Ruth K.");
  await expect(laCase(page, "2026-09-20", "equipe"), "les autres dimanches viennent encore du Sheet").toContainText("Charlie, Isabelle");

  // « Ce dimanche » lit la grille : le 20/09 est le dimanche courant, on écrit dessus.
  db.set("plannings/table/dimanches/2026-09-20", { date: "2026-09-20", equipe: "Esther C.", petitDej: "" });
  await page.goto("/planning");
  await expect(page.getByText("Esther C.")).toBeVisible();
});

test("« Exporter en CSV » : le trimestre affiché, deux colonnes, nom du fichier", async ({ page }) => {
  await open(page, MEMBRE, "/planning/table");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Prépa._Table_2026-09-20_2026-09-27.csv");
  const texte = readFileSync(await download.path(), "utf8");
  expect(texte).toContain("Date,Équipe,Petit déj");
  expect(texte).toContain('27/09,"Lydie, Samuel","Charlie, Isabelle"');
});

test("en 中文 : les deux colonnes sont traduites", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, MEMBRE, "/planning/table");
  await expect(page.getByText("团队").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("早餐").filter({ visible: true }).first()).toBeVisible();
});
