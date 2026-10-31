import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { lirePdf } from "./helpers/pdf";
import { repondreDansLeSite } from "./helpers/agencement";
import { nomsAAjouter } from "../src/components/planning/PetitDejCase";

// Lot 17, tranche G6 « Table » (Timothée, 19/09/2026 : « pouvoir modifier tous
// les plannings sur le site ») : la Prépa. Table du Seigneur et le petit déj
// deviennent une grille remplie dans l'app, deux cases par dimanche.
// Lot U3, PD1 (docs/spec-petit-dej.md, T8 et T9) : la case Petit déj affiche les
// inscriptions (`petitDej/{id}`), seule source ; le petit déj du Sheet ne parle plus.
// PD2 (Q12) : jamais recopiée par `semer`. 30/10/2026 (Timothée) : l'App n'inscrit plus les
// autres ; au Back-Office la case Petit déj se modifie (lignes à part, `casesAPart`), plusieurs
// noms à la fois.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

/** Onglet Franco_Table_PtD : deux paires DATE / équipe côte à côte (colonnes 1–5
 *  et 7–11), et le bloc « PETIT DÉJEUNER » (colonnes 17–18 et 19–20). */
function ligne(cells: Record<number, string>): string[] {
  const r = Array<string>(21).fill("");
  for (const [i, v] of Object.entries(cells)) r[Number(i)] = v;
  return r;
}
const TABLE = csv([
  ligne({ 1: "DATE", 2: "Équipe", 7: "DATE", 8: "Équipe", 17: "DATE", 18: "NOM" }),
  ligne({ 1: "20/09", 2: "Charlie", 3: "Isabelle", 7: "27/09", 8: "Lydie", 9: "Samuel", 17: "27/09", 18: "Charlie & Isabelle" }),
  ligne({ 1: "04/10", 2: "Wendy", 7: "11/10", 8: "Olivier" }),
]);

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Inès L." };
const RESPONSABLE: FakeProfile = {
  uid: "uid-resp", email: "resp@example.com", firstName: "Christelle", lastName: "Zhang", planningName: "Christelle Z.",
  responsabilites: ["planning:table"], // lot RS : gestionnaire de la Table (l'ancien remplit("table") passait par Orga, qui ne remplit plus la Table)
};

/** Deux inscriptions au petit déj du 27/09, la plus récente d'abord dans la base. */
const PETIT_DEJ = {
  "petitDej/b": {
    dimanche: "2026-09-27", nom: "Les jeunes du Campus", uid: "", auteurUid: "uid-resp",
    creeLe: "2026-09-10T08:00:00.000Z", modifieLe: "2026-09-10T08:00:00.000Z",
  },
  "petitDej/a": {
    dimanche: "2026-09-27", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre",
    creeLe: "2026-09-09T08:00:00.000Z", modifieLe: "2026-09-09T08:00:00.000Z",
  },
};

/** Ouvre `to` le vendredi 18/09/2026 : dimanche courant = 20/09, trimestre T3. */
async function open(page: Page, who: FakeProfile, to: string, docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Table_PtD" ? TABLE : "" });
  });
  return signInAs(page, who, docs, to);
}

const laCase = (page: Page, date: string, colonne: string) =>
  page.locator(`[data-case="${date}|${colonne}"]`).filter({ visible: true });

// Lot U6, B2 (Q14) : la grille Table est au Back-Office ; l'App montre les cartes.
test("la grille Table : l'équipe lue dans le Sheet, le petit déj dans les inscriptions", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  await expect(page.locator("header[data-entete-page]"), "le sous-titre de l'en-tête (agencement v18)").toContainText("Prépa. Table du Seigneur");
  await expect(laCase(page, "2026-09-20", "equipe")).toContainText("Charlie, Isabelle");
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Lydie, Samuel");
  await expect(laCase(page, "2026-09-27", "petitDej"), "les lignes, dans l'ordre d'inscription").toContainText(
    /Famille Martin\s*Les jeunes du Campus/,
  );
  await expect(laCase(page, "2026-09-27", "petitDej"), "le nom du Sheet ne parle plus (T8)").not.toContainText("Charlie");
});

test("avec le droit « table » : une case s'écrit et tient au rechargement ; la case Petit déj n'est pas recopiée", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  await laCase(page, "2026-09-27", "equipe").getByRole("button").click();
  // Lot U2 (relecture) : une case qui porte déjà deux noms s'ouvre en texte,
  // prérempli — « Choisir » remplacerait les deux.
  const champ = page.getByRole("textbox", { name: "Équipe", exact: true });
  await expect(champ).toHaveValue("Lydie, Samuel");
  await champ.fill("Ruth K.");
  await champ.press("Enter");
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Ruth K.");
  await expect(page.getByText("Enregistré")).toBeVisible();

  const doc = db.doc("plannings/table/dimanches/2026-09-27")!;
  expect(doc.equipe).toBe("Ruth K.");
  expect(doc, "la case Petit déj (les inscriptions) n'est jamais recopiée par `semer` (Q12)").not.toHaveProperty("petitDej");
  expect(doc.date).toBe("2026-09-27");

  await page.reload();
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Ruth K.");
  await expect(laCase(page, "2026-09-20", "equipe"), "les autres dimanches viennent encore du Sheet").toContainText("Charlie, Isabelle");

  // « Ce dimanche » lit la grille : le 20/09 est le dimanche courant, on écrit dessus.
  db.set("plannings/table/dimanches/2026-09-20", { date: "2026-09-20", equipe: "Esther C.", petitDej: "" });
  await page.goto("/planning");
  await expect(page.getByText("Esther C.")).toBeVisible();
});

/** Les écritures `petitDej/…` d'une méthode. */
const ecritures = (db: Awaited<ReturnType<typeof open>>, method: string) =>
  db.writes.filter((w) => w.method === method && w.path.startsWith("petitDej/"));
const LIGNE_13 = {
  "petitDej/p": {
    dimanche: "2026-09-13", nom: "Famille Passée", uid: "", auteurUid: "uid-resp",
    creeLe: "2026-09-01T08:00:00.000Z", modifieLe: "2026-09-01T08:00:00.000Z",
  },
};

test("nomsAAjouter : virgules et retours à la ligne, vides, doublons, 80 caractères", () => {
  expect(nomsAAjouter("Léo Aubry, Maya Bellot\nNoé Cassin", [])).toEqual(["Léo Aubry", "Maya Bellot", "Noé Cassin"]);
  expect(nomsAAjouter(" , ,\n  ,", []), "tout est vide").toEqual([]);
  expect(nomsAAjouter("Léo, léo ,LÉO", []), "doublons entre eux, sans casse").toEqual(["Léo"]);
  expect(nomsAAjouter("Famille Martin, Zoé", [" famille martin "]), "contre l'existant, sans casse ni espaces de bord").toEqual(["Zoé"]);
  expect(nomsAAjouter("x".repeat(100), [])[0]).toHaveLength(80);
});

test("en modification, la case Petit déj : chaque ligne est un nom à réécrire avec son ✕, puis un « + » ; vide, le « + » seul", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const le27 = laCase(page, "2026-09-27", "petitDej");
  await expect(le27.getByRole("button", { name: "Famille Martin", exact: true })).toBeVisible();
  await expect(le27.getByRole("button", { name: "Retirer Famille Martin" })).toBeVisible();
  await expect(le27.getByRole("button", { name: "Retirer Les jeunes du Campus" })).toBeVisible();
  await expect(le27.getByRole("button", { name: "Ajouter au petit déj" })).toBeVisible();
  await expect(laCase(page, "2026-09-27", "equipe").getByRole("button"), "l'équipe reste une case à remplir").toHaveCount(1);
  const le20 = laCase(page, "2026-09-20", "petitDej");
  await expect(le20.getByRole("button")).toHaveCount(1);
  await expect(le20.getByRole("button", { name: "Ajouter au petit déj" })).toBeVisible();
});

test("petit déj : plusieurs noms en une fois — virgules, retour à la ligne, vide et doublon ignorés, une ligne par nom dans l'ordre", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const laCase27 = laCase(page, "2026-09-27", "petitDej");
  await laCase27.getByRole("button", { name: "Ajouter au petit déj" }).click();
  const champ = laCase27.getByRole("textbox", { name: "Ajouter au petit déj" });
  await expect(champ).toHaveAttribute("placeholder", "Un ou plusieurs noms, séparés par des virgules");
  await champ.fill("Léo Aubry, Maya Bellot, , famille martin");
  await champ.press("Shift+Enter");
  await expect(champ, "Maj+Entrée : un retour à la ligne, rien d'écrit").toHaveValue(/\n$/);
  expect(ecritures(db, "POST")).toHaveLength(0);
  await champ.pressSequentially("Noé Cassin");
  await champ.press("Enter");
  await expect(laCase27.getByRole("button", { name: "Noé Cassin", exact: true })).toBeVisible();
  const posees = ecritures(db, "POST");
  expect(posees.map((w) => w.data.nom), "dans l'ordre tapé, sans le vide ni le doublon").toEqual(["Léo Aubry", "Maya Bellot", "Noé Cassin"]);
  for (const w of posees) expect(w.data).toMatchObject({ dimanche: "2026-09-27", uid: "", auteurUid: RESPONSABLE.uid });
  await expect(laCase27.getByRole("button", { name: "Léo Aubry", exact: true })).toBeVisible();
  await expect(laCase27.getByRole("button", { name: "Maya Bellot", exact: true })).toBeVisible();
});

test("petit déj : Échap n'écrit rien ; la sortie du champ valide ; une saisie toute ignorée n'écrit rien", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const le20 = laCase(page, "2026-09-20", "petitDej");
  await le20.getByRole("button", { name: "Ajouter au petit déj" }).click();
  await le20.getByRole("textbox").fill("Léo Aubry");
  await le20.getByRole("textbox").press("Escape");
  await expect(le20.getByRole("textbox")).toHaveCount(0);
  await expect(le20.getByRole("button", { name: "Ajouter au petit déj" })).toBeVisible();
  expect(ecritures(db, "POST")).toHaveLength(0);

  await le20.getByRole("button", { name: "Ajouter au petit déj" }).click();
  await le20.getByRole("textbox").fill(" , ,");
  await le20.getByRole("textbox").press("Enter");
  await expect(le20.getByRole("textbox")).toHaveCount(0);
  expect(ecritures(db, "POST")).toHaveLength(0);

  await le20.getByRole("button", { name: "Ajouter au petit déj" }).click();
  await le20.getByRole("textbox").fill("Léo Aubry");
  await laCase(page, "2026-09-27", "equipe").getByRole("button").click(); // le focus quitte le champ
  await expect(le20.getByRole("button", { name: "Léo Aubry", exact: true })).toBeVisible();
  expect(ecritures(db, "POST").map((w) => w.data.nom)).toEqual(["Léo Aubry"]);
});

test("petit déj : renommer une ligne ; Échap annule, un texte vide est refusé", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const le27 = laCase(page, "2026-09-27", "petitDej");
  await le27.getByRole("button", { name: "Famille Martin", exact: true }).click();
  const champ = le27.getByRole("textbox", { name: "Modifier" });
  await expect(champ, "prérempli").toHaveValue("Famille Martin");
  await champ.fill("Famille Martin-Roux");
  await champ.press("Escape");
  await expect(le27.getByRole("button", { name: "Famille Martin", exact: true })).toBeVisible();
  await le27.getByRole("button", { name: "Famille Martin", exact: true }).click();
  await le27.getByRole("textbox", { name: "Modifier" }).fill("   ");
  await le27.getByRole("textbox", { name: "Modifier" }).press("Enter");
  await expect(le27.getByRole("button", { name: "Famille Martin", exact: true })).toBeVisible();
  expect(ecritures(db, "PATCH")).toHaveLength(0);

  await le27.getByRole("button", { name: "Famille Martin", exact: true }).click();
  await le27.getByRole("textbox", { name: "Modifier" }).fill("Famille Martin-Roux");
  await le27.getByRole("textbox", { name: "Modifier" }).press("Enter");
  await expect(le27.getByRole("button", { name: "Famille Martin-Roux", exact: true })).toBeVisible();
  expect(ecritures(db, "PATCH")).toHaveLength(1);
  expect(db.doc("petitDej/a")!.nom).toBe("Famille Martin-Roux");
});

test("petit déj : « Retirer {nom} » demande confirmation ; Annuler garde la ligne", async ({ page }) => {
  const db = await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const le27 = laCase(page, "2026-09-27", "petitDej");
  await le27.getByRole("button", { name: "Retirer Famille Martin" }).click();
  await repondreDansLeSite(page, "Annuler");
  await expect(le27.getByRole("button", { name: "Famille Martin", exact: true })).toBeVisible();
  expect(db.doc("petitDej/a")).toBeDefined();
  await le27.getByRole("button", { name: "Retirer Famille Martin" }).click();
  await repondreDansLeSite(page, "Retirer");
  await expect(le27.getByRole("button", { name: "Famille Martin", exact: true })).toHaveCount(0);
  expect(db.doc("petitDej/a")).toBeUndefined();
  expect(db.doc("petitDej/b"), "l'autre ligne reste").toBeDefined();
});

test("petit déj : case sélectionnée, Entrée sur ✕ ou « + » garde son action (pas le renommage de la première ligne)", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const le27 = laCase(page, "2026-09-27", "petitDej");
  await le27.getByRole("button", { name: "Famille Martin", exact: true }).click(); // sélectionne la case et ouvre le renommage
  await le27.getByRole("textbox", { name: "Modifier" }).press("Escape");
  await expect(le27.getByRole("textbox")).toHaveCount(0);

  await le27.getByRole("button", { name: "Retirer Les jeunes du Campus" }).focus();
  await page.keyboard.press("Enter");
  await repondreDansLeSite(page, "Annuler");
  await expect(le27.getByRole("textbox"), "pas de renommage de la première ligne").toHaveCount(0);

  await le27.getByRole("button", { name: "Ajouter au petit déj" }).focus();
  await page.keyboard.press("Enter");
  await expect(le27.getByRole("textbox", { name: "Ajouter au petit déj" })).toBeVisible();
  await expect(le27.getByRole("textbox", { name: "Modifier" })).toHaveCount(0);
});

test("petit déj : un dimanche passé n'a aucun bouton, il garde son texte", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", { ...PETIT_DEJ, ...LIGNE_13 });
  const le13 = laCase(page, "2026-09-13", "petitDej");
  await expect(le13).toContainText("Famille Passée");
  await expect(le13.getByRole("button")).toHaveCount(0);
});

test("petit déj : inscriptions illisibles — la case reste du texte, sans bouton", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  await page.route(/firestore\.googleapis\.com.*:runQuery/, (route) =>
    (route.request().postData() ?? "").includes('"petitDej"')
      ? route.fulfill({ status: 503, contentType: "application/json", body: "{}" })
      : route.fallback(),
  );
  await page.reload();
  await expect(laCase(page, "2026-09-27", "equipe")).toContainText("Lydie, Samuel");
  await expect(laCase(page, "2026-09-27", "petitDej").getByRole("button")).toHaveCount(0);
  await expect(laCase(page, "2026-09-20", "petitDej").getByRole("button")).toHaveCount(0);
});

test("petit déj : un refus 403 dit les droits sous la case, une autre erreur son message", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  let statut = 403;
  await page.route(/firestore\.googleapis\.com.*\/documents\/petitDej(\?|$)/, (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: statut, contentType: "application/json", body: JSON.stringify({ error: { code: statut, message: "refus simulé" } }) })
      : route.fallback(),
  );
  const le20 = laCase(page, "2026-09-20", "petitDej");
  await le20.getByRole("button", { name: "Ajouter au petit déj" }).click();
  await le20.getByRole("textbox").fill("Léo Aubry");
  await le20.getByRole("textbox").press("Enter");
  const message = le20.getByRole("status");
  await expect(message).toContainText("tu n’as plus le droit de modifier ce planning");
  await expect(le20.getByRole("button", { name: "Léo Aubry", exact: true })).toHaveCount(0);

  statut = 500;
  await le20.getByRole("button", { name: "Ajouter au petit déj" }).click();
  await le20.getByRole("textbox").fill("Léo Aubry");
  await le20.getByRole("textbox").press("Enter");
  await expect(le20.getByRole("status")).toHaveText("Enregistrement impossible, réessaie.");
});

test("petit déj en 中文 : les libellés de la case sont traduits", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  const le27 = laCase(page, "2026-09-27", "petitDej");
  await expect(le27.getByRole("button", { name: "移除Famille Martin" })).toBeVisible();
  await le27.getByRole("button", { name: "添加早餐人员" }).click();
  await expect(le27.getByRole("textbox", { name: "添加早餐人员" })).toHaveAttribute("placeholder", "一个或多个名字，用逗号分隔");
});

test("petit déj : un compte qui ne gère pas la Table n'ouvre pas la grille — aucune case, aucun bouton", async ({ page }) => {
  // Écrivain d'un autre planning : il ouvre le Back-Office, pas le droit « table ».
  const AUTRE_PLANNING: FakeProfile = { uid: "uid-culte", email: "culte@example.com", planningName: "Gaëlle P.", responsabilites: ["planning:culte"] };
  await open(page, AUTRE_PLANNING, "/back-office/planning/table", PETIT_DEJ);
  await expect(page.getByText("Page réservée aux responsables de ce planning.")).toBeVisible();
  await expect(page.locator('[data-case$="|petitDej"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter au petit déj" })).toHaveCount(0);
});

// Fusion U2 × U3 : « Choisir » (U2, P9) propose les noms déjà écrits dans les
// cases de personnes ; les lignes du petit déj (« Famille … ») n'en sont pas (Q12).
test("« Choisir » une équipe ne propose pas les lignes du petit déj", async ({ page }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", {
    "petitDej/c": {
      dimanche: "2026-10-04", nom: "Famille Martin", uid: "uid-autre", auteurUid: "uid-autre",
      creeLe: "2026-09-09T08:00:00.000Z", modifieLe: "2026-09-09T08:00:00.000Z",
    },
  });
  await page.getByRole("tab", { name: "T4", exact: true }).click();
  await expect(laCase(page, "2026-10-04", "petitDej")).toContainText("Famille Martin");
  await laCase(page, "2026-10-04", "equipe").getByRole("button").click();
  const menu = page.getByRole("dialog", { name: /Équipe/ });
  await expect(menu.getByRole("option", { name: /Olivier/ }), "les noms des cases d'équipe").toBeVisible();
  await expect(menu.getByText("Famille Martin")).toHaveCount(0);
});

// Lot U2, P7 : « Exporter (modèle du Sheet) » remplace le CSV du lot 17 (question 6).
// Lot U3 (Q12) : la colonne Petit déj s'exporte telle que la case l'affiche, lue dans les inscriptions.
test("« Exporter (modèle du Sheet) » : le trimestre affiché, Date · Équipe · Petit déj ; pas pour un membre", async ({ page, browser }) => {
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  await page.getByRole("button", { name: "Exporter (modèle du Sheet)" }).click();
  const fenetre = page.getByRole("dialog", { name: "Exporter" });
  await fenetre.getByRole("radio", { name: "T3 2026 · Prépa. Table" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    fenetre.getByRole("button", { name: "PDF", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Franco_Table_PtD_T3_2026.pdf");
  await download.saveAs(test.info().outputPath(download.suggestedFilename())); // à ouvrir à l'œil
  const lignes = lirePdf(readFileSync(await download.path())).pages[0].lignes;
  for (const attendu of ["PRÉPARATION TABLE DÉJEUNER", "DÉJEUNER PRÉPARATION T3 2026", "DATE", "Équipe", "Petit déj", "Septembre"]) {
    expect(lignes, attendu).toContain(attendu);
  }
  const i = lignes.indexOf("27/09");
  expect(lignes.slice(i, i + 2)).toEqual(["27/09", "Lydie, Samuel"]);
  // La case Petit déj revient à la ligne dans sa colonne : on la relit en entier.
  expect(lignes.slice(i + 2, i + 4).join(""), "le petit déj des inscriptions, pas du Sheet").toBe("Famille Martin, Les jeunes du Campus");

  const autre = await browser.newPage();
  await open(autre, MEMBRE, "/planning/table");
  await expect(autre.getByRole("region", { name: "Prépa. Table du Seigneur" })).toBeVisible();
  await expect(autre.getByRole("button", { name: /Exporter/ })).toHaveCount(0);
  await autre.close();
});

test("en 中文 : les deux colonnes sont traduites", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  // Sur téléphone, une case vide ne montre pas son libellé : il faut une inscription.
  await open(page, RESPONSABLE, "/back-office/planning/table", PETIT_DEJ);
  await expect(page.getByText("团队").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("早餐").filter({ visible: true }).first()).toBeVisible();
});
