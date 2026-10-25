import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile, remplit } from "./helpers/fakeSession";

// Lot 3 (docs/spec-planning-gestes.md), tranche PG-D : copier-coller au clavier (PG22 à PG32).
// Ordinateur seulement (pointeur fin) ; Culte T1 2027 et Paix T1 2027 simulés. Noms fictifs.

test.use({ permissions: ["clipboard-read", "clipboard-write"] })

const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", ...remplit("culte", "paix") }

const DOCS: Record<string, Record<string, unknown>> = {
  "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", piano: "Yann M.", guitare: "Éloïse M." },
  "plannings/culte/dimanches/2027-01-31": { date: "2027-01-31", piano: "Hugo L." },
  // Un compte relié à « Alice Q. » : les autres noms collés sont « sans compte ».
  "users/uid-alice": { email: "alice@example.com", firstName: "Alice", lastName: "Q.", planningName: "Alice Q.", serviceRoles: {}, annonces: [], notify: [] },
}

async function ouvrir(page: Page, vers: string, docs = DOCS) {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }))
  return signInAs(page, ECRIVAIN, docs, vers)
}
async function ouvrirCulte2027(page: Page, docs = DOCS) {
  const db = await ouvrir(page, "/back-office/planning/culte", docs)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await expect(page.locator("[data-date-cell='2027-01-24'], [data-date-carte='2027-01-24']").filter({ visible: true })).toHaveCount(1)
  return db
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true })
const ecritures = (db: FakeDb, date: string) =>
  db.writes.filter((w) => w.method === "PATCH" && w.path === `plannings/culte/dimanches/${date}`)
const historique = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("plannings/culte/history/"))
const ordinateurSeul = () => test.skip(test.info().project.name !== "ordinateur", "clavier : ordinateur")
const poserPresse = (page: Page, texte: string) => page.evaluate((x) => navigator.clipboard.writeText(x), texte)

/** Un clic choisit la case et ouvre « Choisir » ou le champ : on referme, la case reste choisie. */
async function choisir(page: Page, date: string, colonne: string) {
  await laCase(page, date, colonne).click()
  await page.keyboard.press("Escape")
  await expect(laCase(page, date, colonne)).toHaveAttribute("data-selection", /.+/)
}

async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true })
}

test("ordinateur — un clic choisit et ouvre « Choisir » ; Échap ferme puis désélectionne", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await laCase(page, "2027-01-24", "piano").click()
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toBeVisible()
  await expect(laCase(page, "2027-01-24", "piano")).toHaveAttribute("data-selection", "ancre")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("button", { name: /Remplir vers le bas/ })).toHaveCount(0)
  await expect(laCase(page, "2027-01-24", "piano")).toHaveAttribute("data-selection", "ancre")
  await page.keyboard.press("Escape")
  await expect(page.locator("[data-selection]")).toHaveCount(0)
})

test("ordinateur — Maj + clic fait une plage ; la barre dit « 8 cases · 4 dimanches × 2 colonnes »", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await laCase(page, "2027-02-14", "guitare").click({ modifiers: ["Shift"] })
  await expect(page.getByTestId("barre-selection")).toContainText("8 cases · 4 dimanches × 2 colonnes")
  await expect(page.locator("[data-selection]").filter({ visible: true })).toHaveCount(8)
  // L'aide est derrière le « ? » (BO11) : fermée d'office, un clic l'ouvre.
  await expect(page.getByText("Au clavier", { exact: false })).toHaveCount(0)
  await page.getByRole("button", { name: "Raccourcis clavier" }).click()
  await expect(page.getByText("Au clavier", { exact: false })).toBeVisible()
  // Maj + clic n'ouvre rien.
  await expect(page.getByRole("button", { name: /Écrire un nom sans compte/ })).toHaveCount(0)
  await capture(page, "clavier-selection")
  await page.getByTestId("barre-selection").getByRole("button", { name: "Fermer" }).click()
  await expect(page.locator("[data-selection]")).toHaveCount(0)
})

test("ordinateur — les flèches déplacent la case choisie, Entrée ouvre « Choisir »", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await page.keyboard.press("ArrowDown")
  await expect(laCase(page, "2027-01-31", "piano")).toHaveAttribute("data-selection", "ancre")
  await page.keyboard.press("ArrowRight")
  await expect(laCase(page, "2027-01-31", "guitare")).toHaveAttribute("data-selection", "ancre")
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: /Écrire un nom sans compte/ })).toBeVisible()
})

test("ordinateur — ⌘C : le presse-papiers contient le texte tabulé de la plage", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await laCase(page, "2027-01-31", "guitare").click({ modifiers: ["Shift"] })
  await page.keyboard.press("ControlOrMeta+C")
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("Yann M.\tÉloïse M.\nHugo L.\t")
})

test("ordinateur — un collage dans des cases vides s'écrit sans barre, puis la bannière Annuler", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page)
  await poserPresse(page, "Alice Q.\tInès L.\r\n")
  await choisir(page, "2027-02-07", "choriste1")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("2 cases collées, dont 0 noms remplacés.")
  await expect(page.getByTestId("apercu-collage")).toHaveCount(0)
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-07")?.choriste2).toBe("Inès L.")
  // Un seul PATCH pour le dimanche, un seul passage d'historique (PG4, PG5).
  expect(ecritures(db, "2027-02-07")).toHaveLength(1)
  await expect.poll(() => historique(db).length).toBe(1)
  await page.getByTestId("banniere-geste").getByRole("button", { name: "Annuler" }).click()
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-07")?.choriste1).toBe("")
})

test("ordinateur — un collage sur 3 noms donne l'aperçu orange : Échap n'écrit rien, Entrée colle", async ({ page }) => {
  ordinateurSeul()
  const docs = {
    ...DOCS,
    "plannings/culte/dimanches/2027-02-07": { date: "2027-02-07", piano: "Ruth K.", guitare: "Denis F.", batterie: "Anyi Y." },
  }
  const db = await ouvrirCulte2027(page, docs)
  await poserPresse(page, "Alice Q.\tInès L.\tYann M.\tStéphane Z.\tDenis F.")
  await choisir(page, "2027-02-07", "choriste1")
  await page.keyboard.press("ControlOrMeta+V")
  const barre = page.getByTestId("apercu-collage")
  await expect(barre).toContainText("Aperçu du collage : 5 cases. 3 remplacent un nom (en orange). Rien n'est écrit tant que tu n'as pas collé.")
  await expect(page.locator("[data-apercu='remplace']").filter({ visible: true })).toHaveCount(3)
  await expect(page.locator("[data-apercu='']").filter({ visible: true })).toHaveCount(2)
  await expect(laCase(page, "2027-02-07", "piano")).toContainText("Yann M.")
  await capture(page, "clavier-apercu")
  await page.keyboard.press("Escape")
  await expect(barre).toHaveCount(0)
  expect(ecritures(db, "2027-02-07")).toHaveLength(0)
  await expect(laCase(page, "2027-02-07", "piano")).toContainText("Ruth K.")

  await page.keyboard.press("ControlOrMeta+V")
  await expect(barre).toBeVisible()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("banniere-geste")).toContainText("5 cases collées, dont 3 noms remplacés.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-07")?.piano).toBe("Yann M.")
  await capture(page, "clavier-apres-collage")
})

test("ordinateur — « Cases vides seulement » n'écrit que les cases vides", async ({ page }) => {
  ordinateurSeul()
  const docs = { ...DOCS, "plannings/culte/dimanches/2027-02-07": { date: "2027-02-07", piano: "Ruth K." } }
  const db = await ouvrirCulte2027(page, docs)
  await poserPresse(page, "Alice Q.\tInès L.\tYann M.")
  await choisir(page, "2027-02-07", "choriste1")
  await page.keyboard.press("ControlOrMeta+V")
  await page.getByTestId("apercu-collage").getByRole("button", { name: "Cases vides seulement" }).click()
  await expect(page.getByTestId("banniere-geste")).toContainText("2 cases collées, dont 0 noms remplacés.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-07")?.choriste2).toBe("Inès L.")
  expect(db.doc("plannings/culte/dimanches/2027-02-07")?.piano).toBe("Ruth K.")
})

test("ordinateur — « Annuler » de la barre n'écrit rien", async ({ page }) => {
  ordinateurSeul()
  const docs = { ...DOCS, "plannings/culte/dimanches/2027-02-07": { date: "2027-02-07", choriste1: "Ruth K." } }
  const db = await ouvrirCulte2027(page, docs)
  await poserPresse(page, "Alice Q.")
  await choisir(page, "2027-02-07", "choriste1")
  await page.keyboard.press("ControlOrMeta+V")
  await page.getByTestId("apercu-collage").getByRole("button", { name: "Annuler" }).click()
  await expect(page.getByTestId("apercu-collage")).toHaveCount(0)
  expect(ecritures(db, "2027-02-07")).toHaveLength(0)
})

test("ordinateur — « Pasteur Lin » s'écrit tel quel et la bannière le dit sans compte", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page)
  await poserPresse(page, "Pasteur Lin")
  await choisir(page, "2027-02-07", "orateur")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("« Pasteur Lin » : sans compte.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-07")?.orateur).toBe("Pasteur Lin")
})

test("ordinateur — ⌫ vide la plage, avec la bannière Annuler", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await laCase(page, "2027-01-31", "guitare").click({ modifiers: ["Shift"] })
  await page.keyboard.press("Backspace")
  await expect(page.getByTestId("banniere-geste")).toContainText("3 cases vidées.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.piano).toBe("")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-31")?.piano).toBe("")
  await page.getByTestId("banniere-geste").getByRole("button", { name: "Annuler" }).click()
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.piano).toBe("Yann M.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-31")?.piano).toBe("Hugo L.")
})

test("ordinateur — une présidence imposée est refusée au collage", async ({ page }) => {
  ordinateurSeul()
  const docs = {
    "plannings/intergroupe/dimanches/2027-03-14": { date: "2027-03-14" },
    "plannings/paix/dimanches/2027-03-07": { date: "2027-03-07", presidence: "Ruth K." },
  }
  const db = await ouvrir(page, "/back-office/planning/groupes", docs)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.getByRole("tab", { name: "T1", exact: true }).click()
  await expect(page.locator("[data-date-cell='2027-03-14']").filter({ visible: true })).toHaveCount(1)
  await poserPresse(page, "Pasteur Lin\tGroupe M.")
  await laCase(page, "2027-03-14", "presidence").click()
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case verrouillée laissée telle quelle.")
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-03-14")?.musiciens).toBe("Groupe M.")
  expect(JSON.stringify(db.doc("plannings/paix/dimanches/2027-03-14"))).not.toContain("Pasteur")
})

test("telephone, tablette — ni légende « Au clavier » ni barre de sélection", async ({ page }) => {
  test.skip(test.info().project.name === "ordinateur", "sans clavier : tablette et téléphone")
  await ouvrirCulte2027(page)
  await laCase(page, "2027-01-24", "piano").click()
  await expect(page.getByText("Au clavier", { exact: false })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Raccourcis clavier" })).toHaveCount(0)
  await expect(page.getByTestId("barre-selection")).toHaveCount(0)
  await expect(page.locator("[data-selection]")).toHaveCount(0)
})

// ─── Relecture Opus : aperçu, refus, écouteurs ───

const DOCS_APERCU = { ...DOCS, "plannings/culte/dimanches/2027-02-07": { date: "2027-02-07", choriste1: "Ruth K." } }

test("ordinateur — Entrée sur « Annuler » de la barre Coller annule : rien n'est écrit", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page, DOCS_APERCU)
  await poserPresse(page, "Alice Q.\tInès L.")
  await choisir(page, "2027-02-07", "choriste1")
  await page.keyboard.press("ControlOrMeta+V")
  await page.getByTestId("apercu-collage").getByRole("button", { name: "Annuler" }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("apercu-collage")).toHaveCount(0)
  expect(ecritures(db, "2027-02-07")).toHaveLength(0)
})

test("ordinateur — Entrée sur « Cases vides seulement » ne remplace aucun nom", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page, DOCS_APERCU)
  await poserPresse(page, "Alice Q.\tInès L.")
  await choisir(page, "2027-02-07", "choriste1")
  await page.keyboard.press("ControlOrMeta+V")
  await page.getByTestId("apercu-collage").getByRole("button", { name: "Cases vides seulement" }).focus()
  await page.keyboard.press("Enter")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case collée, dont 0 noms remplacés.")
  expect(db.doc("plannings/culte/dimanches/2027-02-07")?.choriste1).toBe("Ruth K.")
})

test("ordinateur — un second ⌘V pendant l'aperçu ne l'écrase ni ne l'écrit ; l'Annuler d'avant est inerte", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page, DOCS_APERCU)
  await choisir(page, "2027-02-14", "choriste1")
  await poserPresse(page, "Hugo L.")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case collée")
  await choisir(page, "2027-02-07", "choriste1")
  await poserPresse(page, "Alice Q.\tInès L.")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("apercu-collage")).toContainText("2 cases")
  await expect(page.locator("[inert] [data-testid='banniere-geste']")).toHaveCount(1)
  await poserPresse(page, "Zoé P.")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("apercu-collage")).toContainText("2 cases")
  expect(ecritures(db, "2027-02-07")).toHaveLength(0)
})

test("ordinateur — un collage entièrement refusé le dit et garde l'Annuler du geste précédent", async ({ page }) => {
  ordinateurSeul()
  const docs = { "plannings/intergroupe/dimanches/2027-03-14": { date: "2027-03-14" }, "plannings/paix/dimanches/2027-03-07": { date: "2027-03-07", presidence: "Ruth K." } }
  await ouvrir(page, "/back-office/planning/groupes", docs)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.getByRole("tab", { name: "T1", exact: true }).click()
  await expect(page.locator("[data-date-cell='2027-03-14']").filter({ visible: true })).toHaveCount(1)
  await poserPresse(page, "Groupe M.")
  await choisir(page, "2027-03-21", "musiciens")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case collée")
  await poserPresse(page, "Pasteur Lin")
  await laCase(page, "2027-03-14", "presidence").click()
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste").filter({ hasText: "1 case verrouillée laissée telle quelle." })).toHaveCount(1)
  await expect(page.getByTestId("banniere-geste").filter({ hasText: "0 case" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Annuler" })).toHaveCount(1)
  // ⌫ sur une plage verrouillée : la note aussi.
  await page.keyboard.press("Backspace")
  await expect(page.getByTestId("banniere-geste").filter({ hasText: "1 case verrouillée laissée telle quelle." })).toHaveCount(1)
})

test("ordinateur — une cellule démesurée est refusée et comptée", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page)
  await poserPresse(page, "x".repeat(300))
  await choisir(page, "2027-02-07", "orateur")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 cellule trop longue ignorée.")
  expect(ecritures(db, "2027-02-07")).toHaveLength(0)
})

test("ordinateur — un nom relié à un compte n'est pas « sans compte » ; l'autre est souligné en pointillé", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await poserPresse(page, "Alice Q.\tPasteur Lin")
  await choisir(page, "2027-02-07", "orateur")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("« Pasteur Lin » : sans compte.")
  await expect(page.getByTestId("banniere-geste")).not.toContainText("Alice")
  await expect(laCase(page, "2027-02-07", "orateur")).not.toHaveAttribute("data-sans-compte", /.*/)
  await expect(laCase(page, "2027-02-07", "traduction")).toHaveAttribute("data-sans-compte", "true")
  await expect(laCase(page, "2027-02-07", "traduction").getByRole("button")).toHaveCSS("text-decoration-style", "dotted")
})

test("ordinateur — les flèches d'un onglet ne déplacent pas la case choisie", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await page.getByRole("tab", { name: "T1", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(laCase(page, "2027-01-24", "piano")).toHaveAttribute("data-selection", "ancre")
  await expect(laCase(page, "2027-01-24", "guitare")).not.toHaveAttribute("data-selection", /.+/)
})

test("ordinateur — sous 640 px (cartes), ni légende, ni barre, ni ⌫ qui écrive", async ({ page }) => {
  ordinateurSeul()
  await page.setViewportSize({ width: 600, height: 900 })
  const db = await ouvrirCulte2027(page)
  await laCase(page, "2027-01-24", "piano").click()
  await page.keyboard.press("Escape")
  await page.keyboard.press("Backspace")
  await expect(page.getByText("Au clavier", { exact: false })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Raccourcis clavier" })).toHaveCount(0)
  await expect(page.getByTestId("barre-selection")).toHaveCount(0)
  expect(ecritures(db, "2027-01-24")).toHaveLength(0)
})

test("ordinateur — le petit déj (colonne en lecture seule) est refusé au collage", async ({ page }) => {
  ordinateurSeul()
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }))
  const db = await signInAs(page, { ...ECRIVAIN, ...remplit("table") }, {}, "/back-office/planning/table")
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await expect(page.locator("[data-date-cell='2027-01-10']").filter({ visible: true })).toHaveCount(1)
  await poserPresse(page, "Équipe E.\tFamille X")
  // La colonne est large : on clique le bouton, pas le vide de la cellule (qui ne ferait que choisir).
  await laCase(page, "2027-01-10", "equipe").getByRole("button").click()
  await page.keyboard.press("Escape")
  await page.keyboard.press("ControlOrMeta+V")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case verrouillée laissée telle quelle.")
  await expect.poll(() => db.doc("plannings/table/dimanches/2027-01-10")?.equipe).toBe("Équipe E.")
  expect(JSON.stringify(db.doc("plannings/table/dimanches/2027-01-10"))).not.toContain("Famille X")
})

// ─── Compatibilité : Windows, Android, iOS, macOS (PG22) ───

test("tablette — avec un trackpad ou une souris, la sélection et la légende « Au clavier » apparaissent", async ({ page }) => {
  test.skip(test.info().project.name !== "tablette", "tablette avec trackpad")
  // Chromium n'émule ni any-hover ni any-pointer : on les rend vrais, le reste de la requête restant réel.
  await page.addInitScript(() => {
    const vrai = window.matchMedia.bind(window)
    window.matchMedia = (q: string) => vrai(q.replace("(any-hover: hover)", "(min-width: 0px)").replace("(any-pointer: fine)", "(min-width: 0px)"))
  })
  await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await laCase(page, "2027-01-31", "guitare").click({ modifiers: ["Shift"] })
  await expect(page.getByTestId("barre-selection")).toContainText("4 cases · 2 dimanches × 2 colonnes")
  // L'aide est derrière le « ? » (BO11) : fermée d'office, un clic l'ouvre.
  await expect(page.getByText("Au clavier", { exact: false })).toHaveCount(0)
  await page.getByRole("button", { name: "Raccourcis clavier" }).click()
  await expect(page.getByText("Au clavier", { exact: false })).toBeVisible()
})

test("ordinateur — le « ? » ouvre l'aide ; Échap la ferme, rend le focus au bouton et garde la sélection", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  const aide = page.getByRole("button", { name: "Raccourcis clavier" })
  await expect(aide).toHaveAttribute("aria-expanded", "false")
  await aide.click()
  await expect(aide).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByText("Au clavier", { exact: false })).toBeVisible()
  // BO-E2 : l'aide s'ouvre dans une zone vive posée d'avance, donc annoncée aux lecteurs d'écran.
  await expect(page.getByRole("status").filter({ hasText: "Au clavier" })).toHaveAttribute("aria-live", "polite")
  await page.keyboard.press("Escape")
  await expect(page.getByText("Au clavier", { exact: false })).toHaveCount(0)
  await expect(aide).toBeFocused()
  await expect(laCase(page, "2027-01-24", "piano")).toHaveAttribute("data-selection", "ancre")
})

test("ordinateur — Ctrl+C et Ctrl+V (Windows, Linux) copient et collent", async ({ page }) => {
  ordinateurSeul()
  test.skip(process.platform === "darwin", "Ctrl+C ne copie pas sous macOS")
  const db = await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await laCase(page, "2027-01-31", "guitare").click({ modifiers: ["Shift"] })
  await page.keyboard.press("Control+C")
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("Yann M.\tÉloïse M.\nHugo L.\t")
  await choisir(page, "2027-02-07", "piano")
  await page.keyboard.press("Control+V")
  await expect(page.getByTestId("banniere-geste")).toBeVisible()
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-07")?.guitare).toBe("Éloïse M.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-02-14")?.piano).toBe("Hugo L.")
})

test("ordinateur — Suppr vide la plage comme ⌫", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page)
  await choisir(page, "2027-01-24", "piano")
  await laCase(page, "2027-01-31", "guitare").click({ modifiers: ["Shift"] })
  await page.keyboard.press("Delete")
  await expect(page.getByTestId("banniere-geste")).toContainText("3 cases vidées.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.piano).toBe("")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.guitare).toBe("")
})

for (const [plateforme, touche] of [["Win32", "Ctrl+"], ["MacIntel", "⌘"], ["iPad", "⌘"], ["Linux armv8", "Ctrl+"]] as const) {
  test(`ordinateur — la barre dit « ${touche}C » quand navigator.platform vaut « ${plateforme} »`, async ({ page }) => {
    ordinateurSeul()
    await page.addInitScript((p) => Object.defineProperty(Navigator.prototype, "platform", { get: () => p }), plateforme)
    await ouvrirCulte2027(page)
    await choisir(page, "2027-01-24", "piano")
    const barre = page.getByTestId("barre-selection")
    await expect(barre).toContainText(`${touche}C`)
    await expect(barre).toContainText(`${touche}V`)
    if (touche === "⌘") await expect(barre).not.toContainText("Ctrl")
  })
}
