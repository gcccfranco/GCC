// Dictionnaire d'accords (lot DA) — les notes d'un accord : classes de hauteur, noms épelés, voicing de piano.
import { noteToIndex } from "@/lib/transpose";
import type { Accord } from "./analyse";
import { QUALITES } from "./table";

// Lettres de la gamme naturelle (C D E F G A B) et leur classe de hauteur.
const LETTRES = ["C", "D", "E", "F", "G", "A", "B"];
const NATURELLES = [0, 2, 4, 5, 7, 9, 11];
const DIESES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BEMOLS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const DIMINUEES = new Set(["dim", "m7b5", "dim7", "dim9"]);

/** Degré (1 = fondamentale … 7) que porte chaque intervalle en demi-tons dans cette qualité. */
function degreDe(intervalle: number, qualite: string): number {
  switch (intervalle) {
    case 0: return 1;
    case 1: case 2: return 2;
    case 3: case 4: return 3;
    case 5: return 4;
    case 6: return DIMINUEES.has(qualite) ? 5 : 4;
    case 7: case 8: return 5;
    case 9: return qualite === "dim7" || qualite === "dim9" ? 7 : 6;
    default: return 7;
  }
}

/** Nom épelé par degré (lettre + altération) ; double altération ou Fb/Cb/E#/B# → enharmonique simple. */
function nomEpele(fondamentale: string, classe: number, degre: number, suitLesBemols: boolean): string {
  const lettre = (LETTRES.indexOf(fondamentale[0]) + degre - 1) % 7;
  let alteration = (classe - NATURELLES[lettre] + 12) % 12;
  if (alteration > 6) alteration -= 12;
  if (alteration === 0) return LETTRES[lettre];
  const nom = LETTRES[lettre] + (alteration === 1 ? "#" : alteration === -1 ? "b" : "");
  const rare = Math.abs(alteration) > 1 || ["Fb", "Cb", "E#", "B#"].includes(nom);
  return rare ? (suitLesBemols ? BEMOLS : DIESES)[classe] : nom;
}

export function notesDeLAccord(a: Accord): { classes: number[]; noms: string[]; basse: number; nomBasse: string } {
  const racine = noteToIndex(a.fondamentale);
  const { intervalles } = QUALITES[a.qualite];
  const bemols = a.fondamentale.includes("b") || a.fondamentale === "F";
  const classes = intervalles.map((i) => (racine + i) % 12);
  const noms = intervalles.map((i, k) => nomEpele(a.fondamentale, classes[k], degreDe(i, a.qualite), bemols));
  return {
    classes,
    noms,
    basse: a.basse ? noteToIndex(a.basse) : racine,
    nomBasse: a.basse ?? a.fondamentale,
  };
}

/**
 * Piano à deux mains (décision Q11), en demi-tons depuis le do grave du clavier :
 * main gauche = la basse (slash ou fondamentale) dans la première octave ; main droite =
 * l'accord en position serrée, fondamentale la plus basse, strictement au-dessus de la main gauche.
 */
export function voicingPiano(a: Accord): { gauche: number[]; droite: number[] } {
  const { classes, basse } = notesDeLAccord(a);
  const racine = classes[0];
  const depart = racine > basse ? racine : racine + 12;
  const droite = [...new Set(classes)].map((c) => depart + ((c - racine + 12) % 12)).sort((x, y) => x - y);
  return { gauche: [basse], droite };
}
