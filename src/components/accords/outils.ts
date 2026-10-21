// Dictionnaire d'accords (lot DA, DA-2) — petits utilitaires partagés par le panneau, la bulle et la page.
import type { TFunction } from "i18next";
import { noteToIndex } from "@/lib/transpose";
import { analyserAccord, type Accord } from "@/lib/accords/analyse";
import { notesDeLAccord, voicingPiano } from "@/lib/accords/notes";

/** Le nom d'une note dans la langue : solfège en français (« si bémol »), lettre en 中文 (« Bb »). */
export function nomDeNote(note: string, t: TFunction): string {
  const alteration = note[1] === "#" ? t("accords.diese") : note[1] === "b" ? t("accords.bemol") : "";
  return t(`accords.solfege.${note[0]}`) + alteration;
}

/** « ré majeur », « mi mineur 7 », « D avec F# à la basse » : la ligne grise sous le nom de l'accord. */
export function decrire(a: Accord, t: TFunction): string {
  if (a.basse) return t("accords.avecBasse", { accord: a.fondamentale + a.ecrite, basse: a.basse });
  return t("accords.description", { note: nomDeNote(a.fondamentale, t), qualite: t(`accords.qualites.${a.qualite}`) });
}

/** Les notes de l'accord en lettres, dans l'ordre de l'accord : « D F# A ». */
export function notesEnLettres(a: Accord): string {
  return [...new Set(notesDeLAccord(a).noms)].join(" ");
}

/** Le doigté en une chaîne lisible par les tests et les lecteurs d'écran : « 2x0232 » (virgules au-delà de la 9e case). */
export function grilleDe(cases: (number | null)[]): string {
  const sep = cases.some((c) => c !== null && c > 9) ? "," : "";
  return cases.map((c) => (c === null ? "x" : String(c))).join(sep);
}

/** Les deux mains du piano, avec les noms de notes à écrire sur les touches. */
export function pianoDe(a: Accord): { gauche: number[]; droite: number[]; nomsGauche: string[]; nomsDroite: string[] } {
  const { noms, classes, nomBasse } = notesDeLAccord(a);
  const { gauche, droite } = voicingPiano(a);
  return { gauche, droite, nomsGauche: [nomBasse], nomsDroite: droite.map((n) => noms[classes.indexOf(n % 12)] ?? "") };
}

/** La clé qui dit que deux écritures sont le même accord (« A#m » = « Bbm », « Dsus2 » = « D2 »). */
export function cleDeAccord(texte: string): string | null {
  const a = analyserAccord(texte);
  return a ? `${noteToIndex(a.fondamentale)}|${a.qualite}|${a.basse ? noteToIndex(a.basse) : ""}` : null;
}
