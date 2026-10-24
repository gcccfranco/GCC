import { test } from "@playwright/test";
import path from "node:path";
import { OUT, ecouter, ecrire, isoler } from "./lib";
import { signInAs } from "../../tests/helpers/fakeSession";

// Hors ligne pour de vrai : le service worker ne met rien en cache sur localhost
// (public/sw.js, LOCAL). On sert donc le build de production sous un faux nom,
// gcc.test, traité comme une origine sûre (sinon pas de service worker en http).
const HOTE = "http://127.0.0.2:3300";
test.use({
  baseURL: HOTE,
});

const etat = (page: import("@playwright/test").Page) => page.evaluate(() => ({
  url: location.pathname,
  h1: Array.from(document.querySelectorAll("h1")).map((h) => (h.textContent || "").trim().slice(0, 40)),
  accords: document.querySelectorAll("[aria-label^=\"Voir comment jouer\"]").length,
  scans: Array.from(document.querySelectorAll("img")).filter((i) => /jianpu/.test(i.src)).map((i) => i.complete && i.naturalWidth > 0),
  texte: document.body?.innerText.slice(0, 200).replace(/\s+/g, " ") ?? "",
  controle: !!navigator.serviceWorker?.controller,
}));

test("hors ligne : chants déjà ouverts, liste, chant jamais ouvert", async ({ page, context }, info) => {
  if (!["telephone", "ordinateur"].includes(info.project.name)) test.skip();
  test.setTimeout(5 * 60_000);
  await isoler(page);
  const j = ecouter(page);
  await page.goto("/songs/");
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.reload();
  await page.waitForTimeout(1500);
  const sw = await page.evaluate(async () => ({ controle: !!navigator.serviceWorker?.controller, caches: await caches.keys() }));
  for (const s of ["/songs/abba-pere/", "/songs/一生爱你/"]) { await page.goto(s); await page.waitForTimeout(2500); }
  const contenuCache = await page.evaluate(async () => {
    const r: Record<string, number> = {};
    for (const k of await caches.keys()) r[k] = (await (await caches.open(k)).keys()).length;
    return r;
  });
  await context.setOffline(true);
  const resultats: Record<string, unknown>[] = [];
  const essai = async (nom: string, f: () => Promise<unknown>) => {
    let erreur = "";
    try { await f(); } catch (e) { erreur = String(e).slice(0, 160); }
    await page.waitForTimeout(1800);
    const e = await etat(page).catch((x) => ({ erreurEtat: String(x).slice(0, 100) }));
    resultats.push({ nom, erreur, ...e });
    await page.screenshot({ path: path.join(OUT, `horsligne-${info.project.name}-${resultats.length}.png`) }).catch(() => {});
  };
  await essai("recharger un chant FR déjà ouvert", () => page.reload());
  await essai("aller au chant ZH déjà ouvert (scan 简谱)", () => page.goto("/songs/一生爱你/"));
  await essai("aller à la liste des chants", () => page.goto("/songs/"));
  await essai("lien vers un chant jamais ouvert", async () => { await page.locator("main a[href*='/songs/a-l-agneau']").first().click(); });
  await essai("aller au planning (jamais ouvert)", () => page.goto("/planning/"));
  await context.setOffline(false);
  ecrire("horsligne.jsonl", { projet: info.project.name, sw, contenuCache, resultats, pageerrors: j.pageerrors });
});

// A3 bis : le parcours réel d'un dimanche. On ouvre la liste, on touche la setlist (navigation par lien, pas un
// chargement complet), puis le réseau tombe : la page rechargée montre la copie, et le chant chinois son scan.
const item = (slug: string, position: number) => ({ type: "song", songSlug: slug, position, keyOverride: null, showChords: true,
  showPinyin: true, useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "" });
test("hors ligne : setlist ouverte par un lien, rechargée sans réseau", async ({ page, context }, info) => {
  if (!["telephone", "ordinateur", "tablette"].includes(info.project.name)) test.skip();
  test.setTimeout(4 * 60_000);
  await signInAs(page, { uid: "uid-maelys", email: "maelys@example.com", serviceRoles: { "Culte Francophone": ["musicien"] } },
    { "setlists/sl-banc": { title: "Culte du banc", leader: "Présidence", category: "Culte Francophone", date: "2026-11-01",
      language: "mixed", notes: "", ownerId: "uid-autre", isPrivate: false, items: [item("abba-pere", 1), item("一生爱你", 2)] } },
    "/setlists");
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.reload();
  await page.locator("a[href*='/setlists/sl-banc']").first().click();
  await page.getByText("Culte du banc").first().waitFor();
  await page.waitForTimeout(10_000); // préchargement par le service worker
  const cache = await page.evaluate(async () => {
    const c = await caches.open((await caches.keys()).find((k) => k.startsWith("gcc-louange")) ?? "");
    const cles = (await c.keys()).map((r) => decodeURIComponent(new URL(r.url).pathname));
    return { page: cles.some((k) => k.startsWith("/setlists/sl-banc")), scans: cles.filter((k) => k.startsWith("/jianpu/一生爱你")).length };
  });
  await context.setOffline(true);
  await page.route(/firestore\.googleapis\.com/, (r) => r.abort());
  await page.reload();
  await page.waitForTimeout(5000);
  const apres = await page.evaluate(() => ({
    copie: !!document.querySelector("[data-copie-hors-ligne]"),
    titre: document.body.innerText.includes("Culte du banc"),
    pasOuverte: document.body.innerText.includes("pas encore été ouverte"),
  }));
  await page.screenshot({ path: path.join(OUT, `horsligne-setlist-${info.project.name}-1.png`) });
  await page.goto("/songs/一生爱你/");
  await page.waitForTimeout(3000);
  const scan = await page.evaluate(() => Array.from(document.querySelectorAll("img")).filter((i) => /jianpu/.test(i.src)).map((i) => i.complete && i.naturalWidth > 0));
  await page.screenshot({ path: path.join(OUT, `horsligne-setlist-${info.project.name}-2.png`) });
  await context.setOffline(false);
  ecrire("horsligne-setlist.jsonl", { projet: info.project.name, cache, apres, scan });
});

// Réseau d'église : lent et chargé (400 ms, 400 kb/s), processeur de téléphone (×4).
const PAGES_LENTES = ["/songs/", "/songs/abba-pere/", "/songs/一生爱你/", "/accords/", "/harmonie/"];
test("réseau lent : premier affichage, polices, poids", async ({ page }, info) => {
  if (info.project.name !== "telephone") test.skip();
  test.setTimeout(20 * 60_000);
  await isoler(page);
  for (const p of PAGES_LENTES) {
    const ctx = await page.context().browser()!.newContext({ ...info.project.use, baseURL: "http://localhost:3300", serviceWorkers: "block" });
    const pg = await ctx.newPage();
    await isoler(pg);
    const cdp = await ctx.newCDPSession(pg);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 200 * 1024 / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const t0 = Date.now();
    await pg.goto(p, { waitUntil: "commit", timeout: 300_000 });
    const h1 = await pg.locator("h1").last().waitFor({ timeout: 240_000 }).then(() => Date.now() - t0).catch(() => null);
    const accords = p.includes("/songs/") && p !== "/songs/" ? await pg.locator("[aria-label^=\"Voir comment jouer\"]").first().waitFor({ timeout: 240_000 }).then(() => Date.now() - t0).catch(() => null) : null;
    const polices = await pg.evaluate(() => document.fonts.ready.then(() => performance.now())).then((v) => Math.round(v)).catch(() => null);
    await pg.waitForLoadState("load", { timeout: 300_000 }).catch(() => {});
    const charge = Date.now() - t0;
    const m = await pg.evaluate(() => {
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const polices = res.filter((r) => /\.(woff2?|ttf|otf)/.test(r.name)).map((r) => `${r.name.split("/").pop()} ${Math.round((r.transferSize || r.encodedBodySize) / 1024)} Ko`);
      let lcp = 0;
      try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch { /* */ }
      return new Promise((r) => setTimeout(() => r({ lcp: Math.round(lcp), polices, ko: Math.round(res.reduce((s, x) => s + (x.transferSize || 0), 0) / 1024) }), 300));
    });
    await pg.screenshot({ path: path.join(OUT, `lent-${p.replace(/\W+/g, "_")}.png`) }).catch(() => {});
    ecrire("lent.jsonl", { page: p, h1Ms: h1, accordsMs: accords, policesPretesMs: polices, chargeMs: charge, ...(m as object) });
    await ctx.close();
  }
});
