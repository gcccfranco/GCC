import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreMiseEnPage } from "./helpers/louange";

// Dimanche hors ligne (audit du 24/10/2026, D1 et D4 ; docs/spec-corrections-audit.md, tranche A3).
// Setlist et compte simulés : aucune lecture ni écriture du Firestore de production. Le service
// worker est bloqué pour que `page.route` voie aussi /api/song ; le hors-ligne réel (service
// worker actif) se mesure avec le banc scripts/rude-epreuve.
test.use({ serviceWorkers: "block" });

const SETLIST_ID = "setlist-hors-ligne";
const MUSICIEN: FakeProfile = {
  uid: "uid-musicien",
  email: "musicien@example.com",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};

const item = (slug: string, position: number) => ({
  type: "song",
  songSlug: slug,
  position,
  keyOverride: null,
  showChords: true,
  showPinyin: true,
  useJianpu: false,
  structureOverride: null,
  sectionNotes: {},
  notes: "",
});

const SETLIST = {
  title: "Culte de la copie",
  leader: "Présidence",
  category: "Culte Francophone",
  date: "2026-09-14",
  language: "mixed",
  notes: "",
  ownerId: "uid-owner",
  isPrivate: false,
  items: [item("abba-pere", 1), item("a-la-croix", 2)],
};

const URL_SETLIST = new RegExp(`firestore\\.googleapis\\.com/.*/setlists/${SETLIST_ID}(\\?|$)`);
const COPIE = /Copie hors ligne du/;

/** Nombre de copies gardées (IndexedDB, sinon localStorage). */
const nbCopies = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const ls = Object.keys(localStorage).filter((k) => k.startsWith("gcc-copie-setlist:")).length;
        const r = indexedDB.open("gcc-copies-hors-ligne", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("setlists");
        r.onerror = () => resolve(ls);
        r.onsuccess = () => {
          const db = r.result;
          const c = db.transaction("setlists", "readonly").objectStore("setlists").count();
          c.onsuccess = () => { db.close(); resolve(c.result + ls); };
          c.onerror = () => { db.close(); resolve(ls); };
        };
      }),
  );

/** Vieillit la copie gardée de `jours` jours. */
const vieillir = (page: Page, jours: number) =>
  page.evaluate(
    (ms) =>
      new Promise<void>((resolve, reject) => {
        const r = indexedDB.open("gcc-copies-hors-ligne", 1);
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result;
          const s = db.transaction("setlists", "readwrite").objectStore("setlists");
          s.openCursor().onsuccess = (e) => {
            const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cur) return resolve();
            const copie = JSON.parse(cur.value as string);
            copie.lueLe = Date.now() - ms;
            cur.update(JSON.stringify(copie));
            cur.continue();
          };
        };
      }),
    jours * 24 * 60 * 60 * 1000,
  );

test.describe("copie hors ligne d'une setlist", () => {
  test("réseau en échec : la copie est servie avec son bandeau, sans écriture possible", async ({ page }) => {
    const db = await signInAsPuisCopie(page);
    // Tout Firestore injoignable, profil (users/{uid}) compris : l'existence de la copie vaut accès.
    await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
    await page.reload();
    await expect(page.getByText(COPIE)).toBeVisible();
    await expect(page.getByText(/Tu n'as pas accès à cette setlist/)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Culte de la copie" }).first()).toBeVisible();
    // L'ordre des chants de la copie s'affiche.
    await expect(page.getByText(/Abba/i).first()).toBeVisible();
    // Pas de bouton d'édition ni de suppression pendant que la copie est affichée.
    await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Supprimer" })).toHaveCount(0);
    expect(db.writes.filter((w) => w.path.startsWith("setlists/"))).toEqual([]);
  });

  test("setlist privée d'un autre : pas de copie écrite", async ({ page }) => {
    await signInAs(
      page,
      MUSICIEN,
      { "setlists/setlist-privee": { ...SETLIST, title: "Culte secret", ownerId: "uid-autre", isPrivate: true } },
      "/setlists/setlist-privee",
    );
    await expect(page.getByText(/Tu n'as pas accès à cette setlist/)).toBeVisible();
    await page.waitForTimeout(500);
    expect(await nbCopies(page)).toBe(0);
  });

  test("réponse 500 : la copie est servie aussi", async ({ page }) => {
    await signInAsPuisCopie(page);
    await page.route(URL_SETLIST, (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
    await page.reload();
    await expect(page.getByText(COPIE)).toBeVisible();
  });

  test("403 : pas de copie servie, l'écran habituel", async ({ page }) => {
    await signInAsPuisCopie(page);
    await page.route(URL_SETLIST, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: 403, message: "denied" } }) }),
    );
    await page.reload();
    await expect(page.getByText("Setlist introuvable.")).toBeVisible();
    await expect(page.getByText(COPIE)).toHaveCount(0);
  });

  test("copie de plus de 14 jours : pas servie", async ({ page }) => {
    await signInAsPuisCopie(page);
    await vieillir(page, 15);
    await page.route(URL_SETLIST, (route) => route.abort("internetdisconnected"));
    await page.reload();
    await expect(page.getByText("Impossible de charger la setlist. Vérifie ta connexion.")).toBeVisible();
    await expect(page.getByText(COPIE)).toHaveCount(0);
    expect(await nbCopies(page), "la copie périmée est effacée à la lecture").toBe(0);
  });

  test("déconnexion : les copies sont effacées", async ({ page }) => {
    await signInAsPuisCopie(page);
    await page.goto("/moi");
    await page.getByText("Déconnexion", { exact: true }).click();
    await expect.poll(() => nbCopies(page)).toBe(0);
  });
});

async function signInAsPuisCopie(page: Page) {
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: SETLIST }, `/setlists/${SETLIST_ID}`);
  await expect(page.getByRole("heading", { name: "Culte de la copie" }).first()).toBeVisible();
  await expect.poll(() => nbCopies(page), { message: "la copie est écrite" }).toBe(1);
  return db;
}

test("mode Louange : un chant non chargé est annoncé, Réessayer le charge", async ({ page }) => {
  let panne = true;
  await page.route("**/api/song/a-la-croix", (route) =>
    panne ? route.fulfill({ status: 500, body: "{}" }) : route.continue(),
  );
  await signInAsPuisCopie(page);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  const bandeau = page.locator("[data-chants-manquants]");
  await expect(bandeau).toContainText("1 chant non chargé");
  await expect(page.locator("[data-performance-mode]")).toHaveCount(0);
  panne = false;
  await bandeau.getByRole("button", { name: "Réessayer" }).click();
  await attendreMiseEnPage(page);
  await expect(bandeau).toHaveCount(0);
});

test("mode Louange : « Continuer quand même » ouvre le mode malgré le chant absent", async ({ page }) => {
  await page.route("**/api/song/a-la-croix", (route) => route.fulfill({ status: 500, body: "{}" }));
  await signInAsPuisCopie(page);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await page.locator("[data-chants-manquants]").getByRole("button", { name: "Continuer quand même" }).click();
  await attendreMiseEnPage(page);
});
