import { test, expect, type Page } from "@playwright/test";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "../../tests/helpers/fakeSession";
import { attendreMiseEnPage } from "../../tests/helpers/louange";
import { writeFileSync } from "node:fs";
import { openSheet } from "../../tests/helpers/jianpu";
// Captures du vrai site pour la vidéo /brag. Profil et noms inventés ; jamais le vrai Firestore.
const OUT = "shots";
const NINA: FakeProfile = { uid: "uid-video", email: "nina.dubreuil@example.com", firstName: "Nina", lastName: "Dubreuil",
  planningName: "Nina", serviceRoles: { "Culte Francophone": ["musicien"] } };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dim = new Date(); dim.setDate(dim.getDate() + ((7 - dim.getDay()) % 7 || 7));
const item = (o: Record<string, unknown>) => ({ keyOverride: null, showChords: true, showPinyin: true, useJianpu: false,
  structureOverride: null, sectionNotes: {}, notes: "", ...o });
const SETLIST = { title: `Culte du ${dim.getDate()} ${dim.toLocaleDateString("fr-FR", { month: "long" })}`, leader: "Océane R.",
  category: "Culte Francophone", date: iso(dim), language: "mixed", notes: "", ownerId: NINA.uid, isPrivate: false,
  items: [item({ songSlug: "gloire-a-son-nom", position: 1 }), item({ songSlug: "十架的大能", position: 2 }),
    item({ songSlug: "abba-pere", position: 3 }), item({ songSlug: "abrite-moi", position: 4 })] };
async function sheet(page: Page) {
  await page.context().route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
}
async function shot(page: Page, name: string, full = false) {
  const ok = page.getByRole("button", { name: "OK", exact: true });
  if (await ok.isVisible().catch(() => false)) { await ok.click(); await page.waitForTimeout(400); }
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}" });
  await page.mouse.move(389, 843);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
  await page.waitForTimeout(700);
  await expect(page.locator("body")).not.toContainText(ADMIN_EMAIL);
  await page.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled", fullPage: full });
}
const boxes: Record<string, unknown> = {};
async function box(page: Page, name: string, loc: ReturnType<Page["locator"]>) { boxes[name] = await loc.first().boundingBox(); }
test.afterAll(() => writeFileSync(`${OUT}/boxes.json`, JSON.stringify(boxes, null, 1)));
test("captures vidéo", async ({ page }) => {
  await sheet(page);
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, NINA, { "setlists/sl-video": SETLIST }, "/songs");
  await page.getByText("Gloire à Son Nom").first().waitFor({ timeout: 60_000 });
  await shot(page, "01-liste");
  await shot(page, "01-liste-full", true);
  // Chant FR : tonalité recommandée, puis +1 demi-ton.
  await page.goto("/songs/gloire-a-son-nom");
  const pil = page.getByTestId("pilule-tonalite");
  await pil.waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  await shot(page, "02-chant");
  await box(page, "plus", pil.locator("button").last()); await box(page, "pilule", pil);
  await box(page, "badge", page.getByText("G", { exact: true }).last());
  await box(page, "tabbar", page.locator("nav").last());
  await page.getByTestId("tonalite-courante").screenshot({ path: `${OUT}/02-tonalite-avant.png` }).catch(() => {});
  await pil.locator("button").last().click();
  await page.waitForTimeout(900);
  await shot(page, "03-chant-plus1");
  // 简谱 transposé.
  await openSheet(page, "十架的大能", { key: "G" });
  await page.locator("[data-jianpu-page]").first().scrollIntoViewIfNeeded();
  await shot(page, "04-jianpu");
  await page.locator("[data-jianpu-page]").first().screenshot({ path: `${OUT}/04-jianpu-page.png` });
  await page.evaluate(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  // Setlist puis Mode Louange.
  await page.goto("/setlists/sl-video");
  const ml = page.getByRole("button", { name: /Mode Louange/ });
  await ml.first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  await shot(page, "05-setlist");
  for (const t of ["Gloire à Son Nom", "十架的大能", "Abba Père", "Abrite-moi"]) await box(page, "row:" + t, page.getByText(t, { exact: true }));
  await ml.first().click();
  await attendreMiseEnPage(page);
  await page.waitForTimeout(1800);
  await shot(page, "06-louange-a");
  await page.mouse.click(195, 420);
  await page.waitForTimeout(900);
  await shot(page, "06-louange-barre");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  await shot(page, "06-louange-b");
  await page.waitForTimeout(6000);
  await shot(page, "06-louange-c");
});
