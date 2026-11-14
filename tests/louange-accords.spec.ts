import { expect, test, type Locator, type Page } from "@playwright/test";
import type { SetlistItem } from "../src/types/setList";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, basculerAnnoter, lireCompteur, onStage, type Langue } from "./helpers/louange";

// AL-2 (docs/spec-accords-louange.md) : en mode louange, un accord (paroles ou scan 简谱) ouvre le panneau d'accord au centre de
// la page, sans tourner la page ni basculer la barre ; dans une bande latérale le toucher tourne la page ; un toucher hors du
// panneau le ferme sans rien tourner ; en Crayon les accords sont inertes ; l'appui long ouvre le Crayon ; « Ici » (accès
// Harmonie, réglage éteint) ouvre la fenêtre des idées. Spec d'agencement : cinq projets. Captures : test-results/al2-*.png. Noms fictifs.

const SETLIST_ID = "setlist-louange-accords";
const AVEC_ACCES: FakeProfile = { uid: "uid-noemie", email: "noemie@example.com", firstName: "Noémie", lastName: "T.", planningName: "Noémie T.", ...musicien("piano") };
const SANS_ACCES: FakeProfile = { uid: "uid-bastien", email: "bastien@example.com", firstName: "Bastien", lastName: "L.", planningName: "Bastien L.", ...musicien("batterie") };

const CHANTS = [
  { slug: "a-jamais-tu-es-saint", langue: "fr" as Langue, cle: "C#" },
  { slug: "一切歌颂赞美", langue: "zh" as Langue, cle: "E" },
];
const SCAN = { slug: "为我而来", langue: "fr" as Langue, cle: "D" };

const setlist = (slug: string, cle: string, scan: boolean) => ({
  title: "Culte du 11 octobre", leader: "Présidence", category: "Culte Francophone", date: "2026-10-11", language: "mixed", notes: "",
  ownerId: "uid-owner", isPrivate: false,
  items: [{ songSlug: slug, position: 1, keyOverride: cle, showChords: true, showPinyin: true, useJianpu: false, jianpuSheet: scan, structureOverride: null, sectionNotes: {}, notes: "" } satisfies SetlistItem],
});

async function ouvrirMode(page: Page, profil: FakeProfile, c: { slug: string; langue: Langue; cle: string }, { scan = false, allume = false } = {}) {
  await page.addInitScript(({ u, zh, on, scan }) => {
    localStorage.setItem("perf-role-preset", "pianiste");
    localStorage.setItem("accords-aide-vue", "1");
    localStorage.setItem("jianpu-sheet-pref", scan ? "always" : "never");
    if (zh) localStorage.setItem("i18nextLng", "zh-CN");
    if (on) localStorage.setItem(`perf-idees-harmonie-${u}`, "1");
  }, { u: profil.uid, zh: c.langue === "zh", on: allume, scan });
  await signInAs(page, profil, { [`setlists/${SETLIST_ID}`]: setlist(c.slug, c.cle, scan) }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: c.langue === "zh" ? /敬拜模式/ : /Mode Louange/ }).first().click();
  await attendreMiseEnPage(page);
  await attendreCompteur(page, /^\d+ \/ \d+$/);
  if (scan) await page.waitForFunction(() => Array.from(document.querySelectorAll<HTMLImageElement>("[data-performance-mode] [data-jianpu-page] img")).every((i) => i.complete && i.naturalWidth > 0));
}

const accords = (page: Page, scan: boolean) => onStage(page, scan ? "[data-jianpu-label] [data-accord-touchable]" : "[data-accord-touchable]");
const panneau = (page: Page) => page.locator("[data-accord-panneau]");
const barreOuverte = (page: Page) => page.locator("[data-performance-mode]").getAttribute("data-barre-ouverte");

/** Le premier accord visible dont le centre est dans le tiers central de l'écran (hors bandes latérales). */
async function accordAuCentre(page: Page, scan: boolean): Promise<Locator> {
  const l = accords(page, scan);
  await expect(l.first()).toBeVisible({ timeout: 15_000 });
  const w = page.viewportSize()!.width;
  const n = await l.evaluateAll((els, w) => els.findIndex((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; return r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && x > w * 0.34 && x < w * 0.66 && document.elementFromPoint(x, r.top + r.height / 2)?.closest("[data-accord-touchable]") === el; }), w);
  expect(n, "un accord au centre de la page").toBeGreaterThanOrEqual(0);
  return l.nth(n);
}

for (const c of [...CHANTS, SCAN]) {
  const scan = c === SCAN;
  const nom = scan ? "scan 简谱" : c.langue.toUpperCase();
  test(`chant ${nom} : un accord touché au centre ouvre le panneau, sans tourner la page ni basculer la barre`, async ({ page }, info) => {
    await ouvrirMode(page, SANS_ACCES, c, { scan });
    const accord = await accordAuCentre(page, scan);
    const [page0, barre0] = [await lireCompteur(page), await barreOuverte(page)];
    await accord.click();
    await expect(panneau(page)).toBeVisible();
    expect(await lireCompteur(page), "page inchangée").toBe(page0);
    expect(await barreOuverte(page), "barre inchangée").toBe(barre0);
    await expect(panneau(page).locator("[data-ici]"), "sans accès Harmonie, pas d'« Ici »").toHaveCount(0);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/al2-${info.project.name}-${scan ? "scan" : c.langue}.png` });
  });
}

for (const c of CHANTS) {
  test(`chant ${c.langue.toUpperCase()} : toucher hors du panneau le ferme sans tourner la page ni basculer la barre`, async ({ page }) => {
    await ouvrirMode(page, SANS_ACCES, c);
    const accord = await accordAuCentre(page, false);
    await accord.click();
    await expect(panneau(page)).toBeVisible();
    const [page0, barre0] = [await lireCompteur(page), await barreOuverte(page)];
    const ecran = page.viewportSize()!;
    await expect(async () => {
      await page.mouse.click(ecran.width * 0.5, ecran.height * 0.12 + 4);
      await expect(panneau(page)).toHaveCount(0, { timeout: 1_000 });
    }).toPass({ timeout: 8_000 });
    expect(await lireCompteur(page)).toBe(page0);
    expect(await barreOuverte(page)).toBe(barre0);
  });

  test(`chant ${c.langue.toUpperCase()} : un accord dans la bande latérale tourne la page et n'ouvre pas le panneau`, async ({ page }) => {
    await ouvrirMode(page, SANS_ACCES, c);
    const accord = await accordAuCentre(page, false);
    const avant = await lireCompteur(page);
    const [, total] = avant.split(" / ").map(Number);
    test.skip(total < 2, "chant d'une seule page à cette taille : rien à tourner");
    // Le toucher est rejoué avec une abscisse dans la bande droite (aucun accord n'y est forcément écrit).
    const x = page.viewportSize()!.width - 8;
    const init = { clientX: x, clientY: 300, pointerType: "touch", pointerId: 7, isPrimary: true, button: 0, bubbles: true };
    const el = (await accord.elementHandle())!; // la page tourne au pointerup : le locator `nth` ne retrouverait plus l'accord
    await el.dispatchEvent("pointerdown", init);
    await el.dispatchEvent("pointerup", init);
    await el.dispatchEvent("click", { clientX: x, clientY: 300, bubbles: true });
    await expect.poll(() => lireCompteur(page)).not.toBe(avant);
    await expect(panneau(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : Crayon allumé, les accords sont inertes`, async ({ page }) => {
    await ouvrirMode(page, SANS_ACCES, c);
    await expect(accords(page, false).first()).toBeVisible({ timeout: 15_000 });
    // Barre masquée : un toucher en haut de page (aucun accord) la rappelle ; le centre peut tomber sur un accord, qui ouvrirait le panneau.
    if ((await page.locator("[data-barre-ouverte]").count()) === 0) await page.mouse.click(page.viewportSize()!.width / 2, 8);
    await basculerAnnoter(page, c.langue);
    await expect(page.locator("[data-crayon-barre]").first()).toBeVisible();
    await expect(onStage(page, "[data-accord-touchable]")).toHaveCount(0);
    await expect(panneau(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : appui long sur un accord (souris) ouvre le Crayon, pas le panneau`, async ({ page }) => {
    await ouvrirMode(page, SANS_ACCES, c);
    const accord = await accordAuCentre(page, false);
    const b = (await accord.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await expect(page.locator("[data-crayon-barre]").first()).toBeVisible({ timeout: 5_000 });
    await page.mouse.up();
    await expect(panneau(page)).toHaveCount(0);
  });

  test(`chant ${c.langue.toUpperCase()} : « Ici » (accès Harmonie, réglage éteint) ouvre la fenêtre des idées sans tourner la page ; les noms restent inertes`, async ({ page }) => {
    await ouvrirMode(page, AVEC_ACCES, c, { allume: false });
    await expect(onStage(page, "button[data-section-nom-bouton]")).toHaveCount(0);
    // « Ici » ne paraît que si une idée de la section porte sur l'accord : on essaie les accords du centre jusqu'à en trouver un.
    const l = accords(page, false);
    await expect(l.first()).toBeVisible({ timeout: 15_000 });
    const w = page.viewportSize()!.width;
    const centraux = await l.evaluateAll((els, w) => els.flatMap((el, i) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; return r.width > 0 && r.top > 120 && r.bottom < innerHeight - 120 && x > w * 0.34 && x < w * 0.66 ? [i] : []; }), w);
    let trouve = false;
    for (const i of centraux) {
      await l.nth(i).click();
      try {
        await expect(panneau(page).locator("[data-ici]")).toBeVisible({ timeout: 3_000 });
        trouve = true;
        break;
      } catch {
        await page.keyboard.press("Escape");
        await expect(panneau(page)).toHaveCount(0);
      }
    }
    expect(trouve, "un accord au centre qui ouvre « Ici »").toBe(true);
    const avant = await lireCompteur(page);
    await panneau(page).locator("[data-ici]").click();
    await expect(page.locator("[data-idees-harmonie]")).toBeVisible();
    await expect(panneau(page)).toHaveCount(0);
    expect(await lireCompteur(page)).toBe(avant);
    await expect(onStage(page, "button[data-section-nom-bouton]")).toHaveCount(0);
  });
}

test("scan 简谱, « Ici » (accès Harmonie, réglage éteint) : un accord du scan ouvre le panneau avec « Ici », sans rail d'étiquettes", async ({ page }) => {
  await ouvrirMode(page, AVEC_ACCES, SCAN, { scan: true });
  await expect(onStage(page, "[data-jianpu-etiquette]")).toHaveCount(0);
  await (await accordAuCentre(page, true)).click();
  await expect(panneau(page)).toBeVisible();
  await expect(panneau(page).locator("[data-ensuite]")).toHaveCount(0);
});
