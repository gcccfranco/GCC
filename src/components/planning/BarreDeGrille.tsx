"use client"

// La rangée de la grille d'un planning, la même dans l'App et au Back-Office (agencement v18,
// tranche T4a de docs/spec-agencement-v18.md : B6, B7, A2, A3 ; planches `v18-app-planning-grille-a`,
// `v18-app-planning-groupes`, `v18-bo-planning-a`). Sous l'en-tête de la section (titre « Planning ») :
//   App : pastille et nom du service en h2, « Dimanche 10:30 · 4e trimestre 2026 », puis à droite les
//         vues (Paix · Fidélité · Bonté…), la période (année et T1–T4 en rail) et les filtres ;
//   Back-Office : les plannings de la personne en pilules, l'actif à la couleur du service, puis la
//         même partie droite. Le planning, son horaire et ses cases vides vont dans le sous-titre de
//         l'en-tête, « Exporter » dans ses outils (`DansLEnTete`).
// Deux rangées de commandes au-dessus de la grille, au lieu de cinq.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { Lock, User, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Pilules, type OngletRail } from "@/components/layout/Onglets"
import { useProfile } from "@/lib/firebase/users"
import { planningsDuBackOffice } from "@/lib/access"
import { useGestionPlanning } from "@/lib/planning/gestion"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { colonnesVides } from "@/lib/planning/casesVides"
import type { DefinitionGrille, LigneGrille } from "@/lib/planning/grilles"

// ─── Les emplacements de l'en-tête du Back-Office ──────────────────────────────

/** Posés par l'en-tête du Planning du Back-Office : la page y écrit son sous-titre et ses outils. */
export const EmplacementsEnTete = createContext<{ sousTitre: HTMLElement | null; outils: HTMLElement | null } | null>(null)

/** Rend `children` dans l'en-tête de la section (sous-titre ou outils). Sans en-tête qui
 *  l'accueille (l'App), les outils restent en place et le sous-titre ne paraît pas. */
export function DansLEnTete({ ou, children }: { ou: "sousTitre" | "outils"; children: ReactNode }) {
  const emplacements = useContext(EmplacementsEnTete)
  if (!emplacements) return ou === "outils" ? <>{children}</> : null
  const cible = emplacements[ou]
  return cible ? createPortal(children, cible) : null
}

// ─── Le filtre « Mon prénom » et « Mes dates » ─────────────────────────────────

export type FiltreNom = {
  nom: string
  changerNom: (v: string) => void
  /** Efface le nom (et « Mes dates »). */
  effacer: () => void
  mesDates: boolean
  basculerMesDates: () => void
  aUnNom: boolean
  /** La case porte-t-elle le nom ? */
  estMoi: (cell: string) => boolean
}

/** Le prénom mémorisé sur l'appareil, prérempli depuis le profil (comme `PlanningTable`), et
 *  « Mes dates ». Tenu par la page : la rangée l'affiche, la grille (ou les deux de Campus) le suit. */
export function useFiltreNom(): FiltreNom {
  const { profile } = useProfile()
  const [nom, setNom] = useState("")
  const [mesDates, setMesDates] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("planningName")
      if (saved) { setNom(saved); return }
    } catch { /* stockage indisponible */ }
    if (profile?.planningName) setNom(profile.planningName)
  }, [profile])

  function changerNom(v: string) {
    setNom(v)
    try { localStorage.setItem("planningName", v) } catch { /* ignore */ }
  }
  const aiguille = nom.trim().toLowerCase()
  const aUnNom = aiguille.length >= 2
  return {
    nom,
    changerNom,
    effacer: () => { changerNom(""); setMesDates(false) },
    mesDates,
    basculerMesDates: () => setMesDates((v) => !v),
    aUnNom,
    estMoi: (cell: string) => aUnNom && cell.toLowerCase().includes(aiguille),
  }
}

/** « Mon prénom ✕ » puis « Mes dates » (planche App). Au Back-Office, « Mes dates » seul
 *  (planche BO) : le nom vient du profil ou de l'appareil. */
export function FiltreDeNom({ filtre, couleur }: { filtre: FiltreNom; couleur: string }) {
  const { t } = useTranslation()
  const gestion = useGestionPlanning()
  return (
    <>
      {!gestion && (
        <div className="relative w-[180px] shrink-0">
          <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={filtre.nom}
            onChange={(e) => filtre.changerNom(e.target.value)}
            placeholder={t("planning.table.myName")}
            className="h-9 w-full rounded-full border border-border bg-card pl-8 pr-8 text-[16px] font-semibold text-foreground placeholder:font-normal sm:text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          {filtre.nom && (
            <button
              type="button"
              onClick={filtre.effacer}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2.5 text-muted-foreground hover:text-foreground active:text-foreground"
              aria-label={t("planning.table.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {filtre.aUnNom && (
        <button
          type="button"
          aria-pressed={filtre.mesDates}
          onClick={filtre.basculerMesDates}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96] cursor-pointer ${
            filtre.mesDates ? "text-white" : "border border-border bg-card text-foreground hover:bg-secondary"
          }`}
          style={filtre.mesDates ? { background: couleur } : undefined}
        >
          {gestion && <User className="h-3.5 w-3.5" aria-hidden />}
          {t("planning.table.myDates")}
        </button>
      )}
    </>
  )
}

// ─── La période ─────────────────────────────────────────────────────────────────

/** Les trimestres d'un rail : un trimestre non publié (vu par un responsable) porte un cadenas. */
export function ongletsDePeriode(periodes: readonly string[], nonPubliees: readonly string[] = [], libelle?: (p: string) => string): OngletRail[] {
  return periodes.map((p) => ({
    id: p,
    label: nonPubliees.includes(p)
      ? <>{libelle ? libelle(p) : p}<Lock className="h-3 w-3 opacity-70" aria-hidden /></>
      : (libelle ? libelle(p) : p),
  }))
}

/** « 4e trimestre 2026 », « 2026年第四季度 ». */
export function useTrimestreEnLettres() {
  const { t } = useTranslation()
  return (tri: string, annee: number) => t(`planning.barre.trimestres.${tri}`, { annee, defaultValue: `${tri} ${annee}` })
}

/** Les cases à remplir d'une période (ni optionnelles, ni en lecture seule) : le sous-titre du Back-Office. */
export function compterCasesVides(definition: DefinitionGrille, lignes: readonly LigneGrille[]): number {
  return lignes.reduce((n, l) => n + colonnesVides(definition, l.row).length, 0)
}

// ─── La rangée ──────────────────────────────────────────────────────────────────

/** Les plannings de la personne au Back-Office, en pilules (B6). */
function PlanningsDuBackOffice() {
  const { t } = useTranslation()
  const { user, profile } = useProfile()
  const chemin = usePathname() ?? ""
  const actif = chemin.split("/")[3] ?? null
  const couleurs: Record<string, string | undefined> = PLANNING_COLORS
  return (
    <Pilules
      etiquette={t("backOffice.plannings")}
      compact
      valeur={actif}
      choisir={() => {}}
      obligatoire
      options={planningsDuBackOffice(user, profile).map((k) => ({
        cle: k,
        nom: t(`planning.tabs.${k}`),
        couleur: couleurs[k],
        href: `/back-office/planning/${k}`,
      }))}
    />
  )
}

export function BarreDeGrille({
  titre,
  couleur,
  detail,
  sousTitreBO,
  chargement,
  children,
}: {
  /** Le service (h2 dans l'App) : « Culte Franco », « Groupes ». */
  titre: string
  couleur: string
  /** « Dimanche 10:30 · 4e trimestre 2026 » (App). */
  detail?: string
  /** Au Back-Office, le sous-titre de l'en-tête : « Culte Franco · Dimanche 10:30 · 2 cases vides ce trimestre ». */
  sousTitreBO?: string
  chargement?: boolean
  /** À droite : vues (rail), sous-onglet (pilules), période (rail), filtres. */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const gestion = useGestionPlanning()
  const enCours = chargement && <span className="text-xs text-muted-foreground">{t("common.loading")}</span>
  return (
    // Au Back-Office, en grand, une seule rangée : les plannings défilent en largeur s'ils ne
    // tiennent pas à côté de la période (sept plannings et deux années à 1 280 px), estompés au bord.
    <div data-testid="barre-grille" className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 ${gestion ? "lg:flex-nowrap" : ""}`}>
      {gestion ? (
        <>
          <DansLEnTete ou="sousTitre">{sousTitreBO ?? titre}</DansLEnTete>
          {enCours && <DansLEnTete ou="outils">{enCours}</DansLEnTete>}
          <div className="min-w-0 max-w-full lg:flex-1 lg:[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]">
            <PlanningsDuBackOffice />
          </div>
        </>
      ) : (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 self-center rounded-full" style={{ background: couleur }} />
          <h2 className="text-[22px] font-bold leading-7 text-foreground">{titre}</h2>
          {detail && <span className="text-[14px] text-muted-foreground">{detail}</span>}
          {enCours}
        </div>
      )}
      {children && <div className={`flex max-w-full flex-wrap items-center gap-2 ${gestion ? "lg:shrink-0 lg:flex-nowrap" : ""}`}>{children}</div>}
    </div>
  )
}
