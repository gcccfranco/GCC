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
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
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
