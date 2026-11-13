import { useState } from "react"
import type { DefinitionGrille } from "@/lib/planning/grilles"
import { getHistoriqueGrille, type EntreeGrille } from "@/lib/firebase/planningHistorique"

/** Le panneau d'historique de la grille : ouvert ou non, ses entrées, et leur relecture. */
export function useHistoriqueGrille(definition: DefinitionGrille) {
  const [histoOuvert, setHistoOuvert] = useState(false)
  const [entrees, setEntrees] = useState<EntreeGrille[]>([])

  async function rechargerHistorique() {
    try {
      setEntrees((await getHistoriqueGrille(definition.key, 20)).filter((e) => e.changes.length))
    } catch { /* historique illisible : le panneau reste vide */ }
  }

  return { histoOuvert, setHistoOuvert, entrees, rechargerHistorique }
}
