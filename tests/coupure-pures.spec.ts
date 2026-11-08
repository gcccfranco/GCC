import { expect, test } from "@playwright/test";
import { choisirCoupure, DEBORD, type OptionsCoupure, type Unite } from "../src/lib/song/coupure";

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
