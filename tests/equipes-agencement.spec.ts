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
    const bandeau = page.getByTestId("bandeau-equipes");
    await verifierAgencement(page, { premierBloc: bandeau, contenu: bandeau, onglets: { rail: 3, pilules: 0 } });
    // Lot CD, T3c : plus aucun <select> natif visible hors formulaire (l'index est un Menu).
    await expect(page.locator("select:visible"), "aucun select visible").toHaveCount(0);
    // Rien ne déborde d'une carte (le bandeau défile en lui-même, pas la page : verifierAgencement).
    for (const carte of await page.getByTestId(/^equipe-/).all()) {
      expect(await carte.evaluate((el) => el.scrollWidth - el.clientWidth), "le contenu de la carte tient dedans").toBeLessThanOrEqual(1);
    }
    await capture(page, `organigramme-${langue}`);
  });
}

// BO-G, 6 : plus de mot coupé en pleine colonne, plus de flèche flottante sur une colonne, plus de puce au-delà de la marge.
test("organigramme : aucun nom d'équipe ni de sous-groupe coupé, les flèches ‹ › hors des colonnes, les puces dans la marge", async ({ page }, info) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", {
    ...DOCS,
    "equipes/decoration": { pole: "decoration", membres: [M("Ilan P.", { referent: true }), M("Sacha T.")], updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
    "equipes/edd": {
      pole: "edd", updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "",
      membres: [M("Ilan P.", { groupe: "TEAM DÉCORATION ET MISE EN PLACE" }), M("Sacha T.", { groupe: "TEAM DÉCORATION ET MISE EN PLACE" }), M("Maé R.", { groupe: "MATERNELLE" })],
    },
  });
  await expect(page.getByTestId("equipe-decoration")).toBeVisible();
  const bandeau = page.getByTestId("bandeau-equipes");
  await expect(bandeau).toHaveAttribute("data-range", "1");
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
  // Les flèches ne flottent plus sur les colonnes : dans la ligne du menu, au-dessus du bandeau, hors flux absolu.
  const suivantes = page.getByRole("button", { name: "Équipes suivantes" });
  if (!estTelephone(info) && (await suivantes.count())) {
    await expect(suivantes).toBeVisible();
    expect(await suivantes.evaluate((el) => getComputedStyle(el).position), "plus de flèche flottante").not.toBe("absolute");
    const f = (await suivantes.boundingBox())!;
    const b = (await bandeau.boundingBox())!;
    expect(f.y + f.height, "au-dessus des colonnes").toBeLessThanOrEqual(b.y + 1);
    // back-office-5 : flèches de 36 px habillées comme les pilules (gris, ni ombre ni relief), centrées sur le menu « Aller à une équipe ».
    expect(Math.round(f.width), "flèche de 36 px").toBe(36);
    expect(Math.round(f.height), "flèche de 36 px").toBe(36);
    expect(await suivantes.evaluate((el) => getComputedStyle(el).boxShadow), "ni ombre ni relief").toBe("none");
    const m = (await declencheurIndex(page).boundingBox())!;
    expect(Math.abs(f.y + f.height / 2 - (m.y + m.height / 2)), "flèches centrées sur le menu").toBeLessThanOrEqual(1);
    expect(f.x, "flèches à droite du menu").toBeGreaterThanOrEqual(m.x + m.width - 1);
    const precedentes = page.getByRole("button", { name: "Équipes précédentes" });
    await suivantes.click();
    await expect(precedentes).toBeVisible();
    if (await suivantes.count()) {
      const g = (await precedentes.boundingBox())!;
      const g2 = (await suivantes.boundingBox())!;
      expect(g2.x - (g.x + g.width), "huit pixels entre les deux flèches").toBeGreaterThanOrEqual(7);
    }
  }
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
// le choisir amène la colonne de l'équipe, la coche marque l'équipe en vue, le déclencheur ne passe jamais en encre.
test("index des équipes : un menu « Aller à une équipe », 13 lignes, choisir amène la colonne", async ({ page }, info) => {
  await ouvrir(page, ADMIN, "/back-office/equipes", { ...DOCS, ...GROS });
  const bandeau = page.getByTestId("bandeau-equipes");
  await expect(bandeau).toHaveAttribute("data-range", "1");
  await expect(page.locator("[data-pilule]"), "plus de pastilles d'index").toHaveCount(0);
  const declencheur = declencheurIndex(page);
  await expect(declencheur).toHaveText("Aller à une équipe");
  await expect(declencheur).not.toHaveAttribute("data-pose", /.*/);
  await declencheur.click();
  const lignes = page.getByRole("menuitemradio");
  await expect(lignes).toHaveCount(13);
  await expect(lignes.first(), "l'équipe en vue est cochée").toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "Louange", exact: true }).click();
  await expect(declencheur, "toujours le même texte, jamais en encre").toHaveText("Aller à une équipe");
  await expect(declencheur).not.toHaveAttribute("data-pose", /.*/);
  const carte = page.getByTestId("equipe-louange");
  if (estTelephone(info)) {
    await expect.poll(async () => (await carte.boundingBox())!.y, { timeout: 5_000 }).toBeLessThan(260);
  } else {
    await expect.poll(async () => {
      const c = (await carte.boundingBox())!;
      const b = (await bandeau.boundingBox())!;
      return c.x >= b.x - 1 && c.x + c.width <= b.x + b.width + 1;
    }, { timeout: 5_000 }).toBe(true);
  }
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
  await expect(page.getByTestId("bandeau-equipes")).toHaveCount(0);
});

// back-office-4 : à chaque arrêt du bandeau (› au pointeur fin, glissement au toucher), une colonne large (Louange, EDD) est
// entière avant la marge droite ou n'en montre que moins de la moitié ; jamais entre les deux, hors du bout.
const GROS: Record<string, Record<string, unknown>> = Object.fromEntries(
  ["orga", "da", "medias", "developpement", "regie", "traduction", "theologie", "evenementiel", "decoration", "accueil-j1", "louange"].map((id) => [
    `equipes/${id}`,
    { membres: Array.from({ length: 9 }, (_, i) => M(`Membre ${i + 1}`, { referent: i === 0 })), updatedAt: "2026-09-18T10:00:00Z", parUid: "", parNom: "" },
  ]),
);

for (const [jeu, docs] of [["peu de cartes", DOCS], ["beaucoup de membres", { ...DOCS, ...GROS }]] as const) {
  test(`bandeau (${jeu}) : à chaque arrêt, aucune colonne large visible entre 50 % et 100 %, hors du bout`, async ({ page }, info) => {
    test.skip(estTelephone(info), "au téléphone le bandeau est une colonne : la page défile");
    await ouvrir(page, ADMIN, "/back-office/equipes", docs);
    const bandeau = page.getByTestId("bandeau-equipes");
    await expect(bandeau).toHaveAttribute("data-range", "1");
    const marge = await margeAttendue(page);
    const fin = await page.evaluate(() => matchMedia("(pointer: fine)").matches);
    const lire = () => bandeau.evaluate((el, marge) => {
      const b = el.getBoundingClientRect();
      const bout = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      const larges = [...el.querySelectorAll<HTMLElement>('[data-colonne][data-large="1"]')].map((c) => {
        const r = c.getBoundingClientRect();
        const visible = Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left));
        return { id: c.getAttribute("data-colonne") ?? c.querySelector("[data-testid]")?.getAttribute("data-testid") ?? "?", entiere: r.right <= b.right - marge + 1 && r.left >= b.left - 1, part: visible / r.width };
      });
      return { x: Math.round(el.scrollLeft), bout, larges };
    }, marge);
    const verifier = (etat: Awaited<ReturnType<typeof lire>>, ou: string) => {
      if (etat.bout) return;
      for (const l of etat.larges) {
        expect(l.entiere || l.part <= 0.51, `${ou} (x = ${etat.x}) : colonne large à ${Math.round(l.part * 100)} %`).toBe(true);
      }
    };
    const stable = async () => {
      let avant = -1;
      await expect.poll(async () => { const x = (await lire()).x; const fini = x === avant; avant = x; return fini; }, { timeout: 5_000, intervals: [150] }).toBe(true);
    };
    await stable();
    verifier(await lire(), "départ");
    let arrets = 0;
    if (fin) {
      // Pointeur fin : › de arrêt en arrêt, jusqu'au bout.
      const suivantes = page.getByRole("button", { name: "Équipes suivantes" });
      while (await suivantes.count() && arrets < 25) {
        await suivantes.click();
        arrets++;
        await stable();
        verifier(await lire(), `› n° ${arrets}`);
      }
    } else {
      // Toucher : des glissements de 400 px, l'accroche (snap) choisit l'arrêt.
      let precedent = -1;
      while (arrets < 25) {
        await bandeau.evaluate((el) => el.scrollBy({ left: 400, behavior: "instant" }));
        arrets++;
        await stable();
        const etat = await lire();
        verifier(etat, `glissement n° ${arrets}`);
        if (etat.bout || etat.x === precedent) break;
        precedent = etat.x;
      }
    }
    expect((await lire()).bout, "le parcours mène au bout du bandeau").toBe(true);
    expect(arrets, "au plus une vingtaine d'arrêts").toBeLessThan(25);
  });
}

// bo-equipes-4 : le bandeau recoupe ses cartes en colonnes de hauteurs voisines (pas d'escalier, pas de trou sous la dernière
// petite colonne), dans l'ordre de l'organigramme ; Louange et EDD restent en dernier.
test("bandeau : colonnes simples de hauteurs voisines, ordre gardé, Louange et EDD en dernier", async ({ page }, info) => {
  test.skip(!["tablette-paysage", "ordinateur", "ordinateur-1440"].includes(info.project.name), "le bandeau en colonnes est celui des grands écrans");
  await ouvrir(page, ADMIN, "/back-office/equipes", { ...DOCS, ...GROS });
  const bandeau = page.getByTestId("bandeau-equipes");
  await expect(bandeau).toHaveAttribute("data-range", "1");
  await expect(page.getByTestId("equipe-orga")).toBeVisible();
  const colonnes = await bandeau.evaluate((el) =>
    [...el.querySelectorAll<HTMLElement>("[data-colonne]")].map((c) => {
      const cartes = [...c.querySelectorAll<HTMLElement>('[data-testid^="equipe-"]')];
      return {
        large: c.dataset.large === "1",
        ids: cartes.map((x) => x.dataset.testid!.slice("equipe-".length)),
        hauteur: cartes.reduce((h, x) => h + x.getBoundingClientRect().height, 0) + 16 * Math.max(0, cartes.length - 1),
        plusHaute: Math.max(...cartes.map((x) => x.getBoundingClientRect().height)),
      };
    }));
  const simples = colonnes.filter((c) => !c.large);
  const larges = colonnes.filter((c) => c.large);
  expect(larges.map((c) => c.ids)).toEqual([["louange"], ["edd"]]);
  expect(colonnes.slice(-2).every((c) => c.large), "Louange et EDD en dernier").toBe(true);
  expect(simples.flatMap((c) => c.ids), "l'ordre de l'organigramme").toEqual(
    ["orga", "comite-franco", "da", "medias", "developpement", "regie", "traduction", "theologie", "evenementiel", "decoration", "accueil-j1"]);
  const hauteurs = simples.map((c) => c.hauteur);
  const carte = Math.max(...simples.map((c) => c.plusHaute));
  expect(Math.max(...hauteurs) - Math.min(...hauteurs), `colonnes ${hauteurs.map(Math.round).join(", ")} : au plus une carte d'écart`).toBeLessThanOrEqual(carte + 16);
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
