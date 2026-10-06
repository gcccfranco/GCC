import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";

// « Montrer » dans les idées d'harmonie d'un chant de la setlist (retour de
// Timothée, 06/10/2026) : il montrait parfois la mauvaise section, parfois celle
// d'un autre chant. Les sections des chants portent des identifiants qui se
// répètent d'un chant à l'autre (« chorus-1-0 »…) : « Montrer » doit chercher
// dans le chant dont on lit les idées, pas dans toute la page.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Jonathan Z.", "", "", "Ruth K.", "Éloïse M.", "", "", "", "Hewei", "", ""],
]);

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  firstName: "Ruth",
  lastName: "Kouassi",
  planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const SETLIST_ID = "setlist-harmonie-montrer";
const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
// Deux chants qui ont tous deux une intro, un couplet et un refrain.
const SETLIST = {
  title: "Culte du 21 septembre",
  leader: "Jonathan Z.",
  category: "Culte Francophone",
  date: "2026-09-21",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [item({ songSlug: "abba-pere", position: 1 }), item({ songSlug: "一生爱你", position: 2 })],
};

async function ouvrir(page: Page, setlist: Record<string, unknown> = SETLIST) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.locator("[data-outline-item=\"2\"] [data-section-uids]").first()).toBeVisible();
}

/** Ouvre les idées du chant à la position donnée et clique « Montrer » sur la
 *  n-ième idée ; rend le chant (position) et le texte de la section mise en avant,
 *  avec la section annoncée par l'idée. */
async function montrer(page: Page, position: number, n: number) {
  const chant = page.locator(`[data-outline-item="${position}"]`);
  await chant.getByRole("button", { name: "Idées d'harmonie" }).first().click();
  const feuille = page.locator("[data-idees-harmonie]");
  await expect(feuille).toBeVisible();
  const idee = feuille.locator("[data-suggestion]").nth(n);
  await expect(idee).toBeVisible();
  // Sous le nom de l'idée : « Refrain » ou « Refrain · 2 endroits ».
  const annonce = ((await idee.locator("p").first().textContent()) ?? "").split(" · ")[0].trim();
  await idee.getByRole("button", { name: "Montrer" }).click();
  const surligne = page.locator(".harmonie-surligne");
  await expect(surligne).toHaveCount(1);
  const ou = await surligne.evaluate((el) => ({
    position: el.closest("[data-outline-item]")?.getAttribute("data-outline-item") ?? null,
    texte: el.textContent ?? "",
  }));
  await expect(surligne).toHaveCount(0, { timeout: 5000 });
  return { annonce, ...ou };
}

test("« Montrer » sur une idée du 2e chant met en avant une section du 2e chant", async ({ page }) => {
  await ouvrir(page);
  const { position } = await montrer(page, 2, 0);
  expect(position, "la section montrée appartient au chant dont on lit les idées").toBe("2");
});

test("« Montrer » met en avant la section annoncée par l'idée, dans le bon chant", async ({ page }) => {
  // Chaque idée des deux chants, et 2,5 s de mise en avant à chaque fois.
  test.setTimeout(180_000);
  await ouvrir(page);
  for (const pos of [1, 2]) {
    const nb = await (async () => {
      await page.locator(`[data-outline-item="${pos}"]`).getByRole("button", { name: "Idées d'harmonie" }).first().click();
      const c = await page.locator("[data-idees-harmonie] [data-suggestion]").count();
      await page.keyboard.press("Escape");
      await expect(page.locator("[data-idees-harmonie]")).toHaveCount(0);
      return c;
    })();
    for (let n = 0; n < nb; n++) {
      const r = await montrer(page, pos, n);
      expect(r.position, `chant ${pos}, idée ${n + 1}`).toBe(String(pos));
      // Nom bilingue (« 前奏/Intro ») : l'en-tête n'en montre qu'une partie.
      const parties = r.annonce.split("/").map((p) => p.trim());
      expect(parties.some((p) => r.texte.includes(p)), `chant ${pos}, idée ${n + 1} : la section « ${r.annonce} », montrée : « ${r.texte.slice(0, 60)} »`).toBe(true);
    }
  }
});

/** Clique « Montrer » sur la première idée d'un bouton d'idées donné ; rend
 *  le chant (data-chant-slug) et la position de la section mise en avant. */
async function montrerDepuis(page: Page, bouton: ReturnType<Page["getByRole"]>, section: RegExp) {
  await bouton.click();
  // Une idée sur une section que la setlist joue (pas une intro retirée).
  const idee = page.locator("[data-idees-harmonie] [data-suggestion]").filter({ has: page.locator("p", { hasText: section }) }).first();
  await expect(idee).toBeVisible();
  await idee.getByRole("button", { name: "Montrer" }).click();
  const surligne = page.locator(".harmonie-surligne");
  await expect(surligne).toHaveCount(1);
  return surligne.evaluate((el) => ({
    position: el.closest("[data-outline-item]")?.getAttribute("data-outline-item") ?? null,
    chant: el.closest("[data-chant-slug]")?.getAttribute("data-chant-slug") ?? null,
  }));
}

const fusion = (mixedStructure: unknown) => item({
  type: "fusion",
  songSlug: "",
  position: 2,
  fusionSongs: [
    { songSlug: "abba-pere", keyOverride: null, structureOverride: null, sectionNotes: {} },
    { songSlug: "一生爱你", keyOverride: null, structureOverride: null, sectionNotes: {} },
  ],
  mixedStructure,
});

for (const [nom, melange] of [
  ["chants enchaînés", null],
  ["structure mélangée", [
    { songSlug: "abba-pere", sectionId: "verse-2" },
    { songSlug: "一生爱你", sectionId: "verse-2" },
    { songSlug: "abba-pere", sectionId: "chorus-3" },
    { songSlug: "一生爱你", sectionId: "chorus-3" },
  ]],
] as const) {
  test(`fusion (${nom}) : « Montrer » sur une idée du 2e chant de la fusion reste dans ce chant`, async ({ page }) => {
    await ouvrir(page, { ...SETLIST, items: [item({ songSlug: "gloire-a-son-nom", position: 1 }), fusion(melange)] });
    const r = await montrerDepuis(page, page.getByRole("button", { name: /Idées d'harmonie · 一生爱你/ }), /主歌|副歌/);
    expect(r.position).toBe("2");
    expect(r.chant).toBe("一生爱你");
  });
}

test("structure modifiée dans la setlist : « Montrer » trouve la section dans le chant lu", async ({ page }) => {
  // Abba Père joué sans son intro, refrain d'abord : ses sections affichées
  // n'ont plus les identifiants du fichier ; 一生爱你, lui, les a encore.
  await ouvrir(page, {
    ...SETLIST,
    items: [
      item({ songSlug: "abba-pere", position: 1, structureOverride: ["chorus-3-7", "verse-2-8", "chorus-3-9"] }),
      item({ songSlug: "一生爱你", position: 2 }),
    ],
  });
  const r = await montrerDepuis(page, page.locator('[data-outline-item="1"]').getByRole("button", { name: "Idées d'harmonie" }).first(), /^(Refrain|Couplet)/);
  expect(r.position, "la section montrée est dans Abba Père").toBe("1");
});
