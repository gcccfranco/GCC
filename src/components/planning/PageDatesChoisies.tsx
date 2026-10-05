"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { AjouterDate } from "@/components/planning/AjouterDate"
import { PREMIERE_ANNEE_APP, anneesDuPlanning, dimanchesDe, lignesDeLAnnee, lignesSimples, type DefinitionGrille } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { poserDate } from "@/lib/firebase/planningGrille"
import { noterChangement } from "@/lib/firebase/planningHistorique"
import { historyAuthor } from "@/lib/firebase/setlistHistory"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"

// Interfranco et Intergroupe (lot 17, G6 ; lot U2, P2) : une page par service,
// toute l'année affichée, sans publication par trimestre. Les dates se
// choisissent (Q3) : dès 2027, le responsable pose ses dimanches — jamais un
// dimanche que l'autre service a déjà pris (Q5) — et peut en retirer un posé
// par erreur (Q10). Avant 2027, le Sheet porte les dates.

export function PageDatesChoisies({ definition, lire, lireAutre }: {
  definition: DefinitionGrille
  /** Le planning : grille de l'app et Sheet réunis (`fetchInterfranco`…). */
  lire: () => Promise<string[][]>
  /** L'autre service : un dimanche qu'il tient n'est pas proposé. */
  lireAutre: () => Promise<string[][]>
}) {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const [rows, setRows] = useState<string[][]>([])
  const [autre, setAutre] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const peutModifier = canEditPlanning(user, profile, definition.key)
  const { datesDansLApp, comptes } = useGrilleApp(definition.key, peutModifier)

  const recharger = () => lire().then(setRows).catch(() => { /* lignes d'avant gardées */ })
  useEffect(() => {
    lire().then(setRows).catch(() => {}).finally(() => setLoading(false))
    lireAutre().then(setAutre).catch(() => {})
  }, [lire, lireAutre])

  // Q4 : sans publication, l'année suivante se voit dès sa première date posée ;
  // le responsable la voit d'office, pour y poser ses dimanches.
  const anneeCourante = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeCourante)
  const annees = anneesDuPlanning(anneeCourante, peutModifier || lignesDeLAnnee(definition, anneeCourante + 1, rows).length > 0)
  const effAnnee = annees.includes(annee) ? annee : anneeCourante
  const lignes = lignesDeLAnnee(definition, effAnnee, rows)
  const dansLApp = effAnnee >= PREMIERE_ANNEE_APP

  const pris = new Set([...lignes, ...lignesDeLAnnee(definition, effAnnee, autre)].map((r) => r[0]))
  const proposes = dimanchesDe(effAnnee).filter((d) => !pris.has(d))

  async function ajouter(date: string) {
    const auteur = historyAuthor(profile)
    await poserDate(definition, date, auteur?.name ?? "")
    if (auteur) await noterChangement(definition.key, auteur, { kind: "dimanche", date, retire: false })
    await recharger()
  }

  return (
    <div className="max-w-full space-y-4 mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-foreground">{t(definition.i18nTitre)}</h2>
          <AnneeSelecteur annees={annees} annee={effAnnee} onChange={setAnnee} />
        </div>
        {loading && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>}
      </div>

      {peutModifier && dansLApp && <AjouterDate annee={effAnnee} dimanches={proposes} onAjouter={ajouter} />}

      <PlanningGrille
        definition={definition}
        periode={t("planning.grille.periodeAnnee", { annee: effAnnee })}
        lignes={lignesSimples(lignes)}
        peutModifier={peutModifier}
        datesDansLApp={datesDansLApp}
        comptes={comptes}
        exporter={peutModifier ? { annee: effAnnee, rang: 1, tout: isAdminUser(user) } : undefined}
        vide={dansLApp ? t("planning.annee.aucun", { annee: effAnnee }) : undefined}
        retrait={{ libelle: t("planning.annee.retirer"), onRetire: () => void recharger() }}
      />
    </div>
  )
}
