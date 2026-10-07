"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { CAMP_LOUANGE_FALLBACK, CAMP_ENT_FALLBACK } from "@/lib/planning/data"
import { fetchCampus, fetchCampusGrilles } from "@/lib/planning/sheets"
import type { CampusSeance } from "@/lib/planning/utils"
import { fdLongL, getAnnee } from "@/lib/planning/utils"
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

// Campus : les cartes Louange / Répétition restent la lecture ; le volet
// « Grille » (19/09/2026, lot 17 G6) montre les deux grilles, matin puis soir,
// treize cases par séance, remplies dans l'app par qui en a le droit. Une case
// écrite dans la grille se retrouve dans les cartes au retour sur le volet.
// Lot U2 (P2) : un sélecteur d'année pour les trois volets ; dès 2027, les
// séances se posent dans l'app (« Ajouter une séance », date et moment) et une
// séance posée par erreur se retire (Q10).

const COLOR = PLANNING_COLORS.campus

type CampusSub = "louange" | "entrainement" | "grille"

function groupByDay(seances: CampusSeance[]) {
  const days: Record<string, CampusSeance[]> = {}
  const order: string[] = []
  for (const s of seances) {
    const day = s.d.split(" ")[0]
    if (!days[day]) { days[day] = []; order.push(day) }
    days[day].push(s)
  }
  return { days, order }
}

function Chip({ label }: { label: string }) {
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground mr-1 mb-1">{label}</span>
}

function CampusPage() {
  const { t, i18n } = useTranslation()
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
    // le volet Grille porte treize colonnes, toute la largeur ; les cartes gardent leur colonne.
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
            periode={annee}
            filtre={filtre}
            legende={t("planning.campus.morning")}
            lignes={lignesMatin}
            peutModifier={peutMatin}
            datesDansLApp={matinApp.datesDansLApp}
            comptes={matinApp.comptes}
            exporter={peutMatin ? exporter : undefined}
            vide={vide}
            retrait={retrait}
          />
          <PlanningGrille
            definition={GRILLE_CAMPUS_SOIR}
            periode={annee}
            filtre={filtre}
            legende={t("planning.campus.evening")}
            lignes={lignesSoir}
            peutModifier={peutSoir}
            datesDansLApp={soirApp.datesDansLApp}
            comptes={soirApp.comptes}
            // Un seul « Exporter » dans l'en-tête (v18, B6) : la page exportée mêle matin et soir.
            exporter={peutSoir && !peutMatin ? exporter : undefined}
            vide={vide}
            retrait={retrait}
          />
        </div>
      )}

      {sub !== "grille" && order.length === 0 && (
        <div className="max-w-2xl text-center py-12 text-sm text-muted-foreground">{t("planning.campus.noSeance")}</div>
      )}

      {sub !== "grille" && order.map(day => (
        <div key={day} className="max-w-2xl bg-card shadow-soft rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: COLOR }}>{day}</div>
          {days[day].map((s, i) => {
            const isSoir = !s.d.includes("Matin")
            const moment = isSoir ? t("planning.campus.evening") : t("planning.campus.morning")
            const choristes = s.ch.split(",").map(c => c.trim()).filter(Boolean)
            const musiciens = s.mu.split(",").map(m => m.trim()).filter(Boolean)
            const regie = s.rg.split(",").map(r => r.trim()).filter(Boolean)

            return (
              <div key={i} className="border-t border-border">
                {sub === "entrainement" && s.ent && (
                  <div className="px-4 py-2 text-xs font-semibold text-white" style={{ background: COLOR }}>
                    {t("planning.campus.repetitionLabel")} <span className="font-normal">
                      {fdLongL(s.ent, i18n.language)}
                      {s.entTime ? ` ${t("planning.campus.atTime", { time: s.entTime })}` : ""}
                      {s.entLieu ? ` — ${s.entLieu}` : ""}
                    </span>
                  </div>
                )}
                <div className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wide ${isSoir ? "bg-muted/60 text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {sub === "entrainement" ? s.d : moment}
                </div>
                <div className="grid grid-cols-2 border-b border-border">
                  <div className="px-4 py-3 border-r border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.presChoristes")}</p>
                    {s.pres && (
                      <p className="text-sm font-semibold mb-1" style={{ color: COLOR }}>{s.pres}</p>
                    )}
                    {choristes.map(c => <Chip key={c} label={c} />)}
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.musiciens")}</p>
                    {musiciens.map(m => <Chip key={m} label={m} />)}
                  </div>
                </div>
                {regie.length > 0 && (
                  <div className="px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs border-b border-border bg-background">
                    {regie.map(r => {
                      const [role, name] = r.split(":").map(x => x.trim())
                      return (
                        <span key={r}>
                          <span className="text-muted-foreground">{role}</span>
                          {name && <span className="font-semibold text-foreground ml-1">{name}</span>}
                        </span>
                      )
                    })}
                  </div>
                )}
                <div className="px-4 py-3 bg-secondary/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t("planning.campus.chants")}</p>
                  <div className="space-y-1">
                    {(s.chants.some(c => c?.trim()) ? s.chants : ["","","",""]).map((c, ci) => (
                      <div key={ci} className={`text-xs px-3 py-1.5 rounded-lg border ${c?.trim() ? "border-border bg-card text-foreground font-medium" : "border-dashed border-border text-muted-foreground"}`}>
                        {c?.trim() || t("planning.campus.chantN", { n: ci + 1 })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Back-office coupé (lot 18) : le tableau d'avant, lu dans le Sheet seul.
export default BACK_OFFICE ? CampusPage : AncienTableau
