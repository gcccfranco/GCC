import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { musicien, signInAs, type FakeProfile } from "./helpers/fakeSession";
import { ouvrirPartitions } from "./helpers/setlist";

// JV-5a (docs/spec-jianpu-deux-volets.md, « Reprise du 13/11 ») : toucher le NOM d'une section ouvre le volet Harmonie
// du chant au bloc de ce passage (colonne en grand écran, feuille à mi-hauteur au téléphone et en tablette portrait),
// par le même chemin que « Ici ». Spec d'agencement : cinq projets (SPECS_GRAND_ECRAN). Captures : test-results/captures-jv5a/.

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
const CULTE = csv([
  ["2026 DATE", "Présidence", "Choristes", "", "Pianiste", "Guitariste", "Batterie", "Sono", "PPT", "Orateur", "Traducteur", "Sainte cène"],
  ["20/09", "Lise B.", "", "", "Noémie V.", "Tanguy R.", "", "", "", "Orateur", "", ""],
]);
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien-jv5a", email: "musicien-jv5a@example.com", firstName: "Noémie", lastName: "Vasseur", planningName: "Noémie V.",
  serviceRoles: { "Culte Francophone": ["musicien"] }, ...musicien("piano", "guitare"),
};
const SANS_ACCES: FakeProfile = { uid: "uid-lecteur-jv5a", email: "lecteur-jv5a@example.com", firstName: "Gaël", lastName: "Dupré", planningName: "Gaël D." };

const SETLIST_ID = "setlist-volet-section";
const SETLIST = {
  title: "Culte du 21 septembre", leader: "Lise B.", category: "Culte Francophone", date: "2026-09-21", language: "fr", notes: "",
  ownerId: "uid-owner", isPrivate: false,
  items: [{ songSlug: "promesses", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
};

const volet = (page: Page) => page.locator("[data-harmonie-colonne], [data-idees-harmonie]").first();
const feuille = (page: Page) => page.locator("[data-idees-harmonie]");
const nomPont = (page: Page) => page.getByRole("button", { name: /Idées d'harmonie : Pont|「(Pont|桥段)」的和声建议/ }).first();
const blocPont = (page: Page) => volet(page).locator("[data-passage-uids]").filter({ has: page.getByRole("heading", { name: /^(Pont|桥段)/ }) });

async function langue(page: Page, l: "fr" | "zh-CN") {
  await page.addInitScript((x) => { try { localStorage.setItem("i18nextLng", x); } catch { /* ignore */ } }, l);
}
async function ouvrirChant(page: Page, slug: string, profil: FakeProfile = MUSICIEN) {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await signInAs(page, profil, {}, `/songs/${encodeURIComponent(slug)}`);
  await expect(page.locator("main.song-zoom [data-copy-line]").first()).toBeVisible();
}
async function ouvrirSetlist(page: Page) {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    const sheet = new URL(route.request().url()).searchParams.get("sheet");
    return route.fulfill({ status: 200, contentType: "text/csv", body: sheet === "Franco_Louange" ? CULTE : "" });
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, `/setlists/${SETLIST_ID}`);
  await ouvrirPartitions(page);
  await expect(page.locator("[data-outline-item=\"1\"] [data-section-uids]").first()).toBeVisible();
}

test("page chant : « Pont » est un bouton ; le toucher ouvre le volet au bloc du Pont, avec Fmaj7", async ({ page }) => {
  await ouvrirChant(page, "promesses");
  await expect(nomPont(page)).toBeVisible();
  await nomPont(page).click();
  await expect(volet(page)).toBeVisible();
  await expect(blocPont(page)).toBeVisible();
  await expect(blocPont(page).getByText("Fmaj7").first()).toBeVisible();
});

test("téléphone et tablette portrait : la feuille fait 50 % de l'écran et le nom « Pont » reste visible au-dessus", async ({ page }, info) => {
  test.skip(!["telephone", "tablette"].includes(info.project.name), "téléphone et tablette portrait seulement");
  await ouvrirChant(page, "promesses");
  await nomPont(page).click();
  await expect(feuille(page)).toBeVisible();
  const h = page.viewportSize()!.height;
  await expect.poll(async () => Math.abs(((h - (await feuille(page).boundingBox())!.y) / h) - 0.5), { timeout: 5000 }).toBeLessThanOrEqual(0.06);
  const nom = (await page.locator("main.song-zoom [data-section-nom-bouton]").filter({ hasText: /^Pont$/, visible: true }).first().boundingBox())!;
  const haut = (await feuille(page).boundingBox())!.y;
  expect(nom.y, "sous le haut de l'écran").toBeGreaterThanOrEqual(0);
  expect(nom.y + nom.height, "au-dessus du bord haut de la feuille").toBeLessThanOrEqual(haut + 1);
  // Le bloc du Pont (dernier du chant) monte en haut de la feuille, pas sous le bas de l'écran.
  await expect.poll(async () => (await blocPont(page).boundingBox())!.y - haut, { timeout: 5000 }).toBeLessThanOrEqual(200);
});

test("vue Partitions d'une setlist : même geste, même résultat", async ({ page }) => {
  await ouvrirSetlist(page);
  await expect(nomPont(page)).toBeVisible();
  await nomPont(page).click();
  await expect(volet(page)).toBeVisible();
  await expect(blocPont(page)).toBeVisible();
  await expect(blocPont(page).getByText("Fmaj7").first()).toBeVisible();
});

test("chant ZH : le nom de section est un bouton et ouvre le volet", async ({ page }) => {
  await ouvrirChant(page, "一切歌颂赞美");
  const nom = page.locator("main.song-zoom [data-section-nom-bouton]").first();
  await expect(nom).toBeVisible();
  await nom.click();
  await expect(volet(page)).toBeVisible();
  await expect(volet(page).locator("[data-passage-uids]").first()).toBeVisible();
});

test("sans accès Harmonie : aucun bouton sur le nom de section", async ({ page }) => {
  await ouvrirChant(page, "promesses", SANS_ACCES);
  await expect(page.locator("main.song-zoom [data-section-nom]").first()).toBeVisible();
  await expect(page.locator("[data-section-nom-bouton]")).toHaveCount(0);
});

// Timothée (13/11/2026) : l'ancienne progression d'une idée en gris, la nouvelle dans la couleur des accords,
// « Avant » / « Après » au-dessus ; le gris garde un contraste ≥ 4,5:1 (fond de la carte et pastille à 12 % compris).
for (const [l, stockee, avant, apres] of [["fr", "fr", "Avant", "Après"], ["zh", "zh-CN", "改前", "改后"]] as const) {
  for (const theme of ["clair", "sombre"] as const) {
    test(`idée : ancienne progression en gris, nouvelle en couleur d'accord, « ${avant} » / « ${apres} » (${l}, ${theme})`, async ({ page }) => {
      await langue(page, stockee);
      if (theme === "sombre") {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ } });
      }
      await ouvrirChant(page, "promesses");
      await nomPont(page).click();
      const ligne = blocPont(page).locator("[data-avant-apres]").first();
      await expect(ligne).toBeVisible();
      await expect(ligne.locator("[data-avant]")).toContainText(avant);
      await expect(ligne.locator("[data-apres]")).toContainText(apres);
      // Cinq corrections, point 2 : le titre de l'idée est dans la langue du site (en 中文, la table docs/harmonie/fiches-zh.json).
      const titreIdee = blocPont(page).locator("[data-suggestion]").first().getByRole("link").first();
      if (l === "zh") {
        await expect(titreIdee).toHaveText(/\p{Script=Han}/u);
        await expect(titreIdee).not.toHaveAttribute("lang", "fr");
      } else await expect(titreIdee).not.toHaveText(/\p{Script=Han}/u);
      const mesure = await ligne.evaluate((p) => {
        const rgba = (c: string) => { const v = (c.match(/[\d.]+/g) ?? []).map(Number); return { c: v.slice(0, 3), a: v[3] ?? 1 }; };
        const rgb = (c: string) => rgba(c).c;
        const lum = ([r, g, b]: number[]) => {
          const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const vieux = p.querySelector("[data-avant] [data-accord-touchable]") as HTMLElement;
        const neuf = p.querySelector("[data-apres] [data-accord-touchable]") as HTMLElement;
        const accord = getComputedStyle(document.documentElement).getPropertyValue("--chord-color").trim();
        const sonde = document.createElement("span");
        sonde.style.color = accord;
        document.body.append(sonde);
        const couleurAccord = getComputedStyle(sonde).color;
        sonde.remove();
        const carte = rgb(getComputedStyle(p.closest("[data-suggestion]")!).backgroundColor);
        // Couleur du texte composée sur la carte (le gris peut être un noir ou un blanc translucide).
        const brut = rgba(getComputedStyle(vieux).color);
        const texte = brut.c.map((v, i) => v * brut.a + carte[i] * (1 - brut.a));
        const fond = carte.map((v, i) => v * 0.88 + texte[i] * 0.12);
        const [a, b] = [lum(texte), lum(fond)].sort((x, y) => y - x);
        return { vieux: getComputedStyle(vieux).color, neuf: getComputedStyle(neuf).color, couleurAccord, contraste: (a + 0.05) / (b + 0.05) };
      });
      expect(mesure.neuf, "la nouvelle progression est dans la couleur des accords").toBe(mesure.couleurAccord);
      expect(mesure.vieux, "l'ancienne n'a pas la couleur de la nouvelle").not.toBe(mesure.neuf);
      expect(mesure.contraste, `contraste du gris ${mesure.vieux}`).toBeGreaterThanOrEqual(4.5);
    });
  }
}

const CAPTURES = "test-results/captures-jv5a";
const nomCapture = (info: TestInfo, l: string, theme: string, p: string) => `${CAPTURES}/${info.project.name}-${l}-${theme}-${p}.png`;

for (const [l, stockee] of [["fr", "fr"], ["zh", "zh-CN"]] as const) {
  for (const theme of ["clair", "sombre"] as const) {
    test(`captures JV-5a : page chant (${l}, ${theme})`, async ({ page }, info) => {
      test.skip(theme === "sombre" && info.project.name !== "ordinateur-1440", "sombre à 1 440 seulement");
      await langue(page, stockee);
      if (theme === "sombre") {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ } });
      }
      await ouvrirChant(page, "promesses");
      await nomPont(page).click();
      await expect(blocPont(page)).toBeVisible();
      await page.waitForTimeout(800);
      await page.screenshot({ path: nomCapture(info, l, theme, "chant") });
    });
  }
}

for (const [l, stockee] of [["fr", "fr"], ["zh", "zh-CN"]] as const) {
  for (const theme of ["clair", "sombre"] as const) {
    test(`captures JV-5a : vue Partitions (${l}, ${theme})`, async ({ page }, info) => {
      test.skip((theme === "sombre" || l === "zh") && info.project.name !== "ordinateur-1440" && info.project.name !== "telephone", "zh et sombre : 1 440 et téléphone");
      await langue(page, stockee);
      if (theme === "sombre") {
        await page.emulateMedia({ colorScheme: "dark" });
        await page.addInitScript(() => { try { localStorage.setItem("theme", "dark"); } catch { /* ignore */ } });
      }
      await ouvrirSetlist(page);
      await nomPont(page).click();
      await expect(blocPont(page)).toBeVisible();
      await page.waitForTimeout(800);
      await page.screenshot({ path: nomCapture(info, l, theme, "partitions") });
    });
  }
}
