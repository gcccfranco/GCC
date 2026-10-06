"use client"

import { useEffect, useState } from "react"
import { fetchGrille } from "./grille"
import { listProfiles } from "@/lib/firebase/users"
import type { CompteDuPlanning } from "./choisir"

/**
 * Ce qu'une page de planning donne à `PlanningGrille` en plus des lignes :
 * les dimanches déjà écrits dans l'app (les autres viennent encore du Sheet,
 * une première écriture doit les recopier — cf. `semer`) et, pour qui remplit,
 * les comptes que « Choisir » propose (lot U2, P9 ; remplace l'autocomplétion D12).
 * Même code pour les onze grilles (19/09/2026).
 */
export function useGrilleApp(key: string, peutModifier: boolean) {
  const [datesDansLApp, setDatesDansLApp] = useState<string[]>([])
  const [comptes, setComptes] = useState<CompteDuPlanning[]>([])

  useEffect(() => {
    let vivant = true
    fetchGrille(key).then((g) => { if (vivant) setDatesDansLApp(g.map((r) => r[0])) })
    return () => { vivant = false }
  }, [key])

  useEffect(() => {
    if (!peutModifier) return
    let vivant = true
    listProfiles()
      .then((ps) => {
        if (vivant) setComptes(ps.map((p) => ({ nom: p.planningName, prenom: p.firstName, nomDeFamille: p.lastName, serviceRoles: p.serviceRoles })))
      })
      .catch(() => { /* comptes en moins, nom écrit à la main inchangé */ })
    return () => { vivant = false }
  }, [peutModifier])

  return { datesDansLApp, comptes }
}
