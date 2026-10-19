"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { fdFullL } from "@/lib/planning/utils"

// Lot U2 (Q3, docs/spec-planning-2027.md) : poser une date sur un planning à
// dates choisies. Interfranco et Intergroupe : un dimanche de l'année, parmi
// ceux que ni ce planning ni l'autre service n'ont pris (`dimanches`). Campus :
// une séance, un jour quelconque de l'année, et son moment (`moments`).

type Moment = { valeur: string; libelle: string }

export function AjouterDate({ annee, dimanches, moments, onAjouter }: {
  annee: number
  /** Les dimanches proposés ; absent = un jour quelconque de l'année (Campus). */
  dimanches?: readonly string[]
  /** Campus : les moments où la personne peut écrire. */
  moments?: readonly Moment[]
  onAjouter: (date: string, moment?: string) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const [date, setDate] = useState("")
  const [moment, setMoment] = useState("")
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState(false)

  // Un dimanche choisi qui n'est plus proposé (posé entre-temps) : le premier de la liste.
  const choisie = dimanches ? (dimanches.includes(date) ? date : (dimanches[0] ?? "")) : date
  const leMoment = moments?.some((m) => m.valeur === moment) ? moment : (moments?.[0]?.valeur ?? "")
  if (dimanches && dimanches.length === 0) return null

  async function ajouter() {
    if (!choisie) return
    setEnCours(true)
    setEchec(false)
    try {
      await onAjouter(choisie, moments ? leMoment : undefined)
      if (!dimanches) setDate("")
    } catch {
      setEchec(true)
    } finally {
      setEnCours(false)
    }
  }

  const champ = "h-10 sm:h-8 rounded-full border border-transparent bg-secondary px-3 text-[16px] sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {dimanches ? (
        <select aria-label={t("planning.annee.choisirDate")} value={choisie} onChange={(e) => setDate(e.target.value)} className={champ}>
          {dimanches.map((d) => <option key={d} value={d}>{fdFullL(d, i18n.language)}</option>)}
        </select>
      ) : (
        <>
          <input
            type="date"
            aria-label={t("planning.annee.dateSeance")}
            min={`${annee}-01-01`}
            max={`${annee}-12-31`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={champ}
          />
          {moments && (
            <select aria-label={t("planning.annee.moment")} value={leMoment} onChange={(e) => setMoment(e.target.value)} className={champ}>
              {moments.map((m) => <option key={m.valeur} value={m.valeur}>{m.libelle}</option>)}
            </select>
          )}
        </>
      )}
      <button
        type="button"
        onClick={() => void ajouter()}
        disabled={enCours || !choisie || !choisie.startsWith(`${annee}-`)}
        className="inline-flex h-10 sm:h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-semibold text-background transition-[opacity,transform] duration-150 active:scale-[.96] disabled:opacity-40 cursor-pointer disabled:cursor-default"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t(dimanches ? "planning.annee.ajouter" : "planning.annee.ajouterSeance")}
      </button>
      {echec && <span role="alert" className="text-xs text-destructive">{t("planning.grille.droitRetire")}</span>}
    </div>
  )
}
