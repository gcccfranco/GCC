import { expect, test } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// 5C1, V6 bis (docs/spec-look.md) : le halo existe aussi sur ordinateur, où la barre de
// défilement prend de la place. Un calque en `100vw` la compterait et élargirait la page.
// Depuis partout-q2 il ne reste que les halos porteurs de couleur (Planning, fiche de setlist) ;
// la liste et la page d'un chant n'en ont plus, mais ne doivent toujours pas s'élargir.
// Playwright masque les barres de défilement (`--hide-scrollbars`) : on les lui rend, ce
// qui impose un navigateur à part, donc un fichier à part.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const MUSICIEN: FakeProfile = {
  uid: "uid-musicien", email: "musicien@example.com", planningName: "Ruth K.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const FICHE = {
  title: "Culte 27/09", leader: "Élise R.", category: "Culte Francophone", date: "2026-09-27", language: "mixed", notes: "",
  ownerId: "uid-owner", isPrivate: false, isDraft: false, items: [],
};

async function sansElargissement(page: import("@playwright/test").Page) {
  await page.addStyleTag({ content: "html{overflow-y:scroll}::-webkit-scrollbar{width:15px}" });
  await expect.poll(() => page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBe(15);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
}

for (const chemin of ["/songs", "/songs/beni-soit-ton-nom"]) {
  test(`ordinateur, barre de défilement classique : ${chemin} (sans halo) ne s'élargit pas`, async ({ page }) => {
    test.skip(!test.info().project.name.startsWith("ordinateur"), "propre à l'ordinateur (1 280 et 1 440 px, lot U4)");
    await page.goto(chemin);
    await page.locator("main h1, [data-testid=\"barre-outils\"]").first().waitFor();
    await expect(page.getByTestId("halo")).toHaveCount(0);
    await sansElargissement(page);
  });
}

for (const chemin of ["/planning", "/setlists/culte"]) {
  test(`ordinateur, barre de défilement classique : ${chemin} (halo porteur) ne s'élargit pas`, async ({ page }) => {
    test.skip(!test.info().project.name.startsWith("ordinateur"), "propre à l'ordinateur (1 280 et 1 440 px, lot U4)");
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MUSICIEN, { "setlists/culte": FICHE }, chemin);
    await page.getByTestId("halo").waitFor();
    await sansElargissement(page);
  });
}
