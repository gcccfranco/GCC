import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { fakeFirestore, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, lireCompteur, ouvrirMenu, type Langue } from "./helpers/louange";

// PU-6 (docs/spec-entree-musiciens.md) : « ‹ Toutes mes setlists » dans le menu Setlist du mode louange. Le menu déplie les
// setlists à venir lisibles par le compte : « Mes services » d'abord (d'après le Sheet du planning), puis les autres,
// chacune par date ; un toucher ouvre l'autre setlist en mode louange sur son premier chant. Hors ligne : seulement les copies
// gardées. Sheet, comptes et setlists simulés, noms inventés ; aucune vraie base.
test.use({ serviceWorkers: "block", deviceScaleFactor: 1 });

const AUJOURDHUI = new Date(2026, 10, 9);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jjmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const SERVICE_1 = new Date(2026, 10, 15);
const SERVICE_2 = new Date(2026, 10, 22);

const COURANTE = "setlist-courante";
const MIENNE_1 = "setlist-service-1";
const MIENNE_2 = "setlist-service-2";
const AUTRE_FR = "setlist-priere";
const AUTRE_ZH = "setlist-chinois";
const PASSEE = "setlist-passee";

const PRESIDENT = "Basile Corbin";
const MUSICIENNE: FakeProfile = {
  uid: "uid-toutes-setlists", email: "toutes-setlists@example.com", firstName: "Maelle", lastName: "Tournesol",
  planningName: "Maelle Tournesol", dansEquipes: ["louange"], sousEquipes: ["musiciens"],
  lieuxLouange: ["Culte Francophone"], joue: ["piano"],
};
const SANS_COMPTE_ID = "setlist-sans-compte";

const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const setlist = (o: { title: string; date: Date; category: string; slugs: string[]; language?: string }) => ({
  title: o.title, leader: PRESIDENT, category: o.category, date: iso(o.date), language: o.language ?? "mixed",
  notes: "", ownerId: "uid-autre", isPrivate: false, items: o.slugs.map((s, i) => item(s, i + 1)),
});

const DOCS: Record<string, Record<string, unknown>> = {
  [`setlists/${COURANTE}`]: setlist({ title: "Culte de la courante", date: new Date(2026, 10, 8), category: "Culte Francophone", slugs: ["a-jamais-tu-es-saint", "abba-pere"] }),
  [`setlists/${MIENNE_1}`]: setlist({ title: "Culte du dimanche 15", date: SERVICE_1, category: "Culte Francophone", slugs: ["abba-pere", "abrite-moi"] }),
  [`setlists/${MIENNE_2}`]: setlist({ title: "Culte du dimanche 22", date: SERVICE_2, category: "Culte Francophone", slugs: ["abrite-moi"] }),
  [`setlists/${AUTRE_FR}`]: setlist({ title: "Soirée de prière d'essai", date: new Date(2026, 10, 12), category: "Culte Francophone", slugs: ["abrite-moi", "abba-pere"] }),
  [`setlists/${AUTRE_ZH}`]: setlist({ title: "Culte en chinois d'essai", date: new Date(2026, 10, 20), category: "Culte Francophone", slugs: ["一切都更新", "一生敬拜你"], language: "zh" }),
  [`setlists/${PASSEE}`]: setlist({ title: "Culte du 18 octobre d'essai", date: new Date(2026, 9, 18), category: "Culte Francophone", slugs: ["abba-pere"] }),
};

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
/** Le Sheet : deux dimanches Franco où la musicienne joue le piano ; le reste vide. */
async function simulerSheet(page: Page) {
  const suivi = { n: 0 };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    suivi.n++;
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    const rows = sheet === "Franco_Louange"
      ? [["DATE"], [jjmm(SERVICE_1), PRESIDENT, "", "", MUSICIENNE.planningName!, "", ""], [jjmm(SERVICE_2), PRESIDENT, "", "", MUSICIENNE.planningName!, "", ""]]
      : [];
    return route.fulfill({ status: 200, contentType: "text/csv", body: csv(rows) });
  });
  return suivi;
}
async function attendreSheet(page: Page, suivi: { n: number }) {
  await expect.poll(() => suivi.n, { timeout: 20_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1_000);
}

type Options = { langue?: Langue; theme?: "light" | "dark"; to?: string };
/** Ouvre la page (par défaut le mode louange de la setlist courante) connectée ; rend le suivi du Sheet. */
async function ouvrir(page: Page, o: Options = {}) {
  const { langue = "fr", theme = "light", to = `/setlists/${COURANTE}?louange=1` } = o;
  await page.clock.setFixedTime(new Date(`${iso(AUJOURDHUI)}T10:00:00`));
  await page.addInitScript(([zh, th]) => {
    try {
      localStorage.setItem("perf-role-preset", "pianiste");
      if (zh) localStorage.setItem("i18nextLng", "zh-CN");
      localStorage.setItem("perf-theme", th as string);
      // Texte agrandi : pas de gestes qui tournent la page pendant les essais.
      localStorage.setItem("perf-font-scale", "1.5");
    } catch { /* ignore */ }
  }, [langue === "zh", theme]);
  const suivi = await simulerSheet(page);
  await signInAs(page, MUSICIENNE, DOCS, to);
  await attendreSheet(page, suivi);
  return suivi;
}

const barre = (page: Page) => page.locator("[data-performance-mode] [data-barre-haut]");
/** Les setlists de la ligne `[data-autre-setlist]`, dans l'ordre affiché. */
const idsAffiches = (dialogue: ReturnType<Page["getByRole"]>) =>
  dialogue.locator("[data-autre-setlist]").evaluateAll((els) => els.map((e) => e.getAttribute("data-autre-setlist")));

test.describe("« Toutes mes setlists » dans le menu Setlist", () => {
  test("« Mes autres setlists » est sous la setlist en cours, toujours dépliée, sans tourner la page", async ({ page }) => {
    await ouvrir(page);
    await attendreMiseEnPage(page);
    const compteur = await lireCompteur(page);
    const dialogue = await ouvrirMenu(page, "setlist");
    const titre = dialogue.locator("[data-toutes-setlists]");
    await titre.scrollIntoViewIfNeeded();
    await expect(titre).toBeVisible();
    await expect(titre).toContainText("Mes autres setlists");
    await expect(dialogue.locator("[data-autre-setlist]")).toHaveCount(4);
    const courante = (await dialogue.getByText("Culte de la courante", { exact: true }).first().boundingBox())!;
    const bas = (await titre.boundingBox())!;
    expect(bas.y, "le titre est sous la setlist en cours").toBeGreaterThan(courante.y);
    await page.waitForTimeout(400);
    expect(await lireCompteur(page), "la page n'a pas tourné").toBe(compteur);
    await expect(dialogue).toBeVisible();
  });

  test("« Mes services » d'abord, puis les autres, chacune par date, sans sous-titres ; la courante et la passée sont absentes", async ({ page }) => {
    await ouvrir(page);
    await attendreMiseEnPage(page);
    const dialogue = await ouvrirMenu(page, "setlist");
    await expect(dialogue.locator("[data-autre-setlist]")).toHaveCount(4);
    await expect(dialogue.getByText("Mes services", { exact: true })).toHaveCount(0);
    await expect(dialogue.getByText("Autres setlists", { exact: true })).toHaveCount(0);
    expect(await idsAffiches(dialogue), "mes services par date, puis les autres par date").toEqual([MIENNE_1, MIENNE_2, AUTRE_FR, AUTRE_ZH]);
    await expect(dialogue.locator(`[data-autre-setlist="${COURANTE}"]`)).toHaveCount(0);
    await expect(dialogue.locator(`[data-autre-setlist="${PASSEE}"]`)).toHaveCount(0);
  });

  test("un toucher sur une autre setlist ouvre celle-ci en mode louange, sur son premier chant", async ({ page }) => {
    await ouvrir(page);
    await attendreMiseEnPage(page);
    await expect(barre(page)).toContainText("À jamais Tu es saint");
    const dialogue = await ouvrirMenu(page, "setlist");
    await dialogue.locator(`[data-autre-setlist="${AUTRE_FR}"]`).click();
    // `?louange=1` est retiré de l'adresse dès l'ouverture du mode (replaceState) : seul le chemin compte.
    await expect(page).toHaveURL(new RegExp(`/setlists/${AUTRE_FR}/?(\\?|$)`));
    await attendreMiseEnPage(page);
    // La page montre la NOUVELLE setlist : son premier chant, et plus celui de la courante.
    await expect(barre(page)).toContainText("Abrite-moi");
    await expect(barre(page)).not.toContainText("À jamais Tu es saint");
    expect(await lireCompteur(page)).toMatch(/^1 \//);
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
  });

  test("hors ligne (Firestore coupé) : seules les copies gardées sont listées, les autres absentes", async ({ page }) => {
    await ouvrir(page, { to: `/setlists/${MIENNE_1}` });
    await expect(page.getByRole("heading", { name: "Culte du dimanche 15" }).first()).toBeVisible();
    // Copies gardées : la mienne et la priere, visitées en ligne ; la zh, la passée et la non gardée ne le sont pas.
    for (const id of [AUTRE_FR, MIENNE_2]) {
      await page.goto(`/setlists/${id}`);
      await expect(page.getByRole("heading", { name: DOCS[`setlists/${id}`].title as string }).first()).toBeVisible();
    }
    await page.goto(`/setlists/${COURANTE}?louange=1`);
    await attendreMiseEnPage(page);
    await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
    const dialogue = await ouvrirMenu(page, "setlist");
    await expect.poll(() => idsAffiches(dialogue), { timeout: 15_000 }).toEqual([MIENNE_1, MIENNE_2, AUTRE_FR]);
    await expect(dialogue.locator(`[data-autre-setlist="${AUTRE_ZH}"]`)).toHaveCount(0);
    await expect(dialogue.locator(`[data-autre-setlist="${PASSEE}"]`)).toHaveCount(0);
  });

  test("Échap ferme le menu, un second Échap quitte le mode", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "telephone", "le clavier : ordinateur et tablette");
    await ouvrir(page);
    await attendreMiseEnPage(page);
    const dialogue = await ouvrirMenu(page, "setlist");
    await expect(dialogue.locator("[data-autre-setlist]")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await expect(dialogue).toBeHidden();
    await expect(page.locator("[data-performance-mode]")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  });

  test("libellés en 中文 : « 我的歌单 », « 我的其他歌单 »", async ({ page }) => {
    await ouvrir(page, { langue: "zh" });
    await attendreMiseEnPage(page);
    const dialogue = await ouvrirMenu(page, "setlist", "zh");
    await expect(dialogue.locator("[data-toutes-setlists]")).toContainText("我的其他歌单");
    await expect(dialogue.locator("[data-onglet=setlist]")).toContainText("我的歌单");
  });

  test("sans compte : le mode ne s'ouvre pas, donc pas de « Toutes mes setlists »", async ({ page }) => {
    await page.clock.setFixedTime(new Date(`${iso(AUJOURDHUI)}T10:00:00`));
    await page.addInitScript(() => {
      try { localStorage.setItem("perf-role-preset", "pianiste"); localStorage.setItem("perf-font-scale", "1.5"); } catch { /* ignore */ }
    });
    await fakeFirestore(page, { [`setlists/${SANS_COMPTE_ID}`]: setlist({ title: "Culte sans compte d'essai", date: SERVICE_1, category: "Culte Francophone", slugs: ["abba-pere"] }) });
    await page.goto(`/setlists/${SANS_COMPTE_ID}?louange=1`);
    await page.waitForTimeout(3_000);
    await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
    await expect(page.locator("[data-toutes-setlists]")).toHaveCount(0);
  });

  test("captures : menu ouvert, autres setlists sous la liste, FR et 中文, clair et sombre", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const dossier = path.join(process.cwd(), "test-results", "pu6");
    mkdirSync(dossier, { recursive: true });
    for (const langue of ["fr", "zh"] as const) {
      for (const theme of ["light", "dark"] as const) {
        await page.goto("about:blank");
        await ouvrir(page, { langue, theme });
        await attendreMiseEnPage(page);
        const dialogue = await ouvrirMenu(page, "setlist", langue);
        await expect(dialogue.locator("[data-autre-setlist]")).toHaveCount(4);
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(dossier, `${testInfo.project.name}-${langue}-${theme}.png`) });
      }
    }
  });
});
