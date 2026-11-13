import { expect, test } from "@playwright/test";
import { accordsDeLEtiquette, analyserAccord } from "../src/lib/accords/analyse";
import { positionsGuitare } from "../src/lib/accords/guitare";
import { notesDeLAccord, voicingPiano } from "../src/lib/accords/notes";

// Lot DA / DA-1 (docs/spec-dictionnaire-accords.md) : lire une étiquette, en tirer les notes, le piano à deux
// mains et les doigtés de guitare de la table écrite à la main. Tout est pur : aucune page.

const accord = (e: string) => {
  const a = analyserAccord(e);
  if (!a) throw new Error(`accord refusé : ${e}`);
  return a;
};
const cases = (e: string, i = 0) =>
  positionsGuitare(accord(e)).doigtes[i].cases.map((c) => (c === null ? "x" : String(c))).join(",");

test("analyserAccord : fondamentale, qualité canonique, basse", () => {
  expect(accord("F#m7b5/C")).toMatchObject({ fondamentale: "F#", qualite: "m7b5", basse: "C", equivalent: null });
  expect(accord("(D/F#)")).toMatchObject({ texte: "D/F#", fondamentale: "D", qualite: "", basse: "F#" });
  expect(accord("[(A)]")).toMatchObject({ texte: "A", qualite: "" });
  expect(accord("Am(maj7)")).toMatchObject({ qualite: "m(maj7)", ecrite: "m(maj7)" });
  expect(accord("Bsus7")).toMatchObject({ qualite: "7sus4", equivalent: "B7sus4" });
});

test("D2 = Dsus2, D4 = Dsus4, C3 = C, D5 reste un accord de puissance", () => {
  expect(accord("Bb2")).toMatchObject({ fondamentale: "Bb", ecrite: "2", qualite: "sus2", equivalent: "Bbsus2" });
  expect(accord("D2").equivalent).toBe("Dsus2");
  expect(accord("D4")).toMatchObject({ qualite: "sus4", equivalent: "Dsus4" });
  expect(accord("D5")).toMatchObject({ qualite: "5", equivalent: null });
  expect(accord("C3")).toMatchObject({ qualite: "", equivalent: "C" });
  expect(accord("Dadd2")).toMatchObject({ qualite: "add9", equivalent: "Dadd9" });
  expect(accord("D2/F#").equivalent).toBe("Dsus2/F#");
});

test("les alias courants rejoignent la qualité canonique", () => {
  const q = (e: string) => accord(e).qualite;
  expect([q("Cmaj"), q("Cmin"), q("C-"), q("C-7"), q("CM7"), q("CΔ"), q("CΔ7")]).toEqual(["", "m", "m", "m7", "maj7", "maj7", "maj7"]);
  expect([q("Cø"), q("Cø7"), q("Cm7-5"), q("Cm7(b5)"), q("C°"), q("C°7"), q("C+"), q("C+5")]).toEqual(["m7b5", "m7b5", "m7b5", "m7b5", "dim", "dim7", "aug", "aug"]);
  expect([q("Csus"), q("C7sus"), q("C(add9)"), q("Cadd11"), q("CmM7"), q("Cmmaj7"), q("Cm(add9)"), q("Cmadd2")]).toEqual(["sus4", "7sus4", "add9", "add4", "m(maj7)", "m(maj7)", "madd9", "madd9"]);
});

test("ce qui n'est pas un accord (ou pas connu) est refusé sans exception", () => {
  for (const x of ["N.C.", "/F", "", "Hm", "texte", "D.S.", "C6/9", "Cfoo", "constructor"]) expect(analyserAccord(x), x).toBeNull();
});

test("accordsDeLEtiquette : les accords d'une étiquette telle que le site l'affiche", () => {
  expect(accordsDeLEtiquette("G (G/B)")).toEqual(["G", "G/B"]);
  expect(accordsDeLEtiquette("D/F#  /F  B/D#")).toEqual(["D/F#", "B/D#"]);
  expect(accordsDeLEtiquette("Am(maj7)")).toEqual(["Am(maj7)"]);
  expect(accordsDeLEtiquette("主歌/Couplet")).toEqual([]);
  expect(accordsDeLEtiquette("F或F/Eb")).toEqual(["F", "F/Eb"]);
});

test("notesDeLAccord : classes de hauteur et noms épelés par degré", () => {
  const n = (e: string) => notesDeLAccord(accord(e));
  expect(n("Cm")).toMatchObject({ classes: [0, 3, 7], noms: ["C", "Eb", "G"], basse: 0, nomBasse: "C" });
  expect(n("F#m7b5").noms).toEqual(["F#", "A", "C", "E"]);
  expect(n("Ebmaj7").noms).toEqual(["Eb", "G", "Bb", "D"]);
  expect(n("Bbdim").noms, "pas de Fb : l'enharmonique simple").toEqual(["Bb", "Db", "E"]);
  expect(n("A13").noms).toEqual(["A", "C#", "E", "G", "B", "F#"]);
  expect(n("Cdim7").noms, "pas de Bbb").toEqual(["C", "Eb", "Gb", "A"]);
  expect(n("D/F#")).toMatchObject({ basse: 6, nomBasse: "F#" });
});

test("voicingPiano : la basse à gauche, l'accord serré à droite, fondamentale la plus basse", () => {
  expect(voicingPiano(accord("D/F#"))).toEqual({ gauche: [6], droite: [14, 18, 21] });
  expect(voicingPiano(accord("C"))).toEqual({ gauche: [0], droite: [12, 16, 19] });
  expect(voicingPiano(accord("Bm7"))).toEqual({ gauche: [11], droite: [23, 26, 30, 33] });
  expect(voicingPiano(accord("G/D")), "la fondamentale reste au-dessus de la main gauche").toEqual({ gauche: [2], droite: [7, 11, 14] });
});

test("positionsGuitare : formes ouvertes d'abord, puis mobiles, trois au plus", () => {
  expect(cases("D")).toBe("x,x,0,2,3,2");
  expect(cases("D/F#")).toBe("2,x,0,2,3,2");
  const d = positionsGuitare(accord("D"));
  expect(d.basseAJouer).toBeNull();
  expect(d.doigtes.length).toBeGreaterThanOrEqual(2);
  expect(d.doigtes.length).toBeLessThanOrEqual(3);
  expect(d.doigtes[0].barre).toBeNull();
  expect(d.doigtes[0].depart).toBe(1);
});

test("positionsGuitare : la recherche se fait par classes de hauteur", () => {
  expect(cases("A#/D"), "A#/D trouve la forme de Bb/D").toBe(cases("Bb/D"));
  expect(cases("Bb/D")).toBe("x,x,0,3,3,1");
});

test("positionsGuitare : un F est un barré en case 1, doigts posés", () => {
  const f = positionsGuitare(accord("F")).doigtes[0];
  expect(f.cases).toEqual([1, 3, 3, 2, 1, 1]);
  expect(f.barre).toEqual({ case: 1, de: 0, a: 5 });
  expect(f.doigts).toEqual([1, 3, 4, 2, 1, 1]);
});

test("positionsGuitare : barré haut sur le manche, départ à la plus petite case", () => {
  const b = positionsGuitare(accord("G#")).doigtes[0];
  expect(b.barre?.case).toBe(4);
  expect(b.depart).toBe(Math.min(...b.cases.filter((c): c is number => !!c)));
});

test("positionsGuitare : basse rare = doigté de l'accord de base + « basse à jouer »", () => {
  const r = positionsGuitare(accord("D/Bb"));
  expect(r.basseAJouer).toBe("Bb");
  expect(r.doigtes.map((d) => d.cases.join())).toEqual(positionsGuitare(accord("D")).doigtes.map((d) => d.cases.join()));
  expect(positionsGuitare(accord("D/F#")).basseAJouer).toBeNull();
});

test("positionsGuitare : sans forme dans la table, pas de doigté inventé", () => {
  expect(positionsGuitare(accord("Adim9"))).toEqual({ doigtes: [], basseAJouer: null });
});

test("positionsGuitare : doigts à null sur les cordes étouffées et à vide", () => {
  const d = positionsGuitare(accord("D")).doigtes[0];
  d.cases.forEach((c, i) => {
    if (c === null || c === 0) expect(d.doigts[i]).toBeNull();
  });
  expect(positionsGuitare(accord("D/F#")).doigtes[0].doigts[0]).toBe("P");
});
