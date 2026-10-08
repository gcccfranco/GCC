import { expect, test, type Page } from "@playwright/test";
import {
  interrupteurAllume,
  prefDepuisInterrupteur,
  sheetEnabled,
  type JianpuPref,
} from "../src/lib/jianpu/preference";

// Chantier 简谱, lot 1 « 简谱 par défaut » (docs/spec-jianpu-integration.md) :
// un chant qui a un scan s'ouvre sur son scan, partout, sans action de
// personne ; « Partition 简谱 » devient un interrupteur allumé par défaut ; le
// choix de la personne prime sur le « Paroles » du responsable (D4, O1).
// Setlists et comptes simulés, noms fictifs.

test("règle : préférence × choix du responsable (9 cas)", () => {
  const cas: [JianpuPref, boolean | undefined, boolean][] = [
    // Non réglée (absente, ou l'ancien « Choix du responsable ») : le scan,
    // sauf « Paroles » choisi par le responsable.
    ["auto", undefined, true],
    ["auto", true, true],
    ["auto", false, false],
    // Réglée sur 简谱 : le scan, même si le responsable a choisi « Paroles ».
    ["always", undefined, true],
    ["always", true, true],
    ["always", false, true],
    // Réglée sur Paroles : jamais le scan.
    ["never", undefined, false],
    ["never", true, false],
    ["never", false, false],
  ];
  for (const [pref, item, attendu] of cas) {
    expect(sheetEnabled(pref, item), `${pref} × ${item}`).toBe(attendu);
  }
});

test("règle : l'interrupteur montre et écrit la préférence (reprise D3)", () => {
  expect(interrupteurAllume("auto"), "Choix du responsable → allumé").toBe(true);
  expect(interrupteurAllume("always"), "Toujours → allumé").toBe(true);
  expect(interrupteurAllume("never"), "Jamais → éteint").toBe(false);
  expect(prefDepuisInterrupteur(true)).toBe("always");
  expect(prefDepuisInterrupteur(false)).toBe("never");
});

const PREF = "jianpu-sheet-pref";
const lirePref = (page: Page) => page.evaluate((k) => localStorage.getItem(k), PREF);

/** Toutes les pages de scan affichées, images chargées (1 à 2 Mo chacune). */
async function scanCharge(page: Page) {
  await expect(page.locator("[data-jianpu-page] img").first()).toBeVisible();
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>("[data-jianpu-page] img")).every(
      (img) => img.complete && img.naturalWidth > 0,
    ),
  );
}

test.describe("page chant", () => {
  const bouton谱 = (page: Page) => page.getByRole("button", { name: "简谱", exact: true });

  test("un chant à scan s'ouvre sur son scan, sans action ; un chant FR reste en paroles", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    await scanCharge(page);
    await expect(page.locator("[data-copy-line]"), "aucune ligne de paroles").toHaveCount(0);
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "true");
    expect(await lirePref(page), "rien n'est écrit au chargement").toBeNull();

    await page.goto("/songs/abba-pere");
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
    await expect(bouton谱(page)).toHaveCount(0);
  });

  test("le bouton 谱 règle la préférence de l'appareil : paroles, retenues au rechargement, puis scan", async ({ page }) => {
    await page.goto(`/songs/${encodeURIComponent("一生爱你")}`);
    await scanCharge(page);

    await bouton谱(page).click();
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "false");
    expect(await lirePref(page)).toBe("never");

    await page.reload();
    await expect(page.locator("[data-copy-line]").first()).toBeVisible();
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(0);

    await bouton谱(page).click();
    await scanCharge(page);
    await expect(bouton谱(page)).toHaveAttribute("aria-pressed", "true");
    expect(await lirePref(page)).toBe("always");
  });

  test("téléphone : en fin de défilement, la fin de la feuille reste au-dessus de la barre d'onglets (K2)", async ({ page }) => {
    test.skip(test.info().project.name !== "telephone", "la barre d'onglets du téléphone");
    await page.goto(`/songs/${encodeURIComponent("为我而来")}`);
    await scanCharge(page);
    await expect(page.locator("[data-jianpu-page]")).toHaveCount(2);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    // Un léger retour vers le haut fait revenir la barre, comme au doigt.
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollBy(0, -1));
    const barre = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(barre).toBeInViewport();
    await page.waitForTimeout(400); // fin de la transition de la barre
    const basDeLaFeuille = await page.locator("[data-jianpu-page]").last().evaluate((el) => el.getBoundingClientRect().bottom);
    const hautDeLaBarre = await barre.evaluate((el) => el.getBoundingClientRect().top);
    expect(basDeLaFeuille).toBeLessThanOrEqual(hautDeLaBarre);
  });
});
