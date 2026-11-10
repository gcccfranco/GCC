import { readFileSync } from "node:fs";
import vm from "node:vm";
import { expect, test, type Page } from "@playwright/test";
import { systemesCoherents, urlsJianpuAGarder } from "../src/lib/jianpu/images";

// 16/09/2026 : en local, le service worker servait les fichiers de Next
// (`/_next/static/…`) depuis son cache. En production ces fichiers portent un
// nom hashé, donc c'est sans risque ; en développement leur nom ne change pas,
// et le navigateur affichait l'ancien code après chaque modification — la page
// arrivait à jour, le JavaScript non.

/** Attend que le service worker contrôle la page, puis recharge pour qu'il intercepte. */
async function serviceWorkerActif(page: Page): Promise<boolean> {
  const prêt = await page
    .waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  return prêt;
}

const urlsEnCache = (page: Page) =>
  page.evaluate(async () => {
    const urls: string[] = [];
    for (const nom of await caches.keys()) {
      const cache = await caches.open(nom);
      for (const requête of await cache.keys()) urls.push(requête.url);
    }
    return urls;
  });

test("service worker : en local, les fichiers de développement ne sont jamais mis en cache", async ({ page }) => {
  await page.goto("/songs");
  await page.getByRole("searchbox").waitFor();
  test.skip(!(await serviceWorkerActif(page)), "service worker non enregistré par ce navigateur");

  await page.reload();
  await page.getByRole("searchbox").waitFor();
  await page.waitForTimeout(500);

  const statiques = (await urlsEnCache(page)).filter((u) => u.includes("/_next/static/"));
  expect(statiques, "aucun fichier de Next en cache sur le serveur local").toEqual([]);
});

// ─── Dimanche hors ligne (audit du 24/10/2026, D2 et D3, constats P3) ──────────
// Le hors-ligne réel (service worker actif, réseau coupé) se mesure avec le banc
// scripts/rude-epreuve ; ici, ce qui se teste sans lui.

test("hors-ligne.html : la page de repli se charge, avec ses deux messages", async ({ page }) => {
  await page.goto("/hors-ligne.html");
  await expect(page.getByText("Pas de réseau. Cette page n'a pas encore été ouverte sur cet appareil.")).toBeVisible();
  await expect(page.getByText("无网络。此页面尚未在此设备上打开过。")).toBeVisible();
  await expect(page.getByRole("link", { name: /Réessayer/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Les chants/ })).toHaveAttribute("href", "/songs/");
  // compte-16 : ni « — » ni « · » visibles, le français d'abord et en encre.
  const texte = await page.locator("body").innerText();
  expect(texte).not.toMatch(/[—·]/);
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("fr");
  expect(await page.evaluate(() => document.title)).toBe("Pas de réseau, 无网络");
  expect(await page.locator("main > p").first().getAttribute("id")).toBe("fr");
});

test("hors-ligne.html : fonds du site et boutons de 44 px, en clair et en sombre (compte-16)", async ({ page }) => {
  for (const [scheme, fond] of [["light", "rgb(255, 255, 255)"], ["dark", "rgb(0, 0, 0)"]] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/hors-ligne.html");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), scheme).toBe(fond);
    for (const lien of await page.locator("nav a").all()) {
      expect(Math.round((await lien.boundingBox())!.height), scheme).toBe(44);
    }
  }
});

test("hors-ligne.html : l'interface en 中文 met le chinois d'abord (compte-17)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("i18nextLng", "zh-CN"));
  await page.goto("/hors-ligne.html");
  expect(await page.locator("main > p").first().getAttribute("id")).toBe("zh");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("zh-CN");
  expect(await page.evaluate(() => document.title)).toBe("无网络，Pas de réseau");
  await expect(page.locator("#reessayer span").first()).toHaveText("重试");
  await expect(page.locator("#reessayer span").last()).toHaveText("Réessayer");
  await expect(page.locator("#chants span").first()).toHaveText("诗歌");
});

test("hors-ligne.html : sans langue enregistrée, le français d'abord (compte-17)", async ({ page }) => {
  await page.goto("/hors-ligne.html");
  await expect(page.locator("#reessayer span").first()).toHaveText("Réessayer");
  await expect(page.locator("#chants span").first()).toHaveText("Les chants");
});

test("hors-ligne.html : stockage bloqué, la page s'affiche (compte-17)", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new Error("stockage bloqué"); }; });
  await page.goto("/hors-ligne.html");
  await expect(page.getByRole("link", { name: /Réessayer|重试/ })).toBeVisible();
});

test("sw.js : il se parse, et le test d'hôte local reconnaît les adresses privées", async ({ request }) => {
  const texte = await (await request.get("/sw.js")).text();
  const faux = { location: { hostname: "gcc.example.org" }, addEventListener: () => {} };
  const estHoteLocal = new Function("self", `${texte}\nreturn estHoteLocal;`)(faux) as (h: string) => boolean;
  for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "172.16.0.1", "172.20.10.2", "172.31.255.1", "192.168.1.2", "[::1]", "::1", "poste.local"]) {
    expect(estHoteLocal(h), h).toBe(true);
  }
  // 127.0.0.2 : hôte volontairement « non local » du banc scripts/rude-epreuve.
  for (const h of ["127.0.0.2", "172.15.0.1", "172.32.0.1", "192.169.1.1", "192.168.evil.example", "gcc-louange.vercel.app"]) {
    expect(estHoteLocal(h), h).toBe(false);
  }
});

test("sw.js : le cache est v6 ; la page hors ligne et le logo sont précachés", async ({ request }) => {
  const texte = await (await request.get("/sw.js")).text();
  expect(texte).toContain('const CACHE = "gcc-louange-v6"');
  expect(texte).toMatch(/PRECACHE = \[[^\]]*"\/hors-ligne\.html"|HORS_LIGNE\]/);
  expect(texte).toMatch(/PRECACHE = \[[^\]]*"\/logo\.png"/);
});

// ─── A3 bis : sw.js exécuté comme en ligne, avec un cache et un réseau simulés ───
// Le service worker ne met rien en cache sur un serveur local : on le fait tourner dans `vm` avec un faux `self`,
// de faux `caches` qui gardent l'ordre d'insertion des clés (comme Cache Storage : le test « Cache Storage garde
// l'ordre » plus bas le vérifie sur le vrai navigateur) et un faux `fetch`.

const ORIGINE = "https://louange.example.org";
type Rep = { ok: boolean; status: number; headers: { get: (k: string) => string | null }; clone(): Rep; text(): Promise<string>; id?: string };
const rep = (id: string, type = "application/octet-stream", corps = "", status = 200): Rep => ({
  ok: status < 400, status, id, headers: { get: (k) => (k.toLowerCase() === "content-type" ? type : null) },
  clone() { return this; }, text: async () => corps,
});

function monterSw(reseau: (url: string) => Rep | null) {
  /** url (sans l'origine) → réponse, dans l'ordre d'insertion. */
  const magasin = new Map<string, Rep>();
  const normal = (r: string | { url: string }, ignoreSearch = false) => {
    const u = new URL(typeof r === "string" ? r : r.url, ORIGINE);
    return ignoreSearch ? u.origin + u.pathname : u.href;
  };
  const cle = (r: string | { url: string }) => normal(r);
  const trouver = (r: string | { url: string }, o?: { ignoreSearch?: boolean }) => {
    for (const [k, v] of magasin) if (normal(k, o?.ignoreSearch) === normal(r, o?.ignoreSearch)) return v;
    return undefined;
  };
  const cache = {
    match: async (r: string | { url: string }, o?: { ignoreSearch?: boolean }) => trouver(r, o),
    // Comme la spécification : une entrée de même clé est retirée, la nouvelle va en fin d'ordre.
    put: async (r: string | { url: string }, v: Rep) => { magasin.delete(cle(r)); magasin.set(cle(r), v); },
    add: async () => {},
    delete: async (r: string | { url: string }) => magasin.delete(cle(r)),
    keys: async () => [...magasin.keys()].map((url) => ({ url })),
  };
  const gestionnaires: Record<string, (e: unknown) => void> = {};
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: {
      location: { hostname: "louange.example.org", origin: ORIGINE },
      addEventListener: (t: string, f: (e: unknown) => void) => { gestionnaires[t] = f; },
      skipWaiting: () => {},
    },
    caches: { open: async () => cache, match: cache.match, keys: async () => [], delete: async () => true },
    fetch: async (r: string | { url: string }) => {
      const res = reseau(normal(r).slice(ORIGINE.length));
      if (!res) throw new TypeError("réseau coupé");
      return res;
    },
    URL, setTimeout, clearTimeout,
    Response: class { status: number; constructor(_corps: unknown, init?: { status?: number }) { this.status = init?.status ?? 200; } },
  });
  const attendre = async (attentes: Promise<unknown>[]) => {
    await Promise.all(attentes);
    await new Promise((r) => setTimeout(r, 0));
  };
  return {
    magasin,
    chemins: () => [...magasin.keys()].map((k) => k.slice(ORIGINE.length)),
    cache,
    async requete(chemin: string, mode: string = "no-cors") {
      let reponse: Promise<Rep> | undefined;
      const attentes: Promise<unknown>[] = [];
      gestionnaires.fetch({
        request: { method: "GET", url: ORIGINE + chemin, mode },
        respondWith: (p: Promise<Rep>) => { reponse = p; },
        waitUntil: (p: Promise<unknown>) => { attentes.push(p); },
      });
      const res = await reponse;
      await attendre(attentes);
      return res;
    },
    async precache(urls: string[]) {
      const attentes: Promise<unknown>[] = [];
      gestionnaires.message({ data: { type: "precache", urls }, waitUntil: (p: Promise<unknown>) => { attentes.push(p); } });
      await attendre(attentes);
    },
  };
}

test("sw.js, precache : la page d'une setlist, la liste et les scans sont gardés, avec les fichiers de la page ; `..` refusé", async () => {
  const scan = `/jianpu/${encodeURIComponent("一生爱你-p1.webp")}`;
  const sw = monterSw((chemin) => {
    if (chemin === "/setlists/s1/" || chemin === "/setlists/") {
      return rep(chemin, "text/html; charset=utf-8", '<script src="/_next/static/chunks/page-aaa.js"></script><link href="/_next/static/css/b.css">');
    }
    return rep(chemin);
  });
  await sw.precache([
    "/setlists/s1/", "/setlists/", "/jianpu/index.json", "/jianpu/chords.json", "/jianpu/cadrage.json", scan,
    "/setlists/../admin/", "/jianpu/../secret", "/admin/", "/_next/static/x.js",
  ]);
  expect(sw.chemins()).toEqual([
    "/setlists/s1/", "/_next/static/chunks/page-aaa.js", "/_next/static/css/b.css",
    "/setlists/",
    "/jianpu/index.json", "/jianpu/chords.json", "/jianpu/cadrage.json", scan,
  ]);
});

test("sw.js, precache : les scans respectent le plafond de /jianpu/", async () => {
  const sw = monterSw((chemin) => rep(chemin));
  for (let i = 0; i < 250; i++) await sw.cache.put(`/jianpu/vieux-${i}.webp`, rep("v"));
  await sw.precache(["/jianpu/neuf-a.webp", "/jianpu/neuf-b.webp"]);
  const jianpu = sw.chemins().filter((c) => c.startsWith("/jianpu/"));
  expect(jianpu).toHaveLength(250);
  expect(jianpu.slice(-2)).toEqual(["/jianpu/neuf-a.webp", "/jianpu/neuf-b.webp"]);
  expect(jianpu).not.toContain("/jianpu/vieux-0.webp");
});

test("sw.js, precache : les JSON de /jianpu/ (index, systemes, sections, marges) sont hors du plafond des 250 entrées", async () => {
  const sw = monterSw((chemin) => rep(chemin));
  const jsons = ["index", "chords", "cadrage", "systemes", "sections", "marges"].map((n) => `/jianpu/${n}.json`);
  await sw.precache(jsons);
  // Beaucoup plus de scans que le plafond : les JSON ne partent jamais, les scans les plus anciens oui.
  for (let i = 0; i < 300; i++) await sw.precache([`/jianpu/s-${i}.webp`]);
  const jianpu = sw.chemins().filter((c) => c.startsWith("/jianpu/"));
  for (const j of jsons) expect(jianpu, j).toContain(j);
  const scans = jianpu.filter((c) => c.endsWith(".webp"));
  expect(scans).toHaveLength(250);
  expect(scans).not.toContain("/jianpu/s-0.webp");
  expect(scans).toContain("/jianpu/s-299.webp");
});

test("urlsJianpuAGarder : les manifestes systemes, sections et marges sont gardés avec les scans", () => {
  const urls = urlsJianpuAGarder({ chant: { source: "x", pages: [{ file: "a.webp", w: 1, h: 1 }] } }, ["chant"]);
  for (const n of ["index", "chords", "cadrage", "systemes", "sections", "marges"]) expect(urls).toContain(`/jianpu/${n}.json`);
  expect(urls).toContain("/jianpu/a.webp");
});

test("systemesCoherents : un chant dont une page n'a pas les mêmes w/h que index.json retombe sur le repli (non certifié)", () => {
  const manifeste = {
    a: { source: "x", pages: [{ file: "a-p1.webp", w: 1600, h: 2000 }] },
    b: { source: "x", pages: [{ file: "b-p1.webp", w: 1600, h: 2000 }, { file: "b-p2.webp", w: 1600, h: 2000 }] },
    c: { source: "x", pages: [{ file: "c-p1.webp", w: 1600, h: 2000 }] },
  };
  const page = (file: string, w: number, h: number) => ({ file, w, h, lignes: [] });
  const out = systemesCoherents({
    a: { pages: [page("a-p1.webp", 1600, 2000)] },
    b: { pages: [page("b-p1.webp", 1600, 2000), page("b-p2.webp", 1600, 2100)] },
    c: { pages: [page("c-p1.webp", 1601, 2000)] },
    absent: { pages: [page("z.webp", 1, 1)] },
  }, manifeste);
  expect(Object.keys(out)).toEqual(["a"]);
});

test("sw.js, adresses sans barre finale : la copie avec barre est servie hors ligne, paramètres gardés", async () => {
  const sw = monterSw(() => null);
  await sw.cache.put("/planning/", rep("planning"));
  await sw.cache.put("/mes-services/", rep("services"));
  await sw.cache.put("/sw.js", rep("fichier"));
  expect((await sw.requete("/planning", "navigate"))?.id).toBe("planning");
  expect((await sw.requete("/mes-services?x=1", "navigate"))?.id).toBe("services");
  // Une adresse à extension n'est pas cherchée avec une barre ; une page jamais gardée → page hors ligne (503 ici : elle n'est pas en cache).
  expect((await sw.requete("/sw.js.map", "navigate"))?.status).toBe(503);
  expect((await sw.requete("/jamais-ouverte", "navigate"))?.status).toBe(503);
});

test("sw.js, LRU : une entrée relue passe en fin d'ordre et survit au plafond de 300", async () => {
  const sw = monterSw((chemin) => rep(chemin));
  for (let i = 0; i < 300; i++) await sw.cache.put(`/_next/static/chunks/c${i}.js`, rep(`c${i}`));
  // c0 est la plus ancienne ; on la relit (cache-first) : elle passe en fin d'ordre, sans réseau.
  await sw.requete("/_next/static/chunks/c0.js");
  expect(sw.chemins().at(-1)).toBe("/_next/static/chunks/c0.js");
  expect(sw.chemins()[0]).toBe("/_next/static/chunks/c1.js");
  // Une entrée neuve dépasse le plafond : la plus ancienne (c1) part, pas c0.
  await sw.requete("/_next/static/chunks/neuf.js");
  const static_ = sw.chemins().filter((c) => c.startsWith("/_next/static/"));
  expect(static_).toHaveLength(300);
  expect(static_).toContain("/_next/static/chunks/c0.js");
  expect(static_).not.toContain("/_next/static/chunks/c1.js");
  expect(static_.at(-1)).toBe("/_next/static/chunks/neuf.js");
});

test("sw.js, LRU : un scan relu sans réseau passe en fin d'ordre", async () => {
  const sw = monterSw(() => null);
  await sw.cache.put("/jianpu/a.webp", rep("a"));
  await sw.cache.put("/jianpu/b.webp", rep("b"));
  await sw.cache.put("/jianpu/c.webp", rep("c"));
  expect((await sw.requete("/jianpu/a.webp"))?.id).toBe("a");
  expect(sw.chemins()).toEqual(["/jianpu/b.webp", "/jianpu/c.webp", "/jianpu/a.webp"]);
});

test("Cache Storage : delete puis put remet l'entrée en fin d'ordre des clés (base du LRU)", async ({ page }) => {
  await page.goto("/hors-ligne.html");
  const ordre = await page.evaluate(async () => {
    const nom = "test-ordre-lru";
    await caches.delete(nom);
    const c = await caches.open(nom);
    for (const k of ["/a", "/b", "/c"]) await c.put(k, new Response(k));
    const avant = (await c.keys()).map((r) => new URL(r.url).pathname);
    const copie = (await c.match("/a"))!.clone();
    await c.delete("/a");
    await c.put("/a", copie);
    const apres = (await c.keys()).map((r) => new URL(r.url).pathname);
    await caches.delete(nom);
    return { avant, apres };
  });
  expect(ordre.avant).toEqual(["/a", "/b", "/c"]);
  expect(ordre.apres).toEqual(["/b", "/c", "/a"]);
});
