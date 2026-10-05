"use client"

// Écran « Scène · mettre en place les réservations » (lot U1, planche
// bo-scene-reservations) : en-tête du programme, carte « Mettre en place la
// saison » à gauche, aperçu de ce que verront les groupes à droite (dessous sur
// téléphone et tablette portrait). Jusqu'au lot U6 il s'ouvre dans l'onglet
// « Scène » de la section Évènements ; U6 le range tel quel dans le Back-Office.

import { useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { Check, Drama } from "lucide-react"
import { updateProgramme } from "@/lib/firebase/programmes"
import { saisonDe } from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Creneau, Passage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Apercu } from "./Apercu"
import { OrdrePassage } from "./OrdrePassage"
import { ProgrammeForm, type ProgrammeValues } from "./ProgrammeForm"
import { SaisonForm, type SaisonPatch } from "./SaisonForm"
import { dateCourte, jourEnLettres } from "./libelles"

const COLOR = PLANNING_COLORS.scene

export function SaisonEcran({ programme, creneaux, onChanged, onClose }: {
  programme: Programme
  creneaux: Creneau[]
  onChanged: () => Promise<void>
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [modifier, setModifier] = useState(false)
  const [ordre, setOrdre] = useState(false)
  const [error, setError] = useState("")
  const saison = saisonDe(programme)

  async function ecrire(patch: Partial<Programme>) {
    setError("")
    try { await updateProgramme(programme.id, patch); await onChanged() } catch { setError(t("planning.programmes.error")) }
  }

  async function enregistrerProgramme(values: ProgrammeValues) {
    await ecrire(values)
    setModifier(false)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="basis-full flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold svc-ink" style={{ "--svc": COLOR } as CSSProperties}>
            <Drama className="h-3.5 w-3.5" aria-hidden /> {t("planning.saison.label")}
          </p>
          <Button size="sm" variant="ghost" className="-my-1" onClick={onClose}>{t("planning.saison.fermer")}</Button>
        </div>
        <div className="min-w-0">
          <h2 className="text-[26px] sm:text-[30px] leading-tight font-bold tracking-tight">{t("planning.saison.titre", { nom: programme.nom })}</h2>
          <p className="text-[13px] text-muted-foreground">
            <span>{t("planning.programmes.jourJLabel", { date: jourEnLettres(programme.jourJ, i18n.language) })}</span>
            {" · "}
            <button type="button" className="font-semibold text-foreground underline-offset-4 hover:underline" onClick={() => setModifier(!modifier)}>
              {t("planning.scene.editProgramme")}
            </button>
          </p>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" aria-expanded={ordre} onClick={() => setOrdre(!ordre)}>{t("planning.saison.programmeJourJ")}</Button>
          {saison.ouvert ? (
            <p className="text-sm font-semibold svc-ink" style={{ "--svc": COLOR } as CSSProperties}>
              {t("planning.saison.ouvertes", { from: dateCourte(saison.debut, i18n.language), to: dateCourte(saison.fin, i18n.language) })}
            </p>
          ) : (
            <Button size="sm" className="text-white" style={{ background: COLOR }} onClick={() => ecrire({ ouvert: true })}>
              <Check aria-hidden /> {t("planning.saison.ouvrir")}
            </Button>
          )}
        </div>
      </header>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {modifier && (
        <ProgrammeForm
          title={t("planning.programmes.editTitle", { nom: programme.nom })}
          initial={{ nom: programme.nom, jourJ: programme.jourJ }}
          apres={programme.fin ?? programme.debut}
          submitLabel={t("planning.programmes.save")}
          onSubmit={enregistrerProgramme}
          onCancel={() => setModifier(false)}
        />
      )}

      {/* Sous l'en-tête, près de son bouton : la saison est longue sur téléphone. */}
      {ordre && (
        <OrdrePassage
          passages={programme.passages}
          canEdit
          onSave={async (passages: Passage[]) => { await updateProgramme(programme.id, { passages }); await onChanged() }}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <SaisonForm key={programme.id} programme={programme} onSave={(patch: SaisonPatch) => ecrire(patch)} />
        <Apercu programme={programme} creneaux={creneaux} onChanged={onChanged} />
      </div>
    </div>
  )
}
