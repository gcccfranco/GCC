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
