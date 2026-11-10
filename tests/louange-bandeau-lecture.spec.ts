import { expect, test, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, basculerAnnoter, lireCompteur } from "./helpers/louange";

// Lot CV, CV-3 : la lecture « pour information » des anciennes clés de composition (bandeau seul) ne retarde ni
// l'affichage des traits de la page ni l'entrée en annotation. Noms fictifs seulement.

const SETLIST_ID = "setlist-bandeau-lecture";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien-bandeau",
  email: "musicien.bandeau@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const DELAI = 8_000;

const item = (over: Partial<SetlistItem> & { songSlug: string }): SetlistItem => ({
  position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "", ...over,
});
const ITEMS = [
  item({ songSlug: "a-jamais-tu-es-saint", keyOverride: "A" }),
  item({ songSlug: "Ta-parole-écriture", position: 2 }),
  item({ songSlug: "le-dieu-fidele", position: 3 }),
  item({ songSlug: "爱赢了", position: 4 }),
];
const trait = (w: number, h: number) =>
  JSON.stringify({ w, h, strokes: [{ tool: "pen", size: 3.5, color: "#dc2626", points: [[w * 0.2, h * 0.5], [w * 0.5, h * 0.5]] }] });

/** Les barres se masquent seules : un toucher au centre les rend (voir louange-sections-uniques.spec.ts). */
async function montrerChrome(page: Page) {
  if (await page.getByRole("button", { name: "Quitter" }).isVisible()) return;
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  await page.mouse.click(w / 2, h / 2);
  await expect(page.getByRole("button", { name: "Quitter" })).toBeVisible();
}

const cleDePage = (page: Page) => page.locator("[data-performance-mode]").getAttribute("data-cle-page");
const totalPages = async (page: Page) => Number((await lireCompteur(page)).split("/")[1]);

async function lancer(page: Page) {
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreCompteur(page, /^\d+ \/ \d+$/);
  await expect(page.getByText(/Mise en page…|排版中/)).toHaveCount(0, { timeout: 20_000 });
}

test("la lecture retardée d'une ancienne composition ne retarde pas la page ; le bandeau vient ensuite", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("perf-role-preset", "pianiste");
      if (!sessionStorage.getItem("pw-echelle-posee")) {
        localStorage.setItem("perf-font-scale", "1.5");
        sessionStorage.setItem("pw-echelle-posee", "1");
      }
      localStorage.setItem("jianpu-sheet-pref", "never");
      localStorage.setItem("accords-aide-vue", "1");
      localStorage.setItem("theme", "light");
    } catch {}
  });
  const db = await signInAs(
    page,
    MUSICIEN,
    {
      [`setlists/${SETLIST_ID}`]: {
        title: "Culte du 8 novembre", leader: "Présidence", category: "Culte Francophone", date: "2026-11-08",
        language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false, items: ITEMS,
      },
    },
    `/setlists/${SETLIST_ID}`,
  );
  await lancer(page);

  // Première page v2 : texte à 1,5 ; sur grand écran rien ne coupe, on revient à 1,0 (deux colonnes), comme louange-coupure.
  let v2: { p: number; cle: string } | null = null;
  for (const echelle of ["1.5", "1"]) {
    if (echelle !== "1.5") {
      await page.evaluate((v) => localStorage.setItem("perf-font-scale", v), echelle);
      await page.reload();
      await lancer(page);
    }
    await expect(async () => {
      await page.keyboard.press("ArrowLeft");
      await attendreCompteur(page, /^1 \//, 400);
    }).toPass({ timeout: 15_000 });
    const total = await totalPages(page);
    for (let p = 1; p <= total && !v2; p++) {
      await attendreCompteur(page, new RegExp(`^${p} /`));
      const cle = (await cleDePage(page)) ?? "";
      if (cle.endsWith("v2")) v2 = { p, cle };
      else if (p < total) await page.keyboard.press("ArrowRight");
    }
    if (v2) break;
  }
  expect(v2, "une page v2 existe au texte agrandi au maximum").not.toBeNull();

  // Traits sous l'ancienne composition seulement.
  const ancienne = v2!.cle.replace(/v2$/, "");
  const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const docAncien = `annotations/${MUSICIEN.uid}__${SETLIST_ID}__${ancienne}`;
  db.set(docAncien, { strokes: trait(w, h), updatedAt: new Date() });

  // Seule la lecture de l'ancienne clé est retardée (les autres lectures passent à la volée).
  let retardee = false;
  await page.route(/firestore\.googleapis\.com/, async (route) => {
    const tail = decodeURIComponent(new URL(route.request().url()).pathname.split("/documents")[1] ?? "").replace(/^\//, "");
    if (route.request().method() === "GET" && tail === docAncien) {
      retardee = true;
      await new Promise((r) => setTimeout(r, DELAI));
    }
    await route.fallback();
  });

  await page.reload();
  await lancer(page);
  for (let p = 1; p < v2!.p; p++) await page.keyboard.press("ArrowRight");
  await attendreCompteur(page, new RegExp(`^${v2!.p} /`));
  await montrerChrome(page);
  const debut = Date.now();

  // L'entrée en annotation attend les traits de la page : le calque d'édition doit venir sans attendre le délai.
  await basculerAnnoter(page);
  await expect(page.locator("[data-performance-mode] > canvas")).toBeVisible({ timeout: DELAI / 2 });
  expect(Date.now() - debut, "calque d'édition avant la fin du délai").toBeLessThan(DELAI - 1_000);
  expect(retardee, "la lecture de l'ancienne clé a bien été demandée").toBe(true);

  // Puis, hors annotation, le bandeau arrive quand la lecture retardée aboutit.
  await montrerChrome(page);
  await basculerAnnoter(page);
  await expect(page.locator("[data-alerte-composition]")).toBeVisible({ timeout: DELAI + 7_000 });
  expect(db.writes.filter((x) => x.path.startsWith("annotations/")), "aucune écriture").toEqual([]);
});
