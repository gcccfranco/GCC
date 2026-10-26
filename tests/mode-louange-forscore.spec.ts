import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage, ouvrirReglages } from "./helpers/louange";

// Lot L0 (docs/spec-mode-louange-forscore.md) : réglage « Style de lecture »,
// par appareil. Setlist et compte simulés : aucun accès au Firestore réel.

const SETLIST_ID = "setlist-forscore";
const MUSICIEN: FakeProfile = {
  uid: "uid-lecteur",
  email: "lecteur@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const setlist = {
  title: "Culte d'essai",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-09-14",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [
    {
      songSlug: "abba-pere", position: 1, keyOverride: null, showChords: true, showPinyin: true,
      useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
    },
  ],
};

async function ouvrir(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("perf-role-preset")) localStorage.setItem("perf-role-preset", "pianiste");
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
}

test("appareil vierge : style de lecture Classique", async ({ page }) => {
  await ouvrir(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "classique");
});

test("choisir forScore dans les Réglages : conservé après rechargement", async ({ page }) => {
  await ouvrir(page);
  const reglages = await ouvrirReglages(page);
  await reglages.getByRole("button", { name: "forScore" }).click();
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "forscore");

  await page.reload();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "forscore");
});

test("stockage inaccessible : mode ouvert en Classique, sans erreur", async ({ page }) => {
  const erreurs: string[] = [];
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.addInitScript(() => {
    // Seules les clés du mode louange lèvent : la connexion simulée et le reste du site
    // ont besoin du stockage pour afficher leur formulaire.
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    const lever = () => { throw new Error("stockage indisponible"); };
    Storage.prototype.getItem = function (k: string) { return k.startsWith("perf-") ? lever() : getItem.call(this, k); };
    Storage.prototype.setItem = function (k: string, v: string) { return k.startsWith("perf-") ? lever() : setItem.call(this, k, v); };
  });
  await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist }, `/setlists/${SETLIST_ID}`);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-performance-mode]")).toHaveAttribute("data-style-lecture", "classique");
  expect(erreurs).toEqual([]);
});
