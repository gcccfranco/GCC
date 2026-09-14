import { defineConfig, devices } from "@playwright/test";

/** Port dédié aux tests : le `next dev` de travail (3000) reste libre. */
export const PORT = Number(process.env.PW_PORT ?? 3100);
// `localhost` et pas `127.0.0.1` : `next dev` bloque ses ressources de
// développement en cross-origin, et la page arrive alors **non hydratée** —
// elle s'affiche mais aucun bouton ne répond.
export const BASE_URL = `http://localhost:${PORT}`;

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
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    // `next dev` compile la page à la première requête : la partition 简谱
    // charge un scan de 1 à 2 Mo, la compilation initiale est lente.
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
