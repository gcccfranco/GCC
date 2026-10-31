"use client"

import { useEffect, useRef, useState } from "react"
import { Send, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useConfirmer } from "@/components/layout/Confirmer"
import { authHeader } from "@/lib/firebase/setlists"
import { jourDeParis } from "@/lib/evenements/bascule"
import { colonneDePersonnes, type CompteDuPlanning } from "@/lib/planning/choisir"
import type { DefinitionGrille } from "@/lib/planning/grilles"
import { normalizeName, splitNames } from "@/lib/planning/names"
import {
  casesDuTrimestre, changementsDepuis, cleDeCase, datesDesChangements, personnesTouchees, premierDimancheDepuis,
  type ChangementAnnonce,
} from "@/lib/planning/prevenir"
import type { PublishablePlanning } from "@/lib/planning/releases"
import { fdLongL } from "@/lib/planning/utils"
import { useEtatsAnnonces } from "@/lib/planning/useGrilleApp"
import { changementPlanningMessage, changementPlanningParDefaut } from "@/lib/push/messages"

// « Prévenir des changements » (lot 3, docs/spec-planning-gestes.md, PG33 à PG47) : dans un trimestre
// déjà publié, une bannière au-dessus de la grille dit combien de cases ont changé depuis ce que les
// personnes ont été prévenues d'avoir, chaque case changée porte un point, et une feuille envoie à
// chacun sa ligne. L'état annoncé est lu dans planningReleases et écrit par la route serveur seule.

/** Ce que la page donne à la grille quand le trimestre affiché est publié et que la personne peut prévenir. */
export type PrevenirProp = {
  planning: PublishablePlanning
  annee: number
  tri: string
  /** « 4e trimestre 2026 », pour l'en-tête de la feuille. */
  trimestre: string
  /** Compteur : monte quand un « Publier le T… » réussit (la grille envoie alors l'état, PG37 a). */
  publications: number
}

type Corps = Record<string, unknown>
const appeler = async (corps: Corps) => {
  try {
    const res = await fetch("/api/planning/changements", {
      method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify(corps),
    })
    return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as { prevenus?: number } }
  } catch {
    return { ok: false, status: 0, data: {} as { prevenus?: number } }
  }
}

export type Prevenir = ReturnType<typeof usePrevenir>

export function usePrevenir({ prevenir, definition, rows, speciaux, ecrites, comptes }: {
  prevenir?: PrevenirProp
  definition: DefinitionGrille
  /** Les lignes du trimestre telles qu'affichées (modifications locales comprises). */
  rows: readonly (readonly string[])[]
  speciaux?: Readonly<Record<string, string>>
  /** Les cases écrites dans l'app (documents lus + modifiées pendant la séance). */
  ecrites: ReadonlySet<string>
  comptes: readonly CompteDuPlanning[]
}) {
  const dimancheEnCours = premierDimancheDepuis(jourDeParis())
  const actif = !!prevenir && rows.some((r) => r[0] >= dimancheEnCours)
  const { etats, relire } = useEtatsAnnonces(prevenir?.planning.key ?? "", prevenir?.annee ?? 0, actif)
  const etat = prevenir ? etats?.[prevenir.tri] : undefined
  const cases = casesDuTrimestre(definition, rows, speciaux)
  const changements = actif && etat ? changementsDepuis(etat, cases, ecrites, dimancheEnCours) : []
  const points = new Set(changements.map((c) => cleDeCase(c.date, c.cle)))
  const connus = new Set(comptes.map((c) => normalizeName(c.nom)))
  const aUnCompte = (nom: string) => connus.has(normalizeName(nom))

  const casesRef = useRef(cases)
  useEffect(() => { casesRef.current = cases })
  const base = { key: prevenir?.planning.key, annee: prevenir?.annee, tri: prevenir?.tri }

  // (PG37 a) Un trimestre vient d'être publié : l'état annoncé de départ, et la date de publication.
  const publis = prevenir?.publications ?? 0
  const dejaVu = useRef(publis)
  useEffect(() => {
    // Un trimestre masqué (brouillon) n'a pas de `prevenir` : le compteur lu y vaut 0 sans que rien n'ait changé,
    // `dejaVu` ne le suit pas — une republication déjà annoncée n'envoie donc aucune référence.
    if (!prevenir || publis === dejaVu.current) return
    dejaVu.current = publis
    void appeler({ action: "reference", key: prevenir.planning.key, annee: prevenir.annee, tri: prevenir.tri, cases: casesRef.current, apresPublication: true })
      .then((r) => { if (r.ok) void relire() })
  }, [publis, prevenir, relire])

  // (PG37 b) Un trimestre en ligne sans état annoncé : le suivi commence à la première ouverture par un publieur.
  const amorces = useRef(new Set<string>())
  useEffect(() => {
    if (!actif || !prevenir || etats === null || etat) return
    const id = `${prevenir.planning.key}_${prevenir.annee}_${prevenir.tri}`
    if (amorces.current.has(id)) return
    amorces.current.add(id)
    void appeler({ action: "reference", key: prevenir.planning.key, annee: prevenir.annee, tri: prevenir.tri, cases: casesRef.current, siAbsent: true })
      .then((r) => { if (r.ok) void relire() })
  }, [actif, prevenir, etats, etat, relire])

  /** Envoie (ou, sans `noms`, ignore) les changements affichés ; relit l'état après (PG47). */
  async function agir(corps: Corps) {
    const r = await appeler({ ...base, changements, ...corps })
    if (r.ok || r.status === 409) await relire()
    return r
  }

  return {
    actif, etat, changements, points, aUnCompte, rows, dimancheEnCours,
    envoyer: (noms: string[], titre?: string, message?: string) => agir({ action: "envoyer", noms, ...(titre ? { titre } : {}), ...(message ? { message } : {}) }),
    ignorer: () => agir({ action: "ignorer" }),
  }
}

/** « le 15/11, le 22/11 et le 29/11 », puis « … et N autres » ; 中文 « 11月15日、11月22日 ». */
function joursEnLettres(dates: string[], t: (k: string, o?: Record<string, unknown>) => string) {
  const vus = dates.slice(0, 3).map((d) => t("planning.prevenir.jour", { jour: parseInt(d.slice(8, 10)), mois: parseInt(d.slice(5, 7)) }))
  const autres = dates.length - vus.length
  const liste = vus.length > 1 && !autres
    ? vus.slice(0, -1).join(t("planning.prevenir.sep")) + t("planning.prevenir.et") + vus[vus.length - 1]
    : vus.join(t("planning.prevenir.sep"))
  return autres ? `${liste} ${t("planning.prevenir.autres", { count: autres })}` : liste
}

export function PrevenirChangements({ prev, prevenir, definition }: { prev: Prevenir; prevenir?: PrevenirProp; definition: DefinitionGrille }) {
  const { t } = useTranslation()
  const confirmer = useConfirmer()
  // Un autre trimestre ou planning : la feuille et le dernier résultat n'y sont plus (ils portent leur identifiant).
  const id = prevenir ? `${prevenir.planning.key}_${prevenir.annee}_${prevenir.tri}` : ""
  const [ouvertPour, setOuvert] = useState<string | null>(null)
  const [dernier, setResultat] = useState<{ id: string; texte: string } | null>(null)
  const ouvert = ouvertPour === id
  const resultat = dernier?.id === id ? dernier.texte : ""
  const dates = datesDesChangements(prev.changements)

  async function nePasPrevenir() {
    if (!(await confirmer({ titre: t("planning.prevenir.confirmerIgnorerTitre"), texte: t("planning.prevenir.confirmerIgnorerTexte"), action: t("planning.prevenir.nePasPrevenir") }))) return
    setResultat(null)
    const r = await prev.ignorer()
    if (!r.ok) setResultat({ id, texte: t(r.status === 409 ? "planning.prevenir.conflit" : "planning.prevenir.echec") })
  }

  if (!prev.actif || !prevenir) return null
  return (
    <>
      {resultat && (
        <p role="status" data-testid="prevenir-resultat" className="flex items-start gap-3 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground">
          <span className="min-w-0 flex-1">{resultat}</span>
          <button type="button" onClick={() => setResultat(null)} aria-label={t("common.buttons.close")} className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </p>
      )}
      {prev.changements.length > 0 && (
        <section
          data-testid="banniere-prevenir"
          className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:flex-row sm:items-center dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
        >
          <p className="min-w-0 flex-1">
            {t("planning.prevenir.banniere", { count: prev.changements.length, dates: joursEnLettres(dates, t) })}
          </p>
          <Button type="button" onClick={() => setOuvert(id)} className="rounded-full max-sm:w-full sm:order-2">
            <Send className="h-4 w-4" aria-hidden />
            {t("planning.prevenir.bouton")}
          </Button>
          <button type="button" onClick={() => void nePasPrevenir()} className="shrink-0 py-1 text-center font-semibold underline underline-offset-2 sm:order-1">
            {t("planning.prevenir.nePasPrevenir")}
          </button>
        </section>
      )}
      {ouvert && (
        <Feuille
          prev={prev}
          prevenir={prevenir}
          definition={definition}
          onFermer={() => setOuvert(null)}
          onIgnorer={() => { setOuvert(null); void nePasPrevenir() }}
          onEnvoye={(n) => { setOuvert(null); setResultat({ id, texte: t("planning.prevenir.prevenus", { count: n }) }) }}
        />
      )}
    </>
  )
}

function Feuille({ prev, prevenir, definition, onFermer, onIgnorer, onEnvoye }: {
  prev: Prevenir
  prevenir: PrevenirProp
  definition: DefinitionGrille
  onFermer: () => void
  onIgnorer: () => void
  onEnvoye: (n: number) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === "zh-CN" ? "zh-CN" : "fr"
  const personnes = personnesTouchees(prev.changements, prev.aUnCompte)
  const dates = datesDesChangements(prev.changements)
  const [decoches, setDecoches] = useState<Set<string>>(new Set())
  const [titre, setTitre] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState("")

  const defaut = changementPlanningParDefaut({ label: prevenir.planning.label, dates }, lang)
  const cochees = personnes.filter((p) => p.compte && !decoches.has(p.nom))
  const colonne = (cle: string) => { const c = definition.colonnes.find((x) => x.cle === cle); return c ? t(c.i18n) : cle }
  const jm = (date: string) => ({ jour: parseInt(date.slice(8, 10)), mois: parseInt(date.slice(5, 7)) })
  const parDate = dates.map((d) => ({ date: d, lignes: prev.changements.filter((c) => c.date === d) }))
  const valeur = (v: string) => v || t("planning.prevenir.vide")

  // Ce que reçoit la première personne cochée : sa place après le changement, toutes colonnes confondues.
  const premiere = cochees[0]
  const apercu = premiere && changementPlanningMessage({
    titre: titre ?? defaut.title,
    message: message ?? defaut.body,
    jours: datesDesChangements(prev.changements.filter((c) => premiere.motifs.some((m) => m.date === c.date && m.cle === c.cle))).map((date) => ({
      date,
      roles: definition.colonnes
        .filter((c) => colonneDePersonnes(c.cle) && splitNames(prev.rows.find((r) => r[0] === date)?.[c.index] ?? "")
          .some((n) => normalizeName(n) === normalizeName(premiere.nom)))
        .map((c) => t(c.i18n)),
    })),
  }, lang)

  async function envoyer() {
    setEnCours(true)
    setErreur("")
    const r = await prev.envoyer(
      cochees.map((p) => p.nom),
      titre !== null && titre.trim() && titre !== defaut.title ? titre : undefined,
      message !== null && message.trim() && message !== defaut.body ? message : undefined,
    )
    setEnCours(false)
    if (r.ok) onEnvoye(r.data.prevenus ?? cochees.length)
    else setErreur(t(r.status === 409 ? "planning.prevenir.conflit" : "planning.prevenir.echec"))
  }

  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onFermer() }}>
      <AlertDialogContent
        data-testid="prevenir-feuille"
        className="flex max-h-[92dvh] w-full max-w-[calc(100%-32px)] flex-col gap-0 rounded-2xl p-0 sm:max-w-xl max-sm:bottom-0 max-sm:top-auto max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none"
      >
        <AlertDialogHeader className="px-5 pt-5">
          <AlertDialogTitle>{t("planning.prevenir.bouton")}</AlertDialogTitle>
          <AlertDialogDescription>
            {prev.etat?.publieLe
              ? t("planning.prevenir.publieLe", { planning: prevenir.planning.label, trimestre: prevenir.trimestre, date: fdLongL(prev.etat.publieLe, i18n.language) })
              : t("planning.prevenir.publieSans", { planning: prevenir.planning.label, trimestre: prevenir.trimestre })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          <section>
            <h3 className="mb-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("planning.prevenir.ceQuiAChange")}
              <span className="font-normal normal-case">{t("planning.prevenir.nbDimanches", { count: dates.length })}</span>
            </h3>
            <div data-testid="prevenir-changements" className="space-y-2">
              {parDate.map(({ date, lignes }) => (
                <div key={date}>
                  <p className="font-semibold">{t("planning.prevenir.dim", jm(date))}</p>
                  <ul className="text-muted-foreground">
                    {lignes.map((c: ChangementAnnonce) => (
                      <li key={c.cle}>
                        {colonne(c.cle)} : <s>{valeur(c.avant)}</s> → <span className="font-semibold text-foreground">{valeur(c.apres)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("planning.prevenir.quiEstPrevenu")}
              <span className="font-normal normal-case">{t("planning.prevenir.surTotal", { count: cochees.length, total: personnes.length })}</span>
            </h3>
            <ul className="space-y-1.5">
              {personnes.map((p, i) => (
                <li key={p.nom} data-testid={`prevenir-personne-${p.nom}`} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`prevenir-${i}`}
                    checked={p.compte && !decoches.has(p.nom)}
                    disabled={!p.compte}
                    onCheckedChange={(v) => setDecoches((d) => { const n = new Set(d); if (v) n.delete(p.nom); else n.add(p.nom); return n })}
                    className="mt-0.5"
                  />
                  <label htmlFor={`prevenir-${i}`} className={`min-w-0 flex-1 ${p.compte ? "" : "text-muted-foreground"}`}>
                    <span className="font-semibold">{p.nom}</span>{" "}
                    {[...new Set(p.motifs.map((m) => m.sens))].map((s) => (
                      <span key={s} className={`mr-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${s === "ajout" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" : "bg-secondary text-foreground"}`}>
                        {t(`planning.prevenir.${s}`)}
                      </span>
                    ))}
                    <span className="block text-xs text-muted-foreground">
                      {p.motifs.map((m) => t("planning.prevenir.motif", { role: colonne(m.cle), ...jm(m.date) })).join(", ")}
                      {!p.compte && ` · ${t("planning.prevenir.aPrevenirToiMeme")}`}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("planning.prevenir.leMessage")}</h3>
            <label className="block text-xs font-semibold">
              {t("planning.prevenir.titre")}
              <Input value={titre ?? defaut.title} onChange={(e) => setTitre(e.target.value)} maxLength={200} className="mt-1 text-[16px] sm:text-sm" />
            </label>
            <label className="block text-xs font-semibold">
              {t("planning.prevenir.message")}
              <Textarea value={message ?? defaut.body} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={2} className="mt-1 text-[16px] sm:text-sm" />
            </label>
            {apercu && (
              <div data-testid="prevenir-apercu" className="rounded-lg bg-secondary px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">{t("planning.prevenir.ceQueRecoit", { nom: premiere.nom })}</p>
                <p className="mt-1 font-semibold">{apercu.title}</p>
                <p className="whitespace-pre-line">{apercu.body}</p>
              </div>
            )}
          </section>
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-3 sm:flex-row sm:items-center">
          <button type="button" onClick={onIgnorer} className="py-1 text-sm font-semibold underline underline-offset-2 sm:mr-auto">
            {t("planning.prevenir.nePasPrevenir")}
          </button>
          <AlertDialogCancel className="mt-0 rounded-full">{t("common.buttons.cancel")}</AlertDialogCancel>
          <Button type="button" disabled={enCours || cochees.length === 0} onClick={() => void envoyer()} className="rounded-full">
            {t("planning.prevenir.envoyer", { count: cochees.length })}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
