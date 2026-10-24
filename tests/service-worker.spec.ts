import { expect, test, type Page } from "@playwright/test";

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
  await expect(page.getByText("Pas de réseau — cette page n'a pas encore été ouverte sur cet appareil.")).toBeVisible();
  await expect(page.getByText("无网络——此页面尚未在此设备上打开过。")).toBeVisible();
  await expect(page.getByRole("link", { name: /Réessayer/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Les chants/ })).toHaveAttribute("href", "/songs/");
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

test("sw.js : le cache est v5 et la page hors ligne est précachée", async ({ request }) => {
  const texte = await (await request.get("/sw.js")).text();
  expect(texte).toContain('const CACHE = "gcc-louange-v5"');
  expect(texte).toMatch(/PRECACHE = \[[^\]]*"\/hors-ligne\.html"|HORS_LIGNE\]/);
});
