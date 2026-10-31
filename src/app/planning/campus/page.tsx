"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CAMP_LOUANGE_FALLBACK, CAMP_ENT_FALLBACK } from "@/lib/planning/data"
import { fetchCampus, fetchCampusGrilles } from "@/lib/planning/sheets"
import type { CampusSeance } from "@/lib/planning/utils"
import { getAnnee } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { PlanningGrille } from "@/components/planning/PlanningGrille"
import { AnneeSelecteur } from "@/components/planning/AnneeSelecteur"
import { OngletsRail } from "@/components/layout/Onglets"
import { BarreDeGrille, FiltreDeNom, compterCasesVides, useFiltreNom } from "@/components/planning/BarreDeGrille"
import { AjouterDate } from "@/components/planning/AjouterDate"
import { GRILLE_CAMPUS_MATIN, GRILLE_CAMPUS_SOIR, PREMIERE_ANNEE_APP, anneesDuPlanning, lignesDeLAnnee, lignesSimples } from "@/lib/planning/grilles"
import { useGrilleApp } from "@/lib/planning/useGrilleApp"
import { poserDate } from "@/lib/firebase/planningGrille"
import { noterChangement } from "@/lib/firebase/planningHistorique"
import { historyAuthor } from "@/lib/firebase/setlistHistory"
import { useProfile } from "@/lib/firebase/users"
import { canEditPlanning, isAdminUser } from "@/lib/access"
import { BACK_OFFICE } from "@/lib/backOffice"
import { useGestionPlanning } from "@/lib/planning/gestion"
import { AncienTableau } from "./AncienTableau"
import { CarteJourCampus, groupByDay } from "@/components/planning/CarteJourCampus"
import { EtatVide } from "@/components/layout/EtatVide"

// Campus : les cartes Louange / Répétition restent la lecture ; le volet
// « Grille » (19/09/2026, lot 17 G6) montre les deux grilles, matin puis soir,
// treize cases par séance, remplies dans l'app par qui en a le droit. Une case
// écrite dans la grille se retrouve dans les cartes au retour sur le volet.
// Lot U2 (P2) : un sélecteur d'année pour les trois volets ; dès 2027, les
// séances se posent dans l'app (« Ajouter une séance », date et moment) et une
// séance posée par erreur se retire (Q10).

const COLOR = PLANNING_COLORS.campus

type CampusSub = "louange" | "entrainement" | "grille"

function CampusPage() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const [louange, setLouange] = useState<CampusSeance[]>(CAMP_LOUANGE_FALLBACK)
  const [entrainement, setEntrainement] = useState<CampusSeance[]>(CAMP_ENT_FALLBACK)
  const [grilles, setGrilles] = useState<{ matin: string[][]; soir: string[][] }>({ matin: [], soir: [] })
  const [sub, setSub] = useState<CampusSub>("louange")
  const [loading, setLoading] = useState(true)

  const gestion = useGestionPlanning()
  const filtre = useFiltreNom()
  const peutMatin = gestion && canEditPlanning(user, profile, GRILLE_CAMPUS_MATIN.key)
  const peutSoir = gestion && canEditPlanning(user, profile, GRILLE_CAMPUS_SOIR.key)
  const matinApp = useGrilleApp(GRILLE_CAMPUS_MATIN.key, peutMatin)
  const soirApp = useGrilleApp(GRILLE_CAMPUS_SOIR.key, peutSoir)

  const chargerCartes = () =>
    fetchCampus().then(({ louange: l, entrainement: e }) => {
      if (l.length) setLouange(l)
      if (e.length) setEntrainement(e)
    })

  useEffect(() => {
    chargerCartes().finally(() => setLoading(false))
    fetchCampusGrilles().then(setGrilles)
  }, [])

  // Au changement de volet, on relit : une case écrite dans la grille doit se
  // voir dans les cartes (le cache de la grille est déjà vidé par l'écriture).
  function changerVolet(s: CampusSub) {
    setSub(s)
    if (s === "grille") void fetchCampusGrilles().then(setGrilles)
    else void chargerCartes()
  }

  // L'année suivante : d'office pour qui remplit, pour tous dès sa première séance posée (Q4).
  const anneeCourante = new Date().getFullYear()
  const [anneeChoisie, setAnnee] = useState(anneeCourante)
  const toutes = [...grilles.matin, ...grilles.soir]
  const annees = anneesDuPlanning(anneeCourante, peutMatin || peutSoir || toutes.some((r) => getAnnee(r[0]) === anneeCourante + 1))
  const effAnnee = annees.includes(anneeChoisie) ? anneeChoisie : anneeCourante
  const dansLApp = effAnnee >= PREMIERE_ANNEE_APP

  const data = (sub === "louange" ? louange : entrainement).filter((s) => getAnnee(s.date) === effAnnee)
  const { days, order } = groupByDay(data)
  const annee = t("planning.grille.periodeAnnee", { annee: effAnnee })
  const exporter = { annee: effAnnee, rang: 1, tout: isAdminUser(user) }
  const vide = dansLApp ? t("planning.annee.aucun", { annee: effAnnee }) : undefined
  const relire = () => void fetchCampusGrilles().then(setGrilles)
  const retrait = { libelle: t("planning.annee.retirerSeance"), onRetire: relire }
  const lignesMatin = lignesSimples(lignesDeLAnnee(GRILLE_CAMPUS_MATIN, effAnnee, grilles.matin))
  const lignesSoir = lignesSimples(lignesDeLAnnee(GRILLE_CAMPUS_SOIR, effAnnee, grilles.soir))
  const vides = compterCasesVides(GRILLE_CAMPUS_MATIN, lignesMatin) + compterCasesVides(GRILLE_CAMPUS_SOIR, lignesSoir)
  const moments = [
    ...(peutMatin ? [{ valeur: "matin", libelle: t("planning.campus.morning") }] : []),
    ...(peutSoir ? [{ valeur: "soir", libelle: t("planning.campus.evening") }] : []),
  ]

  async function ajouterSeance(date: string, moment?: string) {
    const definition = moment === "soir" ? GRILLE_CAMPUS_SOIR : GRILLE_CAMPUS_MATIN
    const deja = (moment === "soir" ? grilles.soir : grilles.matin).some((r) => r[0] === date)
    if (!deja) {
      const auteur = historyAuthor(profile)
      await poserDate(definition, date, auteur?.name ?? "")
      if (auteur) await noterChangement(definition.key, auteur, { kind: "dimanche", date, retire: false })
    }
    setGrilles(await fetchCampusGrilles())
  }

  return (
    // Agencement v18 : la rangée sur toute la largeur, la vue (Louange · Répétition · Grille) en rail ;
    // le volet Grille porte treize colonnes, toute la largeur ; les cartes des jours, en grille de deux dès 1 024 px.
    <div className="max-w-full space-y-4">
      <BarreDeGrille
        titre={t("planning.pages.campus")}
        couleur={COLOR}
        detail={annee}
        sousTitreBO={[t("planning.pages.campus"), t("planning.barre.casesVidesAnnee", { count: vides })].join(" · ")}
        chargement={loading}
      >
        <OngletsRail
          etiquette={t("planning.barre.vue")}
          onglets={(["louange", "entrainement", "grille"] as CampusSub[]).map((v) => ({
            id: v,
            label: v === "louange" ? t("planning.campus.louange") : v === "entrainement" ? t("planning.campus.repetition") : t("planning.campus.grille"),
          }))}
          actif={sub}
          choisir={(v) => changerVolet(v as CampusSub)}
        />
        <AnneeSelecteur annees={annees} annee={effAnnee} onChange={setAnnee} />
        {sub === "grille" && <FiltreDeNom filtre={filtre} couleur={COLOR} />}
      </BarreDeGrille>

      {sub === "grille" && (
        <div className="space-y-6">
          {moments.length > 0 && dansLApp && <AjouterDate annee={effAnnee} moments={moments} onAjouter={ajouterSeance} />}
          <PlanningGrille
            definition={GRILLE_CAMPUS_MATIN}
            lignesDuPlanning={grilles.matin}
            periode={annee}
            filtre={filtre}
            legende={t("planning.campus.morning")}
            lignes={lignesMatin}
            peutModifier={peutMatin}
            datesDansLApp={matinApp.datesDansLApp}
            comptes={matinApp.comptes}
            absenceDe={matinApp.absenceDe}
            exporter={peutMatin ? exporter : undefined}
            vide={vide}
            retrait={retrait}
          />
          <PlanningGrille
            definition={GRILLE_CAMPUS_SOIR}
            lignesDuPlanning={grilles.soir}
            periode={annee}
            filtre={filtre}
            legende={t("planning.campus.evening")}
            lignes={lignesSoir}
            peutModifier={peutSoir}
            datesDansLApp={soirApp.datesDansLApp}
            comptes={soirApp.comptes}
            absenceDe={soirApp.absenceDe}
            // Un seul « Exporter » dans l'en-tête (v18, B6) : la page exportée mêle matin et soir.
            exporter={peutSoir && !peutMatin ? exporter : undefined}
            vide={vide}
            retrait={retrait}
          />
        </div>
      )}

      {sub !== "grille" && order.length === 0 && (
        <EtatVide>{t("planning.campus.noSeance")}</EtatVide>
      )}

      {sub !== "grille" && order.length > 0 && (
      <div data-testid="campus-cartes" className="grid items-start gap-4 lg:grid-cols-2">
      {order.map(day => (
        <CarteJourCampus key={day} day={day} seances={days[day]} entrainement={sub === "entrainement"} />
      ))}
      </div>
      )}
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? CampusPage : AncienTableau
