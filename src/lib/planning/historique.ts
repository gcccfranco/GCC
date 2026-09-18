// Historique nommé d'un planning rempli dans l'app (lot 17, décisions T6 et D8).
//
// Module PUR, comme `src/lib/setlist/history.ts` : les changements sont stockés
// EN DONNÉES et leurs phrases construites à l'affichage, pour qu'elles existent
// en français et en 中文.

export type ChangementGrille = {
  kind: "case"
  /** Dimanche, AAAA-MM-JJ. */
  date: string
  /** Clé de colonne (`piano`…), cf. ColonneGrille. */
  colonne: string
  from: string
  to: string
}

/** Clé de phrase (planning.grille.*) d'un changement. */
export function phraseDuChangement(c: ChangementGrille): "remplace" | "ajoute" | "efface" {
  if (!c.to) return "efface"
  return c.from ? "remplace" : "ajoute"
}

/**
 * Les changements d'un même passage (D8) : une SEULE ligne par case, de l'avant
 * du premier passage à l'après du dernier — Christelle qui remplit un trimestre
 * laisse une entrée, pas trois cents. Une case revenue à sa valeur de départ
 * disparaît de l'entrée.
 */
export function fusionnerChangements(
  prior: ChangementGrille[],
  nouveau: ChangementGrille
): ChangementGrille[] {
  const meme = (c: ChangementGrille) => c.date === nouveau.date && c.colonne === nouveau.colonne
  const deja = prior.find(meme)
  if (!deja) return [...prior, nouveau]
  const fusion = { ...deja, to: nouveau.to }
  return prior.flatMap((c) => (meme(c) ? (fusion.from === fusion.to ? [] : [fusion]) : [c]))
}
