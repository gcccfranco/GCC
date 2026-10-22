import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran } from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Lot AO, tranche AO-B (docs/spec-acces-organigramme.md) : les écrans de l'organigramme — la carte TEAM LOUANGE en
// trois sous-équipes, le panneau d'édition (pastilles, droits des référents de sous-équipe, « Ce que ça lui
// ouvre »), la fiche d'une personne, Personnes sans cases de droits, la vue Musiciens. Cinq projets
// (SPECS_GRAND_ECRAN). Base et Sheets simulés, noms fictifs. Captures : PW_CAPTURES=<dossier>.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
/** Référent de la sous-équipe Musiciens, recopié comme le fait le serveur. */
const NOE: FakeProfile = {
  uid: "u-noe", email: "noe@example.com", firstName: "Noé", lastName: "Brandt",
  dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue: ["guitare"],
};
/** Choriste simple : aucun crayon. */
const TOM: FakeProfile = {
  uid: "u-tom", email: "tom@example.com", firstName: "Tom", lastName: "Vidal", dansEquipes: ["louange"], sousEquipes: ["choristes"],
};

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

const LOUANGE: MembreEquipe[] = [
  M("Ludovic Maret", { uid: "u-ludo", referent: true }),
  M("Inès Rovel", { uid: "u-ines", sousEquipes: ["presidence"], referentSous: ["presidence"], lieux: ["Culte Francophone", "Interfranco"] }),
  M("Noé Brandt", { uid: "u-noe", sousEquipes: ["musiciens"], referentSous: ["musiciens"], joue: ["guitare"], lieux: ["Culte Francophone"] }),
  M("Mila Serre", { uid: "u-mila", groupe: "Pianistes", sousEquipes: ["musiciens", "choristes"], joue: ["piano"], lieux: ["Intergroupe"] }),
  M("Adèle Fabre", { uid: "u-adele", sousEquipes: ["musiciens"], joue: ["basse"], lieux: [] }),
  M("Léna Voss", { uid: "u-lena", sousEquipes: ["choristes"], referentSous: ["choristes"], lieux: ["Campus"] }),
  M("Tom Vidal", { uid: "u-tom", sousEquipes: ["choristes"], lieux: [] }),
  M("Arthur Clet", { uid: "u-arthur", lieux: ["Campus"] }),
];
const REGIE: MembreEquipe[] = [
  M("Sacha Berg", { uid: "u-sacha", referent: true, lieux: ["Campus"] }),
  M("Yanis Roux", { uid: "u-yanis", lieux: [] }),
];

const compte = (uid: string, prenom: string, nom: string, over: Record<string, unknown> = {}) => ({
  [`users/${uid}`]: {
    email: `${uid}@example.com`, firstName: prenom, lastName: nom, planningName: "", serviceRoles: {}, annonces: [], notify: [],
    equipes: false, plannings: [], ...over,
  },
});

const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/louange": { membres: LOUANGE, updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
  "equipes/regie": { membres: REGIE, updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
  "equipes/da": { membres: [M("Hugo Pelle", { uid: "u-hugo", referent: true })], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" },
  ...compte("u-noe", "Noé", "Brandt", { dansEquipes: ["louange"], sousEquipes: ["musiciens"], referentSous: ["musiciens"], joue: ["guitare"], lieuxLouange: ["Culte Francophone"] }),
  ...compte("u-adele", "Adèle", "Fabre", { dansEquipes: ["louange"], sousEquipes: ["musiciens"], joue: ["basse"] }),
  ...compte("u-tom", "Tom", "Vidal", { dansEquipes: ["louange"], sousEquipes: ["choristes"] }),
  ...compte("u-mila", "Mila", "Serre", { dansEquipes: ["louange"], sousEquipes: ["musiciens", "choristes"], joue: ["piano"], lieuxLouange: ["Intergroupe"] }),
  ...compte("u-yanis", "Yanis", "Roux", { dansEquipes: ["regie"] }),
};

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

/** Capture d'un ÉLÉMENT, en entier (le bandeau défile : on l'amène d'abord dans le champ). */
async function captureElement(el: Locator, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await el.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

/** Amène la carte Louange dans le champ en touchant sa pastille dans l'index du bandeau. */
async function amenerLouange(page: Page, nom = "Louange") {
  // Une carte plus haute que le bandeau défile dans sa colonne : pour la voir entière, la fenêtre s'agrandit le temps de la capture.
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 1800 });
  await page.getByRole("button", { name: nom, exact: true }).first().click();
  await page.waitForTimeout(900); // défilement doux du bandeau
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs = DOCS, langue = "fr"): Promise<FakeDb> {
  await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

/** Les envois à la recopie du serveur, jamais la vraie route. */
async function suivreRecopie(page: Page) {
  const envois: { uids?: string[] }[] = [];
  await page.route("**/api/equipes/rattachement", (route) => {
    envois.push(route.request().postDataJSON());
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, maj: 1 }) });
  });
  return envois;
}

const panneau = (page: Page, nom = "TEAM LOUANGE") => page.getByRole("dialog", { name: nom });
const membre = (page: Page, uid: string) => page.getByTestId(`membre-${uid}`);
const groupe = (p: ReturnType<typeof membre>, nom: string) => p.getByRole("group", { name: nom, exact: true });
const pastille = (g: ReturnType<typeof groupe>, nom: string) => g.getByRole("button", { name: nom, exact: true });

// ── La carte ────────────────────────────────────────────────────────────────

test("carte TEAM LOUANGE : le référent, trois colonnes, référents de sous-équipe en gras, lignes grises", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  const carte = page.getByTestId("equipe-louange");
  await expect(carte).toBeVisible();
  await expect(page.getByTestId("louange-referents")).toContainText("Ludovic Maret — Référent Louange");

  const pres = page.getByTestId("louange-presidence");
  const mus = page.getByTestId("louange-musiciens");
  const cho = page.getByTestId("louange-choristes");
  await expect(pres).toContainText("Présidence");
  await expect(pres).toContainText("Inès Rovel — Référent·e");
  await expect(pres).toContainText("Franco · Interfranco");
  // Musiciens : le référent d'abord, les instruments puis les lieux ; une personne figure dans chaque sous-équipe (E1).
  await expect(mus.getByRole("button")).toHaveText([/^Noé Brandt — Référent·e/, /^Mila Serre/, /^Adèle Fabre/]);
  await expect(mus).toContainText("Guitare · Franco");
  await expect(mus).toContainText("Piano · Intergroupe");
  await expect(mus).toContainText("Basse");
  await expect(cho).toContainText("Mila Serre");
  await expect(cho).toContainText("Léna Voss — Référent·e");
  await expect(cho.getByRole("button").first()).toContainText("Léna Voss");
  // Le référent de sous-équipe est en gras, pas les autres.
  expect(await mus.getByText("Noé Brandt", { exact: true }).evaluate((e) => getComputedStyle(e).fontWeight)).toBe("600");
  expect(await mus.getByText("Mila Serre", { exact: true }).evaluate((e) => getComputedStyle(e).fontWeight)).toBe("400");
  // Sans sous-équipe : seulement ceux qui n'en ont aucune ; l'ancien intertitre n'est plus affiché.
  await expect(page.getByTestId("louange-sans")).toContainText("Arthur Clet");
  await expect(page.getByTestId("louange-sans")).toContainText("Campus");
  await expect(page.getByTestId("louange-sans")).not.toContainText("Ludovic Maret");
  await expect(carte).not.toContainText("Pianistes");

  // Trois colonnes de front, empilées sur téléphone.
  const [a, b, c] = await Promise.all([pres.boundingBox(), mus.boundingBox(), cho.boundingBox()]);
  const largeur = page.viewportSize()!.width;
  if (largeur >= 640) {
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    expect(Math.abs(b!.y - c!.y)).toBeLessThan(2);
    expect(b!.x).toBeGreaterThan(a!.x + 40);
  } else {
    expect(Math.abs(a!.x - b!.x)).toBeLessThan(2);
    expect(b!.y).toBeGreaterThan(a!.y);
    expect(c!.y).toBeGreaterThan(b!.y);
  }
  expect(await carte.evaluate((el) => el.scrollWidth - el.clientWidth), "le contenu de la carte tient dedans").toBeLessThanOrEqual(1);
  await capture(page, "carte-louange");
  await amenerLouange(page);
  await captureElement(carte, "element-carte-louange");
});

test("carte TEAM RÉGIE : la ligne grise des lieux sous chaque nom ; les autres équipes inchangées", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  const regie = page.getByTestId("equipe-regie");
  await expect(regie.getByRole("button", { name: /^Sacha Berg/ })).toContainText("Campus");
  await expect(regie.getByRole("button", { name: /^Yanis Roux/ })).not.toContainText(/Franco|Campus|Intergroupe|Interfranco/);
  await expect(page.getByTestId("equipe-da")).toContainText("Hugo Pelle");
  await capture(page, "carte-regie");
});

test("carte Louange en 中文 : intertitres, référents et lieux traduits", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", DOCS, "zh-CN");
  await expect(page.getByTestId("louange-referents")).toContainText("Ludovic Maret — 敬拜组负责人");
  await expect(page.getByTestId("louange-presidence")).toContainText("主领");
  await expect(page.getByTestId("louange-musiciens")).toContainText("乐手");
  await expect(page.getByTestId("louange-musiciens")).toContainText("吉他 · 法语堂");
  await expect(page.getByTestId("louange-choristes")).toContainText("和声");
  await expect(page.getByTestId("louange-sans")).toContainText("夏令营");
  await capture(page, "carte-louange-zh");
  await amenerLouange(page, "敬拜组");
  await captureElement(page.getByTestId("equipe-louange"), "element-carte-louange-zh");
});

test("la fiche d'une personne : ses sous-équipes depuis l'organigramme, « Ce que ça lui ouvre »", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await page.getByTestId("louange-musiciens").getByRole("button", { name: /^Noé Brandt/ }).click();
  const fiche = page.getByTestId("fiche");
  await expect(fiche).toContainText("TEAM LOUANGE");
  await expect(fiche).toContainText("Musiciens, référent·e");
  await expect(fiche.getByTestId("ce-que-ca-ouvre")).toContainText("Voir et créer les setlists de Culte Francophone");
  await expect(fiche.getByTestId("ce-que-ca-ouvre")).toContainText("Idées d'harmonie et cours");
  // Ni rôles de service ni planning dans la fiche.
  await expect(fiche).not.toContainText("Ses services");
  await capture(page, "fiche-personne-louange");
});

// ── Le panneau d'édition ────────────────────────────────────────────────────

test("un référent de Musiciens ouvre un musicien, coche Campus, enregistre : la ligne est écrite et la recopie demandée", async ({ page }) => {
  const envois = await suivreRecopie(page);
  const db = await ouvrir(page, NOE, "/back-office/equipes");
  // Le crayon n'est que sur Louange.
  await expect(page.getByRole("button", { name: "Modifier TEAM DA" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Modifier TEAM RÉGIE" })).toHaveCount(0);
  await page.getByRole("button", { name: "Modifier TEAM LOUANGE" }).click();
  const p = panneau(page);
  await expect(p).toBeVisible();

  // Un choriste ne s'ouvre pas, ne se retire pas ; la présidence non plus.
  await expect(p.getByRole("button", { name: /^Tom Vidal/ })).toHaveCount(0);
  await expect(p.getByRole("button", { name: "Retirer Tom Vidal" })).toHaveCount(0);
  await expect(p.getByTestId("membre-u-tom")).toContainText("Tom Vidal");
  await expect(p.getByRole("button", { name: /^Inès Rovel/ })).toHaveCount(0);
  // Mila est aussi musicienne : elle s'ouvre.
  await expect(p.getByRole("button", { name: /^Mila Serre/ })).toBeVisible();

  const adele = membre(page, "u-adele");
  await expect(adele).toContainText("Adèle Fabre");
  await adele.getByRole("button", { name: /^Adèle Fabre/ }).click();
  const ou = groupe(adele, "Où il sert");
  const ouvre = adele.getByTestId("ce-que-ca-ouvre");
  await expect(ouvre).toContainText("Idées d'harmonie").catch(() => {});
  await expect(ouvre).not.toContainText("Campus");
  await pastille(ou, "Campus").click();
  await expect(pastille(ou, "Campus")).toHaveAttribute("aria-pressed", "true");
  await expect(ouvre).toContainText("Voir et créer les setlists de Campus");

  // « Référent de » : toutes les pastilles sont désactivées ; Sous-équipes : seule la sienne se coche.
  const refs = groupe(adele, "Référent de");
  for (const b of await refs.getByRole("button").all()) await expect(b).toBeDisabled();
  const sous = groupe(adele, "Sous-équipes");
  await expect(pastille(sous, "Musiciens")).toBeEnabled();
  await expect(pastille(sous, "Présidence")).toBeDisabled();
  await expect(pastille(sous, "Choristes")).toBeDisabled();
  // La mention et « en essai » restent à qui tient l'équipe.
  await expect(adele.getByPlaceholder("Mention")).toHaveCount(0);
  // « Ce qu'il joue » : seulement parce que Musiciens est coché.
  await expect(groupe(adele, "Ce qu'il joue")).toBeVisible();
  // Cibles d'au moins 44 px au toucher.
  const hauteur = (await pastille(ou, "Campus").boundingBox())!.height;
  expect(hauteur).toBeGreaterThanOrEqual(43.5);
  await capture(page, "panneau-referent-musiciens");
  // Le panneau en entier, jusqu'à « Ce que ça lui ouvre » : on agrandit la fenêtre le temps de la capture.
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 2600 });
  await expect(ouvre).toBeInViewport();
  await captureElement(p, "element-panneau-referent-musiciens");
  await page.setViewportSize({ width: page.viewportSize()!.width, height: 900 });

  await p.getByRole("button", { name: "Enregistrer" }).click();
  await expect(p).toBeHidden();
  const ecrit = db.doc("equipes/louange")!.membres as MembreEquipe[];
  expect(ecrit.find((m) => m.uid === "u-adele")!.lieux).toContain("Campus");
  // Les autres lignes sont intactes.
  expect(ecrit.find((m) => m.uid === "u-tom")).toMatchObject({ sousEquipes: ["choristes"] });
  expect(ecrit).toHaveLength(LOUANGE.length);
  expect(envois).toHaveLength(1);
  expect(envois[0].uids).toContain("u-adele");
});

test("un référent de Musiciens qui retire de sa sous-équipe : la ligne reste si la personne en a une autre", async ({ page }) => {
  const db = await ouvrir(page, NOE, "/back-office/equipes");
  await suivreRecopie(page);
  await page.getByRole("button", { name: "Modifier TEAM LOUANGE" }).click();
  await page.getByRole("button", { name: "Retirer Mila Serre" }).click();
  await panneau(page).getByRole("button", { name: "Enregistrer" }).click();
  await expect(panneau(page)).toBeHidden();
  const mila = (db.doc("equipes/louange")!.membres as MembreEquipe[]).find((m) => m.uid === "u-mila")!;
  expect(mila.sousEquipes).toEqual(["choristes"]);
});

test("un référent de Musiciens ajoute quelqu'un : il entre dans les Musiciens", async ({ page }) => {
  const db = await ouvrir(page, NOE, "/back-office/equipes", { ...DOCS, ...compte("u-zoe", "Zoé", "Lemaire") });
  await suivreRecopie(page);
  await page.getByRole("button", { name: "Modifier TEAM LOUANGE" }).click();
  await panneau(page).getByPlaceholder("Ajouter un membre").fill("Zoé");
  await panneau(page).getByRole("button", { name: "Zoé Lemaire" }).click();
  await panneau(page).getByRole("button", { name: "Enregistrer" }).click();
  await expect(panneau(page)).toBeHidden();
  const zoe = (db.doc("equipes/louange")!.membres as MembreEquipe[]).find((m) => m.uid === "u-zoe")!;
  expect(zoe.sousEquipes).toEqual(["musiciens"]);
});

test("un simple membre ne voit aucun crayon", async ({ page }) => {
  await ouvrir(page, TOM, "/equipes");
  await expect(page.getByTestId("equipe-louange")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Modifier / })).toHaveCount(0);
  await capture(page, "membre-sans-crayon");
});

test("« Ce que ça lui ouvre » change quand l'administrateur coche Campus ; Musiciens fait apparaître « Ce qu'il joue »", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await suivreRecopie(page);
  await page.getByRole("button", { name: "Modifier TEAM LOUANGE" }).click();
  const tom = membre(page, "u-tom");
  await tom.getByRole("button", { name: /^Tom Vidal/ }).click();
  await expect(tom.locator("[aria-expanded]").first()).toHaveAttribute("aria-expanded", "true");
  const ouvre = tom.getByTestId("ce-que-ca-ouvre");
  await expect(ouvre).not.toContainText("Campus");
  await pastille(groupe(tom, "Où il sert"), "Campus").click();
  await expect(ouvre).toContainText("Voir et créer les setlists de Campus");
  // L'administrateur change les référents et les sous-équipes.
  await expect(pastille(groupe(tom, "Référent de"), "Louange")).toBeEnabled();
  await expect(groupe(tom, "Ce qu'il joue")).toHaveCount(0);
  await pastille(groupe(tom, "Sous-équipes"), "Musiciens").click();
  await pastille(groupe(tom, "Ce qu'il joue"), "Piano").click();
  await expect(ouvre).toContainText("Idées d'harmonie et cours");
  await pastille(groupe(tom, "Référent de"), "Louange").click();
  await expect(ouvre).toContainText("Coordination");
  await capture(page, "panneau-administrateur");
});

test("TEAM RÉGIE : « Où il sert » et le référent", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await suivreRecopie(page);
  await page.getByRole("button", { name: "Modifier TEAM RÉGIE" }).click();
  const yanis = membre(page, "u-yanis");
  await yanis.getByRole("button", { name: /^Yanis Roux/ }).click();
  await expect(groupe(yanis, "Sous-équipes")).toHaveCount(0);
  await pastille(groupe(yanis, "Où il sert"), "Interfranco").click();
  await expect(yanis.getByTestId("ce-que-ca-ouvre")).toContainText("Voir les setlists de Interfranco");
  await expect(yanis.getByRole("button", { name: "Référent", exact: true })).toBeEnabled();
});

test("le panneau replié montre la ligne de résumé", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await page.getByRole("button", { name: "Modifier TEAM LOUANGE" }).click();
  await expect(membre(page, "u-ines")).toContainText("Présidence, référent·e · Franco · Interfranco");
  await expect(membre(page, "u-noe")).toContainText("Musiciens, référent·e · Guitare · Franco");
});

// ── Personnes, vue Musiciens ────────────────────────────────────────────────

test("Personnes : « Ce que ça lui ouvre » et un lien vers l'organigramme, plus de cases de droits ni de rôles de service", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-noe");
  // Deux volets en grand, une page entière ailleurs (la tablette couchée compte parmi les « grands » mais n'a qu'un volet).
  const fiche = page.locator('[data-volet="detail"], article').first();
  await expect(fiche.getByTestId("ce-que-ca-ouvre")).toContainText("Voir et créer les setlists de Culte Francophone");
  await expect(fiche.getByRole("link", { name: "Voir l'organigramme" })).toBeVisible();
  await expect(fiche).not.toContainText(/Coordination\s*(Oui|Non)/);
  await expect(fiche).not.toContainText("Écrit dans");
  await capture(page, "personnes-fiche");
  await fiche.getByRole("button", { name: "Modifier", exact: true }).click();
  for (const texte of ["Peut modifier l'organigramme", "Peut remplir les plannings", "Peut créer des évènements", "Peut envoyer des notifications", "Coordination"]) {
    await expect(page.getByText(texte)).toHaveCount(0);
  }
  await expect(page.getByRole("button", { name: "Coordination", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Musicien", exact: true })).toHaveCount(0);
  await expect(page.getByLabel(/Prénom/)).toBeVisible();
  await expect(page.getByTestId("ce-que-ca-ouvre")).toBeVisible();
  await capture(page, "personnes-formulaire");
});

test("Personnes : les filtres par lieu viennent de l'organigramme", async ({ page }, info) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes", {
    ...DOCS,
    ...compte("u-lena", "Léna", "Voss", { dansEquipes: ["louange"], sousEquipes: ["choristes"], lieuxLouange: ["Campus"] }),
    // Un ancien rôle de service ne compte plus.
    ...compte("u-vieux", "Victor", "Ancien", { serviceRoles: { Campus: ["musicien"] } }),
  });
  if (!estGrandEcran(info)) await expect(page.getByText("Voss").first()).toBeVisible();
  await page.getByRole("button", { name: "Campus", exact: true }).click();
  await expect(page.getByText("Léna Voss").first()).toBeVisible();
  await expect(page.getByText("Victor Ancien")).toHaveCount(0);
  await expect(page.getByText("Adèle Fabre")).toHaveCount(0);
});

test("vue Musiciens : les Musiciens de l'organigramme, ce qu'ils jouent et où ils servent", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await enTete(page).getByRole("button", { name: "Musiciens", exact: true }).click();
  const matrice = page.locator('[data-testid^="matrice-"]:visible');
  await expect(matrice).toContainText("Noé Brandt");
  await expect(matrice).toContainText("Guitare");
  await expect(matrice).toContainText("Mila Serre");
  await expect(matrice).toContainText("Piano");
  await expect(matrice).toContainText("Adèle Fabre");
  await expect(matrice).toContainText("Basse");
  await expect(matrice).not.toContainText("Tom Vidal");
  await expect(matrice).not.toContainText("Inès Rovel");
  await capture(page, "musiciens");
});

// ── De bout en bout : la case cochée ouvre les setlists du lieu ─────────────

const setlist = (titre: string, categorie: string, over: Record<string, unknown> = {}) => ({
  title: titre, leader: "", category: categorie, date: "2026-10-18", language: "fr", notes: "",
  ownerId: "u-autre", isPrivate: false, isDraft: false, items: [], ...over,
});
const SETLISTS = {
  "setlists/s-campus": setlist("Soirée du Campus", "Campus"),
  "setlists/s-inter": setlist("Rencontre Intergroupe", "Intergroupe"),
  "setlists/s-perso": setlist("Ma liste perso", "Culte Francophone", { ownerId: "u-adele", isPrivate: true }),
};
const ADELE: FakeProfile = {
  uid: "u-adele", email: "adele@example.com", firstName: "Adèle", lastName: "Fabre", dansEquipes: ["louange"], sousEquipes: ["musiciens"], joue: ["basse"],
};

test("de bout en bout : une fois « Campus » recopié sur son profil, le musicien voit les setlists du Campus", async ({ page }) => {
  await ouvrir(page, { ...ADELE, lieuxLouange: ["Campus"] }, "/setlists", { ...SETLISTS });
  await expect(page.getByText("Soirée du Campus").first()).toBeVisible();
  await expect(page.getByText("Rencontre Intergroupe")).toHaveCount(0);
  await capture(page, "setlists-avec-campus");
});

test("de bout en bout : sans « Campus » recopié, le même musicien ne voit pas les setlists du Campus", async ({ page }) => {
  await ouvrir(page, ADELE, "/setlists", { ...SETLISTS });
  // Les setlists sont lues : le compteur de « Mes setlists » (la sienne) en est le signe.
  await expect(page.getByText("Mes setlists").locator("..")).toContainText("1");
  await expect(page.getByText("Soirée du Campus")).toHaveCount(0);
  await expect(page.getByText("Rencontre Intergroupe")).toHaveCount(0);
  await capture(page, "setlists-sans-campus");
});
