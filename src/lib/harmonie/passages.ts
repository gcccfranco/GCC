// Harmonie (lot H2, docs/spec-harmonie-accords.md) — les passages d'un chant.
//
// Un passage = une section, lue en degrés : sa grille (les accords par ligne,
// avec leur fonction tonale), son résumé (la boucle si elle se répète) et sa
// fonction (repos, vers le refrain, suspens). `harmonieDuChant` y range les
// idées automatiques et celles de l'équipe. La phrase affichée est écrite par
// les écrans (H4), pas ici.
//
// Pur : pas de React, pas de Firestore.

import type { ChordProSection } from "@/types/chordPro";
import type { Fiche } from "@/types/harmonie";
import type { Idee } from "@/lib/firebase/harmonie";
import { chiffreDuDegre, degreDeLAccord, type AccordDegre } from "./degres";
import { typeDeSection } from "./motifs";
import { suggestionsPour, type Suggestion } from "./suggestions";

export type FonctionTonale = "T" | "SD" | "D" | "autre";
export type FonctionPassage = "repos" | "vers-refrain" | "suspens" | "sans-accords";

export interface AccordDuPassage {
  texte: string;
  chiffre: string;
  fonction: FonctionTonale;
  /** Index de la ligne dans la section. */
  ligne: number;
  /** Index de l'accord parmi les accords de la ligne. */
  accord: number;
}

export interface Passage {
  uid: string;
  nom: string;
  type: string;
  /** Rang de la section dans le chant. */
  rang: number;
  /** Une entrée par ligne qui porte au moins un accord lisible. */
  lignes: AccordDuPassage[][];
  /** Chiffres sans répétition immédiate, ramenés à la boucle. */
  resume: string[];
  /** `resume` est un motif répété (≥ 2 fois) dans la section. */
  boucle: boolean;
  fonction: FonctionPassage;
}

/** T : 1, 3m, 6m · SD : 2m, 4 · D : 5 (ou sus), 7dim · le reste, `autre`. La basse ne compte pas. */
export function fonctionTonale(d: AccordDegre): FonctionTonale {
  const { st, qualite } = d;
  if ((st === 0 && qualite === "maj") || (st === 4 && qualite === "min") || (st === 9 && qualite === "min")) return "T";
  if ((st === 2 && qualite === "min") || (st === 5 && qualite === "maj")) return "SD";
  if ((st === 7 && (qualite === "maj" || qualite === "sus")) || (st === 11 && qualite === "dim")) return "D";
  return "autre";
}

/** Le plus court bloc (2 à 8) dont la suite est la répétition, la dernière pouvant être un préfixe. */
function boucleDe(suite: string[]): string[] | null {
  for (let p = 2; p <= 8 && suite.length >= 2 * p; p++) {
    if (suite.every((c, i) => c === suite[i % p])) return suite.slice(0, p);
  }
  return null;
}

export function passagesDuChant(sections: ChordProSection[], tonalite: string): Passage[] {
  return sections.map((section, rang) => {
    const lignes: AccordDuPassage[][] = [];
    section.lines.forEach((line, ligne) => {
      const accords: AccordDuPassage[] = [];
      line.tokens.filter((t) => t.type === "chord").forEach((t, accord) => {
        const d = degreDeLAccord(t.value, tonalite);
        if (d) accords.push({ texte: t.value, chiffre: chiffreDuDegre(d), fonction: fonctionTonale(d), ligne, accord });
      });
      if (accords.length) lignes.push(accords);
    });

    const suite = lignes.flat().map((a) => a.chiffre).filter((c, i, tous) => c !== tous[i - 1]);
    const bloc = boucleDe(suite);

    let fonction: FonctionPassage = "sans-accords";
    if (lignes.length) {
      const dernier = lignes[lignes.length - 1].at(-1)!;
      const d = degreDeLAccord(dernier.texte, tonalite)!;
      if (d.st === 0 && d.qualite === "maj") fonction = "repos";
      else if (sections[rang + 1] && typeDeSection(sections[rang + 1]) === "chorus") fonction = "vers-refrain";
      else fonction = "suspens";
    }

    return {
      uid: section.uid,
      nom: section.name || section.type,
      type: section.type,
      rang,
      lignes,
      resume: bloc ?? suite,
      boucle: bloc !== null,
      fonction,
    };
  });
}

export interface PassageAvecIdees extends Passage {
  idees: Suggestion[];
  ideesEquipe: Idee[];
}

/** Les idées automatiques (refus appliqués) et celles de l'équipe, rangées par passage.
 *  Une idée d'équipe sans passage retrouvé (uid, puis nom) va dans `sansPassage`. */
export function harmonieDuChant(
  sections: ChordProSection[],
  tonalite: string,
  fiches: Fiche[],
  refuses: string[],
  idees: Idee[],
): { passages: PassageAvecIdees[]; sansPassage: Idee[] } {
  const passages: PassageAvecIdees[] = passagesDuChant(sections, tonalite).map((p) => ({ ...p, idees: [], ideesEquipe: [] }));
  const parUid = new Map(passages.map((p) => [p.uid, p]));

  for (const s of suggestionsPour(sections, tonalite, fiches, refuses)) parUid.get(s.sectionUid)?.idees.push(s);

  const sansPassage: Idee[] = [];
  for (const idee of idees) {
    const p =
      (idee.passage ? parUid.get(idee.passage) : undefined) ??
      (idee.passageNom ? passages.find((x) => x.nom === idee.passageNom) : undefined);
    if (p) p.ideesEquipe.push(idee);
    else sansPassage.push(idee);
  }
  return { passages, sansPassage };
}
