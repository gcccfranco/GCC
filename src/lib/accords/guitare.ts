// Dictionnaire d'accords (lot DA) — les doigtés de guitare. Tout vient de la table écrite à la main
// (`table.ts`) : jamais de doigté calculé autrement. Cordes indexées de la 6e (grave) à la 1re (aiguë).
import { noteToIndex } from "@/lib/transpose";
import { analyserAccord, type Accord } from "./analyse";
import { MOBILES, OUVERTES } from "./table";

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

/** Les formes mobiles de la clé (qualité, ou qualité/intervalle de la basse), posées sur cette fondamentale
 *  (classe de hauteur). Exporté pour le garde-fou, qui les vérifie toutes sur les douze fondamentales. */
export function formesMobiles(racine: number, cleMobile: string): Doigte[] {
  const sortie: Doigte[] = [];
  for (const [corde, intervalle, decalages, doigts, barre] of MOBILES[cleMobile] ?? []) {
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

function formes(racine: number, qualite: string, basse: number | null): Doigte[] {
  const ouvertes = OUVERTES_INDEX.get(cle(racine, qualite, basse)) ?? [];
  const cleMobile = basse === null ? qualite : `${qualite}/${(basse - racine + 12) % 12}`;
  const toutes = [...ouvertes, ...formesMobiles(racine, cleMobile)];
  const vues = new Set<string>();
  return toutes
    .filter((d) => {
      const k = d.cases.join(",");
      if (vues.has(k)) return false;
      vues.add(k);
      return true;
    })
    .slice(0, MAX_DOIGTES);
}

/**
 * Les doigtés d'un accord : ouverts d'abord, puis les formes mobiles de la plus basse à la plus haute, trois au plus.
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
