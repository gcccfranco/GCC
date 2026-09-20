import { expect, test } from "@playwright/test";

// 5C1, V6 bis (docs/spec-look.md) : le halo existe aussi sur ordinateur, où la barre de
// défilement prend de la place. Un calque en `100vw` la compterait et élargirait la page ;
// le halo du chant déborde à droite, c'est le pire cas.
// Playwright masque les barres de défilement (`--hide-scrollbars`) : on les lui rend, ce
// qui impose un navigateur à part, donc un fichier à part.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const chemin of ["/songs", "/songs/beni-soit-ton-nom"]) {
  test(`ordinateur, barre de défilement classique : ${chemin} ne s'élargit pas`, async ({ page }) => {
    test.skip(test.info().project.name !== "ordinateur", "propre à l'ordinateur");
    await page.goto(chemin);
    await page.getByTestId("halo").waitFor();
    await page.addStyleTag({ content: "html{overflow-y:scroll}::-webkit-scrollbar{width:15px}" });
    await expect.poll(() => page.evaluate(() => window.innerWidth - document.documentElement.clientWidth)).toBe(15);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
}
