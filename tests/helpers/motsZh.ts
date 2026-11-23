import type { Page } from "@playwright/test";
import { EXCEPTIONS_MOTS } from "../../src/lib/song/motsChinois";

/** Mots chinois de 2 à 4 caractères (segmenteur du navigateur, exceptions du chant) dont les caractères ne sont pas
 *  tous sur la même rangée : lot CV, R1. Lignes chinoises coupées (`[data-rangee]`) de la page ouverte seulement. */
export function motsChinoisCoupes(page: Page, slug: string): Promise<string[]> {
  return page.evaluate((exceptions) => {
    const out: string[] = [];
    const seg = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh-CN", { granularity: "word" }) : null;
    const lignes = Array.from(document.querySelectorAll<HTMLElement>("main [data-copy-line][data-coupe].items-start"));
    for (const ligne of lignes) {
      // Chaque caractère de paroles, avec le numéro de sa rangée ; les accords seuls et les blancs n'en sont pas.
      const lettres: { car: string; rangee: number }[] = [];
      ligne.querySelectorAll("[data-rangee]").forEach((r, ri) => {
        r.querySelectorAll("[data-car]").forEach((c) => {
          const car = c.textContent ?? "";
          if (car.trim()) lettres.push({ car, rangee: ri });
        });
      });
      const texte = lettres.map((l) => l.car).join("");
      // Indices UTF-16 -> indice de lettre.
      const versLettre: number[] = [];
      lettres.forEach((l, i) => { for (let k = 0; k < l.car.length; k++) versLettre.push(i); });
      const verifier = (debut: number, fin: number) => {
        const premiere = versLettre[debut], derniere = versLettre[fin - 1];
        if (new Set(lettres.slice(premiere, derniere + 1).map((l) => l.rangee)).size > 1) out.push(texte.slice(debut, fin));
      };
      if (seg) {
        for (const s of seg.segment(texte)) {
          const n = Array.from(s.segment).filter((c) => /\p{Script=Han}/u.test(c)).length;
          if (!s.isWordLike || n < 2 || n > 4 || exceptions.separer?.includes(s.segment)) continue;
          verifier(s.index, s.index + s.segment.length);
        }
      }
      for (const suite of exceptions.joindre ?? []) {
        for (let i = texte.indexOf(suite); i >= 0; i = texte.indexOf(suite, i + 1)) verifier(i, i + suite.length);
      }
    }
    return out;
  }, EXCEPTIONS_MOTS[slug] ?? {});
}
