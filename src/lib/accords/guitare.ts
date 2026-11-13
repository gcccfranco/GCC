// Dictionnaire d'accords (lot DA) — les doigtés de guitare. Tout vient de la table écrite à la main
// (`table.ts`) : jamais de doigté calculé autrement. Cordes indexées de la 6e (grave) à la 1re (aiguë).
import { noteToIndex } from "@/lib/transpose";
import { analyserAccord, type Accord } from "./analyse";
import { MOBILES, MOBILES_SECONDES, OUVERTES } from "./table";

type Doigte = {
  /** Une case par corde : null = étouffée, 0 = à vide. */
  cases: (number | null)[];
  /** Doigt par corde : 1-4, « P » pour le pouce, null si étouffée, à vide ou sans doigt. */
  doigts: (number | "P" | null)[];
  /** Barré : case, de la corde `de` à la corde `a` (index de corde, 0 = 6e). */
  barre: { case: number; de: number; a: number } | null;
  /** Première case dessinée. */
  depart: number;
};

/** Notes des cordes à vide (classes de hauteur), de la 6e à la 1re : mi la ré sol si mi. */
const CORDE_A_VIDE = [4, 9, 2, 7, 11, 4];
const MAX_DOIGTES = 3;
const CASE_MAX = 15;

type Cle = string;
const cle = (racine: number, qualite: string, basse: number | null): Cle => `${racine}|${qualite}|${basse ?? ""}`;

function lireCases(s: string): (number | null)[] {
  return (s.includes(",") ? s.split(",") : s.split("")).map((c) => (c === "x" ? null : Number(c)));
}

function lireDoigts(s: string, cases: (number | null)[]): (number | "P" | null)[] {
  return s.split("").map((c, i) => (c === "x" || cases[i] === null || cases[i] === 0 ? null : c === "P" ? "P" : Number(c)));
}

function departDe(cases: (number | null)[]): number {
  const pressees = cases.filter((c): c is number => c !== null && c > 0);
  if (!pressees.length) return 1;
  return Math.max(...pressees) <= 4 ? 1 : Math.min(...pressees);
}

function plusPetiteCase(d: Doigte): number {
  const pressees = d.cases.filter((c): c is number => c !== null && c > 0);
  return pressees.length ? Math.min(...pressees) : 0;
}

// Formes ouvertes indexées par (classe de la fondamentale, qualité canonique, classe de la basse) : `A#/D` trouve `Bb/D`.
const OUVERTES_INDEX = new Map<Cle, Doigte[]>();
for (const [etiquette, formes] of Object.entries(OUVERTES)) {
  const a = analyserAccord(etiquette);
  if (!a) continue;
  const k = cle(noteToIndex(a.fondamentale), a.qualite, a.basse ? noteToIndex(a.basse) : null);
  const liste = OUVERTES_INDEX.get(k) ?? [];
  for (const [c, d] of formes) {
    const cases = lireCases(c);
    liste.push({ cases, doigts: lireDoigts(d, cases), barre: null, depart: departDe(cases) });
  }
  OUVERTES_INDEX.set(k, liste);
}

function poser(racine: number, liste: (typeof MOBILES)[string]): Doigte[] {
  const sortie: Doigte[] = [];
  for (const [corde, intervalle, decalages, doigts, barre] of liste) {
    const decal = lireCases(decalages);
    const min = Math.min(...decal.filter((d): d is number => d !== null));
    let r = (((racine + intervalle - CORDE_A_VIDE[corde]) % 12) + 12) % 12;
    if ((barre || min < 0) && r + min < 1) r += 12;
    const cases = decal.map((d) => (d === null ? null : r + d));
    if (cases.some((c) => c !== null && c > CASE_MAX)) continue;
    sortie.push({
      cases,
      doigts: lireDoigts(doigts, cases),
      barre: barre ? { case: r, de: barre[0], a: barre[1] } : null,
      depart: departDe(cases),
    });
  }
  return sortie.sort((x, y) => plusPetiteCase(x) - plusPetiteCase(y));
}

/** Toutes les formes mobiles de la clé (qualité, ou qualité/intervalle de la basse), `MOBILES` puis
 *  `MOBILES_SECONDES`, posées sur cette fondamentale (classe de hauteur). Exporté pour le garde-fou, qui les vérifie
 *  toutes sur les douze fondamentales. */
export function formesMobiles(racine: number, cleMobile: string): Doigte[] {
  return poser(racine, [...(MOBILES[cleMobile] ?? []), ...(MOBILES_SECONDES[cleMobile] ?? [])]);
}

function sansDoublon(liste: Doigte[]): Doigte[] {
  const vues = new Set<string>();
  return liste.filter((d) => {
    const k = d.cases.join(",");
    if (vues.has(k)) return false;
    vues.add(k);
    return true;
  });
}

/** `a` ne fait que reprendre une partie de `b` (mêmes cases là où elle joue) : ce n'est pas une autre position. */
function contenue(a: Doigte, b: Doigte): boolean {
  return a.cases.every((c, i) => c === null || c === b.cases[i]);
}

/** Écart minimal, en cases, entre les plus basses cases pressées de deux positions de zones différentes (R2). */
const ECART_ZONES = 3;

function formes(racine: number, qualite: string, basse: number | null): Doigte[] {
  const ouvertes = OUVERTES_INDEX.get(cle(racine, qualite, basse)) ?? [];
  const cleMobile = basse === null ? qualite : `${qualite}/${(basse - racine + 12) % 12}`;
  // 1re position : celle d'avant DA-4 — la forme ouverte, sinon la plus basse de `MOBILES` (jamais une seconde).
  const premiere = sansDoublon([...ouvertes, ...poser(racine, MOBILES[cleMobile] ?? [])])[0];
  if (!premiere) return [];
  const candidates = sansDoublon([premiere, ...ouvertes, ...formesMobiles(racine, cleMobile)]);
  const reste = candidates
    .slice(1)
    .filter((d) => !candidates.some((e) => e !== d && contenue(d, e)))
    .sort((x, y) => plusPetiteCase(x) - plusPetiteCase(y));
  // Les suivantes dans d'autres zones du manche, de la plus basse à la plus haute ; à défaut, les formes restantes.
  const retenues = [premiere];
  for (const d of reste) {
    if (retenues.length === MAX_DOIGTES) break;
    if (retenues.every((r) => Math.abs(plusPetiteCase(r) - plusPetiteCase(d)) >= ECART_ZONES)) retenues.push(d);
  }
  for (const d of reste) {
    if (retenues.length === MAX_DOIGTES) break;
    if (!retenues.includes(d)) retenues.push(d);
  }
  return [premiere, ...retenues.slice(1).sort((x, y) => plusPetiteCase(x) - plusPetiteCase(y))];
}

/**
 * Les doigtés d'un accord, trois au plus (DA-4, R2) : la 1re position d'avant (ouverte, sinon la mobile la plus
 * basse), puis deux autres dans d'autres zones du manche (plus basses cases pressées à 3 cases au moins l'une de
 * l'autre), de la plus basse à la plus haute.
 * Un accord avec basse que la table ne connaît pas rend ceux de l'accord sans sa basse, et `basseAJouer` dit la
 * basse à ajouter. Aucun doigté connu → `doigtes` vide (« Pas encore de doigté »).
 */
export function positionsGuitare(a: Accord): { doigtes: Doigte[]; basseAJouer: string | null } {
  const racine = noteToIndex(a.fondamentale);
  const basse = a.basse ? noteToIndex(a.basse) : null;
  if (basse !== null && basse !== racine) {
    const avecBasse = formes(racine, a.qualite, basse);
    if (avecBasse.length) return { doigtes: avecBasse, basseAJouer: null };
    const sansBasse = formes(racine, a.qualite, null);
    return { doigtes: sansBasse, basseAJouer: sansBasse.length ? a.basse : null };
  }
  return { doigtes: formes(racine, a.qualite, null), basseAJouer: null };
}
