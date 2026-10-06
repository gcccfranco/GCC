"use client"

import { Fragment, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { ChevronDown, History, Lock, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useConfirmer } from "@/components/layout/Confirmer"
import { currentSundayStr, fdFullL, fdLongL, fdShort, getAnnee, getMois, moisName } from "@/lib/planning/utils"
import { PREMIERE_ANNEE_APP, type ColonneGrille, type DefinitionGrille, type LigneGrille } from "@/lib/planning/grilles"
import { phraseDuChangement } from "@/lib/planning/historique"
import { ecrireCase, retirerDate } from "@/lib/firebase/planningGrille"
import { getHistoriqueGrille, noterChangement, type EntreeGrille } from "@/lib/firebase/planningHistorique"
import { historyAuthor } from "@/lib/firebase/setlistHistory"
import { useProfile } from "@/lib/firebase/users"
import { colonneDePersonnes, propositions, type CompteDuPlanning } from "@/lib/planning/choisir"
import { splitNames } from "@/lib/planning/names"
import { canRetirerDate } from "@/lib/access"
import { ExportModele, type ExportPlanning } from "./ExportModele"
import { ChoisirNom } from "./ChoisirNom"
import { DansLEnTete, type FiltreNom } from "./BarreDeGrille"
import { useGestionPlanning } from "@/lib/planning/gestion"

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
}


export function PlanningGrille({
  definition,
  lignes,
  peutModifier,
  datesDansLApp,
  comptes,
  dateBadge,
  periode,
  filtre,
  legende,
  dimanchesSpeciaux,
  exporter,
  vide,
  retrait,
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
  const fini = useRef(false)

  const { mesDates, aUnNom, estMoi } = filtre

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
    if (avant === apres) return
    const cle = `${date}|${c.cle}`
    setModifs((m) => ({ ...m, [cle]: apres }))
    setRefus("")
    const auteur = historyAuthor(profile)
    try {
      await ecrireCase({
        definition,
        date,
        colonne: c.cle,
        valeur: apres,
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
        await noterChangement(definition.key, auteur, { kind: "case", date, colonne: c.cle, from: avant, to: apres })
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
      await noterChangement(definition.key, auteur, { kind: "dimanche", date, retire: true })
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
    const modifiable = mode === "edition" && !c.lectureSeule
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
    return <span className={estMoi(val) ? "rounded-md bg-foreground px-1.5 py-0.5 font-semibold text-background" : ""}>{val || "—"}</span>
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


      {peutModifier && (
        <ChoisirNom
          ouverture={choix && {
            titre: `${t(choix.c.i18n)} · ${fdShort(choix.l.row[0])}`,
            libelle: t(choix.c.i18n),
            valeur: valeur(choix.l.row[0], choix.c, choix.l.row),
            ancre: choix.ancre,
          }}
          onFermer={() => setChoix(null)}
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
      <div data-testid="grille-defilement" className={`hidden sm:block overflow-x-auto ${app ? "raised rounded-2xl" : "rounded-xl border border-border"}`}>
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
                        <span className="sticky left-3 inline-block text-xs font-bold uppercase tracking-wider" style={{ color: couleur }}>
                          {sep}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-border" style={{ background: fond }}>
                    <td
                      data-date-cell={date}
                      className="sticky left-0 z-10 w-[112px] px-3 py-2 font-semibold whitespace-nowrap bg-card"
                      style={{ color: couleur, backgroundImage: fond ? `linear-gradient(${fond}, ${fond})` : undefined }}
                    >
                      <div>
                        {cetteSemaine ? (
                          <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded ${app ? "bg-foreground text-background" : "text-white"}`} style={app ? undefined : { background: couleur }}>
                            {t("planning.table.thisWeek")}
                          </span>
                        ) : fdShort(date)}
                      </div>
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
                    </td>
                    {colonnes.map((c) => (
                      <td key={c.cle} data-case={`${date}|${c.cle}`} className="px-3 py-2 text-foreground">
                        {laCase(l, c)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Une carte par dimanche (téléphone) ── */}
      <div className="sm:hidden space-y-2.5">
        {affichees.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-xl">
            {vide ?? t("planning.grille.aVenir")}
          </p>
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
                <span className="text-sm font-bold" style={{ color: couleur }}>{fdShort(date)}</span>
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
                {peutRetirer(date) && <span className="ml-auto">{boutonRetirer(date, true)}</span>}
              </div>
              <div className="px-3.5 py-2.5 space-y-1">
                {colonnes
                  // En lecture, une case vide ne prend pas de place ; en
                  // modification, toutes s'affichent pour pouvoir les remplir
                  // (sauf celles en lecture seule, qui ne se remplissent pas ici).
                  .filter((c) => (mode === "edition" && !c.lectureSeule) || valeur(date, c, l.row).trim())
                  .map((c) => (
                    <div key={c.cle} className="flex items-baseline gap-2 text-[13px]">
                      <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{t(c.i18n)}</span>
                      <span data-case={`${date}|${c.cle}`} className="min-w-0 flex-1">{laCase(l, c)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
      </div>


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
