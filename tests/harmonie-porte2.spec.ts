import { expect, test } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

// Harmonie H4-1 (docs/spec-harmonie-accords.md) : la porte 2, « Harmonie de ce chant ».
// Bouton « Harmonie » de la page chant, feuille ouverte, un bloc par passage (filet à gauche,
// phrase de fonction, bouton Écouter). Chant FR `a-jamais-tu-es-saint`, chant ZH `一切歌颂赞美`.

const JO: FakeProfile = { uid: "uid-jo", email: "jo@example.com", firstName: "Jo", lastName: "L.", planningName: "Jo L.", ...musicien("piano") };

for (const slug of ["a-jamais-tu-es-saint", "一切歌颂赞美"]) {
  test(`${slug} : le bouton « Harmonie » ouvre un bloc par passage, avec filet, fonction et Écouter`, async ({ page }) => {
    // Web Audio : le bouton Écouter n'existe que si le navigateur sait jouer.
    await page.addInitScript(() => {
      (window as unknown as { AudioContext?: unknown }).AudioContext ??= class {};
    });
    await signInAs(page, JO, {}, `/songs/${encodeURIComponent(slug)}`);
    await page.getByTestId("barre-outils").getByRole("button", { name: /^(Harmonie|和声)$/ }).click();
    const feuille = page.locator("[data-idees-harmonie]");
    await expect(feuille).toBeVisible();

    const blocs = feuille.locator("[data-passage]");
    expect(await blocs.count()).toBeGreaterThan(0);
    const premier = blocs.first();
    expect(await premier.evaluate((el) => getComputedStyle(el).borderLeftWidth)).toBe("3px");
    await expect(premier.getByText(/^(Finit sur le|Pas d'accords|落在|这一段没有和弦)/)).toBeVisible();
    await expect(feuille.getByRole("button", { name: /^(Écouter|试听)$/ }).first()).toBeVisible();
  });
}
