import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estGrandEcran, estTelephone, interdireDialoguesNatifs, verifierAgencement } from "./helpers/agencement";
import { datesAjout, lireJournalDesAjouts } from "../scripts/dates-ajout";
import { debutPlusChantes, plusChantes } from "../src/lib/stats/plusChantes";

// Agencement v18, tranche T8 — App Chants (docs/spec-agencement-v18.md, A5 à A8) : l'en-tête
// « Chants » au-dessus des deux volets, la liste en carte, et un volet de droite jamais vide
// avant d'avoir choisi : les prochaines setlists en premier (ou « Pas de setlist à venir pour
// toi »), « Récemment ouverts » et « Nouveaux au répertoire » côte à côte, « Les plus chantés à
// GCC » sur les 92 derniers jours. Cinq projets (`agencement-v18-*` est dans SPECS_GRAND_ECRAN).

/** Samedi 3 octobre 2026. */
const AUJOURDHUI = new Date("2026-10-03T10:00:00");

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
const setlist = (date: string, slugs: string[], over: Record<string, unknown> = {}) => ({
  title: `Culte du ${date}`, leader: "Présidence T.", category: "Culte Francophone", date,
  language: "mixed", notes: "", ownerId: "uid-autre", isPrivate: false, isDraft: false,
  items: slugs.map((songSlug, i) => item({ songSlug, position: i + 1 })),
  ...over,
});

/** Que des setlists passées : rien à venir pour le musicien. */
const PASSEES: Record<string, Record<string, unknown>> = {
  "setlists/s1": setlist("2026-09-27", ["abba-pere", "一生爱你", "abrite-moi"]),
  "setlists/s2": setlist("2026-09-20", ["abba-pere", "tout-puissant"]),
  "setlists/s3": setlist("2026-09-13", ["abba-pere", "一生爱你"]),
  // Hors des 92 jours : ne compte pas.
  "setlists/s4": setlist("2026-06-28", ["a-l-agneau", "a-l-agneau"]),
};
/** Une setlist à venir en plus. */
const AVEC_PROCHAINE = { ...PASSEES, "setlists/s5": setlist("2026-10-04", ["abrite-moi"], { title: "Culte du 4 octobre" }) };

const liste = (page: Page) => page.locator("[data-volet-liste]");
const droite = (page: Page) => page.locator("[data-volet-chant]");
const carte = (page: Page, titre: string) => droite(page).locator("section").filter({ has: page.getByRole("heading", { level: 3, name: titre, exact: true }) });
const lignesDe = (page: Page, titre: string) => carte(page, titre).locator("[data-ligne-chant]");

async function listePrete(page: Page) {
  await expect(liste(page).locator('[id="song-li-abba-pere"] a')).toBeAttached({ timeout: 15_000 });
  await page.waitForFunction(() => {
    const s = document.querySelector("[data-volet-liste] input[type=search]");
    return !!s && Object.keys(s).some((k) => k.startsWith("__reactProps"));
  });
}

async function capture(page: Page, nom: string) {
  const dir = process.env.PW_CAPTURES;
  if (!dir) return;
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  await page.screenshot({ path: `${dir}/${nom}-${test.info().project.name}.png` });
}

test.beforeEach(async ({ page }) => {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(AUJOURDHUI);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
});

test.describe("en-tête et liste (A5, R1 à R3, R7, R10)", () => {
  test("l'en-tête « Chants » : un h1 à la marge, le nombre de chants, au-dessus de la liste", async ({ page }) => {
    await page.goto("/songs");
    await listePrete(page);
    const h1 = enTete(page).getByRole("heading", { level: 1, name: "Chants", exact: true });
    await expect(h1).toBeVisible();
    const nombre = (await page.request.get("/songs-index.json").then((r) => r.json())).songs.length;
    await expect(enTete(page).getByText(`${nombre} chants, en français et en chinois`, { exact: true })).toBeVisible();
    // Le bloc des volets prend toute la zone ; un rail (Tous · FR · 中文), aucune pilule.
    await verifierAgencement(page, { premierBloc: liste(page), contenu: page.locator(".chants-volets"), onglets: { rail: 1, pilules: 0 } });
    // La liste n'a plus de titre : elle commence par la recherche, sous l'en-tête.
    await expect(liste(page).getByRole("heading")).toHaveCount(0);
    expect((await h1.boundingBox())!.y).toBeLessThan((await liste(page).getByRole("searchbox").boundingBox())!.y);
    await capture(page, "v18-chants-visiteur");
  });

  test("deux volets : la liste est une carte, le titre au-dessus des deux, « Choisis un chant » en h2 de 24 px (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette couchée");
    await page.goto("/songs");
    await listePrete(page);
    const l = liste(page);
    expect(await l.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("16px");
    expect(await l.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
    const [bEntete, bListe, bDroite] = await Promise.all([enTete(page).boundingBox(), l.boundingBox(), droite(page).boundingBox()]);
    expect(bEntete!.y + bEntete!.height, "l'en-tête au-dessus de la liste").toBeLessThanOrEqual(bListe!.y + 1);
    expect(bEntete!.y + bEntete!.height, "… et au-dessus de la fiche").toBeLessThanOrEqual(bDroite!.y + 1);
    expect(bListe!.x + bListe!.width).toBeLessThan(bDroite!.x);
    const choisis = droite(page).getByRole("heading", { level: 2, name: "Choisis un chant" });
    await expect(choisis).toBeVisible();
    expect(await choisis.evaluate((el) => getComputedStyle(el).fontSize)).toBe("24px");
    // Le volet de droite va jusqu'à la marge de droite.
    const marge = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--marge-page")));
    const largeurFenetre = await page.evaluate(() => document.documentElement.clientWidth);
    const finDuContenu = await droite(page).locator("[data-choisis-un-chant]").evaluate((el) => el.getBoundingClientRect().right - parseFloat(getComputedStyle(el).paddingRight));
    expect(Math.abs(finDuContenu - (largeurFenetre - marge))).toBeLessThanOrEqual(1);
  });

  test("deux volets : l'index A–Z tient entier dans la carte, page en haut comme défilée (grands écrans)", async ({ page }, info) => {
    test.skip(!estGrandEcran(info), "deux volets : ordinateur et tablette couchée");
    // La première et la dernière lettre, entières dans la part de la carte qui est à l'écran :
    // page en haut, la carte part sous l'en-tête et finit sous le bas de la fenêtre ; page défilée,
    // elle colle 20 px sous le haut. Le défilement de la liste ne déplace pas la page (`overscroll`).
    const indexDansLaCarte = async (moment: string) => {
      const r = await liste(page).evaluate((carte) => {
        const lettres = carte.querySelectorAll('nav[aria-label="Index alphabétique"] button');
        const c = carte.getBoundingClientRect();
        return {
          n: lettres.length,
          haut: Math.max(c.top, 0),
          bas: Math.min(c.bottom, window.innerHeight),
          a: lettres[0]?.getBoundingClientRect().top ?? 0,
          z: lettres[lettres.length - 1]?.getBoundingClientRect().bottom ?? 0,
        };
      });
      expect(r.n, `${moment} : l'index est là`).toBeGreaterThan(20);
      expect(r.a, `${moment} : la première lettre dans la carte`).toBeGreaterThanOrEqual(r.haut - 0.5);
      expect(r.z, `${moment} : la dernière lettre dans la carte, à l'écran`).toBeLessThanOrEqual(r.bas + 0.5);
    };
    const largeur = page.viewportSize()!.width;
    for (const hauteur of [page.viewportSize()!.height, 640]) {
      await page.setViewportSize({ width: largeur, height: hauteur });
      await page.goto("/songs");
      await listePrete(page);
      await indexDansLaCarte(`${hauteur} px, page en haut`);
      await liste(page).evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await indexDansLaCarte(`${hauteur} px, liste au bout`);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(() => liste(page).evaluate((el) => Math.round(el.getBoundingClientRect().top)), "la carte collée").toBe(20);
      await indexDansLaCarte(`${hauteur} px, carte collée`);
    }
  });

  test("Tous · FR · 中文 : une vue de la liste, dans le rail gris (R4)", async ({ page }) => {
    await page.goto("/songs");
    await listePrete(page);
    const rail = liste(page).locator('[data-onglets="rail"]');
    await expect(rail).toHaveAttribute("role", "tablist");
    await expect(rail).toHaveAttribute("aria-label", "Langue");
    await expect(rail.getByRole("tab")).toHaveText(["Tous", "FR", "中文"]);
    await expect(rail.getByRole("tab", { name: "Tous" })).toHaveAttribute("aria-selected", "true");
    await rail.getByRole("tab", { name: "中文" }).click();
    await expect(rail.getByRole("tab", { name: "中文" })).toHaveAttribute("aria-selected", "true");
    await expect(liste(page).locator('[id="song-li-一生爱你"]')).toBeVisible();
    await expect(liste(page).locator('[id="song-li-abba-pere"]')).toHaveCount(0);
  });

  test("« Proposer un chant » : pilule dans l'en-tête dès 768 px, en bas de la liste sur téléphone", async ({ page }, info) => {
    await signInAs(page, MUSICIEN, PASSEES, "/songs");
    await listePrete(page);
    const dansEntete = enTete(page).getByRole("button", { name: "Proposer un chant" });
    const dansListe = liste(page).getByRole("button", { name: "Proposer un nouveau chant" });
    if (estTelephone(info)) {
      await expect(dansEntete).toBeHidden();
      await expect(dansListe).toBeVisible();
      await dansListe.click();
    } else {
      await expect(dansEntete).toBeVisible();
      await expect(dansListe).toBeHidden();
      const [bA, bT] = await Promise.all([dansEntete.boundingBox(), enTete(page).locator("h1").boundingBox()]);
      expect(bA!.x, "à droite du titre").toBeGreaterThan(bT!.x + bT!.width);
      await dansEntete.click();
    }
    await expect(page.getByRole("dialog").getByText("Proposer un nouveau chant")).toBeVisible();
  });
});

test.describe("le volet de droite avant d'avoir choisi (A5 à A8, grands écrans)", () => {
  test.beforeEach(async ({}, info) => {
    test.skip(!estGrandEcran(info), "le volet de droite n'existe qu'en deux volets");
  });

  test("sans setlist à venir : « Pas de setlist à venir pour toi » et les autres cartes", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("recentSongs", JSON.stringify(["abba-pere", "一生爱你"])));
    await signInAs(page, MUSICIEN, PASSEES, "/songs");
    await listePrete(page);
    const vide = droite(page).locator("[data-sans-setlist]");
    await expect(vide).toContainText("Pas de setlist à venir pour toi");
    await expect(vide.getByRole("link", { name: "Voir les setlists" })).toHaveAttribute("href", /^\/setlists\/?$/);
    await expect(page.getByText("Prochaines setlists")).toHaveCount(0);
    await expect(carte(page, "Récemment ouverts")).toBeVisible();
    await expect(carte(page, "Les plus chantés à GCC")).toBeVisible();
    await expect(droite(page).getByText("dans la liste, ou reprends là où tu t'es arrêté.", { exact: true })).toBeVisible();
    await capture(page, "v18-chants-sans-setlist");
  });

  test("une setlist à venir : ses chants en premier, pas de carte « Pas de setlist »", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("recentSongs", JSON.stringify(["abba-pere"])));
    await signInAs(page, MUSICIEN, AVEC_PROCHAINE, "/songs");
    await listePrete(page);
    const prochaines = droite(page).locator("[data-carte-setlist]");
    await expect(prochaines).toHaveCount(1);
    await expect(droite(page).locator("[data-sans-setlist]")).toHaveCount(0);
    await expect(carte(page, "Récemment ouverts")).toBeVisible();
    const yProchaine = (await prochaines.first().boundingBox())!.y;
    expect(yProchaine, "les prochaines avant les récents").toBeLessThan((await carte(page, "Récemment ouverts").boundingBox())!.y);
    expect(yProchaine, "… et avant les plus chantés").toBeLessThan((await carte(page, "Les plus chantés à GCC").boundingBox())!.y);
    await capture(page, "v18-chants-avec-setlist");
  });

  test("« Récemment ouverts » : les cinq premiers de recentSongs, dans l'ordre de la rangée « Récemment consultés »", async ({ page }) => {
    const RECENTS = ["beni-soit-ton-nom", "abba-pere", "abrite-moi", "a-l-agneau", "一生爱你", "我们的神", "不停赞美"];
    await page.addInitScript((slugs) => localStorage.setItem("recentSongs", JSON.stringify(slugs)), RECENTS);
    await page.goto("/songs");
    await listePrete(page);
    await expect(carte(page, "Récemment ouverts")).toContainText("sur cet appareil");
    const lignes = lignesDe(page, "Récemment ouverts");
    await expect(lignes).toHaveCount(5);
    const titres = await lignes.locator("[data-titre]").allTextContents();
    const rangee = (await liste(page).getByTestId("recents").getByRole("link").allTextContents()).map((t) => t.trim());
    expect(titres).toEqual(rangee.slice(0, 5));
    // Une ligne ouvre le chant à droite ; le chant ouvert passe en tête, ici comme dans la rangée.
    await lignes.nth(2).getByRole("link").click();
    await expect(droite(page).getByRole("heading", { level: 1 })).toHaveText(/Abrite-moi/i);
    await page.goBack();
    await expect(lignesDe(page, "Récemment ouverts").first().locator("[data-titre]")).toHaveText(/Abrite-moi/i);
    await expect(liste(page).getByTestId("recents").getByRole("link").first()).toHaveText(/Abrite-moi/i);
  });

  test("localStorage bloqué : la page s'affiche, sans « Récemment ouverts »", async ({ page }) => {
    // La lecture de `recentSongs` lève (stockage refusé). Seule cette clé : un localStorage
    // entièrement refusé fait tomber toute l'application bien avant Chants (I18nProvider le lit
    // sans garde), hors de cette tranche.
    await page.addInitScript(() => {
      const lire = Storage.prototype.getItem;
      Storage.prototype.getItem = function (cle: string) {
        if (this === window.localStorage && cle === "recentSongs") throw new DOMException("bloqué", "SecurityError");
        return lire.call(this, cle);
      };
      window.localStorage.setItem("recentSongs", JSON.stringify(["abba-pere"]));
    });
    await page.goto("/songs");
    await listePrete(page);
    await expect(droite(page).getByRole("heading", { level: 2, name: "Choisis un chant" })).toBeVisible();
    await expect(carte(page, "Récemment ouverts")).toHaveCount(0);
  });

  test("« Nouveaux au répertoire » : les six derniers ajoutés, par ajouteLe, la date en clair", async ({ page }) => {
    const AJOUTS: Record<string, string> = {
      "abba-pere": "2026-07-01", "abrite-moi": "2026-09-27", "a-l-agneau": "2026-08-15", "一生爱你": "2026-09-30",
      "tout-puissant": "2026-05-02", "我们的神": "2026-09-01", "不停赞美": "2026-06-11",
    };
    await page.route(/\/songs-index\.json/, async (route) => {
      const r = await route.fetch();
      const index = await r.json();
      for (const s of index.songs) s.ajouteLe = AJOUTS[s.slug] ?? null;
      await route.fulfill({ response: r, json: index });
    });
    await page.goto("/songs");
    await listePrete(page);
    const lignes = lignesDe(page, "Nouveaux au répertoire");
    await expect(lignes).toHaveCount(6);
    await expect(lignes.locator("[data-titre]")).toHaveText([/一生爱你/, /Abrite-moi/i, /我们的神/, /agneau/i, /Abba Père/i, /不停赞美/]);
    await expect(lignes.first()).toContainText("ajouté le 30 sept.");
    await capture(page, "v18-chants-nouveaux");
  });

  test("« Nouveaux au répertoire » : sans aucune date d'ajout, la carte ne paraît pas", async ({ page }) => {
    await page.route(/\/songs-index\.json/, async (route) => {
      const r = await route.fetch();
      const index = await r.json();
      for (const s of index.songs) s.ajouteLe = null;
      await route.fulfill({ response: r, json: index });
    });
    await page.goto("/songs");
    await listePrete(page);
    await expect(droite(page).getByRole("heading", { level: 2, name: "Choisis un chant" })).toBeVisible();
    await expect(carte(page, "Nouveaux au répertoire")).toHaveCount(0);
  });

  test("« Les plus chantés à GCC » : rang et nombre de setlists, sur deux colonnes", async ({ page }) => {
    await signInAs(page, MUSICIEN, PASSEES, "/songs");
    await listePrete(page);
    const plus = carte(page, "Les plus chantés à GCC");
    await expect(plus).toContainText("ces 3 derniers mois");
    const lignes = lignesDe(page, "Les plus chantés à GCC");
    // abba-pere 3, 一生爱你 2, puis abrite-moi et tout-puissant 1 (le plus récent d'abord) ; a-l-agneau, trop vieux, non.
    await expect(lignes).toHaveCount(4);
    await expect(lignes.locator("[data-titre]")).toHaveText([/Abba Père/i, /一生爱你/, /Abrite-moi/i, /Tout puissant/i]);
    await expect(lignes.nth(0)).toContainText("1");
    await expect(lignes.nth(0)).toContainText("3 fois en setlist");
    await expect(lignes.nth(1)).toContainText("2 fois en setlist");
    await expect(lignes.nth(2)).toContainText("1 fois en setlist");
    const [b1, b2, b3] = await Promise.all([lignes.nth(0).boundingBox(), lignes.nth(1).boundingBox(), lignes.nth(2).boundingBox()]);
    expect(Math.abs(b1!.y - b2!.y), "1 et 2 sur la même rangée").toBeLessThanOrEqual(1);
    expect(b2!.x).toBeGreaterThan(b1!.x + b1!.width - 1);
    expect(b3!.y, "3 sous 1").toBeGreaterThan(b1!.y);
    await expect(lignes.first().getByRole("link")).toHaveAttribute("href", /^\/songs\/abba-pere\/?$/);
  });

  test("sans compte : ni « Pas de setlist », ni « Les plus chantés » (rien n'est lu)", async ({ page }) => {
    await page.goto("/songs");
    await listePrete(page);
    await expect(droite(page).getByRole("heading", { level: 2, name: "Choisis un chant" })).toBeVisible();
    await expect(droite(page).locator("[data-sans-setlist]")).toHaveCount(0);
    await expect(carte(page, "Les plus chantés à GCC")).toHaveCount(0);
  });
});

test.describe("calculs (A7, A8)", () => {
  test("les plus chantés : comptés sur les 92 jours avant aujourd'hui, ni privée, ni brouillon, ni aujourd'hui", () => {
    const aujourdhui = "2026-10-03";
    expect(debutPlusChantes(aujourdhui)).toBe("2026-07-03");
    const s = (date: string, slugs: string[], over: Record<string, unknown> = {}) =>
      setlist(date, slugs, over) as unknown as Parameters<typeof plusChantes>[0][number];
    const index = [
      { slug: "a", title: "A", language: "fr", artist: "", originalKey: "C" },
      { slug: "b", title: "B", language: "fr", artist: "", originalKey: "D" },
      { slug: "c", title: "C", language: "zh", artist: "", originalKey: "E" },
    ] as Parameters<typeof plusChantes>[1];
    const lignes = plusChantes([
      s("2026-07-02", ["c", "c"]),          // 93 jours : non
      s("2026-07-03", ["a", "c"]),          // 92 jours : oui
      s("2026-09-27", ["a", "b"]),
      s("2026-10-02", ["a"]),               // hier : oui
      s("2026-10-03", ["b", "b"]),          // aujourd'hui : non
      s("2026-09-20", ["c"], { isPrivate: true }),
      s("2026-09-21", ["c"], { isDraft: true }),
    ], index, aujourdhui);
    expect(lignes.map((l) => [l.slug, l.setlists, l.rang])).toEqual([["a", 3, 1], ["b", 1, 2], ["c", 1, 3]]);
    // Six au plus.
    const beaucoup = Array.from({ length: 9 }, (_, i) => ({ slug: `x${i}`, title: `X${i}`, language: "fr", artist: "", originalKey: "C" })) as Parameters<typeof plusChantes>[1];
    expect(plusChantes([s("2026-10-01", beaucoup.map((c) => c.slug))], beaucoup, aujourdhui)).toHaveLength(6);
  });

  test("les plus chantés : un chant absent du recueil ne prend ni place ni rang", () => {
    const aujourdhui = "2026-10-03";
    const s = (date: string, slugs: string[]) => setlist(date, slugs) as unknown as Parameters<typeof plusChantes>[0][number];
    const index = ["a", "b", "c", "d", "e", "f", "g"].map((slug) => ({ slug, title: slug.toUpperCase(), language: "fr", artist: "", originalKey: "C" })) as Parameters<typeof plusChantes>[1];
    const lignes = plusChantes([
      s("2026-09-27", ["a", "retire", "b"]),
      s("2026-09-20", ["a", "retire"]),
      s("2026-09-13", ["retire", "c", "d", "e", "f", "g"]),
    ], index, aujourdhui);
    // « retire » (3 setlists) n'est plus au recueil : six lignes quand même, rangées de 1 à 6.
    expect(lignes.map((l) => [l.slug, l.rang])).toEqual([["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5], ["f", 6]]);
  });

  test("dates d'ajout : le journal de git lu en une passe, la plus récente addition d'un fichier gagne", () => {
    const journal = [
      "2026-09-27", "", "content/songs/triomphe.cho", "content/songs/十字架.cho",
      "2026-09-26", "", "content/songs/avec-nous.cho",
      "2026-06-01", "", "content/songs/_template.cho", "content/songs/avec-nous.cho", "content/songs/abba-pere.cho", "content/songs/notes.txt",
    ].join("\n");
    const dates = lireJournalDesAjouts(journal);
    expect(Object.fromEntries(dates)).toEqual({
      triomphe: "2026-09-27", "十字架": "2026-09-27", "avec-nous": "2026-09-26", _template: "2026-06-01", "abba-pere": "2026-06-01",
    });
  });

  test("build:index sans historique git : aucune date, pas d'erreur (dossier hors git, clone superficiel)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dates-ajout-"));
    try {
      // Hors de tout dépôt.
      const hors = path.join(tmp, "hors");
      fs.mkdirSync(path.join(hors, "content", "songs"), { recursive: true });
      expect(datesAjout(hors).size).toBe(0);

      // Un dépôt complet : les dates ; son clone superficiel : aucune (toutes seraient du jour du clone).
      const depot = path.join(tmp, "depot");
      fs.mkdirSync(path.join(depot, "content", "songs"), { recursive: true });
      const git = (cwd: string, ...args: string[]) => execFileSync("git", args, {
        cwd, stdio: "pipe",
        env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" },
      });
      git(depot, "init", "-q");
      fs.writeFileSync(path.join(depot, "content", "songs", "un.cho"), "{title: Un}\n");
      git(depot, "add", ".");
      execFileSync("git", ["commit", "-q", "-m", "un"], { cwd: depot, env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com", GIT_COMMITTER_DATE: "2026-05-02T12:00:00" } });
      fs.writeFileSync(path.join(depot, "content", "songs", "deux.cho"), "{title: Deux}\n");
      git(depot, "add", ".");
      execFileSync("git", ["commit", "-q", "-m", "deux"], { cwd: depot, env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com", GIT_COMMITTER_DATE: "2026-09-27T12:00:00" } });
      expect(Object.fromEntries(datesAjout(depot))).toEqual({ un: "2026-05-02", deux: "2026-09-27" });

      const superficiel = path.join(tmp, "superficiel");
      git(tmp, "clone", "-q", "--depth", "1", `file://${depot}`, superficiel);
      expect(datesAjout(superficiel).size).toBe(0);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("l'index porte ajouteLe : une date AAAA-MM-JJ pour un chant ajouté par git", async ({ request }) => {
    const index = await request.get("/songs-index.json").then((r) => r.json());
    const triomphe = index.songs.find((s: { slug: string }) => s.slug === "triomphe");
    expect(triomphe.ajouteLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(index.songs.every((s: Record<string, unknown>) => "ajouteLe" in s)).toBe(true);
  });
});
