import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enDeuxVolets } from "./helpers/setlist";

// Lot U5, tranche T6 (docs/spec-deux-volets.md, « Finitions ») : le parcours du
// dimanche sur les cinq projets, interface en français et en 中文, clair et sombre.
// Chants, un chant FR, un chant ZH, la setlist (Liste ou deux volets), ses
// partitions, le mode louange. À chaque écran : rien ne déborde en largeur, la
// page est dans son thème et dans sa langue, les libellés du lot sont traduits.
// Avec PW_CAPTURES=<dossier>, une capture par écran, à regarder à l'œil et à
// comparer aux planches (scripts/planche/apercu/).

const GRAND = ["ordinateur", "tablette-paysage", "ordinateur-1440"];
/** Samedi 3 octobre 2026 : le culte du 4 est la prochaine setlist. */
const AUJOURDHUI = new Date("2026-10-03T10:00:00");
const SETLIST_ID = "culte-4";

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
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

// Un chant FR transposé, un chant ZH sur son scan 简谱, une transition.
const SETLIST = {
  title: "Culte du 4 octobre",
  leader: "Présidence T.",
  category: "Culte Francophone",
  date: "2026-10-04",
  language: "mixed",
  notes: "Thème : la grâce.",
  ownerId: "uid-autre",
  isPrivate: false,
  isDraft: false,
  items: [
    item({ songSlug: "abba-pere", position: 1, keyOverride: "G", notes: "Démarrer doux" }),
    item({ songSlug: "一生爱你", position: 2, jianpuSheet: true }),
    item({ type: "transition", songSlug: "", position: 3, transitionText: "Prière, piano doux" }),
  ],
};

/** Libellés du lot dans chaque langue (src/locales/*.json). */
const LIBELLES = {
  fr: { choisis: "Choisis un chant", sommaire: "Sommaire", liste: "Liste", louange: "Mode Louange", colonnes: "2 colonnes" },
  zh: { choisis: "选择一首诗歌", sommaire: "目录", liste: "曲目列表", louange: "敬拜模式", colonnes: "双栏" },
} as const;

type Langue = keyof typeof LIBELLES;
type Theme = "light" | "dark";

/** Luminance relative d'une couleur CSS `rgb(…)` / `rgba(…)` (0 noir, 1 blanc). */
function luminance(css: string): number {
  const [r, g, b] = (css.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map((v) => Number(v) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Attendre la fin des animations (fondu de page, volets) avant de mesurer ou de capturer. */
const animationsFinies = (page: Page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));

/** Ce que chaque écran doit tenir, puis sa capture (PW_CAPTURES). */
async function ecran(page: Page, nom: string, langue: Langue, theme: Theme, { fond = true } = {}) {
  await animationsFinies(page);
  await expect(page.locator("html")).toHaveAttribute("lang", langue === "zh" ? "zh-CN" : "fr");
  const { large, fenetre } = await page.evaluate(() => ({
    large: document.documentElement.scrollWidth,
    fenetre: document.documentElement.clientWidth,
  }));
  expect(large, `${nom} : rien ne déborde en largeur`).toBeLessThanOrEqual(fenetre);
  if (fond) {
    const l = luminance(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
    if (theme === "dark") expect(l, `${nom} : fond sombre`).toBeLessThan(0.1);
    else expect(l, `${nom} : fond clair`).toBeGreaterThan(0.8);
  }
  const dir = process.env.PW_CAPTURES;
  if (dir) await page.screenshot({ path: `${dir}/u5-${nom}-interface-${langue}-${theme}-${test.info().project.name}.png` });
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AUJOURDHUI);
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  // L'indicateur de `next dev` n'existe pas en ligne : hors des captures.
  await page.addInitScript(() => {
    addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(s);
    });
  });
});

for (const langue of ["fr", "zh"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`le dimanche en ${langue === "fr" ? "français" : "中文"}, ${theme === "light" ? "clair" : "sombre"} : Chants, chant FR, chant ZH, setlist, partitions, mode louange`, async ({ page }, info) => {
      test.slow();
      const L = LIBELLES[langue];
      const grand = GRAND.includes(info.project.name);
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((lng) => {
        localStorage.setItem("i18nextLng", lng);
        // Le mode louange demande le rôle à la première ouverture : un pianiste, déjà choisi.
        localStorage.setItem("perf-role-preset", "pianiste");
      }, langue === "zh" ? "zh-CN" : "fr");

      // ── Chants ─────────────────────────────────────────────────────────────
      await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, "/songs");
      await expect(page.locator('[id="song-li-abba-pere"] a').first()).toBeAttached({ timeout: 15_000 });
      const choisis = page.getByRole("heading", { name: L.choisis });
      if (grand) {
        await expect(choisis).toBeVisible();
        await expect(page.locator("[data-carte-setlist]")).toHaveCount(1);
      } else {
        await expect(choisis).toHaveCount(0);
      }
      await ecran(page, "chants", langue, theme);

      // ── Un chant FR, puis un chant ZH ───────────────────────────────────────
      await page.goto("/songs/abba-pere");
      await expect(page.getByRole("heading", { level: 1, name: /Abba Père/i })).toBeVisible();
      await ecran(page, "chant-abba-pere", langue, theme);
      // Ce chant a un scan : il s'ouvrirait sur son scan, sans en-tête (lot 1 « 简谱 par défaut »).
      // Ce pas regarde l'en-tête et les paroles : « Paroles » pour cet appareil, rendu juste après
      // pour que le pas « partitions » plus bas retrouve le défaut.
      await page.evaluate(() => localStorage.setItem("jianpu-sheet-pref", "never"));
      await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
      await expect(page.getByRole("heading", { level: 1, name: /一生爱你/ })).toBeVisible();
      await ecran(page, "chant-yi-sheng-ai-ni", langue, theme);
      await page.evaluate(() => localStorage.removeItem("jianpu-sheet-pref"));

      // ── La setlist : Liste (G) ou deux volets ───────────────────────────────
      await page.goto(`/setlists/${SETLIST_ID}`);
      const deux = await enDeuxVolets(page);
      expect(deux, "deux volets sur les grands écrans seulement").toBe(grand);
      if (deux) {
        await expect(page.getByRole("navigation", { name: L.sommaire })).toBeVisible();
        await expect(page.getByTestId("bascule-vues")).toHaveCount(0);
      } else {
        await expect(page.getByTestId("bascule-vues").getByRole("button", { name: L.liste, exact: true })).toBeVisible();
      }
      await page.locator("[data-outline-item], [data-ligne]").first().waitFor();
      await ecran(page, "setlist", langue, theme);

      // ── Les partitions, au chant ZH sur son scan ────────────────────────────
      // Toucher le chant 2 : son entrée du sommaire en deux volets, sa ligne sur G.
      if (deux) await page.locator('[data-sommaire="2"] [data-sommaire-chant]').click();
      else await page.locator('[data-ligne="2"] a').first().click();
      await expect(page.locator('[data-outline-item="2"] img').first()).toBeVisible({ timeout: 15_000 });
      await ecran(page, "partitions", langue, theme);

      // ── Le mode louange ─────────────────────────────────────────────────────
      // Les barres s'escamotent au défilement : en haut de page, elles sont là.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.getByRole("button", { name: L.louange }).filter({ visible: true }).first().click();
      await expect(page.locator("[data-performance-mode] span.tabular-nums").last()).toHaveText(/^\d+ \/ \d+$/);
      const interrupteur = page.locator("[data-performance-mode] button", { hasText: L.colonnes });
      if (grand) await expect(interrupteur).toHaveAttribute("aria-pressed", "true");
      else await expect(interrupteur).toHaveCount(0);
      // Le mode louange a son propre fond (réglage par appareil) : seul le débordement compte.
      await ecran(page, "louange", langue, theme, { fond: false });
    });
  }
}
