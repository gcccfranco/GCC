import { defineConfig, devices } from "@playwright/test";

/** Port dédié aux tests : le `next dev` de travail (3000) reste libre. */
export const PORT = Number(process.env.PW_PORT ?? 3100);
// `localhost` et pas `127.0.0.1` : `next dev` bloque ses ressources de
// développement en cross-origin, et la page arrive alors **non hydratée** —
// elle s'affiche mais aucun bouton ne répond.
export const BASE_URL = `http://localhost:${PORT}`;
/** Second serveur, lancé SANS l'interrupteur du back-office (lot 18,
 *  docs/spec-mise-en-ligne.md) : ce que verra le site en ligne. */
export const BASE_URL_COUPE = `http://localhost:${PORT + 1}`;

/** Lot U4 : specs lancées aussi sur `tablette-paysage` et `ordinateur-1440` —
 *  la navigation, le halo qui part du bord de la barre, et le dimanche (setlist,
 *  barre d'outils, sommaire, mode louange). */
const SPECS_GRAND_ECRAN = [
  /navigation-grand-ecran\.spec\.ts/,
  /look-navigation\.spec\.ts/,
  /look-halo(-defilement)?\.spec\.ts/,
  /look-louange\.spec\.ts/,
  /performance-mode\.spec\.ts/,
  /setlist-regie\.spec\.ts/,
  /coup-d-oeil\.spec\.ts/,
  // Lot U6 (spec-back-office.md, Tests) : l'espace Back-Office, B1.
  /back-office-espace\.spec\.ts/,
  // Lot U7 (spec-statistiques.md, Tests) : la page Statistiques et son entrée du menu.
  /statistiques\.spec\.ts/,
];

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // 3 en local : les profils téléphone et tablette émulent des écrans haute
  // densité (×2,6, ×2), plus coûteux ; au-delà, `next dev` sature et des tests
  // échouent au hasard (constaté le 14/09/2026 avec 5).
  workers: process.env.CI ? 1 : 3,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Trois appareils, toujours (consigne de Timothée du 14/09/2026, CLAUDE.md),
  // tous sous Chromium (émulation de taille et de toucher ; WebKit écarté).
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "telephone", use: { ...devices["Pixel 7"] } },
    { name: "tablette", use: { ...devices["iPad (gen 7)"], defaultBrowserType: "chromium" } },
    // ── Lot U4 (docs/spec-navigation-grand-ecran.md, Q16) ──────────────────────
    // La tablette couchée (barre latérale réduite) et la lecture à 1 440 px, que
    // les trois appareils ne montrent pas. Limités à la navigation et aux specs du
    // dimanche : toute la suite sur cinq projets coûterait deux tiers de temps en plus.
    { name: "tablette-paysage", testMatch: SPECS_GRAND_ECRAN, use: { ...devices["iPad (gen 7) landscape"], defaultBrowserType: "chromium" } },
    { name: "ordinateur-1440", testMatch: SPECS_GRAND_ECRAN, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: `npm run dev -- -p ${PORT}`,
      url: BASE_URL,
      reuseExistingServer: true,
      // `next dev` compile la page à la première requête : la partition 简谱
      // charge un scan de 1 à 2 Mo, la compilation initiale est lente.
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
      // La suite existante teste le back-office : interrupteur ouvert, quoi que dise `.env.local`.
      env: { NEXT_PUBLIC_BACK_OFFICE: "1" },
    },
    {
      // Interrupteur coupé. Next 16 verrouille `.next/dev` : un second `next dev`
      // dans le même dossier a besoin de son propre dossier de build.
      command: `npm run dev -- -p ${PORT + 1}`,
      url: BASE_URL_COUPE,
      reuseExistingServer: true,
      timeout: 180_000,
      stdout: "ignore",
      stderr: "pipe",
      env: { NEXT_PUBLIC_BACK_OFFICE: "0", NEXT_DIST_DIR: ".next-coupe" },
    },
  ],
});
