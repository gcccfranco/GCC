import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone } from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Exemples d'usage, T6 (docs/spec-exemples-usage.md) : la feuille « Modifier une équipe » (titre avec le nombre de
// membres, champ d'ajout en tête, barre Annuler / Enregistrer collée en bas). Cinq projets (SPECS_GRAND_ECRAN).
// Base et Sheets simulés, noms inventés. Captures : test-results/t6-feuille/.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const MEMBRES = [
  M("Anouk Pelard", { mention: "Chef de chœur" }), M("Baptiste Orvain"), M("Cléo Mandrin", { essai: true }),
  M("Dorian Sabel"), M("Élise Varnot", { mention: "Basse" }), M("Fabrice Linet"), M("Garance Tholy"),
  M("Hector Bidaut"), M("Iseult Corvel"),
];
const doc = (membres: MembreEquipe[]) => ({ membres, updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" });

// La base simulée de la dernière ouverture (les tests d'un fichier tournent l'un après l'autre).
let base: FakeDb;

async function ouvrir(page: Page, equipe: "louange" | "da" = "louange", membres = MEMBRES, qui: FakeProfile = ADMIN) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.route("**/api/equipes/rattachement", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) }));
  base = await signInAs(page, qui, { [`equipes/${equipe}`]: doc(membres) }, "/back-office/equipes");
  const nom = equipe === "louange" ? "Louange" : "DA";
  await page.getByRole("button", { name: `Modifier ${nom}` }).first().click();
  const f = page.getByRole("dialog", { name: new RegExp(`^${nom}, \\d+ membres?$`) });
  await expect(f).toBeVisible();
  // L'animation d'ouverture finie : les mesures se prennent sur la feuille posée.
  await f.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  return f;
}

const boite = async (l: ReturnType<Page["locator"]>) => (await l.boundingBox())!;

test("titre : « Louange, 9 membres », puis 10 après un ajout libre", async ({ page }) => {
  const f = await ouvrir(page);
  await expect(f).toHaveAccessibleName("Louange, 9 membres");
  await f.getByPlaceholder("Ajouter un membre").fill("Jonas Ferrand");
  await f.getByRole("button", { name: /Ajouter « Jonas Ferrand »/ }).click();
  await expect(page.getByRole("dialog", { name: "Louange, 10 membres" })).toBeVisible();
});

test("titre : une équipe d'un membre dit « 1 membre »", async ({ page }) => {
  await ouvrir(page, "da", [M("Kévin Aubrac")]);
  await expect(page.getByRole("dialog", { name: "DA, 1 membre" })).toBeVisible();
});

test("titre en 中文 : 「敬拜组，9 人」", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, { "equipes/louange": doc(MEMBRES) }, "/back-office/equipes");
  await page.getByRole("button", { name: /^修改敬拜/ }).first().click();
  const f = page.getByRole("dialog", { name: /，\d+ 人$/ });
  await expect(f).toBeVisible();
  await f.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  const court = await f.getByRole("heading").first().textContent();
  expect(court).toBe("敬拜，9 人");
  if (estTelephone(test.info())) await page.screenshot({ path: "test-results/t6-feuille/telephone-zh.png" });
});

test("le champ d'ajout et ses résultats sont au-dessus de la première ligne ; Annuler et Enregistrer visibles sans défiler", async ({ page }, info) => {
  const f = await ouvrir(page);
  const champ = f.getByPlaceholder("Ajouter un membre");
  await champ.fill("Zz");
  const libre = f.getByRole("button", { name: /Ajouter « Zz »/ });
  const premiere = f.getByTestId(/^membre-/).first();
  const yPremiere = (await boite(premiere)).y;
  expect((await boite(champ)).y + (await boite(champ)).height, "champ au-dessus de la liste").toBeLessThanOrEqual(yPremiere);
  expect((await boite(libre)).y + (await boite(libre)).height, "résultats au-dessus de la liste").toBeLessThanOrEqual(yPremiere);
  await champ.fill("");
  const fenetre = page.viewportSize()!;
  for (const nom of ["Annuler", "Enregistrer"]) {
    const b = await boite(f.getByRole("button", { name: nom }));
    expect(b.y, `${nom} : haut`).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, `${nom} : bas`).toBeLessThanOrEqual(fenetre.height);
    expect(b.x + b.width, `${nom} : droite`).toBeLessThanOrEqual(fenetre.width);
  }
  const dossier = "test-results/t6-feuille";
  await page.screenshot({ path: `${dossier}/${info.project.name}.png` });
  if (info.project.name === "telephone" || info.project.name === "ordinateur-1440") {
    await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.classList.remove("light"); });
    // Les couleurs des boutons passent par une transition : on attend qu'elle finisse.
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${dossier}/${info.project.name}-sombre.png` });
  }
});

test("ordinateur 1 280 × 720 : Enregistrer visible sans défiler", async ({ page }, info) => {
  test.skip(info.project.name !== "ordinateur", "cas propre à l'ordinateur");
  await page.setViewportSize({ width: 1280, height: 720 });
  const f = await ouvrir(page);
  const b = await boite(f.getByRole("button", { name: "Enregistrer" }));
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.y + b.height).toBeLessThanOrEqual(720);
});

test("la barre reste collée en bas quand la liste défile", async ({ page }) => {
  const f = await ouvrir(page);
  const bouton = f.getByRole("button", { name: "Enregistrer" });
  const avant = await boite(bouton);
  await f.getByTestId(/^membre-/).last().scrollIntoViewIfNeeded();
  const apres = await boite(bouton);
  expect(Math.abs(apres.y - avant.y)).toBeLessThanOrEqual(1);
});

test("forme selon la disposition", async ({ page }, info) => {
  const f = await ouvrir(page);
  const b = await boite(f);
  const fenetre = page.viewportSize()!;
  const nom = info.project.name;
  if (nom === "tablette") {
    expect(Math.abs(b.width - 560)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.x - (fenetre.width - b.x - b.width)), "centrée").toBeLessThanOrEqual(1);
    expect(await f.evaluate((el) => getComputedStyle(el).borderBottomLeftRadius), "coins du bas arrondis").not.toBe("0px");
    // vaul prolonge les feuilles du bas par un ::after de leur fond : une feuille qui flotte n'en a pas.
    expect(await f.evaluate((el) => getComputedStyle(el, "::after").display), "aucun fond sous la feuille").toBe("none");
  } else if (estGrandEcran(info)) {
    expect(Math.abs(b.width - 420)).toBeLessThanOrEqual(1);
    expect(Math.abs(b.x + b.width - fenetre.width), "collé à droite").toBeLessThanOrEqual(1);
  } else {
    expect(Math.abs(b.width - fenetre.width), "pleine largeur").toBeLessThanOrEqual(1);
    expect(Math.abs(b.y + b.height - fenetre.height), "feuille du bas").toBeLessThanOrEqual(1);
  }
});

test("erreur d'enregistrement : le message est entre la liste et la barre, juste au-dessus d'Enregistrer", async ({ page }) => {
  const f = await ouvrir(page);
  await page.route(/firestore\.googleapis\.com.*equipes(\/|%2F)louange/, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({ status: 500, contentType: "application/json", body: "{}" })
      : route.fallback());
  await f.getByRole("button", { name: "Enregistrer" }).click();
  const alerte = f.getByRole("alert");
  await expect(alerte).toBeVisible();
  const a = await boite(alerte);
  const enregistrer = await boite(f.getByRole("button", { name: "Enregistrer" }));
  // Bas de la zone qui défile (la liste), quel que soit le défilement.
  const basListe = await f.getByTestId(/^membre-/).last().evaluate((el) => el.closest(".overflow-y-auto")!.getBoundingClientRect().bottom);
  expect(a.y + a.height, "au-dessus d'Enregistrer").toBeLessThanOrEqual(enregistrer.y);
  expect(enregistrer.y - (a.y + a.height), "écart ≤ 16 px").toBeLessThanOrEqual(16);
  expect(a.y, "sous la liste").toBeGreaterThanOrEqual(basListe - 1);
  expect(enregistrer.y + enregistrer.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

test("mouvement réduit : la feuille arrive en fondu de 150 ms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const f = await ouvrir(page);
  const anim = await f.evaluate((el) => { const s = getComputedStyle(el); return { n: s.animationName, d: s.animationDuration }; });
  expect(anim.n).toBe("volet-fondu");
  expect(anim.d).toBe("0.15s");
});

// ── T7 : les lignes et le retrait (noms inventés) ───────────────────────────

const DOSSIER_T7 = "test-results/t7-feuille";
const ligne = (f: Locator, nom: string) => f.getByTestId(`membre-${nom}`);
const ecrits = () => (base.doc("equipes/louange")!.membres as MembreEquipe[]);
const sombre = async (page: Page) => {
  await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.classList.remove("light"); });
  await page.waitForTimeout(500);
};

test("lignes repliées : 52 ± 2 px avec ou sans résumé, aria-expanded au toucher de la ligne, aucune croix « Retirer »", async ({ page }) => {
  // Louange : le résumé est celui de `resume()` (sous-équipe), pas la mention.
  const f = await ouvrir(page, "louange", [M("Anouk Pelard", { sousEquipes: ["musiciens"] }), ...MEMBRES.slice(1)]);
  const lignes = f.getByTestId(/^membre-/);
  const n = await lignes.count();
  expect(n).toBe(9);
  for (let i = 0; i < n; i++) expect(Math.abs((await boite(lignes.nth(i))).height - 52), `ligne ${i}`).toBeLessThanOrEqual(2);
  // Avec résumé (mention) et sans.
  await expect(ligne(f, "Anouk Pelard")).toContainText("Musiciens");
  await expect(f.getByRole("button", { name: /^Retirer/ })).toHaveCount(0);
  const bouton = ligne(f, "Baptiste Orvain").getByRole("button").first();
  await expect(bouton).toHaveAttribute("aria-expanded", "false");
  expect((await boite(bouton)).height).toBeGreaterThanOrEqual(44);
  await bouton.click();
  await expect(bouton).toHaveAttribute("aria-expanded", "true");
});

test("téléphone 390 × 844 : le champ d'ajout, les neuf lignes et la barre tiennent sans défiler", async ({ page }, info) => {
  test.skip(info.project.name !== "telephone", "cas propre au téléphone");
  await page.setViewportSize({ width: 390, height: 844 });
  const f = await ouvrir(page);
  const liste = await f.getByTestId(/^membre-/).first().evaluate((el) => {
    const z = el.closest(".overflow-y-auto")!;
    return { sh: z.scrollHeight, ch: z.clientHeight };
  });
  expect(liste.sh).toBeLessThanOrEqual(liste.ch);
  await expect(f.getByPlaceholder("Ajouter un membre")).toBeInViewport();
  await expect(f.getByRole("button", { name: "Enregistrer" })).toBeInViewport();
});

test("« en essai » se lit sur la ligne repliée", async ({ page }) => {
  const f = await ouvrir(page);
  await expect(ligne(f, "Cléo Mandrin").getByRole("button")).toContainText("en essai");
  await expect(ligne(f, "Dorian Sabel")).not.toContainText("en essai");
});

test("retirer puis Remettre : la ligne reste, pâlie, avec « Remettre » ; puis elle revient identique", async ({ page }, info) => {
  const f = await ouvrir(page);
  const l = ligne(f, "Anouk Pelard");
  const avant = await l.innerText();
  await l.getByRole("button", { name: /^Anouk Pelard/ }).click();
  await l.getByRole("button", { name: "Retirer de l'équipe" }).click();
  await expect(l).toBeVisible();
  const remettre = l.getByRole("button", { name: "Remettre Anouk Pelard" });
  await expect(remettre).toBeFocused();
  await expect(l.getByRole("button", { name: /^Anouk Pelard/ })).toHaveCount(0);
  await expect(l).toContainText("Anouk Pelard, retiré à l'enregistrement");
  await expect.poll(() => l.getByText("Anouk Pelard", { exact: true }).evaluate((el) => Number(getComputedStyle(el.parentElement!.parentElement!.parentElement!).opacity))).toBeLessThan(1);
  const b = await boite(remettre);
  expect(Math.abs(b.height - 32)).toBeLessThanOrEqual(1);
  const zone = await remettre.evaluate((el) => {
    const r = getComputedStyle(el, "::before"); // inset vertical négatif : la zone dépasse le dessin
    return el.getBoundingClientRect().height - 2 * parseFloat(r.top);
  });
  expect(zone).toBeGreaterThanOrEqual(44);
  if (info.project.name === "ordinateur") await page.screenshot({ path: `${DOSSIER_T7}/ordinateur.png` });
  if (info.project.name === "tablette") await page.screenshot({ path: `${DOSSIER_T7}/tablette-debout.png` });
  if (info.project.name === "tablette-paysage") await page.screenshot({ path: `${DOSSIER_T7}/tablette-couchee.png` });
  await remettre.click();
  await expect(remettre).toHaveCount(0);
  expect(await l.innerText()).toBe(avant);
  await expect(l.getByRole("button", { name: /^Anouk Pelard/ })).toHaveAttribute("aria-expanded", "false");
});

test("retirer puis Enregistrer : le membre n'est plus écrit, les autres sont inchangés", async ({ page }) => {
  const f = await ouvrir(page);
  await ligne(f, "Garance Tholy").getByRole("button").click();
  await ligne(f, "Garance Tholy").getByRole("button", { name: "Retirer de l'équipe" }).click();
  await expect(f).toHaveAccessibleName("Louange, 9 membres");
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(f).toBeHidden();
  expect(ecrits().map((m) => m.nom)).toEqual(MEMBRES.filter((m) => m.nom !== "Garance Tholy").map((m) => m.nom));
  expect(ecrits().find((m) => m.nom === "Anouk Pelard")).toMatchObject({ mention: "Chef de chœur" });
});

test("retirer puis Annuler : rien n'est écrit", async ({ page }) => {
  const f = await ouvrir(page);
  await ligne(f, "Garance Tholy").getByRole("button").click();
  await ligne(f, "Garance Tholy").getByRole("button", { name: "Retirer de l'équipe" }).click();
  await f.getByRole("button", { name: "Annuler" }).click();
  await expect(f).toBeHidden();
  expect(ecrits()).toHaveLength(9);
});

const REFERENT: FakeProfile = {
  uid: "u-ref-mus", email: "ref-mus@example.com", firstName: "Océane", lastName: "Tarvel",
  dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"],
};
const DOUBLE = M("Pascal Ruvel", { uid: "u-pascal", sousEquipes: ["musiciens", "choristes"], referentSous: ["musiciens"] });

test("retrait partiel d'un référent de sous-équipe : pâli, Remettre le rend intact, Enregistrer garde ses autres sous-équipes", async ({ page }) => {
  const f = await ouvrir(page, "louange", [M("Quentin Abrial", { uid: "u-quentin", sousEquipes: ["musiciens"] }), DOUBLE], REFERENT);
  const l = ligne(f, "u-pascal");
  const avant = await l.innerText();
  await l.getByRole("button", { name: /^Pascal Ruvel/ }).click();
  await l.getByRole("button", { name: "Retirer de ma sous-équipe" }).click();
  await expect(l.getByRole("button", { name: "Remettre Pascal Ruvel" })).toBeVisible();
  await l.getByRole("button", { name: "Remettre Pascal Ruvel" }).click();
  expect(await l.innerText()).toBe(avant);
  await l.getByRole("button", { name: /^Pascal Ruvel/ }).click();
  await l.getByRole("button", { name: "Retirer de ma sous-équipe" }).click();
  await f.getByRole("button", { name: "Enregistrer" }).click();
  await expect(f).toBeHidden();
  expect(ecrits().find((m) => m.uid === "u-pascal")).toMatchObject({ sousEquipes: ["choristes"], referentSous: [] });
  expect(ecrits().find((m) => m.uid === "u-quentin")).toMatchObject({ sousEquipes: ["musiciens"] });
});

async function rgb(page: Page, couleur: string) {
  return page.evaluate((c) => {
    const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
  }, couleur);
}
const lum = (c: number[]) => {
  const [r, g, b] = c.map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

for (const mode of ["clair", "sombre"] as const) {
  test(`contraste du nom pâli ≥ 3:1 (${mode}) ; captures du téléphone`, async ({ page }, info) => {
    const f = await ouvrir(page);
    if (mode === "sombre") await sombre(page);
    await ligne(f, "Anouk Pelard").getByRole("button").click();
    await ligne(f, "Baptiste Orvain").getByRole("button").click();
    const l = ligne(f, "Baptiste Orvain");
    await l.getByRole("button", { name: "Retirer de l'équipe" }).scrollIntoViewIfNeeded();
    if (info.project.name === "telephone") await page.screenshot({ path: `${DOSSIER_T7}/telephone-${mode}-deplie.png` });
    await l.getByRole("button", { name: "Retirer de l'équipe" }).click();
    await page.waitForTimeout(400);
    const nom = l.getByText("Baptiste Orvain", { exact: true });
    const mesure = await nom.evaluate((el) => ({
      couleur: getComputedStyle(el).color,
      opacite: Number(getComputedStyle(el.parentElement!.parentElement!.parentElement!).opacity),
      fond: getComputedStyle(el.closest("[role=dialog]")!).backgroundColor,
    }));
    const t = await rgb(page, mesure.couleur), fd = await rgb(page, mesure.fond);
    const m = t.map((v, i) => v * mesure.opacite + fd[i] * (1 - mesure.opacite));
    const [a, b] = [lum(m), lum(fd)].sort((x, y) => y - x);
    expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(3);
    if (info.project.name === "telephone") await page.screenshot({ path: `${DOSSIER_T7}/telephone-${mode}-retire.png` });
  });
}

test("mouvement réduit : la zone dépliée s'ouvre en fondu de 150 ms", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const f = await ouvrir(page);
  await ligne(f, "Baptiste Orvain").getByRole("button").click();
  const d = await ligne(f, "Baptiste Orvain").locator(".deplie-membre").evaluate((el) => getComputedStyle(el).animationDuration);
  expect(d).toBe("0.15s");
});
