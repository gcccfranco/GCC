"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { fetchCasesEcrites, fetchGrille } from "./grille"
import { lireAnnonces } from "./releases"
import type { EtatAnnonce } from "@/types/planning"
import { listProfiles, useProfile } from "@/lib/firebase/users"
import { listGroupes } from "@/lib/firebase/groupes"
import { groupeDe } from "@/lib/groupes/organigramme"
import { TABLE_GROUPES } from "@/lib/groupes/table"
import { BACK_OFFICE } from "@/lib/backOffice"
import { listerToutesAbsences } from "@/lib/firebase/absences"
import { canVoirAbsencesDeTous } from "@/lib/access"
import { rolesDeService } from "@/lib/acces/rolesDeService"
import { normalizeName } from "./names"
import type { Absence } from "@/types/absence"
import type { OrganigrammeGroupe } from "@/types/groupe"
import { absenceLe, type CompteDuPlanning } from "./choisir"

/**
 * Ce qu'une page de planning donne à `PlanningGrille` en plus des lignes :
 * les dimanches déjà écrits dans l'app (les autres viennent encore du Sheet,
 * une première écriture doit les recopier — cf. `semer`) et, pour qui remplit,
 * les comptes que « Choisir » propose (lot U2, P9 ; remplace l'autocomplétion D12) et que
 * « Prévenir des changements » relie aux noms (lot 3, PG-E : `avecComptes` vaut aussi pour qui publie
 * sans remplir). `ecrites` : les cases présentes dans les documents de l'app, `date|clé`.
 * Même code pour les onze grilles (19/09/2026).
 */
export function useGrilleApp(key: string, avecComptes: boolean, avecGroupe = false) {
  const [datesDansLApp, setDatesDansLApp] = useState<string[]>([])
  const [ecrites, setEcrites] = useState<ReadonlySet<string>>(new Set())
  const [comptes, setComptes] = useState<CompteDuPlanning[]>([])
  const [comptesLus, setComptesLus] = useState(false)
  // SC3.4 : les absences de tous, pour qui fait les plannings (« Choisir » les range à part).
  const { user, profile } = useProfile()
  const [absences, setAbsences] = useState<Absence[]>([])
  const voitAbsences = avecComptes && canVoirAbsencesDeTous(user, profile)
  // Lot 2 (OG-F) : l'organigramme du groupe dont c'est le planning, au Back-Office seulement (OG27) ;
  // sans lui, « Choisir » ne change pas (OG30).
  const [groupe, setGroupe] = useState<OrganigrammeGroupe | undefined>(undefined)

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
        if (vivant) setComptesLus(true)
        if (vivant) setComptes(ps.map((p) => ({ nom: p.planningName, prenom: p.firstName, nomDeFamille: p.lastName, serviceRoles: rolesDeService(p), uid: p.uid, groupe: groupeDe(p) })))
      })
      .catch(() => { /* comptes en moins, nom écrit à la main inchangé */ })
    return () => { vivant = false }
  }, [avecComptes])

  useEffect(() => {
    if (!voitAbsences) return
    let vivant = true
    listerToutesAbsences()
      .then((l) => { if (vivant) setAbsences(l) })
      .catch(() => { /* sans les absences, « Choisir » reste celui d'avant */ })
    return () => { vivant = false }
  }, [voitAbsences])

  // Le nom de planning d'un compte relie l'absence (par l'uid) à la case de la grille.
  const absencesParNom = useMemo(() => {
    const m = new Map<string, Absence[]>()
    if (!voitAbsences) return m
    const nomDe = new Map(comptes.filter((c) => c.uid).map((c) => [c.uid!, normalizeName(c.nom)]))
    for (const a of absences) {
      const nom = nomDe.get(a.uid)
      if (nom) m.set(nom, [...(m.get(nom) ?? []), a])
    }
    return m
  }, [voitAbsences, absences, comptes])
  const absenceDe = useCallback(
    (nom: string, date: string): Absence | null => absenceLe(absencesParNom.get(normalizeName(nom)) ?? [], date),
    [absencesParNom],
  )

  useEffect(() => {
    setGroupe(undefined)
    const def = TABLE_GROUPES.find((g) => g.planning === key)
    if (!BACK_OFFICE || !avecGroupe || !def) return
    let vivant = true
    listGroupes()
      .then((l) => { if (vivant) setGroupe(l.find((x) => x.groupe.id === def.id)?.groupe) })
      .catch(() => { /* sans l'organigramme, « Choisir » reste celui d'avant */ })
    return () => { vivant = false }
  }, [key, avecGroupe])

  // Sans les comptes, les titulaires avec compte manqueraient : « Choisir » reste celui d'avant.
  return { datesDansLApp, comptes, ecrites, groupe: comptesLus ? groupe : undefined, absenceDe }
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
