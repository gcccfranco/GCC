import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile, remplit } from "./helpers/fakeSession";

// Lot 3 (docs/spec-planning-gestes.md), tranche PG-B : « Copier le dimanche précédent »
// (PG10 à PG17). Culte T1 2027 simulé ; aucune vraie base. Noms fictifs seulement.

const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", ...remplit("culte") };

// 17/01/2027 : 8 colonnes de personnes remplies, plus un Orateur (jamais recopié).
const SOURCE = {
  date: "2027-01-17", presidence: "Ruth K.", choriste1: "Alice Q.", choriste2: "Inès L.", piano: "Yann M.",
  guitare: "Éloïse M.", batterie: "Stéphane Z.", sono: "Anyi Y.", ppt: "Denis F.", orateur: "Orateur O.",
}
const DOCS = { "plannings/culte/dimanches/2027-01-17": SOURCE }
const SOURCE_CHAMPS = ["presidence", "choriste1", "choriste2", "piano", "guitare", "batterie", "sono", "ppt"]

async function ouvrir(page: Page, qui: FakeProfile, vers: string, docs: Record<string, Record<string, unknown>> = DOCS) {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }))
  return signInAs(page, qui, docs, vers)
}

async function ouvrirCulte2027(page: Page, docs?: Record<string, Record<string, unknown>>) {
  const db = await ouvrir(page, ECRIVAIN, "/back-office/planning/culte", docs)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await expect(page.locator("[data-date-cell='2027-01-24'], [data-date-carte='2027-01-24']").filter({ visible: true })).toHaveCount(1)
  return db
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true })
const ligne = (page: Page, date: string) =>
  page.locator(`tr:has([data-date-cell='${date}']), [data-date-carte='${date}']`).filter({ visible: true })

const ecritures = (db: FakeDb, date: string) =>
  db.writes.filter((w) => w.method === "PATCH" && w.path === `plannings/culte/dimanches/${date}`)
const historique = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("plannings/culte/history/"))

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true })
}

const ordinateurSeul = () => test.skip(test.info().project.name !== "ordinateur", "pastille au survol : ordinateur")
const sansSurvol = () => test.skip(test.info().project.name === "ordinateur", "⋯ de dimanche : tablette et téléphone")

test("ordinateur — la pastille « Copier le 17/1 » apparaît au survol et pose l'aperçu en pointillé", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  await ligne(page, "2027-01-24").hover()
  const pastille = page.getByRole("button", { name: "Copier le 17/1" })
  await expect(pastille).toBeVisible()
  await pastille.hover()
  await expect(page.locator("[data-apercu]").filter({ visible: true })).toHaveCount(8)
  await expect(laCase(page, "2027-01-24", "piano")).toContainText("Yann M.")
  await expect(laCase(page, "2027-01-24", "orateur")).not.toHaveAttribute("data-apercu", /.*/)
  await expect(pastille).toHaveAttribute(
    "title",
    "Copier le dimanche précédent. Les 8 cases vides reprennent le 17/1. Ne sont pas recopiés : Orateur. Un nom déjà posé reste.",
  )
  await expect(pastille).toHaveAccessibleDescription(/Les 8 cases vides reprennent le 17\/1/)
  await capture(page, "copier-apercu")
})

test("ordinateur — un clic écrit en UN seul PATCH (8 champs, sans Orateur), une écriture d'historique, puis Annuler", async ({ page }) => {
  ordinateurSeul()
  const db = await ouvrirCulte2027(page)
  const demandes: string[] = []
  page.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("/dimanches/2027-01-24")) demandes.push(decodeURIComponent(r.url())) })
  await ligne(page, "2027-01-24").hover()
  await page.getByRole("button", { name: "Copier le 17/1" }).click()
  await expect(page.getByTestId("banniere-geste")).toContainText("Dimanche 24/1 : 8 cases copiées du 17/1.")
  await expect(laCase(page, "2027-01-24", "piano")).toContainText("Yann M.")
  await expect.poll(() => ecritures(db, "2027-01-24").length).toBe(1)
  const doc = db.doc("plannings/culte/dimanches/2027-01-24")!
  for (const c of SOURCE_CHAMPS) expect(doc[c]).toBe(SOURCE[c as keyof typeof SOURCE])
  expect(doc).not.toHaveProperty("orateur")
  expect(demandes).toHaveLength(1)
  for (const c of SOURCE_CHAMPS) expect(demandes[0]).toContain(`updateMask.fieldPaths=${c}`)
  expect(demandes[0]).not.toContain("fieldPaths=orateur")
  // PG5 : un seul passage d'historique pour les 8 cases.
  await expect.poll(() => historique(db).length).toBe(1)

  await page.getByTestId("banniere-geste").getByRole("button", { name: "Annuler" }).click()
  await expect(laCase(page, "2027-01-24", "piano")).not.toContainText("Yann M.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.piano).toBe("")
  await expect.poll(() => ecritures(db, "2027-01-24").length).toBe(2)
  // Annuler se replie dans la même entrée (même auteur, moins de 15 minutes) : une écriture de plus.
  await expect.poll(() => historique(db).length).toBe(2)
  await expect(page.getByTestId("banniere-geste")).toHaveCount(0)
})

test("la cible porte 3 autres noms : la fenêtre du site propose les 5 cases vides ou le remplacement", async ({ page }) => {
  const dejaPose = {
    "plannings/culte/dimanches/2027-01-24": {
      date: "2027-01-24", presidence: "Zoé T.", choriste1: "Hugo L.", choriste2: "Alice Q.", piano: "", guitare: "", batterie: "", sono: "", ppt: "",
    },
  }
  const docs = { ...DOCS, ...dejaPose }
  const dialogues: string[] = []
  page.on("dialog", (d) => { dialogues.push(d.message()); void d.dismiss() })

  // « Annuler » : rien n'est écrit.
  const db = await ouvrirCulte2027(page, docs)
  await ouvrirCopie(page)
  const fenetre = page.getByRole("alertdialog")
  await expect(fenetre).toContainText("Copier le 17/1 sur le 24/1 ?")
  await expect(fenetre.getByRole("button", { name: "Remplir les 5 cases vides" })).toBeVisible()
  await expect(fenetre.getByRole("button", { name: "Remplacer aussi ces 3 noms" })).toBeVisible()
  await expect(fenetre).toContainText("Les 5 cases vides du 24/1 seront remplies. 3 cases portent déjà un autre nom")
  await expect(fenetre).toContainText("Zoé T.")
  await capture(page, "copier-fenetre")
  await fenetre.getByRole("button", { name: "Annuler" }).click()
  await expect(fenetre).toHaveCount(0)
  expect(ecritures(db, "2027-01-24")).toHaveLength(0)

  // « Remplir les 5 cases vides » : 5 champs, les 3 noms restent.
  await ouvrirCopie(page)
  await fenetre.getByRole("button", { name: "Remplir les 5 cases vides" }).click()
  await expect.poll(() => ecritures(db, "2027-01-24").length).toBe(1)
  expect(ecritures(db, "2027-01-24")[0].data).toMatchObject({ piano: "Yann M.", guitare: "Éloïse M.", batterie: "Stéphane Z.", sono: "Anyi Y.", ppt: "Denis F." })
  expect(db.doc("plannings/culte/dimanches/2027-01-24")).toMatchObject({ presidence: "Zoé T.", choriste1: "Hugo L." })
  expect(dialogues).toEqual([])
})

test("la cible porte 3 autres noms : « Remplacer aussi ces 3 noms » en écrit 8", async ({ page }) => {
  const docs = {
    ...DOCS,
    "plannings/culte/dimanches/2027-01-24": {
      date: "2027-01-24", presidence: "Zoé T.", choriste1: "Hugo L.", choriste2: "Alice Q.", piano: "", guitare: "", batterie: "", sono: "", ppt: "",
    },
  }
  const db = await ouvrirCulte2027(page, docs)
  await ouvrirCopie(page)
  await page.getByRole("alertdialog").getByRole("button", { name: "Remplacer aussi ces 3 noms" }).click()
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.presidence).toBe("Ruth K.")
  expect(ecritures(db, "2027-01-24")).toHaveLength(1)
  expect(db.doc("plannings/culte/dimanches/2027-01-24")).toMatchObject({ choriste1: "Alice Q.", choriste2: "Inès L.", sono: "Anyi Y." })
  await expect(page.getByTestId("banniere-geste")).toContainText("8 cases copiées du 17/1")
})

test("le premier dimanche du trimestre copie le dernier du trimestre précédent", async ({ page }) => {
  const docs = { "plannings/culte/dimanches/2026-12-27": { date: "2026-12-27", presidence: "Ruth K.", piano: "Yann M." } }
  const db = await ouvrirCulte2027(page, docs)
  await ouvrirCopie(page, "2027-01-03", "27/12")
  await expect(page.getByTestId("banniere-geste")).toContainText("Dimanche 3/1 : 2 cases copiées du 27/12.")
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-03")?.piano).toBe("Yann M.")
})

test("la ligne précédente vide : rien à copier, ni pastille ni entrée active", async ({ page }) => {
  await ouvrirCulte2027(page, {})
  await ouvrirSeulementSiOffert(page, "2027-01-24")
})

test("le J−7 absent des lignes du planning : le ⋯ reste, grisé « Rien à copier depuis le 27/12 »", async ({ page }) => {
  await ouvrirCulte2027(page, {})
  if (test.info().project.name === "ordinateur") {
    await ligne(page, "2027-01-03").hover()
    await expect(page.getByRole("button", { name: /Copier le/ })).toHaveCount(0)
    return
  }
  await ligne(page, "2027-01-03").getByRole("button", { name: "Plus d'actions" }).click()
  const entree = page.getByRole("menuitem", { name: /Copier le dimanche précédent/ })
  await expect(entree).toHaveAttribute("aria-disabled", "true")
  await expect(entree).toContainText("Rien à copier depuis le 27/12.")
})

test("« Mes dates » activé : la source reste le dimanche précédent, même masqué", async ({ page }) => {
  const docs = {
    ...DOCS,
    "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", sono: "Écrivain E." },
  }
  const db = await ouvrirCulte2027(page, docs)
  await page.getByRole("button", { name: "Mes dates" }).click()
  await expect(page.locator("[data-date-cell='2027-01-17'], [data-date-carte='2027-01-17']").filter({ visible: true })).toHaveCount(0)
  await ouvrirCopie(page)
  const fenetre = page.getByRole("alertdialog")
  await expect(fenetre).toContainText("Copier le 17/1 sur le 24/1 ?")
  await fenetre.getByRole("button", { name: "Remplir les 7 cases vides" }).click()
  await expect.poll(() => db.doc("plannings/culte/dimanches/2027-01-24")?.piano).toBe("Yann M.")
  expect(db.doc("plannings/culte/dimanches/2027-01-24")?.sono).toBe("Écrivain E.")
})

// ─── Présidence imposée par Interfranco et Intergroupe (PG2) ───

const PAIX: FakeProfile = { uid: "uid-paix", email: "paix@example.com", planningName: "Écrivain E.", ...remplit("paix") }
const DOCS_PAIX = {
  "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
  "plannings/intergroupe/dimanches/2027-03-14": { date: "2027-03-14" },
  "plannings/paix/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Ancien Z.", musiciens: "Groupe M." },
  "plannings/paix/dimanches/2027-03-07": { date: "2027-03-07", presidence: "Ruth K.", musiciens: "Groupe N." },
}
async function ouvrirPaix2027(page: Page) {
  const db = await ouvrir(page, PAIX, "/back-office/planning/groupes", DOCS_PAIX)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.getByRole("tab", { name: "T1", exact: true }).click()
  await expect(ligne(page, "2027-03-14")).toHaveCount(1)
  return db
}

test("Paix, dimanche d'Interfranco à la source : la présidence n'est pas recopiée, et la note le dit", async ({ page }) => {
  const db = await ouvrirPaix2027(page)
  await ouvrirCopie(page, "2027-01-24")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case copiée du 17/1")
  await expect(page.getByTestId("banniere-geste")).toContainText("1 case verrouillée laissée telle quelle")
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-01-24")?.musiciens).toBe("Groupe M.")
  expect(db.doc("plannings/paix/dimanches/2027-01-24")).not.toHaveProperty("presidence")
})

test("Paix, dimanche d'Intergroupe à la cible : la présidence imposée n'est jamais écrite", async ({ page }) => {
  const db = await ouvrirPaix2027(page)
  await ouvrirCopie(page, "2027-03-14", "7/3")
  await expect.poll(() => db.doc("plannings/paix/dimanches/2027-03-14")?.musiciens).toBe("Groupe N.")
  expect(JSON.stringify(db.doc("plannings/paix/dimanches/2027-03-14"))).not.toContain("Intergroupe")
  expect(db.doc("plannings/paix/dimanches/2027-03-14")).not.toHaveProperty("presidence")
})

test("Interfranco : la date posée qui précède (10/1 pour le 14/3), pas le dimanche J−7", async ({ page }) => {
  const docs = {
    "plannings/interfranco/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Ruth K.", choriste1: "Alice Q." },
    "plannings/interfranco/dimanches/2027-03-14": { date: "2027-03-14" },
  }
  const db = await ouvrir(page, { ...ECRIVAIN, ...remplit("interfranco") }, "/back-office/planning/interfranco", docs)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await expect(ligne(page, "2027-03-14")).toHaveCount(1)
  await ouvrirCopie(page, "2027-03-14", "10/1")
  await expect(page.getByTestId("banniere-geste")).toContainText("Dimanche 14/3 : 2 cases copiées du 10/1.")
  await expect.poll(() => db.doc("plannings/interfranco/dimanches/2027-03-14")?.choriste1).toBe("Alice Q.")
})

// Lot RS : le « publieur seul » n'existe plus (le gestionnaire remplit et publie) ; le cas voisin est celui qui lit : un membre
// sans responsabilité n'a ni pastille « Copier » ni ⋯ sur la grille de l'App.
test("lot RS : sans le droit d'écrire la grille (membre qui lit) : ni pastille ni ⋯ de dimanche", async ({ page }) => {
  const membre: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Membre M.", responsabilites: [] }
  await ouvrir(page, membre, "/planning/groupes", { ...DOCS_PAIX, "planningReleases/paix_2027": { published: ["T1"] } })
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.getByRole("tab", { name: "T1", exact: true }).click()
  await expect(ligne(page, "2027-01-24")).toHaveCount(1)
  if (test.info().project.name === "ordinateur") await ligne(page, "2027-01-24").hover()
  await expect(page.getByRole("button", { name: /Copier le/ })).toHaveCount(0)
  await expect(page.locator("[data-grille]").getByRole("button", { name: "Plus d'actions" })).toHaveCount(0)
})

test("tablette et téléphone — le ⋯ du dimanche porte « Copier le dimanche précédent » avec son aide et l'aperçu", async ({ page }) => {
  sansSurvol()
  const db = await ouvrirCulte2027(page)
  await ligne(page, "2027-01-24").getByRole("button", { name: "Plus d'actions" }).click()
  const entree = page.getByRole("menuitem", { name: /Copier le dimanche précédent/ })
  await expect(entree).toContainText("Du 17/1, dans les 8 cases vides.")
  await expect(entree).toContainText("Ne sont pas recopiés : Orateur.")
  await expect(page.locator("[data-apercu]").filter({ visible: true })).toHaveCount(8)
  await capture(page, "copier-menu")
  await entree.click()
  await expect(page.getByTestId("banniere-geste")).toContainText("8 cases copiées du 17/1")
  await expect.poll(() => ecritures(db, "2027-01-24").length).toBe(1)
  await expect(page.locator("[data-apercu]")).toHaveCount(0)
})

test("tablette et téléphone — rien à copier : l'entrée est grisée", async ({ page }) => {
  sansSurvol()
  await ouvrirCulte2027(page, { "plannings/culte/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Ruth K." },
    "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", presidence: "Ruth K." } })
  await ligne(page, "2027-01-24").getByRole("button", { name: "Plus d'actions" }).click()
  const entree = page.getByRole("menuitem", { name: /Copier le dimanche précédent/ })
  await expect(entree).toHaveAttribute("aria-disabled", "true")
  await expect(entree).toContainText("Rien à copier depuis le 17/1.")
})

test("dans l'App, ou sans le droit d'écrire : ni pastille ni ⋯ de dimanche", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, "/planning/culte")
  await expect(page.getByTestId("barre-grille")).toBeVisible()
  await expect(page.getByRole("button", { name: /Copier le/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Plus d'actions" })).toHaveCount(0)
})

test("droit retiré pendant le geste : le message s'affiche et les cases reprennent leur valeur", async ({ page }) => {
  const db = await ouvrirCulte2027(page)
  await page.route(/\/dimanches\/2027-01-24/, (route) =>
    route.request().method() === "PATCH" ? route.fulfill({ status: 403, contentType: "application/json", body: "{}" }) : route.fallback())
  await ouvrirCopie(page)
  await expect(page.getByText("tu n’as plus le droit de modifier ce planning")).toBeVisible()
  await expect(laCase(page, "2027-01-24", "piano")).not.toContainText("Yann M.")
  expect(ecritures(db, "2027-01-24")).toHaveLength(0)
  await expect(page.getByTestId("banniere-geste")).toHaveCount(0)
})

/** Ouvre la copie du dimanche `date` : pastille sur ordinateur, ⋯ ailleurs. */
async function ouvrirCopie(page: Page, date = "2027-01-24", source = "17/1") {
  if (test.info().project.name === "ordinateur") {
    await ligne(page, date).hover()
    await page.getByRole("button", { name: `Copier le ${source}` }).click()
  } else {
    await ligne(page, date).getByRole("button", { name: "Plus d'actions" }).click()
    await page.getByRole("menuitem", { name: /Copier le dimanche précédent/ }).click()
  }
}

async function ouvrirSeulementSiOffert(page: Page, date: string) {
  if (test.info().project.name === "ordinateur") {
    await ligne(page, date).hover()
    await expect(page.getByRole("button", { name: /Copier le/ })).toHaveCount(0)
  } else {
    await ligne(page, date).getByRole("button", { name: "Plus d'actions" }).click()
    await expect(page.getByRole("menuitem", { name: /Copier le dimanche précédent/ })).toHaveAttribute("aria-disabled", "true")
  }
}

// ─── Dimanche de 2026 absent de l'app : la ligne semée accompagne les cases du geste (PG4) ───

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
const CULTE_SHEET = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["04/10", "Paul W.", "Christelle Z.", "Alice Q.", "Eva C.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Hewei", "", "Ruth K.", ""],
  ["11/10", "Jonathan Z.", "Daniela W.", "Inès L.", "Jo M.", "Christelle C.", "Stéphane Z.", "Lorenzo S.", "Karémy X.", "Belka", "", "", ""],
])

test("Culte 2026 : le dimanche vient du Sheet, le PATCH porte la case copiée et la ligne semée", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-05T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet")
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE_SHEET : "" })
  })
  const db = await signInAs(page, ECRIVAIN, {}, "/back-office/planning/culte")
  await expect(page.locator("[data-date-cell='2026-10-11'], [data-date-carte='2026-10-11']").filter({ visible: true })).toHaveCount(1)
  await ouvrirCopie(page, "2026-10-11", "4/10")
  const fenetre = page.getByRole("alertdialog")
  await expect(fenetre).toContainText("Copier le 4/10 sur le 11/10 ?")
  await fenetre.getByRole("button", { name: "Remplir la case vide" }).click()
  await expect.poll(() => ecritures(db, "2026-10-11").length).toBe(1)
  const doc = db.doc("plannings/culte/dimanches/2026-10-11")!
  expect(doc).toMatchObject({ sainteCene: "Ruth K.", presidence: "Jonathan Z.", piano: "Jo M." })
  expect(doc).not.toHaveProperty("petitDej")
})

test("ordinateur — REVUE : pendant l'écriture la grille est inerte (ni pastille, ni ⋯, ni clavier), la bannière ne vient qu'après", async ({ page }) => {
  ordinateurSeul()
  await ouvrirCulte2027(page)
  let liberer: () => void = () => {}
  const retenue = new Promise<void>((ok) => { liberer = ok })
  await page.route(/firestore\.googleapis\.com.*dimanches/, async (route) => {
    if (route.request().method() === "PATCH") await retenue
    await route.fallback()
  })
  await ligne(page, "2027-01-24").hover()
  await page.getByRole("button", { name: "Copier le 17/1" }).click()
  const grille = page.locator("[data-en-cours]")
  await expect(grille).toHaveCount(1)
  await expect(grille).toHaveAttribute("inert", /.*/)
  await expect(page.getByTestId("banniere-geste")).toHaveCount(0)
  liberer()
  await expect(page.getByTestId("banniere-geste")).toContainText("8 cases copiées")
  await expect(page.locator("[data-en-cours]")).toHaveCount(0)
})

test("telephone — REVUE : pendant l'écriture les cartes sont inertes (⋯ Copier, cases)", async ({ page }) => {
  test.skip(test.info().project.name !== "telephone", "cartes : téléphone")
  const db = await ouvrirCulte2027(page)
  let liberer: () => void = () => {}
  const retenue = new Promise<void>((ok) => { liberer = ok })
  await page.route(/firestore\.googleapis\.com.*dimanches/, async (route) => {
    if (route.request().method() === "PATCH") await retenue
    await route.fallback()
  })
  await ligne(page, "2027-01-24").getByRole("button", { name: "Plus d'actions" }).click()
  await page.getByRole("menuitem", { name: /Copier le dimanche précédent/ }).click()
  await expect(page.locator("[data-cartes-en-cours]")).toHaveAttribute("inert", /.*/)
  liberer()
  await expect(page.getByTestId("banniere-geste")).toContainText("8 cases copiées")
  await expect(page.locator("[data-cartes-en-cours]")).toHaveCount(0)
  void db
})
