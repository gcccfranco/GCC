// Harmonie (lot 9, H2) — poser une suggestion dans le source d'un chant.
//
// « Essayer dans Ma version » réécrit les accords **à l'endroit trouvé**, dans
// le source ChordPro (celui de Ma version, en tonalité d'origine). On ne
// touche qu'aux crochets de la ligne visée : les paroles, les autres lignes et
// le reste du chant ne bougent pas.

import { parseChordPro } from "@/lib/chordpro/parser";
import { transposeChord } from "@/lib/transpose";
import type { Endroit } from "./motifs";

const ACCORD = /\[([^\]]*)\]/g;

/** Réécrit, dans une ligne, les accords dont le rang est donné : `remplace`
 *  associe le rang de l'accord à son nouveau texte. Un rang qui reçoit
 *  plusieurs accords les pose à la suite (le motif s'allonge) ; une chaîne
 *  vide efface l'accord. */
function reecrireLaLigne(ligne: string, remplace: Map<number, string[]>): string {
  let i = 0;
  return ligne.replace(ACCORD, (tout) => {
    const rang = i++;
    const nouveaux = remplace.get(rang);
    if (!nouveaux) return tout;
    return nouveaux.filter(Boolean).map((c) => `[${c}]`).join("");
  });
}

/**
 * Le source, avec la suggestion posée. `nouveaux` est écrit dans la tonalité
 * **jouée** ; `demiTons` dit de combien le source est plus bas (0 si le chant
 * se joue dans sa tonalité d'origine).
 */
export function appliquerDansLaSource(
  source: string,
  endroit: Endroit,
  nouveaux: string[],
  demiTons = 0,
  tonaliteSource = "C",
): string {
  const places = endroit.places?.length
    ? endroit.places
    : [{ ligne: endroit.ligne, srcLine: undefined, accord: endroit.accord }];
  // Un motif peut commencer en fin de ligne et finir sur la suivante : on
  // réécrit chaque ligne qu'il touche, jamais une seule.
  const ast = parseChordPro(source);
  const section = ast.sections.find((s) => s.uid === endroit.sectionUid) ?? ast.sections[endroit.section];
  if (!section) return source;

  const versLaSource = demiTons ? nouveaux.map((c) => transposeChord(c, -demiTons, tonaliteSource)) : nouveaux;
  // Les accords en trop (le motif s'allonge) rejoignent le dernier remplacé.
  const parPlace = places.map((place, k) =>
    k === places.length - 1 ? versLaSource.slice(k) : [versLaSource[k] ?? ""],
  );

  const lignes = source.split("\n");
  const parLigne = new Map<number, Map<number, string[]>>();
  places.forEach((place, k) => {
    const srcLine = place.srcLine ?? section.lines[place.ligne]?.srcLine;
    if (srcLine === undefined) return;
    const dansLaLigne = parLigne.get(srcLine) ?? new Map<number, string[]>();
    dansLaLigne.set(place.accord, parPlace[k]);
    parLigne.set(srcLine, dansLaLigne);
  });
  if (!parLigne.size) return source;
  for (const [srcLine, remplace] of parLigne) {
    lignes[srcLine] = reecrireLaLigne(lignes[srcLine], remplace);
  }
  return lignes.join("\n");
}
