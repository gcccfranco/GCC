import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { canVoirStatistiques, entreesBackOffice } from "../src/lib/access";
import type { UserProfile } from "../src/types/user";

// Lot U7 (docs/spec-statistiques.md) — la page « Statistiques » du Back-Office.
// S2 : le droit (Q2, `canVoirStatistiques` = admin), l'adresse `/back-office/statistiques`
// (question 7) et l'entrée du menu ; la page elle-même (filtres, tableau) vient avec S3 et S4.
// Interrupteur coupé : 404 (tests/back-office-coupe.spec.ts).
// Lancé aussi sur `tablette-paysage` et `ordinateur-1440` (SPECS_GRAND_ECRAN) : l'entrée vit
// dans la barre latérale.

const ADMIN: FakeProfile = { uid: "uid-admin", email: "tc328829@gmail.com", firstName: "Admin", lastName: "T." };
/** Un responsable non admin : il remplit un planning (Spec, « Tests »). */
const RESPONSABLE: FakeProfile = { uid: "uid-pl", email: "pl@example.com", firstName: "Paul", lastName: "L.", plannings: ["culte"] };

const user = (p: FakeProfile) => ({ uid: p.uid, email: p.email });
const profil = (p: FakeProfile) =>
  ({
    uid: p.uid, email: p.email, firstName: p.firstName ?? "", lastName: p.lastName ?? "", planningName: "",
    serviceRoles: {}, annonces: [], notify: [], poles: [], equipes: false, plannings: p.plannings ?? [],
  }) as unknown as UserProfile;

const estOrdinateur = (info: TestInfo) => info.project.name.startsWith("ordinateur");
const estTablettePaysage = (info: TestInfo) => info.project.name === "tablette-paysage";

/** Sur la tablette en paysage, la barre est réduite : on la déplie pour atteindre le menu. */
async function deplierSiTablettePaysage(page: Page, info: TestInfo) {
  if (!estTablettePaysage(info)) return;
  await page.getByTestId("barre-laterale").getByRole("button", { name: /Déplier la barre latérale|展开侧边栏/ }).tap();
  await expect(page.getByTestId("barre-par-dessus")).toBeVisible();
}

/** Le menu du Back-Office : la barre latérale sur grand écran ; sur téléphone et tablette en
 *  portrait, la liste du tableau de bord (en attendant la barre du bas de U6, B6). */
function menu(page: Page, info: TestInfo) {
  if (estOrdinateur(info)) return page.getByTestId("barre-laterale").getByRole("navigation", { name: "Navigation principale" });
  if (estTablettePaysage(info)) return page.getByTestId("barre-par-dessus").getByRole("navigation", { name: "Navigation principale" });
  return page.getByTestId("menu-back-office");
}

test.describe("Statistiques (S2) : le droit (Q2)", () => {
  test("canVoirStatistiques : un admin oui ; un responsable non admin, un membre, un visiteur non", () => {
    expect(canVoirStatistiques(user(ADMIN))).toBe(true);
    expect(canVoirStatistiques(user(RESPONSABLE))).toBe(false);
    expect(canVoirStatistiques({ email: "membre@example.com" })).toBe(false);
    expect(canVoirStatistiques(null)).toBe(false);
  });

  test("l'entrée « statistiques » est la 8e du menu d'un admin, absente de celui d'un responsable", () => {
    const admin = entreesBackOffice(user(ADMIN), profil(ADMIN));
    expect(admin.at(-1)).toBe("statistiques");
    expect(entreesBackOffice(user(RESPONSABLE), profil(RESPONSABLE))).not.toContain("statistiques");
  });
});

test.describe("Statistiques (S2) : l'entrée et l'adresse", () => {
  test("un admin ouvre Back-Office › Statistiques depuis le menu", async ({ page }, info) => {
    await signInAs(page, ADMIN, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    const entree = menu(page, info).getByRole("link", { name: "Statistiques" });
    await expect(entree).toHaveAttribute("href", /^\/back-office\/statistiques\/?$/);
    await entree.click();
    await expect(page).toHaveURL(/\/back-office\/statistiques\/?$/);
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toBeVisible();
    await expect(page.getByText("Visible par les admins seulement")).toBeVisible();
    if (estOrdinateur(info) || estTablettePaysage(info)) {
      await deplierSiTablettePaysage(page, info);
      await expect(menu(page, info).getByRole("link", { name: "Statistiques" })).toHaveAttribute("aria-current", "page");
    }
  });

  test("un responsable non admin : aucune entrée, l'adresse répond « Page réservée aux administrateurs. »", async ({ page }, info) => {
    await signInAs(page, RESPONSABLE, {}, "/back-office");
    await expect(page.getByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    await deplierSiTablettePaysage(page, info);
    await expect(menu(page, info).getByRole("link", { name: "Planning" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Statistiques" })).toHaveCount(0);
    await page.goto("/back-office/statistiques");
    await expect(page.getByText("Page réservée aux administrateurs.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toHaveCount(0);
  });

  test("sans compte : la connexion, qui ramène à la page", async ({ page }) => {
    await page.goto("/back-office/statistiques");
    await expect(page.getByRole("link", { name: "Se connecter" })).toHaveAttribute(
      "href", /^\/login\/?\?from=%2Fback-office%2Fstatistiques$/,
    );
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toHaveCount(0);
  });
});

test.describe("Statistiques (S2) : captures à regarder", () => {
  // Comparées à la planche bo-statistiques (titre, sous-titre, entrée courante du menu).
  test("la page d'un admin, dans chaque disposition", async ({ page }, info) => {
    await page.clock.setFixedTime(new Date("2026-10-04T10:00:00"));
    await signInAs(page, ADMIN, {}, "/back-office/statistiques");
    await expect(page.getByRole("heading", { name: "Chants les plus joués" })).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
    // Le fondu d'arrivée de la page : capturer une fois fini.
    await page.waitForTimeout(600);
    await page.screenshot({ path: `test-results/statistiques-captures/${info.project.name}-s2.png` });
  });
});
