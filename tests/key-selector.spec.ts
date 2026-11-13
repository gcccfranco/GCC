import { expect, test } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";

/** Les douze tonalités attendues, écrites comme une grille d'accords les
 *  écrit. Table **indépendante** de `src/lib/transpose.ts` : un attendu
 *  calculé avec le code testé ne teste rien. */
const DOUZE = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

async function ouvrir(page: import("@playwright/test").Page, slug: string) {
  await page.goto(`/songs/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
  // Dans la barre du chant : en deux volets, la liste (et son choix de thème) est à côté (lot U5).
  const select = page.getByTestId("barre-outils").locator("select").first();
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
  //
  // Depuis le 14/09/2026, les deux premiers démarrent dans leur tonalité
  // recommandée (A) : leur originale doit rester proposée quand même.
  for (const [slug, tonalité, départ] of [
    ["a-jamais-tu-es-saint", "C#", "A"],
    ["dieu-sauveur", "G#", "A"],
  ] as const) {
    test(`${slug} garde sa tonalité « ${tonalité} » dans la liste`, async ({ page }) => {
      const select = await ouvrir(page, slug);
      await expect(select).toHaveValue(départ);
      const noms = await options(select);
      expect(noms).toContain(tonalité);
      // les douze plus la sienne, et rien d'autre — comparé trié, l'ordre de
      // la liste restant chromatique et non alphabétique.
      expect([...noms].sort()).toEqual([...DOUZE, tonalité].sort());
    });
  }

  // Un chant mineur propose les douze tonalités mineures, et elles seules.
  test("a-l-agneau (Am) offre les douze mineures", async ({ page }) => {
    const select = await ouvrir(page, "a-l-agneau");
    await expect(select).toHaveValue("Am");
    expect(await options(select)).toEqual(
      ["Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm"],
    );
  });

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

// Transposé, le chant affiche le bouton de retour à sa tonalité par défaut
// dans la même pilule : sur téléphone, la tonalité rognée ne laissait que la
// flèche (不停赞美你 en G, recommandée F — captures du lot 8, relevé du 27/09).
test("transposé, la tonalité reste lisible entière à côté du bouton de retour", async ({ page }) => {
  // Vue paroles : sa barre porte aussi 拼 et 谱, la plus chargée.
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.goto(`/songs/${encodeURIComponent("不停赞美你")}?key=${encodeURIComponent(JSON.stringify("G"))}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("select").first()).toHaveValue("G");
  // La barre est complète une fois la vue paroles montée (bouton du pinyin).
  await expect(page.getByRole("button", { name: "Pinyin" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const tonalite = page.getByTestId("tonalite-courante");
  const { large, plein } = await tonalite.evaluate((el) => ({
    large: el.getBoundingClientRect().width,
    plein: el.scrollWidth,
  }));
  expect(large).toBeGreaterThan(0);
  expect(plein).toBeLessThanOrEqual(Math.ceil(large));
});

// chants-4 : un mot devant la lettre du ton, dans la langue de l'interface (pas celle du chant).
test.describe("pilule de tonalité : le mot « Ton » / « 调 » devant la lettre", () => {
  test("interface française : « Ton A » sur un chant français", async ({ page }) => {
    const select = await ouvrir(page, "la-benediction");
    await expect(select).toHaveValue("B");
    await expect(page.getByTestId("tonalite-courante")).toContainText("Ton");
    await expect(page.getByTestId("tonalite-lettre")).toHaveText("B");
    await expect(page.getByTestId("tonalite-courante")).toHaveText(/^Ton\s*B/, { useInnerText: true });
  });

  test("interface chinoise : « 调 E » sur un chant chinois", async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
    const select = await ouvrir(page, "一生爱你");
    await expect(select).toHaveValue("E");
    await expect(page.getByTestId("tonalite-courante")).toHaveText(/^调\s*E/, { useInnerText: true });
  });
});

// Parcours à l'œil du 13/11, constat 5 : au téléphone, « T… A » et « ㅣC ». Le mot devant la lettre passe entier ou
// pas du tout ; la lettre reste entière dans la pilule et la rangée de la barre ne déborde pas. Pianiste connecté : sa
// barre porte aussi « Harmonie », la plus chargée.
const PIANISTE: FakeProfile = { uid: "uid-orane", email: "orane@example.com", firstName: "Orane", lastName: "V.", planningName: "Orane V.", ...musicien("piano") };
test.describe("pilule de tonalité : jamais de mot rogné (parcours du 13/11, constat 5)", () => {
  for (const { nom, slug, zh } of [
    { nom: "chant français, interface française", slug: "abba-pere", zh: false },
    { nom: "chant chinois, interface chinoise", slug: "一切都更新", zh: true },
  ]) {
    test(nom, async ({ page }) => {
      if (zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
      await signInAs(page, PIANISTE, {}, `/songs/${encodeURIComponent(slug)}`);
      await expect(page.getByTestId("barre-outils").getByRole("button", { name: zh ? "和声" : "Harmonie" })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const mesure = () => page.evaluate(() => {
        const r = (sel: string) => document.querySelector(`[data-testid="${sel}"]`)!.getBoundingClientRect();
        const cadre = r("tonalite-courante"), mot = r("tonalite-mot"), lettre = r("tonalite-lettre"), pilule = r("pilule-tonalite");
        const motEl = document.querySelector('[data-testid="tonalite-mot"]') as HTMLElement;
        const rangee = document.querySelector(".rangee-chant") as HTMLElement;
        const fin = rangee.getBoundingClientRect().right - parseFloat(getComputedStyle(rangee).paddingRight);
        return {
          motEntier: motEl.scrollWidth <= Math.ceil(mot.width) && mot.left >= cadre.left - 0.5 && mot.right <= cadre.right + 0.5 && mot.bottom <= cadre.bottom + 0.5,
          motMasque: mot.top >= cadre.bottom - 0.5,
          lettreDansCadre: lettre.left >= cadre.left - 0.5 && lettre.right <= cadre.right + 0.5 && lettre.top >= cadre.top - 0.5 && lettre.bottom <= cadre.bottom + 0.5,
          lettreDansPilule: lettre.left >= pilule.left && lettre.right <= pilule.right,
          rangeeTient: [...rangee.children].every((c) => c.getBoundingClientRect().right <= fin + 0.5),
        };
      });
      // Retour, transposition à + 1 : la lettre change, la règle tient toujours.
      for (const etape of ["origine", "transposé"]) {
        if (etape === "transposé") await page.getByTestId("pilule-tonalite").getByRole("button", { name: "+" }).click();
        await expect(page.getByTestId("tonalite-lettre")).toBeVisible();
        const m = await mesure();
        expect(m.motEntier || m.motMasque, `${etape} : le mot est entier ou absent, jamais coupé`).toBe(true);
        expect(m.lettreDansCadre, `${etape} : la lettre est entière`).toBe(true);
        expect(m.lettreDansPilule, `${etape} : la lettre reste dans la pilule`).toBe(true);
        expect(m.rangeeTient, `${etape} : la barre ne déborde pas`).toBe(true);
      }
    });
  }
});
