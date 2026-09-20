"use client"

// Période d'inscription (docs/spec-inscriptions-periode.md, 17/09/2026) : le
// réglage Automatique · Ouvertes · Fermées, partagé par le formulaire et le
// panneau de l'organisateur, et la phrase qui dit pourquoi on ne peut pas
// s'inscrire (fiche, panneau, carte de la liste).

import { useTranslation } from "react-i18next"
import type { RefusInscription } from "@/lib/evenements/agenda"
import { fdFullL } from "@/lib/planning/utils"
import { MODES_INSCRIPTIONS, type Evenement, type ModeInscriptions } from "@/types/evenement"

export function ChoixInscriptions({ label, mode, disabled, onChange }: {
  /** Nom du groupe, lu par les lecteurs d'écran. */
  label: string
  mode: ModeInscriptions
  disabled?: boolean
  onChange: (mode: ModeInscriptions) => void
}) {
  const { t } = useTranslation()
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-full bg-secondary p-1">
      {MODES_INSCRIPTIONS.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={disabled} onClick={() => onChange(m)}
          className={`rounded-full py-1.5 text-sm transition-colors ${mode === m ? "bg-card font-semibold text-foreground shadow-sm" : "text-muted-foreground"}`}>
          {t(`evenements.form.mode.${m}`)}
        </button>
      ))}
    </div>
  )
}

/** « lundi 5 octobre 2026 à 10:00 », ou « 5 oct. à 10:00 » en court. */
function quand(valeur: string, lang: string, court: boolean, aHeure: (jour: string, heure: string) => string): string {
  const [jour, heure] = valeur.split("T")
  const [y, m, d] = jour.split("-").map(Number)
  const date = court
    ? new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { day: "numeric", month: "short" })
    : fdFullL(jour, lang)
  return heure ? aHeure(date, heure) : date
}

/** La phrase d'un refus d'inscription (hors « Complet », dit à part). */
export function useRaisonInscription() {
  const { t, i18n } = useTranslation()
  const aHeure = (jour: string, heure: string) => t("evenements.aHeure", { jour, heure })
  return (e: Pick<Evenement, "inscriptionDebut" | "inscriptionFin">, refus: Exclude<RefusInscription, "complet">, court = false): string => {
    if (refus === "pasEncore") return t("evenements.raison.pasEncore", { quand: quand(e.inscriptionDebut ?? "", i18n.language, court, aHeure) })
    if (refus === "terminee") return t("evenements.raison.terminee", { quand: quand(e.inscriptionFin ?? "", i18n.language, court, aHeure) })
    return t(`evenements.raison.${refus}`)
  }
}
