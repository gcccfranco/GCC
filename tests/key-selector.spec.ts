import { expect, test } from "@playwright/test";

/** Les douze tonalités attendues, écrites comme une grille d'accords les
 *  écrit. Table **indépendante** de `src/lib/transpose.ts` : un attendu
 *  calculé avec le code testé ne teste rien. */
const DOUZE = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

async function ouvrir(page: import("@playwright/test").Page, slug: string) {
  await page.goto(`/songs/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
  const select = page.locator("select").first();
  await select.waitFor();
  return select;
}

const options = (s: import("@playwright/test").Locator) =>
  s.locator("option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));

test.describe("sélecteur de tonalité", () => {
  test("un chant en tonalité usuelle n'offre que les douze", async ({ page }) => {
    const select = await ouvrir(page, "la-benediction"); // {key: B}
    expect(await options(select)).toEqual(DOUZE);
    await expect(select).toHaveValue("B");
  });

  // Une tonalité qui s'écrit autrement ne doit pas disparaître de la liste :
  // un `<select>` dont la valeur n'est dans aucune option s'affiche **vide**,
  // et le chant perdrait sa tonalité à l'écran sans que rien ne le dise.
  for (const [slug, tonalité] of [
    ["a-jamais-tu-es-saint", "C#"],
    ["dieu-sauveur", "G#"],
    ["a-l-agneau", "Am"], // pas une des douze : ni majeure, ni enharmonique
  ] as const) {
    test(`${slug} garde sa tonalité « ${tonalité} » dans la liste`, async ({ page }) => {
      const select = await ouvrir(page, slug);
      const noms = await options(select);
      expect(noms).toContain(tonalité);
      // les douze plus la sienne, et rien d'autre — comparé trié, l'ordre de
      // la liste restant chromatique et non alphabétique.
      expect([...noms].sort()).toEqual([...DOUZE, tonalité].sort());
      await expect(select).toHaveValue(tonalité);
    });
  }

  // **Les deux moitiés doivent nommer pareil.** Les boutons − / + calculent la
  // tonalité avec `getTransposedKey`, le sélecteur la propose depuis
  // `ALL_KEYS` : rien n'oblige les deux à s'accorder, et au triton elles ne
  // s'accordaient pas — `Gb` rendu, `F#` proposé.
  //
  // Le désaccord ne **vide** pas le champ, parce que `keyOptions` insère la
  // valeur reçue quelle qu'elle soit : elle ajouterait simplement un
  // treizième nom à la liste, sans que rien ne le dise. L'oracle est donc le
  // **parcours** : douze demi-tons doivent rendre les douze noms attendus, et
  // aucun autre.
  test("douze demi-tons rendent les douze tonalités attendues", async ({ page }) => {
    const select = await ouvrir(page, "la-benediction");
    const plus = page.getByRole("button", { name: "+", exact: true });

    // Avant l'hydratation le bouton existe mais reste inerte, et le clic est
    // perdu sans que rien ne le dise. On clique donc jusqu'à ce que la page
    // réponde. Peu importe combien de demi-tons y passent : le parcours est
    // **cyclique**, douze pas depuis n'importe où donnent les douze noms.
    const départ = await select.inputValue();
    await expect(async () => {
      await plus.click();
      await expect(select).not.toHaveValue(départ, { timeout: 500 });
    }).toPass({ timeout: 15_000 });

    const parcourues: string[] = [await select.inputValue()];
    for (let i = 1; i < 12; i++) {
      const avant = parcourues[i - 1];
      await plus.click();
      // Lu tout de suite, le champ porte encore la tonalité précédente.
      await expect(select).not.toHaveValue(avant);
      parcourues.push(await select.inputValue());
    }
    expect([...parcourues].sort()).toEqual([...DOUZE].sort());
  });
});
