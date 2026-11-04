import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import type { Evenement } from "../src/types/evenement";

// Lot U4 bis, tranche B2 — Évènements en grand (docs/spec-pages-en-grand.md, Q5 ; planches
// `evenements-*`, `evenement-fiche-telephone`). En grand : l'agenda dans le layout, la fiche à
// droite (sur l'adresse de l'agenda, le prochain évènement, Q3) ; « Nouvel évènement » en encre.
// Tablette portrait : cartes sur deux colonnes. Téléphone : l'agenda garde ses cartes à bannière,
// la fiche fait remonter l'inscription sous les infos. Firestore et date simulés ; personnes fictives.
// Agencement v18 (A10, T7) : le titre « Évènements » (h1), les onglets et « + Nouvel évènement » sont
// dans l'en-tête de la section, au-dessus des deux volets ; la fiche se titre en h2 ; une colonne sous
// 760 px de volet, deux au-delà (agencement-v18-t7.spec.ts).

const base: Omit<Evenement, "id" | "titre"> = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "21:00", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [{ label: "Plan d'accès", url: "https://example.com/plan" }], images: [],
  placesMax: 10, inscriptionOuverte: true, sansCompte: true, lienExterne: "",
  contact: "", organisateurUid: "uid-steph", organisateurNom: "Steph", epingle: false, expiresAt: null, inscrits: 4,
  createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const LOUANGE: Omit<Evenement, "id"> = { ...base, titre: "Soirée louange", type: "musique", date: "2026-10-09", heure: "20:00", lieu: "Grande salle", placesMax: null };
const FOOT: Omit<Evenement, "id"> = { ...base, titre: "Foot au parc" };
const PAIX: Omit<Evenement, "id"> = { ...base, titre: "Repas Groupe Paix", type: "loisir", pour: "Groupe Paix", date: "2026-10-17", heure: "12:30", lieu: "Salle du bas", placesMax: null };
const INFO: Omit<Evenement, "id"> = { ...base, titre: "Nouveau parking", type: "info", date: "", heure: "", epingle: true, placesMax: null, inscriptionOuverte: false, liens: [] };
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const DOCS = { "evenements/louange": LOUANGE, "evenements/foot": FOOT, "evenements/paix": PAIX, "evenements/parking": INFO };

const SACHA: FakeProfile = { uid: "uid-sacha", email: "sacha@example.com", firstName: "Sacha", lastName: "L.", serviceRoles: { "Groupe Paix": ["chanteur"] } };
const ALICE: FakeProfile = { uid: "uid-alice", email: "alice@example.com", firstName: "Alice", lastName: "Q.", dansEquipes: ["evenementiel", "edd"], referentDe: ["evenementiel", "edd"], responsabilites: ["orga"] /* lot RS : la coordination vient du Comité Orga */ };

async function membre(page: Page, qui: FakeProfile, adresse: string) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  return signInAs(page, qui, DOCS, adresse);
}

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand";
}

const liste = (page: Page) => page.locator('[data-volet="liste"]');
const fiche = (page: Page) => page.getByTestId("fiche-carte");
/** Le volet de droite en grand : titre de la fiche en tête, hors de la carte d'inscription. */
const detail = (page: Page) => page.locator('[data-volet="detail"]');
const sansDefilementLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("Évènements en grand", () => {
  test.beforeEach(({}, info) => { test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage"); });

  test("l'agenda à gauche, le prochain évènement à droite, l'adresse inchangée", async ({ page }) => {
    // Avec un programme de scène affiché : deux onglets, donc le rail (un seul onglet n'en a pas).
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, SACHA, { ...DOCS, "programmes/noel": { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, passages: [], createdBy: "uid-alice", updatedAt: "2026-09-14T20:00:00Z" } }, "/evenements");
    await expect(page.locator("header[data-entete-page]").getByRole("heading", { name: "Évènements", level: 1 })).toBeVisible();
    await expect(page.locator("header[data-entete-page]").getByRole("link", { name: "Calendrier", exact: true }), "les onglets sont dans l'en-tête").toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Repas Groupe Paix/ })).toBeVisible();
    await expect(liste(page).getByRole("region", { name: "À la une" }).getByRole("link", { name: /Nouveau parking/ })).toBeVisible();
    await expect(detail(page).getByRole("heading", { name: "Soirée louange", level: 2 })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Soirée louange/ })).toHaveAttribute("aria-current", "page");
    expect(new URL(page.url()).pathname).toMatch(/^\/evenements\/?$/);
    expect(await sansDefilementLateral(page)).toBe(true);
  });

  test("un lien direct vers une fiche : l'agenda à gauche, la fiche à droite ; retour arrière rend la précédente", async ({ page }) => {
    await membre(page, SACHA, "/evenements/paix");
    await expect(liste(page).getByRole("link", { name: /Repas Groupe Paix/ })).toHaveAttribute("aria-current", "page");
    await expect(detail(page).getByRole("heading", { name: "Repas Groupe Paix" })).toBeVisible();
    await liste(page).getByRole("link", { name: /Foot au parc/ }).click();
    await expect(page).toHaveURL(/\/evenements\/foot\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Foot au parc" })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Repas Groupe Paix/ }), "la liste reste montée").toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/evenements\/paix\/?$/);
    await expect(detail(page).getByRole("heading", { name: "Repas Groupe Paix" })).toBeVisible();
  });

  // Agencement v18 (A10) : une colonne sous 760 px de volet (1 280 px barre dépliée, iPad couché),
  // deux au-delà (1 440 px). La bannière n'est là qu'avec une image.
  test("la fiche : une colonne sous 760 px de volet, deux au-delà ; badge « Inscrit » dans l'agenda", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await signInAs(page, SACHA, { ...DOCS, "evenements/foot": { ...FOOT, images: [PIXEL] }, "evenements/louange/inscriptions/uid-sacha": { uid: "uid-sacha", nom: "Sacha L.", invites: 0, createdAt: "2026-09-21T10:00:00Z" } }, "/evenements/foot");
    const banniere = (await page.getByTestId("banniere").boundingBox())!;
    const sinscrire = (await page.getByRole("button", { name: "S'inscrire" }).boundingBox())!;
    if ((await detail(page).boundingBox())!.width < 760) {
      expect(sinscrire.y, "une colonne : l'inscription sous la bannière").toBeGreaterThan(banniere.y + banniere.height - 1);
    } else {
      expect(sinscrire.x, "deux colonnes : l'inscription à droite de la bannière").toBeGreaterThan(banniere.x + banniere.width - 1);
    }
    const description = (await page.getByText("Match amical, venez nombreux.").boundingBox())!;
    expect(description.y, "la description sous la bannière").toBeGreaterThan(banniere.y + banniere.height - 1);
    await expect(page.getByRole("link", { name: "Plan d'accès" })).toBeVisible();
    await expect(liste(page).getByRole("link", { name: /Soirée louange/ }).getByText("Inscrit")).toBeVisible();
  });

  test("responsable : « Nouvel évènement » en encre et « Gérer dans le Back-Office » sur la fiche", async ({ page }) => {
    await membre(page, ALICE, "/evenements/foot");
    const nouvel = page.locator("header[data-entete-page]").getByRole("link", { name: "Nouvel évènement" });
    await expect(nouvel).toHaveAttribute("href", /^\/back-office\/evenements\/nouveau\/?$/);
    const [fond, encre] = await nouvel.evaluate((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(document.body).color]);
    expect(fond, "en encre : la couleur du texte de la page").toBe(encre);
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toHaveAttribute("href", /^\/back-office\/evenements\/foot\/?$/);
  });

  test("sans compte : l'agenda et la fiche lisibles", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
    await fakeFirestore(page, DOCS);
    await page.goto("/evenements");
    await expect(detail(page).getByRole("heading", { name: "Soirée louange", level: 2 })).toBeVisible();
    await expect(liste(page).getByText("Repas Groupe Paix")).toHaveCount(0);
  });
});

test("tablette portrait : l'agenda en cartes sur deux colonnes ; la fiche seule sur son adresse", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "tablette portrait");
  await membre(page, SACHA, "/evenements");
  const cartes = page.getByTestId("carte-evenement");
  await expect(cartes.first()).toBeVisible();
  const [b1, b2] = [(await cartes.nth(0).boundingBox())!, (await cartes.nth(1).boundingBox())!];
  expect(b2.x, "deux colonnes").toBeGreaterThan(b1.x + b1.width - 1);
  expect(Math.abs(b2.y - b1.y)).toBeLessThan(2);
  await cartes.nth(1).click();
  await expect(page).toHaveURL(/\/evenements\/foot\/?$/);
  await expect(fiche(page).getByRole("heading", { name: "Foot au parc" })).toBeVisible();
  await expect(liste(page)).toHaveCount(0);
  expect(await sansDefilementLateral(page)).toBe(true);
});

// Relecture du lot : la barre de la planche `evenement-fiche-telephone`, « ‹ Évènements » et
// « Gérer dans le Back-Office » sur une rangée, en tête de la fiche, au-dessus de la bannière.
test("un volet, responsable : « ‹ Évènements · Gérer dans le Back-Office » en tête de la fiche", async ({ page }, info) => {
  test.skip(disposition(info) === "grand", "un volet : téléphone et tablette portrait");
  await membre(page, ALICE, "/evenements/foot");
  const barre = page.getByTestId("barre-fiche");
  const retour = barre.getByRole("link", { name: "Évènements" });
  const gerer = barre.getByRole("link", { name: "Gérer dans le Back-Office" });
  await expect(retour).toHaveAttribute("href", /^\/evenements\/?$/);
  await expect(gerer).toHaveAttribute("href", /^\/back-office\/evenements\/foot\/?$/);
  const [r, g, b] = [(await retour.boundingBox())!, (await gerer.boundingBox())!, (await fiche(page).boundingBox())!];
  expect(Math.abs(r.y + r.height / 2 - (g.y + g.height / 2)), "sur une rangée").toBeLessThan(4);
  expect(g.x, "« Gérer » à droite").toBeGreaterThan(r.x + r.width);
  expect(g.y + g.height, "au-dessus de la fiche").toBeLessThanOrEqual(b.y);
  await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" }), "une seule fois").toHaveCount(1);
  expect(await sansDefilementLateral(page)).toBe(true);
  await capture(page, "relecture-fiche-evenement");
});

test("un volet, membre : la barre n'a que « ‹ Évènements »", async ({ page }, info) => {
  test.skip(disposition(info) === "grand", "un volet : téléphone et tablette portrait");
  await membre(page, SACHA, "/evenements/foot");
  await expect(page.getByTestId("barre-fiche").getByRole("link", { name: "Évènements" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toHaveCount(0);
});

test("téléphone : l'agenda garde ses cartes (vignette de date sans image) ; la fiche fait remonter l'inscription sous les infos", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "téléphone");
  await membre(page, SACHA, "/evenements");
  await expect(page.getByTestId("carte-evenement").first().getByTestId("tuile")).toBeVisible();
  await page.goto("/evenements/foot");
  const sinscrire = (await page.getByRole("button", { name: "S'inscrire" }).boundingBox())!;
  const description = (await page.getByText("Match amical, venez nombreux.").boundingBox())!;
  const lieu = (await page.getByText("Parc de Bercy").boundingBox())!;
  expect(sinscrire.y, "l'inscription sous les infos").toBeGreaterThan(lieu.y);
  expect(description.y, "la description après l'inscription").toBeGreaterThan(sinscrire.y);
  expect(await sansDefilementLateral(page)).toBe(true);
});

// ── T1 (docs/spec-corrections-design/eglise.md) : eglise-8, eglise-1, eglise-4, eglise-9, eglise-17 ──

async function enChinois(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN") } catch { /* stockage refusé */ } });
}

// eglise-8 : « Partager » ne sort plus de l'écran. Mesuré à 320, 360 et 390 px (le défaut est masqué à 412 px),
// avec et sans « Gérer » : si l'en-tête déborde seul, c'est une autre cause que la barre de la fiche.
for (const largeur of [320, 360, 390]) {
  for (const [langue, titre] of [["fr", "français"], ["zh", "中文"]] as const) {
    test(`téléphone ${largeur} px, ${titre} : la barre de la fiche tient, « Gérer » et « Partager » sont deux ronds de 40 px`, async ({ page }, info) => {
      test.skip(disposition(info) !== "telephone", "téléphone");
      await page.setViewportSize({ width: largeur, height: 800 });
      if (langue === "zh") await enChinois(page);
      await membre(page, SACHA, "/evenements/foot");
      const barre = page.getByTestId("barre-fiche");
      await expect(barre).toBeVisible();
      expect(await sansDefilementLateral(page), "sans « Gérer » (membre)").toBe(true);
      await page.goto("about:blank");
      await membre(page, ALICE, "/evenements/foot");
      const gerer = barre.getByRole("link", { name: langue === "fr" ? "Gérer dans le Back-Office" : "在后台管理" });
      const partager = barre.getByRole("button", { name: langue === "fr" ? "Partager" : /分享|共享/ });
      await expect(gerer).toBeVisible();
      expect(await sansDefilementLateral(page), "avec « Gérer » (responsable)").toBe(true);
      for (const rond of [gerer, partager]) {
        const b = (await rond.boundingBox())!;
        expect(Math.round(b.width), "rond de 40 px").toBe(40);
        expect(Math.round(b.height)).toBe(40);
        expect(b.x + b.width, "entièrement dans l'écran").toBeLessThanOrEqual(largeur);
      }
    });
  }
}

test("téléphone (écran tactile) : les deux ronds de la barre ont une zone de 44 px", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "téléphone");
  await membre(page, ALICE, "/evenements/foot");
  const barre = page.getByTestId("barre-fiche");
  for (const rond of [barre.getByRole("link", { name: "Gérer dans le Back-Office" }), barre.getByRole("button", { name: "Partager" })]) {
    await expect(rond).toBeVisible();
    const zone = await rond.evaluate((el) => { const s = getComputedStyle(el, "::after"); return { h: parseFloat(s.height), w: parseFloat(s.width) }; });
    expect(zone.h, "zone tactile (::after)").toBeGreaterThanOrEqual(44);
    expect(zone.w).toBeGreaterThanOrEqual(44);
  }
});

test("tablette portrait : « Gérer dans le Back-Office » garde son libellé complet, à côté de « Partager »", async ({ page }, info) => {
  test.skip(disposition(info) !== "tablette", "tablette portrait");
  await membre(page, ALICE, "/evenements/foot");
  const barre = page.getByTestId("barre-fiche");
  await expect(barre.getByRole("link", { name: "Gérer dans le Back-Office" })).toContainText("Gérer dans le Back-Office");
  await expect(barre.getByRole("button", { name: "Partager" })).toContainText("Partager");
  expect(await sansDefilementLateral(page)).toBe(true);
});

test("en grand : les deux boutons montent sur la rangée des étiquettes, le titre tient sur une ligne", async ({ page }, info) => {
  test.skip(disposition(info) !== "grand", "deux volets");
  await membre(page, ALICE, "/evenements/foot");
  const titre = detail(page).getByRole("heading", { name: "Foot au parc", level: 2 });
  const gerer = detail(page).getByRole("link", { name: "Gérer dans le Back-Office" });
  const partager = detail(page).getByRole("button", { name: "Partager" });
  await expect(titre).toBeVisible();
  const [t, g, p] = [(await titre.boundingBox())!, (await gerer.boundingBox())!, (await partager.boundingBox())!];
  expect(g.y + g.height, "« Gérer » au-dessus du titre").toBeLessThanOrEqual(t.y + 1);
  expect(p.y + p.height, "« Partager » au-dessus du titre").toBeLessThanOrEqual(t.y + 1);
  expect(t.height, "le titre tient sur une ligne").toBeLessThan(40);
});

// eglise-1 : plus de rond fixe sur la liste, une pilule de 44 px en bas de la liste (sous 768 px).
test("téléphone : « Nouvel évènement » est une pilule dans le flux, en bas de la liste, qui ne recouvre aucun « S'inscrire »", async ({ page }, info) => {
  test.skip(disposition(info) !== "telephone", "téléphone");
  await membre(page, ALICE, "/evenements");
  const pilule = page.getByRole("link", { name: "Nouvel évènement" });
  await expect(pilule).toHaveCount(1);
  await pilule.scrollIntoViewIfNeeded();
  expect(await pilule.evaluate((el) => getComputedStyle(el).position), "ne flotte pas").not.toBe("fixed");
  const p = (await pilule.boundingBox())!;
  expect(Math.round(p.height), "44 px de haut").toBe(44);
  const cartes = page.getByTestId("carte-evenement");
  expect(await cartes.count()).toBeGreaterThan(0);
  for (let i = 0; i < await cartes.count(); i++) {
    const c = (await cartes.nth(i).boundingBox())!;
    expect(p.y >= c.y + c.height - 1 || p.y + p.height <= c.y + 1, `la pilule ne recouvre pas la carte ${i}`).toBe(true);
  }
  const derniere = (await cartes.last().boundingBox())!;
  expect(p.y, "en bas de la liste").toBeGreaterThan(derniere.y + derniere.height);
});

test("un membre sans droit de création ne voit aucune pilule « Nouvel évènement »", async ({ page }) => {
  await membre(page, SACHA, "/evenements");
  await expect(page.getByTestId("carte-evenement").or(liste(page)).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Nouvel évènement" })).toHaveCount(0);
});

test("dès 768 px : la pilule « Nouvel évènement » est dans l'en-tête, une seule", async ({ page }, info) => {
  test.skip(disposition(info) === "telephone", "dès 768 px");
  await membre(page, ALICE, "/evenements");
  const pilule = page.getByRole("link", { name: "Nouvel évènement" });
  await expect(pilule).toHaveCount(1);
  await expect(page.locator("header[data-entete-page]").getByRole("link", { name: "Nouvel évènement" })).toBeVisible();
  // L'enveloppe de la pilule du flux ne laisse pas de bloc vide (et sa marge) avant « Comment ça marche ? ».
  const flux = page.locator('div:has(> a[href*="/back-office/evenements/nouveau"])').filter({ hasNot: page.locator("header") });
  if (disposition(info) === "tablette") await expect(flux.first(), "pilule du flux présente, cachée").toBeAttached();
  for (const d of await flux.evaluateAll((els) => els.filter((el) => !el.closest("header")).map((el) => getComputedStyle(el).display)))
    expect(d, "enveloppe cachée dès 768 px").toBe("none");
});

// eglise-4 : sans image, une vignette de date de 56 × 56 px à la place du cadre gris.
for (const [langue, titre, mois] of [["fr", "français", "oct."], ["zh", "中文", "10月"]] as const) {
  test(`${titre} : un évènement sans image porte une vignette de date de 56 × 56 px (carte et fiche)`, async ({ page }, info) => {
    test.skip(disposition(info) === "grand", "un volet : téléphone et tablette portrait");
    if (langue === "zh") await enChinois(page);
    await membre(page, SACHA, "/evenements");
    const carte = page.getByTestId("carte-evenement").first();
    await expect(carte).toBeVisible();
    await expect(carte.getByTestId("banniere"), "plus de cadre gris").toHaveCount(0);
    for (const tuile of [carte.getByTestId("tuile")]) {
      await expect(tuile).toBeVisible();
      const b = (await tuile.boundingBox())!;
      expect([Math.round(b.width), Math.round(b.height)]).toEqual([56, 56]);
      await expect(tuile).toContainText(mois);
    }
    await page.goto("/evenements/foot");
    const tuile = fiche(page).getByTestId("tuile");
    await expect(tuile).toBeVisible();
    const b = (await tuile.boundingBox())!;
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([56, 56]);
    await expect(fiche(page).getByTestId("banniere")).toHaveCount(0);
  });
}

test("une info (sans date) n'a pas de vignette, et une carte avec image garde sa bannière", async ({ page }, info) => {
  test.skip(disposition(info) === "grand", "un volet : téléphone et tablette portrait");
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await signInAs(page, SACHA, { ...DOCS, "evenements/foot": { ...FOOT, images: [PIXEL] } }, "/evenements");
  await expect(page.getByRole("link", { name: /Foot au parc/ }).getByTestId("banniere")).toBeVisible();
  await expect(page.getByRole("link", { name: /Foot au parc/ }).getByTestId("tuile")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Nouveau parking/ }).getByTestId("tuile")).toHaveCount(0);
});

// eglise-9 : « Inscriptions » comme « Tâches » (16 px), étiquettes Date / Heure / Lieu à 13 px, plus de sous-panneau gris.
test("la fiche d'un responsable : « Inscriptions » comme « Tâches », sans fond gris", async ({ page }) => {
  await membre(page, ALICE, "/evenements/foot");
  const titre = page.getByRole("heading", { name: "Inscriptions", level: 3 }).first();
  await expect(titre).toBeVisible();
  const taches = page.getByRole("heading", { name: "Tâches", level: 3 }).first();
  await expect(taches).toBeVisible();
  const style = (l: typeof titre) => l.evaluate((el) => { const s = getComputedStyle(el); return { taille: s.fontSize, graisse: s.fontWeight }; });
  expect(await style(titre), "même taille et même graisse que « Tâches » (text-base, 16 px au rem de base)").toEqual(await style(taches));
  expect(await titre.evaluate((el) => getComputedStyle(el.closest("section")!).backgroundColor), "pas de carte dans la carte").toBe("rgba(0, 0, 0, 0)");
});

test("en grand : les étiquettes Date / Heure / Lieu de la fiche sont à 13 px", async ({ page }, info) => {
  test.skip(disposition(info) !== "grand", "les étiquettes titrées n'existent qu'en grand");
  await membre(page, SACHA, "/evenements/foot");
  const etiquette = detail(page).getByText("Date", { exact: true }).first();
  await expect(etiquette).toBeVisible();
  expect(await etiquette.evaluate((el) => getComputedStyle(el).fontSize)).toBe("13px");
});

// eglise-17 : « Comment ça marche ? » calé à gauche, sur la gouttière des cartes.
test("« Comment ça marche ? » est aligné à gauche sur la première carte de l'agenda", async ({ page }) => {
  await membre(page, SACHA, "/evenements");
  const lien = page.getByRole("link", { name: "Comment ça marche ?" });
  await lien.scrollIntoViewIfNeeded();
  await expect(lien).toBeVisible();
  const premiere = disposition(test.info()) === "grand" ? liste(page).getByRole("link", { name: /Soirée louange|Repas Groupe Paix|Foot au parc/ }).first() : page.getByTestId("carte-evenement").first();
  const [l, c] = [(await lien.boundingBox())!, (await premiere.boundingBox())!];
  expect(Math.abs(l.x - c.x), "même bord gauche").toBeLessThanOrEqual(1);
});

// ─── bo-evenements-4 : l'en-tête de la fiche de gestion ─────────────────────────────────────────────────────

test("bo-evenements-4 — à 1 280 px, le titre de la fiche de gestion tient sur une ligne ; « Voir comme un membre » est la 1re entrée du menu « ⋯ »", async ({ page }, info) => {
  test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
  await page.setViewportSize({ width: 1280, height: 800 });
  await membre(page, ALICE, "/back-office/evenements/foot");
  const gestion = page.getByTestId("fiche-gestion");
  const titre = gestion.getByRole("heading", { name: "Foot au parc", level: 2 });
  await expect(titre).toBeVisible();
  const { hauteur, interligne } = await titre.evaluate((el) => ({ hauteur: el.getBoundingClientRect().height, interligne: parseFloat(getComputedStyle(el).lineHeight) }));
  expect(hauteur, "une seule ligne de titre").toBeLessThan(interligne * 1.5);
  // Plus un bouton de l'en-tête : la première entrée du menu.
  await expect(gestion.getByRole("link", { name: "Voir comme un membre" })).toHaveCount(0);
  await expect(gestion.getByRole("button", { name: "Voir comme un membre" })).toHaveCount(0);
  await gestion.getByRole("button", { name: "Plus d'actions" }).click();
  const entrees = page.getByRole("menuitem");
  await expect(entrees.first()).toHaveText("Voir comme un membre");
  await entrees.first().click();
  await expect(page).toHaveURL(/\/evenements\/foot\/?$/);
});
