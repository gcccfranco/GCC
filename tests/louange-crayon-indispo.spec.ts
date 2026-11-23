import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirOutils } from "./helpers/louange";

// Retouche du point B (go de Timothée relayé par le pilote, 13/11/2026) : une lecture de ma partition refusée
// (règles non publiées, réseau) laisse le Crayon visible mais désactivé, avec un message au toucher ; la lecture se
// refait seule (5 s, 15 s, 45 s, retour du réseau) et le Crayon revient actif. Compte et setlist fictifs.

const ID = "setlist-crayon-indispo";
const LECTRICE: FakeProfile = { uid: "uid-maelle-essai", email: "maelle.essai@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } };
const SETLIST = {
  title: "Culte d'essai", leader: "Présidence", category: "Culte Francophone", date: "2026-09-14", language: "fr", notes: "",
  ownerId: "uid-autre", isPrivate: false,
  items: [{ songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" }],
};
const PARTITIONS = /firestore\.googleapis\.com.*partitions/;

/** Le Crayon : la ligne de la feuille Options au téléphone, le bouton de la barre de titre ailleurs. */
async function crayon(page: Page) {
  if (page.viewportSize()!.width < 768) return (await ouvrirOutils(page)).locator("[data-annoter]");
  const bouton = page.locator("[data-performance-mode] [data-barre-haut]").getByRole("button", { name: "Crayon", exact: true });
  if ((await bouton.count()) === 0) await page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
  return bouton;
}

test("Crayon : lecture de ma partition refusée → visible, désactivé, message au toucher ; relue seule → actif", async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => { if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste"); });
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
  const db = await signInAs(page, LECTRICE, { [`setlists/${ID}`]: SETLIST }, `/setlists/${ID}`);
  let refuser = true;
  await page.route(PARTITIONS, (route) => (route.request().method() === "GET" && refuser
    ? route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "refus" } }) })
    : route.fallback()));
  await page.goto(`/setlists/${ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);

  const indispo = await crayon(page);
  await expect(indispo).toBeVisible();
  await expect(indispo).toHaveAttribute("aria-disabled", "true");
  await indispo.dispatchEvent("click"); // aria-disabled : Playwright le dit « non activé », le toucher passe quand même
  await expect(page.locator("[data-avis-doigt]")).toHaveText("Partition indisponible pour le moment");
  await expect(page.locator("[data-performance-mode] [data-crayon-barre]")).toHaveCount(0);

  // La lecture est acceptée au nouvel essai (5 s) : le Crayon redevient actif et ouvre l'annotation.
  refuser = false;
  await page.waitForTimeout(6_000);
  const actif = await crayon(page);
  await expect(actif).toBeVisible();
  await expect(actif).not.toHaveAttribute("aria-disabled", "true", { timeout: 15_000 });
  await actif.click();
  await expect(page.locator("[data-performance-mode] [data-crayon-barre]")).toHaveCount(1);
  expect(db.writes.filter((w) => w.path.startsWith("partitions/"))).toEqual([]);
});
