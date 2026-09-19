"use client"

import { useEffect, useState } from "react"
import { fetchGrille } from "./grille"
import { listProfiles } from "@/lib/firebase/users"

/**
 * Ce qu'une page de planning donne à `PlanningGrille` en plus des lignes :
 * les dimanches déjà écrits dans l'app (les autres viennent encore du Sheet,
 * une première écriture doit les recopier — cf. `semer`) et, pour qui remplit,
 * les noms de planning des comptes pour l'autocomplétion (D12).
 * Même code pour les onze grilles (19/09/2026).
 */
export function useGrilleApp(key: string, peutModifier: boolean) {
  const [datesDansLApp, setDatesDansLApp] = useState<string[]>([])
  const [nomsDesComptes, setNomsDesComptes] = useState<string[]>([])

  useEffect(() => {
    let vivant = true
    fetchGrille(key).then((g) => { if (vivant) setDatesDansLApp(g.map((r) => r[0])) })
    return () => { vivant = false }
  }, [key])

  useEffect(() => {
    if (!peutModifier) return
    let vivant = true
    listProfiles()
      .then((ps) => { if (vivant) setNomsDesComptes(ps.map((p) => p.planningName).filter(Boolean)) })
      .catch(() => { /* suggestions en moins, saisie libre inchangée */ })
    return () => { vivant = false }
  }, [peutModifier])

  return { datesDansLApp, nomsDesComptes }
}
