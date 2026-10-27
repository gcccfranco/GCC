import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { colonnesEdd, sousEquipesEddDe } from "../src/lib/equipes/edd";
import type { MembreEquipe } from "../src/types/equipe";

// Sous-équipes de l'EDD (docs/spec-edd-sous-equipes.md) : un ancien `groupe` lu en repli, les pastilles du
// panneau pour le référent EDD seulement, la carte rangée par sous-équipe (français et 中文), la fonction pure.
// Cinq projets (SPECS_GRAND_ECRAN). Base et Sheets simulés, noms fictifs. Captures jointes au rapport de test.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const REFERENT: FakeProfile = {
  uid: "u-ysa", email: "ysa@example.com", firstName: "Ysaline", lastName: "Marquet", dansEquipes: ["edd"], referentDe: ["edd"],
};
const SIMPLE: FakeProfile = {
  uid: "u-bastien", email: "bastien@example.com", firstName: "Bastien", lastName: "Orlay", dansEquipes: ["edd"],
};

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const EDD: MembreEquipe[] = [
  M("Ysaline Marquet", { uid: "u-ysa", referent: true, sousEquipesEdd: ["professeurs-louange"] }),
  M("Bastien Orlay", { uid: "u-bastien", groupe: "Pianistes" }),
  M("Noé Varenne", { uid: "u-noe", sousEquipesEdd: ["guitaristes", "cajon"] }),
  M("梁晓溪", { uid: "u-liang" }),
];
const doc = (membres: MembreEquipe[]) => ({ membres, updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" });
const DOCS = (membres = EDD): Record<string, Record<string, unknown>> => ({ "equipes/edd": doc(membres) });

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs = DOCS(), langue = "fr"): Promise<FakeDb> {
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route("**/api/equipes/rattachement", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) }));
  return signInAs(page, qui, docs, to);
}

/** Capture jointe au rapport (un PNG par appareil : le dossier de sortie du test porte le nom du projet). */
async function capture(page: Page, nom: string, cible = page.locator("body")) {
  const chemin = test.info().outputPath(`${nom}.png`);
  await cible.screenshot({ path: chemin });
  await test.info().attach(nom, { path: chemin, contentType: "image/png" });
}

const bloc = (page: Page, cle: string) => page.getByTestId(`edd-sous-${cle}`);

test("un ancien membre au groupe « Pianistes » apparaît sous Pianistes", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await expect(bloc(page, "pianistes")).toContainText("Bastien Orlay");
  await expect(bloc(page, "pianistes")).toContainText("Pianistes");
  await expect(bloc(page, "professeurs-louange")).toContainText("Ysaline Marquet");
  await expect(bloc(page, "guitaristes")).toContainText("Noé Varenne");
  await expect(bloc(page, "cajon")).toContainText("Noé Varenne");
  await capture(page, "carte-edd-fr", page.getByTestId("equipe-edd"));
});

test("le référent EDD coche Professeurs cours et Cajon : la personne figure sous les deux, l'écriture porte sousEquipesEdd", async ({ page }) => {
  const db = await ouvrir(page, REFERENT, "/back-office/equipes", DOCS([...EDD, M("Léandre Pique", { uid: "u-leandre", groupe: "Pianistes" })]));
  await page.getByRole("button", { name: "Modifier TEAM EDD" }).click();
  const p = page.getByRole("dialog", { name: "TEAM EDD" });
  await expect(p).toBeVisible();
  const ligne = p.getByTestId("membre-u-liang");
  const sous = ligne.getByRole("group", { name: "Sous-équipes", exact: true });
  await expect(sous.getByRole("button")).toHaveText(["Professeurs louange", "Professeurs cours", "Pianistes", "Guitaristes", "Cajon"]);
  await sous.getByRole("button", { name: "Professeurs cours", exact: true }).click();
  await sous.getByRole("button", { name: "Cajon", exact: true }).click();
  await expect(sous.getByRole("button", { name: "Cajon", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Un ancien `groupe` repart de la bonne base : Pianistes est déjà coché, on y ajoute Guitaristes.
  const leandre = p.getByTestId("membre-u-leandre").getByRole("group", { name: "Sous-équipes", exact: true });
  await expect(leandre.getByRole("button", { name: "Pianistes", exact: true })).toHaveAttribute("aria-pressed", "true");
  await leandre.getByRole("button", { name: "Guitaristes", exact: true }).click();
  await capture(page, "panneau-edd-fr", p);

  await p.getByRole("button", { name: "Enregistrer" }).click();
  await expect(p).toBeHidden();
  await expect(bloc(page, "professeurs-cours")).toContainText("梁晓溪");
  await expect(bloc(page, "cajon")).toContainText("梁晓溪");
  const ecrit = db.doc("equipes/edd")!.membres as MembreEquipe[];
  expect(ecrit.find((m) => m.uid === "u-liang")!.sousEquipesEdd).toEqual(["professeurs-cours", "cajon"]);
  expect(ecrit.find((m) => m.uid === "u-leandre")).toMatchObject({ sousEquipesEdd: ["pianistes", "guitaristes"], groupe: "Pianistes" });
  expect(ecrit).toHaveLength(EDD.length + 1);
});

test("un membre de l'EDD non référent ne voit ni crayon ni pastilles", async ({ page }) => {
  await ouvrir(page, SIMPLE, "/equipes");
  await expect(page.getByTestId("equipe-edd")).toBeVisible();
  await expect(page.getByRole("button", { name: "Modifier TEAM EDD" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Sous-équipes", exact: true })).toHaveCount(0);
});

test("« Sans sous-équipe » en dernier ; aucun intertitre quand personne n'a de sous-équipe", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  const blocs = page.getByTestId("equipe-edd").locator("[data-testid^='edd-']");
  await expect(blocs).toHaveCount(5);
  await expect(blocs.last()).toHaveAttribute("data-testid", "edd-sans");
  await expect(page.getByTestId("edd-sans")).toContainText("Sans sous-équipe");
  await expect(page.getByTestId("edd-sans")).toContainText("梁晓溪");
  await expect(page.getByTestId("edd-sous-professeurs-louange")).toContainText("Ysaline Marquet");
  // Le référent d'abord dans sa colonne.
  await capture(page, "bandeau-edd-fr", page.getByTestId("equipe-edd"));
});

test("personne sans sous-équipe : pas d'intertitre « Sans sous-équipe »", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS([M("Ysaline Marquet", { uid: "u-ysa", referent: true }), M("梁晓溪", { uid: "u-liang" })]));
  await expect(page.getByTestId("edd-sans")).toContainText("Ysaline Marquet");
  await expect(page.getByTestId("edd-sans")).not.toContainText("Sans sous-équipe");
  await expect(page.getByTestId("equipe-edd").locator("[data-testid^='edd-sous-']")).toHaveCount(0);
});

test("la carte EDD en 中文 montre 钢琴手", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS(), "zh-CN");
  await expect(bloc(page, "pianistes")).toContainText("钢琴手");
  await expect(bloc(page, "pianistes")).toContainText("Bastien Orlay");
  await expect(bloc(page, "professeurs-louange")).toContainText("敬拜老师");
  await expect(page.getByTestId("edd-sans")).toContainText("未分组");
  await capture(page, "carte-edd-zh", page.getByTestId("equipe-edd"));
});

test("le panneau de modification de l'EDD en 中文", async ({ page }) => {
  await ouvrir(page, REFERENT, "/back-office/equipes", DOCS(), "zh-CN");
  await page.getByRole("button", { name: "修改主日学" }).click();
  const p = page.getByRole("dialog");
  const sous = p.getByTestId("membre-u-liang").getByRole("group").first();
  await expect(sous.getByRole("button", { name: "箱鼓", exact: true })).toBeVisible();
  await capture(page, "panneau-edd-zh", p);
});

test("la page de l'équipe EDD", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/edd");
  await expect(page.getByText("Ysaline Marquet").first()).toBeVisible();
  await capture(page, "page-edd-fr");
});

test("la page de l'équipe EDD en 中文", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/edd", DOCS(), "zh-CN");
  await expect(page.getByText("Ysaline Marquet").first()).toBeVisible();
  await capture(page, "page-edd-zh");
});

// ── Pur ─────────────────────────────────────────────────────────────────────

test("sousEquipesEddDe : accents, casse, pluriel pliés ; inconnu → [] ; le champ posé fait foi", () => {
  const g = (groupe: string, over: Partial<MembreEquipe> = {}) => sousEquipesEddDe(M("X", { groupe, ...over }));
  expect(g("Pianistes")).toEqual(["pianistes"]);
  expect(g("Cajon")).toEqual(["cajon"]);
  expect(g("professeur louange")).toEqual(["professeurs-louange"]);
  expect(g("Guitariste")).toEqual(["guitaristes"]);
  expect(g("Professeurs - cours")).toEqual(["professeurs-cours"]);
  expect(g("  PIANISTES  ")).toEqual(["pianistes"]);
  expect(g("Batterie")).toEqual([]);
  expect(g("")).toEqual([]);
  expect(g("Pianistes", { sousEquipesEdd: ["cajon", "professeurs-cours"] })).toEqual(["professeurs-cours", "cajon"]);
  expect(g("Pianistes", { sousEquipesEdd: [] })).toEqual([]);
});

test("colonnesEdd : l'ordre E1, le référent d'abord, les sans-sous-équipe à part", () => {
  const { parSous, sans } = colonnesEdd([
    M("A", { sousEquipesEdd: ["cajon"] }),
    M("B", { sousEquipesEdd: ["cajon", "pianistes"], referent: true }),
    M("C"),
    M("D", { referent: true }),
  ]);
  expect(parSous.cajon.map((m) => m.nom)).toEqual(["B", "A"]);
  expect(parSous.pianistes.map((m) => m.nom)).toEqual(["B"]);
  expect(sans.map((m) => m.nom)).toEqual(["D", "C"]);
});
