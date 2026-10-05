import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { lirePdf } from "./helpers/pdf";

// Lot 17, tranche G6 « Campus » (Timothée, 19/09/2026 : « pouvoir modifier
// tous les plannings sur le site ») : les cartes Louange / Entraînement
// restent la lecture ; un volet « Grille » montre les deux grilles, matin puis
// soir, treize cases par séance, la répétition en texte libre.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Onglet Campus_Louange : date JJ/MM/AAAA, moment, présidence, deux choristes,
 *  piano, guitare, batterie, sono, PPT, quatre chants, répétition. */
const CAMPUS = csv([
  ["DATE", "MOMENT", "PRESIDENT", "CHORISTE", "CHORISTE", "PIANO", "GUITARE", "BATTERIE", "SONO", "PPT", "CHANT 1", "CHANT 2", "CHANT 3", "CHANT 4", "REPETITION"],
  ["20/09/2026", "Matin", "Paul W.", "Alice Q.", "Inès L.", "Timothée C.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Béni soit Ton Nom", "Abba Père", "", "", "17/09/2026 19:00 Grande salle"],
  ["20/09/2026", "Soir", "Jonathan Z.", "Daniela W.", "", "Jo M.", "Christelle C.", "Stéphane Z.", "Lorenzo S.", "Karémy X.", "À jamais Tu es saint", "", "", "", ""],
  ["27/09/2026", "Matin", "Viviane H.", "Oriane H.", "Olivier T.", "Eva C.", "Éloïse M.", "Chloé W.", "Anyi Y.", "Denis F.", "Amour extravagant", "", "", "", ""],
]);

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };
const RESPONSABLE: FakeProfile = {
  uid: "uid-resp", email: "resp@example.com", firstName: "Christelle", lastName: "Zhang", planningName: "Christelle Z.",
  plannings: ["campusMatin"],
};

async function open(page: Page, who: FakeProfile, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Campus_Louange" ? CAMPUS : "" });
  });
  return signInAs(page, who, {}, to);
}

const grille = (page: Page, key: "campusMatin" | "campusSoir") => page.locator(`[data-grille="${key}"]`);
const laCase = (page: Page, key: "campusMatin" | "campusSoir", date: string, colonne: string) =>
  grille(page, key).locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

test("le volet Grille : matin puis soir, treize colonnes, la répétition en texte", async ({ page }) => {
  await open(page, MEMBRE, "/planning/campus");
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await expect(grille(page, "campusMatin").getByTestId("grille-bandeau")).toContainText("Matin");
  await expect(grille(page, "campusSoir").getByTestId("grille-bandeau")).toContainText("Soir");
  await expect(laCase(page, "campusMatin", "2026-09-20", "chant1")).toContainText("Béni soit Ton Nom");
  await expect(laCase(page, "campusMatin", "2026-09-20", "repetition")).toContainText("17/09/2026 19:00 Grande salle");
  await expect(laCase(page, "campusSoir", "2026-09-20", "presidence")).toContainText("Jonathan Z.");
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
});

test("avec le droit sur le matin : une case s'écrit, le soir reste en lecture, et les cartes suivent", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/back-office/planning/campus");
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  // Lot U6, B2 : au Back-Office, la grille du matin s'ouvre en modification ; le soir, en lecture.
  await expect(grille(page, "campusMatin").locator("[data-case]").getByRole("button").first()).toBeVisible();
  await expect(grille(page, "campusSoir").locator("[data-case]").getByRole("button")).toHaveCount(0);
  await laCase(page, "campusMatin", "2026-09-20", "piano").getByRole("button").click();
  // P9 (lot U2) : « Choisir », puis un nom écrit à la main.
  await page.getByRole("button", { name: "Écrire un nom sans compte…" }).click();
  const champ = page.getByRole("textbox", { name: "Piano", exact: true });
  await champ.fill("Esther C.");
  await champ.press("Enter");
  await expect(laCase(page, "campusMatin", "2026-09-20", "piano")).toContainText("Esther C.");

  const doc = db.doc("plannings/campusMatin/dimanches/2026-09-20")!;
  expect(doc.piano).toBe("Esther C.");
  expect(doc.repetition, "les autres cases de la séance sont recopiées, répétition comprise").toBe("17/09/2026 19:00 Grande salle");
  expect(doc.chant1).toBe("Béni soit Ton Nom");
  expect(db.doc("plannings/campusSoir/dimanches/2026-09-20")).toBeUndefined();

  // Les cartes de lecture reflètent la grille.
  // Sur ordinateur la navbar a aussi un bouton « Louange » : on vise le volet, voisin de « Grille ».
  await page.getByRole("button", { name: "Grille", exact: true }).locator("..").getByRole("button", { name: "Louange", exact: true }).click();
  await expect(page.getByText(/Piano: Esther C\./)).toBeVisible();
});

// Lot U2, P7 : « Exporter (modèle du Sheet) » remplace le CSV et l'ancien PDF du
// lot 17 (question 6) ; l'onglet Campus_Louange mêle matin et soir, dans l'ordre des dates.
test("« Exporter (modèle du Sheet) » depuis la grille du matin : une page, matin et soir mêlés", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/campus");
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await expect(grille(page, "campusSoir").getByRole("button", { name: /Exporter/ }), "le soir n'est pas à elle").toHaveCount(0);
  await grille(page, "campusMatin").getByRole("button", { name: "Exporter (modèle du Sheet)" }).click();
  const fenetre = page.getByRole("dialog", { name: "Exporter" });
  await expect(fenetre.getByRole("radio")).toHaveText(["Toute l'année · Campus matin"]);
  await fenetre.getByRole("radio", { name: "Toute l'année · Campus matin" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    fenetre.getByRole("button", { name: "PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Campus_Louange_2026.pdf");
  await download.saveAs(test.info().outputPath(download.suggestedFilename())); // à ouvrir à l'œil
  const pdf = lirePdf(readFileSync(await download.path()));
  expect(pdf.pages).toHaveLength(1);
  expect(pdf.pages[0].largeur, "paysage").toBeGreaterThan(pdf.pages[0].hauteur);
  // Une case trop longue passe à la ligne : on lit le texte de la page d'un seul tenant, sans les espaces.
  const serre = (x: string) => x.replace(/\s+/g, "");
  const texte = serre(pdf.pages[0].lignes.join(""));
  for (const attendu of ["CAMPUS 2026", "20 — 27 Septembre 2026", "DATE SEANCE", "Paul W.", "Jonathan Z.", "Béni soit Ton Nom", "Amour extravagant", "17/09/2026 19:00 Grande salle"]) {
    expect(texte, attendu).toContain(serre(attendu));
  }
  expect(texte.indexOf("PaulW."), "le matin du 20/09 avant le soir").toBeLessThan(texte.indexOf("JonathanZ."));
  expect(texte.indexOf("JonathanZ."), "le soir du 20/09 avant le 27/09").toBeLessThan(texte.indexOf("VivianeH."));
});

test("un membre n'exporte pas le Campus", async ({ page }) => {
  await open(page, MEMBRE, "/planning/campus");
  await page.getByRole("button", { name: "Grille", exact: true }).click();
  await expect(grille(page, "campusMatin").getByTestId("grille-bandeau")).toContainText("Matin");
  await expect(page.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
});

test("en 中文 : le volet et les colonnes des chants sont traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, MEMBRE, "/planning/campus");
  await page.getByRole("button", { name: "表格", exact: true }).click();
  await expect(page.getByText("诗歌 1").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("排练").filter({ visible: true }).first()).toBeVisible();
});
