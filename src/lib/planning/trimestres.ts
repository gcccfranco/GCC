// Trimestres d'un planning : ordre, rang, visibilité (lot U2). Module FEUILLE, sans import : `grilles.ts` le
// lit au chargement. Ces fonctions vivaient dans `releases.ts`, qui tire `push/audiences` et les
// organigrammes, lesquels ramènent à `grilles.ts` : la boucle laissait `GRILLES` non initialisé quand
// `grilles.ts` se chargeait le premier (« Cannot access 'GRILLES' before initialization »). `releases.ts`
// les réexporte.

export const TRI_ORDER = ["T1", "T2", "T3", "T4"] as const
type Tri = (typeof TRI_ORDER)[number]

export function triRank(tri: string): number {
  return TRI_ORDER.indexOf(tri as Tri)
}

interface TriVisibility {
  tri: string
  /** Affiché à l'utilisateur courant ? (membre : courant/passé OU publié ; publieur : toujours) */
  visible: boolean
  /** Trimestre futur non encore publié → badge « Non publié » (vu par les publieurs uniquement). */
  unpublished: boolean
}

/** Décide, pour chaque trimestre, sa visibilité et l'état « non publié ».
 *  Règle membre : visible si `triRank(tri) <= triRank(courant)` (le trimestre
 *  courant et les passés s'affichent toujours) OU s'il est publié. Un publieur
 *  (`canPublish`) voit tout, les trimestres futurs non publiés étant marqués
 *  pour relecture avant publication. */
export function triVisibilities(
  available: readonly string[],
  published: string[],
  currentTri: string,
  canPublish: boolean
): TriVisibility[] {
  const cur = triRank(currentTri)
  return available.map((tri) => {
    const futureUnpublished = triRank(tri) > cur && !published.includes(tri)
    return { tri, visible: canPublish || !futureUnpublished, unpublished: futureUnpublished }
  })
}

/** Lot U2 : les trimestres d'une année choisie dans le sélecteur. Année passée :
 *  tout se lit. Année en cours : `triVisibilities`. Année suivante : un
 *  trimestre sort quand il est publié ; avant, seuls ceux qui voient le
 *  brouillon (qui remplit ou publie ce planning, les admins) le voient, marqué. */
export function triVisibilitiesAnnee(
  annee: number,
  anneeCourante: number,
  published: string[],
  currentTri: string,
  voitBrouillon: boolean
): TriVisibility[] {
  if (annee < anneeCourante) return TRI_ORDER.map((tri) => ({ tri, visible: true, unpublished: false }))
  if (annee === anneeCourante) return triVisibilities(TRI_ORDER, published, currentTri, voitBrouillon)
  return TRI_ORDER.map((tri) => {
    const pub = published.includes(tri)
    return { tri, visible: pub || voitBrouillon, unpublished: !pub }
  })
}
