import { test } from "@playwright/test";
import { ecouter, ecrire, isoler, SONGS } from "./lib";

// Les 382 chants, sur téléphone (la disposition la plus étroite) et tablette paysage.
// Pour chacun : la page s'affiche sans erreur, ne déborde pas, porte des accords ;
// puis +1 demi-ton (les accords changent, leur nombre non), puis 11 « + » de plus
// (= +12 : on doit retomber sur les accords d'origine, à l'enharmonie près).
const LOTS = 8;
const enharm: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb", "Cb": "B", "Fb": "E", "E#": "F", "B#": "C" };
const norm = (c: string) => c.replace(/^([A-G][#b]?)/, (m) => enharm[m] ?? m).replace(/\/([A-G][#b]?)/, (_, m) => "/" + (enharm[m] ?? m));

for (let lot = 0; lot < LOTS; lot++) {
  test(`chants lot ${lot + 1}/${LOTS}`, async ({ page }, info) => {
    if (!["telephone", "tablette-paysage"].includes(info.project.name)) test.skip();
    test.setTimeout(30 * 60_000);
    await isoler(page);
    const songs = SONGS.filter((_, i) => i % LOTS === lot);
    for (const s of songs) {
      const j = ecouter(page);
      const t0 = Date.now();
      let r: Record<string, unknown> = {};
      try {
        await page.goto(`/songs/${encodeURIComponent(s.slug)}/`, { waitUntil: "load" });
        await page.locator("h1").last().waitFor({ timeout: 15_000 });
        // Les scans 简谱 pèsent 100 à 300 Ko : attendre le réseau, sinon un scan pas encore chargé passe pour cassé.
        await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(300);
        const lire = () => page.evaluate(() => ({
          accords: Array.from(document.querySelectorAll("[aria-label^=\"Voir comment jouer\"]")).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => (e.textContent || "").trim()),
          vw: document.documentElement.clientWidth, sw: document.scrollingElement!.scrollWidth,
          cle: document.querySelector("[data-testid=tonalite-courante]")?.firstChild?.textContent?.trim() ?? null,
          scans: Array.from(document.querySelectorAll("img")).filter((i) => /jianpu/.test(i.src)).map((i) => ({ src: i.src.split("/").pop(), ok: i.complete && i.naturalWidth > 0 })),
          plantage: /Application error|could not be found/i.test(document.body.innerText),
          texte: document.body.innerText.length,
        }));
        const a = await lire();
        const pilule = page.getByTestId("pilule-tonalite");
        const plus = pilule.getByRole("button").last();
        let b = a, c = a;
        if (await plus.isVisible().catch(() => false)) {
          await plus.click();
          await page.waitForTimeout(150);
          b = await lire();
          for (let k = 0; k < 11; k++) await plus.click();
          await page.waitForTimeout(200);
          c = await lire();
        }
        // Le sélecteur de tonalité (liste native) : on choisit l'option deux crans plus loin, depuis l'état d'origine.
        let sel: { cle: string | null; accords: string[]; choisie: string | null } = { cle: null, accords: [], choisie: null };
        const liste = pilule.locator("select");
        if (await liste.count()) {
          await page.reload({ waitUntil: "load" });
          await page.locator("h1").last().waitFor({ timeout: 15_000 });
          await page.waitForTimeout(300);
          const opts = await liste.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
          const cur = await liste.inputValue();
          const choisie = opts[(Math.max(0, opts.indexOf(cur)) + 2) % opts.length] ?? null;
          if (choisie) {
            await liste.selectOption(choisie);
            await page.waitForTimeout(250);
            const l = await lire();
            sel = { cle: l.cle, accords: l.accords, choisie };
          }
        }
        const diff12 = a.accords.map((x, i) => [x, c.accords[i]]).filter(([x, y]) => norm(x) !== norm(y ?? ""));
        r = {
          cle0: a.cle, cle1: b.cle, cle12: c.cle, nbAccords: a.accords.length, nbAccords1: b.accords.length, nbAccords12: c.accords.length,
          inchangeApresPlus1: a.accords.length > 0 && a.accords.join("|") === b.accords.join("|"),
          selChoisie: sel.choisie, selCle: sel.cle, selSansEffet: a.accords.length > 0 && sel.choisie !== null && sel.accords.join("|") === a.accords.join("|"),
          accords0: a.accords.slice(0, 6), accords1: b.accords.slice(0, 6), accordsSel: sel.accords.slice(0, 6),
          diesesEnDo: (sel.cle === "C" ? sel.accords : []).filter((x) => /^[A-G]#|\/[A-G]#/.test(x)).slice(0, 4),
          diff12: diff12.slice(0, 6), nbDiff12: diff12.length,
          deborde: a.sw > a.vw + 1, deborde1: b.sw > b.vw + 1, sw: a.sw, vw: a.vw,
          scans: a.scans, scanCasse: a.scans.some((x) => !x.ok), plantage: a.plantage, texte: a.texte,
        };
      } catch (e) {
        r = { exception: String(e).slice(0, 300) };
      }
      ecrire("chants.jsonl", { slug: s.slug, langue: s.language, hasJianpu: s.hasJianpu, cleIndex: s.originalKey, recommandee: s.recommendedKey, projet: info.project.name, ms: Date.now() - t0, ...r, pageerrors: j.pageerrors, consoleErr: j.console.filter((x) => x.startsWith("error") && !/404 \(Not Found\)/.test(x)), http: j.http });
      page.removeAllListeners("console"); page.removeAllListeners("pageerror"); page.removeAllListeners("requestfailed"); page.removeAllListeners("response");
    }
  });
}
