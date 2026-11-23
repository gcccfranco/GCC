import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, onStage, ouvrirOptions } from "./helpers/louange";
import { prefPourRole } from "../src/lib/jianpu/preference";

// Lot JP-D (docs/spec-mode-louange-forscore-2.md) : choriste et présidence voient par défaut paroles + pinyin ;
// le choix réglé de la personne l'emporte. Aucun accès Firestore réel : tout est simulé (`signInAs`).

const ZH = "一生爱你"; // scan certifié
const FR = "abba-pere"; // chant sans scan

const PERSONNE: FakeProfile = {
  uid: "uid-roles-jp",
  email: "roles@example.com",
  firstName: "Maëlle",
  lastName: "Fictive",
  planningName: "Maëlle F.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

test.use({ deviceScaleFactor: 1 });

async function ouvrir(page: Page, opts: { role: string; pref?: "always" | "never"; jianpuSheet?: boolean }) {
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  await page.addInitScript(
    ([role, pref]) => {
      localStorage.setItem("perf-role-preset", role as string);
      if (pref) localStorage.setItem("jianpu-sheet-pref", pref as string);
    },
    [opts.role, opts.pref ?? ""],
  );
  const item = { showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "", keyOverride: null };
  await signInAs(page, PERSONNE, {
    "setlists/setlist-roles-jp": {
      title: "Culte du 5 octobre", leader: "Inès Imaginaire", category: "Culte Francophone", date: "2026-10-05",
      language: "mixed", notes: "", ownerId: "uid-owner", isPrivate: false,
      items: [
        { ...item, songSlug: ZH, position: 1, ...(opts.jianpuSheet === undefined ? {} : { jianpuSheet: opts.jianpuSheet }) },
        { ...item, songSlug: FR, position: 2, jianpuSheet: true },
      ],
    },
  }, "/setlists/setlist-roles-jp");
  await page.getByRole("button", { name: /Mode Louange|敬拜模式/ }).click();
  await attendreMiseEnPage(page);
}

const lirePref = (page: Page) => page.evaluate(() => localStorage.getItem("jianpu-sheet-pref"));

async function verifierParoles(page: Page) {
  await expect(onStage(page, "[data-jianpu-page]")).toHaveCount(0);
  await expect(onStage(page, "[data-copy-line]").filter({ hasText: /亲.*爱/ }).locator("visible=true").first()).toBeVisible();
  await expect(onStage(page, "[data-copy-pinyin]").first()).toBeAttached();
}

/** Le chant FR s'affiche en paroles, jamais en scan : on avance jusqu'à voir une section FR (la pastille « Ensuite » n'apparaît qu'en dernière page d'un chant). */
async function verifierFr(page: Page) {
  const fr = onStage(page, "[data-section]").filter({ hasText: "Abba" }).locator("visible=true");
  await expect(async () => {
    if ((await fr.count()) === 0) await page.keyboard.press("ArrowRight");
    await expect(fr.first()).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await expect(onStage(page, "[data-jianpu-page]").locator("visible=true")).toHaveCount(0);
}

test.describe("prefPourRole (pur)", () => {
  test("auto + choriste ou présidence : never ; le reste inchangé", () => {
    expect(prefPourRole("auto", "choriste")).toBe("never");
    expect(prefPourRole("auto", "presidence")).toBe("never");
    expect(prefPourRole("auto", "pianiste")).toBe("auto");
    expect(prefPourRole("auto", null)).toBe("auto");
    expect(prefPourRole("always", "choriste")).toBe("always");
    expect(prefPourRole("never", "presidence")).toBe("never");
    expect(prefPourRole("always", "pianiste")).toBe("always");
  });
});

test.describe("mode louange, rôles et 简谱", () => {
  test("choriste, préférence absente : paroles + pinyin, pas de scan", async ({ page }, info) => {
    await ouvrir(page, { role: "choriste" });
    await verifierParoles(page);
    await page.screenshot({ path: `test-results/louange-roles-jianpu-${info.project.name}-a.png` });
    await verifierFr(page);
  });

  test("choriste, jianpuSheet true : paroles + pinyin", async ({ page }) => {
    await ouvrir(page, { role: "choriste", jianpuSheet: true });
    await verifierParoles(page);
  });

  test("présidence, préférence absente : paroles + pinyin, pas de scan", async ({ page }) => {
    await ouvrir(page, { role: "presidence" });
    await verifierParoles(page);
    await verifierFr(page);
  });

  test("choriste touche « 简谱 » dans la marge : le scan, préférence « always »", async ({ page }, info) => {
    await ouvrir(page, { role: "choriste" });
    await verifierParoles(page);
    const options = await ouvrirOptions(page);
    // RU-5 : le choix « 简谱 | Paroles » de la marge (« Ce que je lis »).
    const bouton = options.getByRole("radio", { name: "简谱", exact: true });
    await expect(bouton).toHaveAttribute("aria-checked", "false");
    await bouton.click();
    await expect(bouton).toHaveAttribute("aria-checked", "true");
    expect(await lirePref(page)).toBe("always");
    await page.keyboard.press("Escape");
    await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible();
    await page.screenshot({ path: `test-results/louange-roles-jianpu-${info.project.name}-c.png` });
  });

  test("choriste, préférence « always » déjà réglée : le scan", async ({ page }) => {
    await ouvrir(page, { role: "choriste", pref: "always" });
    await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible();
    await verifierFr(page);
  });

  test("pianiste, préférence absente : le scan (inchangé)", async ({ page }) => {
    await ouvrir(page, { role: "pianiste" });
    await expect(onStage(page, "[data-jianpu-page]").first()).toBeVisible();
    await verifierFr(page);
  });
});
