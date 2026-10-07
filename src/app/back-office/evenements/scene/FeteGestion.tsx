"use client"

// Back-Office › Évènements › Pâques ou Noël (docs/spec-scene-paques-noel.md, P7, Q6, Q18, Q19 ;
// planche `v18-scene-a-coord-avant-ordinateur`). La coordination prépare la fête dans son onglet.
// À gauche (la liste en carte de `DeuxVolets`) : le titre de l'édition et le menu des années, la
// pastille d'état, « Cette fête › Saison », les années passées tant que rien n'est lancé, l'ordre
// de passage en bas. À droite : la saison (jour J, aides, aperçu d'une semaine, « Lancer les
// réservations »), ou l'ordre de passage, modifiable jusqu'au jour J. Une édition qui n'existe pas
// encore se montre avec les réglages qu'elle aura (`reglagesRepris`) ; elle naît à la première
// action (`creerEdition`, en brouillon) : ouvrir l'onglet n'écrit rien. Paramètres d'adresse
// (`?annee=`, `?vue=`) remplacés sans entrée d'historique (Q9).

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronRight, History, ListOrdered, Send, SlidersHorizontal, type LucideIcon } from "lucide-react"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { isCoordination } from "@/lib/access"
import { creerEdition, listCreneaux, listProgrammes, PROGRAMMES_CHANGED, updateProgramme } from "@/lib/firebase/programmes"
import { todayIso } from "@/lib/scene/dimanches"
import {
  anneeDe, editionCourante, editionsDe, etatEdition, FETES, idEdition, jourJParDefaut, libelleEdition, reglagesRepris,
  type Edition, type Fete,
} from "@/lib/scene/fetes"
import { erreursSaison, famillesDe, joursReservables, saisonDe } from "@/lib/scene/saison"
import { fdFullL } from "@/lib/planning/utils"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"
import type { Creneau, Passage, Plage, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { DeuxVolets } from "@/components/layout/DeuxVolets"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Apercu } from "@/app/evenements/scene/Apercu"
import { OrdrePassage } from "@/app/evenements/scene/OrdrePassage"
import { SaisonForm, type AutreFete } from "@/app/evenements/scene/SaisonForm"
import { jourEnLettres } from "@/app/evenements/scene/libelles"

type Vue = "saison" | "ordre"

/** L'édition montrée : celle de `?annee=` si elle existe, sinon l'édition courante (Q4). */
function editionMontree(fete: Fete, programmes: Programme[], today: string, annee: number | null): Edition {
  const courante = editionCourante(fete, programmes, today)
  if (!annee || annee === courante.annee) return courante
  const p = editionsDe(fete, programmes).find((x) => anneeDe(x) === annee)
  return p ? { fete, annee, programme: p } : courante
}

/** « 10 », « 10:30 » : une heure de plage en court (« sam. 10–12 »). */
const heureCourte = (h: string) => (h.endsWith(":00") ? String(Number(h.slice(0, 2))) : h)
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
  const deuxVolets = useDeuxVolets()
  const [programmes, setProgrammes] = useState<Programme[] | null>(null)
  const [charge, setCharge] = useState<{ pour: string; creneaux: Creneau[] } | null>(null)
  const [erreurSaison, setErreurSaison] = useState(false)
  const [erreur, setErreur] = useState("")
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

  useEffect(() => {
    if (!user) return
    const load = () => { reload().catch(() => {}) }
    load()
    window.addEventListener(PROGRAMMES_CHANGED, load)
    return () => window.removeEventListener(PROGRAMMES_CHANGED, load)
  }, [user, reload])

  const chargement = <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("common.loading")}</p>
  if (profileLoading || !user) return chargement
  if (!isCoordination(user, profile)) return <p className="px-[var(--marge-page)] text-sm text-muted-foreground">{t("backOffice.sceneReserve")}</p>
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
  const programme: Programme = edition.programme ?? { id: idEdition(fete, edition.annee), ...reglages, visible: false, createdBy: "", updatedAt: "" }
  const saison = saisonDe(programme)
  const jours = joursReservables(saison, programme.jourJ)
  const lance = !!edition.programme && edition.programme.ouvert !== false
  const creneaux = edition.programme && charge?.pour === edition.programme.id ? charge.creneaux : []
  const vueParam = params.get("vue")
  const vue: Vue = vueParam === "ordre" || vueParam === "saison" ? vueParam : etat === "passee" ? "ordre" : "saison"

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

  /** Écrit sur l'édition, ou la crée en brouillon avec ce changement (Q6), puis relit. */
  async function ecrire(changement: Partial<Omit<Programme, "id" | "visible">>) {
    setErreur("")
    try {
      if (edition.programme) await updateProgramme(edition.programme.id, changement)
      else await creerEdition(fete, edition.annee, { ...reglages, createdBy: user!.uid, updatedAt: new Date().toISOString() }, changement)
      await reload()
    } catch {
      setErreur(t("planning.programmes.error"))
    }
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

  const colonne = (
    <section aria-label={t("planning.gestion.cetteFete")} className={deuxVolets ? "space-y-5 p-5" : "space-y-5"}>
      {enTeteEdition}
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      <div className="space-y-1">
        <p className="px-1 text-[13px] font-semibold text-muted-foreground">{t("planning.gestion.cetteFete")}</p>
        <Entree
          icone={SlidersHorizontal}
          titre={t("planning.gestion.saison")}
          sous={avantLancement ? t("planning.gestion.saisonARegler") : resumeSaison()}
          actif={vue === "saison"}
          onClick={() => changer({ vue: "saison" })}
        />
      </div>
      {avantLancement && <p className="px-1 text-[13px] text-muted-foreground">{t("planning.gestion.brouillonTexte", { phrase: phraseMembres })}</p>}
      {avantLancement && passees.length > 0 && (
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
      <div className={deuxVolets ? "border-t border-border pt-3" : ""}>
        <Entree
          icone={ListOrdered}
          titre={t("planning.fete.ordreEntree")}
          sous={`${jourEnLettres(programme.jourJ, lang)} · ${numeros(programme)}`}
          actif={vue === "ordre"}
          onClick={() => changer({ vue: "ordre" })}
        />
      </div>
    </section>
  )

  // ─── Ce qui se lit à droite (dessous sur une colonne) ────────────────────

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
        ) : (
          <Button className="w-full rounded-full sm:w-auto" disabled={bloque} onClick={() => ecrire({ ouvert: true })}>
            <Send aria-hidden /> {t("planning.gestion.lancer")}
          </Button>
        )}
      </header>
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[1_1_380px]">
          <SaisonForm
            key={programme.id}
            programme={programme}
            onSave={(patch) => ecrire(patch)}
            jourJCalcule={{ date: jourJParDefaut(fete, edition.annee), fete: t(`evenements.tabs.${fete}`) }}
            autre={autre}
            onErreur={setErreurSaison}
          />
        </div>
        <div className="min-w-0 flex-[1_1_260px]">
          <Apercu key={programme.id} programme={programme} creneaux={creneaux} onChanged={reload} />
        </div>
      </div>
    </div>
  )

  const vueOrdre = (
    <section className="space-y-3" aria-labelledby="scene-gestion-ordre">
      <div>
        <h2 id="scene-gestion-ordre" className="text-[24px] leading-tight font-bold tracking-tight text-foreground">
          {t("planning.fete.ordreTitre", { edition: titre })}
        </h2>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{majuscule(fdFullL(programme.jourJ, lang))}</p>
      </div>
      {/* Q16 : modifiable jusqu'au jour J compris, ensuite en lecture. */}
      <OrdrePassage
        passages={programme.passages}
        canEdit={today <= programme.jourJ}
        onSave={(passages: Passage[]) => ecrire({ passages })}
      />
    </section>
  )

  const droite: ReactNode = vue === "ordre" ? vueOrdre : vueSaison

  if (deuxVolets) {
    return (
      <DeuxVolets racine={pathname} liste={colonne} premier={droite} largeurListe={400}>
        {null}
      </DeuxVolets>
    )
  }
  return (
    <div className="space-y-6 px-[var(--marge-page)]">
      {colonne}
      {droite}
    </div>
  )
}

/** Une entrée de la colonne : icône, titre, une ligne dessous ; l'entrée choisie à l'encre. */
function Entree({ icone: Icone, titre, sous, actif, onClick }: {
  icone: LucideIcon
  titre: string
  sous: string
  actif: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={actif ? "true" : undefined}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${actif ? "bg-foreground text-background" : "hover:bg-secondary"}`}
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

