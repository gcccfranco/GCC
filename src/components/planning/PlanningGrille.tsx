"use client"

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { History, Lock, User, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { currentSundayStr, fdLongL, fdShort, getMois, moisName } from "@/lib/planning/utils"
import type { ColonneGrille, DefinitionGrille, LigneGrille } from "@/lib/planning/grilles"
import { phraseDuChangement } from "@/lib/planning/historique"
import { ecrireCase } from "@/lib/firebase/planningGrille"
import { getHistoriqueGrille, noterChangement, type EntreeGrille } from "@/lib/firebase/planningHistorique"
import { historyAuthor } from "@/lib/firebase/setlistHistory"
import { useProfile } from "@/lib/firebase/users"

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
  /** La personne peut-elle remplir les cases ? (canEditPlanning) */
  peutModifier: boolean
  /** Dimanches déjà écrits dans la grille de l'app — les autres viennent du Sheet. */
  datesDansLApp: readonly string[]
  /** Noms de planning des comptes, pour l'autocomplétion (D12). */
  nomsDesComptes: readonly string[]
  /** Badge optionnel à côté de la date (Sainte Cène), comme PlanningTable. */
  dateBadge?: (row: string[], allRows: string[][]) => ReactNode
  /** Période affichée, écrite dans le bandeau (le trimestre choisi par la page). */
  periode: string
}

const pad = (n: number) => String(n).padStart(2, "0")

export function PlanningGrille({
  definition,
  lignes,
  peutModifier,
  datesDansLApp,
  nomsDesComptes,
  dateBadge,
  periode,
}: PlanningGrilleProps) {
  const { t, i18n } = useTranslation()
  const { profile } = useProfile()
  const couleur = definition.couleur
  const sun = currentSundayStr()

  const [mode, setMode] = useState<"lecture" | "edition">("lecture")
  const [modifs, setModifs] = useState<Record<string, string>>({})
  const [edition, setEdition] = useState<{ date: string; cle: string; valeur: string } | null>(null)
  const [refus, setRefus] = useState<"" | "droitRetire" | "horsLigne">("")
  const [enregistre, setEnregistre] = useState(false)
  const [histoOuvert, setHistoOuvert] = useState(false)
  const [entrees, setEntrees] = useState<EntreeGrille[]>([])
  // Dimanches semés pendant la séance : leur document n'existait pas encore.
  const semes = useRef(new Set<string>())
  const fini = useRef(false)

  // Prénom mémorisé sur l'appareil, prérempli depuis le profil (PlanningTable).
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
  const estMoi = (cell: string) => aUnNom && cell.toLowerCase().includes(aiguille)

  const valeur = (date: string, c: ColonneGrille, row: string[]) =>
    modifs[`${date}|${c.cle}`] ?? row[c.index] ?? ""

  /** La ligne telle qu'elle est affichée (modifications locales comprises). */
  const ligneAffichee = (l: LigneGrille) => {
    const row = [...l.row]
    for (const c of definition.colonnes) row[c.index] = valeur(l.row[0], c, l.row)
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
  const listeId = `noms-${definition.key}`

  const noms = useMemo(() => {
    const vus = new Set<string>()
    for (const l of lignes) {
      for (const c of definition.colonnes) {
        for (const part of (l.row[c.index] ?? "").split(/[,;/]/)) {
          const n = part.trim()
          if (n.length > 1 && !/\d/.test(n)) vus.add(n)
        }
      }
    }
    for (const n of nomsDesComptes) if (n.trim()) vus.add(n.trim())
    return [...vus].sort((a, b) => a.localeCompare(b, "fr"))
  }, [lignes, definition, nomsDesComptes])

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
        // les recopie une fois, sans quoi la fusion les perdrait.
        semer: datesDansLApp.includes(date) || semes.current.has(date) ? undefined : ligneAffichee(l),
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
        list={listeId}
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
    if (mode === "edition") {
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
    return <span className={estMoi(val) ? "font-bold" : ""} style={estMoi(val) ? { color: couleur } : undefined}>{val || "—"}</span>
  }

  const phrase = (auteurNom: string, ch: EntreeGrille["changes"][number]) => {
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
    <div className="space-y-3">
      {/* ── Bandeau : planning, période, horaire (T4) ── */}
      <div
        data-testid="grille-bandeau"
        className="rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white"
        style={{ background: couleur }}
      >
        {t(definition.i18nTitre)}
        <span className="font-normal opacity-90">
          {" · "}
          {periode}
          {" · "}
          {t(definition.i18nHoraire)}
        </span>
      </div>

      {/* ── Mon prénom, Mes dates, Modifier ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-[220px]">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={nom}
            onChange={(e) => changerNom(e.target.value)}
            placeholder={t("planning.table.myName")}
            className="w-full h-10 sm:h-8 pl-8 pr-8 rounded-full border border-transparent bg-secondary text-foreground text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          {nom && (
            <button
              onClick={() => { changerNom(""); setMesDates(false) }}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2.5 text-muted-foreground hover:text-foreground active:text-foreground"
              aria-label={t("planning.table.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {aUnNom && (
          <button
            onClick={() => setMesDates((v) => !v)}
            className={`h-10 sm:h-8 px-3 rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96] cursor-pointer ${
              mesDates ? "text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            style={mesDates ? { background: couleur } : undefined}
          >
            {t("planning.table.myDates")}
          </button>
        )}
        {peutModifier && (
          <button
            onClick={() => { setEdition(null); setEnregistre(false); setMode((m) => (m === "edition" ? "lecture" : "edition")) }}
            className={`h-10 sm:h-8 px-3 rounded-full text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[.96] cursor-pointer ${
              mode === "edition" ? "text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            style={mode === "edition" ? { background: couleur } : undefined}
          >
            {t(mode === "edition" ? "planning.grille.termine" : "planning.grille.modifier")}
          </button>
        )}
        {enregistre && (
          <span aria-live="polite" className="text-xs text-muted-foreground">{t("planning.grille.enregistre")}</span>
        )}
      </div>

      {refus && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {t(`planning.grille.${refus}`)}{" "}
          <button onClick={() => window.location.reload()} className="font-semibold underline underline-offset-2">
            {t("planning.grille.recharger")}
          </button>
        </p>
      )}


      {peutModifier && (
        <datalist id={listeId}>
          {noms.map((n) => <option key={n} value={n} />)}
        </datalist>
      )}

      {/* ── Grille (ordinateur, tablette) ── */}
      <div data-testid="grille-defilement" className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm border-collapse" style={{ minWidth: largeurMin }}>
          <thead>
            <tr data-testid="grille-colonnes" className="text-white">
              <th
                className="sticky left-0 z-20 px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap"
                style={{ background: couleur }}
              >
                {t("planning.roles.date")}
              </th>
              {colonnes.map((c) => (
                <th key={c.cle} className="px-3 py-2.5 text-left text-[11px] font-semibold whitespace-nowrap" style={{ background: couleur }}>
                  {t(c.i18n)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {affichees.length === 0 && (
              <tr>
                <td colSpan={colonnes.length + 1} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("planning.grille.aVenir")}
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
                    <tr style={{ background: `${couleur}15` }}>
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
                          <span className="inline-block text-xs font-bold px-1.5 py-0.5 rounded text-white" style={{ background: couleur }}>
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
            {t("planning.grille.aVenir")}
          </p>
        )}
        {affichees.map((l) => {
          const date = l.row[0]
          const cetteSemaine = date === sun
          return (
            <div
              key={date}
              data-testid="grille-carte"
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
              </div>
              <div className="px-3.5 py-2.5 space-y-1">
                {colonnes
                  // En lecture, une case vide ne prend pas de place ; en
                  // modification, toutes s'affichent pour pouvoir les remplir.
                  .filter((c) => mode === "edition" || valeur(date, c, l.row).trim())
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
