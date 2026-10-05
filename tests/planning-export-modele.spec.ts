import { expect, test, type Page } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { lirePdf } from "./helpers/pdf";
import { MODELES, modeleDe, nomFichierExport, pagesExport, porteesExport, type PageExport } from "../src/lib/planning/modeles";
import { dimanchesDe } from "../src/lib/planning/grilles";

// Lot U2, tranches P6 (modèles) et P7 (PDF) — docs/spec-planning-2027.md :
// tout planning s'exporte au modèle de son onglet du Google Sheet (une page
// = un onglet ou un trimestre de l'onglet), logo sous le nom de l'église, pas
// de bas de page. Noms fictifs seulement.

// ─── P6 · Modèles (pur) ─────────────────────────────────────────────────────

/** Les lignes vues, au format des lecteurs (date ISO puis les cases à l'index de leur colonne). */
const LIGNES: Record<string, string[][]> = {
  paix: [
    ["2027-01-10", "Invité A.", "Musicien M.", "Orateur O.", "Thème T.", ""],
    ["2027-01-17", "Ancien Z.", "", "Orateur O.", "Offrande", ""],
    ["2027-04-04", "Invité A.", "", "", "", "Batteur B."],
    ["2026-03-29", "Ancien Y.", "", "", "", ""],
  ],
  fidelite: [["2027-01-10", "测试", "Orateur O.", "", "Pianiste P."]],
  fideliteMusiciens: [
    ["2027-01-10", "Membre M.", "Piano P.", "", ""],
    ["2027-01-17", "", "", "", ""],
  ],
  interfranco: [["2027-01-17", "Président I.", "", "", "", "", "", "", "", "", ""]],
  intergroupe: [["2027-03-14", "Président J.", "", "", "", "", "", "", "", "", "", ""]],
  culte: [["2027-01-03", "Président C.", "Choriste A.", "Choriste B.", "", "", "", "", "", "", "", "Sainte C."]],
  eddZhongban: [["2027-01-03", "Moniteur Z.", "", "", "", "", "Cours A."]],
  campusMatin: [["2027-07-27", "Président M.", "", "", "", "", "", "", "", "Chant A.", "", "", "", "20/07/2027 19:00 Grande salle"]],
  campusSoir: [
    ["2027-07-26", "Président S.", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["2027-07-30", "Président T.", "", "", "", "", "", "", "", "", "", "", "", ""],
  ],
  table: [["2027-02-07", "Équipe E.", "Petit D."]],
};

const page = (portee: "affiche" | "annee" | "tout", key: string, rang = 1, annee = 2027) =>
  pagesExport({ portee, annee, key, rang, lignes: LIGNES });

const textes = (p: PageExport) => p.blocs.flatMap((b) => b.lignes.map((l) => l.cellules));

test("P6 · « Tous les plannings » : une feuille par onglet, dans l'ordre et sous les noms du Sheet", () => {
  const pages = page("tout", "paix");
  const feuilles = [...new Set(pages.map((p) => p.feuille))];
  expect(feuilles).toEqual([
    "Franco_Louange", "Franco_Table_PtD", "Intergroupe", "Interfranco", "EDD", "Campus_Louange",
    "Paix_T1", "Paix_T2", "Paix_T3", "Paix_T4",
    "Fidélité_T1", "Fidélité_T2", "Fidélité_T3", "Fidélité_T4",
    "Fidélité_Musicien",
    "Bonté_T1", "Bonté_T2", "Bonté_T3", "Bonté_T4",
  ]);
  // Culte, Table et Fidélité musiciens : 4 pages ; EDD : 6 ; Intergroupe, Interfranco, Campus : 1 ; groupes : 4 × 3.
  expect(pages).toHaveLength(4 + 4 + 1 + 1 + 6 + 1 + 4 + 4 + 4 + 4);
  expect(MODELES.map((m) => m.onglet)).toEqual([
    "Franco_Louange", "Franco_Table_PtD", "Intergroupe", "Interfranco", "EDD", "Campus_Louange",
    "Paix", "Fidélité", "Fidélité_Musicien", "Bonté",
  ]);
});

test("P6 · Paix, T1 2027 : église, titre, période, horaire, libellés du Sheet, une ligne sur deux", () => {
  const [p] = page("affiche", "paix", 1);
  expect(p.feuille).toBe("Paix_T1");
  expect(p.eglise).toBe("Grace Church Christian Chinese de Paris");
  expect(p.titre).toBe("GROUPE PAIX");
  expect(p.periode).toBe("Planning de Janvier à Mars 2027");
  expect(p.horaire).toBe("Dimanche de 13:00 à 14:30");
  expect(p.colonnes.map((c) => c.entete)).toEqual(["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME"]);
  expect(p.blocs).toHaveLength(1);
  const lignes = p.blocs[0].lignes;
  expect(lignes).toHaveLength(13);
  expect(lignes.map((l) => l.alterne).slice(0, 4), "dès la première").toEqual([true, false, true, false]);
  expect(lignes[0].cellules).toEqual(["03/01", "", "", "", ""]);
  expect(lignes[1].cellules).toEqual(["10/01", "Invité A.", "Musicien M.", "Orateur O.", "Thème T."]);
  // P4 : la présidence d'un dimanche d'Interfranco ou d'Intergroupe porte le nom du service.
  expect(lignes[2].cellules).toEqual(["17/01", "Interfranco", "", "Orateur O.", "Offrande"]);
  expect(lignes[10].cellules[1]).toBe("Intergroupe");
  expect(JSON.stringify(p)).not.toContain("Ancien Z.");
  expect(JSON.stringify(p), "rien de 2026").not.toContain("Ancien Y.");
  expect(p.modele.couleurs.alterne).toBe("#EAF2FB");
  expect(p.modele.policeTableau).toBe("Calibri");
  expect(p.modele.orientation).toBe("portrait");
});

test("P6 · Percussion : seulement au trimestre qui la porte", () => {
  const pages = page("annee", "paix");
  expect(pages.map((p) => p.feuille)).toEqual(["Paix_T1", "Paix_T2", "Paix_T3", "Paix_T4"]);
  expect(pages.map((p) => p.periode)).toEqual([
    "Planning de Janvier à Mars 2027", "Planning d'Avril à Juin 2027",
    "Planning de Juillet à Septembre 2027", "Planning d'Octobre à Décembre 2027",
  ]);
  expect(pages[0].colonnes.map((c) => c.entete)).not.toContain("PERCUSSION");
  expect(pages[1].colonnes.map((c) => c.entete)).toEqual(["DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME", "PERCUSSION"]);
  expect(textes(pages[1])[0]).toEqual(["04/04", "Invité A.", "", "", "", "Batteur B."]);
});

test("P6 · Paix, Bonté et Fidélité au même modèle ; Fidélité : église en chinois, son horaire", () => {
  const paix = modeleDe("paix")!;
  for (const key of ["bonte", "fidelite"]) {
    const m = modeleDe(key)!;
    for (const champ of ["policeTableau", "taille", "alignement", "couleurs", "mois", "dateGras", "formatDate", "orientation"] as const) {
      expect(m[champ], `${key}.${champ}`).toEqual(paix[champ]);
    }
  }
  expect(modeleDe("bonte")!.eglise).toBe("fr");
  const [fid] = page("affiche", "fidelite", 1);
  expect(fid.feuille).toBe("Fidélité_T1");
  expect(fid.eglise).toBe("基督教会巴黎华人恩典堂");
  expect(fid.titre).toBe("GROUPE FIDÉLITÉ");
  expect(fid.periode).toBe("Planning de Janvier à Mars 2027");
  expect(fid.horaire).toBe("Dimanche de 13:00 à 14:00");
  expect(fid.colonnes.map((c) => c.entete)).toEqual(["DATE", "PRÉSIDENCE", "ORATEUR", "THÈME", "PIANISTE"]);
  expect(fid.blocs, "ni ligne vide ni titre entre les mois").toHaveLength(1);
  expect(textes(fid)[1]).toEqual(["10/01", "测试", "Orateur O.", "", "Pianiste P."]);
  const [bonte] = page("affiche", "bonte", 3);
  expect([bonte.feuille, bonte.titre, bonte.horaire]).toEqual(["Bonté_T3", "GROUPE BONTÉ", "Dimanche de 13:00 à 14:30"]);
});

test("P6 · Culte : bandeau du trimestre, une ligne par mois, Choristes sur deux colonnes, Sainte cène toujours là", () => {
  const [p] = page("affiche", "culte", 1);
  expect(p.feuille).toBe("Franco_Louange");
  expect([p.titre, p.periode, p.horaire, p.bandeau]).toEqual(["CULTE FRANCO", "Janvier à Mars 2027", "Dimanche 10:30", "TRIMESTRE 1"]);
  expect(p.colonnes.map((c) => c.entete)).toEqual([
    "DATE", "Présidence", "Choristes", "Choristes", "Pianiste", "Guitariste", "Cajon/Batterie", "Sono + Live", "PPT",
    "Orateur", "Traducteur", "Sainte cène",
  ]);
  expect(p.blocs.map((b) => b.titre)).toEqual(["Janvier", "Février", "Mars"]);
  expect(p.blocs.map((b) => b.lignes.length)).toEqual([5, 4, 4]);
  expect(textes(p)[0]).toEqual(["03/01", "Président C.", "Choriste A.", "Choriste B.", "", "", "", "", "", "", "", "Sainte C."]);
  expect(p.modele.orientation).toBe("paysage");
  expect(page("annee", "culte").map((x) => x.bandeau)).toEqual(["TRIMESTRE 1", "TRIMESTRE 2", "TRIMESTRE 3", "TRIMESTRE 4"]);
});

test("P6 · Table : Date · Équipe · Petit déj, une ligne par mois", () => {
  const [p] = page("affiche", "table", 1);
  expect([p.feuille, p.titre, p.periode, p.horaire]).toEqual(["Franco_Table_PtD", "PRÉPARATION TABLE DÉJEUNER", "DÉJEUNER PRÉPARATION T1 2027", undefined]);
  expect(p.colonnes.map((c) => c.entete)).toEqual(["DATE", "Équipe", "Petit déj"]);
  expect(p.blocs.map((b) => b.titre)).toEqual(["Janvier", "Février", "Mars"]);
  expect(p.blocs[1].lignes[0].cellules).toEqual(["07/02", "Équipe E.", "Petit D."]);
});

test("P6 · EDD : une page par période de deux mois, les trois classes l'une sous l'autre", () => {
  const pages = page("annee", "eddDaban");
  expect(pages).toHaveLength(6);
  expect(pages.every((p) => p.feuille === "EDD")).toBe(true);
  expect(pages[0].titre).toBe("EDD — Planning par classe (bimensuel) — 2027");
  expect(pages.map((p) => p.periode)).toEqual([
    "PÉRIODE 1 — JANVIER FÉVRIER", "PÉRIODE 2 — MARS AVRIL", "PÉRIODE 3 — MAI JUIN",
    "PÉRIODE 4 — JUILLET AOÛT", "PÉRIODE 5 — SEPTEMBRE OCTOBRE", "PÉRIODE 6 — NOVEMBRE DÉCEMBRE",
  ]);
  expect(pages.map((p) => p.blocs[0].lignes.length)).toEqual([9, 8, 9, 9, 9, 8]);
  const p1 = pages[0];
  expect(p1.blocs.map((b) => b.fusion)).toEqual(["中班", "大班", "高班"]);
  expect(p1.colonnes.map((c) => c.entete)).toEqual(["DATE", "PRESIDENCE", "SUPPLÉANT", "PIANO", "CAJON", "GUITARE", "COURS"]);
  expect(p1.blocs[0].lignes[0].cellules).toEqual(["03/01/2027", "Moniteur Z.", "", "", "", "", "Cours A."]);
  expect(p1.horaire).toBeUndefined();
  expect(page("affiche", "eddGaoban", 2).map((p) => p.periode)).toEqual(["PÉRIODE 2 — MARS AVRIL"]);
});

test("P6 · Campus : une page, les séances dans l'ordre des dates, matin et soir mêlés", () => {
  const pages = page("annee", "campusSoir");
  expect(pages).toHaveLength(1);
  const [p] = pages;
  expect([p.feuille, p.titre, p.periode, p.horaire]).toEqual(["Campus_Louange", "CAMPUS 2027", "26 — 30 Juillet 2027", undefined]);
  expect(p.colonnes.map((c) => c.entete).slice(0, 3)).toEqual(["DATE SEANCE", "MOMENT", "PRESIDENT"]);
  expect(p.colonnes.map((c) => c.entete).at(-1)).toBe("DATE RÉPÉTITION");
  expect(textes(p).map((c) => `${c[0]} ${c[1]} ${c[2]}`)).toEqual([
    "26/07/2027 Soir Président S.", "27/07/2027 Matin Président M.", "30/07/2027 Soir Président T.",
  ]);
  expect(textes(p)[1].at(-1)).toBe("20/07/2027 19:00 Grande salle");
  expect(p.modele.alignement).toBe("gauche");
});

test("P6 · Fidélité musiciens : le mois en colonne, un dimanche spécial sur toute la ligne", () => {
  const [p] = page("affiche", "fideliteMusiciens", 1);
  expect(p.feuille).toBe("Fidélité_Musicien");
  expect(p.eglise).toBe("基督教会巴黎华人恩典堂");
  expect(p.titre).toBe("Groupe Fidélité Planning Musiciens 2027");
  expect(p.periode).toBe("Groupe Fidélité Planning 2027 - T1 (Janvier - Mars)");
  expect(p.horaire).toBeUndefined();
  expect(p.colonnes.map((c) => c.entete)).toEqual(["Date", "Présidence", "Piano", "Guitare", "Percussion"]);
  expect(p.blocs.map((b) => b.fusion)).toEqual(["Janvier", "Février", "Mars"]);
  const janvier = p.blocs[0].lignes;
  expect(janvier[1].cellules).toEqual(["10/01", "Membre M.", "Piano P.", "", ""]);
  expect(janvier[2].special, "Interfranco le 17/01, sans musicien : la ligne entière").toBe("Interfranco");
  expect(p.modele.policeTableau).toBe("Georgia");
});

test("P6 · Interfranco et Intergroupe : l'année sur une page", () => {
  const [p] = page("affiche", "interfranco");
  expect([p.feuille, p.titre, p.periode]).toEqual(["Interfranco", "INTERFRANCO", "Année 2027"]);
  expect(p.colonnes.filter((c) => c.entete === "Choristes")).toHaveLength(2);
  expect(textes(p)).toEqual([["17/01", "Président I.", "", "", "", "", "", "", "", "", ""]]);
  const [q] = page("affiche", "intergroupe");
  expect(q.colonnes.filter((c) => c.entete === "Choristes")).toHaveLength(3);
});

test("P6 · portées : l'affiché, l'année, tous les plannings (admins) ; noms des fichiers", () => {
  expect(porteesExport("paix", false)).toEqual(["affiche", "annee"]);
  expect(porteesExport("paix", true)).toEqual(["affiche", "annee", "tout"]);
  // Un planning d'une page par an : « ce que la page montre » et « toute l'année » ne font qu'un.
  expect(porteesExport("interfranco", false)).toEqual(["annee"]);
  expect(porteesExport("campusMatin", true)).toEqual(["annee", "tout"]);
  expect(page("affiche", "paix", 2).map((p) => p.feuille)).toEqual(["Paix_T2"]);
  expect(nomFichierExport("affiche", "Groupe Paix", "T1", 2027, "pdf")).toBe("Groupe_Paix_T1_2027.pdf");
  expect(nomFichierExport("annee", "Groupe Paix", "T1", 2027, "pdf")).toBe("Groupe_Paix_2027.pdf");
  expect(nomFichierExport("tout", "Groupe Paix", "T1", 2027, "pdf")).toBe("Plannings_2027.pdf");
});

test("P6 · 2026 : les lignes du Sheet telles quelles, pas de dimanches calculés", () => {
  const [p] = pagesExport({ portee: "affiche", annee: 2026, key: "paix", rang: 1, lignes: LIGNES });
  expect(textes(p)).toEqual([["29/03", "Ancien Y.", "", "", ""]]);
  expect(p.periode).toBe("Planning de Janvier à Mars 2026");
  expect(dimanchesDe(2026)).toHaveLength(52);
});

// ─── P7 · Le menu « Exporter (modèle du Sheet) » et le PDF ──────────────────

const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", planningName: "Membre M." };
const ECRIVAIN: FakeProfile = { uid: "uid-ecrivain", email: "ecrivain@example.com", planningName: "Écrivain E.", plannings: ["paix"] };
const PUBLIEUR: FakeProfile = { uid: "uid-publieur", email: "publieur@example.com", planningName: "Publieur P.", notify: ["Groupe Paix"] };
// Compte de l'église (liste ADMIN_EMAILS de src/lib/access.ts), pas une personne.
const ADMIN: FakeProfile = { uid: "uid-admin", email: "gcccfranco@gmail.com", planningName: "Admin A." };

const DOCS_2027 = {
  "plannings/paix/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Invité A.", orateur: "Orateur O." },
  // Président posé avant que l'Interfranco ne prenne ce dimanche : jamais dans le fichier.
  "plannings/paix/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Ancien Z.", theme: "Offrande" },
  "plannings/interfranco/dimanches/2027-01-17": { date: "2027-01-17", presidence: "Président I." },
  "plannings/intergroupe/dimanches/2027-03-14": { date: "2027-03-14" },
  "plannings/fidelite/dimanches/2027-01-10": { date: "2027-01-10", presidence: "测试" },
  "plannings/bonte/dimanches/2027-01-10": { date: "2027-01-10", presidence: "Brouillon B." },
};

async function ouvrir(page: Page, qui: FakeProfile, vers = "/planning/groupes", docs: Record<string, Record<string, unknown>> = DOCS_2027) {
  await page.clock.setFixedTime(new Date("2026-11-15T10:00:00"));
  // Le Sheet de 2026 ne dit rien de 2027 : réponses vides.
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, vers);
}

const boutonExporter = (page: Page) => page.getByRole("button", { name: "Exporter (modèle du Sheet)" });

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png`, fullPage: true });
}

/** Choisit la portée, clique « PDF », rend le fichier lu (gardé dans test-results/ pour l'œil). */
async function exporterPdf(page: Page, portee: string | RegExp) {
  await boutonExporter(page).click();
  const fenetre = page.getByRole("dialog", { name: "Exporter" });
  await fenetre.getByRole("radio", { name: portee }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    fenetre.getByRole("button", { name: "PDF", exact: true }).click(),
  ]);
  const octets = readFileSync(await download.path());
  writeFileSync(test.info().outputPath(download.suggestedFilename()), octets);
  return { nom: download.suggestedFilename(), octets, pdf: lirePdf(octets) };
}

const A4 = { portrait: [595.28, 841.89], paysage: [841.89, 595.28] };
const estA4 = (p: { largeur: number; hauteur: number }, sens: keyof typeof A4) =>
  Math.abs(p.largeur - A4[sens][0]) < 1 && Math.abs(p.hauteur - A4[sens][1]) < 1;

test("P7 · « Exporter (modèle du Sheet) » : l'écrivain, le publieur, l'admin ; pas un membre", async ({ page, browser }) => {
  await ouvrir(page, ECRIVAIN);
  await page.getByRole("button", { name: "2027", exact: true }).click();
  await boutonExporter(page).click();
  const fenetre = page.getByRole("dialog", { name: "Exporter" });
  await expect(fenetre.getByRole("radio")).toHaveText(["T1 2027 · Groupe Paix", "Toute l'année · Groupe Paix"]);
  await expect(fenetre.getByRole("button", { name: "PDF", exact: true })).toBeVisible();
  await capture(page, "p7-menu-exporter-ecrivain");
  await page.keyboard.press("Escape");
  await expect(fenetre).toHaveCount(0);

  for (const [qui, voit, tout] of [[PUBLIEUR, true, false], [ADMIN, true, true], [MEMBRE, false, false]] as const) {
    const autre = await browser.newPage();
    await ouvrir(autre, qui);
    await expect(autre.getByTestId("grille-bandeau")).toContainText("Paix");
    await expect(boutonExporter(autre), qui.email).toHaveCount(voit ? 1 : 0);
    if (voit) {
      await boutonExporter(autre).click();
      await expect(autre.getByRole("radio", { name: "Tous les plannings 2026" }), qui.email).toHaveCount(tout ? 1 : 0);
    }
    await autre.close();
  }
});

test("P7 · les deux boutons du lot 17 ont disparu (CSV et ancien PDF)", async ({ page }) => {
  await ouvrir(page, ADMIN);
  await expect(page.getByTestId("grille-bandeau")).toContainText("Paix");
  await expect(boutonExporter(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Exporter en CSV" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Exporter en PDF" })).toHaveCount(0);
});

test("P7 · le brouillon d'un planning qu'on ne tient pas n'entre dans aucun fichier", async ({ page }) => {
  await ouvrir(page, ECRIVAIN);
  await page.getByRole("button", { name: "Bonté", exact: true }).click();
  await expect(page.getByTestId("grille-bandeau")).toContainText("Bonté");
  await expect(boutonExporter(page), "Bonté n'est pas à l'écrivain de Paix : pas d'export").toHaveCount(0);
  await page.getByRole("button", { name: "Paix", exact: true }).click();
  await page.getByRole("button", { name: "2027", exact: true }).click();
  const { pdf } = await exporterPdf(page, "Toute l'année · Groupe Paix");
  expect(pdf.pages.map((p) => p.texte).join("\n")).not.toContain("Brouillon B.");
});

test("P7 · PDF « Toute l'année » de Paix 2027 : 4 pages A4, Lora et Carlito, le logo, rien en bas", async ({ page }) => {
  await ouvrir(page, ECRIVAIN);
  await page.getByRole("button", { name: "2027", exact: true }).click();
  const { nom, octets, pdf } = await exporterPdf(page, "Toute l'année · Groupe Paix");
  expect(nom).toBe("Groupe_Paix_2027.pdf");
  expect(octets.subarray(0, 4).toString()).toBe("%PDF");
  expect(pdf.pages).toHaveLength(4);
  for (const p of pdf.pages) expect(estA4(p, "portrait"), `${p.largeur} × ${p.hauteur}`).toBe(true);
  expect(pdf.polices).toEqual(expect.arrayContaining(["Lora-Regular", "Carlito-Regular", "Carlito-Bold"]));
  // Le logo, réduit à 300 px avant d'entrer dans le fichier (Q12).
  expect(pdf.images.length).toBeGreaterThan(0);
  for (const image of pdf.images) expect(image).toEqual({ largeur: 300, hauteur: 300 });

  const [t1, t2] = pdf.pages;
  for (const attendu of [
    "Grace Church Christian Chinese de Paris", "GROUPE PAIX", "Planning de Janvier à Mars 2027", "Dimanche de 13:00 à 14:30",
    "DATE", "PRÉSIDENCE", "MUSICIENS", "ORATEUR", "THÈME", "03/01", "Invité A.", "Orateur O.", "Interfranco", "Offrande", "Intergroupe",
  ]) expect(t1.lignes, attendu).toContain(attendu);
  expect(t1.texte).not.toContain("Ancien Z.");
  expect(t1.lignes.at(-1), "rien sous le tableau : ni date d'export ni numéro de page").toBe("28/03");
  expect(t2.lignes).toContain("Planning d'Avril à Juin 2027");
});

test("P7 · PDF de Fidélité : l'église en chinois (Ma Shan Zheng), une case en chinois (Source Han Sans)", async ({ page }) => {
  await ouvrir(page, { ...ECRIVAIN, plannings: ["fidelite"] });
  await page.getByRole("button", { name: "Fidélité", exact: true }).click();
  await page.getByRole("button", { name: "2027", exact: true }).click();
  const { nom, pdf } = await exporterPdf(page, "T1 2027 · Groupe Fidélité");
  expect(nom).toBe("Groupe_Fidélité_T1_2027.pdf");
  expect(pdf.pages).toHaveLength(1);
  const [t1] = pdf.pages;
  for (const attendu of ["基督教会巴黎华人恩典堂", "GROUPE FIDÉLITÉ", "Planning de Janvier à Mars 2027", "Dimanche de 13:00 à 14:00", "PIANISTE", "测试"]) {
    expect(t1.lignes, attendu).toContain(attendu);
  }
  expect(pdf.polices).toEqual(expect.arrayContaining(["MaShanZheng-Regular", "Lora-Regular", "Carlito-Regular"]));
  expect(pdf.polices.some((p) => p.startsWith("SourceHanSans")), pdf.polices.join(", ")).toBe(true);
});

test("P7 · « Tous les plannings 2027 » (admin) : toutes les pages, dans l'ordre des onglets du Sheet", async ({ page }) => {
  test.setTimeout(240_000);
  await ouvrir(page, ADMIN);
  await page.getByRole("button", { name: "2027", exact: true }).click();
  const { nom, pdf } = await exporterPdf(page, "Tous les plannings 2027");
  expect(nom).toBe("Plannings_2027.pdf");
  expect(pdf.pages).toHaveLength(33);
  const titres = pdf.pages.map((p) => p.lignes[1]); // l’église, puis le titre
  expect(titres[0]).toBe("CULTE FRANCO");
  expect(titres[4]).toBe("PRÉPARATION TABLE DÉJEUNER");
  expect(titres.slice(8, 16)).toEqual(["INTERGROUPE", "INTERFRANCO", ...Array(6).fill("EDD — Planning par classe (bimensuel) — 2027")]);
  expect(titres[16]).toBe("CAMPUS 2027");
  expect(titres.slice(17)).toEqual([
    ...Array(4).fill("GROUPE PAIX"), ...Array(4).fill("GROUPE FIDÉLITÉ"),
    ...Array(4).fill("Groupe Fidélité Planning Musiciens 2027"), ...Array(4).fill("GROUPE BONTÉ"),
  ]);
  expect(estA4(pdf.pages[0], "paysage"), "Culte en paysage").toBe(true);
  expect(estA4(pdf.pages[17], "portrait"), "Paix en portrait").toBe(true);
  expect(pdf.pages.every((p) => estA4(p, "portrait") || estA4(p, "paysage"))).toBe(true);
  expect(pdf.polices).toEqual(expect.arrayContaining(["Gelasio-Regular"]));
});
