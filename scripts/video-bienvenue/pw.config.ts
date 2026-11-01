import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: /captures\.spec\.ts/, timeout: 240_000, workers: 1, reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 3,
    colorScheme: "light", locale: "fr-FR", serviceWorkers: "block", actionTimeout: 20_000 },
});
