import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierSansDebordement } from "./helpers/agencement";
import { ADMIN_EMAILS } from "../src/lib/access";

// Retouches v18, tranche R4 (docs/spec-retouches-v18.md, D6 et D7 ; planche `v18-bo-calendrier-agenda-a`) :
// Back-Office › Calendrier.
// - D6 : la rangée des filtres (sources, « Seulement moi ») est à droite de la période ; remplacée par BO-G (3) :
//   elle passe à la ligne au lieu de défiler (plus de bord fondu), rien n'est coupé.
// - D7 : « Ajouter ce jour-là » suit la planche : le bouton, puis une flèche ronde (« Évènement, tâche ou
//   réunion ») qui ouvre le même menu ; la ligne de l'entrée ouverte dans l'agenda est surlignée.
// Firestore, Sheets et date simulés ; personnes fictives. Cinq projets (le téléphone garde ses pilules
// « Tout · Seulement moi » et son agenda à cartes : il saute ces tests).

const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };

const MAINTENANT = "2026-09-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "equipe:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-15", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, organisateurUid: "u-autre", organisateurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "equipes/da/taches/noel": {
    titre: "Chants de Noël", responsableUid: null, responsableNom: "", echeance: "2026-10-15", repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "u-autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
};

/** Jeudi 1er octobre 2026, en Agenda ; les Sheets (évènements, planning) répondent vides. */
async function ouvrirAgenda(page: Page, lang?: "zh-CN") {
  interdireDialoguesNatifs(page);
  if (lang) await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, DOCS, "/back-office/calendrier");
  await expect(page.getByTestId("calendrier")).not.toHaveAttribute("aria-busy", "true");
  const onglet = page.getByRole("tablist", { name: lang ? "视图" : "Affichage" }).getByRole("tab", { name: lang ? "日程" : "Agenda" });
  await onglet.click();
  await expect(onglet).toHaveAttribute("aria-selected", "true");
}

const filtres = (page: Page) => page.getByTestId("filtres-calendrier");
const agenda = (page: Page) => page.getByTestId("agenda");
const ligne = (page: Page, jour: string, source: string) => agenda(page).locator(`[data-jour="${jour}"] [data-source="${source}"]`);

const fondu = (page: Page) =>
  filtres(page).evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      gauche: s.getPropertyValue("--fondu-gauche").trim(),
      droite: s.getPropertyValue("--fondu-droite").trim(),
      masque: (s.maskImage || s.webkitMaskImage) !== "none",
      deborde: el.scrollWidth > el.clientWidth + 1,
      defile: getComputedStyle(el).overflowX,
    };
  });

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

// BO-G, 3 : la décision D6 (une seule rangée qui défile, bord fondu) est remplacée : la rangée passe à la ligne, rien n'est
// coupé et plus aucun fondu latéral. Mêmes garanties qu'avant : à droite de la période, tous les filtres atteignables.
test.describe("R4 · D6 (BO-G, 3) : les filtres du calendrier passent à la ligne au lieu de défiler", () => {
  test.beforeEach(() => {
    test.skip(estTelephone(test.info()), "le téléphone garde « Tout · Seulement moi » et la feuille des sources");
  });

  test("à droite de la période, tous les filtres visibles, ni défilement ni fondu", async ({ page }) => {
    await ouvrirAgenda(page);
    const rangee = filtres(page);
    const boutons = rangee.getByRole("button");
    // Les sources de l'admin et « Seulement moi ».
    expect(await boutons.count()).toBeGreaterThan(4);
    await expect(rangee.getByRole("button", { name: "Seulement moi" })).toHaveCount(1);
    const mois = (await page.getByTestId("mois-affiche").boundingBox())!;
    const premier = (await boutons.first().boundingBox())!;
    expect(premier.x, "à droite de la période").toBeGreaterThan(mois.x + mois.width);
    // Ni défilement ni fondu latéral : la rangée passe à la ligne.
    const etat = await fondu(page);
    expect(etat.defile).not.toBe("auto");
    expect(etat).toMatchObject({ gauche: "", droite: "", masque: false, deborde: false });
    await verifierSansDebordement(page);
    const largeur = page.viewportSize()!.width;
    for (const b of await boutons.all()) {
      await expect(b).toBeVisible();
      const r = (await b.boundingBox())!;
      expect(r.x + r.width, "rien de coupé à droite").toBeLessThanOrEqual(largeur);
    }
    await capture(page, "r4-filtres-a-la-ligne");
  });

  test("en Mois aussi : la même rangée, rien de coupé", async ({ page }) => {
    await ouvrirAgenda(page);
    const onglet = page.getByRole("tablist", { name: "Affichage" }).getByRole("tab", { name: "Mois" });
    await onglet.click();
    await expect(onglet).toHaveAttribute("aria-selected", "true");
    const boutons = filtres(page).getByRole("button");
    expect(await boutons.count()).toBeGreaterThan(4);
    expect((await fondu(page)).deborde).toBe(false);
    await verifierSansDebordement(page);
  });

  test("ordinateur : la fenêtre passe du téléphone à la tablette, la rangée apparaît et tient", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "ordinateur seulement : la fenêtre change de taille");
    await page.setViewportSize({ width: 600, height: 900 });
    await ouvrirAgenda(page);
    await expect(filtres(page)).toHaveCount(0);
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(filtres(page)).toBeVisible();
    const etat = await fondu(page);
    expect(etat).toMatchObject({ deborde: false, masque: false });
    const dernier = (await filtres(page).getByRole("button").last().boundingBox())!;
    expect(dernier.x + dernier.width, "à 800 px, le dernier filtre est dans la fenêtre").toBeLessThanOrEqual(800);
  });

  test("passée en 中文, la rangée tient encore (libellés d'une autre largeur)", async ({ page }, info) => {
    test.skip(info.project.name === "tablette-paysage", "la langue se change dans la barre latérale, réduite sur la tablette couchée");
    await ouvrirAgenda(page);
    await page.locator('button[aria-label="切换为中文"]:visible').first().click();
    await expect(filtres(page).getByRole("button", { name: "只看我的" })).toBeVisible();
    await expect.poll(async () => (await fondu(page)).deborde).toBe(false);
    const largeur = page.viewportSize()!.width;
    for (const b of await filtres(page).getByRole("button").all()) {
      const r = (await b.boundingBox())!;
      expect(r.x + r.width).toBeLessThanOrEqual(largeur);
    }
  });

  test("un filtre se touche toujours dans la rangée", async ({ page }) => {
    await ouvrirAgenda(page);
    const moi = filtres(page).getByRole("button", { name: "Seulement moi" });
    await moi.click();
    await expect(moi).toHaveAttribute("aria-pressed", "true");
    await moi.click();
    await expect(moi).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("R4 · D7 : « Ajouter ce jour-là » et la ligne ouverte", () => {
  test("grand écran : le bouton et sa flèche ronde, qui ouvre le menu du jour", async ({ page }) => {
    test.skip(!estGrandEcran(test.info()), "le volet du jour à droite : ordinateur et tablette couchée");
    await ouvrirAgenda(page);
    const volet = page.getByRole("complementary", { name: "Jeudi 1er octobre" });
    const bouton = volet.getByRole("button", { name: "Ajouter ce jour-là" });
    const fleche = volet.getByRole("button", { name: "Évènement, tâche ou réunion" });
    await expect(bouton).toBeVisible();
    await expect(fleche).toBeVisible();
    const b = (await bouton.boundingBox())!;
    const f = (await fleche.boundingBox())!;
    // Ronde, à la hauteur du bouton, juste à sa droite.
    expect(Math.round(f.width), "la flèche est ronde").toBe(Math.round(f.height));
    expect(Math.round(f.height), "à la hauteur du bouton").toBe(Math.round(b.height));
    expect(f.x, "à droite du bouton").toBeGreaterThan(b.x + b.width);
    expect(f.x - (b.x + b.width), "juste à côté").toBeLessThanOrEqual(8);
    expect(await fleche.evaluate((el) => getComputedStyle(el).borderRadius)).not.toBe("0px");
    // La flèche ouvre le menu du jour : évènement, tâche, réunion.
    await fleche.click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Nouvel évènement le 01/10", "Nouvelle réunion le 01/10", "Nouvelle tâche pour le 01/10"]);
    await capture(page, "r4-ajouter-menu");
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    // Le bouton l'ouvre aussi (T3).
    await bouton.click();
    await expect(page.getByRole("menu").getByRole("menuitem")).toHaveCount(3);
  });

  test("grand écran : retoucher le bouton referme le menu ; fermé, le focus revient à qui l'a ouvert", async ({ page }) => {
    test.skip(!estGrandEcran(test.info()), "le volet du jour à droite : ordinateur et tablette couchée");
    await ouvrirAgenda(page);
    const volet = page.getByRole("complementary", { name: "Jeudi 1er octobre" });
    const bouton = volet.getByRole("button", { name: "Ajouter ce jour-là" });
    const fleche = volet.getByRole("button", { name: "Évènement, tâche ou réunion" });
    const menu = page.getByRole("menu");
    // Le bouton ouvre, le bouton referme (il ne se rouvre pas aussitôt).
    await bouton.click();
    await expect(menu).toBeVisible();
    await expect(bouton).toHaveAttribute("aria-expanded", "true");
    await bouton.click();
    await expect(menu).toHaveCount(0);
    await page.waitForTimeout(300);
    await expect(menu).toHaveCount(0);
    await expect(bouton).toHaveAttribute("aria-expanded", "false");
    // Au clavier : ouvert par le bouton, Échap le referme et rend le focus au bouton…
    await bouton.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(bouton).toBeFocused();
    // … ouvert par la flèche, à la flèche.
    await fleche.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(fleche).toBeFocused();
  });

  test("中文 : la flèche ronde dit 活动、任务或会议", async ({ page }) => {
    test.skip(!estGrandEcran(test.info()), "le volet du jour à droite : ordinateur et tablette couchée");
    await ouvrirAgenda(page, "zh-CN");
    await expect(page.getByRole("complementary").getByRole("button", { name: "活动、任务或会议" })).toBeVisible();
  });

  test("la ligne de l'entrée ouverte est surlignée ; toucher un jour la retire", async ({ page }, info) => {
    test.skip(estTelephone(info), "le téléphone garde son agenda à cartes : une carte ouvre sa feuille");
    await ouvrirAgenda(page);
    const noel = ligne(page, "2026-10-15", "taches");
    const ping = ligne(page, "2026-10-15", "evenements");
    await expect(noel).toBeVisible();
    await expect(noel).not.toHaveAttribute("aria-current");
    const fondDe = (l: typeof noel) => l.evaluate((el) => getComputedStyle(el).backgroundColor);
    const fondAuRepos = await fondDe(ping);
    await noel.click();
    await expect(noel).toHaveAttribute("aria-current", "true");
    await expect(ping).not.toHaveAttribute("aria-current");
    // Surlignée : un fond plein, que la ligne voisine du même jour n'a pas.
    await page.mouse.move(0, 0);
    await expect.poll(() => fondDe(noel)).not.toBe(fondAuRepos);
    expect(await fondDe(noel)).not.toBe("rgba(0, 0, 0, 0)");
    if (estGrandEcran(info)) {
      await expect(page.getByRole("complementary", { name: "Jeudi 15 octobre" })).toContainText("Chants de Noël");
      await capture(page, "r4-ligne-ouverte");
      // Une autre ligne : elle prend le surlignage.
      await ping.click();
      await expect(ping).toHaveAttribute("aria-current", "true");
      await expect(noel).not.toHaveAttribute("aria-current");
      // Toucher un jour (sa colonne de date) le choisit, sans ligne ouverte.
      await agenda(page).getByRole("button", { name: "Samedi 3 octobre" }).click();
      await expect(agenda(page).locator("[aria-current]")).toHaveCount(0);
    } else {
      // iPad debout : la feuille du jour s'ouvre, la ligne reste surlignée dessous.
      const feuille = page.getByRole("dialog", { name: "Jeudi 15 octobre" });
      await expect(feuille).toContainText("Chants de Noël");
      await capture(page, "r4-ligne-ouverte");
      await page.keyboard.press("Escape");
      await expect(feuille).toHaveCount(0);
      await expect(noel).toHaveAttribute("aria-current", "true");
    }
    // Changer de mois retire la ligne ouverte.
    await page.getByRole("button", { name: "Mois suivant" }).click();
    await page.getByRole("button", { name: "Mois précédent" }).click();
    await expect(agenda(page).locator("[aria-current]")).toHaveCount(0);
  });
});
