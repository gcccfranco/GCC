import { expect, test } from "@playwright/test";

/** Les douze tonalités attendues, écrites comme une grille d'accords les
 *  écrit. Table **indépendante** de `src/lib/transpose.ts` : un attendu
 *  calculé avec le code testé ne teste rien. */
const DOUZE = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

/** Ouvre la fenêtre de l'armure ; rend la liste des douze touches (radiogroup). */
async function ouvrir(page: import("@playwright/test").Page, slug: string) {
  await page.goto(`/songs/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
  // Un clic avant l'hydratation se perd : on recommence tant que la fenêtre n'est pas ouverte.
  await expect(async () => {
    if (!(await page.getByTestId("fenetre-armure").isVisible())) await page.getByTestId("armure").click({ timeout: 1000 });
    await expect(page.getByTestId("fenetre-armure")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  return page.getByTestId("fenetre-armure").getByRole("radiogroup");
}

// Le nom d'une touche, comme une grille d'accords l'écrit (♯ ♭ de l'affichage → # b).
const noms = (groupe: import("@playwright/test").Locator) =>
  groupe.getByRole("radio").evaluateAll((els) => els.map((e) => e.querySelector("span")!.textContent!.replace(/♯/g, "#").replace(/♭/g, "b")));
const courante = async (groupe: import("@playwright/test").Locator) =>
  (await groupe.locator('[role="radio"][aria-checked="true"]').evaluate((e) => e.querySelector("span")!.textContent!)).replace(/♯/g, "#").replace(/♭/g, "b");

test.describe("sélecteur de tonalité", () => {
  test("un chant en tonalité usuelle n'offre que les douze", async ({ page }) => {
    const groupe = await ouvrir(page, "la-benediction"); // {key: B}
    expect(await noms(groupe)).toEqual(DOUZE);
    expect(await courante(groupe)).toBe("B");
  });

  // Une tonalité qui s'écrit autrement ne doit pas disparaître de la liste :
  // la tonalité du chant serait perdue à l'écran sans que rien ne le dise.
  //
  // Depuis le 14/09/2026, les deux premiers démarrent dans leur tonalité
  // recommandée (A) : leur originale doit rester proposée quand même.
  for (const [slug, tonalité, départ] of [
    ["a-jamais-tu-es-saint", "C#", "A"],
    ["dieu-sauveur", "G#", "A"],
  ] as const) {
    test(`${slug} garde sa tonalité « ${tonalité} » dans la liste`, async ({ page }) => {
      const groupe = await ouvrir(page, slug);
      expect(await courante(groupe)).toBe(départ);
      const liste = await noms(groupe);
      expect(liste).toContain(tonalité);
      // les douze plus la sienne, et rien d'autre — comparé trié, l'ordre de
      // la liste restant chromatique et non alphabétique.
      expect([...liste].sort()).toEqual([...DOUZE, tonalité].sort());
    });
  }

  // Un chant mineur propose les douze tonalités mineures, et elles seules.
  test("a-l-agneau (Am) offre les douze mineures", async ({ page }) => {
    const groupe = await ouvrir(page, "a-l-agneau");
    expect(await courante(groupe)).toBe("Am");
    expect(await noms(groupe)).toEqual(
      ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"],
    );
  });

  // Le parcours des douze touches (flèche droite, de voisine en voisine) doit rendre les douze noms attendus,
  // et aucun autre : l'oracle est le parcours, pas la liste (`keyOptions` insère la tonalité reçue quelle
  // qu'elle soit et ajouterait un treizième nom sans que rien ne le dise).
  test("douze touches voisines rendent les douze tonalités attendues", async ({ page }) => {
    const groupe = await ouvrir(page, "la-benediction");
    await groupe.locator('[role="radio"][aria-checked="true"]').focus();
    const parcourues: string[] = [await courante(groupe)];
    for (let i = 1; i < 12; i++) {
      const avant = parcourues[i - 1];
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => courante(groupe)).not.toBe(avant);
      parcourues.push(await courante(groupe));
    }
    expect([...parcourues].sort()).toEqual([...DOUZE].sort());
  });
});
