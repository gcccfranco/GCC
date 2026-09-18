// Harmonie (lot 9) — chercher un motif de degrés dans un chant.
//
// Un seul moteur pour deux usages : au build, on cherche le « après » d'une
// fiche pour savoir quels chants le jouent **déjà** (exemples du répertoire) ;
// dans le navigateur, on cherche le « avant » pour proposer une suggestion.
// Pur : ni réseau, ni état, ni Firestore.

import type { ChordProSection } from "@/types/chordPro";
import { degreDeLAccord, type AccordDegre } from "./degres";
import type { Pas, Regle, TypeSection } from "./regles";

export interface Endroit {
  sectionUid: string;
  sectionNom: string;
  /** Index de la section dans le chant. */
  section: number;
  /** Index de la ligne dans la section (celle du premier accord du motif). */
  ligne: number;
  /** Index du premier accord du motif dans sa ligne. */
  accord: number;
  /** Place de **chaque** accord du motif : un motif peut commencer en fin de
   *  ligne et finir sur la suivante, et il faut alors réécrire les deux. */
  places: { ligne: number; srcLine?: number; accord: number }[];
  /** Étiquettes trouvées, telles qu'écrites dans le chant. */
  accords: string[];
  /** Variante de la règle qui a répondu — donne le « après » à proposer. */
  variante: number;
}

/** Accord d'une section, avec sa place. */
interface Place {
  d: AccordDegre;
  ligne: number;
  /** Ligne dans le source ChordPro (pour réécrire au bon endroit). */
  srcLine?: number;
  accord: number;
  /** Dernier accord de sa ligne. */
  finDeLigne: boolean;
}

const NUE = /^[A-G][#b]?m?$/;

function correspond(pas: Pas, d: AccordDegre): boolean {
  if (d.st !== pas.st) return false;
  // Un accord écrit « Asus4 » a la qualité « sus » : un pas qui demande
  // justement un sus ne doit pas l'écarter parce qu'il se dit majeur.
  const susDemande = pas.contient?.some((c) => c.startsWith("sus"));
  if (pas.qual && d.qualite !== pas.qual && !(susDemande && d.qualite === "sus")) return false;
  if (pas.basse === null && d.basse !== null) return false;
  if (typeof pas.basse === "number" && d.basse !== pas.basse) return false;
  // « Nu » veut dire sans couleur **et** sans basse ajoutée : poser un add9
  // sur un E/G# n'est pas la même idée que sur un E.
  if (pas.simple && (d.basse !== null || !NUE.test(d.texte))) return false;
  if (pas.contient && !pas.contient.some((c) => d.texte.includes(c))) return false;
  return true;
}

/** Type de section au vocabulaire des règles : une section « autre » dont le
 *  nom parle d'interlude ou d'instrumental en est un. */
export function typeDeSection(section: { type: string; name?: string }): TypeSection | "other" {
  if (section.type === "other") {
    return /interlude|instrument/i.test(section.name ?? "") ? "interlude" : "other";
  }
  return section.type as TypeSection;
}

function placesDe(section: ChordProSection, tonalite: string): Place[] {
  const out: Place[] = [];
  section.lines.forEach((line, ligne) => {
    const accords = line.tokens.filter((t) => t.type === "chord");
    accords.forEach((t, accord) => {
      const d = degreDeLAccord(t.value, tonalite);
      if (d) out.push({ d, ligne, srcLine: line.srcLine, accord, finDeLigne: accord === accords.length - 1 });
    });
  });
  return out;
}

/** La section `i` est-elle suivie d'un refrain ? */
function precedeUnRefrain(sections: ChordProSection[], i: number): boolean {
  return sections[i + 1] ? typeDeSection(sections[i + 1]) === "chorus" : false;
}

/**
 * Tous les endroits d'un chant où la règle s'applique — son « motif » (ce
 * qu'on cherche à remplacer) ou son « apres » (ce qu'on obtiendrait, qui sert
 * à repérer les chants qui le jouent déjà).
 */
export function chercher(
  sections: ChordProSection[],
  tonalite: string,
  regle: Regle,
  quoi: "motif" | "apres",
): Endroit[] {
  const out: Endroit[] = [];
  // « Toute fin du chant » : la dernière section qui porte des accords — cinq
  // chants finissent sur une section sans accord, et n'avaient alors aucune
  // idée de fin.
  const derniere = sections.reduce(
    (garde, s, i) => (s.lines.some((l) => l.tokens.some((t) => t.type === "chord")) ? i : garde),
    sections.length - 1,
  );

  sections.forEach((section, i) => {
    if (regle.sections && !regle.sections.includes(typeDeSection(section) as TypeSection)) return;
    if (regle.position === "avant-refrain" && !precedeUnRefrain(sections, i)) return;
    if (regle.position === "fin-chant" && i !== derniere) return;

    const places = placesDe(section, tonalite);
    if (!places.length) return;

    regle.variantes.forEach((variante, iVariante) => {
      const suite = variante[quoi];
      if (!suite.length) return;

      for (let debut = 0; debut + suite.length <= places.length; debut++) {
        const tranche = places.slice(debut, debut + suite.length);
        if (!suite.every((pas, k) => correspond(pas, tranche[k].d))) continue;

        const dernier = tranche[tranche.length - 1];
        const premier = tranche[0];
        // Une place par position : le motif doit finir là où la règle le dit.
        if (regle.position === "ligne" && premier.ligne !== dernier.ligne) continue;
        if (regle.position === "fin-ligne" && !dernier.finDeLigne) continue;
        if (
          (regle.position === "fin-section" || regle.position === "avant-refrain" || regle.position === "fin-chant") &&
          debut + suite.length !== places.length
        ) continue;
        // Contraintes écrites en toutes lettres dans les fiches.
        if (regle.sansTeteDeSection && debut === 0) continue;
        if (regle.sansFinDeSection && debut + suite.length === places.length) continue;
        if (regle.sansDerniereSection && i === derniere) continue;
        if (regle.position === "tenu") {
          // Un accord seul dans sa ligne, qui dure.
          const seul = places.filter((p) => p.ligne === premier.ligne).length === 1;
          if (!seul) continue;
        }

        out.push({
          sectionUid: section.uid,
          sectionNom: section.name || section.type,
          section: i,
          ligne: premier.ligne,
          accord: premier.accord,
          accords: tranche.map((p) => p.d.texte),
          places: tranche.map((p) => ({ ligne: p.ligne, srcLine: p.srcLine, accord: p.accord })),
          variante: iVariante,
        });
      }
    });
  });

  return out;
}
