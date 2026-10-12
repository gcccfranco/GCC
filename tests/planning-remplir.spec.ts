import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";

// Lot 3 (docs/spec-planning-gestes.md), tranche PG-C : « Remplir vers le bas » (PG18 à PG21).
// Culte T1 2027 simulé ; aucune vraie base. Noms fictifs seulement.

const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", plannings: ["culte"] };

// Le piano du 24/1 porte « Yann M. » ; les 9 dimanches suivants du trimestre (31/1 au 28/3) sont vides.
const DOCS = { "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", piano: "Yann M." } }
const APRES = ["2027-01-31", "2027-02-07", "2027-02-14", "2027-02-21", "2027-02-28", "2027-03-07", "2027-03-14", "2027-03-21", "2027-03-28"]

async function ouvrirCulte2027(page: Page, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }))
  const db = await signInAs(page, ECRIVAIN, docs, "/back-office/planning/culte")
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await expect(page.locator("[data-date-cell='2027-01-24'], [data-date-carte='2027-01-24']").filter({ visible: true })).toHaveCount(1)
  return db
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true })
const ecritures = (db: FakeDb, date: string) =>
  db.writes.filter((w) => w.method === "PATCH" && w.path === `plannings/culte/dimanches/${date}`)
const historique = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("plannings/culte/history/"))

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true })
}

const ouvrirChoisir = (page: Page, date: string, colonne: string) =>
  laCase(page, date, colonne).getByRole("button").first().click()

test("« Choisir » sur « Yann M. » : l'entrée « Remplir vers le bas » dit les 9 cases vides jusqu'au 28/3", async ({ page }) => {
  await ouvrirCulte2027(page)
  await ouvrirChoisir(page, "2027-01-24", "piano")
  const entree = page.getByRole("button", { name: /Remplir vers le bas/ })
  await expect(entree).toBeVisible()
  await expect(entree).toBeEnabled()
  await expect(entree).toContainText("Yann M. dans les 9 cases vides de la colonne, jusqu'au 28/3. Les noms déjà posés restent.")
  await capture(page, "remplir-entree")
})

test("l'entrée est placée sous les noms, avant « Écrire un nom sans compte… »", async ({ page }) => {
  await ouvrirCulte2027(page)
  await ouvrirChoisir(page, "2027-01-24", "piano")
  const boutons = await page.getByRole("button").evaluateAll((els) => els.map((e) => e.textContent ?? ""))
  const iRemplir = boutons.findIndex((b) => b.includes("Remplir vers le bas"))
  const iSansCompte = boutons.findIndex((b) => b.includes("Écrire un nom sans compte"))
  expect(iRemplir).toBeGreaterThan(-1)
  expect(iRemplir).toBeLessThan(iSansCompte)
})

test("ordinateur — l'aperçu en pointillé est posé dans les 9 cases tant que le menu est ouvert", async ({ page }) => {
  test.skip(test.info().project.name !== "ordinateur", "menu contre la case : ordinateur (≥ 1024 px)")
  await ouvrirCulte2027(page)
  await ouvrirChoisir(page, "2027-01-24", "piano")
  await expect(page.locator("[data-apercu]").filter({ visible: true })).toHaveCount(9)
  await expect(laCase(page, "2027-03-28", "piano")).toContainText("Yann M.")
  await page.keyboard.press("Escape")
  await expect(page.locator("[data-apercu]")).toHaveCount(0)
})

test("le choix écrit les seules cases vides : un PATCH par dimanche, un passage d'historique, bannière, Annuler", async ({ page }) => {
  // Une case déjà posée plus bas reste telle quelle.
  const docs = { ...DOCS, "plannings/culte/dimanches/2027-02-14": { date: "2027-02-14", piano: "Hugo L." } }
  const db = await ouvrirCulte2027(page, docs)
  await ouvrirChoisir(page, "2027-01-24", "piano")
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toContainText("dans les 8 cases vides")
  await page.getByRole("button", { name: /Remplir vers le bas/ }).click()
  await expect(page.getByTestId("banniere-geste")).toContainText("Yann M. mis dans 8 cases, jusqu'au 28/3.")
  const remplis = APRES.filter((d) => d !== "2027-02-14")
  for (const d of remplis) await expect.poll(() => db.doc(`plannings/culte/dimanches/${d}`)?.piano).toBe("Yann M.")
  for (const d of remplis) expect(ecritures(db, d)).toHaveLength(1)
  expect(ecritures(db, "2027-02-14")).toHaveLength(0)
  expect(db.doc("plannings/culte/dimanches/2027-02-14")?.piano).toBe("Hugo L.")
  // PG5 : un seul passage d'historique pour les 8 cases.
  await expect.poll(() => historique(db).length).toBe(1)
  await expect(laCase(page, "2027-03-28", "piano")).toContainText("Yann M.")
  await expect(laCase(page, "2027-02-14", "piano")).toContainText("Hugo L.")
  await capture(page, "remplir-banniere")

  await page.getByTestId("banniere-geste").getByRole("button", { name: "Annuler" }).click()
  for (const d of remplis) await expect.poll(() => db.doc(`plannings/culte/dimanches/${d}`)?.piano).toBe("")
  expect(db.doc("plannings/culte/dimanches/2027-02-14")?.piano).toBe("Hugo L.")
  await expect(page.getByTestId("banniere-geste")).toHaveCount(0)
})

test("une case vide : « Choisir » n'offre pas « Remplir vers le bas »", async ({ page }) => {
  await ouvrirCulte2027(page)
  await ouvrirChoisir(page, "2027-01-31", "piano")
  await expect(page.getByRole("button", { name: "Écrire un nom sans compte…" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toHaveCount(0)
})

test("une case à deux noms s'ouvre en champ texte : pas d'entrée", async ({ page }) => {
  const docs = { "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", piano: "Yann M., Hugo L." } }
  await ouvrirCulte2027(page, docs)
  await laCase(page, "2027-01-24", "piano").getByRole("button").first().click()
  await expect(laCase(page, "2027-01-24", "piano").getByRole("textbox", { name: "Piano" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toHaveCount(0)
})

test("une colonne Thème (texte libre) : pas d'entrée « Remplir vers le bas »", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({
    status: 200, contentType: "text/csv",
    body: '"DATE","Présidence","Musiciens","Orateur","Thème"\n"20/09","Delphine Z.","Gr Louange","Hewei","Paraboles"',
  }))
  const paix: FakeProfile = { ...ECRIVAIN, plannings: ["paix"] }
  await signInAs(page, paix, {}, "/back-office/planning/groupes")
  await laCase(page, "2026-09-20", "theme").getByRole("button").click()
  await expect(laCase(page, "2026-09-20", "theme").getByLabel("Thème", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toHaveCount(0)
})

test("rien à remplir : l'entrée est grisée et le dit", async ({ page }) => {
  const docs = { "plannings/culte/dimanches/2027-03-28": { date: "2027-03-28", piano: "Yann M." } }
  const db = await ouvrirCulte2027(page, docs)
  await ouvrirChoisir(page, "2027-03-28", "piano")
  const entree = page.getByRole("button", { name: /Remplir vers le bas/ })
  await expect(entree).toBeDisabled()
  await expect(entree).toContainText("Aucune case vide plus bas ce trimestre.")
  expect(db.writes.filter((w) => w.path.startsWith("plannings/"))).toHaveLength(0)
})

test("telephone — l'entrée est dans la feuille « Choisir »", async ({ page }) => {
  test.skip(test.info().project.name !== "telephone", "feuille sur téléphone ; la tablette est couverte par les tests communs")
  await ouvrirCulte2027(page)
  await ouvrirChoisir(page, "2027-01-24", "piano")
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toBeVisible()
  await capture(page, "remplir-feuille")
})
