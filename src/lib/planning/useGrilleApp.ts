"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchCasesEcrites, fetchGrille } from "./grille"
import { lireAnnonces } from "./releases"
import type { EtatAnnonce } from "./prevenir"
import { listProfiles } from "@/lib/firebase/users"
import type { CompteDuPlanning } from "./choisir"

/**
 * Ce qu'une page de planning donne à `PlanningGrille` en plus des lignes :
 * les dimanches déjà écrits dans l'app (les autres viennent encore du Sheet,
 * une première écriture doit les recopier — cf. `semer`) et, pour qui remplit,
 * les comptes que « Choisir » propose (lot U2, P9 ; remplace l'autocomplétion D12) et que
 * « Prévenir des changements » relie aux noms (lot 3, PG-E : `avecComptes` vaut aussi pour qui publie
 * sans remplir). `ecrites` : les cases présentes dans les documents de l'app, `date|clé`.
 * Même code pour les onze grilles (19/09/2026).
 */
export function useGrilleApp(key: string, avecComptes: boolean) {
  const [datesDansLApp, setDatesDansLApp] = useState<string[]>([])
  const [ecrites, setEcrites] = useState<ReadonlySet<string>>(new Set())
  const [comptes, setComptes] = useState<CompteDuPlanning[]>([])

  useEffect(() => {
    let vivant = true
    fetchGrille(key).then((g) => { if (vivant) setDatesDansLApp(g.map((r) => r[0])) })
    fetchCasesEcrites(key).then((e) => { if (vivant) setEcrites(e) })
    return () => { vivant = false }
  }, [key])

  useEffect(() => {
    if (!avecComptes) return
    let vivant = true
    listProfiles()
      .then((ps) => {
        if (vivant) setComptes(ps.map((p) => ({ nom: p.planningName, prenom: p.firstName, nomDeFamille: p.lastName, serviceRoles: p.serviceRoles })))
      })
      .catch(() => { /* comptes en moins, nom écrit à la main inchangé */ })
    return () => { vivant = false }
  }, [avecComptes])

  return { datesDansLApp, comptes, ecrites }
}

/**
 * Lot 3 (PG36, PG47) : ce qui a été annoncé de chaque trimestre d'une année, par trimestre ; `null`
 * tant que la lecture n'est pas revenue. `relire` après un envoi ou « Ne pas prévenir ».
 */
export function useEtatsAnnonces(key: string, annee: number, actif: boolean) {
  const id = `${key}_${annee}`
  const [lu, setLu] = useState<{ id: string; etats: Record<string, EtatAnnonce> } | null>(null)
  const relire = useCallback(async () => { setLu({ id, etats: await lireAnnonces(key, annee) }) }, [id, key, annee])

  useEffect(() => {
    if (!actif) return
    let vivant = true
    lireAnnonces(key, annee).then((etats) => { if (vivant) setLu({ id, etats }) })
    return () => { vivant = false }
  }, [actif, id, key, annee])

  return { etats: lu?.id === id ? lu.etats : null, relire }
}
