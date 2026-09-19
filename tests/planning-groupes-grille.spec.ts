import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { GRILLES, grilleDe } from "../src/lib/planning/grilles";
import { PLANNINGS_APP } from "../src/lib/planning/grille";

// Lot 17, tranche G6 (Timothée, 19/09/2026 : « pouvoir modifier tous les
// plannings sur le site ») : les grilles simples — les trois groupes, les
// musiciens de Fidélité, Intergroupe et Interfranco — se remplissent dans
// l'app comme le Culte, chacune avec son droit (`plannings` du profil).

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

const SHEETS: Record<string, string> = {
  "Paix _T3": csv([
    ["DATE", "Présidence", "Musiciens", "Orateur", "Thème"],
    ["20/09", "Delphine Z.", "Gr Louange", "Professeur Wang", "Paraboles"],
    ["27/09", "Aisu L.", "Timothée C.", "Hewei", "Nouveau Testament"],
  ]),
  "Fidélité_T3": csv([
    ["DATE", "Présidence", "Orateur", "Thème", "Pianiste"],
    ["20/09", "Viviane H.", "Belka", "Actes", "Eva C."],
  ]),
  "Fidélité_Musicien": csv([
    ["", "DATE", "Présidence", "Piano", "Guitare", "Batterie"],
    ["", "20/09", "David C.", "Timothée C.", "David S.", "Chloé W."],
  ]),
  Intergroupe: csv([
    ["DATE", "Présidence", "Choriste", "Choriste", "Choriste", "Piano", "Guitare", "Cajon", "Sono", "PPT", "Orateur", "Trad"],
    ["04/10", "Paul W.", "Alice Q.", "Inès L.", "", "Jo M.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Pasteur ZHOU", "Eva C."],
  ]),
};

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };
const profil = (plannings: string[]): FakeProfile => ({
  uid: "uid-resp", email: "resp@example.com", firstName: "Christelle", lastName: "Zhang", planningName: "Christelle Z.", plannings,
});

async function open(page: Page, who: FakeProfile, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: SHEETS[sheet] ?? "" });
  });
  return signInAs(page, who, {}, to);
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

test("toutes les grilles sont définies, à clés uniques, et toutes ont l'app pour source", () => {
  const cles = GRILLES.map((g) => g.key);
  expect(new Set(cles).size).toBe(cles.length);
  expect(cles).toEqual(expect.arrayContaining([
    "culte", "table", "eddZhongban", "eddDaban", "eddGaoban", "campusMatin", "campusSoir",
    "intergroupe", "interfranco", "paix", "fidelite", "fideliteMusiciens", "bonte",
  ]));
  expect(PLANNINGS_APP).toEqual(cles);
  for (const g of GRILLES) {
    const index = g.colonnes.map((c) => c.index);
    expect(index, g.key).toEqual(index.map((_, i) => i + 1));
    expect(new Set(g.colonnes.map((c) => c.cle)).size, g.key).toBe(g.colonnes.length);
  }
  expect(grilleDe("inconnu")).toBeUndefined();
});

test("groupes : la grille du Groupe Paix, en lecture pour un membre", async ({ page }) => {
  await open(page, MEMBRE, "/planning/groupes");
  await expect(page.getByTestId("grille-bandeau")).toContainText("Paix");
  await expect(laCase(page, "2026-09-20", "presidence")).toContainText("Delphine Z.");
  await expect(laCase(page, "2026-09-27", "theme")).toContainText("Nouveau Testament");
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
});

test("groupes : avec le droit « paix », une case s'écrit ; Fidélité reste en lecture", async ({ page }) => {
  const db = await open(page, profil(["paix"]), "/planning/groupes");
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-20", "theme").getByRole("button").click();
  const champ = laCase(page, "2026-09-20", "theme").getByLabel("Thème", { exact: true });
  await champ.fill("Psaumes");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-20", "theme")).toContainText("Psaumes");

  const doc = db.doc("plannings/paix/dimanches/2026-09-20")!;
  expect(doc.theme).toBe("Psaumes");
  expect(doc.presidence, "les autres cases sont recopiées du Sheet").toBe("Delphine Z.");

  await page.getByRole("button", { name: "Fidélité", exact: true }).click();
  await expect(laCase(page, "2026-09-20", "pianiste")).toContainText("Eva C.");
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
});

test("groupes : les musiciens de Fidélité ont leur propre grille et leur propre droit", async ({ page }) => {
  const db = await open(page, profil(["fideliteMusiciens"]), "/planning/groupes");
  await page.getByRole("button", { name: "Fidélité", exact: true }).click();
  await expect(page.getByRole("button", { name: "Modifier" }), "le planning du groupe n'est pas le sien").toHaveCount(0);
  await page.getByRole("button", { name: /Planning musiciens/ }).click();
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-20", "guitare").getByRole("button").click();
  const champ = laCase(page, "2026-09-20", "guitare").getByLabel("Guitare", { exact: true });
  await champ.fill("Éloïse M.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-20", "guitare")).toContainText("Éloïse M.");
  expect(db.doc("plannings/fideliteMusiciens/dimanches/2026-09-20")?.guitare).toBe("Éloïse M.");
  expect(db.doc("plannings/fidelite/dimanches/2026-09-20")).toBeUndefined();
});

test("Intergroupe : se remplit dans l'app et s'exporte en CSV", async ({ page }) => {
  const db = await open(page, profil(["intergroupe"]), "/planning/intergroupe");
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-10-04", "choriste3").getByRole("button").click();
  const champ = laCase(page, "2026-10-04", "choriste3").getByLabel("Choriste 3", { exact: true });
  await champ.fill("Daniela W.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-10-04", "choriste3")).toContainText("Daniela W.");
  expect(db.doc("plannings/intergroupe/dimanches/2026-10-04")?.choriste3).toBe("Daniela W.");
  await page.getByRole("button", { name: "Terminé" }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exporter en CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Intergroupe_2026-10-04_2026-10-04.csv");
  expect(readFileSync(await download.path(), "utf8")).toContain("04/10,Paul W.,Alice Q.,Inès L.,Daniela W.,Jo M.");
});
