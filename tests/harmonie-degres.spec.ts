import { expect, test } from "@playwright/test";
import { chiffreDuDegre, degreDeLAccord, degresDeLaSuite } from "../src/lib/harmonie/degres";

// Lot 9 / H1 (docs/spec-harmonie.md) : « chaque accord du chant devient
// { degré, qualité, basse } relativement à la tonalité ». C'est la base des
// règles et des exemples du répertoire : elles s'écrivent une fois en degrés
// et valent dans toutes les tonalités. Accord non reconnu = ignoré.

test("un accord devient un degré : demi-tons depuis la tonique, qualité, basse", () => {
  expect(degreDeLAccord("D", "D")).toEqual({ st: 0, qualite: "maj", basse: null, texte: "D" });
  expect(degreDeLAccord("Em7", "D")).toEqual({ st: 2, qualite: "min", basse: null, texte: "Em7" });
  expect(degreDeLAccord("G", "D")).toEqual({ st: 5, qualite: "maj", basse: null, texte: "G" });
  expect(degreDeLAccord("A", "D")).toEqual({ st: 7, qualite: "maj", basse: null, texte: "A" });
  expect(degreDeLAccord("Bm", "D")).toEqual({ st: 9, qualite: "min", basse: null, texte: "Bm" });
  expect(degreDeLAccord("C", "D"), "le b7, emprunté au mineur").toEqual({ st: 10, qualite: "maj", basse: null, texte: "C" });
  expect(degreDeLAccord("Bb", "D"), "le b6").toEqual({ st: 8, qualite: "maj", basse: null, texte: "Bb" });
});

test("la basse d'un accord renversé compte à part", () => {
  expect(degreDeLAccord("A/C#", "D")).toEqual({ st: 7, qualite: "maj", basse: 11, texte: "A/C#" });
  expect(degreDeLAccord("G/A", "D"), "le 4 sur la basse du 5").toEqual({ st: 5, qualite: "maj", basse: 7, texte: "G/A" });
  expect(degreDeLAccord("D/F#", "D")).toEqual({ st: 0, qualite: "maj", basse: 4, texte: "D/F#" });
});

test("les qualités que les règles distinguent", () => {
  expect(degreDeLAccord("Dmaj7", "D")?.qualite, "maj7 n'est pas mineur").toBe("maj");
  expect(degreDeLAccord("Asus4", "D")?.qualite).toBe("sus");
  expect(degreDeLAccord("C#dim", "D")?.qualite).toBe("dim");
  expect(degreDeLAccord("F#m7b5", "D")?.qualite).toBe("min");
  expect(degreDeLAccord("D2", "D")?.qualite, "la couleur add9 ne change pas la fonction").toBe("maj");
  expect(degreDeLAccord("Dadd9", "D")?.qualite).toBe("maj");
});

test("un accord illisible est ignoré, jamais une erreur", () => {
  expect(degreDeLAccord("N.C.", "D")).toBeNull();
  expect(degreDeLAccord("", "D")).toBeNull();
  expect(degreDeLAccord("D", "H"), "tonalité illisible").toBeNull();
});

test("le degré s'écrit en chiffres (décision du 17/09/2026)", () => {
  expect(chiffreDuDegre({ st: 0, qualite: "maj", basse: null, texte: "D" })).toBe("1");
  expect(chiffreDuDegre({ st: 2, qualite: "min", basse: null, texte: "Em" })).toBe("2m");
  expect(chiffreDuDegre({ st: 5, qualite: "maj", basse: null, texte: "G" })).toBe("4");
  expect(chiffreDuDegre({ st: 9, qualite: "min", basse: null, texte: "Bm" })).toBe("6m");
  expect(chiffreDuDegre({ st: 10, qualite: "maj", basse: null, texte: "C" })).toBe("b7");
  expect(chiffreDuDegre({ st: 8, qualite: "maj", basse: null, texte: "Bb" })).toBe("b6");
  expect(chiffreDuDegre({ st: 5, qualite: "maj", basse: 7, texte: "G/A" }), "la basse en chiffres aussi").toBe("4/5");
  expect(chiffreDuDegre({ st: 4, qualite: "min", basse: null, texte: "F#m" })).toBe("3m");
});

test("une suite d'accords devient une suite de degrés, les illisibles sautés", () => {
  expect(degresDeLaSuite(["D", "N.C.", "G", "A"], "D").map(chiffreDuDegre)).toEqual(["1", "4", "5"]);
  expect(degresDeLaSuite(["Bb", "C", "D"], "D").map(chiffreDuDegre), "la montée épique").toEqual(["b6", "b7", "1"]);
  expect(degresDeLaSuite(["G", "A"], "G").map(chiffreDuDegre), "les mêmes degrés dans une autre tonalité").toEqual(["1", "2"]);
});
