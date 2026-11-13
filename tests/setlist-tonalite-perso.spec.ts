import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs, type FakeDb, type FakeProfile } from "./helpers/fakeSession";
import { marge, ouvrirMarge } from "./helpers/marge";
import { enDeuxVolets, ouvrirPartitions } from "./helpers/setlist";

// Lot RU, RU-4 (docs/spec-reglages-unifies.md) : la vue d'une setlist. L'armure remplace la lettre de tonalité (tonalité
// personnelle par setlist et par appareil, la même clé que le mode louange), la marge « Affichage » remplace le menu,
// « Accords » reste à un toucher dans la barre. Un chant FR (Abba Père, équipe en G) et un chant ZH (一生爱你, en E).

const SETLIST_ID = "setlist-tonalite-perso";
const CLE = "perf-personal-keys";
const EDITEUR: FakeProfile = {
  uid: "uid-editrice-tonalite",
  email: "editrice.tonalite@example.com",
  planningName: "Test E.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (over: Record<string, unknown>) => ({
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
  ...over,
});

const setlist = (ownerId: string) => ({
  title: "Culte de la tonalité",
  leader: "Présidence T.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "",
  ownerId,
  isPrivate: false,
  items: [
    item({ songSlug: "abba-pere", position: 1, keyOverride: "G", structureOverride: ["verse-2-0", "chorus-3-1", "chorus-3-2"] }),
    item({ songSlug: "一生爱你", position: 2, jianpuSheet: true, structureOverride: ["verse-2-0", "chorus-3-1"] }),
  ],
});

type Langue = "fr" | "zh";

async function ouvrir(page: Page, ownerId: string, langue: Langue = "fr"): Promise<FakeDb> {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript((l) => {
    localStorage.setItem("accords-aide-vue", "1");
    if (l === "zh") localStorage.setItem("i18nextLng", "zh-CN");
  }, langue);
  const db = await signInAs(page, EDITEUR, { [`setlists/${SETLIST_ID}`]: setlist(ownerId) }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  return db;
}

const chant = (page: Page, n: number) => page.locator(`[data-outline-item="${n}"]`);
const armure = (page: Page, n: number) => chant(page, n).getByTestId("armure");
const barre = (page: Page) => page.getByTestId("barre-outils");
const cles = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), CLE);
const ecritures = (db: FakeDb) => db.writes.filter((w) => w.path.startsWith("setlists/"));
/** La touche d'une tonalité dans la fenêtre de l'armure (« E » ne prend pas « E♭ »). */
const touche = (page: Page, k: string): Locator => page.getByTestId("fenetre-armure").getByRole("radio", { name: new RegExp(`^${k}(?![♭♯])`) });

async function choisir(page: Page, n: number, k: string) {
  // La fenêtre d'avant doit être partie : sinon deux fenêtres (et deux touches « G ») coexistent un instant.
  await expect(page.getByTestId("fenetre-armure")).toHaveCount(0);
  await armure(page, n).click();
  await touche(page, k).click();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("fenetre-armure")).toHaveCount(0);
}

test.describe("armure et tonalité personnelle", () => {
  test("(a) l'armure suit le titre ; choisir une tonalité transpose, écrit perf-personal-keys, aucune écriture de la setlist, « équipe G » ; retenue au rechargement", async ({ page }) => {
    const db = await ouvrir(page, EDITEUR.uid);
    // L'armure est à côté du titre, plus de lettre colorée seule : celle de l'équipe (G) est au contour.
    await expect(armure(page, 1)).toHaveText("G");
    await expect(armure(page, 1)).toHaveAttribute("data-armure", "equipe");
    await expect(chant(page, 1).getByTestId("tonalite-equipe")).toHaveCount(0);
    await expect(armure(page, 2)).toHaveText("1=E");
    const titre = (await chant(page, 1).getByRole("heading", { level: 1 }).first().boundingBox())!;
    const a = (await armure(page, 1).boundingBox())!;
    expect(Math.abs(a.y + a.height / 2 - (titre.y + titre.height / 2)), "l'armure est sur la ligne du titre").toBeLessThan(30);
    // Abba Père en G : F#m devient Em.
    await expect(chant(page, 1).getByText("Em", { exact: true }).first()).toBeVisible();

    await choisir(page, 1, "E");
    await expect(armure(page, 1)).toHaveText("E");
    await expect(armure(page, 1)).toHaveAttribute("data-armure", "moi");
    await expect(chant(page, 1).getByTestId("tonalite-equipe")).toHaveText("équipe G");
    await expect(chant(page, 1).getByText("Em", { exact: true })).toHaveCount(0);
    await expect(chant(page, 1).getByText(/^C[#♯]m$/).first()).toBeVisible();
    expect((await cles(page))[SETLIST_ID]).toEqual({ "abba-pere": "E" });
    expect(ecritures(db), "aucune écriture de la setlist").toEqual([]);

    // Le chant ZH : « 1=E » → « 1=G », même clé de stockage.
    await choisir(page, 2, "G");
    await expect(armure(page, 2)).toHaveText("1=G");
    await expect(chant(page, 2).getByTestId("tonalite-equipe")).toHaveText("équipe E");
    expect((await cles(page))[SETLIST_ID]).toEqual({ "abba-pere": "E", "一生爱你": "G" });
    expect(ecritures(db)).toEqual([]);

    await page.reload();
    await ouvrirPartitions(page);
    await expect(armure(page, 1)).toHaveText("E");
    await expect(armure(page, 1)).toHaveAttribute("data-armure", "moi");
    await expect(armure(page, 2)).toHaveText("1=G");
    expect(ecritures(db)).toEqual([]);

    // Revenir à la tonalité de l'équipe : la clé personnelle est oubliée.
    await choisir(page, 1, "G");
    await expect(armure(page, 1)).toHaveAttribute("data-armure", "equipe");
    await expect(chant(page, 1).getByTestId("tonalite-equipe")).toHaveCount(0);
    expect((await cles(page))[SETLIST_ID]).toEqual({ "一生爱你": "G" });
  });

  test("(a) en chinois, la mention est « 团队 G »", async ({ page }) => {
    await ouvrir(page, EDITEUR.uid, "zh");
    await choisir(page, 1, "E");
    await expect(chant(page, 1).getByTestId("tonalite-equipe")).toHaveText("团队 G");
  });

  test("(b) l'éditeur : « Changer pour toute l'équipe » écrit keyOverride et efface la clé personnelle", async ({ page }) => {
    const db = await ouvrir(page, EDITEUR.uid);
    await choisir(page, 1, "E");
    expect(ecritures(db)).toEqual([]);
    await armure(page, 1).click();
    await page.getByTestId("fenetre-armure").getByRole("button", { name: "Changer pour toute l'équipe" }).click();
    await expect.poll(() => ecritures(db).some((w) => w.method === "PATCH" && JSON.stringify(w.data).includes('"E"')), { timeout: 10_000 }).toBe(true);
    await expect.poll(() => (db.doc(`setlists/${SETLIST_ID}`)?.items as { keyOverride: string | null }[])[0].keyOverride).toBe("E");
    await page.keyboard.press("Escape");
    await expect(armure(page, 1)).toHaveAttribute("data-armure", "equipe");
    await expect(armure(page, 1)).toHaveText("E");
    expect((await cles(page))[SETLIST_ID] ?? {}).toEqual({});
  });

  test("(b) sans droit d'éditer : pas de « Changer pour toute l'équipe », la transposition reste personnelle", async ({ page }) => {
    const db = await ouvrir(page, "uid-autre-createur");
    await armure(page, 1).click();
    await expect(page.getByTestId("fenetre-armure")).toBeVisible();
    await expect(page.getByTestId("fenetre-armure").getByRole("button", { name: "Changer pour toute l'équipe" })).toHaveCount(0);
    await touche(page, "E").click();
    await page.keyboard.press("Escape");
    await expect(armure(page, 1)).toHaveText("E");
    expect((await cles(page))[SETLIST_ID]).toEqual({ "abba-pere": "E" });
    expect(ecritures(db)).toEqual([]);
  });

  test("la Liste montre la tonalité jouée en texte encre, avec « équipe G » si elle diffère", async ({ page }) => {
    const db = await ouvrir(page, EDITEUR.uid);
    test.skip(await enDeuxVolets(page), "deux volets : pas de liste, le sommaire en tient lieu");
    await choisir(page, 1, "E");
    await page.getByRole("button", { name: /^(Liste|曲目列表)$/ }).first().click();
    const ligne = page.locator('[data-ligne="1"]');
    await expect(ligne.getByTestId("tonalite")).toHaveText("E");
    await expect(ligne.getByTestId("tonalite-equipe")).toHaveText("équipe G");
    expect(ecritures(db)).toEqual([]);
  });
});

test.describe("marge Affichage de la setlist", () => {
  test("(c) Affichage ouvre la marge sans « Je joue » ; colonne : rien de la musique dessous, sinon feuille d'au plus 40 % de la hauteur", async ({ page }) => {
    await ouvrir(page, EDITEUR.uid);
    await ouvrirMarge(page);
    const m = marge(page);
    await expect(m.getByRole("radiogroup", { name: "Je joue" })).toHaveCount(0);
    await expect(m.getByRole("heading", { name: "Ce que je lis" })).toBeVisible();
    await expect(m.getByRole("switch", { name: "Pinyin" })).toBeVisible();
    const boite = (await m.boundingBox())!;
    if ((await m.getAttribute("data-place")) === "colonne") {
      const blocs = await page.locator("[data-outline-item]").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right));
      expect(blocs.length).toBeGreaterThan(0);
      for (const droite of blocs) expect(droite, "la musique finit avant la marge").toBeLessThanOrEqual(boite.x + 0.5);
    } else {
      expect(boite.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.4 + 1);
    }
    // Échap la ferme, le focus revient au bouton.
    await page.keyboard.press("Escape");
    await expect(m).toHaveAttribute("data-ouvert", "false");
  });

  test("la taille du texte de la marge s'applique aux partitions, comme sur la page chant", async ({ page }) => {
    await ouvrir(page, EDITEUR.uid);
    const avant = (await chant(page, 1).boundingBox())!.height;
    await ouvrirMarge(page);
    await page.getByRole("button", { name: "Agrandir le texte" }).click();
    await expect.poll(async () => (await chant(page, 1).boundingBox())!.height).toBeGreaterThan(avant);
    expect(await page.evaluate(() => localStorage.getItem("perf-font-scale"))).toBe("1.1");
  });
});

for (const largeur of [390, 412]) {
  for (const langue of ["fr", "zh"] as const) {
    test(`(d) ${largeur} px, ${langue} : Accords se bascule à un toucher dans la barre, la barre tient sur une ligne`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 844 });
      await ouvrir(page, EDITEUR.uid, langue);
      const accords = barre(page).getByRole("button", { name: langue === "zh" ? "和弦" : "Accords", exact: true });
      await expect(accords).toBeVisible();
      await expect(barre(page).getByRole("button", { name: langue === "zh" ? "显示" : "Affichage", exact: true })).toBeVisible();
      // La barre de la vue Partitions, puis celle de la Liste : une seule ligne, rien ne déborde.
      for (const vue of ["partitions", "liste"] as const) {
        if (vue === "liste") await page.getByRole("button", { name: /^(Liste|曲目列表)$/ }).first().click();
        const rangee = (await barre(page).locator(".rangee-outils").boundingBox())!;
        const boites = await barre(page).locator(".rangee-outils a, .rangee-outils button").evaluateAll((els) =>
          els.filter((e) => e.getClientRects().length > 0).map((e) => { const r = e.getBoundingClientRect(); return { centre: r.top + r.height / 2, haut: r.top, bas: r.bottom, droite: r.right }; }));
        expect(boites.length).toBeGreaterThanOrEqual(4);
        for (const b of boites) {
          expect(Math.abs(b.centre - boites[0].centre), "même ligne").toBeLessThanOrEqual(2);
          expect(b.haut).toBeGreaterThanOrEqual(rangee.y - 0.5);
          expect(b.bas).toBeLessThanOrEqual(rangee.y + rangee.height + 0.5);
          expect(b.droite, "dans l'écran").toBeLessThanOrEqual(largeur + 0.5);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      }
      await page.getByRole("button", { name: /^(Partitions|歌谱预览)$/ }).first().click();
      await expect(chant(page, 1)).toBeVisible();
      await expect(accords).toHaveAttribute("aria-pressed", "true");
      await expect(chant(page, 1).getByText("Em", { exact: true }).first()).toBeVisible();
      await accords.click();
      await expect(accords).toHaveAttribute("aria-pressed", "false");
      await expect(chant(page, 1).getByText("Em", { exact: true })).toHaveCount(0);
      // Le ⋯ n'a plus de copie d'Accords ni d'Affichage.
      await barre(page).getByRole("button", { name: /Plus d'actions|更多操作/ }).click();
      await expect(page.getByRole("menuitemcheckbox", { name: /^(Accords|和弦)$/ })).toHaveCount(0);
      await expect(page.getByRole("menuitem", { name: /^(Affichage|显示)$/ })).toHaveCount(0);
    });
  }
}
