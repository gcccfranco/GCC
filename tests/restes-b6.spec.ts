import { execSync } from "child_process";
import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers/fakeSession";

// B6a (docs/spec-corrections-audit.md) : restes de code du flux B.

test.use({ serviceWorkers: "block" });

const MEMBRE = { uid: "u-b6", email: "membre-b6@example.com", firstName: "Lia", lastName: "M." };

async function feuilleVide(page: Page) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
}

test("manifeste : icon.png déclaré en 256x256, apple-icon.png en 180x180", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  const m = (await res.json()) as { icons: { src: string; sizes: string; purpose?: string }[] };
  const icones = m.icons.filter((i) => i.src === "/icon.png");
  expect(icones.length).toBe(2);
  for (const i of icones) expect(i.sizes).toBe("256x256");
  expect(m.icons.find((i) => i.src === "/apple-icon.png")?.sizes).toBe("180x180");
});

test("index des chants : seul le chargeur partagé lit songs-index.json", () => {
  // Une lecture à part rechargerait le fichier à chaque écran (A7, W5) : seul src/hooks/useSongsIndex.ts le lit.
  const lecteurs = execSync("grep -rlF 'fetch(\"/songs-index.json' src || true", { encoding: "utf8" }).trim().split("\n").filter(Boolean);
  expect(lecteurs).toEqual(["src/hooks/useSongsIndex.ts"]);
});

test("index des chants : demandé une fois au plus par page affichée", async ({ page }) => {
  await feuilleVide(page);
  let demandes = 0;
  // Compté depuis la dernière navigation : signInAs charge la page deux fois (session posée, puis page voulue).
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) demandes = 0; });
  page.on("request", (r) => { if (new URL(r.url()).pathname === "/songs-index.json") demandes++; });
  for (const route of ["/songs", "/setlists", "/planning"]) {
    await signInAs(page, MEMBRE, {}, route);
    await page.waitForLoadState("networkidle");
    expect(demandes, route).toBeLessThanOrEqual(1);
  }
});

test("matrice des Musiciens : région défilante nommée (ordinateur et tablette)", async ({ page }, info) => {
  test.skip(info.project.name === "telephone", "propre au tableau : le téléphone montre des cartes");
  await feuilleVide(page);
  await signInAs(
    page,
    MEMBRE,
    { "equipes/louange": { membres: [
      { nom: "Ruth K.", uid: "u1", mention: "", referent: false, essai: false, groupe: "", sousEquipes: ["musiciens"], joue: ["piano"], lieux: ["Culte Francophone"] },
    ], updatedAt: "2026-10-01T10:00:00Z", parUid: "", parNom: "" } },
    "/equipes",
  );
  await page.getByRole("button", { name: "Musiciens" }).click();
  const matrice = page.getByTestId("matrice-table");
  await expect(matrice).toBeVisible();
  await expect(matrice).toHaveAttribute("tabindex", "0");
  await expect(page.getByRole("region", { name: "Tableau des musiciens" })).toBeVisible();
});
