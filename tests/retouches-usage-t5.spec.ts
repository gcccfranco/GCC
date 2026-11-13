import { expect, test, type Page } from "@playwright/test";
import { musicien, remplit, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirAvecBarre } from "./helpers/agencement";
import { ouvrirPartitions } from "./helpers/setlist";
import { ADMIN_EMAILS } from "../src/lib/access";

// Lot 1 du rapport d'usage, tranche T5 (docs/spec-retouches-usage.md) : les textes ne sont plus coupés
// (`line-clamp-2` ou retour à la ligne à la place de `truncate`), « Non publié » s'écrit une fois en tête,
// la barre de la setlist garde un libellé court à côté de la barre latérale dépliée. Mesures dans la page :
// `scrollWidth <= clientWidth` pour chaque texte. Feuilles Google, Firestore et date simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"],
  ["20/09", "Maëlle Dubois-Tremblay", "Noé T.", "Inès V.", "Ruth K.", "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "", "", ""],
  ["27/09", "Léa M.", "Noé T.", "Inès V.", "Ruth K.", "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "", "", ""],
  ["04/10", "Hugo L.", "Noé T.", "Inès V.", "Yann B.", "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "", "Léa M.", ""],
  ["11/10", "Léa M.", "Noé T.", "Inès V.", "Yann B.", "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "", "", ""],
]);
const sheets = (page: Page, corps: string = CULTE) =>
  page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: feuille === "Franco_Louange" ? corps : "" });
  });

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", planningName: "Jo L.", ...musicien("piano") };
const PUBLIEUR: FakeProfile = { uid: "uid-pub", email: "pub@example.com", planningName: "Mia P.", ...remplit("culte") };
const ADMIN: FakeProfile = { uid: "u-admin", email: ADMIN_EMAILS[0], firstName: "Admin", lastName: "T.", planningName: "Lou M." };
const RUTH: FakeProfile = {
  uid: "uid-ruth", email: "ruth@example.com", firstName: "Ruth", lastName: "Kouassi", planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

/** Aucun texte coupé : le contenu de chaque élément tient dans sa boîte, et sa police atteint 12 px. */
async function textesEntiers(page: Page, selecteur: string, quoi: string) {
  const mesures = await page.locator(selecteur).filter({ visible: true }).evaluateAll((els) =>
    els.map((el) => ({
      texte: (el.textContent ?? "").trim().slice(0, 40),
      coupe: el.scrollWidth > el.clientWidth + 1,
      police: parseFloat(getComputedStyle(el).fontSize),
      points: getComputedStyle(el).textOverflow === "ellipsis",
    })),
  );
  expect(mesures.length, `${quoi} : au moins un texte mesuré`).toBeGreaterThan(0);
  for (const m of mesures) {
    expect(m.coupe, `${quoi} : « ${m.texte} » tient dans sa boîte`).toBe(false);
    expect(m.points, `${quoi} : « ${m.texte} » sans points de suspension`).toBe(false);
    expect(m.police, `${quoi} : « ${m.texte} » à 12 px au moins`).toBeGreaterThanOrEqual(12);
  }
}

test("chants-6 : un chant ZH, la ligne pinyin · artiste passe à la ligne sans couper le pinyin", async ({ page }) => {
  await page.goto("/songs");
  const ligne = page.locator('li[id^="song-li-"]').filter({ hasText: "Wǒ xū yào yǒu nǐ zài wǒ shēng mìng zhòng" }).first();
  await ligne.scrollIntoViewIfNeeded();
  const pinyin = ligne.getByText("Wǒ xū yào yǒu nǐ zài wǒ shēng mìng zhòng", { exact: true });
  await expect(pinyin).toBeVisible();
  const m = await ligne.locator("a > span").first().locator("span").nth(1).evaluate((ligneTexte) => {
    const spans = [...ligneTexte.querySelectorAll("span")];
    return {
      coupes: spans.filter((s) => s.scrollWidth > s.clientWidth + 1).length,
      points: spans.filter((s) => getComputedStyle(s).textOverflow === "ellipsis").length,
      enveloppe: getComputedStyle(ligneTexte).flexWrap,
    };
  });
  expect(m.enveloppe, "la ligne passe à la ligne").toBe("wrap");
  expect(m.coupes, "aucun morceau coupé").toBe(0);
  expect(m.points, "sans points de suspension").toBe(0);
  await expect(ligne.getByText("葛兆昕、陈慧琴")).toBeVisible();
});

test("musiciens-1 : le nom d'un son du RD-2000 ne se casse plus en pleine syllabe", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: CULTE }));
  await signInAs(page, JO, {}, "/harmonie/rd2000");
  const noms = page.locator("[data-son] + span[lang='fr']");
  await expect(noms.first()).toBeVisible();
  const m = await noms.evaluateAll((els) => els.map((el) => ({
    texte: el.textContent ?? "",
    coupe: el.scrollWidth > el.clientWidth + 1,
    casse: getComputedStyle(el).overflowWrap,
  })));
  for (const n of m) {
    expect(n.casse, `« ${n.texte} » : pas de coupure n'importe où`).not.toBe("anywhere");
    expect(n.coupe, `« ${n.texte} » tient dans sa boîte`).toBe(false);
  }
});

test("musiciens-7 : le sous-titre des lignes du catalogue passe à la ligne (deux lignes au plus, trois dans le volet de 280 px)", async ({ page }) => {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: CULTE }));
  await signInAs(page, JO, {}, "/harmonie");
  const ambiances = page.locator("[data-harmonie] a > span.min-w-0 > span:last-child").filter({ visible: true });
  await expect(ambiances.first()).toBeVisible();
  const m = await ambiances.evaluateAll((els) => els.map((el) => {
    const s = getComputedStyle(el);
    return {
      texte: (el.textContent ?? "").slice(0, 40),
      coupe: el.scrollWidth > el.clientWidth + 1,
      nowrap: s.whiteSpace === "nowrap",
      points: s.textOverflow === "ellipsis",
      lignes: Math.round(el.getBoundingClientRect().height / parseFloat(s.lineHeight)),
      police: parseFloat(s.fontSize),
    };
  }));
  // H6-1 : le volet de liste fait 280 px en deux volets (fiche ≥ 640 px) ; le texte entier prime, trois lignes y sont permises.
  const auPlus = (await page.locator("[data-deux-volets]").count()) > 0 ? 3 : 2;
  for (const n of m) {
    expect(n.nowrap, `« ${n.texte} » : retour à la ligne permis`).toBe(false);
    expect(n.points, `« ${n.texte} » : sans points de suspension`).toBe(false);
    expect(n.coupe, `« ${n.texte} » tient dans sa boîte`).toBe(false);
    expect(n.lignes, `« ${n.texte} » : ${auPlus} lignes au plus`).toBeLessThanOrEqual(auPlus);
    expect(n.police).toBeGreaterThanOrEqual(12);
  }
});

// ─── Planning : cellule Date, intitulés de poste, « Non publié » ─────────────

/** Vendredi 18/09/2026 : dimanche courant 20/09, trimestre T3 publié ; le T4 est un brouillon. */
async function ouvrirPlanning(page: Page, to: string) {
  await page.clock.setFixedTime(new Date("2026-09-18T10:00:00"));
  await sheets(page);
  await signInAs(page, PUBLIEUR, {}, to);
}

test("services-4, bo-messages-planning-1 : la cellule Date ne couvre pas la Présidence", async ({ page }, info) => {
  test.skip(info.project.name === "telephone", "la table : ordinateur et tablette ; le téléphone a des cartes");
  await ouvrirPlanning(page, "/back-office/planning/culte");
  const date = page.locator('[data-date-cell="2026-09-20"]').filter({ visible: true });
  const presidence = page.locator('[data-case="2026-09-20|presidence"]').filter({ visible: true });
  await expect(date).toBeVisible();
  await expect(presidence).toBeVisible();
  expect(await date.evaluate((el) => getComputedStyle(el).whiteSpace), "les étiquettes passent à la ligne").not.toBe("nowrap");
  expect(await date.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "le contenu de la date tient dans sa case").toBe(true);
  const [d, p] = await Promise.all([date.boundingBox(), presidence.boundingBox()]);
  expect(d!.x + d!.width, "la cellule Date finit avant la Présidence").toBeLessThanOrEqual(p!.x + 1);
  // Chaque étiquette de la date reste dans la cellule.
  const hors = await date.evaluate((el) => {
    const c = el.getBoundingClientRect();
    return [...el.querySelectorAll("div, span")].filter((e) => e.getBoundingClientRect().right > c.right + 1).length;
  });
  expect(hors, "aucune étiquette ne déborde de la cellule Date").toBe(0);
});

test("bo-messages-planning-2 : les intitulés de poste tiennent sur deux lignes au plus", async ({ page }, info) => {
  test.skip(info.project.name === "telephone", "la table : ordinateur et tablette ; le téléphone a des cartes");
  await ouvrirPlanning(page, "/back-office/planning/culte");
  await expect(page.locator("[data-poste]").first()).toBeVisible();
  await textesEntiers(page, "[data-poste]", "intitulés de poste");
  const lignes = await page.locator("[data-poste]").evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))));
  for (const n of lignes) expect(n, "deux lignes au plus").toBeLessThanOrEqual(2);
});

test("bo-messages-planning-1 : « Non publié » une fois en tête quand tout le trimestre est en brouillon", async ({ page }) => {
  await ouvrirPlanning(page, "/back-office/planning/culte");
  await page.getByRole("tab", { name: "T4" }).click();
  await expect(page.locator('[data-case^="2026-10-04"]').filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator("[data-non-publie-trimestre]"), "une mention en tête").toHaveCount(1);
  await expect(page.locator("[data-non-publie-trimestre]")).toContainText("Non publié");
  await expect(page.locator("[data-non-publie]"), "plus sur chaque ligne").toHaveCount(0);
  await page.getByRole("tab", { name: "T3" }).click();
  await expect(page.locator("[data-non-publie-trimestre]"), "le T3 est publié : pas de mention").toHaveCount(0);
});

test("bo-messages-planning-1 : « Non publié » en chinois", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await ouvrirPlanning(page, "/back-office/planning/culte");
  await page.getByRole("tab", { name: "T4" }).click();
  await expect(page.locator("[data-non-publie-trimestre]")).toContainText("尚未发布");
});

// ─── Calendrier : titre de réunion dans la case du mois ──────────────────────

test("bo-reunions-taches-10 : un long titre de réunion passe sur deux lignes dans la case du mois", async ({ page }, info) => {
  test.skip(info.project.name === "telephone", "le téléphone affiche des points colorés (GrillePoints), sans titre dans la case");
  const MAINTENANT = "2026-09-01T10:00:00Z";
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await signInAs(page, ADMIN, {
    "evenements/reu-longue": {
      titre: "Réunion de coordination des équipes de louange et d'accueil", type: "reunion", pour: "eglise", date: "2026-10-14", heure: "20:00",
      lieu: "Salle 2", organisateurUid: "u-autre", organisateurNom: "Autre", inscrits: 0, createdAt: MAINTENANT, updatedAt: MAINTENANT,
    },
  }, "/back-office/calendrier");
  const pastille = page.locator('[data-jour="2026-10-14"] [data-source]').first();
  await expect(pastille).toBeVisible();
  const titre = pastille.locator("span.line-clamp-2");
  await expect(titre).toBeVisible();
  const m = await titre.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      coupeEnLargeur: el.scrollWidth > el.clientWidth + 1,
      lignes: Math.round(el.getBoundingClientRect().height / parseFloat(s.lineHeight)),
      nowrap: s.whiteSpace === "nowrap",
      police: parseFloat(s.fontSize),
    };
  });
  expect(m.nowrap, "retour à la ligne permis").toBe(false);
  expect(m.coupeEnLargeur, "le titre tient dans sa boîte").toBe(false);
  expect(m.lignes, "deux lignes au plus").toBeLessThanOrEqual(2);
  expect(m.police).toBeGreaterThanOrEqual(12);
});

// ─── Setlist : la barre d'outils garde un libellé court (dimanche-9) ─────────

test("dimanche-9 : ordinateur à 1 100 px, barre latérale dépliée, chaque pilule de la setlist garde un libellé", async ({ page }, info) => {
  test.skip(!info.project.name.startsWith("ordinateur"), "pointeur fin : projets ordinateur seulement");
  await page.setViewportSize({ width: 1100, height: 900 });
  await ouvrirAvecBarre(page, "depliee");
  const item = (songSlug: string, position: number) => ({
    keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", songSlug, position,
  });
  const setlist = {
    title: "Culte du 20 septembre", leader: "Léa M.", category: "Culte Francophone", date: "2026-09-20", language: "mixed",
    notes: "", ownerId: "uid-ruth", isPrivate: false, items: [item("abba-pere", 1), item("爱的约定", 2)],
  };
  await signInAs(page, RUTH, { "setlists/sl-t5": setlist }, "/setlists/sl-t5");
  await ouvrirPartitions(page);
  const barre = page.getByTestId("barre-outils");
  await expect(barre.getByRole("button", { name: "Affichage" })).toBeVisible();
  // La rangée a moins de 880 px : pas de libellé long, un libellé court sous l'icône, jamais l'icône seule.
  const rangee = await page.locator(".rangee-outils").first().evaluate((el) => el.clientWidth);
  expect(rangee, "la rangée est sous le seuil de 880 px").toBeLessThan(880);
  const pilules = await barre.locator("button[aria-label], a[aria-label]").evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).offsetParent !== null && el.querySelector("svg") && el.textContent !== null)
      .map((el) => {
        const vu = [...el.querySelectorAll("span")].filter((s) => (s as HTMLElement).offsetParent !== null && (s.textContent ?? "").trim());
        const r = (el as HTMLElement).getBoundingClientRect();
        return { nom: el.getAttribute("aria-label") ?? "", libelle: vu.map((s) => (s.textContent ?? "").trim()).join(""), droite: r.right, police: vu.length ? parseFloat(getComputedStyle(vu[0]).fontSize) : 0 };
      }),
  );
  const nommees = pilules.filter((p) => /Affichage|Crayon|Accords|Mode Louange|Mode louange/i.test(p.nom));
  expect(nommees.length, "Affichage, Crayon, Accords, Mode louange").toBeGreaterThanOrEqual(4);
  for (const p of nommees) {
    expect(p.libelle, `« ${p.nom} » a un libellé visible`).not.toBe("");
    expect(p.police, `« ${p.nom} » : 12 px au moins`).toBeGreaterThanOrEqual(12);
    expect(p.droite, `« ${p.nom} » ne sort pas de la fenêtre`).toBeLessThanOrEqual(1100);
  }
  expect(await barre.evaluate((el) => el.scrollWidth <= el.clientWidth), "la barre ne déborde pas").toBe(true);
});
