import { expect, test } from "@playwright/test";
import {
  auditKey,
  certifiedSlugs,
  halfStepUp,
  pitchClass,
  loadChords,
  openSheet,
  overlayLabels,
  partialSlugs,
  slugsWithoutOverlay,
  songKey,
} from "./helpers/jianpu";

/** Échantillon testé. `PW_SLUGS="a,b"` pour cibler un chant précis ;
 *  `PW_SLUGS=all` pour passer tous les certifiés (long : un scan par page). */
const chords = loadChords();
const certified = certifiedSlugs();
const asked = process.env.PW_SLUGS?.split(",").map((s) => s.trim());
const tout = process.env.PW_SLUGS === "all";
const picked = asked ? (tout ? certified : asked) : certified.slice(0, 3);

/** Les calques partiels ne passent que le contrôle de réécriture, et
 *  seulement quand on demande tout le corpus ou ces chants-là nommément. */
const partiels = tout
  ? partialSlugs()
  : asked
    ? asked.filter((s) => chords[s]?.complete === false)
    : [];

test.describe("partition 简谱", () => {
  for (const slug of picked) {
    const printed = chords[slug].printedKey;
    const target = auditKey(slug, printed);

    test(`${slug} — le scan s'affiche`, async ({ page }) => {
      const pages = await openSheet(page, slug);
      await expect(pages.first()).toBeVisible();
      await expect(pages.first().locator("img")).toBeVisible();
    });

    test(`${slug} — en ${target}, aucun accord ne reste en ${printed}`, async ({ page }) => {
      await openSheet(page, slug, { key: target });
      const { labels } = await overlayLabels(page);

      // Le calque publie tout ce que `chords.json` porte.
      expect(labels.length).toBe(chords[slug].labels.length);

      // Les étiquettes d'accord vide (`c: ""`) sont des **masques** : elles
      // effacent une rangée de capo ou un doublon sans rien réécrire. Rien à
      // transposer, donc rien à vérifier ici.
      const ecrites = labels.filter((l) => l.printed.trim() !== "");

      // L'oracle de `compare-render.py`, mécanisé : au demi-ton au-dessus,
      // aucun nom d'accord ne se conserve. Une étiquette inchangée est un
      // accord que la transposition n'a pas su réécrire.
      const inchangees = ecrites.filter((l) => l.shown === l.printed);
      expect(
        inchangees.map((l) => l.printed),
        "étiquettes non transposées"
      ).toEqual([]);

      // Une étiquette écrite qui sort vide masque le gravé sans rien mettre
      // à la place : l'accord disparaît de la page. Sauf celles que le
      // **sélecteur de tonalité** masque à dessein : une rangée gravée dans
      // une autre tonalité que la page (positions de capo, second jeu
      // d'accords) n'est montrée que si on la demande.
      expect(
        ecrites.filter((l) => l.shown === "" && l.opt !== "hidden").map((l) => l.printed)
      ).toEqual([]);
    });

    test(`${slug} — aucune étiquette ne déborde de la page`, async ({ page }) => {
      await openSheet(page, slug, { key: target });
      const { image, labels } = await overlayLabels(page);
      expect(image).not.toBeNull();
      // Un accord réécrit est souvent plus large que le gravé : au bord droit
      // de la page il sort de l'image, fond blanc compris.
      const debord = labels.filter(
        (l) => l.left < -2 || l.left + l.width > image!.width + 2 || l.top < -2 || l.top + l.height > image!.height + 2
      );
      expect(debord.map((l) => `${l.printed} (+${Math.round(l.left + l.width - image!.width)} px)`)).toEqual([]);
    });

    test(`${slug} — calque complet, donc pas de bandeau d'avertissement`, async ({ page }) => {
      await openSheet(page, slug, { key: target });
      await expect(page.getByText(/ont été transposés/)).toHaveCount(0);
      await expect(page.getByText(/ne suivent pas la transposition/)).toHaveCount(0);
    });
  }

  // Le même oracle sur les calques **partiels**. Il ne dit rien de ce qui
  // n'est pas encore lu — c'est le rôle de `worklist.py` — mais il attrape la
  // famille de défauts qu'aucun compteur ne voit : une étiquette publiée,
  // encadrée à l'audit, et pourtant rendue **verbatim** parce que
  // `transposeLabel` n'a pas su la réécrire.
  for (const slug of partiels) {
    const printed = chords[slug].printedKey;
    const target = auditKey(slug, printed);

    test(`${slug} (partiel) — aucune étiquette publiée ne reste en ${printed}`, async ({ page }) => {
      await openSheet(page, slug, { key: target });
      const { labels } = await overlayLabels(page);
      expect(labels.length).toBe(chords[slug].labels.length);
      const ecrites = labels.filter((l) => l.printed.trim() !== "");
      expect(
        ecrites.filter((l) => l.shown === l.printed).map((l) => l.printed),
        "étiquettes non transposées"
      ).toEqual([]);
      expect(ecrites.filter((l) => l.shown === "").map((l) => l.printed)).toEqual([]);
    });
  }

  // **Le sélecteur de tonalité.** Une page qui porte deux jeux d'accords
  // (positions de capo empilées, second jeu pour la reprise) les publie tous
  // les deux et masque le second par défaut : l'oracle ci-dessus vérifie
  // qu'il est bien masqué, celui-ci qu'il est bien **écrit** quand on le
  // demande. Sans lui, une donnée `alt` cassée — perdue au gel, mal
  // orthographiée — ne se verrait que sur une capture.
  for (const slug of picked.filter((s) => chords[s]?.labels.some((l) => l.opt && l.c))) {
    const printed = chords[slug].printedKey;
    const target = auditKey(slug, printed);
    const attendus = chords[slug].labels.filter((l) => l.opt && l.c).length;

    test(`${slug} — le sélecteur écrit la seconde tonalité`, async ({ page }) => {
      await openSheet(page, slug, { key: target });
      await page.locator('[data-jianpu-altkey="on"]').click();
      const { labels } = await overlayLabels(page);
      const alternatives = labels.filter((l) => l.opt === "shown");
      expect(alternatives.length).toBe(attendus);

      // Même oracle que pour les accords de la page : au demi-ton au-dessus,
      // aucun nom ne se conserve, et aucune étiquette ne doit sortir vide.
      expect(alternatives.filter((l) => l.shown === "").map((l) => l.printed)).toEqual([]);
      expect(
        alternatives.filter((l) => l.shown === l.printed).map((l) => l.printed),
        "seconde tonalité non transposée"
      ).toEqual([]);

      // `alt` ne doit changer que l'**orthographe** : les deux jeux montent
      // du même intervalle. On compare donc les **hauteurs**, pas les noms —
      // « C# » et « Db » sont la même note, et c'est la tonalité visée qui
      // choisit. La table de `pitchClass` est indépendante du code testé,
      // donc l'attendu ne se calcule pas avec ce qu'il vérifie.
      if (target === halfStepUp(printed)) {
        const fondamentale = (c: string) => c.match(/^\(?([A-G][#b]?)/)?.[1];
        const faux = alternatives.filter((l) => {
          const avant = fondamentale(l.printed);
          const apres = fondamentale(l.shown);
          if (!avant || !apres) return Boolean(avant) !== Boolean(apres);
          return pitchClass(apres) !== (pitchClass(avant) + 1) % 12;
        });
        expect(faux.map((l) => `${l.printed} → ${l.shown}`)).toEqual([]);
      }
    });
  }

  test("un chant sans calque prévient que ses accords ne suivent pas", async ({ page }) => {
    const slug = slugsWithoutOverlay()[0];
    test.skip(!slug, "tous les chants ont un calque");
    const key = halfStepUp(songKey(slug) ?? "C");
    await openSheet(page, slug, { key });
    await expect(page.getByText(/ne suivent pas la transposition/)).toBeVisible();
  });
});
