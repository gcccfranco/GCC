/** Mots chinois d'une ligne de paroles, pour la coupure des vers (lot CV, CV-2, règle R1 : jamais de coupure à
 *  l'intérieur d'un mot de 2 à 4 caractères). Module pur : ZhLine (SongView.tsx) et l'audit
 *  (scripts/coupure-zh-audit.ts) s'en servent tous deux.
 *
 *  Le segmenteur du navigateur (`Intl.Segmenter`, dictionnaire zh-CN) propose les mots ; `EXCEPTIONS_MOTS` corrige
 *  ses erreurs chant par chant. Règle : une exception s'ajoute seulement après avoir regardé la planche d'audit
 *  (`npm run coupure:audit`, scripts/coupure-zh-audit/planche.html), jamais « au pif ». */

/** Par slug de chant.
 *  - `joindre` : suites de caractères à garder ensemble même si le segmenteur les sépare ;
 *  - `separer` : mots que le segmenteur colle à tort (la ligne peut se couper entre leurs caractères).
 *  Exemple : "mon-chant": { joindre: ["耶稣基督"], separer: ["我们"] } */
export const EXCEPTIONS_MOTS: Record<string, { joindre?: string[]; separer?: string[] }> = {
  // Audit du 08/11/2026 : « 使受伤的心得着安抚 » — le segmenteur lit 心得 (« expérience ») et coupe 得着.
  "大手牵着小手": { separer: ["心得"], joindre: ["得着"] },
  // « 没人像你一样爱我 » — le segmenteur lit 人像 (« portrait ») au lieu de 人 | 像你.
  "爱赢了": { separer: ["人像"] },
};

/** Un mot : de `debut` (inclus) à `fin` (exclu), en indices de la chaîne (UTF-16). */
export type MotZh = { debut: number; fin: number };

const MIN_CARACTERES = 2;
const MAX_CARACTERES = 4;
const IDEOGRAMME = /\p{Script=Han}/u;

let segmenteur: Intl.Segmenter | null | undefined;
function segmenteurZh(): Intl.Segmenter | null {
  if (segmenteur === undefined) {
    segmenteur = typeof Intl.Segmenter === "function" ? new Intl.Segmenter("zh-CN", { granularity: "word" }) : null;
  }
  return segmenteur;
}

const nombreDeCaracteres = (s: string) => [...s].filter((c) => IDEOGRAMME.test(c)).length;

/** Les mots de 2 à 4 caractères du texte, exceptions du chant appliquées ; triés, sans chevauchement.
 *  `segmenter: false` simule un navigateur sans `Intl.Segmenter` (un caractère par unité, hors `joindre`). */
export function motsDuTexte(texte: string, slug?: string, segmenter = true): MotZh[] {
  const exceptions = slug ? EXCEPTIONS_MOTS[slug] : undefined;
  const mots: MotZh[] = [];
  const seg = segmenter ? segmenteurZh() : null;
  if (seg) {
    for (const s of seg.segment(texte)) {
      if (!s.isWordLike) continue;
      const n = nombreDeCaracteres(s.segment);
      if (n < MIN_CARACTERES || n > MAX_CARACTERES) continue;
      if (exceptions?.separer?.includes(s.segment)) continue;
      mots.push({ debut: s.index, fin: s.index + s.segment.length });
    }
  }
  for (const suite of exceptions?.joindre ?? []) {
    if (!suite) continue;
    for (let i = texte.indexOf(suite); i >= 0; i = texte.indexOf(suite, i + 1)) mots.push({ debut: i, fin: i + suite.length });
  }
  // Deux mots qui se chevauchent n'en font qu'un.
  mots.sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const fusion: MotZh[] = [];
  for (const m of mots) {
    const dernier = fusion[fusion.length - 1];
    if (dernier && m.debut < dernier.fin) dernier.fin = Math.max(dernier.fin, m.fin);
    else fusion.push({ ...m });
  }
  return fusion;
}
