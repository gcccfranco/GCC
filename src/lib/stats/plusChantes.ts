// « Les plus chantés à GCC » de Chants (agencement v18, A8 de docs/spec-agencement-v18.md) : le
// calcul des Statistiques (`statsChants`, pur), sans filtre, sur les 92 jours avant aujourd'hui
// (« ces 3 derniers mois »), les six premiers.

import { statsChants, veille, type LigneChant } from "@/lib/stats/chantsJoues";

export const JOURS_PLUS_CHANTES = 92;

type Args = Parameters<typeof statsChants>;

/** Le premier jour compté : 92 jours avant `aujourdhui` (AAAA-MM-JJ). */
export function debutPlusChantes(aujourdhui: string): string {
  return new Date(Date.parse(`${aujourdhui}T00:00:00Z`) - JOURS_PLUS_CHANTES * 86_400_000).toISOString().slice(0, 10);
}

/** Les `n` chants les plus présents dans les setlists publiées du 92e jour avant aujourd'hui à hier.
 *  Seulement ceux du recueil : un chant retiré, encore dans une setlist, ne prend ni place ni rang
 *  (l'écran ne saurait pas l'afficher), et les rangs suivent, de 1 à `n`. */
export function plusChantes(setlists: Args[0], index: Args[1], aujourdhui: string, n = 6): LigneChant[] {
  const periode = { du: debutPlusChantes(aujourdhui), au: veille(aujourdhui) };
  const auRecueil = new Set(index.map((c) => c.slug));
  return statsChants(setlists, index, { periode, service: null, langue: null, presidence: null }, aujourdhui).plusJoues
    .filter((ligne) => auRecueil.has(ligne.slug))
    .slice(0, n)
    .map((ligne, i) => ({ ...ligne, rang: i + 1 }));
}
