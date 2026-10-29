"use client"

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react"
import { ChevronDown, Copy, History, Lock, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useConfirmer } from "@/components/layout/Confirmer"
import { MenuActions } from "@/components/layout/MenuActions"
import { currentSundayStr, fdFullL, fdLongL, fdShort, getAnnee, getMois, moisName } from "@/lib/planning/utils"
import { PREMIERE_ANNEE_APP, type ColonneGrille, type DefinitionGrille, type LigneGrille } from "@/lib/planning/grilles"
import { phraseDuChangement } from "@/lib/planning/historique"
import { ecrireCases, retirerDate } from "@/lib/firebase/planningGrille"
import { getHistoriqueGrille, noterChangements, type EntreeGrille } from "@/lib/firebase/planningHistorique"
import { historyAuthor } from "@/lib/firebase/setlistHistory"
import { useProfile } from "@/lib/firebase/users"
import { colonneDePersonnes, periodeAbsence, propositions, propositionsReliees, type CompteDuPlanning } from "@/lib/planning/choisir"
import type { Absence } from "@/types/absence"
import { roleDeColonne } from "@/lib/groupes/organigramme"
import { groupeDef } from "@/lib/groupes/table"
import type { OrganigrammeGroupe } from "@/types/groupe"
import { Link2 } from "lucide-react"
import { normalizeName, splitNames } from "@/lib/planning/names"
import { canRetirerDate, colonnesModifiables } from "@/lib/access"
import { ExportModele, type ExportPlanning } from "./ExportModele"
import { ChoisirNom, useOrdinateur } from "./ChoisirNom"
import { DansLEnTete, type FiltreNom } from "./BarreDeGrille"
import { useGestionPlanning } from "@/lib/planning/gestion"
import { colonnesACopier, datesApres, enTexteTabule, lignePrecedente, lireCollage, parDimanche, planCollage, planCopie, planRemplir, type CaseGeste } from "@/lib/planning/gestes"
import { BanniereGeste, BarreCollage, BarreSelection } from "./BanniereGeste"
import { useClavier, useSelectionGrille, type Poignees } from "./useSelectionGrille"
import { FenetreCopie, type DemandeCopie } from "./FenetreCopie"
import { PrevenirChangements, usePrevenir, type PrevenirProp } from "./PrevenirChangements"
import { styleTexteService } from "@/lib/couleurSombre"
import { EtatVide } from "@/components/layout/EtatVide"

// Grille d'un planning rempli dans l'app (lot 17, docs/spec-planning-grille.md).
// Table sur ordinateur et tablette — colonne des dates FIGÉE au défilement
// horizontal (11 colonnes ne tiennent pas dans une page) —, une carte par
// dimanche sur téléphone (T2). Grille CONTINUE avec « Voir plus tôt / plus
// tard » : les pilules de trimestre ont disparu, mais la publication par
// trimestre est appliquée ligne par ligne en amont (lignesPubliees, D7).
//
// `PlanningTable` reste intact : il sert sept autres onglets (D9). Ce composant
// lui reprend ce qui a fait ses preuves — « Mon prénom » mémorisé sur
// l'appareil, « Mes dates », séparateurs de mois, pastille « Cette semaine »,
// badge de date, cartes sur téléphone.

export interface PlanningGrilleProps {
  definition: DefinitionGrille
  /** Lignes déjà filtrées par la publication (lignesPubliees). */
  lignes: LigneGrille[]
  /** La personne peut-elle remplir les cases ? (canEditPlanning, au Back-Office seulement :
   *  lot U6, B2, Q14). Si oui, la grille s'ouvre directement en modification. */
  peutModifier: boolean
  /** Dimanches déjà écrits dans la grille de l'app — les autres viennent du Sheet. */
  datesDansLApp: readonly string[]
  /** Les comptes, pour « Choisir » (lot U2, P9 ; remplace l'autocomplétion D12). */
  comptes: readonly CompteDuPlanning[]
  /** SC3 (congés et absences) : l'absence d'un nom de planning à une date, pour qui fait les plannings ; absent, « Choisir » et les cases ne changent pas. */
  absenceDe?: (nom: string, date: string) => Absence | null
  /** Lot 2 (OG-F) : l'organigramme du groupe dont c'est le planning (page des groupes, Back-Office) : « Choisir » propose d'abord les titulaires du rôle relié à la colonne (OG29), et l'en-tête d'une colonne reliée porte l'icône de lien (OG31). */
  groupe?: OrganigrammeGroupe
  /** Badge optionnel à côté de la date (Sainte Cène), comme PlanningTable. */
  dateBadge?: (row: string[], allRows: string[][]) => ReactNode
  /** Période affichée (le trimestre choisi par la page), reprise par l'export. */
  periode: string
  /** « Mon prénom » et « Mes dates », tenus par la page et affichés dans la rangée de la grille
   *  (`BarreDeGrille`, agencement v18) : deux grilles d'une page (Campus) suivent le même. */
  filtre: FiltreNom
  /** Le nom de la grille quand la page en montre plusieurs (Campus : Matin, Soir). */
  legende?: string
  /** Lot U2 (Q5) : date → service (Interfranco, Intergroupe) qui tient ce
   *  dimanche, tiré de sa grille (`dimanchesSpeciaux`). La présidence affiche ce
   *  nom, non modifiable, et l'export le porte ; il n'est jamais recopié dans le
   *  document du groupe. */
  dimanchesSpeciaux?: Readonly<Record<string, string>>
  /** Lot U2, P7 : « Exporter (modèle du Sheet) », pour les responsables du
   *  planning (qui remplit, qui publie) et les admins (Q13) ; absent = pas d'export. */
  exporter?: ExportPlanning
  /** Texte d'une période sans ligne (« Aucun dimanche posé pour 2027. ») ;
   *  absent : « Planning à venir ». */
  vide?: string
  /** Lot U2 (Q10) : planning à dates choisies (Interfranco, Intergroupe,
   *  Campus). En modification, une date de l'année de l'app se retire, après
   *  confirmation (canRetirerDate) ; la page relit alors ses lignes. */
  retrait?: { libelle: string; onRetire: () => void }
  /** Lot 3 (PG10) : toutes les lignes du planning, toutes années, d'où se tire « le dimanche
   *  précédent » ; absent : les seules lignes affichées. */
  lignesDuPlanning?: readonly string[][]
  /** Lot 3 (PG33 à PG47) : le trimestre affiché est publié et la personne peut prévenir des changements
   *  (`peutPrevenir`, pas `peutModifier`) : bannière, points et feuille. Absent : rien de tout cela. */
  prevenir?: PrevenirProp
  /** Les cases écrites dans l'app (`date|clé`, `useGrilleApp`) : seules celles-ci peuvent être « changées » (PG38). */
  casesEcrites?: ReadonlySet<string>
}

const AVEC_SURVOL = "(hover: hover)"
const suivreSurvol = (rappel: () => void) => {
  const mq = window.matchMedia(AVEC_SURVOL)
  mq.addEventListener("change", rappel)
  return () => mq.removeEventListener("change", rappel)
}
/** Le pointeur peut-il survoler ? Oui : la pastille « Copier le … » ; non : le « ⋯ » du dimanche. */
const useSurvol = () => useSyncExternalStore(suivreSurvol, () => window.matchMedia(AVEC_SURVOL).matches, () => false)

/** Ce que le dernier geste a fait (PG6) : sa phrase, ses notes, et les cases à remettre (Annuler). */
type DernierGeste = { texte: string; notes: string[]; cases: CaseGeste[]; sansCompte?: string[] }

/** Un collage qui remplace des noms, en attente de « Coller » (PG29) : rien n'est encore écrit. */
type Collage = { cases: CaseGeste[]; remplace: number; notes: string[] }


export function PlanningGrille({
  definition,
  lignes,
  peutModifier,
  datesDansLApp,
  comptes,
  absenceDe,
  groupe,
  dateBadge,
  periode,
  filtre,
  legende,
  dimanchesSpeciaux,
  exporter,
  vide,
  retrait,
  lignesDuPlanning,
  prevenir,
  casesEcrites,
}: PlanningGrilleProps) {
  const { t, i18n } = useTranslation()
  const confirmer = useConfirmer()
  const { user, profile } = useProfile()
  const couleur = definition.couleur
  const sun = currentSundayStr()
  // Agencement v18 (A2) : dans l'App, la grille en carte, en-tête gris, la couleur du service sur
  // les dates seulement ; au Back-Office, l'en-tête de couleur de la planche `v18-bo-planning-a`.
  const app = !useGestionPlanning()

  // Lot U6, B2 (Q14, question 5 de U2) : plus de bouton « Modifier » ; qui peut remplir
  // la grille (au Back-Office) l'a directement en modification, les cases « Choisir ».
  const mode: "lecture" | "edition" = peutModifier ? "edition" : "lecture"
  const [modifs, setModifs] = useState<Record<string, string>>({})
  const [edition, setEdition] = useState<{ date: string; cle: string; valeur: string } | null>(null)
  // « Choisir » ouvert sur une case de personne (P9) ; la case cliquée pose le menu.
  const [choix, setChoix] = useState<{ l: LigneGrille; c: ColonneGrille; ancre: DOMRect } | null>(null)
  const [refus, setRefus] = useState<"" | "droitRetire" | "horsLigne">("")
  const [enregistre, setEnregistre] = useState(false)
  const [histoOuvert, setHistoOuvert] = useState(false)
  const [entrees, setEntrees] = useState<EntreeGrille[]>([])
  // Dimanches semés pendant la séance : leur document n'existait pas encore.
  const semes = useRef(new Set<string>())
  const [geste, setGeste] = useState<DernierGeste | null>(null)
  // Une écriture de geste est en cours : la grille est inerte (pastille, ⋯, Choisir, clavier) jusqu'à la fin.
  const [enCours, setEnCours] = useState(false)
  const enCoursRef = useRef(false)
  const fini = useRef(false)
  // « Copier le dimanche précédent » (PG13 à PG15) : le dimanche dont l'aperçu est posé, et la fenêtre.
  const [apercu, setApercu] = useState<string | null>(null)
  const [fenetreCopie, setFenetreCopie] = useState<DemandeCopie | null>(null)
  const survol = useSurvol()
  const [collage, setCollage] = useState<Collage | null>(null)
  // Un refus qui n'a rien écrit (collage ou ⌫ sans case à écrire) : il se dit, sans toucher à l'« Annuler » du dernier geste.
  const [avis, setAvis] = useState<string[]>([])
  const enveloppe = useRef<HTMLDivElement>(null)
  // Aide clavier derrière un « ? » (BO11) : fermée au départ, Échap la ferme et rend le focus au bouton.
  const [aideOuverte, setAideOuverte] = useState(false)
  const boutonAide = useRef<HTMLButtonElement>(null)
  const idAide = useId()
  const poignees = useRef<Poignees>(null as unknown as Poignees)
  const [posBarre, setPosBarre] = useState<CSSProperties | null>(null)
  const clavier = useClavier()

  const { mesDates, aUnNom, estMoi } = filtre

  // Un autre planning, une autre période : les cases du dernier geste ne sont plus sous les yeux (PG7).
  useEffect(() => { setGeste(null); setCollage(null); setAvis([]) }, [definition.key, periode])

  /** La présidence d'un dimanche d'Interfranco ou d'Intergroupe : le nom du service. */
  const imposee = (date: string, c: ColonneGrille) =>
    c.cle === "presidence" ? dimanchesSpeciaux?.[date] : undefined

  const valeur = (date: string, c: ColonneGrille, row: string[]) =>
    imposee(date, c) ?? modifs[`${date}|${c.cle}`] ?? row[c.index] ?? ""

  /** La ligne telle qu'elle est affichée (modifications locales comprises). */
  const ligneAffichee = (l: LigneGrille) => {
    const row = [...l.row]
    for (const c of definition.colonnes) row[c.index] = valeur(l.row[0], c, l.row)
    return row
  }

  /** La ligne à recopier (« semer ») : l'affichée, sauf une présidence imposée,
   *  qui reste celle du groupe — la marque n'entre jamais dans son document. */
  const ligneASemer = (l: LigneGrille) => {
    const row = ligneAffichee(l)
    for (const c of definition.colonnes) if (imposee(l.row[0], c)) row[c.index] = l.row[c.index] ?? ""
    return row
  }

  /** Toutes les lignes du planning par date : les lignes affichées l'emportent sur celles de la page. */
  const lignesParDate = new Map<string, string[]>()
  for (const row of lignesDuPlanning ?? []) lignesParDate.set(row[0], row)
  for (const l of lignes) lignesParDate.set(l.row[0], l.row)
  const datesDuPlanning = [...lignesParDate.keys()].sort()

  /** La valeur affichée d'une case, par date et clé de colonne (gestes, PG3). */
  const lireCase = (date: string, cle: string) => {
    const c = definition.colonnes.find((x) => x.cle === cle)
    return c ? valeur(date, c, lignesParDate.get(date) ?? []) : ""
  }
  /** Lot AO (B) : le référent Régie ne remplit que Sono, Sono Live et PPT (`colonnesModifiables` rend alors
   *  une liste). Ses autres colonnes restent en lecture. Et une date encore au Sheet n'est pas la sienne : la
   *  première écriture recopierait toutes les colonnes (« semer »), la règle la refuserait. */
  const seulesColonnes = (() => {
    const m = colonnesModifiables(user, profile, definition.key)
    return Array.isArray(m) ? (m as readonly string[]) : null
  })()
  const caseOuverte = (date: string, c: ColonneGrille) =>
    !c.lectureSeule &&
    (!seulesColonnes ||
      (seulesColonnes.includes(c.cle) && (getAnnee(date) >= PREMIERE_ANNEE_APP || datesDansLApp.includes(date))))
  /** Une case qu'un geste n'écrit jamais : présidence imposée, colonne en lecture seule (PG2). */
  const verrou = (date: string, cle: string) => {
    const c = definition.colonnes.find((x) => x.cle === cle)
    return !c || !caseOuverte(date, c) || !!imposee(date, c)
  }

  // La page donne les lignes du trimestre choisi (demande de Timothée du
  // 18/09/2026 : « L'affichage du planning doit être affiché trimestre par
  // trimestre ») : la grille n'a plus de fenêtre à elle.
  const dansLaFenetre = lignes
  const affichees = mesDates && aUnNom
    ? dansLaFenetre.filter((l) => definition.colonnes.some((c) => estMoi(valeur(l.row[0], c, l.row))))
    : dansLaFenetre
  const toutes = dansLaFenetre.map((l) => l.row)

  // Une colonne optionnelle (Sainte cène) ne s'affiche que si une case de la
  // période la porte — sauf en modification, où il faut pouvoir la remplir.
  const colonnes = definition.colonnes.filter(
    (c) =>
      !c.optionnelle ||
      mode === "edition" ||
      dansLaFenetre.some((l) => valeur(l.row[0], c, l.row).trim())
  )

  // Prévenir des changements (PG33 à PG47) : les cases changées depuis l'état annoncé (un point chacune).
  const ecritesAppEtSeance = new Set([...(casesEcrites ?? []), ...Object.keys(modifs)])
  const prev = usePrevenir({ prevenir, definition, rows: dansLaFenetre.map(ligneAffichee), speciaux: dimanchesSpeciaux, ecrites: ecritesAppEtSeance, comptes })
  const aChange = (date: string, cle: string) => prev.points.has(`${date}|${cle}`) || undefined
  const pointChange = (date: string, cle: string) => aChange(date, cle) && (
    <>
      <span aria-hidden data-point className="pointer-events-none absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-500" />
      <span className="sr-only">{t("planning.prevenir.caseChangee")}</span>
    </>
  )

  // SC3.6 (Q10) : un petit mot « absent » à côté du nom, la période en infobulle ; pas de notification.
  const marqueAbsent = (date: string, val: string) => {
    const absence = val ? absenceDe?.(val, date) : null
    return absence && (
      <span title={periodeAbsence(absence, i18n.language === "zh-CN" ? "zh" : "fr")} className="ml-1.5 text-[11px] text-amber-700 dark:text-amber-400">
        {t("planning.choisir.absentMarque")}
      </span>
    )
  }

  // Copier-coller au clavier (PG22 à PG32) : pointeur fin, tableau, grille en modification.
  const actifClavier = clavier && mode === "edition"
  const datesAffichees = affichees.map((l) => l.row[0])
  const clesAffichees = colonnes.map((c) => c.cle)
  const { sel, plage, choisir: choisirCase, etendre, effacer } = useSelectionGrille(datesAffichees, clesAffichees, actifClavier, poignees)
  const datesPlage = plage ? datesAffichees.slice(plage.r0, plage.r1 + 1) : []
  const clesPlage = plage ? clesAffichees.slice(plage.c0, plage.c1 + 1) : []
  useEffect(() => { effacer() }, [definition.key, periode, effacer])

  /** Copier le dimanche précédent sur `date` (PG10 à PG16) ; null : pas en modification. Un planning
   *  hebdomadaire dont le J−7 manque garde sa source (vide, PG10) ; à dates choisies sans date
   *  précédente, `source` est null. Dans les deux cas rien n'est offert (PG16). */
  const copiePour = (date: string) => {
    if (mode !== "edition") return null
    const source = lignePrecedente(definition, datesDuPlanning, date)
      ?? (definition.dates === "dimanches" ? new Date(new Date(`${date}T12:00:00Z`).getTime() - 7 * 86_400_000).toISOString().slice(0, 10) : null)
    if (!source) return { source: null, plan: { vides: [], remplace: [], verrouillees: 0 }, offert: false }
    const plan = planCopie({ colonnes: colonnesACopier(definition), source, cible: date, lire: lireCase, verrou })
    return { source, plan, offert: plan.vides.length + plan.remplace.length > 0 }
  }
  /** L'aide de l'infobulle et du menu : ce qui sera copié, et ce qui ne l'est pas (PG14, PG15). */
  const colonnesExclues = () =>
    definition.colonnes.filter((x) => x.cle === "orateur" || x.cle === "theme").map((x) => t(x.i18n)).join(", ")
  const aideCopie = (c: NonNullable<ReturnType<typeof copiePour>>) => {
    if (!c.source) return undefined
    const d = fdShort(c.source)
    if (!c.offert) return t("planning.gestes.rienACopier", { date: d })
    const base = c.plan.vides.length
      ? t("planning.gestes.copierAide", { date: d, count: c.plan.vides.length })
      : t("planning.gestes.copierAideRemplacer", { date: d, count: c.plan.remplace.length })
    const exclues = colonnesExclues()
    return exclues ? `${base} ${t("planning.gestes.exclues", { colonnes: exclues })}` : base
  }
  /** L'infobulle de la pastille (PG14) : « Les N cases vides reprennent le 17/1. … Un nom déjà posé reste. » */
  const infobulleCopie = (c: NonNullable<ReturnType<typeof copiePour>>) => {
    if (!c.source) return ""
    const d = fdShort(c.source)
    const exclues = colonnesExclues()
    return [
      c.plan.vides.length
        ? t("planning.gestes.copierInfobulle", { date: d, count: c.plan.vides.length })
        : t("planning.gestes.copierAideRemplacer", { date: d, count: c.plan.remplace.length }),
      exclues && t("planning.gestes.exclues", { colonnes: exclues }),
      c.plan.vides.length && t("planning.gestes.nomPoseReste"),
    ].filter(Boolean).join(" ")
  }
  /** « Remplir vers le bas » pour la case dont « Choisir » est ouvert (PG18, PG19) : null si la case
   *  ne porte pas un seul nom. Les dimanches sont les lignes données à la grille, « Mes dates » ignoré. */
  const remplirPour = () => {
    if (!choix || mode !== "edition" || !caseOuverte(choix.l.row[0], choix.c)) return null
    const date = choix.l.row[0]
    const nom = valeur(date, choix.c, choix.l.row).trim()
    if (!nom || !colonneDePersonnes(choix.c.cle) || splitNames(nom).length > 1 || imposee(date, choix.c)) return null
    return { nom, ...planRemplir({ cle: choix.c.cle, nom, dates: datesApres(lignes.map((l) => l.row[0]), date), lire: lireCase, verrou }) }
  }
  const remplissage = remplirPour()
  // L'aperçu n'est posé que si « Choisir » est un menu : en feuille, elle cacherait la grille (PG20).
  const menuOuvert = useOrdinateur()
  const apercuRemplir = remplissage && menuOuvert ? remplissage.cases : []
  const apercuCopie = [...(apercu ? copiePour(apercu)?.plan.vides ?? [] : []), ...apercuRemplir, ...(collage?.cases ?? [])]
  const casePrevue = (date: string, cle: string) => apercuCopie.find((c) => c.date === date && c.cle === cle)
  /** La case en aperçu (PG14) : le nom qui sera écrit, en gras, dans un cadre en pointillé. */
  const caseOuApercu = (l: LigneGrille, c: ColonneGrille): ReactNode => {
    const prevue = casePrevue(l.row[0], c.cle)
    // En orange quand l'aperçu remplace un nom (PG29).
    return prevue
      ? <span className={`block w-full min-h-8 rounded-md border border-dashed px-1.5 py-1 font-bold ${prevue.avant.trim() ? "border-orange-500 bg-orange-500/15" : ""}`} style={prevue.avant.trim() ? undefined : { borderColor: couleur }}>{prevue.apres}</span>
      : laCase(l, c)
  }

  function faireCopie(source: string, cible: string, cases: CaseGeste[], verrouillees: number) {
    void appliquer(
      cases,
      t("planning.gestes.copie", { cible: fdShort(cible), source: fdShort(source), count: cases.length }),
      verrouillees ? [t("planning.gestes.verrouillees", { count: verrouillees })] : [],
    )
  }
  /** Le geste (PG12, PG13) : sans fenêtre quand il ne tombe que dans des cases vides. */
  function copier(date: string) {
    const c = copiePour(date)
    setApercu(null)
    if (!c?.offert || !c.source) return
    if (c.plan.remplace.length) setFenetreCopie({ source: c.source, cible: date, vides: c.plan.vides, remplace: c.plan.remplace, verrouillees: c.plan.verrouillees })
    else faireCopie(c.source, date, c.plan.vides, c.plan.verrouillees)
  }
  function choixDeLaFenetre(choix: "vides" | "tout" | null) {
    const d = fenetreCopie
    setFenetreCopie(null)
    if (!d || !choix) return
    faireCopie(d.source, d.cible, choix === "tout" ? [...d.vides, ...d.remplace] : d.vides, d.verrouillees)
  }

  /** Le « ⋯ » du dimanche (PG15) : tablette, téléphone, et les cartes. */
  const menuCopie = (date: string) => {
    const c = copiePour(date)
    if (!c) return null
    return (
      <MenuActions
        onOuvert={(ouvert) => setApercu(ouvert ? date : null)}
        actions={[{ label: t("planning.gestes.copierPrecedent"), icone: Copy, aide: aideCopie(c), desactive: !c.offert, onSelect: () => copier(date) }]}
      />
    )
  }
  /** La pastille au survol de la ligne (PG14), dans la cellule de la date du tableau. */
  const pastilleCopie = (date: string) => {
    const c = copiePour(date)
    if (!c?.offert || !c.source) return null
    return (
      <>
      <button
        type="button"
        onClick={() => copier(date)}
        onMouseEnter={() => setApercu(date)}
        onMouseLeave={() => setApercu(null)}
        onFocus={() => setApercu(date)}
        onBlur={() => setApercu(null)}
        title={`${t("planning.gestes.copierPrecedent")}. ${infobulleCopie(c)}`}
        aria-describedby={`copie-aide-${date}`}
        className="mt-1 inline-flex min-h-7 items-center gap-1 rounded-full border border-dashed border-border bg-card px-2 text-[11px] font-semibold text-foreground opacity-0 transition-opacity hover:bg-secondary focus-visible:opacity-100 group-hover/ligne:opacity-100"
      >
        <Copy className="h-3 w-3" aria-hidden />
        {t("planning.gestes.copierLe", { date: fdShort(c.source) })}
      </button>
      <span id={`copie-aide-${date}`} className="sr-only">{infobulleCopie(c)}</span>
      </>
    )
  }

  const marqueApercu = (date: string, cle: string) => {
    const prevue = casePrevue(date, cle)
    return prevue ? (prevue.avant.trim() && collage?.cases.includes(prevue) ? "remplace" : "") : undefined
  }
  const rangDate = (date: string) => datesAffichees.indexOf(date)
  const dansGeste = (date: string, cle: string) => !!geste?.cases.some((c) => c.date === date && c.cle === cle)
  const largeurMin = 104 + 96 * colonnes.length

  async function rechargerHistorique() {
    try {
      setEntrees((await getHistoriqueGrille(definition.key, 20)).filter((e) => e.changes.length))
    } catch { /* historique illisible : le panneau reste vide */ }
  }

  function commencer(l: LigneGrille, c: ColonneGrille) {
    if (mode !== "edition") return
    fini.current = false
    setEnregistre(false)
    setEdition({ date: l.row[0], cle: c.cle, valeur: valeur(l.row[0], c, l.row) })
  }

  /** Enregistre la case : la valeur s'affiche tout de suite, le serveur tranche. */
  async function enregistrer(l: LigneGrille, c: ColonneGrille, apres: string) {
    const date = l.row[0]
    const avant = valeur(date, c, l.row)
    if (avant === apres || enCoursRef.current) return
    const cle = `${date}|${c.cle}`
    setModifs((m) => ({ ...m, [cle]: apres }))
    setRefus("")
    setGeste(null)
    const auteur = historyAuthor(profile)
    try {
      await ecrireCases({
        definition,
        date,
        valeurs: { [c.cle]: apres },
        auteur: auteur?.name ?? "",
        // Dimanche absent de la grille : ses autres cases viennent du Sheet, on
        // les recopie une fois, sans quoi la fusion les perdrait. Dès 2027 (lot
        // U2, Q2), rien à recopier : la case n'écrit qu'elle.
        semer: getAnnee(date) >= PREMIERE_ANNEE_APP || datesDansLApp.includes(date) || semes.current.has(date)
          ? undefined
          : ligneASemer(l),
      })
      semes.current.add(date)
      setEnregistre(true)
      if (auteur) {
        await noterChangements(definition.key, auteur, [{ kind: "case", date, colonne: c.cle, from: avant, to: apres }])
        if (histoOuvert) await rechargerHistorique()
      }
    } catch {
      // Droit retiré en cours de saisie (D6) : le refus du serveur est
      // l'information — la case revient à sa valeur, et l'écran le dit.
      setModifs((m) => {
        const n = { ...m }
        delete n[cle]
        return n
      })
      setRefus(typeof navigator !== "undefined" && navigator.onLine === false ? "horsLigne" : "droitRetire")
    }
  }

  /**
   * Applique un geste (PG4 à PG8) : les valeurs s'affichent, puis UN écrit par dimanche, dans l'ordre
   * des dates, et UN passage d'historique. Au premier refus, le geste s'arrête et les dimanches pas
   * encore écrits reprennent leur valeur. `texte` = la phrase de la bannière Annuler (null : Annuler
   * lui-même, pas de bannière). Rend les cases écrites.
   */
  async function appliquer(cases: CaseGeste[], texte: string | null, notes: string[] = [], sansCompte: string[] = []): Promise<CaseGeste[]> {
    if (!cases.length || enCoursRef.current) return []
    enCoursRef.current = true
    setEnCours(true)
    try {
      return await ecrireGeste(cases, texte, notes, sansCompte)
    } finally {
      enCoursRef.current = false
      setEnCours(false)
    }
  }

  async function ecrireGeste(cases: CaseGeste[], texte: string | null, notes: string[], sansCompte: string[]): Promise<CaseGeste[]> {
    setRefus("")
    setEnregistre(false)
    setGeste(null)
    setAvis([])
    setModifs((m) => {
      const n = { ...m }
      for (const c of cases) n[`${c.date}|${c.cle}`] = c.apres
      return n
    })
    const auteur = historyAuthor(profile)
    const ecrites: CaseGeste[] = []
    for (const groupe of parDimanche(cases)) {
      const duDimanche = cases.filter((c) => c.date === groupe.date)
      const l = lignes.find((x) => x.row[0] === groupe.date)
      try {
        await ecrireCases({
          definition,
          date: groupe.date,
          valeurs: groupe.champs,
          auteur: auteur?.name ?? "",
          semer: !l || getAnnee(groupe.date) >= PREMIERE_ANNEE_APP || datesDansLApp.includes(groupe.date) || semes.current.has(groupe.date)
            ? undefined
            : ligneASemer(l),
        })
        semes.current.add(groupe.date)
        ecrites.push(...duDimanche)
      } catch {
        const restantes = cases.filter((c) => !ecrites.includes(c))
        setModifs((m) => {
          const n = { ...m }
          for (const c of restantes) {
            if (c.avant) n[`${c.date}|${c.cle}`] = c.avant
            else delete n[`${c.date}|${c.cle}`]
          }
          return n
        })
        setRefus(typeof navigator !== "undefined" && navigator.onLine === false ? "horsLigne" : "droitRetire")
        break
      }
    }
    if (ecrites.length) {
      setEnregistre(true)
      if (auteur) {
        await noterChangements(definition.key, auteur, ecrites.map((c) => ({ kind: "case", date: c.date, colonne: c.cle, from: c.avant, to: c.apres })))
        if (histoOuvert) await rechargerHistorique()
      }
      if (texte) setGeste({ texte, notes, cases: ecrites, sansCompte })
    }
    return ecrites
  }

  // ── Copier-coller au clavier (PG23 à PG31) ──

  /** La plage en texte tabulé (PG25) ; une présidence imposée se copie vide. */
  function texteCopie() {
    return enTexteTabule(datesPlage, clesPlage, lireCase, (d, cle) => {
      const c = definition.colonnes.find((x) => x.cle === cle)
      return !!c && !!imposee(d, c)
    })
  }

  /** Les noms sans compte parmi les cases écrites (PG30) : aucun `planningName` ne leur correspond. */
  const connus = new Set(comptes.map((c) => normalizeName(c.nom)))
  function sansCompteDe(cases: CaseGeste[]) {
    const noms: string[] = []
    const cles: string[] = []
    for (const c of cases) {
      if (!colonneDePersonnes(c.cle)) continue
      const inconnus = splitNames(c.apres).filter((n) => !connus.has(normalizeName(n)))
      if (!inconnus.length) continue
      cles.push(`${c.date}|${c.cle}`)
      for (const n of inconnus) if (!noms.includes(n)) noms.push(n)
    }
    return { noms, cles }
  }
  const notesCollage = (p: { horsGrille: number; verrouillees: number; tropLongues?: number }, noms: string[]) => [
    ...(p.verrouillees ? [t("planning.gestes.verrouillees", { count: p.verrouillees })] : []),
    ...(p.tropLongues ? [t("planning.gestes.tropLongues", { count: p.tropLongues })] : []),
    ...(p.horsGrille ? [t("planning.gestes.horsGrille", { count: p.horsGrille })] : []),
    ...(noms.length
      ? [t("planning.gestes.sansCompte", {
          noms: noms.slice(0, 3).join(", ") + (noms.length > 3 ? ` ${t("planning.gestes.etAutres", { count: noms.length - 3 })}` : ""),
        })]
      : []),
  ]

  function collerCases(cases: CaseGeste[], p: { horsGrille: number; verrouillees: number; tropLongues?: number }) {
    const { noms, cles } = sansCompteDe(cases)
    const remplace = cases.filter((c) => c.avant.trim()).length
    void appliquer(cases, t("planning.gestes.colle", { count: cases.length, remplace }), notesCollage(p, noms), cles)
  }

  /** ⌘V (PG26 à PG29) : sans nom remplacé, le collage s'écrit ; sinon l'aperçu attend « Coller ». */
  function coller(texte: string) {
    if (!plage) return
    const bloc = lireCollage(texte)
    if (!bloc.length) return
    const p = planCollage({ bloc, ligne: plage.r0, col: plage.c0, dates: datesAffichees, cles: clesAffichees, lire: lireCase, verrou })
    if (!p.cases.length) {
      // Tout est refusé ou hors de la grille : on le dit, sans toucher à l'« Annuler » du dernier geste.
      setAvis(notesCollage(p, []))
      return
    }
    setAvis([])
    if (p.remplace) setCollage({ cases: p.cases, remplace: p.remplace, notes: notesCollage(p, []) })
    else collerCases(p.cases, p)
  }
  function validerCollage(videsSeulement: boolean) {
    const c = collage
    setCollage(null)
    if (!c) return
    const cases = videsSeulement ? c.cases.filter((x) => !x.avant.trim()) : c.cases
    // Les notes de l'aperçu (cases verrouillées, hors de la grille) sont refaites avec les noms sans compte.
    const { noms, cles } = sansCompteDe(cases)
    const remplace = cases.filter((x) => x.avant.trim()).length
    void appliquer(cases, t("planning.gestes.colle", { count: cases.length, remplace }), [...c.notes, ...notesCollage({ horsGrille: 0, verrouillees: 0 }, noms)], cles)
  }

  /** ⌫ (PG31) : vide les cases de la plage, sauf les verrouillées ; la même bannière Annuler. */
  function viderPlage() {
    const cases: CaseGeste[] = []
    let verrouillees = 0
    for (const d of datesPlage) for (const cle of clesPlage) {
      if (verrou(d, cle)) { verrouillees++; continue }
      const avant = lireCase(d, cle)
      if (avant.trim()) cases.push({ date: d, cle, avant, apres: "" })
    }
    const notes = verrouillees ? [t("planning.gestes.verrouillees", { count: verrouillees })] : []
    if (!cases.length) { setAvis(notes); return }
    void appliquer(cases, t("planning.gestes.videes", { count: cases.length }), notes)
  }

  poignees.current = {
    occupe: !!choix || !!edition || !!fenetreCopie || enCours,
    apercu: !!collage,
    texte: texteCopie,
    coller,
    vider: viderPlage,
    ouvrir: (c) => enveloppe.current?.querySelector<HTMLElement>(`[data-case="${c.date}|${c.cle}"] button`)?.click(),
    validerApercu: () => validerCollage(false),
    annulerApercu: () => setCollage(null),
  }

  // La barre de sélection se pose sous la dernière case de la plage (PG23).
  const derniere = plage ? `${datesAffichees[plage.r1]}|${clesAffichees[plage.c1]}` : ""
  useLayoutEffect(() => {
    const cadre = enveloppe.current
    const cellule = derniere ? cadre?.querySelector<HTMLElement>(`[data-case="${derniere}"]`) : null
    if (!cadre || !cellule) { setPosBarre(null); return }
    const c = cadre.getBoundingClientRect()
    const r = cellule.getBoundingClientRect()
    setPosBarre({ top: r.bottom - c.top + 6, left: Math.max(8, Math.min(r.left - c.left, c.width - 470)) })
  }, [derniere, affichees.length])

  /** Un clic choisit la case ; Maj + clic étend la plage sans rien ouvrir (PG23, PG24). */
  function surCase(e: MouseEvent, date: string, cle: string) {
    if (!actifClavier) return
    if (e.shiftKey && sel) { e.preventDefault(); e.stopPropagation(); etendre({ date, cle }) }
    else choisirCase({ date, cle })
  }
  /** Le trait de la plage, posé en ombre intérieure sur ses seules arêtes. */
  function styleCase(i: number, j: number, date: string, cle: string): CSSProperties | undefined {
    const fond = dansGeste(date, cle) ? `${couleur}22` : undefined
    if (!plage || i < plage.r0 || i > plage.r1 || j < plage.c0 || j > plage.c1) return fond ? { background: fond } : undefined
    const bords = [
      i === plage.r0 && `inset 0 2px 0 0 ${couleur}`,
      i === plage.r1 && `inset 0 -2px 0 0 ${couleur}`,
      j === plage.c0 && `inset 2px 0 0 0 ${couleur}`,
      j === plage.c1 && `inset -2px 0 0 0 ${couleur}`,
    ].filter(Boolean).join(", ")
    return { background: fond ?? `${couleur}12`, boxShadow: bords }
  }
  const marqueSelection = (i: number, j: number, date: string, cle: string) =>
    !plage || i < plage.r0 || i > plage.r1 || j < plage.c0 || j > plage.c1
      ? undefined
      : sel?.ancre.date === date && sel.ancre.cle === cle ? "ancre" : "plage"
  const dansSansCompte = (date: string, cle: string) => !!geste?.sansCompte?.includes(`${date}|${cle}`)

  /** Annuler (PG6) : réécrit les valeurs d'avant le geste, telles que la grille les avait. */
  async function annulerGeste() {
    if (!geste) return
    const cases = geste.cases.map((c) => ({ ...c, avant: c.apres, apres: c.avant }))
    await appliquer(cases, null)
  }

  /** Une date posée par erreur (Q10) : seulement en modification, dès l'année de l'app. */
  const peutRetirer = (date: string) =>
    !!retrait && mode === "edition" && getAnnee(date) >= PREMIERE_ANNEE_APP && canRetirerDate(user, profile, definition.key)

  async function retirer(date: string) {
    if (!retrait || !(await confirmer({ titre: t("planning.annee.confirmerRetrait", { date: fdFullL(date, i18n.language) }),
      texte: t("planning.annee.confirmerRetraitTexte"), action: t("common.buttons.remove"), destructif: true }))) return
    setRefus("")
    try {
      await retirerDate(definition, date)
    } catch {
      setRefus(typeof navigator !== "undefined" && navigator.onLine === false ? "horsLigne" : "droitRetire")
      return
    }
    const auteur = historyAuthor(profile)
    if (auteur) {
      await noterChangements(definition.key, auteur, [{ kind: "dimanche", date, retire: true }])
      if (histoOuvert) await rechargerHistorique()
    }
    retrait.onRetire()
  }

  const boutonRetirer = (date: string, avecTexte: boolean) => (
    <button
      type="button"
      onClick={() => void retirer(date)}
      aria-label={retrait?.libelle}
      title={retrait?.libelle}
      className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:bg-destructive/10"
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      {avecTexte && retrait?.libelle}
    </button>
  )

  function terminer(l: LigneGrille, c: ColonneGrille, commit: boolean) {
    if (fini.current) return
    fini.current = true
    const saisie = edition?.valeur ?? ""
    setEdition(null)
    if (commit) void enregistrer(l, c, saisie.trim())
  }

  // Fonctions, pas composants : un composant défini ici change d'identité à
  // chaque rendu et React remonterait le champ à chaque frappe (focus perdu).
  const champ = (l: LigneGrille, c: ColonneGrille) => (
      <input
        autoFocus
        type="text"
        aria-label={t(c.i18n)}
        value={edition?.valeur ?? ""}
        onChange={(e) => setEdition((ed) => (ed ? { ...ed, valeur: e.target.value } : ed))}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); terminer(l, c, true) }
          if (e.key === "Escape") { e.preventDefault(); terminer(l, c, false) }
        }}
        onBlur={() => terminer(l, c, true)}
        className="w-full min-w-0 rounded-md border px-2 py-1 text-[16px] sm:text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        style={{ borderColor: couleur }}
      />
  )

  function laCase(l: LigneGrille, c: ColonneGrille): ReactNode {
    const val = valeur(l.row[0], c, l.row)
    if (edition?.date === l.row[0] && edition.cle === c.cle) return champ(l, c)
    // Une colonne en lecture seule (le petit déj, géré dans sa carte) reste du texte.
    const modifiable = mode === "edition" && caseOuverte(l.row[0], c)
    const service = imposee(l.row[0], c)
    if (service && modifiable) {
      // Tirée de la grille du service : rien à modifier ici (planche bo-planning-2027).
      return (
        <span
          title={t("planning.grille.dimancheSpecial", { service })}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1"
        >
          {val}
          <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
        </span>
      )
    }
    // Une case qui porte déjà plusieurs noms (équipe de la Table, musiciens)
    // s'écrit en texte, préremplie : « Choisir » remplacerait tous les noms.
    if (modifiable && colonneDePersonnes(c.cle) && splitNames(val).length <= 1) {
      // Lot U2, P9 : une case de personne s'ouvre sur « Choisir » ; vide, elle
      // le dit en pointillé gris (planche bo-planning-2027).
      const ouvrir = (e: MouseEvent<HTMLButtonElement>) =>
        setChoix({ l, c, ancre: e.currentTarget.getBoundingClientRect() })
      if (!val) {
        return (
          <button
            type="button"
            onClick={ouvrir}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg border-[1.5px] border-dashed border-border px-2 py-1 text-[13px] text-muted-foreground hover:bg-secondary active:bg-secondary"
          >
            {t("planning.choisir.bouton")}
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        )
      }
      return (
        <button
          type="button"
          onClick={ouvrir}
          className="w-full min-h-8 rounded-md border border-dashed px-1.5 py-1 text-left hover:bg-secondary active:bg-secondary"
          style={{ borderColor: `${couleur}55` }}
        >
          {val}
          {marqueAbsent(l.row[0], val)}
        </button>
      )
    }
    if (modifiable) {
      return (
        <button
          type="button"
          onClick={() => commencer(l, c)}
          // Trait pointillé : sans lui, une case modifiable ne se distingue pas
          // d'un simple texte (vu à l'œil sur la planche du 18/09/2026).
          className="w-full min-h-8 rounded-md border border-dashed px-1.5 py-1 text-left hover:bg-secondary active:bg-secondary"
          style={{ borderColor: `${couleur}55` }}
        >
          {val || <span className="text-muted-foreground">+</span>}
        </button>
      )
    }
    // La couleur du service reste aux dates (A2) : son nom se repère en encre.
    return (
      <>
        <span className={estMoi(val) ? "rounded-md bg-foreground px-1.5 py-0.5 font-semibold text-background" : ""}>{val || "—"}</span>
        {marqueAbsent(l.row[0], val)}
      </>
    )
  }

  const phrase = (auteurNom: string, ch: EntreeGrille["changes"][number]) => {
    if (ch.kind === "import") return t("planning.grille.importe", { auteur: auteurNom, count: ch.count })
    if (ch.kind === "dimanche") return t(`planning.grille.${phraseDuChangement(ch)}`, { auteur: auteurNom, date: fdLongL(ch.date, i18n.language) })
    const col = definition.colonnes.find((x) => x.cle === ch.colonne)
    return t(`planning.grille.${phraseDuChangement(ch)}`, {
      auteur: auteurNom,
      avant: ch.from,
      apres: ch.to,
      colonne: col ? t(col.i18n) : ch.colonne,
      date: fdLongL(ch.date, i18n.language),
    })
  }

  return (
    <div className="space-y-3" data-grille={definition.key}>
      {/* Agencement v18 (B6) : l'export et « Enregistré » dans les outils de l'en-tête ; le service,
          la période et les filtres dans la rangée de la grille (BarreDeGrille). */}
      <DansLEnTete ou="outils">
        {enregistre && (
          <span aria-live="polite" className="text-xs text-muted-foreground">{t("planning.grille.enregistre")}</span>
        )}
        {exporter && <ExportModele definition={definition} periode={periode} exporter={exporter} />}
        {actifClavier && (
          <button
            ref={boutonAide}
            data-aide-clavier=""
            type="button"
            aria-label={t("backOffice.boE1.aideClavier")}
            aria-expanded={aideOuverte}
            aria-controls={idAide}
            onClick={() => setAideOuverte((v) => !v)}
            onKeyDown={(e) => { if (e.key === "Escape" && aideOuverte) { e.stopPropagation(); setAideOuverte(false); boutonAide.current?.focus() } }}
            className="relative hidden h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border transition-colors after:absolute after:-inset-2 after:content-[''] hover:text-foreground sm:inline-flex"
          >
            ?
          </button>
        )}
      </DansLEnTete>
      {legende && <h3 className="text-[15px] font-bold text-foreground">{legende}</h3>}

      {refus && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {t(`planning.grille.${refus}`)}{" "}
          <button onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">
            {t("planning.grille.recharger")}
          </button>
        </p>
      )}


      {avis.length > 0 && <BanniereGeste texte={avis[0]} notes={avis.slice(1)} onFermer={() => setAvis([])} />}

      {geste && (
        // Pendant l'aperçu d'un collage, l'« Annuler » du geste d'avant est périmé : inerte (PG29).
        <div inert={collage ? true : undefined}>
          <BanniereGeste texte={geste.texte} notes={geste.notes} onAnnuler={() => void annulerGeste()} onFermer={() => setGeste(null)} />
        </div>
      )}

      {collage && (
        <BarreCollage
          count={collage.cases.length}
          remplace={collage.remplace}
          videsSeulement={collage.cases.some((c) => !c.avant.trim())}
          onAnnuler={() => setCollage(null)}
          onVides={() => validerCollage(true)}
          onColler={() => validerCollage(false)}
        />
      )}

      <PrevenirChangements prev={prev} prevenir={prevenir} definition={definition} />

      {peutModifier && (
        <FenetreCopie
          demande={fenetreCopie}
          libelle={(cle) => { const x = definition.colonnes.find((d) => d.cle === cle); return x ? t(x.i18n) : cle }}
          onChoix={choixDeLaFenetre}
        />
      )}

      {peutModifier && (
        <ChoisirNom
          ouverture={choix && {
            titre: `${t(choix.c.i18n)} · ${fdShort(choix.l.row[0])}`,
            libelle: t(choix.c.i18n),
            valeur: valeur(choix.l.row[0], choix.c, choix.l.row),
            ancre: choix.ancre,
          }}
          onFermer={() => setChoix(null)}
          remplir={remplissage ? {
            grise: remplissage.cases.length === 0,
            aide: remplissage.cases.length
              ? t("planning.gestes.remplirAide", { nom: remplissage.nom, count: remplissage.cases.length, fin: fdShort(remplissage.fin) })
              : t("planning.gestes.rienARemplir"),
            onRemplir: () => {
              setChoix(null)
              void appliquer(
                remplissage.cases,
                t("planning.gestes.rempli", { nom: remplissage.nom, count: remplissage.cases.length, fin: fdShort(remplissage.fin) }),
                remplissage.verrouillees ? [t("planning.gestes.verrouillees", { count: remplissage.verrouillees })] : [],
              )
            },
          } : undefined}
          absenceDe={absenceDe && choix ? (nom) => absenceDe(nom, choix.l.row[0]) : undefined}
          reliees={groupe ? (recherche) => propositionsReliees(definition, choix?.c.cle ?? "", groupe, comptes, dansLaFenetre.map(ligneAffichee), recherche) : undefined}
          proposer={(recherche) => propositions(definition, choix?.c.cle ?? "", comptes, lignes.map((l) => l.row), recherche)}
          onEcrire={(nom) => {
            if (!choix) return
            setChoix(null)
            setEnregistre(false)
            void enregistrer(choix.l, choix.c, nom.trim())
          }}
        />
      )}

      {/* ── Grille (ordinateur, tablette) ── */}
      <div ref={enveloppe} data-en-cours={enCours || undefined} inert={enCours ? true : undefined} className="relative">
      <div data-testid="grille-defilement" role="region" tabIndex={0} aria-label={t("planning.grille.region")} inert={collage ? true : undefined} className={`hidden sm:block overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${app ? "raised rounded-2xl" : "rounded-xl border border-border"}`}>
        <table className="w-full text-sm border-collapse" style={{ minWidth: largeurMin }}>
          <thead>
            <tr data-testid="grille-colonnes" className={app ? "bg-secondary text-muted-foreground" : "text-white"}>
              <th
                className={`sticky left-0 z-20 px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap ${app ? "bg-secondary" : ""}`}
                style={app ? undefined : { background: couleur }}
              >
                {t("planning.roles.date")}
              </th>
              {colonnes.map((c) => (
                <th key={c.cle} className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap" style={app ? undefined : { background: couleur }}>
                  {t(c.i18n)}
                  {!app && groupe && groupeDef(groupe.id)?.planning === definition.key && roleDeColonne(groupe, c.cle) && (
                    <Link2
                      role="img"
                      aria-label={t("groupes.choisir.reliee", { role: (i18n.language === "zh-CN" && roleDeColonne(groupe, c.cle)!.nomZh) || roleDeColonne(groupe, c.cle)!.nom })}
                      className="ml-1 inline h-3 w-3 align-[-1px] opacity-80"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {affichees.length === 0 && (
              <tr>
                <td colSpan={colonnes.length + 1} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {vide ?? t("planning.grille.aVenir")}
                </td>
              </tr>
            )}
            {affichees.map((l, i) => {
              const date = l.row[0]
              const mois = getMois(date)
              const sep = i === 0 || getMois(affichees[i - 1].row[0]) !== mois ? moisName(mois, i18n.language) : null
              const cetteSemaine = date === sun
              const fond = cetteSemaine ? `${couleur}1a` : undefined
              return (
                <Fragment key={date}>
                  {sep && (
                    <tr className={app ? "bg-secondary/50" : undefined} style={app ? undefined : { background: `${couleur}15` }}>
                      <td colSpan={colonnes.length + 1} className="px-3 py-1.5">
                        <span className="sticky left-3 inline-block text-xs font-bold uppercase tracking-wider texte-service" style={styleTexteService(couleur)}>
                          {sep}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="group/ligne border-t border-border" style={{ background: fond }}>
                    <td
                      data-date-cell={date}
                      className="sticky left-0 z-10 w-[112px] px-3 py-2 font-semibold whitespace-nowrap bg-card texte-service"
                      style={{ ...styleTexteService(couleur), backgroundImage: fond ? `linear-gradient(${fond}, ${fond})` : undefined }}
                    >
                      {/* La date, puis « Cette semaine » dessous (planches `v18-app-planning-grille-a`, `v18-bo-planning-a`). */}
                      <div>{fdShort(date)}</div>
                      {cetteSemaine && (
                        <span className={`mt-0.5 mr-1 inline-block text-xs font-bold px-1.5 py-0.5 rounded ${app ? "bg-foreground text-background" : "text-white"}`} style={app ? undefined : { background: couleur }}>
                          {t("planning.table.thisWeek")}
                        </span>
                      )}
                      {l.nonPublie && (
                        <span
                          data-non-publie={date}
                          title={t("planning.unpublishedTooltip")}
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
                        >
                          <Lock className="h-3 w-3" aria-hidden />
                          {t("planning.grille.nonPublie")}
                        </span>
                      )}
                      {dateBadge?.(l.row, toutes)}
                      {peutRetirer(date) && <div className="-ml-1.5 mt-0.5">{boutonRetirer(date, false)}</div>}
                      {survol ? pastilleCopie(date) : <div className="mt-1">{menuCopie(date)}</div>}
                    </td>
                    {colonnes.map((c, j) => (
                      <td
                        key={c.cle}
                        data-case={`${date}|${c.cle}`}
                        data-geste={dansGeste(date, c.cle) || undefined}
                        data-apercu={marqueApercu(date, c.cle)}
                        data-selection={marqueSelection(rangDate(date), j, date, c.cle)}
                        data-sans-compte={dansSansCompte(date, c.cle) || undefined}
                        data-changement={aChange(date, c.cle)}
                        onMouseDownCapture={(e) => { if (actifClavier && e.shiftKey) e.preventDefault() }}
                        onClickCapture={(e) => surCase(e, date, c.cle)}
                        className={`relative px-3 py-2 text-foreground ${aChange(date, c.cle) ? "bg-amber-100/70 dark:bg-amber-500/15" : ""} ${dansSansCompte(date, c.cle) ? "[&_button]:underline [&_button]:decoration-dotted [&_button]:underline-offset-4" : ""}`}
                        style={styleCase(rangDate(date), j, date, c.cle)}
                      >
                        {caseOuApercu(l, c)}
                        {pointChange(date, c.cle)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      {actifClavier && plage && posBarre && !collage && (
        <BarreSelection
          count={datesPlage.length * clesPlage.length}
          dimanches={datesPlage.length}
          colonnes={clesPlage.length}
          style={posBarre}
          onFermer={effacer}
        />
      )}
      </div>

      {/* ── Une carte par dimanche (téléphone) ── */}
      <div inert={enCours ? true : undefined} data-cartes-en-cours={enCours || undefined} className="sm:hidden space-y-2.5">
        {affichees.length === 0 && (
          <EtatVide compact>{vide ?? t("planning.grille.aVenir")}</EtatVide>
        )}
        {affichees.map((l) => {
          const date = l.row[0]
          const cetteSemaine = date === sun
          return (
            <div
              key={date}
              data-testid="grille-carte"
              data-date-carte={date}
              className="rounded-xl border border-transparent bg-card shadow-soft overflow-hidden"
              style={{ borderColor: cetteSemaine ? couleur : undefined }}
            >
              <div
                className="px-3.5 py-2 flex items-center gap-2 flex-wrap"
                style={{ background: cetteSemaine ? `${couleur}1a` : `${couleur}0d` }}
              >
                <span className="text-sm font-bold texte-service" style={styleTexteService(couleur)}>{fdShort(date)}</span>
                {cetteSemaine && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: couleur }}>
                    {t("planning.table.thisWeek")}
                  </span>
                )}
                {l.nonPublie && (
                  <span data-non-publie={date} className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <Lock className="h-3 w-3" aria-hidden />
                    {t("planning.grille.nonPublie")}
                  </span>
                )}
                {dateBadge?.(l.row, toutes)}
                {(peutRetirer(date) || mode === "edition") && (
                  <span className="ml-auto flex items-center gap-1">
                    {peutRetirer(date) && boutonRetirer(date, true)}
                    {menuCopie(date)}
                  </span>
                )}
              </div>
              <div className="px-3.5 py-2.5 space-y-1">
                {colonnes
                  // En lecture, une case vide ne prend pas de place ; en
                  // modification, toutes s'affichent pour pouvoir les remplir
                  // (sauf celles en lecture seule, qui ne se remplissent pas ici). Une case vidée depuis
                  // la publication reste, pour porter son point.
                  .filter((c) => (mode === "edition" && caseOuverte(date, c)) || valeur(date, c, l.row).trim() || aChange(date, c.cle))
                  .map((c) => (
                    <div key={c.cle} className="flex items-baseline gap-2 text-[13px]">
                      <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{t(c.i18n)}</span>
                      <span data-case={`${date}|${c.cle}`} data-geste={dansGeste(date, c.cle) || undefined} data-apercu={marqueApercu(date, c.cle)} data-changement={aChange(date, c.cle)} className={`relative min-w-0 flex-1 rounded-md ${aChange(date, c.cle) ? "bg-amber-100/70 pr-4 dark:bg-amber-500/15" : ""}`} style={dansGeste(date, c.cle) ? { background: `${couleur}22` } : undefined}>{caseOuApercu(l, c)}{pointChange(date, c.cle)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
      </div>


      {/* BO-G, 5 : le « ? » est dans la barre d'outils (en-tête) ; le texte de l'aide, lui, s'ouvre ici, dans sa zone vive. */}
      {actifClavier && (
        <div data-aide-clavier="" className="hidden sm:block">
          {/* Zone vive posée d'avance : l'aide qui s'y glisse est lue par les lecteurs d'écran (un ajout dans une zone absente ne l'est pas). */}
          <div aria-live="polite" role="status">
            {aideOuverte && <p id={idAide} className="text-xs text-muted-foreground">{t("planning.gestes.clavier")}</p>}
          </div>
        </div>
      )}

      {/* ── Pied de grille : on prévient, on ne se retire pas (T3) ── */}
      <p className="text-xs text-muted-foreground">{t("planning.grille.pasDispo")}</p>

      {/* ── Historique nommé (T6) ── */}
      <div>
        <button
          onClick={() => { const ouvre = !histoOuvert; setHistoOuvert(ouvre); if (ouvre) void rechargerHistorique() }}
          aria-expanded={histoOuvert}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3.5 w-3.5" aria-hidden />
          {t("planning.grille.historique")}
        </button>
        {histoOuvert && (
          <ul className="mt-2 space-y-1.5">
            {entrees.map((e) => (
              <li key={e.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">
                <ul className="space-y-0.5">
                  {e.changes.map((ch, i) => (
                    <li key={i}>{phrase(e.authorName || t("setlists.history.someone"), ch)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
