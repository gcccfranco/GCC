import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "../../tests/helpers/fakeSession";
// Capture du planning pour les extraits « Responsabilités » et « Notifications » : Google Sheet simulé avec des noms
// inventés (même méthode que tests/guide-captures.spec.ts) ; le test échoue si un nom de src/lib/planning/data.ts
// (vrais noms) apparaît à l'écran.
const NINA: FakeProfile = { uid: "uid-video", email: "nina.dubreuil@example.com", firstName: "Nina", lastName: "Dubreuil",
  planningName: "Nina", serviceRoles: { "Culte Francophone": ["musicien"] } };
const fr = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const d0 = new Date(); d0.setHours(12, 0, 0, 0); d0.setDate(d0.getDate() + ((7 - d0.getDay()) % 7));
const DIM = Array.from({ length: 6 }, (_, i) => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 7 * i, 12));
const PRES = ["Océane R.", "Gaspard T.", "Mireille V.", "Basile D.", "Yaëlle N.", "Octave F."];
const CSV = DIM.map((d, i) => [fr(d), PRES[i], "Solène K.", "Hugo L.", i % 3 === 2 ? "Noé P." : "Nina", "Octave F.", "Marius C.", "Basile D.", "Yaëlle N.", "Pasteur Marchand", "", ""].join(",")).join("\n");

test("capture du planning", async ({ page }, info) => {
  const OUT = `shots/${info.project.name}`;
  mkdirSync(OUT, { recursive: true });
  const fichier = `${OUT}/boxes.json`;
  const boxes: Record<string, unknown> = existsSync(fichier) ? JSON.parse(readFileSync(fichier, "utf8")) : {};
  await page.context().route(/docs\.google\.com\/spreadsheets/, (route) => {
    const feuille = decodeURIComponent(new URL(route.request().url()).searchParams.get("sheet") ?? "");
    return route.fulfill({ status: 200, contentType: "text/csv", body: feuille === "Franco_Louange" ? CSV : "" });
  });
  await signInAs(page, NINA, {}, "/planning");
  await page.getByText("Océane R.").first().waitFor({ timeout: 90_000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  const v = page.viewportSize()!;
  await page.mouse.move(v.width - 1, v.height - 1);
  await page.waitForTimeout(1200);
  // Aucun vrai nom (lignes de data.ts) à l'écran.
  const data = readFileSync("../../src/lib/planning/data.ts", "utf8");
  const vrais = [...new Set([...data.matchAll(/"([A-ZÀ-Ý][a-zà-ÿ]+(?: [A-ZÀ-Ý][a-zà-ÿ.]+)?)"/g)].map((m) => m[1]))].filter((n) => n.length > 3);
  const texte = await page.locator("body").innerText();
  const trouves = vrais.filter((n) => texte.includes(n) && !CSV.includes(n));
  expect(trouves, "vrais noms à l'écran").toEqual([]);
  await expect(page.locator("body")).not.toContainText(ADMIN_EMAIL);
  await page.screenshot({ path: `${OUT}/09-planning.png`, animations: "disabled", fullPage: true });
  boxes.planningHauteur = await page.evaluate(() => document.documentElement.scrollHeight);
  writeFileSync(fichier, JSON.stringify(boxes, null, 1));
});
