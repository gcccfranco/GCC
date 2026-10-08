import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { estGrandEcran, estTelephone, interdireDialoguesNatifs, ouvrirAvecBarre } from "./helpers/agencement";

// Retouches après le chantier v18 (docs/spec-retouches-v18.md), lot R, voie A.
// R1 (D1) : « Partager » sur la fiche d'un évènement de l'App — la feuille de partage du système au
// doigt (téléphone, tablette), sinon le lien copié et « Lien copié » (ordinateur).
// R2 (D2) : Date · Heure · Lieu en trois colonnes en grand (ordinateur, iPad couché) quand la carte des
// infos a la place, l'une sous l'autre sur téléphone et dans la colonne étroite de la fiche en deux
// colonnes (planche `v18-app-evenements-reduite`). Firestore, date, presse-papiers et partage simulés ;
// personnes fictives.

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const EV = {
  type: "sport", pour: "eglise", date: "2026-10-10", heure: "19:00", heureFin: "21:00", dateFin: "", lieu: "Parc de Bercy",
  description: "Match amical, venez nombreux.", liens: [], images: [PIXEL], placesMax: 10, inscriptionOuverte: true,
  sansCompte: true, lienExterne: "", contact: "", organisateurUid: "uid-organisatrice", organisateurNom: "Organisatrice Essai", epingle: false,
  expiresAt: null, inscrits: 4, createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const DOCS: Record<string, Record<string, unknown>> = {
  "evenements/foot": { ...EV, titre: "Foot au parc" },
};

/** Membre d'un groupe, sans droit de création. */
const MEMBRE: FakeProfile = { uid: "uid-membre", email: "membre@example.com", firstName: "Membre", lastName: "Essai", serviceRoles: { "Groupe Paix": ["chanteur"] } };
/** Pôle Événement : la coordination, qui gère les évènements. */
const COORDINATION: FakeProfile = { uid: "uid-coordination", email: "coordination@example.com", firstName: "Coordination", lastName: "Essai", poles: ["evenement"] };

/** Le partage et le presse-papiers simulés : chaque appel est noté dans `window.__partage`.
 *  `share` : la feuille de partage existe (`true`), est fermée sans partager (`"annule"`, AbortError)
 *  ou n'existe pas (`false`). Sans presse-papiers : une page servie en http hors localhost. */
async function simulerPartage(page: Page, share: boolean | "annule", pressePapiers = true) {
  await page.addInitScript(([mode, avecCopie]) => {
    const w = window as unknown as { __partage: { share: unknown[]; copie: string[] } };
    w.__partage = { share: [], copie: [] };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: avecCopie ? { writeText: async (texte: string) => { w.__partage.copie.push(texte); } } : undefined,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: mode
        ? async (donnees: unknown) => {
          w.__partage.share.push(donnees);
          if (mode === "annule") throw new DOMException("Partage annulé", "AbortError");
        }
        : undefined,
    });
  }, [share, pressePapiers] as const);
}
const partage = (page: Page) => page.evaluate(() => (window as unknown as { __partage: { share: { url?: string; title?: string }[]; copie: string[] } }).__partage);

async function ouvrir(page: Page, qui: FakeProfile, to: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, qui, DOCS, to);
}

const volet = (page: Page) => page.locator('[data-volet="detail"]');
const partager = (page: Page) => page.getByRole("button", { name: "Partager" });
/** L'annonce de la copie : une région `status` hors du bouton (les enfants d'un bouton ne sont pas annoncés). */
const annonceCopie = (page: Page) => page.getByRole("status").filter({ hasText: "Lien copié" });

/** Le bouton reste dans la fenêtre et la page ne défile pas de côté. */
async function sansDebordement(page: Page, bouton: ReturnType<typeof partager>) {
  const b = (await bouton.boundingBox())!;
  const largeur = await page.evaluate(() => document.documentElement.clientWidth);
  expect(b.x + b.width, "dans la fenêtre").toBeLessThanOrEqual(largeur);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "pas de défilement de côté").toBe(true);
}

/** Capture à regarder à l'œil (PW_CAPTURES=<dossier>), une par appareil. */
async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/ra-${nom}-${test.info().project.name}.png`, animations: "disabled" });
}

test.describe("R1 : « Partager » sur la fiche d'un évènement", () => {
  test("membre : « Partager » à droite du titre en grand, dans la barre de la fiche sinon", async ({ page }, info) => {
    await simulerPartage(page, false);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    const bouton = partager(page);
    await expect(bouton).toHaveCount(1);
    await expect(bouton).toBeVisible();
    const b = (await bouton.boundingBox())!;
    expect(b.height, "40 px au moins, au doigt comme à la souris").toBeGreaterThanOrEqual(36);
    if (estGrandEcran(info)) {
      const titre = volet(page).getByRole("heading", { level: 2, name: "Foot au parc" });
      const t = (await titre.boundingBox())!;
      expect(b.x, "à droite du titre").toBeGreaterThan(t.x + t.width - 1);
      expect(b.y, "sur la rangée du titre").toBeLessThan(t.y + t.height);
      await expect(bouton.getByText("Partager"), "libellé visible en grand").toBeVisible();
    } else {
      await expect(page.getByTestId("barre-fiche").getByRole("button", { name: "Partager" })).toHaveCount(1);
      const retour = (await page.getByTestId("barre-fiche").getByRole("link", { name: "Évènements" }).boundingBox())!;
      expect(b.x, "à droite du retour").toBeGreaterThan(retour.x + retour.width);
      if (estTelephone(info)) {
        // Sous 640 px : un rond, le libellé pour les lecteurs d'écran seulement.
        expect(b.width, "rond sous 640 px").toBeLessThanOrEqual(44);
        expect((await bouton.getByText("Partager").boundingBox())!.width, "libellé réservé aux lecteurs d'écran (sr-only)").toBeLessThanOrEqual(1);
      }
    }
    await capture(page, "partager");
  });

  test("à la souris (ordinateur) : le lien est copié, « Lien copié » s'affiche 2,5 s puis « Partager » revient", async ({ page }, info) => {
    test.skip(!!info.project.use.hasTouch, "au doigt : la feuille de partage");
    // `navigator.share` existe (Safari, Chrome sur Mac) : à la souris, on copie quand même (D1).
    await simulerPartage(page, true);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    // Le nom du bouton suit son libellé visible (WCAG 2.5.3) ; l'annonce est dans une région voisine.
    const copie = page.getByRole("button", { name: "Lien copié" });
    await expect(copie.getByText("Lien copié")).toBeVisible();
    await expect(annonceCopie(page)).toHaveCount(1);
    await expect(page.getByRole("button").getByRole("status"), "l'annonce n'est pas dans le bouton").toHaveCount(0);
    const p = await partage(page);
    expect(p.share, "pas de feuille de partage à la souris").toHaveLength(0);
    expect(p.copie).toHaveLength(1);
    expect(p.copie[0]).toMatch(/^https?:\/\/[^/]+\/evenements\/foot$/);
    // 2,5 s : toujours là après 1 s, parti avant 3,5 s.
    await page.waitForTimeout(1000);
    await expect(copie).toBeVisible();
    await expect(annonceCopie(page)).toHaveCount(0, { timeout: 3500 });
    await expect(partager(page)).toBeVisible();
    await expect(copie).toHaveCount(0);
  });

  test("au doigt (téléphone, tablette) : la feuille de partage du système, avec le titre et le lien", async ({ page }, info) => {
    test.skip(!info.project.use.hasTouch, "à la souris : le lien copié");
    await simulerPartage(page, true);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    await expect.poll(async () => (await partage(page)).share.length).toBe(1);
    const p = await partage(page);
    expect(p.share[0].title).toBe("Foot au parc");
    expect(p.share[0].url).toMatch(/^https?:\/\/[^/]+\/evenements\/foot$/);
    expect(p.copie, "rien de copié quand la feuille s'ouvre").toHaveLength(0);
  });

  test("au doigt sans feuille de partage : le lien est copié, « Lien copié »", async ({ page }, info) => {
    test.skip(!info.project.use.hasTouch, "au doigt seulement");
    await simulerPartage(page, false);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    await expect(annonceCopie(page)).toHaveCount(1);
    expect((await partage(page)).copie[0]).toMatch(/\/evenements\/foot$/);
    const copie = page.getByRole("button", { name: "Lien copié" });
    await expect(copie).toBeVisible();
    // Sur téléphone, le bouton reste rond : « Lien copié » ne l'élargit pas.
    if (estTelephone(info)) expect((await copie.boundingBox())!.width, "toujours rond").toBeLessThanOrEqual(44);
    await sansDebordement(page, copie);
  });

  test("au doigt, feuille de partage fermée sans partager (AbortError) : rien de copié, aucune erreur", async ({ page }, info) => {
    test.skip(!info.project.use.hasTouch, "au doigt seulement");
    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    await simulerPartage(page, "annule");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await partager(page).click();
    await expect.poll(async () => (await partage(page)).share.length).toBe(1);
    expect((await partage(page)).copie, "rien de copié").toHaveLength(0);
    await expect(annonceCopie(page)).toHaveCount(0);
    await expect(partager(page)).toBeVisible();
    expect(erreurs).toEqual([]);
  });

  test("ni feuille de partage ni presse-papiers (page en http hors localhost) : pas de bouton qui ne ferait rien", async ({ page }) => {
    await simulerPartage(page, false, false);
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(page.getByTestId("fiche-carte").getByText("Parc de Bercy")).toBeVisible();
    await expect(partager(page)).toHaveCount(0);
  });

  test("coordination : « Partager » à côté de « Gérer dans le Back-Office », sans débordement, avant et après la copie", async ({ page }, info) => {
    await simulerPartage(page, false);
    await ouvrir(page, COORDINATION, "/evenements/foot");
    await expect(partager(page)).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Gérer dans le Back-Office" })).toBeVisible();
    const [p, g] = [(await partager(page).boundingBox())!, (await page.getByRole("link", { name: "Gérer dans le Back-Office" }).boundingBox())!];
    expect(Math.abs((p.y + p.height / 2) - (g.y + g.height / 2)), "sur la même rangée").toBeLessThan(8);
    await sansDebordement(page, partager(page));
    await capture(page, "partager-coordination");
    // Après la copie, « Lien copié » ne pousse pas la rangée hors de la fenêtre (téléphone de 412 px).
    await partager(page).click();
    const copie = page.getByRole("button", { name: "Lien copié" });
    await expect(copie).toBeVisible();
    if (estTelephone(info)) expect((await copie.boundingBox())!.width, "toujours rond").toBeLessThanOrEqual(44);
    await sansDebordement(page, copie);
    await capture(page, "partager-coordination-copie");
  });

  test("中文 : 分享, puis 链接已复制", async ({ page }, info) => {
    test.skip(!!info.project.use.hasTouch, "à la souris : le lien copié");
    await simulerPartage(page, false);
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch { /* navigation privée */ } });
    await ouvrir(page, MEMBRE, "/evenements/foot");
    const bouton = page.getByRole("button", { name: "分享" });
    await expect(bouton).toBeVisible();
    await bouton.click();
    await expect(page.getByRole("button", { name: "链接已复制" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "链接已复制" })).toHaveCount(1);
  });
});

test.describe("R2 : Date · Heure · Lieu", () => {
  const ligne = (page: Page, libelle: string) => page.getByTestId("fiche-carte").locator("li").filter({ hasText: libelle });

  async function boites(page: Page) {
    const [d, h, l] = await Promise.all(["Samedi 10 octobre", "19:00 – 21:00", "Parc de Bercy"].map(async (v) => (await ligne(page, v).boundingBox())!));
    return { d, h, l };
  }

  test("en grand, la fiche sur une colonne : trois colonnes titrées Date · Heure · Lieu", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "en grand");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(ligne(page, "Parc de Bercy")).toBeVisible();
    const largeur = (await volet(page).boundingBox())!.width;
    test.skip(largeur >= 760, "volet de 760 px et plus : la fiche est sur deux colonnes (test suivant)");
    const carte = page.getByTestId("fiche-carte");
    for (const [libelle, valeur] of [["Date", "Samedi 10 octobre"], ["Heure", "19:00 – 21:00"], ["Lieu", "Parc de Bercy"]]) {
      await expect(ligne(page, valeur).getByText(libelle, { exact: true }), `libellé « ${libelle} »`).toBeVisible();
    }
    const { d, h, l } = await boites(page);
    expect(Math.round(h.y), "Heure sur la rangée de Date").toBe(Math.round(d.y));
    expect(Math.round(l.y), "Lieu sur la rangée de Date").toBe(Math.round(d.y));
    expect(h.x, "Heure à droite de Date").toBeGreaterThanOrEqual(d.x + d.width - 1);
    expect(l.x, "Lieu à droite d'Heure").toBeGreaterThanOrEqual(h.x + h.width - 1);
    const c = (await carte.boundingBox())!;
    expect(l.x + l.width, "dans la carte").toBeLessThanOrEqual(c.x + c.width);
    await capture(page, "infos-colonnes");
  });

  test("barre réduite, 1 440 px : la fiche sur deux colonnes, les infos l'une sous l'autre dans la colonne étroite", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "ordinateur-1440, barre réduite");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(ligne(page, "Parc de Bercy")).toBeVisible();
    expect((await volet(page).boundingBox())!.width).toBeGreaterThanOrEqual(760);
    await expect(ligne(page, "Samedi 10 octobre").getByText("Date", { exact: true })).toBeVisible();
    const { d, h, l } = await boites(page);
    expect(h.y, "Heure sous Date").toBeGreaterThanOrEqual(d.y + d.height - 1);
    expect(l.y, "Lieu sous Heure").toBeGreaterThanOrEqual(h.y + h.height - 1);
    await capture(page, "infos-reduite");
  });

  test("téléphone et tablette debout : l'une sous l'autre", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet");
    await ouvrir(page, MEMBRE, "/evenements/foot");
    await expect(ligne(page, "Parc de Bercy")).toBeVisible();
    const { d, h, l } = await boites(page);
    expect(h.y, "Heure sous Date").toBeGreaterThanOrEqual(d.y + d.height - 1);
    expect(l.y, "Lieu sous Heure").toBeGreaterThanOrEqual(h.y + h.height - 1);
    await capture(page, "infos-page");
  });
});

// R3 (D3) : en deux volets, la liste-carte tient dans la fenêtre. Son bas est à 24 px du bas de la
// fenêtre quel que soit le défilement : sous l'en-tête avant tout défilement, puis collante sous la
// barre du haut, à la hauteur de la fenêtre moins cette barre. Elle défile seule. Une vingtaine de
// lignes par page pour qu'elle déborde. Personnes fictives.

const R3_ADMIN: FakeProfile = {
  uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Alix", lastName: "D.", planningName: "Alix D.",
  poles: ["da"], plannings: ["culte"], serviceRoles: { "Culte Francophone": ["musicien"] },
};
/** Le n-ième jour après le 3 octobre 2026, en AAAA-MM-JJ. */
const r3Jour = (n: number) => new Date(Date.UTC(2026, 9, 3 + n)).toISOString().slice(0, 10);
const R3_N = Array.from({ length: 24 }, (_, i) => i);
const r3Item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "",
});
const R3_EV = {
  type: "loisir", pour: "eglise", heure: "14:00", heureFin: "16:00", dateFin: "", lieu: "Jardin", description: "",
  liens: [], images: [], placesMax: 10, inscriptions: "auto", inscriptionOuverte: true, sansCompte: false, lienExterne: "",
  contact: "", organisateurUid: "uid-admin", organisateurNom: "Alix D.", epingle: false, expiresAt: null, inscrits: 0,
  createdAt: "2026-09-20T10:00:00Z", updatedAt: "2026-09-20T10:00:00Z",
};
const R3_DOCS: Record<string, Record<string, unknown>> = Object.fromEntries(R3_N.flatMap((i) => [
  [`setlists/s${i}`, {
    title: `Culte d'essai ${i + 1}`, leader: "Alix D.", category: "Culte Francophone", date: r3Jour(i * 3), language: "mixed",
    notes: "", ownerId: "uid-admin", isPrivate: false, items: [r3Item("hosanna", 1), r3Item("abba-pere", 2)],
  }],
  [`poles/da/taches/t${i}`, {
    pole: "da", titre: `Tâche d'essai ${i + 1}`, responsableUid: null, responsableNom: "", echeance: r3Jour(i * 2), repetition: null,
    lien: "", note: "", prevenir: null, evenement: null, auteurUid: "uid-admin", createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
  }],
  [`evenements/e${i}`, { ...R3_EV, titre: `Sortie d'essai ${i + 1}`, date: r3Jour(i * 2) }],
  [`evenements/r${i}`, { ...R3_EV, titre: `Réunion d'essai ${i + 1}`, pour: "pole:da", date: r3Jour(i * 2 + 1), placesMax: null, inscriptions: "fermees" }],
  [`users/u${i}`, {
    email: `essai${i}@example.com`, firstName: `Essai${i + 1}`, lastName: "T.", planningName: `Essai${i + 1} T.`,
    serviceRoles: {}, annonces: [], notify: [], poles: [], equipes: false, plannings: [],
  }],
  [`reports/m${i}`, {
    kind: "site", title: `Signalement d'essai ${i + 1}`, status: "pending", createdAt: new Date(Date.UTC(2026, 8, 30 - i, 10)),
    description: "Une page qui ne s'affiche pas.", songSlug: "", songTitle: "", pageUrl: "", authorName: "Essai T.", authorId: "uid-essai", authorEmail: "",
  }],
]));
/** Le Culte Franco et le groupe Paix, chaque dimanche jusqu'à Noël : Alix D. y joue. */
const r3Csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const R3_DIMANCHES = Array.from({ length: 13 }, (_, i) => new Date(Date.UTC(2026, 9, 4 + i * 7)))
  .map((d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
const R3_FEUILLES: Record<string, string> = {
  Franco_Louange: r3Csv([
    ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
    ...R3_DIMANCHES.map((d) => [d, "Essai1 T.", "", "", "Alix D.", "", "", "", "", "", "", "", ""]),
  ]),
  Paix_T4: r3Csv([["DATE", "Présidence", "Musiciens", "Orateur"], ...R3_DIMANCHES.map((d) => [d, "Essai2 T.", "Alix D.", "Essai3 T."])]),
};

async function ouvrirR3(page: Page, to: string) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: R3_FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, R3_ADMIN, R3_DOCS, to);
}

/** La carte de la liste dans la fenêtre : haut, bas, hauteur de la fenêtre, haut collant (`top` calculé). */
const mesurerListe = (page: Page) => page.evaluate(() => {
  const el = document.querySelector('[data-volet="liste"]')!;
  const r = el.getBoundingClientRect();
  return { haut: r.top, bas: r.bottom, fenetre: window.innerHeight, collant: parseFloat(getComputedStyle(el).top), defilement: window.scrollY };
});

const PAGES_R3 = [
  { nom: "Setlists", adresse: "/setlists" },
  { nom: "Mes services", adresse: "/mes-services" },
  { nom: "Tâches", adresse: "/taches" },
  { nom: "Back-Office › Tâches", adresse: "/back-office/taches/da" },
  { nom: "Réunions", adresse: "/back-office/reunions" },
  { nom: "Évènements", adresse: "/evenements" },
  { nom: "Back-Office › Évènements", adresse: "/back-office/evenements" },
  { nom: "Personnes", adresse: "/back-office/equipes/personnes" },
  { nom: "Réception", adresse: "/back-office/messages" },
  { nom: "Harmonie", adresse: "/harmonie" },
];

test.describe("R3 : la liste-carte des deux volets tient dans la fenêtre", () => {
  for (const { nom, adresse } of PAGES_R3) {
    test(`${nom} : bas à 24 px du bas de la fenêtre avant et après défilement, la liste défile seule (grands écrans)`, async ({ page }, info) => {
      test.skip(!estGrandEcran(info), "deux volets : grands écrans");
      await ouvrirR3(page, adresse);
      const liste = page.locator('[data-volet="liste"]');
      await expect(liste).toBeVisible();
      await expect.poll(() => liste.evaluate((el) => el.scrollHeight - el.clientHeight), { message: "assez de lignes pour déborder de la carte" })
        .toBeGreaterThan(40);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

      // Avant tout défilement : sous l'en-tête, le bas de la carte à 24 px du bas de la fenêtre.
      const avant = await mesurerListe(page);
      expect(avant.defilement).toBe(0);
      expect(avant.haut, "sous l'en-tête").toBeGreaterThanOrEqual(avant.collant - 1);
      expect(Math.abs(avant.bas - (avant.fenetre - 24)), `bas de la carte (${Math.round(avant.bas)}) à 24 px du bas de la fenêtre (${avant.fenetre})`).toBeLessThanOrEqual(2);
      await capture(page, `r3-${adresse.replaceAll("/", "-").slice(1)}`);

      // La molette sur la liste la fait défiler, elle seule : la page ne bouge pas.
      const b = (await liste.boundingBox())!;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.wheel(0, 300);
      await expect.poll(() => liste.evaluate((el) => el.scrollTop), { message: "la liste défile" }).toBeGreaterThan(0);
      expect(await page.evaluate(() => window.scrollY), "la page ne défile pas").toBe(0);

      // Page défilée jusqu'en bas : la carte reste dans la fenêtre ; collée sous la barre du haut, elle
      // a la hauteur de la fenêtre moins cette barre.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(async () => {
        const m = await mesurerListe(page);
        return Math.abs(m.bas - (m.fenetre - 24)) <= 2;
      }, { message: "après défilement, le bas de la carte reste à 24 px du bas de la fenêtre" }).toBe(true);
      const apres = await mesurerListe(page);
      if (Math.abs(apres.haut - apres.collant) <= 1) expect(apres.bas - apres.haut).toBeGreaterThanOrEqual(apres.fenetre - apres.collant - 24 - 2);
    });
  }

  test("l'en-tête change de hauteur après le chargement, page courte : le bas de la carte suit (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : grands écrans");
    await ouvrirR3(page, "/setlists");
    const liste = page.locator('[data-volet="liste"]');
    await expect.poll(() => liste.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(40);
    // Une page plus courte que la fenêtre : `html` garde la hauteur de la fenêtre quoi que fasse l'en-tête.
    await volet(page).evaluate((el) => { (el as HTMLElement).style.maxHeight = "120px"; (el as HTMLElement).style.overflow = "hidden"; });
    const basAttendu = async () => {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await mesurerListe(page);
      return Math.abs(Math.round(m.bas - (m.fenetre - 24)));
    };
    await expect.poll(basAttendu, { message: "au départ, à 24 px du bas" }).toBeLessThanOrEqual(2);
    const enTete = page.locator("[data-entete-page]");
    // Une ligne de 60 px apparaît dans l'en-tête (sous-titre, bandeau), puis disparaît ; puis sa marge
    // intérieure change : la carte suit à chaque fois.
    await enTete.evaluate((el) => { const l = document.createElement("div"); l.id = "ligne-essai"; l.style.height = "60px"; el.append(l); });
    await expect.poll(basAttendu, { message: "l'en-tête grandit : la carte ne passe pas sous le bas de la fenêtre" }).toBeLessThanOrEqual(2);
    await page.locator("#ligne-essai").evaluate((l) => l.remove());
    await expect.poll(basAttendu, { message: "l'en-tête rapetisse : la carte reprend sa hauteur" }).toBeLessThanOrEqual(2);
    await enTete.evaluate((el) => { (el as HTMLElement).style.paddingBottom = "80px"; });
    await expect.poll(basAttendu, { message: "marge de l'en-tête agrandie" }).toBeLessThanOrEqual(2);
    await enTete.evaluate((el) => { (el as HTMLElement).style.paddingBottom = ""; });
    await expect.poll(basAttendu, { message: "marge de l'en-tête rendue" }).toBeLessThanOrEqual(2);
  });

  test("un volet (téléphone, tablette debout), Back-Office › Tâches : la liste suit la page, sans défilement propre", async ({ page }, info) => {
    test.skip(estGrandEcran(info), "un volet : petits écrans");
    await ouvrirR3(page, "/back-office/taches/da");
    const liste = page.locator('[data-volet="liste"]');
    await expect(liste.getByText("Tâche d'essai 1", { exact: true }).first()).toBeVisible();
    expect(await liste.evaluate((el) => [getComputedStyle(el).overflowY, getComputedStyle(el).position])).toEqual(["visible", "static"]);
  });
});

// R7 : les heures sur la carte « Ce dimanche » (D14 : Culte Franco 10:30, Groupes 13:00, EDD 13:00,
// Table 10:00 ; planches v18-app-planning-accueil et -reduite) ; plus de « un dimanche par mois » sur
// la Prépa. Table du Seigneur (D15) ; en 中文, le bouton de Chants dit 推荐新诗歌 (D18). Feuilles
// Google simulées ; personnes fictives.
const csvR7 = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const groupeR7 = (pres: string, musiciens: string) => csvR7([["DATE", "Présidence", "Musiciens", "Orateur"], ["04/10", pres, musiciens, "Orateur Z."]]);
const FEUILLES_R7: Record<string, string> = {
  Franco_Louange: csvR7([
    ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
    ["04/10", "Présidente A.", "Choriste B.", "", "Pianiste C.", "Guitariste D.", "", "Sono E.", "", "Orateur F.", "", "", ""],
  ]),
  Paix_T4: groupeR7("Président G.", "Pianiste H."),
  "Fidélité_T4": groupeR7("Président I.", ""),
  "Bonté_T4": groupeR7("Président J.", "Guitariste K."),
  EDD: csvR7([["DATE", "Présidence", "Suppléant", "Piano", "Cajon", "Guitare", "", "Classe"], ["04/10", "Monitrice L.", "", "", "", "", "", "中班"]]),
  Franco_Table_PtD: csvR7([Array.from({ length: 21 }, (_, i) => (i === 1 ? "04/10" : i === 2 ? "Famille Essai" : ""))]),
};
const PIANISTE_R7: FakeProfile = { uid: "uid-pianiste", email: "pianiste@example.com", firstName: "Pianiste", lastName: "C.", planningName: "Pianiste C.", serviceRoles: { "Culte Francophone": ["musicien"] } };

async function ouvrirR7(page: Page, vers: string, zh = false) {
  interdireDialoguesNatifs(page);
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES_R7[feuille] ?? "" });
  });
  return signInAs(page, PIANISTE_R7, {}, vers);
}

test.describe("R7 : heures de « Ce dimanche », Prépa. Table, 推荐新诗歌", () => {
  const ceDimanche = (page: Page) => page.locator('section[aria-labelledby="ce-dimanche"]');
  const carte = (page: Page, testId: string) => ceDimanche(page).getByTestId(testId).first().locator("xpath=ancestor-or-self::article[1]");

  test("« Ce dimanche » : Culte Franco 10:30, Groupes 13:00, EDD 13:00, Table 10:00", async ({ page }) => {
    await ouvrirR7(page, "/planning");
    await expect(ceDimanche(page).getByText("Présidente A.")).toBeVisible();
    await expect(carte(page, "carte-culte").getByRole("heading", { level: 3 })).toHaveText(/^Culte Franco\s*10:30$/);
    await expect(carte(page, "ligne-groupe").getByRole("heading", { level: 3 })).toHaveText("Groupes · 13:00");
    await expect(carte(page, "ligne-edd").getByRole("heading", { level: 3 })).toHaveText("EDD · 13:00");
    // La Table : « Table · 10:00 » en en-tête quand elle est sur deux étages (en grand), sinon l'heure
    // au bout de la ligne « Prépa. Table ». Une seule heure visible.
    const table = ceDimanche(page).getByTestId("carte-table");
    await expect(table.getByText("10:00").filter({ visible: true })).toHaveCount(1);
    await expect(table.getByText("Famille Essai")).toBeVisible();
    await capture(page, "r7-ce-dimanche");
  });

  test("barre réduite, 1 440 px : la Table sur deux étages, « Table · 10:00 » en en-tête (ordinateur-1440)", async ({ page }, info) => {
    test.skip(info.project.name !== "ordinateur-1440", "planche v18-app-planning-accueil-reduite");
    await ouvrirAvecBarre(page, "reduite");
    await ouvrirR7(page, "/planning");
    const table = ceDimanche(page).getByTestId("carte-table");
    await expect(table.getByRole("heading", { level: 3 })).toHaveText("Table · 10:00");
    await expect(table.getByText("10:00").filter({ visible: true })).toHaveCount(1);
    await capture(page, "r7-ce-dimanche-reduite");
  });

  test("中文 : les mêmes heures", async ({ page }) => {
    await ouvrirR7(page, "/planning", true);
    await expect(ceDimanche(page).getByText("Présidente A.")).toBeVisible();
    await expect(carte(page, "carte-culte").getByRole("heading", { level: 3 })).toContainText("10:30");
    await expect(carte(page, "ligne-groupe").getByRole("heading", { level: 3 })).toContainText("· 13:00");
    await expect(carte(page, "ligne-edd").getByRole("heading", { level: 3 })).toContainText("· 13:00");
    await expect(ceDimanche(page).getByTestId("carte-table").getByText("10:00").filter({ visible: true })).toHaveCount(1);
  });

  test("Prépa. Table du Seigneur : plus de « un dimanche par mois » (FR et 中文)", async ({ page }) => {
    await ouvrirR7(page, "/planning/table");
    const carteTable = page.getByRole("region", { name: "Prépa. Table du Seigneur" });
    await expect(carteTable.getByText("Famille Essai")).toBeVisible();
    await expect(carteTable.getByText("un dimanche par mois")).toHaveCount(0);
    await capture(page, "r7-table");
    await page.evaluate(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await page.reload();
    await expect(page.getByText("Famille Essai")).toBeVisible();
    await expect(page.getByText("每月一个主日")).toHaveCount(0);
  });

  test("中文 : le bouton de Chants dit 推荐新诗歌", async ({ page }) => {
    await ouvrirR7(page, "/songs", true);
    const bouton = page.getByRole("button", { name: "推荐新诗歌", exact: true });
    await expect(bouton).toHaveCount(1);
    await expect(bouton).toBeVisible();
    await expect(page.getByRole("button", { name: "推荐诗歌", exact: true })).toHaveCount(0);
    await bouton.click();
    await expect(page.getByRole("heading", { name: "推荐新诗歌" })).toBeVisible();
  });
});
