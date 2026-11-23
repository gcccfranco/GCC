import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, lireCompteur } from "./helpers/louange";

// PU-3 (docs/spec-entree-musiciens.md « Gardé hors-ligne d'office ») : à l'ouverture de l'onglet Setlists, les setlists
// des services du compte des 14 prochains jours sont copiées sur l'appareil et demandées au service worker, sans avoir
// ouvert la setlist ; « Prêt hors-ligne » paraît dans le bloc quand la copie et le cache du prochain service sont faits.
// Le service worker est remplacé par un témoin (messages notés, `caches.match` répond quand le test le dit) : le vrai
// se mesure avec scripts/rude-epreuve. Sheet, comptes et setlists simulés, noms inventés ; aucune vraie base.
test.use({ serviceWorkers: "block", deviceScaleFactor: 1 });

const AUJOURDHUI = new Date(2026, 10, 9);
const PROCHE = new Date(2026, 10, 15);
const LOINTAIN = new Date(2026, 10, 29);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const jjmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
const SETLIST_ID = "setlist-garde";
const NOM = "Clémence Arnaud";
const PRESIDENT = "Gaspard Lemoine";
const COMPTE: FakeProfile = {
  uid: "uid-clemence", email: "clemence-arnaud@example.com", firstName: "Clémence", lastName: "Arnaud", planningName: NOM,
  dansEquipes: ["louange"], sousEquipes: ["musiciens"], lieuxLouange: ["Culte Francophone"], joue: ["piano"],
};
const CHANTS: [string, string][] = [["abba-pere", "Abba Père"], ["一切都更新", "一切都更新"]];
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true,
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
const culte = (date: Date) => ({
  title: "Culte d'essai de la garde", leader: PRESIDENT, category: "Culte Francophone", date: iso(date), language: "mixed",
  notes: "", ownerId: "uid-autre", isPrivate: false, items: CHANTS.map(([s], i) => item(s, i + 1)),
});

const csv = (rows: string[][]) => rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");

type Options = { service?: Date; horsLigne?: boolean; zh?: boolean };

/** Témoin du service worker : un contrôleur qui note les messages ; `caches.match` répond quand `__toutEnCache`. */
async function temoins(page: Page, o: Options) {
  await page.addInitScript((horsLigne: boolean) => {
    const w = window as unknown as { __messages: { type: string; urls: string[] }[]; __toutEnCache: boolean };
    w.__messages = [];
    w.__toutEnCache = false;
    Object.defineProperty(navigator.serviceWorker, "controller", {
      get: () => ({ postMessage: (m: { type: string; urls: string[] }) => w.__messages.push(m) }),
    });
    const origine = caches.match.bind(caches);
    caches.match = (async (req: RequestInfo | URL, opts?: CacheQueryOptions) =>
      w.__toutEnCache ? new Response("x") : origine(req, opts)) as typeof caches.match;
    if (horsLigne) Object.defineProperty(navigator, "onLine", { get: () => false });
  }, !!o.horsLigne);
  if (o.zh) await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
}

/** Ouvre l'onglet Setlists : le Sheet met le compte au piano du culte `service`, relié à la setlist. */
async function ouvrir(page: Page, o: Options = {}) {
  const service = o.service ?? PROCHE;
  await page.clock.setFixedTime(new Date(`${iso(AUJOURDHUI)}T10:00:00`));
  await temoins(page, o);
  const suivi = { n: 0 };
  await page.route(/docs\.google\.com\/spreadsheets/, (route) => {
    suivi.n++;
    const sheet = new URL(route.request().url()).searchParams.get("sheet") ?? "";
    const rows = sheet === "Franco_Louange" ? [["DATE"], [jjmm(service), PRESIDENT, "", "", NOM, "", ""]] : [];
    return route.fulfill({ status: 200, contentType: "text/csv", body: csv(rows) });
  });
  await signInAs(page, COMPTE, { [`setlists/${SETLIST_ID}`]: culte(service) }, "/setlists");
  await expect.poll(() => suivi.n, { timeout: 20_000 }).toBeGreaterThan(0);
  await expect(page.locator("[data-pupitre]")).toBeVisible({ timeout: 20_000 });
}

/** Les copies gardées (IndexedDB) : [id, uid]. */
const copies = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<[string, string][]>((resolve) => {
        const r = indexedDB.open("gcc-copies-hors-ligne", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("setlists");
        r.onerror = () => resolve([]);
        r.onsuccess = () => {
          const out: [string, string][] = [];
          const tx = r.result.transaction("setlists", "readonly");
          tx.objectStore("setlists").openCursor().onsuccess = (e) => {
            const c = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!c) return;
            try { out.push([String(c.key), JSON.parse(c.value).uid]); } catch { /* illisible */ }
            c.continue();
          };
          tx.oncomplete = () => { r.result.close(); resolve(out); };
        };
      }),
  );

/** Écrit une copie de la setlist pour `uid` (même format que copieHorsLigne.ts). */
const semerCopie = (page: Page, uid: string, setlist: Record<string, unknown>) =>
  page.evaluate(
    ({ uid, setlist, id }) =>
      new Promise<void>((resolve) => {
        const r = indexedDB.open("gcc-copies-hors-ligne", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("setlists");
        r.onsuccess = () => {
          const tx = r.result.transaction("setlists", "readwrite");
          tx.objectStore("setlists").put(JSON.stringify({ uid, setlist: { ...setlist, id }, versions: {}, lueLe: Date.now() }), id);
          tx.oncomplete = () => { r.result.close(); resolve(); };
        };
      }),
    { uid, setlist, id: SETLIST_ID },
  );

const pret = (page: Page) => page.locator("[data-pupitre] [data-pret-hors-ligne]");
const messages = (page: Page) =>
  page.evaluate(() => (window as unknown as { __messages: { type: string; urls: string[] }[] }).__messages);

test.describe("Gardé hors-ligne d'office", () => {
  test("en ligne : la copie du prochain service est écrite sans ouvrir la setlist ; « Prêt hors-ligne » après le cache, pas avant", async ({ page }) => {
    await ouvrir(page);
    await expect.poll(() => copies(page), { timeout: 15_000 }).toContainEqual([SETLIST_ID, COMPTE.uid]);
    await expect.poll(async () => (await messages(page)).flatMap((m) => m.urls), { timeout: 15_000 })
      .toEqual(expect.arrayContaining([`/setlists/${SETLIST_ID}/`, "/songs/abba-pere/", "/api/song/abba-pere"]));
    // Copie faite, cache pas encore : rien (pas d'indicateur de chargement).
    await page.waitForTimeout(3_500);
    await expect(pret(page)).toHaveCount(0);
    await page.evaluate(() => { (window as unknown as { __toutEnCache: boolean }).__toutEnCache = true; });
    await expect(pret(page)).toHaveText("Prêt hors-ligne", { timeout: 10_000 });
    expect(page.url()).toMatch(/\/setlists\/?$/);
  });

  test("中文 : « 已可离线使用 » dans le bloc", async ({ page }) => {
    await ouvrir(page, { zh: true });
    await expect.poll(() => copies(page), { timeout: 15_000 }).toContainEqual([SETLIST_ID, COMPTE.uid]);
    await page.evaluate(() => { (window as unknown as { __toutEnCache: boolean }).__toutEnCache = true; });
    await expect(pret(page)).toHaveText("已可离线使用", { timeout: 10_000 });
  });

  test("puis réseau coupé : la setlist s'ouvre depuis le bloc et le mode louange tourne ses pages", async ({ page }) => {
    await ouvrir(page);
    await expect.poll(() => copies(page), { timeout: 15_000 }).toContainEqual([SETLIST_ID, COMPTE.uid]);
    await page.evaluate(() => { (window as unknown as { __toutEnCache: boolean }).__toutEnCache = true; });
    await expect(pret(page)).toBeVisible({ timeout: 10_000 });
    // Firestore injoignable (le serveur de dev reste là : sans vrai service worker, ses pages ne sont pas en cache).
    await page.route(/firestore\.googleapis\.com/, (route) => route.abort("internetdisconnected"));
    await page.locator("[data-pupitre] [data-pupitre-chant]").first().click();
    await attendreMiseEnPage(page);
    const barre = page.locator("[data-performance-mode] [data-barre-haut]");
    await expect(barre).toContainText(CHANTS[0][1]);
    // Première entrée : le popover « Je joue » peut s'ouvrir seul ; on le ferme.
    await page.keyboard.press("Escape");
    // Le focus revient au bouton « Je joue », qui garderait la flèche : on le rend à la page.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect.poll(() => lireCompteur(page)).toMatch(/^1 \/ [2-9]/);
    await page.keyboard.press("ArrowRight");
    await attendreCompteur(page, /^2 \//);
  });

  test("un service à plus de 14 jours n'est pas gardé", async ({ page }) => {
    await ouvrir(page, { service: LOINTAIN });
    await page.waitForTimeout(4_000);
    expect(await copies(page)).toEqual([]);
    expect(await messages(page)).toEqual([]);
    await expect(pret(page)).toHaveCount(0);
  });

  test("hors ligne au départ : rien n'est tenté, aucune erreur affichée", async ({ page }) => {
    const erreurs: string[] = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    await ouvrir(page, { horsLigne: true });
    await page.waitForTimeout(4_000);
    expect(await copies(page)).toEqual([]);
    expect(await messages(page)).toEqual([]);
    await expect(pret(page)).toHaveCount(0);
    // (L'annonceur de route de Next est un « alert » vide : seul un message compte.)
    await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);
    expect(erreurs).toEqual([]);
  });

  test("listerCopies ne rend que les copies du compte : celle d'un autre compte ne rend pas « Prêt »", async ({ page }) => {
    // Hors ligne au départ : rien n'est écrit, seule la copie semée compte ; tout est « en cache » dès le chargement.
    await ouvrir(page, { horsLigne: true });
    await page.addInitScript(() => { (window as unknown as { __toutEnCache: boolean }).__toutEnCache = true; });
    await semerCopie(page, "uid-jules-autre", culte(PROCHE));
    await page.reload();
    await expect(page.locator("[data-pupitre]")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(4_000);
    await expect(pret(page)).toHaveCount(0);

    await semerCopie(page, COMPTE.uid, culte(PROCHE));
    await page.reload();
    await expect(page.locator("[data-pupitre]")).toBeVisible({ timeout: 20_000 });
    await expect(pret(page)).toBeVisible({ timeout: 10_000 });
  });
});
