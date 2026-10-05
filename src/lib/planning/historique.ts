// Historique nommé d'un planning rempli dans l'app (lot 17, décisions T6 et D8).
//
// Module PUR, comme `src/lib/setlist/history.ts` : les changements sont stockés
// EN DONNÉES et leurs phrases construites à l'affichage, pour qu'elles existent
// en français et en 中文.

export type ChangementCase = {
  kind: "case"
  /** Dimanche, AAAA-MM-JJ. */
  date: string
  /** Clé de colonne (`piano`…), cf. ColonneGrille. */
  colonne: string
  from: string
  to: string
}

/** L'import initial depuis le Google Sheet (G4, D8) : une seule entrée. */
export type ChangementImport = { kind: "import"; count: number }

/** Lot U2 (Q3, Q10) : une date posée ou retirée (Interfranco, Intergroupe, Campus). */
export type ChangementDimanche = { kind: "dimanche"; date: string; retire: boolean }

export type ChangementGrille = ChangementCase | ChangementImport | ChangementDimanche

/** Clé de phrase (planning.grille.*) d'un changement. */
export function phraseDuChangement(c: ChangementGrille): "remplace" | "ajoute" | "efface" | "importe" | "pose" | "retire" {
  if (c.kind === "import") return "importe"
  if (c.kind === "dimanche") return c.retire ? "retire" : "pose"
  if (!c.to) return "efface"
  return c.from ? "remplace" : "ajoute"
}

/**
 * Les changements d'un même passage (D8) : une SEULE ligne par case, de l'avant
 * du premier passage à l'après du dernier — Christelle qui remplit un trimestre
 * laisse une entrée, pas trois cents. Une case revenue à sa valeur de départ
 * disparaît de l'entrée ; une date posée puis retirée aussi. Une entrée
 * d'import ne se fusionne avec rien.
 */
export function fusionnerChangements(
  prior: ChangementGrille[],
  nouveau: ChangementGrille
): ChangementGrille[] {
  if (nouveau.kind === "dimanche") {
    const inverse = (c: ChangementGrille) => c.kind === "dimanche" && c.date === nouveau.date && c.retire !== nouveau.retire
    return prior.some(inverse) ? prior.filter((c) => !inverse(c)) : [...prior, nouveau]
  }
  if (nouveau.kind !== "case") return [...prior, nouveau]
  const meme = (c: ChangementGrille): c is ChangementCase =>
    c.kind === "case" && c.date === nouveau.date && c.colonne === nouveau.colonne
  const deja = prior.find(meme)
  if (!deja) return [...prior, nouveau]
  const fusion: ChangementCase = { ...deja, to: nouveau.to }
  return prior.flatMap((c): ChangementGrille[] => (meme(c) ? (fusion.from === fusion.to ? [] : [fusion]) : [c]))
}
