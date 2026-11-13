import { test } from "@playwright/test";
import { signInAs } from "../../tests/helpers/fakeSession";
import { ADMIN, DOCS, OFF, ON, connecter, ecrire, isoler, SETLIST_ID } from "./lib";

// Liens internes morts : chaque lien affiché (visiteur, membre en ligne, admin back-office) est demandé au serveur.
const PAGES = {
  visiteur: ["/songs/", "/songs/abba-pere/", "/songs/一生爱你/", "/accords/", "/harmonie/", "/harmonie/cours/", "/harmonie/rd2000/", "/login/", "/signup/", "/questionnaire/"],
  membre: ["/planning/", "/mes-services/", "/setlists/", `/setlists/${SETLIST_ID}/`, "/moi/", "/profil/", "/guide/", "/harmonie/", "/songs/abba-pere/"],
  admin: ["/back-office/", "/back-office/plus/", "/back-office/messages/", "/back-office/evenements/", "/moi/", "/guide/", "/equipes/", "/taches/"],
};
test("liens internes morts", async ({ page }, info) => {
  if (!["telephone", "ordinateur"].includes(info.project.name)) test.skip();
  test.setTimeout(20 * 60_000);
  await isoler(page);
  const trouves = new Map<string, Set<string>>(); // lien → pages où il paraît
  const recolter = async (qui: string, base: string, p: string) => {
    await page.goto(`${base}${p}`);
    await page.waitForTimeout(1500);
    // Ouvre les menus « Plus » et feuilles de navigation visibles pour voir leurs liens.
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    for (const h of hrefs) {
      if (!h.startsWith("/") || h.startsWith("//")) continue;
      const k = `${base === ON ? "ON" : "OFF"} ${h.split("#")[0]}`;
      if (!trouves.has(k)) trouves.set(k, new Set());
      trouves.get(k)!.add(`${qui}:${p}`);
    }
  };
  for (const p of PAGES.visiteur) await recolter("visiteur", OFF, p);
  await connecter(page, "membre", "/moi");
  for (const p of PAGES.membre) await recolter("membre", OFF, p);
  const page2 = await page.context().browser()!.newPage({ baseURL: ON });
  await isoler(page2);
  await signInAs(page2, ADMIN, DOCS, "/back-office");
  for (const p of PAGES.admin) {
    await page2.goto(`${ON}${p}`);
    await page2.waitForTimeout(1500);
    const hrefs = await page2.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    for (const h of hrefs) {
      if (!h.startsWith("/") || h.startsWith("//")) continue;
      const k = `ON ${h.split("#")[0]}`;
      if (!trouves.has(k)) trouves.set(k, new Set());
      trouves.get(k)!.add(`admin:${p}`);
    }
  }
  const morts: { lien: string; status: number; ou: string[] }[] = [];
  for (const [k, ou] of trouves) {
    const [srv, h] = k.split(" ");
    const r = await page.request.get(`${srv === "ON" ? ON : OFF}${h}`, { maxRedirects: 5 }).catch(() => null);
    const s = r?.status() ?? 0;
    if (s >= 400 || s === 0) morts.push({ lien: k, status: s, ou: [...ou].slice(0, 5) });
  }
  ecrire("liens.jsonl", { projet: info.project.name, total: trouves.size, morts });
});
