import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile, remplit, publie } from "./helpers/fakeSession";
import { repondreDansLeSite } from "./helpers/agencement";

// Lot 3 (docs/spec-planning-gestes.md), tranche PG-E : « Prévenir des changements » (PG33 à PG47).
// Paix T4 2026 publié, horloge au 15/11/2026 ; la route /api/planning/changements est simulée
// (aucun vrai push) ; aucune vraie base. Noms fictifs seulement.

const PUBLIEUR: FakeProfile = { uid: "uid-publieur", email: "publieur@example.com", planningName: "Publieur P.", ...publie("paix"), ...remplit("paix") };
const SANS_ECRITURE: FakeProfile = { ...PUBLIEUR, uid: "uid-lecteur", email: "lecteur@example.com", ...remplit() };
const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", ...remplit("paix") };

const compte = (id: string, prenom: string, nom: string) => [`users/u-${id}`, {
  email: `${id}@example.com`, firstName: prenom, lastName: nom, planningName: `${prenom} ${nom}`,
  serviceRoles: {}, annonces: [], notify: [], equipes: false, ...remplit(),
}] as const
const COMPTES = Object.fromEntries([
  compte("anais", "Anaïs", "P."), compte("ruth", "Ruth", "K."), compte("hugo", "Hugo", "L."), compte("joel", "Joël", "F."), compte("lea", "Léa", "M."),
])

// Ce qui a changé depuis l'état annoncé : présidence du 15/11 (Ruth → Anaïs), musiciens du 22/11 (Hugo → Pasteur Lin,
// sans compte), orateur du 22/11 (Joël vidé). Inchangés : le 29/11, un dimanche passé (08/11) et une case jamais écrite.
const DOCS = {
  ...COMPTES,
  "plannings/paix/dimanches/2026-11-08": { date: "2026-11-08", presidence: "Hugo L." },
  "plannings/paix/dimanches/2026-11-15": { date: "2026-11-15", presidence: "Anaïs P." },
  "plannings/paix/dimanches/2026-11-22": { date: "2026-11-22", musiciens: "Pasteur Lin", orateur: "" },
  "plannings/paix/dimanches/2026-11-29": { date: "2026-11-29", presidence: "Léa M." },
  "planningReleases/paix_2026": {
    published: [],
    annonces: {
      T4: {
        cases: {
          "2026-11-08|presidence": "Ruth K.", "2026-11-15|presidence": "Ruth K.", "2026-11-22|musiciens": "Hugo L.",
          "2026-11-22|orateur": "Joël F.", "2026-11-29|presidence": "Léa M.", "2026-11-29|percussion": "Zoé T.",
        },
        le: "2026-10-02T09:00:00Z", par: "uid-publieur", publieLe: "2026-10-02",
      },
    },
  },
}

async function ouvrir(page: Page, qui: FakeProfile, docs: Record<string, Record<string, unknown>> = DOCS, vers = "/back-office/planning/groupes") {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"))
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }))
  return signInAs(page, qui, docs, vers)
}

const points = (page: Page) => page.locator("[data-changement]").filter({ visible: true })
const banniere = (page: Page) => page.getByTestId("banniere-prevenir")
const feuille = (page: Page) => page.getByRole("alertdialog", { name: "Prévenir des changements" })

type Corps = { action: string; key: string; annee: number; tri: string; changements?: { date: string; cle: string; avant: string; apres: string }[]; noms?: string[]; titre?: string; message?: string; siAbsent?: boolean; apresPublication?: boolean; cases?: Record<string, string> }

/** Simule la route : garde les corps reçus ; `reponse` est la réponse du serveur. */
async function simulerRoute(page: Page, db: FakeDb, reponse: { status?: number; body?: unknown; apres?: () => void } = {}) {
  const corps: Corps[] = []
  await page.route("**/api/planning/changements", async (route) => {
    corps.push(route.request().postDataJSON() as Corps)
    reponse.apres?.()
    await route.fulfill({ status: reponse.status ?? 200, contentType: "application/json", body: JSON.stringify(reponse.body ?? { ok: true }) })
  })
  void db
  return corps
}

async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true })
}

test("un publieur voit la bannière « 3 cases ont changé… » et un point par case changée", async ({ page }) => {
  await ouvrir(page, PUBLIEUR)
  await expect(banniere(page)).toContainText("3 cases ont changé depuis la publication, le 15/11 et le 22/11.")
  await expect(banniere(page)).toContainText("Les personnes concernées ne sont pas encore prévenues.")
  await expect(points(page)).toHaveCount(3)
  await expect(page.locator("[data-case='2026-11-15|presidence'][data-changement]").filter({ visible: true })).toHaveCount(1)
  // Ni le 08/11 (passé), ni le 29/11 (même valeur), ni la case jamais écrite (percussion du 29/11).
  await expect(page.locator("[data-case='2026-11-08|presidence'][data-changement]")).toHaveCount(0)
  await expect(page.locator("[data-case='2026-11-29|presidence'][data-changement]")).toHaveCount(0)
  await capture(page, "prevenir-banniere")
})

test("un écrivain sans droit de publier ne voit ni bannière ni points", async ({ page }) => {
  await ouvrir(page, ECRIVAIN)
  await expect(page.locator("[data-case='2026-11-15|presidence']").filter({ visible: true })).toBeVisible()
  await expect(banniere(page)).toHaveCount(0)
  await expect(points(page)).toHaveCount(0)
})

test("un trimestre brouillon n'a ni bannière ni points", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR, { ...DOCS, "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Anaïs P." } })
  await simulerRoute(page, db)
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.getByRole("tab", { name: "T1", exact: true }).click()
  await expect(page.locator("[data-case='2027-01-10|presidence']").filter({ visible: true })).toBeVisible()
  await expect(banniere(page)).toHaveCount(0)
  await expect(points(page)).toHaveCount(0)
})

test("un publieur sans droit d'écrire : grille en lecture, mais bannière, points et feuille sont là (PG35)", async ({ page }) => {
  await ouvrir(page, SANS_ECRITURE)
  await expect(banniere(page)).toContainText("3 cases ont changé")
  await expect(points(page)).toHaveCount(3)
  await expect(page.getByRole("button", { name: /Copier le/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Choisir" })).toHaveCount(0)
  await banniere(page).getByRole("button", { name: "Prévenir des changements" }).click()
  await expect(feuille(page)).toBeVisible()
})

test("la feuille : les changements, Ajout et Retrait cochés, « Pasteur Lin » grisé, « Envoyer à 4 personnes »", async ({ page }) => {
  await ouvrir(page, PUBLIEUR)
  await banniere(page).getByRole("button", { name: "Prévenir des changements" }).click()
  const f = feuille(page)
  await expect(f).toContainText("Groupe Paix")
  await expect(f).toContainText("4e trimestre 2026, publié le 2 octobre")
  await expect(f.getByText("Ce qui a changé")).toBeVisible()
  await expect(f.getByTestId("prevenir-changements")).toContainText("Présidence")
  await expect(f.getByTestId("prevenir-changements")).toContainText("Ruth K.")
  await expect(f.getByTestId("prevenir-changements")).toContainText("Anaïs P.")
  await expect(f.getByTestId("prevenir-changements")).toContainText("vide")
  await expect(f.getByText("4 sur 5")).toBeVisible()
  for (const nom of ["Anaïs P.", "Ruth K.", "Hugo L.", "Joël F."]) await expect(f.getByRole("checkbox", { name: new RegExp(nom) })).toBeChecked()
  const sansCompte = f.getByRole("checkbox", { name: /Pasteur Lin/ })
  await expect(sansCompte).toBeDisabled()
  await expect(f).toContainText("sans compte : à prévenir toi-même")
  await expect(f.getByTestId("prevenir-personne-Anaïs P.")).toContainText("Ajout")
  await expect(f.getByTestId("prevenir-personne-Ruth K.")).toContainText("Retrait")
  await expect(f.getByLabel("Titre")).toHaveValue("Planning Paix : changement le 15/11 et le 22/11")
  await expect(f.getByLabel("Message")).toHaveValue("Le planning du groupe Paix a changé. Ouvre-le pour voir ta place.")
  await expect(f.getByTestId("prevenir-apercu")).toContainText("Dim. 15/11 : Présidence")
  await expect(f.getByRole("button", { name: "Envoyer à 4 personnes" })).toBeEnabled()
  await capture(page, "prevenir-feuille")
  // Décocher une personne : le compte baisse.
  await f.getByRole("checkbox", { name: /Hugo L\./ }).uncheck()
  await expect(f.getByRole("button", { name: "Envoyer à 3 personnes" })).toBeVisible()
  await f.getByRole("button", { name: "Annuler" }).click()
  await expect(f).toBeHidden()
})

test("envoyer : le corps part à la route (noms cochés, changements), puis l'état est relu et les points disparaissent", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR)
  const corps = await simulerRoute(page, db, {
    body: { prevenus: 4, sansCompte: ["Pasteur Lin"] },
    apres: () => db.set("planningReleases/paix_2026", {
      published: [],
      annonces: { T4: { cases: {
        "2026-11-08|presidence": "Ruth K.", "2026-11-15|presidence": "Anaïs P.", "2026-11-22|musiciens": "Pasteur Lin",
        "2026-11-29|presidence": "Léa M.", "2026-11-29|percussion": "Zoé T.",
      }, le: "2026-11-15T10:00:00Z", par: "uid-publieur", publieLe: "2026-10-02" } },
    }),
  })
  await banniere(page).getByRole("button", { name: "Prévenir des changements" }).click()
  await feuille(page).getByRole("button", { name: "Envoyer à 4 personnes" }).click()
  await expect(page.getByText("Prévenu : 4 personnes.")).toBeVisible()
  await expect(banniere(page)).toHaveCount(0)
  await expect(points(page)).toHaveCount(0)
  const envoi = corps.find((c) => c.action === "envoyer")!
  expect(envoi).toMatchObject({ key: "paix", annee: 2026, tri: "T4" })
  expect(envoi.changements).toEqual([
    { date: "2026-11-15", cle: "presidence", avant: "Ruth K.", apres: "Anaïs P." },
    { date: "2026-11-22", cle: "musiciens", avant: "Hugo L.", apres: "Pasteur Lin" },
    { date: "2026-11-22", cle: "orateur", avant: "Joël F.", apres: "" },
  ])
  expect([...(envoi.noms ?? [])].sort()).toEqual(["Anaïs P.", "Hugo L.", "Joël F.", "Ruth K."])
  // Titre et message non touchés : le serveur les compose dans la langue de chacun.
  expect(envoi.titre).toBeUndefined()
  expect(envoi.message).toBeUndefined()
})

test("un titre modifié part tel quel", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR)
  const corps = await simulerRoute(page, db, { body: { prevenus: 4, sansCompte: [] } })
  await banniere(page).getByRole("button", { name: "Prévenir des changements" }).click()
  await feuille(page).getByLabel("Titre").fill("Changement au planning")
  await feuille(page).getByRole("button", { name: "Envoyer à 4 personnes" }).click()
  await expect.poll(() => corps.find((c) => c.action === "envoyer")?.titre).toBe("Changement au planning")
})

test("« Ne pas prévenir » : confirmation dans le site, puis action « ignorer »", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR)
  const corps = await simulerRoute(page, db)
  await banniere(page).getByRole("button", { name: "Ne pas prévenir" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Ne prévenir personne ?")
  await expect(page.getByRole("alertdialog")).toContainText("rien n'est envoyé")
  await repondreDansLeSite(page, "Ne pas prévenir")
  await expect.poll(() => corps.find((c) => c.action === "ignorer")?.changements?.length).toBe(3)
})

test("une réponse 409 affiche « Le planning a changé entre-temps : recharge. »", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR)
  await simulerRoute(page, db, { status: 409, body: { error: "conflit" } })
  await banniere(page).getByRole("button", { name: "Prévenir des changements" }).click()
  await feuille(page).getByRole("button", { name: "Envoyer à 4 personnes" }).click()
  await expect(feuille(page)).toContainText("Le planning a changé entre-temps : recharge.")
})

test("amorçage : un trimestre publié sans état annoncé envoie sa référence avec siAbsent, sans rien signaler", async ({ page }) => {
  const sansEtat = { ...DOCS, "planningReleases/paix_2026": { published: [] } }
  const db = await ouvrir(page, PUBLIEUR, sansEtat)
  const corps = await simulerRoute(page, db)
  await page.goto("/back-office/planning/groupes")
  await expect.poll(() => corps.length).toBeGreaterThan(0)
  const ref = corps.find((c) => c.action === "reference")!
  expect(ref).toMatchObject({ key: "paix", annee: 2026, tri: "T4", siAbsent: true })
  expect(ref.cases).toMatchObject({ "2026-11-15|presidence": "Anaïs P.", "2026-11-22|musiciens": "Pasteur Lin" })
  await expect(banniere(page)).toHaveCount(0)
  await expect(points(page)).toHaveCount(0)
})

test("« Publier le T1 » réussi : la grille envoie l'état du trimestre (reference, apresPublication)", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR, { ...DOCS, "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Invité A." } })
  const corps = await simulerRoute(page, db)
  await page.route("**/api/planning/release", async (route) => {
    db.set("planningReleases/paix_2027", { published: ["T1"] })
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, published: ["T1"], notified: true, sent: 0 }) })
  })
  await page.getByRole("tab", { name: "2027", exact: true }).click()
  await page.getByRole("tab", { name: "T1", exact: true }).click()
  await page.getByRole("button", { name: "Publier le T1" }).click()
  await repondreDansLeSite(page, "Publier le T1")
  await expect.poll(() => corps.find((c) => c.apresPublication)?.tri).toBe("T1")
  const ref = corps.find((c) => c.apresPublication)!
  expect(ref).toMatchObject({ action: "reference", key: "paix", annee: 2027, tri: "T1" })
  expect(ref.cases).toMatchObject({ "2027-01-10|presidence": "Invité A." })
})

test("telephone — la bannière se met en pile et la feuille tient dans l'écran", async ({ page }) => {
  test.skip(test.info().project.name !== "telephone", "propre au téléphone")
  await ouvrir(page, PUBLIEUR)
  const b = banniere(page)
  await expect(b).toBeVisible()
  const bouton = await b.getByRole("button", { name: "Prévenir des changements" }).boundingBox()
  const ignorer = await b.getByRole("button", { name: "Ne pas prévenir" }).boundingBox()
  expect(ignorer!.y).toBeGreaterThan(bouton!.y + bouton!.height - 1)
  await capture(page, "prevenir-telephone")
  await b.getByRole("button", { name: "Prévenir des changements" }).click()
  const f = feuille(page)
  await expect(f.getByRole("button", { name: "Envoyer à 4 personnes" })).toBeInViewport()
  await capture(page, "prevenir-feuille-telephone")
})

test("中文 — bannière, feuille et dates traduites", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"))
  await ouvrir(page, PUBLIEUR)
  await expect(banniere(page)).toContainText("11月15日、11月22日")
  await expect(banniere(page)).toContainText("通知改动")
  await banniere(page).getByRole("button", { name: "通知改动" }).click()
  const f = page.getByRole("alertdialog", { name: "通知改动" })
  await expect(f).toContainText("改动内容")
  await expect(f.getByRole("button", { name: "发送给 4 人" })).toBeVisible()
})

test("« Ne pas prévenir » refusé (409) : le message le dit dans la page", async ({ page }) => {
  const db = await ouvrir(page, PUBLIEUR)
  await simulerRoute(page, db, { status: 409, body: { error: "conflit" } })
  await banniere(page).getByRole("button", { name: "Ne pas prévenir" }).click()
  await repondreDansLeSite(page, "Ne pas prévenir")
  await expect(page.getByTestId("prevenir-resultat")).toContainText("Le planning a changé entre-temps : recharge.")
})
