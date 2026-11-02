import { defineConfig, devices } from "@playwright/test";
// Captures de la vidéo de bienvenue, une par disposition (même découpage que playwright.config.ts).
const commun = { baseURL: "http://localhost:3100", colorScheme: "light" as const, locale: "fr-FR", serviceWorkers: "block" as const, actionTimeout: 20_000 };
export default defineConfig({
  testDir: ".", testMatch: /captures(-extraits|-planning)?\.spec\.ts/, timeout: 300_000, workers: 1, reporter: [["list"]],
  projects: [
    { name: "telephone", use: { ...devices["Pixel 7"], ...commun, viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } },
    { name: "tablette", use: { ...devices["iPad (gen 7)"], ...commun, defaultBrowserType: "chromium", deviceScaleFactor: 2 } },
    { name: "tablette-paysage", use: { ...devices["iPad (gen 7) landscape"], ...commun, defaultBrowserType: "chromium", deviceScaleFactor: 2 } },
    { name: "ordinateur", use: { ...devices["Desktop Chrome"], ...commun, viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 } },
  ],
});
