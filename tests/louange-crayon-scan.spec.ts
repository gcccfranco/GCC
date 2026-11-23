import { expect, test, type Page } from "@playwright/test";
import { signInAs, type FakeProfile } from "./helpers/fakeSession";
import { attendreCompteur, attendreMiseEnPage, basculerAnnoter, lireCompteur, onStage } from "./helpers/louange";

// Lot CL, CL-2 (docs/spec-corrections-louange.md) : non-régression. Depuis CL-1 un scan 简谱 en mode louange est une page
// entière (une seule fenêtre par page d'écran) : un trait du Crayon donne UN SEUL tracé, là où il est dessiné, et le
// reste après avoir tourné la page et être revenu. Base simulée, compte fictif ; pas de spec d'agencement.

const FILLE: FakeProfile = {
  uid: "uid-clara-essai", email: "clara.essai@example.invalid", firstName: "Clara", lastName: "Essai", planningName: "Clara E.",
  serviceRoles: { "Culte Francophone": ["musicien"] },
};
const SL = "crayon-scan-sl";
const item = (songSlug: string, position: number) => ({
  songSlug, position, keyOverride: null, showChords: true, showPinyin: true, jianpuSheet: songSlug !== "abba-pere",
  useJianpu: false, structureOverride: null, sectionNotes: {}, notes: "",
});
// Le chant suivant donne une « autre page » à tourner pour le chant d'une page.
const SETLIST = (slug: string) => ({
  title: "Culte d'essai", leader: "Clara E.", category: "Culte Francophone", date: "2026-11-15", language: "mixed", notes: "",
  ownerId: FILLE.uid, isPrivate: false, items: [item(slug, 1), item("abba-pere", 2)],
});

type Boite = [number, number, number, number];
type Rect = { left: number; top: number; right: number; bottom: number };

/** Ce que montre l'écran : fenêtres de scan affichées, rectangle et rang de l'image, boîtes (px écran) des tracés de lecture. */
async function lireEcran(page: Page) {
  return page.evaluate(() => {
    const vu = (e: Element) => !e.closest("[aria-hidden=true]");
    const fenetres = [...document.querySelectorAll("[data-performance-mode] [data-jianpu-fenetre]")].filter(vu);
    const pg = [...document.querySelectorAll<HTMLElement>("[data-performance-mode] [data-trait-scan]")].filter(vu)[0];
    const r = pg?.getBoundingClientRect();
    const boites = [...document.querySelectorAll<HTMLElement>("[data-performance-mode] > canvas[data-strokes-boites]")]
      .flatMap((c) => JSON.parse(c.getAttribute("data-strokes-boites")!) as Boite[]);
    return {
      fenetres: fenetres.length,
      rang: pg ? Number(pg.dataset.traitScan) : null,
      image: r ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null,
      boites,
    };
  });
}

/** Les tracés dont le centre tombe sur l'image du scan affiché. */
const surImage = (boites: Boite[], im: Rect) =>
  boites.filter(([x0, y0, x1, y1]) => (x0 + x1) / 2 >= im.left && (x0 + x1) / 2 <= im.right && (y0 + y1) / 2 >= im.top && (y0 + y1) / 2 <= im.bottom);

const CAS = [
  { nom: "恒久恒久以前, une page", slug: "恒久恒久以前", ecran: 1, rang: 0, autre: "ArrowRight" },
  { nom: "一生爱你, une page", slug: "一生爱你", ecran: 1, rang: 0, autre: "ArrowRight" },
  { nom: "为我而来, trait sur la page 2 du scan", slug: "为我而来", ecran: 2, rang: 1, autre: "ArrowLeft" },
] as const;

for (const cas of CAS) {
  test(`Crayon sur un scan en louange : un trait = un tracé, là où il est dessiné (${cas.nom})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => localStorage.setItem("perf-role-preset", "pianiste"));
    await page.route(/docs\.google\.com\/spreadsheets/, (route) => route.fulfill({ status: 200, contentType: "text/csv", body: "" }));
    await signInAs(page, FILLE, { [`setlists/${SL}`]: SETLIST(cas.slug) }, `/setlists/${SL}`);
    await page.getByRole("button", { name: /Mode Louange/ }).click();
    await attendreMiseEnPage(page);
    await expect(onStage(page, "[data-jianpu-fenetre]").first()).toBeAttached({ timeout: 30_000 });

    // Page d'écran du trait (la 2 pour le chant de deux pages), pagination stable.
    if (cas.ecran === 2) await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await lireCompteur(page)).split(" / ")[0], { timeout: 15_000 }).toBe(String(cas.ecran));
    const compteur = await lireCompteur(page);
    await expect.poll(async () => (await lireEcran(page)).rang).toBe(cas.rang);
    // L'image est posée : une page entière, une seule fenêtre.
    await expect.poll(async () => { const e = await lireEcran(page); return e.image ? e.image.right - e.image.left : 0; }).toBeGreaterThan(100);
    expect((await lireEcran(page)).fenetres, "une seule fenêtre par page d'écran").toBe(1);

    // Le trait : en travers de la page, loin des bords (aucun tiers de page à tourner en Crayon, mais restons au milieu).
    const { image } = await lireEcran(page);
    const larg = image!.right - image!.left;
    const haut = image!.bottom - image!.top;
    const dep = { x: image!.left + larg * 0.35, y: image!.top + haut * 0.4 };
    const arr = { x: image!.left + larg * 0.6, y: image!.top + haut * 0.45 };
    await basculerAnnoter(page);
    await page.mouse.move(dep.x, dep.y);
    await page.mouse.down();
    await page.mouse.move((dep.x + arr.x) / 2, (dep.y + arr.y) / 2 + 3, { steps: 6 });
    await page.mouse.move(arr.x, arr.y, { steps: 6 });
    await page.mouse.up();
    await basculerAnnoter(page); // « Terminé » : retour à la lecture, où les traits sont ceux projetés sur l'image

    const verifier = async (message: string) => {
      await expect.poll(async () => { const e = await lireEcran(page); return e.image ? surImage(e.boites, e.image).length : -1; }, { message, timeout: 10_000 }).toBe(1);
      const e = await lireEcran(page);
      expect(e.fenetres, "une seule fenêtre").toBe(1);
      expect(e.boites, "un seul tracé en tout, tous calques confondus").toHaveLength(1);
      expect(e.rang, "page du scan où on a dessiné").toBe(cas.rang);
      expect(await lireCompteur(page), "page d'écran où on a dessiné").toBe(compteur);
      const [x0, y0, x1, y1] = e.boites[0];
      const marge = 6;
      for (const p of [dep, arr]) {
        expect(p.x, "départ/arrivée dans la boîte (x)").toBeGreaterThanOrEqual(x0 - marge);
        expect(p.x).toBeLessThanOrEqual(x1 + marge);
        expect(p.y, "départ/arrivée dans la boîte (y)").toBeGreaterThanOrEqual(y0 - marge);
        expect(p.y).toBeLessThanOrEqual(y1 + marge);
      }
      return e.boites[0];
    };
    const avant = await verifier("après le trait");

    // Tourner la page, puis revenir : un seul tracé, au même endroit.
    const [n, total] = compteur.split(" / ").map(Number);
    const ailleurs = `${cas.autre === "ArrowRight" ? n + 1 : n - 1} / ${total}`;
    const aller = async (touche: string, vers: string) => {
      await expect(async () => {
        if ((await lireCompteur(page)) !== vers) await page.keyboard.press(touche);
        expect(await lireCompteur(page)).toBe(vers);
      }).toPass({ timeout: 15_000 });
    };
    await aller(cas.autre, ailleurs);
    // Sur l'autre page, aucun tracé sur l'image (le chant suivant n'a pas de scan : pas d'image du tout).
    await expect.poll(async () => { const e = await lireEcran(page); return e.image ? surImage(e.boites, e.image).length : 0; }, { message: "l'autre page ne porte pas le trait" }).toBe(0);
    await aller(cas.autre === "ArrowRight" ? "ArrowLeft" : "ArrowRight", compteur);
    const apres = await verifier("après avoir tourné la page et être revenu");
    for (let i = 0; i < 4; i++) expect(Math.abs(apres[i] - avant[i]), "même endroit").toBeLessThanOrEqual(3);
  });
}
