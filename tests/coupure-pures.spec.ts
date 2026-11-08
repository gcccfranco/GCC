import { expect, test } from "@playwright/test";
import { choisirCoupure, choisirCoupureZh, DEBORD, type OptionsCoupure, type Unite, type UniteZh } from "../src/lib/song/coupure";
import { EXCEPTIONS_MOTS, motsDuTexte } from "../src/lib/song/motsChinois";

// Lot CV, CV-1 (docs/spec-mode-louange-forscore-2.md) : le choix des coupures, sans navigateur.
// Un caractère = 10 px, une espace = 10 px ; em = 16 px.

const mot = (texte: string, queue = false): Unite => {
  const espaceFin = /\s$/.test(texte) ? 10 : 0;
  return { texte, largeur: texte.length * 10, espaceFin, queue };
};
const mots = (phrase: string) => phrase.split(/(?<=\s)/).map((m) => mot(m));
const opts = (largeur: number, plus: Partial<OptionsCoupure> = {}): OptionsCoupure => ({
  largeur, em: 16, debord: DEBORD, debordQueue: 20, resserrer: true, ...plus,
});

test("une rangée quand tout tient", () => {
  const r = choisirCoupure(mots("Ton Nom est grand "), opts(300));
  expect(r).toMatchObject({ coupures: [], interlettrage: 0, etat: "une", relache: [] });
});

test("la marge de 8 px absorbe un petit dépassement", () => {
  // « Ton Nom » : 70 px une fois l'espace final retiré, dans 65 px + 8 px de marge.
  const r = choisirCoupure(mots("Ton Nom "), opts(65));
  expect(r.etat).toBe("marge");
  expect(r.coupures).toEqual([]);
});

test("la queue d'accords déborde jusqu'à debordQueue", () => {
  const unites = [...mots("Ton Nom "), mot("   ", true)];
  // texte 80 px, total 110 px dans 100 px : la queue passe dans la marge de 20 px.
  const r = choisirCoupure(unites, opts(100));
  expect(r.etat).toBe("queue");
  expect(r.coupures).toEqual([]);
  // Au-delà de debordQueue, on coupe, et la queue reste sur la dernière rangée (jamais seule en début de rangée).
  const serre = choisirCoupure([...mots("Ton Nom est grand, "), mot("     ", true)], opts(120, { resserrer: false }));
  expect(serre.etat).toBe("rangees");
  // Calcul à la main (120 px, marge 8, queue 20) : « Ton Nom est grand, » + queue = 190 px ; coupures possibles après
  // « Ton » (reste 140 > 112), « Nom » (dernière rangée 150 > 124 avec la queue), « est » (110 / 60 + queue : tient,
  // mais « grand, » seul = mot seul, toléré en dernier recours).
  expect(serre.coupures).toEqual([2]);
  expect(serre.relache).toEqual(["mot seul"]);
  // Les unités queue (indices 4) suivent la dernière unité de texte (3) : aucune coupure ne les sépare d'elle.
  expect(Math.max(...serre.coupures)).toBeLessThan(3);
});

test("le resserrage ne dépasse pas 0,03 em par caractère", () => {
  // 110 px de texte, 10 caractères hors espaces ; 12 px de trop après la marge : 1,2 px par caractère > 0,48.
  const trop = choisirCoupure(mots("aaaaa bbbbb "), opts(110 - 12 - DEBORD));
  expect(trop.etat).not.toBe("resserre");
  // 4 px de trop : 0,4 px par caractère (≤ 0,48) et ≤ 5 % de la largeur.
  const r = choisirCoupure(mots("aaaaa bbbbb "), opts(110 - DEBORD - 4));
  expect(r.etat).toBe("resserre");
  expect(r.coupures).toEqual([]);
  expect(r.interlettrage).toBeGreaterThan(0.4);
  expect(r.interlettrage).toBeLessThanOrEqual(0.48 * 1.1 + 1e-9);
  // Désactivé : on coupe à la place.
  expect(choisirCoupure(mots("aaaaa bbbbb "), opts(110 - DEBORD - 4, { resserrer: false })).etat).not.toBe("resserre");
});

test("deux rangées, de préférence après une ponctuation", () => {
  const unites = mots("Ton Nom est le plus grand, Ton Nom est tout-puissant, ");
  const r = choisirCoupure(unites, opts(300));
  expect(r.etat).toBe("rangees");
  expect(r.coupures).toEqual([5]);
  expect(r.relache).toEqual([]);
});

test("pas de coupure juste après un mot court (« un »)", () => {
  // Coupure équilibrée possible après « un » (indice 2), mais refusée : on coupe après « grand ».
  const r = choisirCoupure(mots("Il est un nom très grand pour nous "), opts(180));
  expect(r.etat).toBe("rangees");
  const apres = r.coupures[0];
  expect(["Il ", "est ", "un "]).not.toContain(mots("Il est un nom très grand pour nous ")[apres].texte);
  expect(r.relache).not.toContain("mot court");
});

test("jamais une rangée d'un seul mot tant qu'on peut l'éviter", () => {
  const unites = mots("Alléluia Seigneur tout puissant ");
  const r = choisirCoupure(unites, opts(210));
  expect(r.etat).toBe("rangees");
  expect(r.coupures).toEqual([1]);
  expect(r.relache).toEqual([]);
});

test("un mot seul n'est toléré qu'en dernier recours, et signalé", () => {
  // « Alléluia » (80 px) + « magnifique » (110 px) ne tiennent pas ensemble dans 130 px.
  const r = choisirCoupure(mots("Alléluia magnifique "), opts(130));
  expect(r.etat).toBe("rangees");
  expect(r.coupures).toEqual([0]);
  expect(r.relache).toContain("mot seul");
});

test("l'équilibre de 40 % est préféré quand il existe", () => {
  // Rangées possibles : 1+4 mots (déséquilibre) ou 2+3 / 3+2 (équilibrées) ; la plus équilibrée gagne.
  const unites = mots("aaaa bbbb cccc dddd eeee ");
  const r = choisirCoupure(unites, opts(150));
  expect(r.etat).toBe("rangees");
  expect(r.relache).not.toContain("déséquilibre");
  expect(r.coupures).toHaveLength(1);
});

test("le déséquilibre est signalé quand rien d'autre ne tient", () => {
  const unites = mots("aaaaaaaaaaaaaaa bb cc dd ");
  const r = choisirCoupure(unites, opts(180));
  expect(r.etat).toBe("rangees");
  expect(r.relache).toContain("déséquilibre");
});

test("trois rangées quand deux ne tiennent pas, la 2e et la 3e avec un em de moins", () => {
  const phrase = "Ton Nom est le plus grand, Ton Nom est tout-puissant, Ton Nom est saint ";
  const r = choisirCoupure(mots(phrase), opts(300));
  expect(r.etat).toBe("rangees");
  expect(r.coupures).toHaveLength(2);
  expect(r.relache).toContain("plus de deux rangées");
  // Chaque rangée tient (8 px de marge compris, un em de moins en retrait).
  const u = mots(phrase);
  let a = 0;
  [...r.coupures, u.length - 1].forEach((b, i) => {
    const w = u.slice(a, b + 1).reduce((s, x) => s + x.largeur, 0) - u[b].espaceFin;
    expect(w).toBeLessThanOrEqual((i ? 300 - 16 : 300) + DEBORD + 0.5);
    a = b + 1;
  });
});

test("« deborde » quand un mot est plus large que tout", () => {
  const r = choisirCoupure([mot("Supercalifragilisticexpialidocious")], opts(100));
  expect(r.etat).toBe("deborde");
  expect(r.coupures).toEqual([]);
});

// ---------------------------------------------------------------------------
// Chinois (CV-2) : un caractère = 20 px, ponctuation comprise ; em = 16 px.
// ---------------------------------------------------------------------------

const zh = (...unites: string[]): UniteZh[] =>
  unites.map((u) => ({ largeur: [...u].length * 20, caracteres: [...u].length, ponctue: /[，。；：！？、,;:!?]$/.test(u) }));
const optsZh = (largeur: number) => ({ largeur, em: 16, debord: DEBORD });
/** Nombre de caractères de chaque rangée choisie. */
const tailles = (unites: UniteZh[], coupures: number[]) => {
  const out: number[] = [];
  let a = 0;
  for (const b of [...coupures, unites.length - 1]) {
    out.push(unites.slice(a, b + 1).reduce((s, u) => s + u.caracteres, 0));
    a = b + 1;
  }
  return out;
};

test("chinois : une rangée quand tout tient", () => {
  expect(choisirCoupureZh(zh("亲", "爱", "的", "宝", "贵"), optsZh(200))).toEqual({ coupures: [], etat: "une", relache: [] });
});

test("chinois : la marge de 8 px absorbe un petit dépassement", () => {
  // 100 px dans 95 px + 8 px de marge.
  const r = choisirCoupureZh(zh("亲", "爱", "的", "宝", "贵"), optsZh(95));
  expect(r).toEqual({ coupures: [], etat: "marge", relache: [] });
});

test("chinois : deux rangées, coupées après la ponctuation", () => {
  const u = zh("亲", "爱", "的", "宝", "贵", "耶", "稣，", "你", "爱", "何", "等", "的", "甘", "甜，");
  const r = choisirCoupureZh(u, optsZh(170));
  expect(r.etat).toBe("rangees");
  expect(r.coupures).toEqual([6]);
  expect(r.relache).toEqual([]);
});

test("chinois : jamais une rangée de moins de trois caractères tant qu'on peut l'éviter", () => {
  // 7 caractères (140 px) dans 100 px : (5, 2) tiendrait aussi, mais la rangée de 2 est refusée.
  const u = zh("甲", "乙", "丙", "丁", "戊", "己", "庚");
  const r = choisirCoupureZh(u, optsZh(100));
  expect(r.etat).toBe("rangees");
  expect(r.relache).toEqual([]);
  expect(Math.min(...tailles(u, r.coupures))).toBeGreaterThanOrEqual(3);
});

test("chinois : une rangée courte n'est tolérée qu'en dernier recours, et signalée", () => {
  // 5 caractères dans 70 px (3 + 2 ou 2 + 3 seulement) : aucune répartition à 3 caractères minimum.
  const r = choisirCoupureZh(zh("甲", "乙", "丙", "丁", "戊"), optsZh(70));
  expect(r.etat).toBe("rangees");
  expect(r.relache).toEqual(["rangée courte"]);
});

test("chinois : trois rangées quand deux ne tiennent pas, la 2e et la 3e avec un em de moins", () => {
  const u = zh(...Array.from({ length: 12 }, (_, i) => String.fromCharCode(0x4e00 + i)));
  const r = choisirCoupureZh(u, optsZh(100));
  expect(r.etat).toBe("rangees");
  expect(r.coupures).toHaveLength(2);
  expect(r.relache).toContain("plus de deux rangées");
  tailles(u, r.coupures).forEach((n, i) => {
    expect(n * 20).toBeLessThanOrEqual((i ? 100 - 16 : 100) + DEBORD + 0.5);
    expect(n).toBeGreaterThanOrEqual(3);
  });
});

test("chinois : « deborde » quand une unité est plus large que tout", () => {
  expect(choisirCoupureZh(zh("甲乙丙丁戊己庚辛壬癸"), optsZh(100)).etat).toBe("deborde");
});

test("chinois : plus de 60 unités, repli glouton sans plantage", () => {
  const u = zh(...Array.from({ length: 70 }, () => "字"));
  const r = choisirCoupureZh(u, optsZh(300));
  expect(r.etat).toBe("rangees");
  expect(r.relache).toEqual(["repli glouton"]);
});

const VERS = "亲爱的宝贵耶稣，你爱何等的甘甜，";

test("segmentation : aucun des mots 亲爱, 宝贵, 耶稣, 何等, 甘甜 n'est coupé", () => {
  const mots = motsDuTexte(VERS);
  for (const mot of ["亲爱", "宝贵", "耶稣", "何等", "甘甜"]) {
    const i = VERS.indexOf(mot);
    expect(mots.some((m) => m.debut <= i && m.fin >= i + mot.length), mot).toBe(true);
  }
  // Aucune unité ne franchit la ponctuation.
  for (const m of mots) expect(VERS.slice(m.debut, m.fin)).not.toMatch(/，/);
});

test("segmentation : sans Intl.Segmenter, un caractère par unité ; les exceptions « joindre » restent appliquées", () => {
  expect(motsDuTexte(VERS, undefined, false)).toEqual([]);
  EXCEPTIONS_MOTS["chant-d-essai"] = { joindre: ["宝贵耶稣"] };
  try {
    expect(motsDuTexte(VERS, "chant-d-essai", false)).toEqual([{ debut: 3, fin: 7 }]);
    expect(motsDuTexte(VERS, undefined, false)).toEqual([]);
  } finally {
    delete EXCEPTIONS_MOTS["chant-d-essai"];
  }
});

test("segmentation : les exceptions « separer » libèrent un mot, « joindre » en colle deux", () => {
  EXCEPTIONS_MOTS["chant-d-essai"] = { separer: ["亲爱"], joindre: ["的宝"] };
  try {
    const mots = motsDuTexte(VERS, "chant-d-essai");
    // 亲爱 n'est plus un mot ; 的宝 (indices 2 à 4) en est un, et recouvre le début de 宝贵.
    expect(mots.some((m) => m.debut === 0 && m.fin === 2)).toBe(false);
    expect(mots.some((m) => m.debut <= 2 && m.fin >= 4)).toBe(true);
  } finally {
    delete EXCEPTIONS_MOTS["chant-d-essai"];
  }
});
