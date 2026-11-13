import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { signInAs, ADMIN_EMAIL, type FakeProfile } from "../../tests/helpers/fakeSession";
import { attendreMiseEnPage } from "../../tests/helpers/louange";
import { openSheet } from "../../tests/helpers/jianpu";
// Captures du vrai site pour la vidéo de bienvenue, une série par disposition (projet) → shots/<projet>/,
// avec les boîtes (CSS px) dont compo.html a besoin. Profil et noms inventés ; jamais le vrai Firestore.
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
const CHANTS = ["Gloire à Son Nom", "十架的大能", "Abba Père", "Abrite-moi"];

test("captures vidéo", async ({ page }, info) => {
  const OUT = `shots/${info.project.name}`;
  mkdirSync(OUT, { recursive: true });
  const boxes: Record<string, unknown> = { viewport: page.viewportSize() };
  const box = async (name: string, loc: Locator) => { boxes[name] = await loc.first().boundingBox(); };
  /** La boîte de la rangée (li, lien ou bouton) qui contient la cible. */
  const rangee = (loc: Locator) => loc.first().evaluate((el) => {
    const r = (el.closest("li, a, [role=listitem], [role=button]") ?? el).getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  async function shot(name: string) {
    const ok = page.getByRole("button", { name: "OK", exact: true });
    if (await ok.isVisible().catch(() => false)) { await ok.click(); await page.waitForTimeout(400); }
    await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{caret-color:transparent!important}" });
    const v = page.viewportSize()!;
    await page.mouse.move(v.width - 1, v.height - 1);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
    await page.waitForTimeout(700);
    await expect(page.locator("body")).not.toContainText(ADMIN_EMAIL);
    await page.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" });
  }
  await page.context().route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  await signInAs(page, NINA, { "setlists/sl-video": SETLIST }, "/songs");
  await page.getByText("Gloire à Son Nom").first().waitFor({ timeout: 90_000 });
  await shot("01-liste");
  // La barre de navigation visible (barre du bas ou barre latérale).
  for (const n of await page.locator("nav").all()) if (await n.isVisible()) {
    const b = await n.boundingBox(); if (b && b.width * b.height > ((boxes.nav as { width: number; height: number } | undefined)?.width ?? 0) * ((boxes.nav as { height: number } | undefined)?.height ?? 0)) boxes.nav = b;
  }
  const aside = page.locator("aside").first();
  if (await aside.isVisible().catch(() => false)) await box("aside", aside);

  await page.goto("/songs/gloire-a-son-nom");
  const pil = page.getByTestId("pilule-tonalite");
  await pil.waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);
  await shot("02-chant");
  await box("pilule", pil); await box("plus", pil.locator("button").last());
  await box("titre", page.locator("h1").first());
  await box("couplet", page.locator("[data-section]").nth(1));
  await box("intro", page.locator("[data-section]").nth(0));
  await pil.locator("button").last().click();
  await page.waitForTimeout(900);
  await shot("03-chant-plus1");

  await openSheet(page, "十架的大能", { key: "G" });
  const feuille = page.locator("[data-jianpu-page]").first();
  await feuille.scrollIntoViewIfNeeded();
  await shot("04-jianpu");
  await box("jianpu", feuille);
  await feuille.screenshot({ path: `${OUT}/04-jianpu-page.png` });
  await page.evaluate(() => localStorage.setItem("jianpu-sheet-pref", "never"));

  await page.goto("/setlists/sl-video");
  const ml = page.getByRole("button", { name: /Mode Louange/ });
  await ml.first().waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);
  await shot("05-setlist");
  boxes.rows = [];
  for (const t of CHANTS) (boxes.rows as unknown[]).push(await rangee(page.getByText(t, { exact: true })));

  await ml.first().click();
  await attendreMiseEnPage(page);
  await page.waitForTimeout(1800);
  const v = page.viewportSize()!;
  await page.mouse.click(v.width / 2, v.height / 2);
  await page.waitForTimeout(900);
  await shot("06-louange-a");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(6500);
  await shot("06-louange-b");
  const ens = page.getByText(/Ensuite/).first();
  if (await ens.isVisible().catch(() => false)) await box("ensuite", ens.locator("xpath=.."));
  writeFileSync(`${OUT}/boxes.json`, JSON.stringify(boxes, null, 1));
});
