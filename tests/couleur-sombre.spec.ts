import { expect, test } from "@playwright/test";
import { contraste, couleurSombre, styleTexteService } from "../src/lib/couleurSombre";
import { CATEGORY_COLORS, PLANNING_COLORS, categoryColor } from "../src/lib/serviceColors";
import { BASE_URL_COUPE } from "../playwright.config";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Tranche B2 de docs/spec-corrections-audit.md (C4) : les couleurs de service, éclaircies en sombre jusqu'à 4,5:1
// sur #2c2c2e (le fond le plus clair des cartes et pastilles sombres, donc aussi sur #1c1c1e).

const CARTE = "#1c1c1e";
const CARTE_CLAIRE = "#2c2c2e";

test.describe("couleurSombre (sans navigateur)", () => {
  const couleurs = [...new Set([...Object.values(PLANNING_COLORS), ...Object.values(CATEGORY_COLORS)])];

  test("chaque couleur de service atteint 4,5:1 sur les deux fonds sombres", () => {
    for (const c of couleurs) {
      const s = couleurSombre(c);
      expect(contraste(s, CARTE_CLAIRE), `${c} → ${s} sur ${CARTE_CLAIRE}`).toBeGreaterThanOrEqual(4.5);
      expect(contraste(s, CARTE), `${c} → ${s} sur ${CARTE}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("une couleur déjà claire est rendue telle quelle, la mémoïsation ne change rien", () => {
    expect(couleurSombre("#ffffff")).toBe("#ffffff");
    expect(couleurSombre("#2d5a65")).not.toBe("#2d5a65");
    expect(couleurSombre("#2d5a65")).toBe(couleurSombre("#2d5a65"));
  });

  test("styleTexteService rend les deux variables", () => {
    expect(styleTexteService("#2d5a65")).toEqual({ "--svc-clair": "#2d5a65", "--svc-sombre": couleurSombre("#2d5a65") });
  });
});

const MUSICIEN: FakeProfile = {
  uid: "uid-camille", email: "camille@example.com", firstName: "Camille", lastName: "Fictive", planningName: "",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const rgbVersHex = (rgb: string) => "#" + (rgb.match(/\d+/g) ?? []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");

// La pastille des services et rôles déclarés n'existe que sur le site tel qu'en ligne (serveur sans l'interrupteur).
for (const theme of ["light", "dark"] as const) {
  test.describe(theme, () => {
  test.use({ baseURL: BASE_URL_COUPE });
  test(`Moi, ${theme === "light" ? "clair" : "sombre"} : la pastille « Culte Franco · Musicien » ${theme === "light" ? "garde la couleur du service" : "est éclaircie et lisible"}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, MUSICIEN, {}, "/moi");
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
    const pastille = page.getByTestId("service-role").first();
    await expect(pastille).toContainText("Culte Franco");
    const clair = categoryColor("Culte Francophone");
    const couleur = rgbVersHex(await pastille.evaluate((el) => getComputedStyle(el).color));
    if (theme === "light") {
      expect(couleur).toBe(clair);
    } else {
      expect(couleur).not.toBe(clair);
      expect(couleur).toBe(couleurSombre(clair));
      const fond = rgbVersHex(await pastille.evaluate((el) => getComputedStyle(el.closest("section,article,div[class*=raised],body") ?? document.body).backgroundColor));
      expect(contraste(couleur, fond === "#000000" || fond === "#00000000" ? CARTE : fond)).toBeGreaterThanOrEqual(4.5);
    }
  });
  });
}
