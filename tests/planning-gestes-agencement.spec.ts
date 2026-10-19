import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { interdireDialoguesNatifs, margeAttendue, verifierSansDebordement, zoneDeContenu } from "./helpers/agencement";

// Lot 3 (docs/spec-planning-gestes.md, section 7), PG-Z : l'agencement des gestes du planning, sur les cinq
// projets. Bannières à la largeur de la grille, page sans défilement de côté, pastille au survol (ordinateur)
// ou ⋯ de dimanche (tablette, téléphone), fenêtre de copie et feuille « Prévenir » dans la fenêtre.
// Captures : PW_CAPTURES=<dossier>, à regarder aux cinq tailles. Noms fictifs seulement.

test.use({ permissions: ["clipboard-read", "clipboard-write"] })

const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", plannings: ["culte"] }
const PUBLIEUR: FakeProfile = { uid: "uid-publieur", email: "publieur@example.com", planningName: "Publieur P.", notify: ["Groupe Paix"], plannings: ["paix"] }

const CULTE = {
  "plannings/culte/dimanches/2027-01-17": {
    date: "2027-01-17", presidence: "Ruth K.", choriste1: "Alice Q.", choriste2: "Inès L.", piano: "Yann M.",
    guitare: "Éloïse M.", batterie: "Stéphane Z.", sono: "Anyi Y.", ppt: "Denis F.",
  },
  "plannings/culte/dimanches/2027-01-24": { date: "2027-01-24", piano: "Hugo L.", guitare: "Léa M." },
}
const PAIX = {
  "plannings/paix/dimanches/2026-11-15": { date: "2026-11-15", presidence: "Anaïs P." },
  "plannings/paix/dimanches/2026-11-22": { date: "2026-11-22", musiciens: "Pasteur Lin", orateur: "" },
  "planningReleases/paix_2026": {
    published: [],
    annonces: { T4: { cases: { "2026-11-15|presidence": "Ruth K.", "2026-11-22|musiciens": "Hugo L.", "2026-11-22|orateur": "Joël F." }, le: "2026-10-02T09:00:00Z", par: "uid-publieur", publieLe: "2026-10-02" } },
  },
}

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>>, vers: string) {
  interdireDialoguesNatifs(page)
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }))
  return signInAs(page, qui, docs, vers)
}

const survol = () => test.info().project.name.startsWith("ordinateur")
const ligne = (page: Page, date: string) => page.locator(`tr:has([data-date-cell='${date}']), [data-date-carte='${date}']`).filter({ visible: true })

/** Une bannière prend toute la zone moins deux marges, et ne déborde pas à droite. */
async function aLaLargeurDeLaGrille(page: Page, bloc: Locator) {
  const zone = await zoneDeContenu(page)
  const marge = await margeAttendue(page)
  const b = (await bloc.boundingBox())!
  expect(b.width, "la largeur de la grille").toBeGreaterThanOrEqual(zone.droite - zone.gauche - 2 * marge - 1)
  expect(b.x + b.width, "ne dépasse pas la fenêtre").toBeLessThanOrEqual(zone.droite + 1)
}

/** Une fenêtre ou une feuille tient dans la fenêtre du navigateur. */
async function tientDansLaFenetre(page: Page, bloc: Locator) {
  // Les fenêtres du site s'ouvrent en glissant : on attend qu'elles aient fini de bouger, puis on mesure.
  const v = page.viewportSize()!
  await expect.poll(async () => {
    const b = (await bloc.boundingBox())!
    return b.x >= -1 && b.y >= -1 && b.x + b.width <= v.width + 1 && b.y + b.height <= v.height + 1
  }, { message: "la fenêtre tient dans l'écran (gauche, haut, droite, bas)" }).toBe(true)
}

async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true })
}

test("copier : pastille au survol sur ordinateur, ⋯ ailleurs ; bannière à la largeur de la grille, fenêtre de copie dans l'écran", async ({ page }) => {
  await ouvrir(page, ECRIVAIN, CULTE, "/back-office/planning/culte")
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await expect(ligne(page, "2027-01-24")).toHaveCount(1)
  if (survol()) {
    await ligne(page, "2027-01-24").hover()
    await expect(page.getByRole("button", { name: "Copier le 17/1" })).toBeVisible()
    await expect(ligne(page, "2027-01-24").getByRole("button", { name: "Plus d'actions" })).toHaveCount(0)
    await capture(page, "gestes-pastille")
    await page.getByRole("button", { name: "Copier le 17/1" }).click()
  } else {
    await expect(page.getByRole("button", { name: /Copier le \d/ })).toHaveCount(0)
    await ligne(page, "2027-01-24").getByRole("button", { name: "Plus d'actions" }).click()
    await capture(page, "gestes-menu")
    await page.getByRole("menuitem", { name: /Copier le dimanche précédent/ }).click()
  }
  // Deux noms à remplacer (Hugo L., Léa M.) : la fenêtre du site s'ouvre.
  const fenetre = page.getByRole("alertdialog")
  await expect(fenetre).toBeVisible()
  await tientDansLaFenetre(page, fenetre)
  await capture(page, "gestes-fenetre-copie")
  await fenetre.getByRole("button", { name: /Remplacer aussi/ }).click()
  const banniere = page.getByTestId("banniere-geste")
  await expect(banniere).toContainText("cases copiées du 17/1")
  await aLaLargeurDeLaGrille(page, banniere)
  await verifierSansDebordement(page)
  await capture(page, "gestes-banniere")
})

test("prévenir : la bannière a la largeur de la grille, la feuille tient dans l'écran, la page ne défile pas de côté", async ({ page }) => {
  await ouvrir(page, PUBLIEUR, PAIX, "/back-office/planning/groupes")
  const banniere = page.getByTestId("banniere-prevenir")
  await expect(banniere).toContainText("ont changé depuis la publication")
  await aLaLargeurDeLaGrille(page, banniere)
  await verifierSansDebordement(page)
  await capture(page, "gestes-prevenir-banniere")
  await banniere.getByRole("button", { name: "Prévenir des changements" }).click()
  const feuille = page.getByRole("alertdialog", { name: "Prévenir des changements" })
  await expect(feuille).toBeVisible()
  await tientDansLaFenetre(page, feuille)
  await capture(page, "gestes-prevenir-feuille")
})

test("ordinateur — la barre du collage a la largeur de la grille", async ({ page }) => {
  test.skip(!survol(), "clavier : ordinateur")
  await ouvrir(page, ECRIVAIN, CULTE, "/back-office/planning/culte")
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.locator("[data-case='2027-01-17|piano']").filter({ visible: true }).click()
  await page.keyboard.press("Escape")
  await page.keyboard.press("Control+c")
  await page.locator("[data-case='2027-01-24|piano']").filter({ visible: true }).click()
  await page.keyboard.press("Escape")
  await page.evaluate(() => navigator.clipboard.writeText("Tom R."))
  await page.keyboard.press("Control+v")
  const barre = page.getByTestId("apercu-collage")
  await expect(barre).toBeVisible()
  await aLaLargeurDeLaGrille(page, barre)
  await verifierSansDebordement(page)
  await capture(page, "gestes-collage")
})
