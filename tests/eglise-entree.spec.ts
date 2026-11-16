import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { enTete, interdireDialoguesNatifs, ongletsRail } from "./helpers/agencement";

// Chantier AR (docs/spec-salles.md), lot 1, tranche T1 : l'entrée « Évènements » de la barre devient
// « Église » / « 教会 » (icône d'église), décisions AR2, AR10, AR11. Le rail de la section dit
// « Évènements · Pâques · Noël » (« Évènements » remplace « Calendrier »), le sous-titre « Évènements,
// salles et fêtes ». Les adresses ne changent pas (`/evenements…`) ; le label de la barre se lit
// « GCC Église ». Sans compte, la section n'a qu'un onglet : pas de rail. Firestore et date simulés ;
// personnes fictives.

const NOEL = { nom: "Noël", jourJ: "2026-12-24", debut: "2026-10-01", visible: true, passages: [], createdBy: "uid-iris", updatedAt: "2026-09-14T20:00:00Z" };
const DOCS: Record<string, Record<string, unknown>> = { "programmes/noel": NOEL };

/** Membre d'un groupe, sans droit de création. */
const MEMBRE: FakeProfile = { uid: "uid-anselme", email: "anselme@example.com", firstName: "Anselme", lastName: "Vauquier", serviceRoles: { "Groupe Paix": ["chanteur"] } };

const navigation = (page: Page) => page.getByRole("navigation", { name: /Navigation principale|主导航/ });
/** Le label de section visible : « GCC <label> » de la barre du haut, ou celui de la barre latérale. */
const labelVisible = (page: Page) => page.locator('.brand-nom:visible, [data-testid="label-section"]:visible').first();

async function ouvrir(page: Page, qui: FakeProfile | null, to: string, zh = false) {
  interdireDialoguesNatifs(page);
  await page.clock.setFixedTime(new Date("2026-10-01T10:00:00"));
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  if (zh) await page.addInitScript(() => { try { localStorage.setItem("i18nextLng", "zh-CN"); } catch {} });
  if (qui) return signInAs(page, qui, DOCS, to);
  await page.goto(to);
}

test.describe("AR, T1 : l'entrée « Église »", () => {
  test("connecté : la barre dit « Église » avec l'icône d'église, l'adresse reste /evenements", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements");
    const nav = navigation(page);
    await expect(nav.getByRole("link")).toHaveText(["Chants", "Setlists", "Planning", "Église", "Moi"]);
    const eglise = nav.getByRole("link", { name: "Église" });
    await expect(eglise).toHaveAttribute("href", /^\/evenements\/?$/);
    await expect(eglise).toHaveAttribute("aria-current", "page");
    await expect(eglise.locator("svg.lucide-church")).toHaveCount(1);
    await expect(nav.locator("svg.lucide-ticket")).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Évènements" })).toHaveCount(0);
  });

  test("connecté : titre « Église », sous-titre, rail « Évènements · Salles · Pâques · Noël » (Salles depuis AR T2b), label « GCC Église »", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements");
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Église" })).toBeVisible();
    await expect(enTete(page)).toContainText("Évènements, salles et fêtes");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["Évènements", "Salles", "Pâques", "Noël"]);
    const evenements = ongletsRail(page).getByRole("link", { name: "Évènements" });
    await expect(evenements).toHaveAttribute("href", /^\/evenements\/?$/);
    await expect(evenements).toHaveAttribute("aria-current", "page");
    await expect(ongletsRail(page).getByRole("link", { name: "Calendrier" })).toHaveCount(0);
    await expect(labelVisible(page)).toHaveText(/(^|GCC\s*)Église$/);
  });

  test("les adresses ne changent pas : l'onglet Noël mène à /evenements/scene/noel, sous l'entrée « Église »", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements");
    await ongletsRail(page).getByRole("link", { name: "Noël" }).click();
    await expect(page).toHaveURL(/\/evenements\/scene\/noel\/?$/);
    await expect(navigation(page).getByRole("link", { name: "Église" })).toHaveAttribute("aria-current", "page");
    await expect(labelVisible(page)).toHaveText(/(^|GCC\s*)Église$/);
  });

  test("sans compte : barre « Chants · Église », pas de rail", async ({ page }) => {
    await ouvrir(page, null, "/evenements");
    await expect(navigation(page).getByRole("link")).toHaveText(["Chants", "Église"]);
    await expect(enTete(page).getByRole("heading", { level: 1, name: "Église" })).toBeVisible();
    await expect(enTete(page)).toContainText("Évènements, salles et fêtes");
    await expect(ongletsRail(page)).toHaveCount(0);
  });

  test("中文 : 教会, 活动、场地和节日, rail 活动 · 场地 · 复活节 · 圣诞节", async ({ page }) => {
    await ouvrir(page, MEMBRE, "/evenements", true);
    const nav = navigation(page);
    await expect(nav.getByRole("link", { name: "教会" })).toHaveAttribute("href", /^\/evenements\/?$/);
    await expect(enTete(page).getByRole("heading", { level: 1, name: "教会" })).toBeVisible();
    await expect(enTete(page)).toContainText("活动、场地和节日");
    await expect(ongletsRail(page).getByRole("link")).toHaveText(["活动", "场地", "复活节", "圣诞节"]);
    await expect(labelVisible(page)).toHaveText(/(^|GCC\s*)教会$/);
  });
});
