import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Tranche A6 (docs/spec-corrections-audit.md) : captures à regarder (bulle d'aide en bas, tiret de liaison, barre de
// la setlist avec libellés courts, droits repliés), et G6 : deux accords voisins ouvrent chacun le leur.
// Comptes simulés, noms fictifs. Spec d'agencement : cinq projets (SPECS_GRAND_ECRAN).

const ROOT = path.join(__dirname, "..", "test-results", "a6-captures");
const SETLIST_ID = "setlist-a6";
const MUSICIENNE: FakeProfile = {
  uid: "uid-musicienne-a6c",
  email: "musicienne-a6c@example.com",
  firstName: "Perrine",
  lastName: "Lamarque",
  planningName: "Perrine L.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
  ...musicien("piano"),
};
const item = (over: Record<string, unknown>) => ({
  keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null,
  sectionNotes: {}, notes: "", ...over,
});
const setlist = {
  title: "Culte du 8 novembre", leader: "Gaspard T.", category: "Culte Francophone", date: "2026-11-08",
  language: "mixed", notes: "", ownerId: MUSICIENNE.uid, isPrivate: false,
  items: [item({ songSlug: "aucun-autre-nom", position: 1 }), item({ songSlug: "一切歌颂赞美", position: 2, jianpuSheet: false })],
};

const prefs = (page: Page, langue: "fr" | "zh-CN", sombre: boolean) =>
  page.addInitScript(([l, s]) => {
    localStorage.setItem("i18nextLng", l as string);
    localStorage.setItem("theme", s ? "dark" : "light");
    localStorage.setItem("jianpu-sheet-pref", "never");
  }, [langue, sombre] as const);

for (const langue of ["fr", "zh-CN"] as const) {
  for (const sombre of [false, true]) {
    const suffixe = `${langue}-${sombre ? "sombre" : "clair"}`;
    test(`captures ${suffixe} : page chant (bulle d'aide, tiret) et setlist`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: sombre ? "dark" : "light" });
      await prefs(page, langue, sombre);
      await page.route(/docs\.google\.com\/spreadsheets/, (r) => r.fulfill({ status: 200, contentType: "text/csv", body: "" }));
      await signInAs(page, MUSICIENNE, { [`setlists/${SETLIST_ID}`]: setlist }, "/songs/aucun-autre-nom");
      await page.locator("[data-copy-line]").first().waitFor();
      await expect(page.locator("[data-accords-aide]")).toBeVisible();
      await page.screenshot({ path: path.join(ROOT, `${info.project.name}-chant-${suffixe}.png`) });
      await page.goto(`/setlists/${SETLIST_ID}`);
      await expect(page.getByRole("heading", { name: "Culte du 8 novembre" })).toBeVisible();
      await page.screenshot({ path: path.join(ROOT, `${info.project.name}-setlist-${suffixe}.png`) });
    });
  }
}

test("G6 : toucher le centre de chaque accord ouvre le sien (FR et ZH)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", "never");
  });
  for (const slug of ["aucun-autre-nom", "一切歌颂赞美"]) {
    await page.goto(`/songs/${encodeURIComponent(slug)}`);
    const accords = page.locator("[data-accord-touchable]");
    await expect(accords.first()).toBeVisible();
    const n = Math.min(await accords.count(), 12);
    for (let i = 0; i < n; i++) {
      const a = accords.nth(i);
      const attendu = ((await a.textContent()) ?? "").trim();
      await a.scrollIntoViewIfNeeded();
      const b = (await a.boundingBox())!;
      // Le point touché est celui de l'accord ; l'élément qui le reçoit doit être cet accord.
      const recu = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y)?.closest("[data-accord-touchable]");
        return el?.textContent?.trim() ?? null;
      }, [b.x + b.width / 2, b.y + b.height / 2]);
      expect(recu, `${slug}, accord ${i}`).toBe(attendu);
    }
  }
});
