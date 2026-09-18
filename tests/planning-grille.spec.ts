import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { canEditPlanning } from "../src/lib/access";
import { COLONNES_CULTE, GRILLE_CULTE, fusionnerLignes, lignesPubliees } from "../src/lib/planning/grilles";
import { fusionnerChangements } from "../src/lib/planning/historique";
import { CULTE_ROLES } from "../src/lib/planning/names";

// Lot 17 (docs/spec-planning-grille.md), étapes G1 à G3 : le planning du Culte
// Franco s'affiche dans l'app comme dans le Sheet (grille continue, colonne des
// dates figée, cartes sur téléphone), les personnes désignées par un admin le
// remplissent case par case, et chaque modification laisse une ligne
// d'historique nommée. La source reste le Google Sheet, dimanche par dimanche,
// pour les dimanches que la grille de l'app n'a pas encore.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

// Mêmes colonnes que Franco_Louange, en-tête et colonne de notes comprises.
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["30/08", "Belka", "Alice Q.", "Inès L.", "Jo M.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Pasteur ZHOU", "", "", ""],
  ["20/09", "Paul W.", "Christelle Z.", "Inès L.", "Ruth K.", "Éloïse M.", "Stéphane Z.", "Anyi Y.", "Karémy X.", "Hewei", "", "", "à confirmer"],
  ["27/09", "Jonathan Z.", "Daniela W.", "Alice Q.", "Eva C.", "Christelle C.", "Yiyi C.", "Lorenzo S.", "Denis F.", "Belka", "", "", ""],
  ["04/10", "Paul W.", "Christelle Z.", "Alice Q.", "Eva C.", "Éloïse M.", "Yiyi C.", "Anyi Y.", "Denis F.", "Hewei", "", "Ruth K.", ""],
  ["11/10", "Jonathan Z.", "Daniela W.", "Inès L.", "Jo M.", "Christelle C.", "Stéphane Z.", "Lorenzo S.", "Karémy X.", "Belka", "", "", ""],
]);

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };
const PUBLIEUR: FakeProfile = { uid: "uid-pub", email: "pub@example.com", planningName: "Paul W.", notify: ["*"] };
const CHRISTELLE: FakeProfile = {
  uid: "uid-christelle", email: "christelle@example.com",
  firstName: "Christelle", lastName: "Zhang", planningName: "Christelle Z.",
  plannings: ["culte"],
};

/** Un autre compte, pour l'autocomplétion : son nom de planning n'est nulle part dans la grille. */
const ESTHER = { email: "esther@example.com", firstName: "Esther", lastName: "Chen", planningName: "Esther C.", serviceRoles: {}, annonces: [], notify: [], poles: [] };

/** Ouvre `to` le vendredi 18/09/2026 : dimanche courant = 20/09, trimestre T3. */
async function open(page: Page, who: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  return signInAs(page, who, docs, to);
}

/** La case d'un dimanche et d'une colonne, dans la vue affichée (table ou carte). */
const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

/** Le champ d'une case en cours de saisie : table et cartes coexistent dans le
 *  DOM, on vise donc celui de la vue affichée. Un <input list> a le rôle ARIA
 *  « combobox » : on le désigne par son libellé. */
const champDe = (page: Page, date: string, colonne: string, libelle: string) =>
  laCase(page, date, colonne).getByLabel(libelle, { exact: true });

const ordinateurEtTablette = () =>
  test.skip(test.info().project.name === "telephone", "la table : ordinateur et tablette");
const telephoneSeul = () =>
  test.skip(test.info().project.name !== "telephone", "les cartes : téléphone");

// ─── Définitions, droits, publication, fusion, historique (modules purs) ──────

test("les colonnes du Culte portent les index de CULTE_ROLES, dans le même ordre", () => {
  expect(COLONNES_CULTE.map((c) => c.index)).toEqual(CULTE_ROLES.map(([i]) => i));
  expect(COLONNES_CULTE).toHaveLength(11);
  expect(GRILLE_CULTE.key).toBe("culte");
  expect(GRILLE_CULTE.couleur).toBe("#2d5a65");
  // Les libellés sont ceux, déjà traduits, de planning.roles.*
  for (const c of COLONNES_CULTE) expect(c.i18n).toMatch(/^planning\.roles\./);
});

test("canEditPlanning : les admins, et les profils dont `plannings` porte la clé", () => {
  const admin = { email: "tc328829@gmail.com" };
  const membre = { email: "membre@example.com" };
  expect(canEditPlanning(admin, null, "culte")).toBe(true);
  expect(canEditPlanning(admin, null, "paix")).toBe(true);
  expect(canEditPlanning(membre, { plannings: ["culte"] }, "culte")).toBe(true);
  expect(canEditPlanning(membre, { plannings: ["culte"] }, "paix")).toBe(false);
  expect(canEditPlanning(membre, {}, "culte")).toBe(false);
  expect(canEditPlanning(null, { plannings: ["culte"] }, "culte")).toBe(false);
  // D10 : publier (notify) et remplir (plannings) sont deux droits distincts.
  expect(canEditPlanning(membre, { notify: ["*"] } as { plannings?: string[] }, "culte")).toBe(false);
});

test("publication (D7) : un dimanche d'un trimestre futur non publié ne sort pas pour un membre", () => {
  const rows = [["2026-06-28"], ["2026-09-20"], ["2026-10-04"], ["2027-01-10"]];
  const membre = lignesPubliees(rows, [], "T3", 2026, false);
  expect(membre.map((l) => l.row[0])).toEqual(["2026-06-28", "2026-09-20"]);
  const publieur = lignesPubliees(rows, [], "T3", 2026, true);
  expect(publieur.map((l) => l.row[0])).toEqual(["2026-06-28", "2026-09-20", "2026-10-04", "2027-01-10"]);
  expect(publieur.map((l) => l.nonPublie)).toEqual([false, false, true, true]);
  // T4 publié : le dimanche d'octobre sort aussi pour un membre.
  expect(lignesPubliees(rows, ["T4"], "T3", 2026, false).map((l) => l.row[0]))
    .toEqual(["2026-06-28", "2026-09-20", "2026-10-04"]);
});

test("la grille de l'app remplace le Sheet dimanche par dimanche", () => {
  const sheet = [["2026-09-20", "Paul W."], ["2026-09-27", "Jonathan Z."]];
  const app = [["2026-09-27", "Ruth K."], ["2026-10-04", "Eva C."]];
  expect(fusionnerLignes(app, sheet)).toEqual([
    ["2026-09-20", "Paul W."],
    ["2026-09-27", "Ruth K."],
    ["2026-10-04", "Eva C."],
  ]);
  expect(fusionnerLignes([], sheet), "grille vide : le Sheet tel quel").toEqual(sheet);
});

test("historique : deux retouches d'une même case font une seule ligne, de l'avant au dernier après", () => {
  const un = fusionnerChangements([], { kind: "case", date: "2026-10-04", colonne: "piano", from: "Eva C.", to: "Esther C." });
  expect(un).toHaveLength(1);
  const deux = fusionnerChangements(un, { kind: "case", date: "2026-10-04", colonne: "piano", from: "Esther C.", to: "Ruth K." });
  expect(deux).toEqual([{ kind: "case", date: "2026-10-04", colonne: "piano", from: "Eva C.", to: "Ruth K." }]);
  // Revenue à sa valeur de départ : la ligne disparaît.
  expect(fusionnerChangements(deux, { kind: "case", date: "2026-10-04", colonne: "piano", from: "Ruth K.", to: "Eva C." })).toEqual([]);
  // Une autre case s'ajoute à la même entrée.
  expect(fusionnerChangements(un, { kind: "case", date: "2026-10-04", colonne: "guitare", from: "", to: "Jo M." })).toHaveLength(2);
});

// ─── La grille en lecture (G1) ───────────────────────────────────────────────

test("la grille du Culte : les colonnes du Sheet, un bandeau de période et d'horaire", async ({ page }) => {
  await open(page, PUBLIEUR, "/planning/culte");
  const bandeau = page.getByTestId("grille-bandeau");
  await expect(bandeau).toContainText("Culte Franco");
  await expect(bandeau).toContainText("Dimanche 10:30");
  await expect(bandeau).toContainText("2026");
  // Affichage par trimestre (demande de Timothée, 18/09/2026) : le trimestre
  // courant, T3, donc août et septembre ; octobre est au T4.
  await expect(laCase(page, "2026-09-20", "presidence")).toHaveText("Paul W.");
  await expect(laCase(page, "2026-08-30", "presidence")).toHaveText("Belka");
  await expect(laCase(page, "2026-10-11", "piano")).toHaveCount(0);
  await expect(page.getByText("à confirmer"), "les notes de travail restent dans la feuille").toHaveCount(0);
});

test("ordinateur et tablette : les colonnes sont dans l'ordre du Sheet", async ({ page }) => {
  ordinateurEtTablette();
  await open(page, PUBLIEUR, "/planning/culte");
  await expect(page.getByTestId("grille-colonnes")).toHaveText(
    /Date.*Présidence.*Choriste 1.*Choriste 2.*Piano.*Guitare.*Batterie.*Sono.*PPT.*Orateur.*Trad\./
  );
});

test("le sélecteur de trimestre : T3 par défaut, T4 sur demande", async ({ page }) => {
  await open(page, PUBLIEUR, "/planning/culte");
  // Le trimestre courant est choisi d'office, et le bandeau le nomme.
  await expect(page.getByRole("button", { name: "T3" })).toBeVisible();
  await expect(page.getByTestId("grille-bandeau")).toContainText("T3");
  await expect(laCase(page, "2026-10-11", "piano")).toHaveCount(0);

  await page.getByRole("button", { name: "T4" }).click();
  await expect(laCase(page, "2026-10-11", "piano")).toHaveText("Jo M.");
  await expect(laCase(page, "2026-09-20", "presidence"), "on ne voit qu'un trimestre à la fois").toHaveCount(0);
  await expect(page.getByTestId("grille-bandeau")).toContainText("T4");
});

test("plus de fenêtre glissante : « Voir plus tôt » n'existe plus", async ({ page }) => {
  await open(page, PUBLIEUR, "/planning/culte");
  // Attendre que la grille soit chargée : sans cela, l'absence des boutons
  // serait vraie d'une page vide et le test passerait pour rien.
  await expect(laCase(page, "2026-09-20", "presidence")).toHaveText("Paul W.");
  await expect(page.getByRole("button", { name: "Voir plus tôt" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Voir plus tard" })).toHaveCount(0);
});

test("ordinateur et tablette : la colonne des dates reste visible au défilement horizontal", async ({ page }) => {
  ordinateurEtTablette();
  await open(page, PUBLIEUR, "/planning/culte");
  // Un seul trimestre tient parfois dans la largeur : on rétrécit la fenêtre
  // pour que la grille déborde, puisque c'est le débordement qu'on teste.
  await page.setViewportSize({ width: 820, height: 800 });
  const defilement = page.getByTestId("grille-defilement");
  const date = page.locator('[data-date-cell="2026-09-20"]').filter({ visible: true });
  const loin = laCase(page, "2026-09-20", "traduction");
  const avant = { date: (await date.boundingBox())!.x, loin: (await loin.boundingBox())!.x };
  await defilement.evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await expect.poll(async () => Math.round((await loin.boundingBox())!.x), { message: "la grille défile bien" })
    .toBeLessThan(Math.round(avant.loin) - 50);
  expect(Math.abs((await date.boundingBox())!.x - avant.date), "la colonne des dates ne bouge pas").toBeLessThan(3);
});

test("téléphone : une carte par dimanche, aucun défilement horizontal de la page", async ({ page }) => {
  telephoneSeul();
  await open(page, PUBLIEUR, "/planning/culte");
  // T3 : 30/08, 20/09 et 27/09 (04/10 et 11/10 sont au T4).
  await expect(page.getByTestId("grille-carte")).toHaveCount(3);
  await expect(laCase(page, "2026-09-20", "presidence")).toHaveText("Paul W.");
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(deborde, "la page ne défile pas horizontalement").toBe(false);
});

test("trimestre non publié : invisible pour un membre, marqué « Non publié » pour un publieur", async ({ page }) => {
  await open(page, MEMBRE, "/planning/culte");
  await expect(laCase(page, "2026-09-20", "presidence")).toHaveText("Paul W.");
  await expect(laCase(page, "2026-10-04", "presidence"), "T4 non publié : caché aux membres").toHaveCount(0);
  await expect(laCase(page, "2026-10-11", "presidence")).toHaveCount(0);
  await expect(page.locator('[data-case^="2026-10"]'), "rien du T4 ne fuit").toHaveCount(0);
});

test("trimestre non publié : le publieur voit les lignes, marquées", async ({ page }) => {
  await open(page, PUBLIEUR, "/planning/culte");
  // Le T4 n'est pas publié : le publieur a sa pilule, le membre ne l'a pas.
  await page.getByRole("button", { name: "T4" }).click();
  await expect(laCase(page, "2026-10-04", "presidence")).toHaveText("Paul W.");
  await expect(page.locator('[data-non-publie="2026-10-04"]').filter({ visible: true })).toBeVisible();
  await expect(page.locator('[data-non-publie="2026-09-20"]')).toHaveCount(0);
});

// ─── Les droits et l'écriture (G2, G3) ───────────────────────────────────────

test("sans le droit : aucun bouton « Modifier », aucune case cliquable", async ({ page }) => {
  await open(page, PUBLIEUR, "/planning/culte");
  await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
  await expect(laCase(page, "2026-09-20", "piano")).toHaveText("Ruth K.");
  await expect(laCase(page, "2026-09-20", "piano").locator("button")).toHaveCount(0);
});

test("avec le droit : une case s'écrit, tient après rechargement, et la voisine ne bouge pas", async ({ page }) => {
  const db = await open(page, CHRISTELLE, "/planning/culte", { [`users/uid-esther`]: ESTHER });
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-27", "piano").getByRole("button").click();
  const champ = champDe(page, "2026-09-27", "piano", "Piano");
  await champ.fill("Esther C.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Esther C.");
  await expect(page.getByText("Enregistré")).toBeVisible();

  const doc = db.doc("plannings/culte/dimanches/2026-09-27")!;
  expect(doc.piano).toBe("Esther C.");
  expect(doc.guitare, "les cases voisines sont conservées telles quelles").toBe("Christelle C.");
  expect(doc.date).toBe("2026-09-27");
  expect(doc.modifiePar).toBe("Christelle Z.");

  await page.reload();
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Esther C.");
  await expect(laCase(page, "2026-09-27", "guitare")).toContainText("Christelle C.");
  await expect(laCase(page, "2026-09-20", "piano"), "les autres dimanches viennent encore du Sheet").toContainText("Ruth K.");
});

test("un nom sans compte s'écrit ; l'autocomplétion propose la grille et les comptes ; Échap annule", async ({ page }) => {
  await open(page, CHRISTELLE, "/planning/culte", { [`users/uid-esther`]: ESTHER });
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-27", "orateur").getByRole("button").click();
  // <option value="…"> n'a pas de texte : c'est la valeur qui est proposée.
  const propose = (nom: string) => page.locator(`datalist#noms-culte option[value="${nom}"]`);
  await expect(propose("Ruth K."), "un nom déjà dans la grille").toHaveCount(1);
  await expect(propose("Esther C."), "le nom de planning d'un compte").toHaveCount(1);
  const champ = champDe(page, "2026-09-27", "orateur", "Orateur");
  await champ.fill("Pasteur ZHOU");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-27", "orateur")).toContainText("Pasteur ZHOU");

  await laCase(page, "2026-09-27", "sono").getByRole("button").click();
  const autre = champDe(page, "2026-09-27", "sono", "Sono");
  await autre.fill("Quelqu'un d'autre");
  await autre.press("Escape");
  await expect(laCase(page, "2026-09-27", "sono")).toContainText("Lorenzo S.");
  await expect(page.getByText("Quelqu'un d'autre")).toHaveCount(0);
});

test("droit retiré en cours de route : la case revient, le message et « Recharger » s'affichent", async ({ page }) => {
  await open(page, CHRISTELLE, "/planning/culte");
  await page.route(/firestore\.googleapis\.com.*dimanches/, (route) =>
    route.request().method() === "PATCH"
      ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { message: "PERMISSION_DENIED" } }) })
      : route.fallback()
  );
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-27", "piano").getByRole("button").click();
  const champ = champDe(page, "2026-09-27", "piano", "Piano");
  await champ.fill("Esther C.");
  await champ.press("Enter");
  await expect(page.getByText("Tu n'as plus le droit de modifier ce planning.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recharger" })).toBeVisible();
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Eva C.");
});

test("l'historique nomme l'auteur, la case et le dimanche", async ({ page }) => {
  await open(page, CHRISTELLE, "/planning/culte");
  await page.getByRole("button", { name: "Modifier" }).click();
  await laCase(page, "2026-09-27", "piano").getByRole("button").click();
  const champ = champDe(page, "2026-09-27", "piano", "Piano");
  await champ.fill("Esther C.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-27", "piano")).toContainText("Esther C.");

  await page.getByRole("button", { name: "Historique des modifications" }).click();
  await expect(page.getByText("Christelle Z. a remplacé Eva C. par Esther C. au Piano du 27 septembre")).toBeVisible();

  // Une case vide remplie, puis effacée : les deux autres phrases.
  await laCase(page, "2026-09-27", "sainteCene").getByRole("button").click();
  await champDe(page, "2026-09-27", "sainteCene", "Sainte cène").fill("Ruth K.");
  await champDe(page, "2026-09-27", "sainteCene", "Sainte cène").press("Enter");
  await expect(page.getByText("Christelle Z. a mis Ruth K. au Sainte cène du 27 septembre")).toBeVisible();
  await laCase(page, "2026-09-27", "orateur").getByRole("button").click();
  await champDe(page, "2026-09-27", "orateur", "Orateur").fill("");
  await champDe(page, "2026-09-27", "orateur", "Orateur").press("Enter");
  await expect(page.getByText("Christelle Z. a effacé le Orateur du 27 septembre")).toBeVisible();
});

test("en 中文 : colonnes, horaire et pied de grille traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, PUBLIEUR, "/planning/culte");
  await expect(page.getByTestId("grille-bandeau")).toContainText("主日 10:30");
  // Ordinateur et tablette : l'en-tête de colonne ; téléphone : le libellé de la carte.
  await expect(page.getByText("钢琴").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("某个主日无法服事？请联系负责排表的同工。")).toBeVisible();
});

test("le pied de grille rappelle qu'on prévient la personne qui tient le planning", async ({ page }) => {
  await open(page, MEMBRE, "/planning/culte");
  await expect(page.getByText("Pas disponible un dimanche ? Préviens la personne qui tient le planning.")).toBeVisible();
});
