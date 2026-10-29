import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Retours de Timothée du 06/10/2026 au soir (test en local) : barre latérale réduite, la place
// libérée devenait une bande vide à gauche de la page (Chants et Setlists en deux volets, à
// 206 px de la barre à 1 920 px ; l'accueil du Planning à ~400 px). Règle des specs U4 / U4 bis :
// une liste en deux volets prend toute la largeur de la zone de contenu (fenêtre moins la barre) ;
// une grille aussi ; seule une page de lecture garde une colonne centrée.

// Admin : Harmonie s'ouvre aux pianistes et guitaristes du planning, ou à un admin.
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: ADMIN_EMAIL,
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const SETLIST_ID = "setlist-agencement";
const chant = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const SETLIST = {
  title: "Culte du 4 octobre", leader: "Léa M.", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false, isDraft: false,
  items: [chant("abba-pere", 1), chant("一生爱你", 2)],
};

const aBarreLaterale = (info: TestInfo) => info.project.name.startsWith("ordinateur") || info.project.name === "tablette-paysage";
/** Ordinateur : 1 280, 1 440 et 1 920 px de fenêtre ; ailleurs, la taille de l'appareil. */
const largeurs = (info: TestInfo) => (info.project.name.startsWith("ordinateur") ? [1280, 1440, 1920] : [null]);

/** La zone de contenu : de la barre latérale (0 sans elle) au bord droit de la fenêtre. */
const zone = (page: Page) =>
  page.evaluate(() => {
    const barre = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--barre-laterale")) || 0;
    return { gauche: barre, droite: document.documentElement.clientWidth };
  });

/** Les deux volets remplissent la zone de contenu, d'un bord à l'autre (au pixel près). */
async function remplitLaZone(page: Page, volets: Locator, quoi: string) {
  await expect(volets, quoi).toBeVisible();
  const z = await zone(page);
  await expect
    .poll(async () => {
      const b = (await volets.boundingBox())!;
      return [Math.round(b.x - z.gauche), Math.round(z.droite - (b.x + b.width))];
    }, { message: `${quoi} : écart au bord gauche de la zone, puis au bord droit` })
    .toEqual([0, 0]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${quoi} : rien ne déborde`).toBe(0);
}

const sansSheet = (page: Page, feuilles: Record<string, string> = {}) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: feuilles[feuille] ?? "" });
  });

/** Un service de Ruth K. le dimanche 4 octobre 2026 (personnes fictives), vu le jeudi 1er : Mes services a
 *  un service à montrer à droite, donc deux volets (règle de largeur du 25/10/2026, B4b). */
const UN_SERVICE = {
  maintenant: "2026-10-01T10:00:00",
  feuilles: {
    Franco_Louange: [
      ["2026 DATE", "Présidence", "Choristes", "", "Pianiste"],
      ["04/10", "Ombeline R.", "", "", "Ruth K."],
    ].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n"),
  },
};

/** Ouvre `to` connecté, la barre de l'ordinateur dans l'état voulu (la tablette couchée l'a toujours réduite). */
async function ouvrir(page: Page, etat: "reduite" | "depliee", to: string, donnees?: typeof UN_SERVICE) {
  await page.addInitScript((e) => localStorage.setItem("barre-laterale", e), etat);
  if (donnees) await page.clock.setFixedTime(new Date(donnees.maintenant));
  await sansSheet(page, donnees?.feuilles);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, to);
}

// Règle de largeur du 25/10/2026 (tranche B4b de docs/spec-corrections-audit.md, § 5 ; commit bc613d14) : une
// liste sans rien à montrer à droite prend seule une colonne de 960 px (`DeuxVolets colonneSeule` : /setlists
// sans aperçu, Mes services sans service ; mesuré par largeurs-b4.spec.ts). Ici, les deux volets : une setlist
// choisie (`?apercu=`, comme agencement-v18-setlists) et un service à venir.
const PAGES_EN_DEUX_VOLETS: { nom: string; to: string; volets: (page: Page) => Locator; donnees?: typeof UN_SERVICE }[] = [
  { nom: "Chants", to: "/songs", volets: (page) => page.locator(".chants-volets") },
  { nom: "Setlists", to: `/setlists?apercu=${SETLIST_ID}`, volets: (page) => page.locator("[data-deux-volets]") },
  { nom: "Mes services", to: "/mes-services", volets: (page) => page.locator("[data-deux-volets]"), donnees: UN_SERVICE },
  { nom: "Harmonie", to: "/harmonie", volets: (page) => page.locator("[data-deux-volets]") },
  { nom: "une setlist (sommaire et partitions)", to: `/setlists/${SETLIST_ID}`, volets: (page) => page.locator("[data-en-tete]") },
];

for (const etat of ["reduite", "depliee"] as const) {
  test.describe(`barre ${etat === "reduite" ? "réduite" : "dépliée"} : aucune bande vide entre la barre et la page`, () => {
    for (const { nom, to, volets, donnees } of PAGES_EN_DEUX_VOLETS) {
      test(`${nom} : les deux volets prennent toute la largeur, de 1 280 à 1 920 px (grands écrans)`, async ({ page }, info) => {
        test.skip(!aBarreLaterale(info), "deux volets : propre aux grands écrans (ordinateur, tablette couchée)");
        test.skip(etat === "depliee" && info.project.name === "tablette-paysage", "la tablette couchée a toujours la barre réduite");
        await ouvrir(page, etat, to, donnees);
        for (const largeur of largeurs(info)) {
          if (largeur) await page.setViewportSize({ width: largeur, height: 900 });
          // Barre dépliée sous 1 148 px de fenêtre : un volet (U5, Q1) ; ici 1 280 au moins.
          await remplitLaZone(page, volets(page), `${nom}, ${largeur ?? info.project.name} px`);
        }
        const dir = process.env.PW_CAPTURES;
        if (dir) await page.screenshot({ path: `${dir}/agencement-${to.replace(/\W+/g, "_")}-${etat}-${info.project.name}.png` });
      });
    }

    test("accueil du Planning : « Ce dimanche » part du bord de la zone de contenu et la remplit, trois appareils", async ({ page }, info) => {
      test.skip(etat === "depliee" && !info.project.name.startsWith("ordinateur"), "seul l'ordinateur a une barre à déplier");
      await ouvrir(page, etat, "/planning");
      const region = page.getByRole("region", { name: /Ce dimanche/ });
      await expect(region).toBeVisible();
      for (const largeur of largeurs(info)) {
        if (largeur) await page.setViewportSize({ width: largeur, height: 900 });
        const z = await zone(page);
        // La marge de la zone (`--marge-page`, 40 px au plus barre dépliée, agencement v18 R2), pas une bande vide.
        await expect
          .poll(async () => Math.round((await region.boundingBox())!.x - z.gauche), { message: `${largeur ?? info.project.name} px : écart à la barre` })
          .toBeLessThanOrEqual(40);
        const verset = (await page.getByText("— Colossiens 3 : 23-24").boundingBox())!;
        // La marge de la zone (40 px) et le retrait du verset dans sa carte.
        expect(Math.round(z.droite - (verset.x + verset.width)), `${largeur ?? info.project.name} px : écart au bord droit`).toBeLessThanOrEqual(64);
      }
      const dir = process.env.PW_CAPTURES;
      if (dir) await page.screenshot({ path: `${dir}/agencement-planning-${etat}-${info.project.name}.png` });
    });
  });
}
