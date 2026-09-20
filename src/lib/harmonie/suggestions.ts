// Harmonie (lot 9, H2) — les idées proposées sur un chant précis.
//
// Une règle trouvée quelque part dans le chant devient **une** suggestion par
// section (« dans le couplet, 4 endroits »), jamais une par accord. Les règles
// n'entendent pas la mélodie : chaque suggestion porte « À vérifier en
// jouant », et sa sûreté sert à choisir les cinq premières.
//
// Pur : le composant s'occupe de l'affichage, Firestore des refus.

import type { ChordProSection } from "@/types/chordPro";
import type { Fiche, Niveau } from "@/types/harmonie";
import { transposeChord } from "@/lib/transpose";
import { chercher, typeDeSection, type Endroit } from "./motifs";
import { REGLES, type Pas, type Regle, type Surete } from "./regles";

export interface Suggestion {
  /** Identifiant stable, aussi utilisé pour les refus : `<fiche>__<section>`. */
  id: string;
  fiche: Fiche;
  regle: Regle;
  sectionUid: string;
  sectionNom: string;
  /** Rang de la section dans le chant : l'ordre d'affichage. */
  section: number;
  endroits: Endroit[];
  surete: Surete;
}

const RANG_SURETE: Record<Surete, number> = { "tres-sure": 0, sure: 1, "a-ecouter": 2 };
const RANG_NIVEAU: Record<Niveau, number> = { facile: 0, intermediaire: 1, avance: 2 };

/** La dernière section d'un type donné (le dernier refrain, par exemple). */
function derniereDeType(sections: ChordProSection[], type: string): number {
  for (let i = sections.length - 1; i >= 0; i--) if (typeDeSection(sections[i]) === type) return i;
  return -1;
}

/** Les règles sans motif d'accords : l'intro absente et le tag. */
function suggestionsParticulieres(
  sections: ChordProSection[],
  regle: Regle,
  fiche: Fiche,
): Suggestion[] {
  const refrain = derniereDeType(sections, "chorus");
  if (refrain < 0) return [];
  const section = sections[refrain];
  const lignes = section.lines.filter((l) => l.tokens.some((t) => t.type === "chord"));
  if (!lignes.length) return [];

  // L'intro avec la fin du refrain : seulement si le chant n'a pas d'intro.
  if (regle.genre === "intro-absente" && sections.some((s) => typeDeSection(s) === "intro")) return [];

  const derniere = section.lines.lastIndexOf(lignes[lignes.length - 1]);
  const accords = lignes[lignes.length - 1].tokens.filter((t) => t.type === "chord").map((t) => t.value);
  return [
    {
      id: `${fiche.id}__${section.uid}`,
      fiche,
      regle,
      sectionUid: section.uid,
      sectionNom: section.name || section.type,
      section: refrain,
      endroits: [{
        sectionUid: section.uid,
        sectionNom: section.name || section.type,
        section: refrain,
        ligne: derniere,
        accord: 0,
        accords,
        places: accords.map((_, k) => ({ ligne: derniere, srcLine: section.lines[derniere]?.srcLine, accord: k })),
        variante: 0,
      }],
      surete: regle.surete,
    },
  ];
}

/**
 * Toutes les idées d'harmonie d'un chant, dans l'ordre du chant. `refuses`
 * porte les identifiants écartés par l'équipe (« Ne marche pas sur ce chant »).
 */
export function suggestionsPour(
  sections: ChordProSection[],
  tonalite: string,
  fiches: Fiche[],
  refuses: string[] = [],
): Suggestion[] {
  const parId = new Map(fiches.map((f) => [f.id, f]));
  const ecartes = new Set(refuses);
  const out: Suggestion[] = [];

  for (const regle of REGLES) {
    const fiche = parId.get(regle.fiche);
    if (!fiche) continue;

    if (regle.genre) {
      out.push(...suggestionsParticulieres(sections, regle, fiche));
      continue;
    }

    // Une règle × une section = une suggestion, avec la liste de ses endroits.
    const parSection = new Map<string, Endroit[]>();
    for (const e of chercher(sections, tonalite, regle, "motif")) {
      parSection.set(e.sectionUid, [...(parSection.get(e.sectionUid) ?? []), e]);
    }
    for (const [uid, endroits] of parSection) {
      out.push({
        id: `${fiche.id}__${uid}`,
        fiche,
        regle,
        sectionUid: uid,
        sectionNom: endroits[0].sectionNom,
        section: endroits[0].section,
        endroits,
        surete: regle.surete,
      });
    }
  }

  // Dans l'ordre du chant : la section, puis l'endroit dans la section.
  const place = (s: Suggestion) => (s.endroits[0]?.ligne ?? 0) * 100 + (s.endroits[0]?.accord ?? 0);
  return out
    .filter((s) => !ecartes.has(s.id))
    .sort((a, b) => a.section - b.section || place(a) - place(b) || a.fiche.code.localeCompare(b.fiche.code));
}

/**
 * Les cinq premières : **les plus sûres, puis les plus faciles**, mais
 * affichées dans l'ordre du chant (décision du 17/09/2026). Le reste suit,
 * dans l'ordre du chant lui aussi.
 */
export function cinqPremieres(
  suggestions: Suggestion[],
  instrument: "piano" | "guitare",
  combien = 5,
): { premieres: Suggestion[]; suite: Suggestion[] } {
  const niveau = (s: Suggestion) => RANG_NIVEAU[s.fiche.niveau[instrument] ?? "intermediaire"];
  const classees = [...suggestions].sort(
    (a, b) => RANG_SURETE[a.surete] - RANG_SURETE[b.surete] || niveau(a) - niveau(b) || a.section - b.section,
  );
  // Cinq idées **différentes** d'abord : la même fiche trouvée dans trois
  // sections mangeait trois des cinq places, et l'écran ne disait qu'une chose.
  const gardees = new Set<string>();
  const fichesVues = new Set<string>();
  for (const s of classees) {
    if (gardees.size >= combien) break;
    if (fichesVues.has(s.fiche.id)) continue;
    gardees.add(s.id);
    fichesVues.add(s.fiche.id);
  }
  for (const s of classees) {
    if (gardees.size >= combien) break;
    gardees.add(s.id);
  }
  return {
    premieres: suggestions.filter((s) => gardees.has(s.id)),
    suite: suggestions.filter((s) => !gardees.has(s.id)),
  };
}

/** Un pas de règle écrit en vrai accord de la tonalité jouée : le degré 2 en
 *  mineur avec une septième donne « Em7 » en D, « Am7 » en G. Seule fabrique
 *  d'étiquette du lot — la modulation s'en sert aussi. */
export function etiquetteDuPas(pas: Pas, tonalite: string): string {
  const base = transposeChord(tonalite, pas.st, tonalite);
  const couleur = pas.contient?.[0] ?? "";
  let corps = base;
  if (couleur.startsWith("m")) corps += couleur; // « m7 » porte déjà le mineur
  else {
    if (pas.qual === "min") corps += "m";
    if (pas.qual === "dim") corps += "dim";
    if (pas.qual === "sus") corps += "sus4";
    corps += couleur;
  }
  if (pas.basse != null) corps += `/${transposeChord(tonalite, pas.basse, tonalite)}`;
  return corps;
}

/** Deux pas qui demandent la même chose : le second ne change rien au premier. */
function memeAccord(a: Pas | undefined, b: Pas | undefined): boolean {
  return Boolean(a && b && a.st === b.st && a.qual === b.qual && !b.contient && b.basse == null);
}

/**
 * Ce que la suggestion change, **dans les accords du chant** : « G → A »
 * devient « Em7 → A ». Bien plus parlant que la ligne générique de la fiche,
 * écrite en D. Les accords que la règle ne change pas gardent **l'étiquette
 * écrite dans le chant** : réécrire « Eb/G » en « Eb » effacerait une ligne de
 * basse que personne n'a demandé de toucher.
 */
export function apercuDuChangement(
  s: Suggestion,
  tonalite: string,
  endroit = s.endroits[0],
): { avant: string; apres: string; apresListe: string[] } | null {
  const variante = s.regle.variantes[endroit?.variante ?? 0];
  if (!endroit || !variante) return null;
  const apresListe = variante.apres.map((pas, k) =>
    memeAccord(variante.motif[k], pas) && endroit.accords[k]
      ? endroit.accords[k]
      : etiquetteDuPas(pas, tonalite),
  );
  return { avant: endroit.accords.join(" – "), apres: apresListe.join(" – "), apresListe };
}
