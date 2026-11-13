import { test } from "@playwright/test";
import { OFF, ON, connecter, ecouter, ecrire, isoler } from "./lib";

// « Singe » : sur chaque page, toucher un à un tous les boutons visibles, Échap,
// revenir si on a changé de page. Base simulée : aucune écriture ne part.
const PAGES: { qui: "visiteur" | "membre" | "admin"; path: string }[] = [
  { qui: "visiteur", path: "/songs/" },
  { qui: "visiteur", path: "/songs/abba-pere/" },
  { qui: "visiteur", path: "/songs/一生爱你/" },
  { qui: "visiteur", path: "/accords/" },
  { qui: "visiteur", path: "/harmonie/" },
  { qui: "membre", path: "/setlists/setlist-audit/" },
  { qui: "membre", path: "/setlists/setlist-audit/edit/" },
  { qui: "membre", path: "/planning/" },
  { qui: "membre", path: "/moi/" },
  { qui: "membre", path: "/mes-services/" },
  { qui: "admin", path: "/back-office/" },
  { qui: "admin", path: "/back-office/evenements/nouveau/" },
];
const EVITER = /déconnex|déconnecter|se déconnecter|log ?out|退出|supprimer définitivement/i;

for (const p of PAGES) {
  test.describe(() => {
  // L'admin vit sur le serveur du back-office (3301) : la connexion simulée suit la baseURL.
  test.use({ baseURL: p.qui === "admin" ? ON : OFF });
  test(`singe ${p.qui} ${p.path}`, async ({ page }, info) => {
    if (!["telephone", "ordinateur"].includes(info.project.name)) test.skip();
    test.setTimeout(12 * 60_000);
    const base = p.qui === "admin" ? ON : OFF;
    await isoler(page);
    const j = ecouter(page);
    if (p.qui === "visiteur") await page.goto(`${base}${p.path}`);
    else await connecter(page, p.qui, p.path).catch(async () => { await page.goto(`${base}${p.path}`); });
    await page.waitForTimeout(1500);
    const depart = page.url();
    const vus = new Set<string>();
    const journal: { bouton: string; erreurs: string[]; navigue?: string }[] = [];
    for (let tour = 0; tour < 60; tour++) {
      const cibles = await page.locator("button:visible, [role=button]:visible, [role=tab]:visible, [role=switch]:visible").evaluateAll((els) =>
        els.map((e, i) => ({ i, nom: ((e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 50)) || `#${i}` })));
      const prochaine = cibles.find((c) => !vus.has(c.nom) && !/déconnex|déconnecter|log ?out|退出|supprimer définitivement/i.test(c.nom));
      if (!prochaine) break;
      vus.add(prochaine.nom);
      const avant = j.pageerrors.length;
      await page.locator("button:visible, [role=button]:visible, [role=tab]:visible, [role=switch]:visible").nth(prochaine.i).click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(350);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(150);
      const entree: { bouton: string; erreurs: string[]; navigue?: string } = { bouton: prochaine.nom, erreurs: j.pageerrors.slice(avant) };
      if (page.url() !== depart) {
        entree.navigue = page.url();
        await page.goto(depart).catch(() => {});
        await page.waitForTimeout(1200);
      }
      journal.push(entree);
    }
    const plantage = await page.evaluate(() => /Application error: a client-side exception/i.test(document.body.innerText));
    ecrire("singe.jsonl", { projet: info.project.name, qui: p.qui, page: p.path, nbBoutons: journal.length, plantage, avecErreur: journal.filter((x) => x.erreurs.length), navigations: journal.filter((x) => x.navigue).map((x) => `${x.bouton} → ${x.navigue}`), pageerrors: j.pageerrors.slice(0, 20), ecritures: undefined });
    void EVITER;
  });
  });
}
