import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "fs";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { decouperRepertoire } from "../src/lib/harmonie/repertoire";

// Corrections du design, groupe Harmonie, tranche T1 (docs/spec-corrections-design/harmonie.md) : en-tête par page
// (harmonie-1), fondu de bord des volets (-2), colonnes courtes des tableaux du cours (-3, -12), vrais signes ♯ ♭ ♮ 𝄪 𝄫
// (-4), noms qui passent à la ligne (-6), cartes à leur hauteur (-7), pastille « Layer » (-8), bas de fiche (-10).
// Les nombres sont lus dans les JSON publics : rien n'est écrit en dur. Personnes fictives.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["04/10", "Éva M.", "", "", "Noa B.", "Léo T.", "Max D.", "", "", "Orateur Z.", "", ""],
]);
const NOA: FakeProfile = { uid: "uid-noa", email: "noa@example.com", firstName: "Noa", lastName: "B.", planningName: "Noa B.", ...musicien("piano") };

const CATALOGUE = JSON.parse(readFileSync("public/harmonie-index.json", "utf8")) as {
  fiches: { id: string; nom: string; repertoire?: string; instrument?: string }[];
};
const COURS = JSON.parse(readFileSync("public/harmonie-cours/index.json", "utf8")) as {
  chapitres: { id: string; numero: number | null; niveau: number | null }[];
};
const RD2000 = JSON.parse(readFileSync("public/rd2000.json", "utf8")) as { sons: { premier?: boolean }[] };
const LECON1 = COURS.chapitres.find((c) => c.numero === 1)!;
const LECONS = COURS.chapitres.filter((c) => c.niveau !== null).length;

async function entrer(page: Page, to: string, zh = false) {
  if (zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, NOA, {}, to);
}

const enGrand = (info: TestInfo) => !["telephone", "tablette"].includes(info.project.name);
const sansDefilementHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

async function capture(page: Page, name: string) {
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/${name}-${test.info().project.name}.png` });
}

test.describe("harmonie-1 : le titre et la ligne d'état suivent la page", () => {
  const nombre = (n: number, langue: string) => n.toLocaleString(langue);
  const PAGES = [
    { adresse: "/harmonie", fr: ["Harmonie", `${CATALOGUE.fiches.length} fiches, au piano et à la guitare`], zh: ["和声", `${CATALOGUE.fiches.length} 张卡片，钢琴与吉他`] },
    { adresse: "/harmonie/cours", fr: ["Théorie musicale", `0 / ${LECONS} chapitres finis`], zh: ["乐理", `已完成 0 / ${LECONS} 章`] },
    {
      adresse: "/harmonie/rd2000",
      fr: ["Sons du RD-2000", `${RD2000.sons.filter((s) => s.premier).length} essentiels sur ${nombre(RD2000.sons.length, "fr-FR")}`],
      zh: ["RD-2000 音色", `精选 ${RD2000.sons.filter((s) => s.premier).length} 个（共 ${nombre(RD2000.sons.length, "zh-CN")} 个）`],
    },
  ];
  for (const { adresse, fr, zh } of PAGES) {
    for (const [langue, [titre, etat]] of [["fr", fr], ["zh-CN", zh]] as const) {
      test(`${adresse} en ${langue} : « ${titre} » et sa ligne d'état avec les vrais nombres`, async ({ page }) => {
        await entrer(page, adresse, langue === "zh-CN");
        const entete = page.locator("header[data-entete-page]");
        await expect(entete.getByRole("heading", { level: 1, name: titre, exact: true })).toBeVisible();
        const ligne = entete.locator("p").first();
        await expect(ligne).toBeVisible();
        // Espaces fines et insécables des milliers : le navigateur et Node ne les écrivent pas toujours pareil.
        await expect.poll(async () => ((await ligne.textContent()) ?? "").replace(/[\s  ]+/g, " ").trim()).toBe(etat.replace(/[\s  ]+/g, " "));
        expect(await ligne.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), "la ligne ne se coupe pas").toBe(true);
      });
    }
  }

  test("la progression du cours est dans l'en-tête : 4 px sur 240 px, plus dans la carte du sommaire", async ({ page }) => {
    await entrer(page, "/harmonie/cours");
    const entete = page.locator("header[data-entete-page]");
    await expect(entete.locator("[data-cours-progres]")).toBeVisible();
    await expect(page.locator("[data-cours] [data-cours-progres]")).toHaveCount(0);
    const barre = entete.locator("span.h-1").first();
    const b = (await barre.boundingBox())!;
    expect(Math.round(b.height)).toBe(4);
    expect(Math.round(b.width)).toBe(240);
    await capture(page, "harmonie-1-cours");
  });
});

test("harmonie-2 : le volet de la liste s'estompe sur 32 px en bas, puis en haut dès qu'on a défilé, plus rien au bout", async ({ page }, info) => {
  test.skip(!enGrand(info), "deux volets : ordinateur, tablette paysage, 1 440 px");
  await entrer(page, "/harmonie");
  const volet = page.locator('[data-volet="liste"]');
  await expect(volet).toBeVisible();
  await expect.poll(() => volet.evaluate((el) => el.scrollHeight - el.clientHeight), { message: "assez de lignes pour défiler" }).toBeGreaterThan(80);
  const fondu = () => volet.evaluate((el) => ({
    haut: parseFloat(el.style.getPropertyValue("--fondu-haut")),
    bas: parseFloat(el.style.getPropertyValue("--fondu-bas")),
  }));
  await expect.poll(fondu).toEqual({ haut: 0, bas: 32 });
  await capture(page, "harmonie-2-fondu-bas");
  await volet.evaluate((el) => { el.scrollTop = 200; });
  await expect.poll(fondu).toEqual({ haut: 32, bas: 32 });
  await capture(page, "harmonie-2-fondu-milieu");
  await volet.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect.poll(fondu).toEqual({ haut: 32, bas: 0 });
  // La carte garde son coin et son ombre : le voile n'est pas un masque.
  expect(await volet.evaluate((el) => { const c = getComputedStyle(el); return [c.borderTopLeftRadius, c.boxShadow !== "none" || c.backgroundColor !== getComputedStyle(document.body).backgroundColor, c.maskImage]; })).toEqual(["16px", true, "none"]);
});

test.describe("le cours : tableaux de la leçon 1", () => {
  test("harmonie-3 : le tableau 1.2 n'étire pas ses colonnes courtes (Jianpu ≤ 120 px, dernière colonne ≤ 3 lignes)", async ({ page }) => {
    await entrer(page, `/harmonie/cours/${LECON1.id}`);
    const tableau = page.locator("[data-cours-tableau]").filter({ hasText: "Jianpu" });
    await expect(tableau).toBeVisible();
    const tete = tableau.locator("th", { hasText: "Jianpu" });
    expect((await tete.boundingBox())!.width, "colonne Jianpu au contenu").toBeLessThanOrEqual(120);
    const derniere = tableau.locator("tbody tr").first().locator("td").last();
    const h = (await derniere.boundingBox())!.height;
    expect(Math.round((h - 16) / 21), "lignes de la dernière colonne").toBeLessThanOrEqual(3);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "harmonie-3-tableau");
  });

  test("harmonie-4 : les cinq signes ♯ ♭ ♮ 𝄪 𝄫 sont dans la police jointe, et plus en ASCII", async ({ page }) => {
    await entrer(page, `/harmonie/cours/${LECON1.id}`);
    const tableau = page.locator("[data-cours-tableau]").filter({ hasText: "Bécarre" });
    await expect(tableau).toBeVisible();
    const signes = await tableau.locator("tbody tr").evaluateAll((lignes) => lignes.map((l) => l.querySelector("td")!.textContent));
    expect(signes).toEqual(["♯", "♭", "♮", "𝄪", "𝄫"]);
    expect(await page.evaluate(async () => {
      await document.fonts.load('1em "Noto Music"', "♮𝄪𝄫");
      return document.fonts.check('1em "Noto Music"', "♮𝄪𝄫");
    })).toBe(true);
    const polices = await tableau.locator("tbody tr td:first-child").evaluateAll((cellules) => cellules.map((c) => getComputedStyle(c.querySelector(".alteration")!).fontFamily));
    for (const p of polices) expect(p).toContain("Noto Music");
    await expect(tableau).not.toContainText(/Fax|Sibb/);
    await capture(page, "harmonie-4-alterations");
  });
});

test.describe("le RD-2000", () => {
  test("harmonie-6 : aucun nom, commentaire ni titre de chapitre n'est coupé par « … »", async ({ page }) => {
    await entrer(page, "/harmonie/rd2000");
    await expect(page.locator("[data-moment]").first()).toBeVisible();
    await expect(page.locator("[data-moment] .truncate")).toHaveCount(0);
    await page.getByRole("tab", { name: "Tous les sons" }).click();
    await expect(page.locator("[data-vue=sons] [data-son]").first()).toBeVisible();
    await expect(page.locator("[data-vue=sons] .truncate")).toHaveCount(0);
    const coupes = await page.locator("[data-vue=sons] a span.line-clamp-2").evaluateAll((els) => els.filter((e) => e.clientHeight > 2 * 18 + 1).length);
    expect(coupes, "deux lignes de commentaire au plus").toBe(0);
    await page.goto("/harmonie/cours");
    await expect(page.locator("[data-cours]")).toBeVisible();
    await expect(page.locator("[data-cours] .truncate")).toHaveCount(0);
    const debord = await page.locator("[data-cours] a span.block").evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
    expect(debord).toBe(0);
  });

  test("harmonie-8 : la pastille « Layer » (« 叠加 » en 中文) avant le numéro, plus de « + » nu", async ({ page }) => {
    await entrer(page, "/harmonie/rd2000", true);
    const pastille = page.locator("[data-layer]").first();
    await expect(pastille).toHaveText("叠加");
    const ligne = pastille.locator("xpath=..");
    // La pastille précède le son qu'elle annonce dans le DOM.
    expect(await ligne.evaluate((el) => {
      const layer = el.querySelector("[data-layer]");
      const son = el.querySelector("[data-son]");
      return !!layer && !!son && (layer.compareDocumentPosition(son) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    })).toBe(true);
    await expect(page.locator("[data-moment]").getByText("+", { exact: true })).toHaveCount(0);
  });
});

test.describe("harmonie-10 : la phrase « Dans le répertoire »", () => {
  test("le découpeur ne perd aucun texte sur les 69 fiches", () => {
    const nettoyer = (s: string) => s.replace(/[*()·.]/g, " ").replace(/\s+/g, " ").trim();
    expect(CATALOGUE.fiches).toHaveLength(69);
    let avecPhrase = 0;
    let decoupees = 0;
    for (const f of CATALOGUE.fiches) {
      if (!f.repertoire) continue;
      avecPhrase++;
      const exemples = decouperRepertoire(f.repertoire);
      if (!exemples) continue; // forme inattendue : rendue telle quelle
      decoupees++;
      const recompose = exemples.map((e) => `${e.titre} ${e.detail.map((m) => m.texte).join("")}`).join(" ");
      expect(nettoyer(recompose), f.id).toBe(nettoyer(f.repertoire));
    }
    expect(decoupees, "toutes les phrases d'aujourd'hui se découpent").toBe(avecPhrase);
  });

  test("une phrase se coupe en titre / exemple, les accords à part", () => {
    const [a, b] = decouperRepertoire("*Hosanna* (couplet :\n« Les nations tremblent », Em7 – A) · 荣耀至高神 · 谢谢你成为我的家.")!;
    expect(a.titre).toBe("Hosanna");
    expect(a.detail.filter((m) => m.accord).map((m) => m.texte)).toEqual(["Em7", "–", "A"]);
    expect(b).toEqual({ titre: "荣耀至高神", detail: [] });
    expect(decouperRepertoire("*Jireh* (intro, en E : B6)")![0].detail.filter((m) => m.accord).map((m) => m.texte)).toEqual(["B6"]);
  });

  test("tablette portrait : « Quand l'éviter » suit « Au piano » sans vide de plus de 24 px", async ({ page }, info) => {
    test.skip(info.project.name !== "tablette", "tablette portrait seulement");
    await entrer(page, "/harmonie/substitutions/2m7-pour-4");
    const piano = page.locator("section", { has: page.getByRole("heading", { name: "Au piano" }) });
    const eviter = page.locator("section", { has: page.getByRole("heading", { name: "Quand l'éviter" }) });
    await expect(piano).toBeVisible();
    const [p, e] = [(await piano.boundingBox())!, (await eviter.boundingBox())!];
    expect(Math.abs(p.x - e.x), "dans la même colonne").toBeLessThan(2);
    expect(e.y - (p.y + p.height), "écart entre les deux cartes").toBeLessThanOrEqual(24);
    expect(await sansDefilementHorizontal(page)).toBe(true);
    await capture(page, "harmonie-10-fiche");
  });
});
