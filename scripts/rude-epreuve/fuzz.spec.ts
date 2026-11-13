import { test, request as pwRequest } from "@playwright/test";
import { OFF, ON, connecter, ecouter, ecrire, isoler, SONGS } from "./lib";

const seul = (info: { project: { name: string } }, ...p: string[]) => { if (!p.includes(info.project.name)) test.skip(); };
const etat = (page: import("@playwright/test").Page) => page.evaluate(() => ({
  plantage: /Application error: a client-side exception|Unhandled Runtime Error/i.test(document.body.innerText),
  introuvable: /could not be found|introuvable|n'existe pas|404/i.test(document.body.innerText),
  h1: Array.from(document.querySelectorAll("h1")).map((h) => (h.textContent || "").trim().slice(0, 50)),
  cle: document.querySelector("[data-testid=tonalite-courante]")?.firstChild?.textContent?.trim() ?? null,
  texte: document.body.innerText.slice(0, 160).replace(/\s+/g, " "),
  alerte: (window as unknown as { __xss?: boolean }).__xss === true,
}));

// 1. Paramètres d'URL tordus sur la page d'un chant (lus en JSON).
const LONG = "A".repeat(10_000);
const PARAMS = [
  "key=F", "key=%22H%22", "key=123", "key=null", "key=%7B%7D", "key=%5B%5D", `key=%22${LONG}%22`,
  "key=%22%3Cimg%20src%3Dx%20onerror%3Dwindow.__xss%3Dtrue%3E%22",
  "sectionNotes=%7B%22verse-1-0%22%3A%22%3Cimg%20src%3Dx%20onerror%3Dwindow.__xss%3Dtrue%3E%22%7D",
  "structure=%22x%22", "structure=%7B%7D", "structure=%5B%22nope%22%2C1%2Cnull%5D", "structure=%5B",
  "sectionNotes=%5B1%2C2%5D", "sectionNotes=%7B%22verse-1%22%3A%22%3Cb%3Egras%3C%2Fb%3E%22%7D", "sectionNuances=%22x%22",
  "sectionKeys=%7B%22verse-1-0%22%3A%22ZZ%22%7D", "setlist=%5B%5D", "setlist=%22inexistante%22&item=%22abc%22", "item=-1",
  "capo=999", "semitones=%22x%22", "pinyin=%22oui%22",
];
test("URL tordues sur /songs/abba-pere/", async ({ page }, info) => {
  seul(info, "telephone", "ordinateur");
  test.setTimeout(10 * 60_000);
  await isoler(page);
  for (const q of PARAMS) {
    const j = ecouter(page);
    await page.goto(`${OFF}/songs/abba-pere/?${q}`);
    await page.waitForTimeout(900);
    ecrire("fuzz-url.jsonl", { projet: info.project.name, q: q.slice(0, 120), ...(await etat(page)), pageerrors: j.pageerrors });
    page.removeAllListeners("pageerror"); page.removeAllListeners("console"); page.removeAllListeners("response"); page.removeAllListeners("requestfailed");
  }
});

// 2. Routes inexistantes ou tordues.
const ROUTES_VIS = ["/songs/inexistant/", "/songs/%2e%2e/", "/songs/%3Cscript%3E/", "/harmonie/xyz/abc/", "/harmonie/cours/999/", "/harmonie/rd2000/9999/",
  "/harmonie/rd2000/abc/", "/evenements/inexistant/", "/accords/?accord=%22Zzz%22", "/songs/?q=%3Cscript%3E"];
const ROUTES_MEMBRE = ["/setlists/inexistante/", "/setlists/inexistante/edit/", "/mes-services/2026-13-45/", "/mes-services/abc/", "/evenements/inexistant/modifier/"];
test("routes tordues (visiteur et membre)", async ({ page }, info) => {
  seul(info, "telephone", "ordinateur");
  test.setTimeout(10 * 60_000);
  await isoler(page);
  for (const r of ROUTES_VIS) {
    const j = ecouter(page);
    const rep = await page.goto(`${OFF}${r}`);
    await page.waitForTimeout(900);
    ecrire("fuzz-routes.jsonl", { projet: info.project.name, qui: "visiteur", r, status: rep?.status(), url: page.url(), ...(await etat(page)), pageerrors: j.pageerrors });
    page.removeAllListeners("pageerror");
  }
  await connecter(page, "membre", "/moi");
  for (const r of ROUTES_MEMBRE) {
    const j = ecouter(page);
    const rep = await page.goto(`${OFF}${r}`);
    await page.waitForTimeout(1500);
    ecrire("fuzz-routes.jsonl", { projet: info.project.name, qui: "membre", r, status: rep?.status(), url: page.url(), ...(await etat(page)), pageerrors: j.pageerrors });
    page.removeAllListeners("pageerror");
  }
});

// 3. Recherche des chants : saisies tordues.
const SAISIES = ["", " ", "a", "ABBA", "abba père", "Abba Pere", "一生", "yi sheng", "yīshēng", "yisheng", ".*", "[(", "\\", "%", "'; DROP TABLE songs; --",
  "<script>window.__xss=true</script>", "<img src=x onerror=window.__xss=true>", "😀🙏", "a".repeat(5000), "\u0000", "Jésus", "jesus", "JÉSUS", "agneau", "l'agneau", "l’agneau", "主", "zhu"];
test("recherche des chants : saisies tordues", async ({ page }, info) => {
  seul(info, "telephone", "ordinateur");
  test.setTimeout(10 * 60_000);
  await isoler(page);
  const j = ecouter(page);
  await page.goto(`${OFF}/songs/`);
  const champ = page.locator("input[type=search], input[role=searchbox], input[placeholder]").first();
  await champ.waitFor();
  for (const s of SAISIES) {
    const t0 = Date.now();
    await champ.fill(s);
    await page.waitForTimeout(450);
    const n = await page.evaluate(() => document.querySelectorAll("a[href*='/songs/']").length);
    ecrire("fuzz-recherche.jsonl", { projet: info.project.name, saisie: s.slice(0, 40), longueur: s.length, liensChants: n, ms: Date.now() - t0, ...(await etat(page)), pageerrors: [...j.pageerrors] });
  }
});

// 4. Gestes répétés à toute vitesse.
test("gestes à toute vitesse sur un chant et entre les pages", async ({ page }, info) => {
  seul(info, "telephone", "ordinateur");
  test.setTimeout(10 * 60_000);
  await isoler(page);
  const j = ecouter(page);
  await page.goto(`${OFF}/songs/abba-pere/`);
  await page.getByTestId("pilule-tonalite").waitFor();
  const avant = await etat(page);
  const boutons = page.getByTestId("pilule-tonalite").getByRole("button");
  for (let i = 0; i < 30; i++) await boutons.last().click({ delay: 0 });
  for (let i = 0; i < 30; i++) await boutons.first().click({ delay: 0 });
  await page.waitForTimeout(300);
  const apres = await etat(page);
  const plusTexte = page.getByRole("button", { name: /Agrandir le texte/ });
  const moinsTexte = page.getByRole("button", { name: /Réduire le texte/ });
  const taille: string[] = [];
  if (await plusTexte.isVisible().catch(() => false)) {
    for (let i = 0; i < 25; i++) await plusTexte.click().catch(() => {});
    taille.push(await page.evaluate(() => getComputedStyle(document.querySelector("[aria-label^=\"Voir comment jouer\"]")!.parentElement!).fontSize).catch(() => "?"));
    for (let i = 0; i < 50; i++) await moinsTexte.click().catch(() => {});
    taille.push(await page.evaluate(() => getComputedStyle(document.querySelector("[aria-label^=\"Voir comment jouer\"]")!.parentElement!).fontSize).catch(() => "?"));
  }
  const vw = await page.evaluate(() => [document.documentElement.clientWidth, document.scrollingElement!.scrollWidth]);
  ecrire("gestes.jsonl", { projet: info.project.name, geste: "transposer +30 −30, texte +25 −50", cleAvant: avant.cle, cleApres: apres.cle, taille, vwSw: vw, pageerrors: [...j.pageerrors] });

  // Navigation : 15 chants ouverts sans attendre, puis 12 « retour » d'affilée.
  await page.goto(`${OFF}/songs/`);
  const liens = await page.locator("a[href*='/songs/']").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!).filter((h) => h.split("/").filter(Boolean).length === 2).slice(0, 40));
  for (const h of liens.slice(0, 15)) await page.goto(`${OFF}${h}`, { waitUntil: "commit" }).catch(() => {});
  for (let i = 0; i < 12; i++) await page.goBack({ waitUntil: "commit" }).catch(() => {});
  await page.waitForTimeout(1500);
  ecrire("gestes.jsonl", { projet: info.project.name, geste: "15 ouvertures sans attendre + 12 retours", url: page.url(), ...(await etat(page)), pageerrors: [...j.pageerrors] });
});

// 5. Fuite de mémoire : 40 chants ouverts en navigation client (lien → retour).
test("mémoire : 40 allers-retours liste → chant (ordinateur)", async ({ page }, info) => {
  seul(info, "ordinateur");
  test.setTimeout(15 * 60_000);
  await isoler(page);
  const j = ecouter(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const tas = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const m = await cdp.send("Performance.getMetrics");
    const g = (n: string) => m.metrics.find((x) => x.name === n)?.value ?? 0;
    return { tasMo: Math.round(g("JSHeapUsedSize") / 1e5) / 10, noeuds: g("Nodes"), ecouteurs: g("JSEventListeners") };
  };
  await page.goto(`${OFF}/songs/`);
  await page.waitForTimeout(1500);
  const mesures = [{ i: 0, ...(await tas()) }];
  for (let i = 1; i <= 40; i++) {
    const lien = page.locator("main a[href*='/songs/']").nth((i * 7) % 300);
    await lien.scrollIntoViewIfNeeded().catch(() => {});
    await lien.click().catch(() => {});
    await page.waitForURL(/\/songs\/[^/]+\/$/, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.goBack();
    await page.waitForURL(/\/songs\/$/, { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(300);
    if (i % 10 === 0) mesures.push({ i, ...(await tas()) });
  }
  ecrire("memoire.jsonl", { projet: info.project.name, mesures, pageerrors: j.pageerrors });
});

// 6. API : appels sans droits, corps tordus, chemins tordus. Aucune clé n'est présente (Resend, VAPID,
// firebase-admin) : rien ne peut partir. On regarde seulement les codes et la forme des réponses.
const POSTS = ["/api/report/", "/api/push/broadcast/", "/api/push/notify-setlist/", "/api/push/notify-evenement/", "/api/push/notify-audience/",
  "/api/setlist/presentation/", "/api/evenements/inscription/", "/api/evenements/desinscription/", "/api/scene/conflit/", "/api/taches/assigne/",
  "/api/taches/fait/", "/api/equipes/rattachement/", "/api/equipes/groupes/", "/api/planning/release/", "/api/planning/changements/",
  "/api/fetes/droits/", "/api/fetes/saisir/", "/api/fetes/musiques/"];
test("API : sans droits, corps tordus, chemins tordus", async ({}, info) => {
  seul(info, "ordinateur");
  test.setTimeout(10 * 60_000);
  for (const base of [OFF, ON]) {
    const ctx = await pwRequest.newContext({ baseURL: base });
    const essai = async (nom: string, f: () => Promise<import("@playwright/test").APIResponse>) => {
      const t0 = Date.now();
      try {
        const r = await f();
        const corps = (await r.text()).slice(0, 220).replace(/\s+/g, " ");
        ecrire("api.jsonl", { base, nom, status: r.status(), type: r.headers()["content-type"], ms: Date.now() - t0, corps });
      } catch (e) { ecrire("api.jsonl", { base, nom, erreur: String(e).slice(0, 200) }); }
    };
    for (const s of ["abba-pere", encodeURIComponent("一生爱你"), "inexistant", "..%2F..%2Fpackage.json", "%2e%2e%2f%2e%2e%2fpackage.json", "....//....//package.json", "A".repeat(3000), "%00"]) {
      await essai(`GET /api/song/${s.slice(0, 40)}`, () => ctx.get(`/api/song/${s}/`, { maxRedirects: 0 }));
    }
    await essai("GET /api/cron/reminders sans secret", () => ctx.get("/api/cron/reminders/"));
    await essai("GET /api/cron/reminders faux secret", () => ctx.get("/api/cron/reminders/", { headers: { Authorization: "Bearer faux" } }));
    for (const p of POSTS) {
      await essai(`POST ${p} sans jeton, corps vide`, () => ctx.post(p, { data: {} }));
      await essai(`POST ${p} faux jeton`, () => ctx.post(p, { data: { titre: "x" }, headers: { Authorization: "Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ4In0.sig" } }));
      await essai(`POST ${p} JSON cassé`, () => ctx.post(p, { data: "{pas du json", headers: { "Content-Type": "application/json" } }));
      await essai(`GET ${p}`, () => ctx.get(p));
    }
    await essai("POST /api/report corps 3 Mo + HTML", () => ctx.post("/api/report/", { data: { message: "<img src=x onerror=alert(1)>" + "x".repeat(3_000_000), slug: "abba-pere" } }));
    await ctx.dispose();
  }
});

// Ensemble des chants : tous les /api/song/<slug> répondent 200 avec du contenu.
test("API : /api/song pour les 382 chants", async ({}, info) => {
  seul(info, "ordinateur");
  test.setTimeout(10 * 60_000);
  const ctx = await pwRequest.newContext({ baseURL: OFF });
  const ko: string[] = [];
  let total = 0, octets = 0;
  for (const s of SONGS) {
    const r = await ctx.get(`/api/song/${encodeURIComponent(s.slug)}/`);
    total++;
    const t = await r.text();
    octets += t.length;
    if (r.status() !== 200 || t.length < 50) ko.push(`${r.status()} ${s.slug}`);
  }
  ecrire("api.jsonl", { nom: "api/song tous", total, ko, octetsMoyens: Math.round(octets / total) });
  await ctx.dispose();
});
