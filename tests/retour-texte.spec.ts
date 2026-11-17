import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// B10 : hors deux volets, le retour de la page chant et de la page setlist est « ‹ Section » en texte
// (composant `Retour`), à côté des commandes de la barre ; en 中文 le nom de la section est en chinois.

const UN_VOLET = ["telephone", "tablette"];
const MUSICIEN: FakeProfile = { uid: "uid-musicien", email: "musicien@example.com", planningName: "Test M.", serviceRoles: { "Culte Francophone": ["musicien"] } };
const SETLIST = {
  title: "Culte de test", leader: "Présidence T.", category: "Culte Francophone", date: "2026-10-04", language: "mixed", notes: "",
  ownerId: "uid-musicien", isPrivate: false,
  items: [{ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
};

test.beforeEach(async ({ page }, info) => {
  test.skip(!UN_VOLET.includes(info.project.name), "un volet : téléphone et tablette debout (deux volets : pas de retour)");
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
});

for (const [lang, chants, setlists] of [["fr", "Chants", "Setlists"], ["zh-CN", "诗歌", "歌单"]] as const) {
  test(`le retour de la page chant et de la page setlist porte le nom de la section (${lang})`, async ({ page }) => {
    await page.addInitScript((l) => localStorage.setItem("i18nextLng", l), lang);
    for (const [url, nom] of [["/songs/abba-pere", chants], ["/setlists/retour-texte", setlists]] as const) {
      await signInAs(page, MUSICIEN, { "setlists/retour-texte": SETLIST }, url);
      const barre = page.getByTestId("barre-outils");
      const retour = barre.getByRole("link", { name: nom, exact: true });
      await expect(retour).toBeVisible();
      await expect(retour.locator("svg")).toBeVisible();
      const [r, b] = await Promise.all([retour.boundingBox(), barre.getByRole("button").first().boundingBox()]);
      expect(Math.abs(r!.y + r!.height / 2 - (b!.y + b!.height / 2)), "à côté des commandes, sur la même ligne").toBeLessThanOrEqual(6);
    }
  });
}
