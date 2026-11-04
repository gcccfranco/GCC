import { expect, test, type Locator, type Page } from "@playwright/test";
import { ADMIN_EMAIL, signInAs, type FakeProfile } from "./helpers/fakeSession";

// back-office-9 (volet « Fait » / « Relier ») et back-office-12 (docs/spec-corrections-design/back-office.md) : la zone de
// toucher de 44 px des verbes de « À faire », et l'équilibrage des lignes (`text-balance`) au téléphone en français.
// L'écran « À faire » se teste ailleurs (a-faire.spec.ts) ; ici, ce qui ne se voit qu'à la mesure. Noms fictifs.

const ADMIN: FakeProfile = { uid: "uid-admin", email: ADMIN_EMAIL, firstName: "Noémie", lastName: "T.", dansEquipes: ["da"] };
const CULTE = {
  presidence: "Pers. A", choriste1: "Pers. B", choriste2: "Pers. C", piano: "Pers. D", guitare: "Pers. E",
  batterie: "Pers. F", sono: "Pers. G", ppt: "Pers. H", orateur: "Pers. I", traduction: "Pers. B",
};
const JEU: Record<string, Record<string, unknown>> = {
  "plannings/culte/dimanches/2026-10-25": { date: "2026-10-25", ...CULTE },
  "equipes/evenementiel/taches/t1": { titre: "Affiche de l'atelier", responsableUid: null, responsableNom: "", echeance: "2026-10-20", repetition: null },
  "equipes/da/taches/t2": { titre: "Fond du culte", responsableUid: null, responsableNom: "", echeance: "2026-10-26", repetition: null },
};

async function ouvrir(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-24T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  return signInAs(page, ADMIN, JEU, "/back-office");
}

const ligne = (page: Page, texte: string) => page.getByTestId("ligne-a-faire").filter({ hasText: texte });
const coarse = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);

test.describe("back-office-9 : la zone de toucher de « Fait » et « Relier »", () => {
  for (const [texte, verbe] of [["Affiche de l'atelier", "Fait"], ["Noms du planning sans compte", "Relier"]] as const) {
    test(`« ${verbe} » : ::after de 44 px, le dessin ne grandit pas, un toucher à 21 px du centre suit le lien`, async ({ page }) => {
      await ouvrir(page);
      test.skip(!(await coarse(page)), "la zone de 44 px est celle du doigt : appareils tactiles");
      const rangee = ligne(page, texte);
      await expect(rangee).toBeVisible();
      const lien = rangee.getByRole("link", { name: new RegExp(`^${verbe}`) });
      const apres = await lien.evaluate((el) => getComputedStyle(el, "::after").height);
      expect(parseFloat(apres), "hauteur du ::after").toBeGreaterThanOrEqual(44);
      const b = (await lien.boundingBox())!;
      expect(b.height, "le dessin ne grandit pas").toBeLessThan(44);
      const x = b.x + b.width / 2;
      for (const y of [b.y + b.height / 2 - 21, b.y + b.height / 2 + 21]) {
        const touche = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("a")?.getAttribute("href") ?? null, { x, y });
        expect(touche, `y = ${Math.round(y)}`).toBe(await lien.getAttribute("href"));
      }
      await page.touchscreen.tap(x, b.y + b.height / 2 - 21);
      await expect(page).toHaveURL(new RegExp((await lien.getAttribute("href"))!.replace(/\/$/, "")));
    });
  }
});

/** Nombre de mots sur la dernière ligne du texte de `el` (chaque mot est mesuré par un Range). */
const motsDerniereLigne = (el: Locator) => el.evaluate((n) => {
  const mots: number[] = [];
  const marche = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
  for (let t = marche.nextNode() as Text | null; t; t = marche.nextNode() as Text | null) {
    for (const m of t.data.matchAll(/\S+/g)) {
      const r = document.createRange();
      r.setStart(t, m.index!);
      r.setEnd(t, m.index! + m[0].length);
      const haut = r.getClientRects()[0]?.top;
      if (haut !== undefined) mots.push(Math.round(haut));
    }
  }
  const derniere = Math.max(...mots);
  return mots.filter((h) => h === derniere).length;
});

test.describe("back-office-12 : coupes équilibrées au téléphone en français", () => {
  for (const largeur of [412, 393, 375, 360]) {
    test(`${largeur} px : text-balance sur la porte et la rangée « Relier », aucun mot seul en dernière ligne`, async ({ page }, info) => {
      test.skip(info.project.name !== "telephone", "les coupes se jugent au téléphone");
      await page.setViewportSize({ width: largeur, height: 800 });
      await ouvrir(page);
      const porte = page.getByTestId("carte-scene-des-fetes");
      const relier = ligne(page, "Noms du planning sans compte");
      await expect(porte).toBeVisible();
      await expect(relier).toBeVisible();
      const textes = [porte.locator("b"), porte.locator("span.block").last(), relier.locator("b"), relier.locator("span.block")];
      for (const el of textes) {
        expect(await el.evaluate((e) => getComputedStyle(e).textWrap), `text-wrap de « ${(await el.textContent())?.trim()} »`).toMatch(/balance/);
        expect(await motsDerniereLigne(el), `dernière ligne de « ${(await el.textContent())?.trim()} »`).toBeGreaterThanOrEqual(2);
      }
      // Le titre de la rangée reste à deux lignes au plus (line-clamp-2).
      const titre = relier.locator("b");
      const lh = parseFloat(await titre.evaluate((e) => getComputedStyle(e).lineHeight));
      expect((await titre.boundingBox())!.height).toBeLessThanOrEqual(lh * 2 + 1);
    });
  }
});
