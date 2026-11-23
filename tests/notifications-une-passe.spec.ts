import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";

// Audit de performance (docs/audit-performance-2026-11-21.md, § 5 n° 4, § 7 P2) : la cloche lit la base en
// une seule passe au chargement, et cette passe attend le profil, donc la pastille ne prend pas de retard.

const CLEMENCE: FakeProfile = {
  uid: "uid-clemence", email: "clemence.fictive@example.com", firstName: "Clémence", lastName: "V.",
  serviceRoles: { "Groupe Paix": ["chanteur"] },
};
const BASILE: FakeProfile = {
  uid: "uid-basile", email: "basile.fictif@example.com", firstName: "Basile", lastName: "O.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const setlist = (title: string, category: string) => ({
  title, leader: "Présidence", category, date: "2026-12-06", language: "fr", notes: "", isDraft: false,
  isPrivate: false, ownerId: "uid-autre", createdAt: new Date(Date.now() - 3_600_000), items: [],
});
const DOCS = {
  "setlists/paix-fictive": setlist("Louange Paix fictive", "Groupe Paix"),
  "setlists/culte-fictif": setlist("Culte fictif", "Culte Francophone"),
};

/** Compte les runQuery de la cloche (notifications, setlists) pendant un chargement complet. */
function compter(page: Page) {
  const n = { notifications: 0, setlists: 0 };
  page.on("request", (r) => {
    if (!/documents:runQuery/.test(r.url())) return;
    const corps = r.postData() ?? "";
    if (/"collectionId":"notifications"/.test(corps)) n.notifications++;
    // Les deux requêtes de la cloche trient par createdAt / updatedAt sans autre filtre de page.
    if (/"collectionId":"setlists"/.test(corps) && /"orderBy":\[\{"field":\{"fieldPath":"(createdAt|updatedAt)"/.test(corps)) n.setlists++;
  });
  return n;
}

test("cloche : une seule passe au chargement (1 requête notifications, 2 setlists)", async ({ page }) => {
  await signInAs(page, CLEMENCE, DOCS, "/songs");
  await page.addInitScript(() => localStorage.setItem("notificationsLastSeen", "1"));
  const n = compter(page);
  await page.goto("/accords");
  await expect(page.getByRole("button", { name: "Notifications" }).first()).toContainText("1");
  await page.waitForTimeout(1500);
  expect(n).toEqual({ notifications: 1, setlists: 2 });
});

test("cloche : la pastille compte dès la première passe ce que le profil laisse voir, et un autre compte relit", async ({ page }) => {
  await signInAs(page, CLEMENCE, DOCS, "/songs");
  await page.evaluate(() => localStorage.setItem("notificationsLastSeen", "1"));
  await page.goto("/accords");
  const cloche = page.getByRole("button", { name: "Notifications" }).first();
  await expect(cloche, "la setlist du Groupe Paix, pas celle du Culte").toContainText("1");
  await cloche.click();
  await expect(page.getByRole("menu")).toContainText("Louange Paix fictive");
  await expect(page.getByRole("menu")).not.toContainText("Culte fictif");

  // Autre compte dans un contexte neuf : sa propre passe, filtrée sur son profil.
  const autre = await page.context().browser()!.newContext();
  const page2 = await autre.newPage();
  await signInAs(page2, BASILE, DOCS, "/songs");
  await page2.evaluate(() => localStorage.setItem("notificationsLastSeen", "1"));
  await page2.goto("/accords");
  await page2.getByRole("button", { name: "Notifications" }).first().click();
  await expect(page2.getByRole("menu")).toContainText("Culte fictif");
  await expect(page2.getByRole("menu")).not.toContainText("Louange Paix fictive");
  await autre.close();
});
