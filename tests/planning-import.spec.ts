import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { GRILLE_CULTE } from "../src/lib/planning/grilles";
import { documentDimanche, nomsNonRattaches, planifierImport } from "../src/lib/planning/import";
import { fusionnerChangements, phraseDuChangement } from "../src/lib/planning/historique";

// Lot 17, tranche G4 (docs/spec-planning-grille.md, décision T8) : l'import
// initial du Google Sheet vers la grille de l'app, par un bouton
// d'administration, rejouable sans doublon, avec la liste des noms sans compte.

const SHEET: string[][] = [
  ["2026-09-20", "Paul W.", "Christelle Z.", "Inès L.", "Ruth K.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", ""],
  ["2026-09-27", "Jonathan Z.", "Daniela W.", "Alice Q.", "Eva C.", "Christelle C.", "Yiyi C.", "Lorenzo S.", "Denis F.", "Belka", "", ""],
  ["2026-10-04", "Paul W.", "Christelle Z.", "Alice Q.", "Eva C.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Hewei", "", "Ruth K."],
];

test("import : seuls les dimanches absents de l'app sont écrits, relancer n'écrit rien de plus", () => {
  const premier = planifierImport(SHEET, []);
  expect(premier.aEcrire).toHaveLength(3);
  expect(premier.ignores).toBe(0);
  const relance = planifierImport(SHEET, ["2026-09-20", "2026-09-27", "2026-10-04"]);
  expect(relance.aEcrire).toHaveLength(0);
  expect(relance.ignores).toBe(3);
  const partiel = planifierImport(SHEET, ["2026-09-27"]);
  expect(partiel.aEcrire.map((r) => r[0])).toEqual(["2026-09-20", "2026-10-04"]);
});

test("import : le document d'un dimanche porte une case par colonne, l'auteur et la date", () => {
  const doc = documentDimanche(GRILLE_CULTE, SHEET[2], "Timothée C.", "2026-09-19T10:00:00.000Z");
  expect(doc).toMatchObject({ date: "2026-10-04", modifiePar: "Timothée C.", presidence: "Paul W.", piano: "Eva C.", sainteCene: "Ruth K.", traduction: "" });
  expect(Object.keys(doc)).toHaveLength(3 + GRILLE_CULTE.colonnes.length);
});

test("import : les noms sans compte ressortent, appariés sans accent ni casse ni point", () => {
  const comptes = ["Paul W", "christelle z.", "Inès L.", "Ruth K.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "Jonathan Z.", "Daniela W.", "Alice Q.", "Eva C.", "Christelle C.", "Yiyi C.", "Lorenzo S."];
  expect(nomsNonRattaches(SHEET, GRILLE_CULTE, comptes)).toEqual(["Belka", "Denis F."]);
});

test("historique : une entrée « import » a sa phrase, et ne se mélange pas aux cases", () => {
  const entree = { kind: "import" as const, count: 52 };
  expect(phraseDuChangement(entree)).toBe("importe");
  const changes = fusionnerChangements([entree], { kind: "case", date: "2026-10-04", colonne: "piano", from: "", to: "Eva C." });
  expect(changes).toHaveLength(2);
});

// ─── Le bouton d'administration ─────────────────────────────────────────────

const ADMIN: FakeProfile = { uid: "admin1", email: "tc328829@gmail.com", firstName: "Timothée", lastName: "C." };

async function admin(page: Page) {
  await page.clock.setFixedTime(new Date("2026-09-19T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, ADMIN, {}, "/admin");
}

test("admin : « Importer » appelle la route et affiche le compte rendu, noms sans compte compris", async ({ page }) => {
  await admin(page);
  let appel: { key?: string } | null = null;
  await page.route("**/api/admin/importer-planning", (route) => {
    appel = route.request().postDataJSON() as { key?: string };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, importes: 52, ignores: 3, nomsNonRattaches: ["Belka", "Pasteur ZHOU"] }) });
  });
  await page.getByRole("button", { name: /^Planning/ }).click();
  await page.getByRole("button", { name: "Importer le Culte Franco depuis le Google Sheet" }).click();
  await expect(page.getByText(/52 dimanches importés/)).toBeVisible();
  await expect(page.getByText(/3 déjà dans l'app/)).toBeVisible();
  await expect(page.getByText(/Belka, Pasteur ZHOU/)).toBeVisible();
  expect(appel).toEqual({ key: "culte" });
});
