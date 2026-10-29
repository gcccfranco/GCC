import { defineConfig, devices } from "@playwright/test";

// Banc « à rude épreuve » (audit du 24/10/2026, docs/audit-2026-10-24.md) : builds de production
// (next start), site « en ligne » (interrupteur coupé) sur 3300, back-office sur 3301 — mode d'emploi dans
// README.md. Hors de tests/ : `npm test` ne le lance pas. Les cinq dispositions du projet (CLAUDE.md).
export default defineConfig({
  testDir: __dirname,
  outputDir: __dirname + "/results",
  fullyParallel: true,
  retries: 0,
  workers: Number(process.env.STRESS_WORKERS ?? 2),
  timeout: 120_000,
  reporter: [["line"], ["json", { outputFile: __dirname + "/results.json" }]],
  use: {
    baseURL: "http://localhost:3300",
    serviceWorkers: "allow",
    launchOptions: { env: { ...process.env, LANG: "C.UTF-8" } },
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "telephone", use: { ...devices["Pixel 7"] } },
    { name: "tablette", use: { ...devices["iPad (gen 7)"], defaultBrowserType: "chromium" } },
    { name: "tablette-paysage", use: { ...devices["iPad (gen 7) landscape"], defaultBrowserType: "chromium" } },
    { name: "ordinateur-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});
