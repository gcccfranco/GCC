import { expect, test, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { onStage } from "./helpers/louange";

// Lot RS, tranche RS-D (docs/spec-rappel-structure-louange.md, D6) : l'indice du rappel,
// une seule fois par appareil et par mode (`perf-astuce-rappel-unique` / `-joue`).
// Setlist fictive « Culte du 8 novembre », Abba Père en Sections uniques, texte agrandi
// pour avoir plusieurs pages (le rappel paraît dès la page 2).

const SETLIST_ID = "setlist-indice-rappel";
const MUSICIEN: FakeProfile = {
  uid: "uid-indice",
  email: "indice@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const ABBA: SetlistItem = {
  songSlug: "abba-pere",
  position: 1,
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: ["intro-1-0", "verse-2-1", "chorus-3-2", "intro-4-3", "verse-5-4", "chorus-3-5", "bridge-6-6", "chorus-3-7", "chorus-3-8"],
  sectionNotes: {},
  notes: "",
};

const setlist = {
  title: "Culte du 8 novembre",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-11-08",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [ABBA],
};

const compteur = (page: Page) => page.locator("[data-performance-mode] span.tabular-nums").last();
const indice = (page: Page) => onStage(page, "[data-indice-rappel]");
const cle = (page: Page, nom: string) => page.evaluate((n) => localStorage.getItem(n), nom);

const TEXTES = {
  fr: { bouton: /Mode Louange/, unique: "Pleines : sur cette page, avec leur nuance", joue: "Points : déjà joué", joueComplet: "Points : déjà joué · Pleines : sur cette page, avec leur nuance" },
  zh: { bouton: /敬拜模式/, unique: "实心：在本页，下方为力度", joue: "圆点：已唱过", joueComplet: "圆点：已唱过 · 实心：在本页，下方为力度" },
} as const;

async function lancer(page: Page, langue: "fr" | "zh") {
  await page.getByRole("button", { name: TEXTES[langue].bouton }).click();
  await expect(compteur(page)).toHaveText(/^\d+ \/ \d+$/);
  await expect(onStage(page, "[data-section]").first()).toBeVisible();
}

async function ouvrir(page: Page, langue: "fr" | "zh" = "fr", mode: "unique" | "joue" = "unique") {
  await page.addInitScript(([l, m]) => {
    // Une seule fois : un rechargement ne doit pas remettre l'indice à zéro.
    if (sessionStorage.getItem("test-init")) return;
    sessionStorage.setItem("test-init", "1");
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("perf-font-scale", "1.5");
    if (m === "unique") localStorage.setItem("partition-layout", "unique");
    else localStorage.removeItem("partition-layout");
    if (l === "zh") localStorage.setItem("i18nextLng", "zh-CN");
  }, [langue, mode] as const);
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await lancer(page, langue);
}

const total = async (page: Page) => Number((await compteur(page).innerText()).split("/")[1]);

async function pageDeux(page: Page) {
  expect(await total(page), "Abba Père tient sur plusieurs pages").toBeGreaterThan(2);
  await page.keyboard.press("ArrowRight");
  await expect(compteur(page)).toHaveText(/^2 \//);
  await expect(onStage(page, "[data-rappel]")).toBeVisible();
}

for (const langue of ["fr", "zh"] as const) {
  test.describe(`indice du rappel (${langue === "fr" ? "français" : "中文"})`, () => {
    test("visible à la 1re apparition du rappel ; absent à la page suivante et au rechargement ; clé du mode seule", async ({ page }) => {
      await ouvrir(page, langue);
      await expect(indice(page), "page 1 : pas de rappel, pas d'indice").toHaveCount(0);
      expect(await cle(page, "perf-astuce-rappel-unique")).toBeNull();

      await pageDeux(page);
      await expect(indice(page)).toBeVisible();
      await expect(indice(page)).toHaveText(TEXTES[langue].unique);
      await expect(indice(page)).not.toContainText(TEXTES[langue].joue);
      expect(await cle(page, "perf-astuce-rappel-unique"), "écrite dès que la bulle paraît").toBe("1");
      expect(await cle(page, "perf-astuce-rappel-joue"), "l'autre mode n'est pas touché").toBeNull();

      // Elle n'occupe aucune place : le rappel garde sa hauteur, la bulle est posée par-dessus.
      const pos = await page.evaluate(() => {
        const bulle = [...document.querySelectorAll("[data-indice-rappel]")].find((e) => !e.closest("[aria-hidden=true]"))!;
        const rappel = bulle.closest("[data-rappel]")!;
        return { position: getComputedStyle(bulle).position, hauteurRappel: rappel.getBoundingClientRect().height, haut: bulle.getBoundingClientRect().top, basRappel: rappel.getBoundingClientRect().bottom };
      });
      expect(pos.position).toBe("absolute");
      expect(pos.haut, "sous la rangée").toBeGreaterThanOrEqual(pos.basRappel - pos.hauteurRappel);

      // Page suivante : la bulle part.
      await page.keyboard.press("ArrowRight");
      await expect(compteur(page)).toHaveText(/^3 \//);
      await expect(indice(page)).toHaveCount(0);
      // Retour à la page 2 : elle ne revient pas.
      await page.keyboard.press("ArrowLeft");
      await expect(compteur(page)).toHaveText(/^2 \//);
      await expect(onStage(page, "[data-rappel]")).toBeVisible();
      await expect(indice(page)).toHaveCount(0);

      // Rechargement : la clé tient, l'indice ne revient pas.
      await page.reload();
      await lancer(page, langue);
      await pageDeux(page);
      await expect(indice(page)).toHaveCount(0);
    });

    test("la clé de l'Ordre joué posée n'empêche pas l'indice des Sections uniques, et inversement", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("perf-astuce-rappel-joue", "1"));
      await ouvrir(page, langue);
      await pageDeux(page);
      await expect(indice(page)).toBeVisible();
      expect(await cle(page, "perf-astuce-rappel-unique")).toBe("1");
    });

    test("Ordre joué : la bulle porte le texte des deux états, clé « joue » écrite, absente à la page suivante", async ({ page }) => {
      await ouvrir(page, langue, "joue");
      await expect(indice(page), "page 1 : le bandeau, pas de rappel ni d'indice").toHaveCount(0);
      await pageDeux(page);
      await expect(indice(page)).toBeVisible();
      await expect(indice(page)).toHaveText(TEXTES[langue].joueComplet);
      expect(await cle(page, "perf-astuce-rappel-joue"), "écrite dès que la bulle paraît").toBe("1");
      expect(await cle(page, "perf-astuce-rappel-unique"), "l'autre mode n'est pas touché").toBeNull();
      await page.keyboard.press("ArrowRight");
      await expect(compteur(page)).toHaveText(/^3 \//);
      await expect(indice(page)).toHaveCount(0);
    });

    test("une page se tourne d'un toucher sur le côté, la bulle ouverte", async ({ page }) => {
      await ouvrir(page, langue);
      await pageDeux(page);
      await expect(indice(page)).toBeVisible();
      const { w, h } = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      await page.mouse.click(w - 6, h / 2);
      await expect(compteur(page)).toHaveText(/^3 \//);
      await expect(indice(page)).toHaveCount(0);
    });

    test("un toucher sur la bulle la ferme, sans tourner la page ni basculer la barre", async ({ page }) => {
      await ouvrir(page, langue);
      await pageDeux(page);
      const bulle = indice(page);
      await expect(bulle).toBeVisible();
      const barre = await page.getByRole("button", { name: /Quitter|退出/ }).isVisible();
      await bulle.click();
      await expect(bulle).toHaveCount(0);
      await expect(compteur(page)).toHaveText(/^2 \//);
      expect(await page.getByRole("button", { name: /Quitter|退出/ }).isVisible(), "la barre n'a pas bougé").toBe(barre);
    });
  });
}
