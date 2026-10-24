import { expect, test, type Page, type Route } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { readFileSync } from "node:fs";
import { attendreMiseEnPage } from "./helpers/louange";
import { ouvrirPartitions } from "./helpers/setlist";
import { suivreLeCompte } from "../src/lib/setlist/copieHorsLigne";

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

async function signInAsPuisCopie(
  page: Page,
  { docs = {}, setlist = SETLIST }: { docs?: Record<string, Record<string, unknown>>; setlist?: typeof SETLIST } = {},
) {
  await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
  const db = await signInAs(page, MUSICIEN, { [`setlists/${SETLIST_ID}`]: setlist, ...docs }, `/setlists/${SETLIST_ID}`);
  await expect(page.getByRole("heading", { name: setlist.title }).first()).toBeVisible();
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

// ─── A3 bis, point 4 : la copie est liée au compte ──────────────────────────────

/** Fait passer la copie gardée pour celle d'un autre compte. */
const changerUidDeLaCopie = (page: Page, uid: string) =>
  page.evaluate(
    (nouveau) =>
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
            copie.uid = nouveau;
            cur.update(JSON.stringify(copie));
            cur.continue();
          };
        };
      }),
    uid,
  );

/** Texte de toutes les copies gardées (IndexedDB). */
const texteDesCopies = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const r = indexedDB.open("gcc-copies-hors-ligne", 1);
        r.onerror = () => resolve("");
        r.onsuccess = () => {
          const g = r.result.transaction("setlists", "readonly").objectStore("setlists").getAll();
          g.onsuccess = () => resolve((g.result as string[]).join("\n"));
          g.onerror = () => resolve("");
        };
      }),
  );

test("suivi du compte : le compte restauré au démarrage n'efface rien, un changement ou une déconnexion efface", () => {
  let effacements = 0;
  const suivre = suivreLeCompte(() => { effacements++; });
  suivre("uid-a"); // premier événement : le SDK a restauré la session (hors ligne aussi)
  suivre("uid-a");
  expect(effacements, "restauration puis même compte").toBe(0);
  suivre("uid-b");
  expect(effacements, "autre compte").toBe(1);
  suivre(null);
  expect(effacements, "déconnexion par le SDK (jeton révoqué)").toBe(2);
  const depuisRien = suivreLeCompte(() => { effacements++; });
  depuisRien(null);
  expect(effacements, "premier événement sans compte").toBe(2);
  depuisRien("uid-c");
  expect(effacements, "connexion après une session vide").toBe(3);
});

test("copie d'un autre compte : jamais servie, et effacée", async ({ page }) => {
  await signInAsPuisCopie(page);
  await changerUidDeLaCopie(page, "uid-autre");
  await page.route(URL_SETLIST, (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText("Impossible de charger la setlist. Vérifie ta connexion.")).toBeVisible();
  await expect(page.getByText(COPIE)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Culte de la copie" })).toHaveCount(0);
  expect(await nbCopies(page), "la copie d'un autre compte est effacée à la lecture").toBe(0);
});

test("même compte au rechargement hors ligne : la copie est servie et gardée", async ({ page }) => {
  await signInAsPuisCopie(page);
  await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText(COPIE)).toBeVisible();
  await page.reload();
  await expect(page.getByText(COPIE)).toBeVisible();
  expect(await nbCopies(page), "le compte restauré au démarrage n'est pas un changement de compte").toBe(1);
});

test("changement de compte sans déconnexion : les copies sont effacées", async ({ page }) => {
  await signInAsPuisCopie(page);
  // Le SDK perd la session (jeton révoqué) : ni « Déconnexion » ni effacement par la page.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("firebaseLocalStorageDb");
        r.onerror = () => resolve();
        r.onsuccess = () => {
          const db = r.result;
          try {
            const tx = db.transaction("firebaseLocalStorage", "readwrite");
            tx.objectStore("firebaseLocalStorage").clear();
            tx.oncomplete = () => { db.close(); resolve(); };
          } catch { db.close(); resolve(); }
        };
      }),
  );
  const AUTRE: FakeProfile = { uid: "uid-autre-compte", email: "autre@example.com" };
  await signInAs(page, AUTRE, {}, "/moi");
  await expect.poll(() => nbCopies(page)).toBe(0);
});

test("copie de plus de 14 jours : balayée à la prochaine écriture, localStorage compris", async ({ page }) => {
  await signInAsPuisCopie(page);
  await page.evaluate(() => {
    localStorage.setItem("gcc-copie-setlist:vieille", JSON.stringify({ uid: "uid-musicien", setlist: { id: "vieille" }, versions: {}, lueLe: Date.now() - 20 * 24 * 3600 * 1000 }));
    localStorage.setItem("gcc-copie-setlist:recente", JSON.stringify({ uid: "uid-musicien", setlist: { id: "recente" }, versions: {}, lueLe: Date.now() }));
  });
  // Une écriture (rechargement en ligne : la page réécrit sa copie) balaie les copies périmées.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Culte de la copie" }).first()).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("gcc-copie-setlist:"))))
    .toEqual(["gcc-copie-setlist:recente"]);
});

// ─── A3 bis, point 5 : « Ma version » hors ligne ────────────────────────────────

const MY_ABBA = readFileSync("content/songs/abba-pere.cho", "utf8").replace("planait sur la", "flottait sur la");
const lyricLine = (page: Page, text: string) => page.locator("[data-copy-line]", { hasText: text });

test("« Ma version » est rangée dans la copie et servie hors ligne", async ({ page }) => {
  await signInAsPuisCopie(page, {
    docs: {
      [`setlists/${SETLIST_ID}/versions/${MUSICIEN.uid}`]: {
        authorUid: MUSICIEN.uid,
        authorName: "Ruth K.",
        items: { "abba-pere": { content: MY_ABBA, structure: null, shared: false } },
        choices: {},
      },
    },
  });
  await ouvrirPartitions(page);
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect.poll(() => texteDesCopies(page)).toContain("flottait");

  await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText(COPIE)).toBeVisible();
  await ouvrirPartitions(page);
  await expect(lyricLine(page, "flottait")).toHaveCount(1);
  await expect(lyricLine(page, "planait")).toHaveCount(0);
});

// ─── A3 bis, point 6 : annotations ──────────────────────────────────────────────

const URL_ANNOTATIONS = /firestore\.googleapis\.com\/.*\/annotations\//;
const canevas = (page: Page) => page.locator("[data-performance-mode] > canvas");
const ecritesAnnotations = (db: { writes: { path: string }[] }) => db.writes.filter((w) => w.path.startsWith("annotations/"));

test("annotations : lecture impossible (5xx) → message, pas de page vide à écrire, rien d'enregistré", async ({ page }) => {
  const db = await signInAsPuisCopie(page);
  await page.route(URL_ANNOTATIONS, (route) => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.locator("[data-annotations-indisponibles]")).toHaveText("Annotations indisponibles pour l'instant");
  await page.getByRole("button", { name: "Annoter" }).click();
  await page.waitForTimeout(300);
  await expect(canevas(page), "pas de page vide initialisée : pas de canevas pour tracer").toHaveCount(0);
  expect(ecritesAnnotations(db)).toEqual([]);
});

test("annotations : document absent (404) → page vide, canevas offert, pas de message", async ({ page }) => {
  await signInAsPuisCopie(page);
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await page.getByRole("button", { name: "Annoter" }).click();
  await expect(canevas(page)).toHaveCount(1);
  await expect(page.locator("[data-annotations-indisponibles]")).toHaveCount(0);
});

test("annotations : copie hors ligne → « Annoter » est masqué, rien n'est enregistré", async ({ page }) => {
  const db = await signInAsPuisCopie(page);
  await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText(COPIE)).toBeVisible();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await attendreMiseEnPage(page);
  await expect(page.getByRole("button", { name: "Réglages" }).or(page.getByRole("button", { name: "Quitter" })).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Annoter" })).toHaveCount(0);
  expect(ecritesAnnotations(db)).toEqual([]);
});

// ─── A3 bis, point 7 : réseau qui traîne ────────────────────────────────────────

test("réseau qui traîne : la copie paraît vers 3 s, la vraie setlist la remplace à la réponse", async ({ page }) => {
  const db = await signInAsPuisCopie(page);
  const retenues: Route[] = [];
  let ouvert = false;
  // Firestore ne répond pas (profil compris) ; une fois « ouvert », les requêtes retenues et les suivantes passent à la base simulée.
  await page.route(/firestore\.googleapis\.com/, (route) => (ouvert ? route.fallback() : void retenues.push(route)));
  const debut = Date.now();
  await page.reload();
  await expect(page.getByText(COPIE)).toHaveCount(0);
  await expect(page.getByText(COPIE)).toBeVisible({ timeout: 9_000 });
  expect(Date.now() - debut, "la copie n'attend pas la fin du délai de 10 s").toBeLessThan(9_500);
  expect(Date.now() - debut, "elle paraît au bout de 3 s, pas avant").toBeGreaterThan(2_800);
  await expect(page.getByRole("heading", { name: "Culte de la copie" }).first()).toBeVisible();

  db.set(`setlists/${SETLIST_ID}`, { ...SETLIST, title: "Culte renouvelé" });
  ouvert = true;
  await Promise.all(retenues.map((r) => r.fallback()));
  await expect(page.getByRole("heading", { name: "Culte renouvelé" }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(COPIE)).toHaveCount(0);
});

// ─── A3 bis, point 8 : scans 简谱 ───────────────────────────────────────────────

const AVEC_SCAN = { ...SETLIST, items: [item("abba-pere", 1), item("一生爱你", 2)] };
const PAGE_SCAN = "一生爱你-p1.webp";

test("scans 简谱 : la page demande au service worker de garder sa page, la liste, les manifestes et les scans", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __messages: unknown[] }).__messages = [];
    Object.defineProperty(navigator.serviceWorker, "controller", {
      get: () => ({ postMessage: (m: unknown) => (window as unknown as { __messages: unknown[] }).__messages.push(m) }),
    });
  });
  await signInAsPuisCopie(page, { setlist: AVEC_SCAN });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __messages: { type: string; urls: string[] }[] }).__messages.length))
    .toBeGreaterThan(0);
  const urls = await page.evaluate(() => (window as unknown as { __messages: { urls: string[] }[] }).__messages.flatMap((m) => m.urls));
  for (const attendu of [
    `/setlists/${SETLIST_ID}/`, "/setlists/", "/songs/abba-pere/", "/api/song/abba-pere",
    "/jianpu/index.json", "/jianpu/chords.json", "/jianpu/cadrage.json", `/jianpu/${encodeURIComponent(PAGE_SCAN)}`,
  ]) expect(urls, attendu).toContain(attendu);
});

test("scans 简谱 : hors ligne, un scan absent du cache compte comme chant non chargé", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "always"));
  await signInAsPuisCopie(page, { setlist: AVEC_SCAN });
  await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText(COPIE)).toBeVisible();
  await page.getByRole("button", { name: /Mode Louange/ }).click();
  await expect(page.locator("[data-chants-manquants]")).toContainText("1 chant non chargé");
});
