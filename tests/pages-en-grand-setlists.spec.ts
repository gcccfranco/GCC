import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { equipeDuService } from "../src/lib/setlist/equipeDuService";
import type { PlanningData } from "../src/lib/planning/names";

// Lot U4 bis, tranche B2 — Setlists en grand (docs/spec-pages-en-grand.md, Q4 ; planches
// `setlists-*`). En grand (ordinateur, iPad paysage) : la liste à gauche, l'aperçu de la
// setlist choisie à droite (catégorie et date, présidence, « Présentation », thème, « Modifiée
// par… », chants, équipe du service), avec « Ouvrir » et « Mode louange » ; l'aperçu se lit
// dans l'adresse (`?apercu=<id>`, remplacée sans entrée d'historique) ; sans aperçu choisi, la
// première setlist de la liste (Q3). Tablette portrait : cartes sur deux colonnes qui listent
// leurs chants. Téléphone : inchangé. Feuilles Google, Firestore et date simulés ; personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const ENTETE_CULTE = ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono + Live", "PPT", "Orateur", "Traducteur", "Sainte cène", "Notes"];
const culte = (date: string, pres: string, piano: string) =>
  [date, pres, "Noé T.", "Inès V.", piano, "Samuel K.", "Paul D.", "Marc A.", "Rémi K.", "Hélène W.", "Jun L.", "", ""];
const FEUILLES: Record<string, string> = {
  Franco_Louange: csv([
    ENTETE_CULTE,
    culte("04/10", "Léa M.", "Ruth K."),
    culte("11/10", "Noé T.", "Yann B."),
    culte("18/10", "Hugo L.", "Ruth K."),
  ]),
};

const RUTH: FakeProfile = { uid: "uid-ruth", email: "ruth@example.com", planningName: "Ruth K.", serviceRoles: { "Culte Francophone": ["musicien"] } };

const item = (songSlug: string, position: number, keyOverride: string | null = null, notes = "") => ({
  songSlug, position, keyOverride, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes,
});
const SL1 = {
  title: "Culte du 4 octobre", leader: "Léa M.", category: "Culte Francophone", date: "2026-10-04",
  language: "mixed", notes: "Thème : la grâce.", ownerId: "uid-owner", isPrivate: false,
  presentationUrl: "https://example.com/presentation",
  items: [item("hosanna", 1, null, "Démarrer doux, piano seul sur l'intro."), item("abba-pere", 2), item("一生爱你", 3), item("a-la-croix", 4, "D"), item("向主欢呼", 5)],
};
const SL2 = {
  title: "Culte du 18 octobre", leader: "Hugo L.", category: "Culte Francophone", date: "2026-10-18",
  language: "fr", notes: "", ownerId: "uid-owner", isPrivate: false,
  items: [item("abba-pere", 1), item("hosanna", 2)],
};
const DOCS = { "setlists/sl-1": SL1, "setlists/sl-2": SL2 };

/** Jeudi 1er octobre 2026. */
async function ouvrir(page: Page, adresse = "/setlists", docs: Record<string, Record<string, unknown>> = {}) {
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    return route.fulfill({ status: 200, contentType: "text/csv", body: FEUILLES[feuille] ?? "" });
  });
  await signInAs(page, RUTH, { ...DOCS, ...docs }, adresse);
}

type Disposition = "grand" | "tablette" | "telephone";
function disposition(info: TestInfo): Disposition {
  if (info.project.name === "telephone") return "telephone";
  if (info.project.name === "tablette") return "tablette";
  return "grand"; // ordinateur (1 280 px), ordinateur-1440, tablette-paysage
}

const apercu = (page: Page) => page.getByRole("region", { name: "Aperçu de la setlist" });
const sansDefilementLateral = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const ligne = (page: Page, titre: string) => page.locator('[data-volet="liste"]').getByRole("link", { name: new RegExp(titre) });

test.describe("L'équipe du service, sans navigateur", () => {
  const vide: PlanningData = {
    culte: [], dejeuner: [], petitDej: [], paix: [], fidelite: [], bonte: [],
    edd: {} as PlanningData["edd"], campus: [], intergroupe: [], interfranco: [],
  };

  test("Culte : les rôles du planning dans l'ordre de la feuille, les cases vides absentes", () => {
    const data = { ...vide, culte: [["2026-10-04", "Léa M.", "Noé T.", "Inès V.", "Ruth K.", "Samuel K.", "", "Marc A.", "Rémi K.", "Hélène W.", "", ""]] };
    expect(equipeDuService(data, { category: "Culte Francophone", date: "2026-10-04" })).toEqual([
      ["planning.roles.presidence", "Léa M."],
      ["planning.roles.choristes", "Noé T., Inès V."],
      ["planning.roles.piano", "Ruth K."],
      ["planning.roles.guitare", "Samuel K."],
      ["planning.roles.sono", "Marc A."],
      ["planning.roles.ppt", "Rémi K."],
      ["planning.roles.orateur", "Hélène W."],
    ]);
    expect(equipeDuService(data, { category: "Culte Francophone", date: "2026-10-11" }), "pas de ligne ce jour-là").toEqual([]);
  });

  test("Groupe Fidélité : un seul planning, guitare comprise (lot F) ; Paix : la percussion", () => {
    const data = {
      ...vide,
      fidelite: [["2026-10-04", "Wang L.", "Orateur Z.", "", "Lina P.", "Joël F.", ""]],
      paix: [["2026-10-04", "Clara B.", "Joël F.", "Orateur Y.", "", "Tom R."]],
    };
    expect(equipeDuService(data, { category: "Groupe Fidélité", date: "2026-10-04" })).toEqual([
      ["planning.roles.presidence", "Wang L."],
      ["planning.roles.piano", "Lina P."],
      ["planning.roles.guitare", "Joël F."],
      ["planning.roles.orateur", "Orateur Z."],
    ]);
    expect(equipeDuService(data, { category: "Groupe Paix", date: "2026-10-04" })).toEqual([
      ["planning.roles.presidence", "Clara B."],
      ["planning.roles.musiciens", "Joël F."],
      ["planning.roles.percussion", "Tom R."],
      ["planning.roles.orateur", "Orateur Y."],
    ]);
  });

  test("Campus : la séance du moment de la setlist ; deux séances sans moment, aucune", () => {
    const seance = (d: string, pres: string) => ({ d, date: "2026-10-18", pres, ch: "Noé T.", mu: "Ruth K.", rg: "Marc A.", ent: "" });
    const data = { ...vide, campus: [seance("Dim 18/10 Matin", "Léa M."), seance("Dim 18/10 Soir", "Hugo L.")] } as unknown as PlanningData;
    expect(equipeDuService(data, { category: "Campus", date: "2026-10-18", moment: "soir" })[0]).toEqual(["planning.roles.presidence", "Hugo L."]);
    expect(equipeDuService(data, { category: "Campus", date: "2026-10-18" })).toEqual([]);
  });
});

test.describe("Setlists : les dispositions", () => {
  test("en grand : la liste à gauche, l'aperçu de la première setlist à droite, l'adresse inchangée", async ({ page }, info) => {
    test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
    await ouvrir(page);
    const a = apercu(page);
    await expect(a.getByRole("heading", { name: "Culte du 4 octobre" })).toBeVisible();
    await expect(page.locator('[data-volet="liste"]')).toBeVisible();
    await expect(a.getByText("Présidence : Léa M.")).toBeVisible();
    await expect(a.getByRole("link", { name: "Présentation" })).toHaveAttribute("href", "https://example.com/presentation");
    await expect(a.getByText("Thème : la grâce.")).toBeVisible();
    for (const titre of ["Hosanna", "Abba Père", "一生爱你", "À la croix", "向主欢呼"]) await expect(a.getByText(titre, { exact: true })).toBeVisible();
    await expect(a.getByTestId("tonalite")).toHaveCount(5);
    await expect(a.getByTestId("tonalite-origine"), "« orig. » sous une tonalité changée").toHaveCount(1);
    await expect(a.getByText("Démarrer doux, piano seul sur l'intro.")).toBeVisible();
    await expect(a.getByRole("link", { name: "Ouvrir" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?$/);
    await expect(a.getByRole("link", { name: "Mode Louange" })).toHaveAttribute("href", /^\/setlists\/sl-1\/?\?louange=1$/);
    // L'équipe du service, d'après le planning ; la personne connectée en évidence.
    const equipe = a.getByRole("region", { name: "L'équipe de ce service" });
    await expect(equipe.getByText("Hélène W.")).toBeVisible();
    await expect(equipe.getByTestId("moi")).toHaveText("Ruth K.");
    await expect(ligne(page, "Culte du 4 octobre")).toHaveAttribute("aria-current", "true");
    expect(new URL(page.url()).search, "l'adresse ne change qu'au premier toucher").toBe("");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("en grand : toucher une setlist ouvre son aperçu, l'adresse est remplacée, « Ouvrir » mène à la setlist", async ({ page }, info) => {
    test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
    await ouvrir(page);
    await expect(apercu(page).getByRole("heading", { name: "Culte du 4 octobre" })).toBeVisible();
    const historique = await page.evaluate(() => history.length);
    await ligne(page, "Culte du 18 octobre").click();
    await expect(apercu(page).getByRole("heading", { name: "Culte du 18 octobre" })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("apercu")).toBe("sl-2");
    expect(new URL(page.url()).pathname).toMatch(/^\/setlists\/?$/);
    expect(await page.evaluate(() => history.length), "remplacée, sans entrée d'historique").toBe(historique);
    await expect(ligne(page, "Culte du 18 octobre")).toHaveAttribute("aria-current", "true");
    await apercu(page).getByRole("link", { name: "Ouvrir" }).click();
    await expect(page).toHaveURL(/\/setlists\/sl-2\/?$/);
  });

  test("en grand : une adresse avec ?apercu= ouvre cet aperçu", async ({ page }, info) => {
    test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
    await ouvrir(page, "/setlists?apercu=sl-2");
    await expect(apercu(page).getByRole("heading", { name: "Culte du 18 octobre" })).toBeVisible();
    await expect(apercu(page).getByText("Présidence : Hugo L.")).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("apercu"), "l'aperçu reste dans l'adresse").toBe("sl-2");
  });

  // Relecture du lot : l'aperçu suit la règle d'affichage de la page (canSeeSetlist) ; une
  // adresse ne montre pas une setlist d'un service où l'on n'est pas.
  test("en grand : ?apercu= d'une setlist d'un service où l'on n'est pas ne l'ouvre pas", async ({ page }, info) => {
    test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
    const CAMPUS = { ...SL2, title: "Campus du 11 octobre", category: "Campus", date: "2026-10-11", leader: "Noé T." };
    await ouvrir(page, "/setlists?apercu=sl-campus", { "setlists/sl-campus": CAMPUS });
    await expect(apercu(page).getByRole("heading", { name: "Culte du 4 octobre" }), "la première de la liste, à la place").toBeVisible();
    await expect(page.getByText("Campus du 11 octobre")).toHaveCount(0);
  });

  // Relecture du lot : en grand, la liste défile dans son volet, pas dans la fenêtre ; sa position
  // revient au retour d'une setlist ouverte, comme celle de la fenêtre avant le lot.
  test("en grand : la position de la liste dans son volet revient au retour d'une setlist", async ({ page }, info) => {
    test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
    const miennes = Object.fromEntries(Array.from({ length: 30 }, (_, i) => {
      const date = `2026-10-${String(i + 2).padStart(2, "0")}`;
      return [`setlists/sl-r${i}`, { ...SL2, title: `Répétition ${i + 1}`, date, ownerId: "uid-ruth" }];
    }));
    await ouvrir(page, "/setlists", miennes);
    const volet = page.locator('[data-volet="liste"]');
    await expect(ligne(page, "Répétition 30")).toBeAttached();
    await volet.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const position = await volet.evaluate((el) => el.scrollTop);
    expect(position, "la liste défile dans son volet").toBeGreaterThan(200);
    await ligne(page, "Répétition 30").click();
    await expect(apercu(page).getByRole("heading", { name: "Répétition 30" })).toBeVisible();
    await apercu(page).getByRole("link", { name: "Ouvrir" }).click();
    await expect(page).toHaveURL(/\/setlists\/sl-r29\/?$/);
    await page.goBack();
    await expect(apercu(page).getByRole("heading", { name: "Répétition 30" })).toBeVisible();
    await expect.poll(() => volet.evaluate((el) => el.scrollTop), "la liste revient où elle était").toBeGreaterThan(position - 50);
  });

  test("tablette portrait : cartes sur deux colonnes qui listent leurs chants ; toucher ouvre la setlist", async ({ page }, info) => {
    test.skip(disposition(info) !== "tablette", "tablette portrait");
    await ouvrir(page);
    const cartes = page.getByTestId("carte-setlist");
    await expect(cartes).toHaveCount(2);
    await expect(cartes.first().getByText("一生爱你", { exact: true })).toBeVisible();
    await expect(cartes.first().getByTestId("tonalite")).toHaveCount(5);
    const [b1, b2] = [(await cartes.nth(0).boundingBox())!, (await cartes.nth(1).boundingBox())!];
    expect(b2.x, "deux colonnes").toBeGreaterThan(b1.x + b1.width - 1);
    expect(Math.abs(b2.y - b1.y)).toBeLessThan(2);
    expect(await sansDefilementLateral(page), "pas de défilement horizontal").toBe(true);
    await expect(apercu(page)).toHaveCount(0);
    await cartes.first().getByRole("link", { name: /Culte du 4 octobre/ }).click();
    await expect(page).toHaveURL(/\/setlists\/sl-1\/?$/);
  });

  test("téléphone : inchangé, une ligne par setlist, toucher ouvre la setlist", async ({ page }, info) => {
    test.skip(disposition(info) !== "telephone", "téléphone");
    await ouvrir(page);
    await expect(page.getByRole("link", { name: /Culte du 4 octobre/ })).toBeVisible();
    await expect(page.getByTestId("carte-setlist")).toHaveCount(0);
    await expect(page.getByText("一生爱你", { exact: true }), "les chants ne sont pas listés").toHaveCount(0);
    await expect(apercu(page)).toHaveCount(0);
    expect(await sansDefilementLateral(page), "pas de défilement horizontal").toBe(true);
    await page.getByRole("link", { name: /Culte du 4 octobre/ }).click();
    await expect(page).toHaveURL(/\/setlists\/sl-1\/?$/);
  });

  test("en 中文 : l'aperçu et l'équipe traduits", async ({ page }, info) => {
    test.skip(disposition(info) !== "grand", "deux volets : ordinateur et iPad paysage");
    await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
    await ouvrir(page);
    await expect(page.getByRole("region", { name: "歌单预览" }).getByRole("region", { name: "本次服事团队" })).toBeVisible();
  });
});
