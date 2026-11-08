import { expect, test, type Page } from "@playwright/test";
import { motsChinoisCoupes } from "./helpers/motsZh";

// Lot CV, CV-1 (docs/spec-mode-louange-forscore-2.md) : la coupure des vers français dans le navigateur.
// Chant : « À jamais Tu es saint » en tonalité A. Téléphone : 390 puis 412 px de large ; autres projets : la vue telle quelle.
// Captures clair et sombre dans test-results/coupure/.

const URL_CHANT = "/songs/a-jamais-tu-es-saint?key=%22A%22";
const DOSSIER = "test-results/coupure";

async function ouvrir(page: Page, sombre: boolean, url = URL_CHANT) {
  await page.emulateMedia({ colorScheme: sombre ? "dark" : "light" });
  await page.addInitScript((s) => {
    try {
      localStorage.setItem("theme", s ? "dark" : "light");
      localStorage.setItem("accords-aide-vue", "1"); // pas de bulle « Touche un accord… » sur les captures
    } catch {}
  }, sombre);
  await page.goto(url);
  await page.locator("main.song-zoom [data-copy-line]").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  // Avant l'hydratation, rien n'est mesuré : on attend que React tienne la page.
  await page.waitForFunction(() => {
    const b = document.querySelector("[data-testid='barre-outils'] button[aria-label='Accords']");
    return !!b && Object.keys(b).some((k) => k.startsWith("__reactProps"));
  });
  // Les coupures se posent après la mesure : on attend qu'elles ne bougent plus.
  await expect
    .poll(async () => {
      const a = await page.locator("[data-copy-line][data-coupe]").evaluateAll((ls) => ls.map((l) => `${l.getAttribute("data-coupe")}/${l.querySelectorAll("[data-rangee]").length}`).join());
      await page.waitForTimeout(150);
      const b = await page.locator("[data-copy-line][data-coupe]").evaluateAll((ls) => ls.map((l) => `${l.getAttribute("data-coupe")}/${l.querySelectorAll("[data-rangee]").length}`).join());
      return a === b;
    })
    .toBe(true);
}

/** Pour chaque ligne coupée : rangées d'un seul mot, bandes d'accords vides. */
function anomalies(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const ligne of Array.from(document.querySelectorAll<HTMLElement>("main.song-zoom [data-copy-line][data-coupe]"))) {
      const rangees = Array.from(ligne.querySelectorAll<HTMLElement>("[data-rangee]"));
      const nom = (ligne.textContent ?? "").slice(0, 40);
      if (rangees.length > 1) {
        for (const r of rangees) {
          const mots = Array.from(r.children).filter((m) => (m.textContent ?? "").trim() && !m.querySelector("[data-paroles]:empty"));
          const avecParoles = mots.filter((m) => Array.from(m.querySelectorAll("[data-paroles]")).some((p) => (p.textContent ?? "").trim()));
          if (avecParoles.length < 2 && !/mot seul/.test(ligne.getAttribute("data-coupe") ?? "")) out.push(`rangée d'un seul mot : ${nom}`);
        }
      }
      for (const r of rangees) {
        const accords = r.querySelectorAll(".font-chord").length;
        const bandes = Array.from(r.querySelectorAll<HTMLElement>("span.flex-col > span[data-copy-ignore]")).filter((b) => !b.classList.contains("font-chord"));
        if (!accords && bandes.length) out.push(`bande d'accords vide : ${nom}`);
      }
    }
    return out;
  });
}

const debordement = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

/** La ligne « Ton Nom est le plus grand, Ton Nom est tout-puissant, » : texte de chaque rangée, accord au-dessus de « Nom ». */
async function ligneTonNom(page: Page) {
  const ligne = page.locator("main.song-zoom [data-copy-line]").filter({ hasText: "tout-puissant" }).first();
  const rangees = await ligne.evaluate((l) => {
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    return Array.from(l.querySelectorAll<HTMLElement>("[data-rangee]")).map((r) => ({
      texte: norm(Array.from(r.querySelectorAll("[data-paroles]")).map((p) => p.textContent ?? "").join("")),
    }));
  });
  return { ligne, rangees };
}

/** Chaque accord est centré dans les bornes horizontales de son segment (colonne). */
function accordsSurSyllabe(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const colonne of Array.from(document.querySelectorAll<HTMLElement>("main.song-zoom [data-copy-line][data-coupe] span.flex-col"))) {
      const accord = colonne.querySelector<HTMLElement>(".font-chord");
      if (!accord) continue;
      const rc = colonne.getBoundingClientRect();
      const plage = document.createRange();
      plage.selectNodeContents(accord);
      const ra = plage.getBoundingClientRect();
      const centre = (ra.left + ra.right) / 2;
      if (centre < rc.left - 0.5 || centre > rc.right + 0.5) out.push(`« ${accord.textContent} » hors de son segment`);
    }
    return out;
  });
}

const LARGEURS = [390, 412];

/** Capture propre : aucune sélection, page entière. */
async function capture(page: Page, path: string) {
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.screenshot({ path, fullPage: true });
}

for (const sombre of [false, true]) {
  const theme = sombre ? "sombre" : "clair";

  test(`téléphone 390 et 412 px — vers coupés, accords sur leur syllabe, aucun débordement (${theme})`, async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "largeurs propres au téléphone");
    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: 844 });
      await ouvrir(page, sombre);
      expect(await anomalies(page)).toEqual([]);
      expect(await debordement(page)).toBe(true);
      expect(await accordsSurSyllabe(page)).toEqual([]);

      const { ligne, rangees } = await ligneTonNom(page);
      const etat = (await ligne.getAttribute("data-coupe")) ?? "";
      if (largeur === 390) {
        expect(etat).toMatch(/^rangees/);
        expect(rangees.map((r) => r.texte)).toEqual(["Ton Nom est le plus grand,", "Ton Nom est tout-puissant,"]);
      } else {
        // 412 px : le vers tient dans les 8 px de débordement permis (R4) : une seule rangée, état « marge ».
        expect(etat).toMatch(/^marge/);
        expect(rangees.map((r) => r.texte)).toEqual(["Ton Nom est le plus grand, Ton Nom est tout-puissant,"]);
        const droite = await ligne.evaluate((l) => Math.max(...Array.from(l.querySelectorAll("[data-paroles]")).map((p) => {
          const r = document.createRange();
          r.selectNodeContents(p);
          return r.getBoundingClientRect().right;
        })));
        expect(droite).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth) - 4);
      }
      // Tonalité A : l'accord de « Nom » (G# en C#) est posé sur « Nom » de la 2e rangée, à l'intérieur de son segment.
      const sur = await ligne.evaluate((l) => {
        const rangees = l.querySelectorAll<HTMLElement>("[data-rangee]");
        const rangee2 = rangees[rangees.length - 1];
        const colonne = Array.from(rangee2.querySelectorAll<HTMLElement>("span.flex-col")).find((c) => c.querySelector("[data-paroles]")?.textContent?.includes("Nom") && c.querySelector(".font-chord"));
        const accord = colonne?.querySelector<HTMLElement>(".font-chord");
        if (!colonne || !accord) return null;
        const rc = colonne.getBoundingClientRect();
        const ra = accord.getBoundingClientRect();
        const centre = (ra.left + ra.right) / 2;
        return { accord: accord.textContent, dedans: centre >= rc.left - 0.5 && centre <= rc.right + 0.5, audessus: ra.bottom <= colonne.querySelector("[data-paroles]")!.getBoundingClientRect().top + 2 };
      });
      expect(sur, "un accord sur « Nom »").not.toBeNull();
      expect(sur!.dedans && sur!.audessus).toBe(true);
      await capture(page, `${DOSSIER}/${largeur}-${theme}.png`);
      // Copie : une seule ligne, sans retrait.
      const copie = await ligne.evaluate(async (l) => {
        const sel = window.getSelection()!;
        const r = document.createRange();
        r.selectNodeContents(l);
        sel.removeAllRanges();
        sel.addRange(r);
        let texte = "";
        const ev = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
        Object.defineProperty(ev, "clipboardData", { value: { setData: (_: string, v: string) => { texte = v; } } });
        document.dispatchEvent(ev);
        return texte;
      });
      expect(copie).toBe("Ton Nom est le plus grand, Ton Nom est tout-puissant,");
    }
  });

  test(`vue telle quelle — aucune rangée d'un seul mot, aucune bande vide, pas de débordement (${theme})`, async ({ page }, info) => {
    await ouvrir(page, sombre);
    expect(await anomalies(page)).toEqual([]);
    expect(await debordement(page)).toBe(true);
    expect(await accordsSurSyllabe(page)).toEqual([]);
    await capture(page, `${DOSSIER}/${info.project.name}-${theme}.png`);
  });
}

// ---------------------------------------------------------------------------
// CV-2 : la coupure des vers chinois. Chant : 一生爱你 (couplet, première ligne). Même protocole que ci-dessus.
// ---------------------------------------------------------------------------

const SLUG_ZH = "一生爱你";
const URL_ZH = `/songs/${encodeURIComponent(SLUG_ZH)}`;
const LIGNE_ZH = "main.song-zoom [data-copy-line][data-coupe][data-copy-pinyin^='qīn ài de bǎo guì']";

async function ouvrirZh(page: Page, sombre: boolean) {
  // Un chant à scan s'ouvre sur son scan : on mesure ici ses paroles.
  await page.addInitScript(() => localStorage.setItem("jianpu-sheet-pref", "never"));
  await ouvrir(page, sombre, URL_ZH);
}

/** Pour chaque ligne chinoise coupée : rangées de moins de trois caractères, bandes d'accords vides. */
function anomaliesZh(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const ligne of Array.from(document.querySelectorAll<HTMLElement>("main.song-zoom [data-copy-line][data-coupe].items-start"))) {
      const rangees = Array.from(ligne.querySelectorAll<HTMLElement>("[data-rangee]"));
      const nom = (ligne.querySelector("[data-car]")?.textContent ?? "") + " " + (ligne.textContent ?? "").slice(0, 20);
      if (rangees.length > 1 && !/rangée courte/.test(ligne.getAttribute("data-coupe") ?? "")) {
        for (const r of rangees) {
          const n = Array.from(r.querySelectorAll("[data-car]")).filter((c) => (c.textContent ?? "").trim()).length;
          if (n < 3) out.push(`rangée de ${n} caractère(s) : ${nom}`);
        }
      }
      for (const r of rangees) {
        const bandes = Array.from(r.querySelectorAll<HTMLElement>("[data-accord]"));
        if (bandes.length && !bandes.some((b) => getComputedStyle(b).visibility === "visible")) out.push(`bande d'accords vide : ${nom}`);
      }
    }
    return out;
  });
}

/** Chaque accord est centré sur son caractère et au-dessus ; chaque pinyin, centré dessous (± 2 px). */
function colonnesAlignees(page: Page) {
  return page.evaluate((sel) => {
    const out: string[] = [];
    const ligne = document.querySelector(sel);
    if (!ligne) return ["ligne introuvable"];
    const boite = (el: Element) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect();
    };
    let accords = 0;
    for (const colonne of Array.from(ligne.querySelectorAll<HTMLElement>("span[style*='column']"))) {
      const car = colonne.querySelector("[data-car]");
      if (!car || !(car.textContent ?? "").trim()) continue;
      const c = boite(car);
      const centre = (c.left + c.right) / 2;
      const accord = colonne.querySelector<HTMLElement>("[data-accord]");
      if (accord && getComputedStyle(accord).visibility === "visible") {
        accords++;
        const a = boite(accord);
        if (Math.abs((a.left + a.right) / 2 - centre) > 2) out.push(`accord « ${accord.textContent} » décalé de « ${car.textContent} »`);
        if (a.bottom > c.top + 1) out.push(`accord « ${accord.textContent} » pas au-dessus de « ${car.textContent} »`);
      }
      const py = Array.from(colonne.children).find((e) => e !== accord && e !== car && (e.textContent ?? "").trim());
      if (py) {
        const p = boite(py);
        if (Math.abs((p.left + p.right) / 2 - centre) > 2) out.push(`pinyin « ${py.textContent} » décalé de « ${car.textContent} »`);
        if (py.getBoundingClientRect().top < car.getBoundingClientRect().bottom - 1) out.push(`pinyin « ${py.textContent} » pas sous « ${car.textContent} »`);
      }
    }
    if (!accords) out.push("aucun accord relevé");
    return out;
  }, LIGNE_ZH);
}

for (const sombre of [false, true]) {
  const theme = sombre ? "sombre" : "clair";

  test(`一生爱你, téléphone 390 et 412 px — vers chinois coupés, colonnes alignées, aucun débordement (${theme})`, async ({ page }, info) => {
    test.skip(info.project.name !== "telephone", "largeurs propres au téléphone");
    for (const largeur of LARGEURS) {
      await page.setViewportSize({ width: largeur, height: 844 });
      await ouvrirZh(page, sombre);
      expect(await anomaliesZh(page)).toEqual([]);
      expect(await motsChinoisCoupes(page, SLUG_ZH)).toEqual([]);
      expect(await debordement(page)).toBe(true);
      expect(await colonnesAlignees(page)).toEqual([]);

      const ligne = page.locator(LIGNE_ZH);
      const rangees = await ligne.evaluate((l) =>
        Array.from(l.querySelectorAll("[data-rangee]")).map((r) => Array.from(r.querySelectorAll("[data-car]")).map((c) => c.textContent ?? "").join("").trim()),
      );
      expect(rangees).toEqual(["亲爱的宝贵耶稣，", "你爱何等的甘甜，"]);
      expect(await ligne.getAttribute("data-coupe")).toMatch(/^rangees/);
      await capture(page, `${DOSSIER}/zh-${largeur}-${theme}.png`);
      // Copie : une seule ligne de paroles, sans retrait ni retour à la ligne entre les rangées.
      const copie = await ligne.evaluate(async (l) => {
        const sel = window.getSelection()!;
        const r = document.createRange();
        r.selectNodeContents(l);
        sel.removeAllRanges();
        sel.addRange(r);
        let texte = "";
        const ev = new Event("copy", { bubbles: true, cancelable: true }) as ClipboardEvent;
        Object.defineProperty(ev, "clipboardData", { value: { setData: (_: string, v: string) => { texte = v; } } });
        document.dispatchEvent(ev);
        return texte;
      });
      // Les paroles sur une ligne, le pinyin (data-copy-pinyin) sur la suivante : pas de retour entre les rangées.
      expect(copie.split("\n").map((x) => x.trim()).filter(Boolean)).toEqual(["亲爱的宝贵耶稣，你爱何等的甘甜，", "qīn ài de bǎo guì yē sū nǐ ài hé děng de gān tián"]);
    }
  });

  test(`一生爱你, vue telle quelle — aucune rangée courte, aucun mot coupé, pas de débordement (${theme})`, async ({ page }, info) => {
    await ouvrirZh(page, sombre);
    expect(await anomaliesZh(page)).toEqual([]);
    expect(await motsChinoisCoupes(page, SLUG_ZH)).toEqual([]);
    expect(await debordement(page)).toBe(true);
    expect(await colonnesAlignees(page)).toEqual([]);
    await capture(page, `${DOSSIER}/zh-${info.project.name}-${theme}.png`);
  });
}
