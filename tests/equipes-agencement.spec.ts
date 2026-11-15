import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, margeAttendue, verifierAgencement, zoneDeContenu } from "./helpers/agencement";
import type { MembreEquipe } from "../src/types/equipe";

// Lot 1 du chantier « équipes et groupes » (docs/spec-equipes-sans-poles.md), tranche EQ-D :
// l'organigramme sans pôles (EQ27). Cinq projets (SPECS_GRAND_ECRAN). Base et Sheets simulés,
// noms fictifs. Captures : PW_CAPTURES=<dossier>, à regarder aux cinq tailles, FR et 中文.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D." };
const LEA: FakeProfile = { uid: "u-lea", email: "lea@example.com", firstName: "Léa", lastName: "M.", dansEquipes: ["medias"], referentDe: ["medias"] };
const JOEL: FakeProfile = { uid: "u-joel", email: "joel@example.com", firstName: "Joël", lastName: "F.", dansEquipes: ["medias"] };

const M = (nom: string, over: Partial<MembreEquipe> = {}): MembreEquipe =>
  ({ nom, uid: "", mention: "", referent: false, essai: false, groupe: "", ...over });

/** Des équipes dont le document porte encore l'ancien champ `pole` (base d'avant la migration). */
const DOCS: Record<string, Record<string, unknown>> = {
  "equipes/da": {
    pole: "da",
    membres: [M("Hugo L.", { uid: "u-hugo", mention: "Référent", referent: true }), M("Nina B.")],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "equipes/evenementiel": {
    pole: "evenement",
    membres: [M("Iris D.", { uid: "u-iris", referent: true })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "equipes/medias": {
    pole: "media",
    membres: [M("Léa M.", { uid: "u-lea", referent: true }), M("Joël F.", { uid: "u-joel" })],
    updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
  },
  "users/u-hugo": {
    email: "hugo@example.com", firstName: "Hugo", lastName: "L.", planningName: "Hugo L.",
    serviceRoles: {}, annonces: [], notify: [], equipes: false, plannings: [], dansEquipes: ["da"], referentDe: ["da"],
  },
};

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png`, fullPage: true });
}

async function ouvrir(page: Page, qui: FakeProfile, to: string, docs = DOCS) {
  await page.clock.setFixedTime(new Date("2026-10-09T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, docs, to);
}

const estOrdinateur = estGrandEcran;
/** Le déclencheur du menu « Aller à une équipe » (nommé par son texte). */
const declencheurIndex = (page: Page) => page.getByRole("button", { name: "Aller à une équipe" });
const menu = (page: Page, info: TestInfo) => estOrdinateur(info)
  ? page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" })
  : page.getByTestId("barre-du-bas");

for (const [langue, sousTitre] of [
  ["fr", "Organigramme GCC Franco"],
  ["zh-CN", "GCC 法语堂"],
] as const) {
  test(`Organigramme « Église » en ${langue} : plus de pastille de pôle, des cartes sans débordement`, async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), langue);
    await ouvrir(page, ADMIN, "/back-office/equipes");
    await expect(page.getByTestId("equipe-da")).toBeVisible();
    await expect(enTete(page)).toContainText(sousTitre);
    await expect(enTete(page)).not.toContainText(/pôles|部门/);
    await expect(page.getByText(/Donne le pôle|归入.*部门/)).toHaveCount(0);
    const bandeau = page.getByTestId("grille-equipes");
    await verifierAgencement(page, { premierBloc: bandeau, contenu: bandeau, onglets: { rail: 3, pilules: 0 } });
    // Lot CD, T3c : plus aucun <select> natif visible hors formulaire (l'index est un Menu).
    await expect(page.locator("select:visible"), "aucun select visible").toHaveCount(0);
    // Rien ne déborde d'une carte (la page défile en hauteur, jamais en largeur : verifierAgencement).
    for (const carte of await page.getByTestId(/^equipe-/).all()) {
      expect(await carte.evaluate((el) => el.scrollWidth - el.clientWidth), "le contenu de la carte tient dedans").toBeLessThanOrEqual(1);
    }
    await capture(page, `organigramme-${langue}`);
  });
}

// BO-G, 6 : plus de mot coupé en pleine colonne, plus de flèche, plus de puce au-delà de la marge.
test("organigramme : aucun nom d'équipe ni de sous-groupe coupé, aucune flèche Équipes précédentes/suivantes, les puces dans la marge", async ({ page }, info) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", {
    ...DOCS,
    "equipes/decoration": { pole: "decoration", membres: [M("Ilan P.", { referent: true }), M("Sacha T.")], updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
    "equipes/edd": {
      pole: "edd", updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
      membres: [M("Ilan P.", { groupe: "TEAM DÉCORATION ET MISE EN PLACE" }), M("Sacha T.", { groupe: "TEAM DÉCORATION ET MISE EN PLACE" }), M("Maé R.", { groupe: "MATERNELLE" })],
    },
  });
  await expect(page.getByTestId("equipe-decoration")).toBeVisible();
  const bandeau = page.getByTestId("grille-equipes");
  // Un titre (h2) ou un nom de sous-groupe n'est jamais rogné : tout son texte tient dans sa boîte. On mesure le texte
  // (Range), pas `scrollWidth` : au toucher, la zone invisible de 44 px du lien (`TOUCHER_44`, spec-corrections-design
  // § 3) dépasse d'un nom court comme « Orga » sans rien rogner.
  for (const titre of await bandeau.locator("h2, p.uppercase").all()) {
    const deborde = await titre.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().width - el.clientWidth;
    });
    expect(deborde, `« ${await titre.textContent()} » entier`).toBeLessThanOrEqual(1);
  }
  // B12 : plus de bandeau, plus de flèches.
  await expect(page.getByRole("button", { name: /Équipes (précédentes|suivantes)/ })).toHaveCount(0);
  // Le menu de l'index reste dans la marge de la zone.
  if (!estTelephone(info)) {
    const zone = await zoneDeContenu(page);
    const marge = await margeAttendue(page);
    const p = (await declencheurIndex(page).boundingBox())!;
    expect(p.x, "menu à la marge gauche").toBeGreaterThanOrEqual(zone.gauche + marge - 1);
    expect(p.x + p.width, "menu avant la marge droite").toBeLessThanOrEqual(zone.droite - marge + 1);
  }
});

// Lot CD, T3c (bo-equipes-5, arbitrage 17) : l'index des 13 équipes est un Menu « Aller à une équipe » (plus de pastilles) ;
// le choisir amène la carte de l'équipe dans l'écran, la coche marque l'équipe choisie, le déclencheur ne passe jamais en encre.
test("index des équipes : un menu « Aller à une équipe », 13 lignes, choisir amène la carte", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", { ...DOCS, ...GROS });
  await expect(page.getByTestId("equipe-orga")).toBeVisible();
  await expect(page.locator("[data-pilule]"), "plus de pastilles d'index").toHaveCount(0);
  const declencheur = declencheurIndex(page);
  await expect(declencheur).toHaveText("Aller à une équipe");
  await expect(declencheur).not.toHaveAttribute("data-pose", /.*/);
  await declencheur.click();
  const lignes = page.getByRole("menuitemradio");
  await expect(lignes).toHaveCount(13);
  await page.getByRole("menuitemradio", { name: "Louange", exact: true }).click();
  await expect(declencheur, "toujours le même texte, jamais en encre").toHaveText("Aller à une équipe");
  await expect(declencheur).not.toHaveAttribute("data-pose", /.*/);
  const carte = page.getByTestId("equipe-louange");
  // Le haut de la carte entre le bas de la barre du haut et le bas de la fenêtre.
  await expect.poll(async () => {
    const c = (await carte.boundingBox())!;
    const haut = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 0);
    return c.y >= haut - 1 && c.y < page.viewportSize()!.height;
  }, { timeout: 5_000 }).toBe(true);
  await declencheur.click();
  await expect(page.getByRole("menuitemradio", { name: "Louange", exact: true }), "l'équipe choisie est cochée").toHaveAttribute("aria-checked", "true");
});

// Lot CD, T3c (back-office-7, arbitrage 3) : « Équipes · Musiciens » est un rail (role=tab), de 44 px de zone de toucher ;
// tablette portrait : sur la ligne du sélecteur des groupes ; téléphone : à la ligne dessous.
test("« Équipes · Musiciens » : un rail, sur la ligne du sélecteur sauf au téléphone", async ({ page }, info) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  const vue = page.getByRole("tablist", { name: "Vue" });
  const onglets = vue.getByRole("tab");
  await expect(onglets).toHaveText(["Équipes", "Musiciens"]);
  await expect(onglets.first()).toHaveAttribute("aria-selected", "true");
  const sel = (await page.getByRole("tablist", { name: "Organigrammes" }).boundingBox())!;
  const v = (await vue.boundingBox())!;
  if (estTelephone(info)) expect(v.y, "la vue passe à la ligne").toBeGreaterThan(sel.y + sel.height - 1);
  else expect(Math.abs(v.y - sel.y), "même ligne que le sélecteur").toBeLessThanOrEqual(1);
  const b = (await onglets.first().boundingBox())!;
  // La zone de 44 px n'existe qu'au toucher (TOUCHER_RANGEE) ; au pointeur fin, `::after` n'a pas de hauteur.
  const zone = await onglets.first().evaluate((el) => parseFloat(getComputedStyle(el, "::after").height) || 0);
  const toucher = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (toucher)
    expect(Math.max(b.height, zone), "cible d'au moins 44 px").toBeGreaterThanOrEqual(43.5);
  await onglets.nth(1).click();
  await expect(onglets.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("grille-equipes")).toHaveCount(0);
});

// B12 : les équipes sont des cartes d'une grille, gros jeu de membres.
const GROS: Record<string, Record<string, unknown>> = Object.fromEntries(
  ["orga", "da", "medias", "developpement", "regie", "traduction", "theologie", "evenementiel", "decoration", "accueil-j1", "louange"].map((id) => [
    `equipes/${id}`,
    { membres: Array.from({ length: 9 }, (_, i) => M(`Membre ${i + 1}`, { referent: i === 0 })), updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
  ]),
);

test("grille (beaucoup de membres) : colonnes de 280 px au moins, aucune largeur en trop, Louange et EDD sur toute la rangée", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", { ...DOCS, ...GROS });
  const grille = page.getByTestId("grille-equipes");
  await expect(page.getByTestId("equipe-orga")).toBeVisible();
  const m = await grille.evaluate((el) => {
    const g = el.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(el).paddingLeft) + parseFloat(getComputedStyle(el).paddingRight);
    const rect = (id: string) => el.querySelector(`[data-carte-equipe="${id}"]`)!.getBoundingClientRect();
    return {
      grille: g.width - pad,
      simples: ["orga", "da", "medias", "accueil-j1"].map((id) => rect(id).width),
      louange: rect("louange").width, edd: rect("edd").width,
      page: document.documentElement.scrollWidth, fenetre: window.innerWidth,
    };
  });
  for (const w of m.simples) expect(w, "carte simple d'au moins 280 px (sauf grille plus étroite)").toBeGreaterThanOrEqual(Math.min(280, m.grille) - 1);
  expect(m.page, "aucune largeur en trop").toBeLessThanOrEqual(m.fenetre);
  expect(m.louange, "Louange sur toute la rangée").toBeGreaterThanOrEqual(m.grille - 1);
  expect(m.edd, "EDD sur toute la rangée").toBeGreaterThanOrEqual(m.grille - 1);
});

// A6 : l'ordre de lecture (haut puis gauche) est celui d'EQUIPES aux cinq tailles.
test("même ordre de lecture des équipes aux cinq projets", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", { ...DOCS, ...GROS });
  await expect(page.getByTestId("equipe-orga")).toBeVisible();
  const { ordre, grille, largeurs } = await page.getByTestId("grille-equipes").evaluate((el) => {
    const cartes = [...el.querySelectorAll<HTMLElement>('[data-testid^="equipe-"]')].map((c) => {
      const r = c.getBoundingClientRect();
      return { id: c.dataset.testid!.slice("equipe-".length), top: Math.round(r.top), left: r.left, w: r.width };
    });
    cartes.sort((a, b) => a.top - b.top || a.left - b.left);
    return { ordre: cartes.map((c) => c.id), grille: el.getBoundingClientRect().width, largeurs: cartes.filter((c) => c.id !== "louange" && c.id !== "edd").map((c) => c.w) };
  });
  expect(ordre).toEqual(["orga", "comite-franco", "da", "medias", "developpement", "regie", "traduction", "theologie", "evenementiel", "decoration", "accueil-j1", "louange", "edd"]);
  for (const w of largeurs) expect(w, "carte simple d'au moins 280 px").toBeGreaterThanOrEqual(Math.min(280, grille) - 1);
});

// bo-equipes-15 : casse normale, sans « TEAM » répété ; le nom long reste en sous-titre.
test("organigramme : aucun titre de carte ne commence par « TEAM », les noms courts en casse normale", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", { ...DOCS, ...GROS });
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  const titres = await page.locator('[data-testid^="equipe-"] h2').allTextContents();
  expect(titres.length).toBeGreaterThanOrEqual(13);
  for (const t of titres) expect(t, `titre « ${t} »`).not.toMatch(/^TEAM\b/);
  expect(titres).toEqual(expect.arrayContaining(["Orga", "Comité Franco", "DA", "Médias", "Louange", "EDD"]));
  await expect(page.getByTestId("equipe-da")).toContainText("Direction artistique");
});

// bo-equipes-6 : le crayon d'une carte (32 px de dessin) a une zone de toucher de 44 px, sans que le dessin grandisse ni que le titre-lien perde son clic.
test("toucher : le crayon de la carte d'équipe a une zone de 44 px (::after), un toucher à 18 px sous son centre ouvre le panneau", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  const carte = page.getByTestId("equipe-da");
  await expect(carte).toBeVisible();
  test.skip(!(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)), "la zone de 44 px est celle du doigt : projets au toucher");
  const crayon = carte.getByRole("button", { name: "Modifier DA" });
  await crayon.scrollIntoViewIfNeeded();
  const b = (await crayon.boundingBox())!;
  expect(Math.round(b.height), "le dessin ne grandit pas").toBe(32);
  const zone = await crayon.evaluate((el) => { const s = getComputedStyle(el, "::after"); return { h: parseFloat(s.height), w: parseFloat(s.width) }; });
  expect(zone.h, "::after de 44 px de haut").toBeGreaterThanOrEqual(43.5);
  expect(zone.w, "::after de 44 px de large").toBeGreaterThanOrEqual(43.5);
  // Le titre reste un lien cliquable en son centre.
  const lien = carte.getByRole("link", { name: "DA", exact: true });
  if (await lien.count()) {
    const l = (await lien.boundingBox())!;
    const dessus = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a,button")?.tagName ?? null, { x: l.x + l.width / 2, y: l.y + l.height / 2 });
    expect(dessus, "le titre garde son clic").toBe("A");
  }
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2 + 18);
  await expect(page.getByRole("dialog", { name: /^DA, \d+ membres?$/ })).toBeVisible();
});

// BO-G, 16 : cibles de toucher de 44 px sans changer le dessin (::after) : rail Organigramme | Personnes, onglets des groupes et des vues, menu de l'index.
test("tablettes : le rail Organigramme | Personnes, les onglets et le menu ont une cible de 44 px", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("tablette"), "la cible de 44 px est celle du doigt : tablettes (portrait et paysage)");
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await expect(page.getByTestId("equipe-da")).toBeVisible();
  const cibles = [
    ...(await page.locator('[data-onglets="rail"]').first().getByRole("link").all()),
    ...(await page.locator('[data-onglets="rail"]').getByRole("tab").all()),
    ...(await page.locator("[data-menu]").all()),
  ];
  expect(cibles.length).toBeGreaterThan(6);
  for (const cible of cibles) {
    const b = (await cible.boundingBox())!;
    const nom = (await cible.textContent())?.trim();
    expect(b.height, `« ${nom} » : le dessin ne change pas`).toBeLessThan(44);
    const x = b.x + b.width / 2;
    for (const y of [b.y - (44 - b.height) / 2 + 1, b.y + b.height + (44 - b.height) / 2 - 1]) {
      const touche = await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e?.closest("a,button")?.textContent?.trim() ?? null; }, { x, y });
      expect(touche, `« ${nom} » : cible de 44 px (y = ${Math.round(y)})`).toBe(nom);
    }
  }
});

test("panneau d'édition : ni sélecteur de pôle ni liste de pôles", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes");
  await page.getByTestId("equipe-da").getByRole("button", { name: "Modifier DA" }).click();
  const panneau = page.getByRole("dialog", { name: /^DA, \d+ membres?$/ });
  await expect(panneau.getByPlaceholder("Ajouter un membre")).toBeVisible();
  await expect(panneau.getByText("Pôle donné par cette équipe")).toHaveCount(0);
  await expect(panneau.getByRole("combobox")).toHaveCount(0);
  await expect(panneau.getByRole("option")).toHaveCount(0);
  await capture(page, "panneau-edition");
});

test("fiche de Personnes : « Ce que ça lui ouvre » à la place des droits cochés, plus de carte Pôles", async ({ page }) => {
  await ouvrir(page, ADMIN, "/back-office/equipes/personnes?uid=u-hugo");
  // Nouveau mode (lot AO-B) : plus de ligne « Coordination » ni de case ; les droits viennent de l'organigramme.
  const fiche = page.locator('[data-volet="detail"], article').first();
  await expect(fiche.getByTestId("ce-que-ca-ouvre")).toBeVisible();
  await expect(fiche).not.toContainText(/Coordination\s*(Oui|Non)/);
  await expect(fiche.getByRole("heading", { name: "Pôles" })).toHaveCount(0);
  await expect(page.getByText("Coché hors organigramme")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pôles" })).toHaveCount(0);
  await capture(page, "fiche-personne");
});

// Piste A (docs/spec-back-office-piste-a.md, BO1, BO4) : un simple membre n'a plus de Back-Office ;
// une référente a les entrées de la piste A que ses droits ouvrent.
test("Back-Office d'un simple membre (BO4) : « Réservé aux responsables », aucun lien vers le Back-Office", async ({ page }) => {
  await ouvrir(page, JOEL, "/back-office");
  await expect(page.getByText("Réservé aux responsables.")).toBeVisible();
  await expect(page.locator('a[href^="/back-office"]').filter({ visible: true })).toHaveCount(0);
  await capture(page, "membre-back-office");
});

// Lot RS : une référente ne notifie plus (que ses réunions) : plus de Messages en grand.
test("Back-Office d'une référente sans Planning : À faire, Calendrier, Équipes ; App au doigt", async ({ page }, info) => {
  await ouvrir(page, LEA, "/back-office");
  const liens = menu(page, info).getByRole("link");
  if (estOrdinateur(info)) await expect(liens).toHaveText([/^À faire/, /^Calendrier/, /^Équipes/]);
  else await expect(liens).toHaveText([/^À faire/, /^Calendrier/, /^Équipes/, /^App/]);
  await capture(page, "referente-back-office");
});

// Supprimé (piste A, BO-D) : « Tâches : le rail ne montre que les équipes qui ont une tâche » (EQ9) : le rail des équipes n'existe plus.
