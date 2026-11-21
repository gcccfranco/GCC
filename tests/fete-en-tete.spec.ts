import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, estTelephone, interdireDialoguesNatifs, ongletsRail } from "./helpers/agencement";

// Lot AS, T4 (docs/spec-reserver-unique-fetes.md, AS8 et AS9) : le rail de la section Église n'a plus que deux
// onglets (« Évènements · Salles ») ; la page d'une fête a un en-tête compact (retour « ‹ Évènements » au téléphone,
// petit libellé dès la tablette), un seul h1, le titre de l'édition, et un halo fondu. Firestore et date simulés ;
// personne fictive.

const NOEL = { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, passages: [], createdBy: "uid-ondine", updatedAt: "2026-09-14T20:00:00Z" };
const DOCS: Record<string, Record<string, unknown>> = { "programmes/noel": NOEL };
const MEMBRE: FakeProfile = { uid: "uid-ondine", email: "ondine@example.com", firstName: "Ondine", lastName: "Falaise", serviceRoles: { "Groupe Paix": ["chanteur"] } };

async function ouvrir(page: Page, to: string, zh = false) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  if (zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
  return signInAs(page, MEMBRE, DOCS, to);
}

test.describe("AS8, AS9 : rail à deux onglets, en-tête compact de la fête", () => {
  test("/evenements : rail « Évènements · Salles », sous-titre présent", async ({ page }) => {
    await ouvrir(page, "/evenements");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Salles"]);
    await expect(enTete(page)).toContainText("Évènements, salles et fêtes");
  });

  test("page de Noël : un seul h1, rail à deux onglets, pas de sous-titre de section", async ({ page }) => {
    await ouvrir(page, "/evenements/scene/noel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Noël 2026");
    await expect(enTete(page)).not.toContainText("Évènements, salles et fêtes");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Salles"]);
    await expect(ongletsRail(page).getByRole("link", { name: "Évènements" })).toHaveAttribute("aria-current", "page");
  });

  test("retour au téléphone, simple libellé dès la tablette", async ({ page }, info) => {
    await ouvrir(page, "/evenements/scene/noel");
    const retour = enTete(page).locator(":scope > a");
    const libelle = enTete(page).locator("p", { hasText: /^Évènements$/ });
    if (estTelephone(info)) {
      await expect(retour).toBeVisible();
      await expect(retour).toHaveAttribute("href", /^\/evenements\/?$/);
      await expect(libelle).toBeHidden();
    } else {
      await expect(retour).toBeHidden();
      await expect(libelle).toBeVisible();
    }
  });

  test("Pâques et la scène allument aussi « Évènements »", async ({ page }) => {
    for (const to of ["/evenements/scene/paques", "/evenements/scene"]) {
      await ouvrir(page, to);
      await expect(page).toHaveURL(/\/evenements\/scene\/(noel|paques)\/?$/);
      await expect(ongletsRail(page).getByRole("link", { name: "Évènements" })).toHaveAttribute("aria-current", "page");
    }
  });

  test("le halo est présent", async ({ page }) => {
    await ouvrir(page, "/evenements/scene/noel");
    const halo = page.getByTestId("halo");
    await expect(halo).toBeAttached();
    // AS9 : le halo fond jusqu'au transparent (masque en dégradé), sans bord net.
    expect(await halo.evaluate((el) => { const s = getComputedStyle(el); return s.maskImage || s.webkitMaskImage; })).toContain("linear-gradient");
  });

  test("中文 : rail et h1 en chinois, aucun texte français dans l'en-tête", async ({ page }) => {
    await ouvrir(page, "/evenements/scene/noel", true);
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["活动", "场地"]);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveText("圣诞节 2026");
    await expect(enTete(page)).not.toContainText(/Évènements|Salles|Noël|Pâques/);
  });
});
