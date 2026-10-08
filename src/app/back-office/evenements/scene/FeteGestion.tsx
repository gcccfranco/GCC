"use client"

// Back-Office › Évènements › Pâques ou Noël (docs/spec-scene-paques-noel.md, P7, Q6, Q18, Q19 ;
// planche `v18-scene-a-coord-avant-ordinateur`). La coordination prépare la fête dans son onglet.
// À gauche (la liste en carte de `DeuxVolets`) : le titre de l'édition et le menu des années, la
// pastille d'état, « Cette fête › Saison », les années passées tant que rien n'est lancé, l'ordre
// de passage en bas. À droite : la saison (jour J, aides, aperçu d'une semaine, « Lancer les
// réservations »), ou l'ordre de passage, modifiable jusqu'au jour J. Une édition qui n'existe pas
// encore se montre avec les réglages qu'elle aura (`reglagesRepris`) ; elle naît à la première
// action (`creerEdition`, en brouillon) : ouvrir l'onglet n'écrit rien. Paramètres d'adresse
// (`?annee=`, `?vue=`, `?semaine=`) remplacés sans entrée d'historique (Q9).
// P8 (Q18, Q20, Q21 ; planches `v18-scene-a-coord-pendant/apres-ordinateur`) : une fois lancée,
// « Toutes les réservations » (vue par défaut jusqu'au jour J) et les semaines des membres dans la
// colonne, avec « ⋯ » sur toutes les réservations ; après le jour J, la carte « … est passé »,
// « Préparer {fête} {année + 1} » et l'ordre de passage en lecture, à imprimer.
// P9 (Q22 ; planches `v18-scene-a-coord-avant/pendant-telephone`) : sur une colonne (téléphone,
// tablette debout), la fête puis ce qui se lit par défaut — avant le lancement la saison (en
// résumé sur téléphone, une feuille par réglage ; la carte entière sur tablette), « Lancer » en
// pleine largeur, l'aperçu ; pendant la saison « Cette fête » et « Cette semaine » en cartes par
// jour ; après le jour J l'ordre de passage — et l'ordre de passage en carte tout en bas. Une autre
// vue (`?vue=`, `?semaine=`) s'ouvre en page, avec un retour vers la fête.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { CircleCheck, ChevronDown, ChevronRight, History, List, ListOrdered, Plus, Printer, Send, SlidersHorizontal, type LucideIcon } from "lucide-react"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import { creerEdition, listCreneaux, listProgrammes, ModifieEntreTemps, PROGRAMMES_CHANGED, updateProgramme } from "@/lib/firebase/programmes"
import { archiveDate, todayIso } from "@/lib/scene/dimanches"
import { reportConflict } from "@/lib/scene/reportConflict"
import {
  anneeDe, editionCourante, editionsDe, etatEdition, FETES, idEdition, jourJParDefaut, libelleEdition, reglagesRepris,
  type Edition, type Fete,
} from "@/lib/scene/fetes"
import { erreursSaison, famillesDe, joursReservables, saisonDe } from "@/lib/scene/saison"
import { fdFullL } from "@/lib/planning/utils"
import { useDisposition } from "@/hooks/useDisposition"
import type { Creneau, Passage, Plage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { DeuxVolets } from "@/components/layout/DeuxVolets"
import { Retour } from "@/components/layout/EnTetePage"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Apercu } from "@/app/evenements/scene/Apercu"
import { Entrainements, type MorceauxEntrainements } from "@/app/evenements/scene/Entrainements"
import { OrdrePassage } from "@/app/evenements/scene/OrdrePassage"
import { SaisonForm, type AutreFete, type SaisonPatch } from "@/app/evenements/scene/SaisonForm"
import { heureCourte, jourEnLettres } from "@/app/evenements/scene/libelles"
import { rangerReservations, ToutesReservations } from "./ToutesReservations"
import { CetteSemaine } from "./CetteSemaine"
import { ResumeSaison } from "./ResumeSaison"

/** « cetteSemaine » : la vue par défaut d'une saison ouverte, sur une colonne (P9). */
type Vue = "saison" | "reservations" | "ordre" | "semaine" | "cetteSemaine"

/** L'édition montrée : celle de `?annee=` si elle existe, sinon l'édition courante (Q4). */
function editionMontree(fete: Fete, programmes: Programme[], today: string, annee: number | null): Edition {
  const courante = editionCourante(fete, programmes, today)
  if (!annee || annee === courante.annee) return courante
  const p = editionsDe(fete, programmes).find((x) => anneeDe(x) === annee)
  return p ? { fete, annee, programme: p } : courante
}

const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function FeteGestion({ fete }: { fete: Fete }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const langue = lang === "zh-CN" ? "zh" : "fr"
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const pathname = usePathname() ?? `/back-office/evenements/scene/${fete}`
  const params = useSearchParams()
  const disposition = useDisposition()
  const deuxVolets = disposition === "grand"
  const [programmes, setProgrammes] = useState<Programme[] | null>(null)
  const [charge, setCharge] = useState<{ pour: string; creneaux: Creneau[] } | null>(null)
  const [erreurSaison, setErreurSaison] = useState(false)
  const [erreur, setErreur] = useState("")
  // La lecture a échoué (réseau coupé) : un message et « Réessayer » plutôt qu'un chargement sans fin.
  const [echec, setEchec] = useState(false)
  // Nos écritures (`ecrire`) relisent elles-mêmes, après coup : l'événement qu'elles émettent ne
  // relance pas une seconde lecture de tous les programmes et créneaux.
  const ecritures = useRef(0)
  const anneeVoulue = Number(params.get("annee")) || null
  // Seule la dernière demande pose l'état : une réponse plus lente, partie avant, mettrait
  // sinon les créneaux d'une autre édition sous l'écran.
  const demandes = useRef(0)

  const reload = useCallback(async () => {
    const n = ++demandes.current
    const tous = await listProgrammes()
    const p = editionMontree(fete, tous, todayIso(), anneeVoulue).programme
    const creneaux = p ? await listCreneaux(p.id) : []
    if (n !== demandes.current) return
    setProgrammes(tous)
    setCharge(p ? { pour: p.id, creneaux } : null)
  }, [fete, anneeVoulue])

  const charger = useCallback(() => { reload().then(() => setEchec(false), () => setEchec(true)) }, [reload])

  useEffect(() => {
    if (!user) return
    charger()
    const surChangement = () => { if (!ecritures.current) charger() }
    window.addEventListener(PROGRAMMES_CHANGED, surChangement)
    return () => window.removeEventListener(PROGRAMMES_CHANGED, surChangement)
  }, [user, charger])

  const chargement = <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("common.loading")}</p>
  if (profileLoading || !user) return chargement
  if (!isCoordination(user, profile)) return <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("backOffice.sceneReserve")}</p>
  if (!programmes && echec) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 px-[var(--marge-page)]">
        <p className="text-sm text-muted-foreground">{t("planning.fete.erreurChargement")}</p>
        <Button variant="outline" onClick={charger}>{t("common.retry")}</Button>
      </div>
    )
  }
  if (!programmes) return chargement

  const today = todayIso()
  const courante = editionCourante(fete, programmes, today)
  const edition = editionMontree(fete, programmes, today, anneeVoulue)
  const etat = etatEdition(edition, today)
  const titre = libelleEdition(fete, edition.annee, langue)
  const editions = editionsDe(fete, programmes)
  const precedent = editions.find((p) => anneeDe(p)! < edition.annee) ?? null
  const reglages = reglagesRepris(precedent, fete, edition.annee)
  // L'édition telle qu'elle est, ou telle qu'elle naîtra à la première action (Q6, Q7).
  const programme: Programme = edition.programme ?? { id: idEdition(fete, edition.annee), ...reglages, createdBy: "", updatedAt: "" }
  const saison = saisonDe(programme)
  const jours = joursReservables(saison, programme.jourJ)
  const lance = !!edition.programme && edition.programme.ouvert !== false
  const creneaux = edition.programme && charge?.pour === edition.programme.id ? charge.creneaux : []
  // Les semaines des membres, une fois lancée et jusqu'au jour J (Q18).
  const avecSemaines = lance && etat !== "passee"
  const vueParam = params.get("vue")
  const vueDemandee = vueParam === "ordre" || vueParam === "saison" || (vueParam === "reservations" && lance) ? vueParam : null
  // Sur une colonne, une saison ouverte se lit d'abord par « Cette semaine » (P9).
  const vueParDefaut: Vue = etat === "passee" ? "ordre"
    : !lance ? "saison"
      : !deuxVolets && etat === "ouvertes" ? "cetteSemaine" : "reservations"
  const vue: Vue = vueDemandee ?? (avecSemaines && params.get("semaine") ? "semaine" : vueParDefaut)
  const { aVenir, hors } = rangerReservations(programme, creneaux)

  // Q8 : la période de l'édition de l'autre fête (non archivée), que celle-ci ne croise pas.
  const autreFete = FETES.find((f) => f !== fete)!
  const autreProgramme = editionCourante(autreFete, programmes, today).programme
  const autre: AutreFete | undefined = autreProgramme ? {
    debut: saisonDe(autreProgramme).debut,
    fin: saisonDe(autreProgramme).fin,
    titre: libelleEdition(autreFete, anneeDe(autreProgramme)!, langue),
  } : undefined
  const bloque = erreurSaison || erreursSaison(saison, programme.jourJ, autre).length > 0

  /** Change un paramètre d'adresse, sans entrée d'historique (Q9). */
  function changer(changements: Record<string, string | null>) {
    const q = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changements)) {
      if (v === null) q.delete(k)
      else q.set(k, v)
    }
    const s = q.toString()
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false })
  }

  /** Écrit sur l'édition, ou la crée en brouillon avec ce changement (Q6), puis relit. Chaque
   *  écriture signe du prénom (`modifiePar`) ; `protege` (l'ordre de passage, D20) : refusée si
   *  quelqu'un a modifié l'édition depuis la lecture, ou l'a créée entre-temps : « Modifié par …
   *  entre-temps ». Rend `false` si rien n'a été écrit. */
  async function ecrire(changement: Partial<Omit<Programme, "id">>, protege = false): Promise<boolean> {
    setErreur("")
    const signe = { ...changement, modifiePar: profile?.firstName ?? "" }
    try {
      ecritures.current++
      try {
        if (edition.programme) await updateProgramme(edition.programme.id, signe, protege ? edition.programme.version : undefined)
        else await creerEdition(fete, edition.annee, { ...reglages, createdBy: user!.uid, updatedAt: new Date().toISOString() }, signe, protege)
      } finally {
        ecritures.current--
      }
    } catch (e) {
      if (!(e instanceof ModifieEntreTemps)) setErreur(t("planning.programmes.error"))
      else setErreur(e.prenom ? t("planning.programme.modifieEntreTemps", { prenom: e.prenom }) : t("planning.programme.modifieEntreTempsSansNom"))
      return false
    }
    // Écrit : une relecture qui échoue (réseau) ne le défait pas.
    await reload().catch(() => setErreur(t("planning.programmes.error")))
    return true
  }

  /** Lance les réservations ; la saison reste à l'écran (« Réservations lancées ») au lieu de
   *  céder la place à « Toutes les réservations », vue par défaut d'une édition lancée. */
  async function lancer() {
    changer({ vue: "saison" })
    await ecrire({ ouvert: true })
  }

  /** Le jour J, avec l'année quand ce n'est pas celle d'aujourd'hui (« dimanche 28 mars 2027 »). */
  const dateDuJour = (iso: string) => {
    const y = iso.slice(0, 4)
    if (y === today.slice(0, 4)) return jourEnLettres(iso, lang)
    return lang === "zh-CN" ? `${y}年${jourEnLettres(iso, lang)}` : `${jourEnLettres(iso, lang)} ${y}`
  }
  const numeros = (p: Programme) => (p.passages.length ? t("planning.fete.numeros", { count: p.passages.length }) : t("planning.fete.aucunNumero"))
  const pastilleEtat = (testId?: string) => (
    <span data-testid={testId} className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[12px] font-semibold text-foreground/80">
      {t(`planning.gestion.etats.${etat}`)}
    </span>
  )

  /** « sam. 10–12, dim. 14–19 · 1 h · 4 familles ». */
  function resumeSaison(): string {
    const plages = saison.plages.map((p: Plage) => `${t(`planning.saison.jourCourt.${p.jour}`)} ${heureCourte(p.debut)}–${heureCourte(p.fin)}`).join(", ")
    const qui = saison.quiAutorises.length === 0
      ? t("planning.gestion.toutMembre")
      : t("planning.gestion.familles", { count: famillesDe(saison.quiAutorises).length })
    return [plages, t(`planning.saison.dureeCourte.${saison.duree}`), qui].join(" · ")
  }

  // ─── La colonne de la fête ───────────────────────────────────────────────

  const annees = [...new Set([courante.annee, ...editions.map((p) => anneeDe(p)!)])].sort((a, b) => b - a)
  const enTeteEdition = (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[22px] leading-tight font-bold tracking-tight text-foreground">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {titre}
              <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" aria-label={t("planning.gestion.annees")} className="min-w-44">
              {annees.map((y) => (
                <DropdownMenuItem key={y} onSelect={() => changer({ annee: y === courante.annee ? null : String(y), vue: null })}>
                  {libelleEdition(fete, y, langue)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </h2>
        {pastilleEtat("etat-edition")}
      </div>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {t("planning.programmes.jourJLabel", { date: dateDuJour(programme.jourJ) })}
        {(etat === "bientot" || etat === "ouvertes") && jours.length > 0 && <> · {t("planning.fete.jusquau", { date: jourEnLettres(jours.at(-1)!, lang) })}</>}
      </p>
    </div>
  )

  const avantLancement = etat === "aucune" || etat === "brouillon"
  const phraseMembres = etat === "aucune"
    ? t("planning.fete.pasOuvertes", { edition: titre })
    : t("planning.fete.ouvriront", { date: jourEnLettres(programme.debut, lang) })
  const passees = editions.filter((p) => anneeDe(p)! < edition.annee && p.ouvert !== false)

  const sousReservations = !lance ? t("planning.gestion.apresLancement")
    : etat === "passee" ? t("planning.gestion.bilan", { reservations: t("planning.gestion.nReservations", { count: creneaux.length }), hors: hors.length })
      : t("planning.gestion.resume", { aVenir: aVenir.length, hors: hors.length })

  const erreurEcriture = erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>
  const entrees = (
    <>
      <Entree
          icone={SlidersHorizontal}
          titre={t("planning.gestion.saison")}
          sous={avantLancement ? t("planning.gestion.saisonARegler") : resumeSaison()}
          actif={vue === "saison"}
          onClick={() => changer({ vue: "saison" })}
        />
        <Entree
          icone={List}
          titre={lance ? t("planning.gestion.toutes") : t("planning.gestion.reservations")}
          sous={sousReservations}
          actif={vue === "reservations"}
          disabled={!lance}
          onClick={() => changer({ vue: "reservations" })}
        />
    </>
  )
  const texteBrouillon = avantLancement && (
    <p className="px-1 text-[13px] text-muted-foreground">{t("planning.gestion.brouillonTexte", { phrase: phraseMembres })}</p>
  )
  const anneesPassees = avantLancement && (
    <>
      {passees.length > 0 && (
        <section aria-labelledby="scene-gestion-annees" className="space-y-1">
          <h3 id="scene-gestion-annees" className="px-1 text-[13px] font-semibold text-muted-foreground">{t("planning.fete.anneesPassees")}</h3>
          {passees.map((p) => (
            <Entree
              key={p.id}
              icone={History}
              titre={libelleEdition(fete, anneeDe(p)!, langue)}
              sous={`${jourEnLettres(p.jourJ, lang)} · ${numeros(p)}`}
              actif={false}
              onClick={() => changer({ annee: String(anneeDe(p)), vue: null })}
            />
          ))}
        </section>
      )}
    </>
  )
  const entreeOrdre = (
    <Entree
      icone={ListOrdered}
      titre={t("planning.fete.ordreEntree")}
      sous={`${jourEnLettres(programme.jourJ, lang)} · ${numeros(programme)}`}
      actif={vue === "ordre"}
      onClick={() => changer({ vue: "ordre" })}
    />
  )

  /** La colonne de gauche, en deux volets. */
  const colonne = (m: MorceauxEntrainements | null) => (
    <section aria-label={t("planning.gestion.cetteFete")} className="space-y-5 p-5">
      {enTeteEdition}
      {erreurEcriture}
      <div className="space-y-1">
        <p className="px-1 text-[13px] font-semibold text-muted-foreground">{t("planning.gestion.cetteFete")}</p>
        {entrees}
      </div>
      {m?.semaines}
      {texteBrouillon}
      {anneesPassees}
      <div className="border-t border-border pt-3">{entreeOrdre}</div>
    </section>
  )

  // ─── Ce qui se lit à droite (dessous sur une colonne) ────────────────────

  const proprietesSaison = {
    programme,
    onSave: async (patch: SaisonPatch) => { await ecrire(patch) },
    jourJCalcule: { date: jourJParDefaut(fete, edition.annee), fete: t(`evenements.tabs.${fete}`) },
    autre,
    onErreur: setErreurSaison,
  }
  // P9 (Q22) : sur téléphone, la saison en résumé, une feuille par réglage ; ailleurs, la carte entière.
  const reglagesSaison = disposition === "telephone"
    ? <ResumeSaison key={`saison-${programme.id}`} {...proprietesSaison} />
    : <SaisonForm key={`saison-${programme.id}`} {...proprietesSaison} />
  const apercu = <Apercu key={`apercu-${programme.id}`} programme={programme} creneaux={creneaux} />
  // Sur une colonne, pleine largeur sous la saison (planche `v18-scene-a-coord-avant-telephone`).
  const boutonLancer = (
    <Button className={deuxVolets ? "rounded-full" : "h-12 w-full rounded-full text-[15px]"} disabled={bloque} onClick={lancer}>
      <Send aria-hidden /> {t("planning.gestion.lancer")}
    </Button>
  )
  const vueSaison = (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-[min(100%,320px)] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[24px] leading-tight font-bold tracking-tight text-foreground">{t("planning.gestion.titreSaison", { edition: titre })}</h2>
            {pastilleEtat()}
          </div>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{t("planning.gestion.sousTitreSaison")}</p>
        </div>
        {lance ? (
          <p className="shrink-0 py-2 text-sm font-semibold text-foreground">{t("planning.gestion.lancees")}</p>
        ) : deuxVolets && boutonLancer}
      </header>
      {deuxVolets ? (
        <div className="flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-[1_1_380px]">{reglagesSaison}</div>
          <div className="min-w-0 flex-[1_1_260px]">{apercu}</div>
        </div>
      ) : (
        <>
          {reglagesSaison}
          {!lance && boutonLancer}
          {apercu}
        </>
      )}
    </div>
  )

  // Q21 : l'édition courante passée annonce la suivante ; « Préparer » la crée en brouillon avec
  // les réglages repris (Q7), puis ouvre sa saison. Plus de bouton si elle existe déjà.
  const suivante = edition.annee + 1
  const titreSuivante = libelleEdition(fete, suivante, langue)
  const suivanteExiste = editions.some((p) => anneeDe(p) === suivante)
  async function preparer() {
    setErreur("")
    try {
      await creerEdition(fete, suivante, { ...reglagesRepris(edition.programme, fete, suivante), createdBy: user!.uid, updatedAt: new Date().toISOString() })
      changer({ annee: String(suivante), vue: "saison", semaine: null })
    } catch {
      setErreur(t("planning.programmes.error"))
    }
  }
  const cartePassee = etat === "passee" && edition.annee === courante.annee && (
    <section aria-labelledby="scene-gestion-passee" className="raised flex flex-wrap items-center gap-4 rounded-2xl p-5 print:hidden">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
        <CircleCheck className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-[min(100%,240px)] flex-1">
        <h3 id="scene-gestion-passee" className="text-[17px] font-bold text-foreground">{t("planning.gestion.passeeTitre", { edition: titre })}</h3>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {t("planning.gestion.passeeTexte", { date: jourEnLettres(archiveDate(programme.jourJ), lang), suivante: titreSuivante })}
        </p>
      </div>
      {!suivanteExiste && (
        <Button className="w-full rounded-full sm:w-auto" onClick={preparer}>
          <Plus aria-hidden /> {t("planning.gestion.preparer", { edition: titreSuivante, fete: t(`evenements.tabs.${fete}`), annee: suivante })}
        </Button>
      )}
    </section>
  )

  const enLecture = today > programme.jourJ
  const vueOrdre = (
    <div className="space-y-4">
      {cartePassee}
      {/* À l'impression, la liste seule (`.scene-imprimer`, globals.css). */}
      <section className="scene-imprimer space-y-3" aria-labelledby="scene-gestion-ordre">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 id="scene-gestion-ordre" className="text-[24px] leading-tight font-bold tracking-tight text-foreground">
              {t("planning.fete.ordreTitre", { edition: titre })}
            </h2>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{majuscule(fdFullL(programme.jourJ, lang))}</p>
          </div>
          {enLecture && (
            <button type="button" onClick={() => window.print()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-secondary px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-secondary/70 print:hidden">
              <Printer className="h-4 w-4" aria-hidden /> {t("planning.gestion.imprimer")}
            </button>
          )}
        </div>
        {/* Q16 : modifiable jusqu'au jour J compris, ensuite en lecture. */}
        <OrdrePassage
          passages={programme.passages}
          canEdit={!enLecture}
          onSave={(passages: Passage[]) => ecrire({ passages }, true)}
        />
      </section>
    </div>
  )

  const droite = (m: MorceauxEntrainements | null): ReactNode => {
    if (vue === "ordre") return vueOrdre
    if (vue === "saison") return vueSaison
    if (!m) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    if (vue === "semaine") return m.semaine
    if (vue === "cetteSemaine") return <CetteSemaine programme={programme} creneaux={creneaux} menu={m.menu} erreur={m.erreur} />
    return (
      <ToutesReservations
        programme={programme}
        creneaux={creneaux}
        titre={titre}
        voirCommeMembre={`/evenements/scene/${fete}${edition.annee === courante.annee ? "" : `?annee=${edition.annee}`}`}
        menu={m.menu}
        deplacer={m.deplacer}
        erreur={m.erreur}
      />
    )
  }

  const retourFete = edition.annee === courante.annee ? pathname : `${pathname}?annee=${edition.annee}`
  const disposer = (m: MorceauxEntrainements | null) => {
    if (deuxVolets) {
      return (
        <DeuxVolets racine={pathname} liste={colonne(m)} premier={droite(m)} largeurListe={400}>
          {null}
        </DeuxVolets>
      )
    }
    // Une colonne (P9) : une vue autre que celle par défaut s'ouvre en page, avec un retour.
    if (vue !== vueParDefaut) {
      return (
        <div className="space-y-3 px-[var(--marge-page)]">
          <Retour href={retourFete}>{titre}</Retour>
          {erreurEcriture}
          {droite(m)}
        </div>
      )
    }
    // Sinon la fête, ce qui se lit par défaut, puis l'ordre de passage en carte tout en bas.
    return (
      <div className="space-y-6 px-[var(--marge-page)]">
        <section aria-label={t("planning.gestion.cetteFete")} className="space-y-4">
          {enTeteEdition}
          {texteBrouillon}
          {erreurEcriture}
          {lance && <div className="raised space-y-1 rounded-2xl p-1.5">{entrees}</div>}
        </section>
        {droite(m)}
        {anneesPassees}
        {vue !== "ordre" && <div className="raised rounded-2xl p-1.5">{entreeOrdre}</div>}
      </div>
    )
  }

  // Lancée : les morceaux des membres (semaines, menu « ⋯ », feuille Déplacer), comme dans l'App.
  if (lance && edition.programme && charge?.pour === edition.programme.id) {
    const p = edition.programme
    return (
      <Entrainements
        programme={p} creneaux={creneaux} user={user} profile={profile} onChanged={reload}
        onConflict={(a, b) => reportConflict(p.id, [a.id, b.id])}
        semaineActive={vue === "semaine"}
      >
        {(m) => disposer(avecSemaines ? m : { ...m, semaines: null })}
      </Entrainements>
    )
  }
  return disposer(null)
}

/** Une entrée de la colonne : icône, titre, une ligne dessous ; l'entrée choisie à l'encre. */
function Entree({ icone: Icone, titre, sous, actif, disabled, onClick }: {
  icone: LucideIcon
  titre: string
  sous: string
  actif: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={actif ? "true" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-45 ${actif ? "bg-foreground text-background" : "enabled:hover:bg-secondary"}`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${actif ? "bg-background/15" : "bg-secondary"}`}>
        <Icone className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{titre}</span>
        <span className={`block text-[13px] ${actif ? "opacity-75" : "text-muted-foreground"}`}>{sous}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
    </button>
  )
}

