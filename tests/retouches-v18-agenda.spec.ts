import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierSansDebordement } from "./helpers/agencement";
import { ADMIN_EMAILS } from "../src/lib/access";

// Retouches v18, tranche R4 (docs/spec-retouches-v18.md, D6 et D7 ; planche `v18-bo-calendrier-agenda-a`) :
// Back-Office › Calendrier.
// - D6 : la rangée des filtres (sources, « Seulement moi ») reste sur UNE ligne, à droite de la période,
//   et défile de côté avec un bord fondu du côté où il reste des filtres, comme les plannings — sur
//   l'iPad debout, elle passait sur trois rangées.
// - D7 : « Ajouter ce jour-là » suit la planche : le bouton, puis une flèche ronde (« Évènement, tâche ou
//   réunion ») qui ouvre le même menu ; la ligne de l'entrée ouverte dans l'agenda est surlignée.
// Firestore, Sheets et date simulés ; personnes fictives. Cinq projets (le téléphone garde ses pilules
// « Tout · Seulement moi » et son agenda à cartes : il saute ces tests).

const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };

const MAINTENANT = "2026-09-01T10:00:00Z";
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/reu-da": {
    titre: "Réunion DA", type: "reunion", pour: "pole:da", date: "2026-10-03", heure: "20:00", lieu: "Salle 2",
    organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "evenements/ping": {
    titre: "Tournoi de ping", type: "loisir", pour: "eglise", date: "2026-10-15", heure: "19:00", lieu: "Gymnase",
    placesMax: 10, inscrits: 4, organisateurUid: "u-autre", organisateurNom: "Autre", createdAt: MAINTENANT, updatedAt: MAINTENANT,
  },
  "poles/da/taches/noel": {
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

test.describe("R4 · D6 : les filtres du calendrier sur une seule rangée qui défile", () => {
  test.beforeEach(() => {
    test.skip(estTelephone(test.info()), "le téléphone garde « Tout · Seulement moi » et la feuille des sources");
  });

  test("une seule ligne, à droite de la période ; bord fondu du côté où il reste des filtres", async ({ page }, info) => {
    await ouvrirAgenda(page);
    const rangee = filtres(page);
    const boutons = rangee.getByRole("button");
    // Les sources de l'admin et « Seulement moi ».
    expect(await boutons.count()).toBeGreaterThan(4);
    await expect(rangee.getByRole("button", { name: "Seulement moi" })).toHaveCount(1);
    // Une seule ligne : tous les filtres au même y, à la hauteur de la période.
    const ys = await boutons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(Math.max(...ys) - Math.min(...ys), `filtres sur une ligne (y : ${ys.join(", ")})`).toBeLessThanOrEqual(1);
    const mois = (await page.getByTestId("mois-affiche").boundingBox())!;
    const premier = (await boutons.first().boundingBox())!;
    expect(Math.abs(premier.y + premier.height / 2 - (mois.y + mois.height / 2)), "à la hauteur de la période").toBeLessThanOrEqual(2);
    expect(premier.x, "à droite de la période").toBeGreaterThan(mois.x + mois.width);
    // Elle défile de côté, la page jamais.
    const avant = await fondu(page);
    expect(avant.defile).toBe("auto");
    await verifierSansDebordement(page);
    // Sur l'iPad debout, les filtres ne tiennent pas : bord fondu à droite, pas à gauche.
    if (info.project.name === "tablette") expect(avant.deborde, "l'iPad debout fait défiler les filtres").toBe(true);
    expect(avant).toMatchObject({ gauche: "0px", droite: avant.deborde ? "24px" : "0px", masque: true });
    await capture(page, "r4-filtres-depart");
    if (!avant.deborde) return;
    // Au bout de la rangée : le fondu passe à gauche.
    await rangee.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect.poll(async () => (await fondu(page)).gauche).toBe("24px");
    expect((await fondu(page)).droite).toBe("0px");
    await capture(page, "r4-filtres-fin");
  });

  test("en Mois aussi : la même rangée, sur une ligne", async ({ page }) => {
    await ouvrirAgenda(page);
    const onglet = page.getByRole("tablist", { name: "Affichage" }).getByRole("tab", { name: "Mois" });
    await onglet.click();
    await expect(onglet).toHaveAttribute("aria-selected", "true");
    const boutons = filtres(page).getByRole("button");
    expect(await boutons.count()).toBeGreaterThan(4);
    const ys = await boutons.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(1);
    await verifierSansDebordement(page);
  });

  test("ordinateur : la fenêtre passe du téléphone à la tablette, le bord fondu suit la nouvelle rangée", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur", "ordinateur seulement : la fenêtre change de taille");
    // Ouverte en largeur de téléphone (pilules « Tout · Seulement moi »), puis agrandie (un téléphone
    // tourné, une fenêtre élargie) : la rangée des filtres apparaît, elle doit recevoir son bord fondu.
    await page.setViewportSize({ width: 600, height: 900 });
    await ouvrirAgenda(page);
    await expect(filtres(page)).toHaveCount(0);
    await page.setViewportSize({ width: 800, height: 900 });
    await expect(filtres(page)).toBeVisible();
    const etat = await fondu(page);
    expect(etat.deborde, "à 800 px, les filtres ne tiennent pas").toBe(true);
    expect(etat).toMatchObject({ gauche: "0px", droite: "24px" });
    // Et le défilement le fait suivre.
    await filtres(page).evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect.poll(async () => (await fondu(page)).gauche).toBe("24px");
  });

  test("passée en 中文, la rangée garde un bord fondu juste (libellés d'une autre largeur)", async ({ page }, info) => {
    test.skip(info.project.name === "tablette-paysage", "la langue se change dans la barre latérale, réduite sur la tablette couchée");
    await ouvrirAgenda(page);
    const avant = await fondu(page);
    expect(avant.droite).toBe(avant.deborde ? "24px" : "0px");
    await page.locator('button[aria-label="切换为中文"]:visible').first().click();
    await expect(filtres(page).getByRole("button", { name: "只看我的" })).toBeVisible();
    await expect.poll(async () => {
      const apres = await fondu(page);
      return apres.droite === (apres.deborde ? "24px" : "0px");
    }, { message: "le fondu droit dit s'il reste des filtres à voir" }).toBe(true);
  });

  test("un filtre se touche toujours dans la rangée qui défile", async ({ page }) => {
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
    await expect(menu.getByRole("menuitem")).toHaveText(["Nouvel évènement le 01/10", "Nouvelle tâche pour le 01/10", "Nouvelle réunion le 01/10"]);
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
