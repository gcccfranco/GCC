"use client"

// « Sujets à aborder » d'une réunion de pôle (lot U6, R1, docs/spec-back-office.md ;
// planches bo-reunion-avant et bo-reunion-apres-telephone). Toute personne de
// la réunion ajoute un sujet jusqu'au début ; l'auteur, l'organisateur et les
// admins le retirent ; l'organisateur et les admins ordonnent (glisser, ou
// clavier sur la poignée) et cochent « traité ». Une fois la réunion commencée,
// un sujet ni traité ni repris passe en rouge. Un sujet repris dans une réunion
// suivante (R2) passe en gris, « repris le 7 novembre » ; sa copie dit d'où elle vient.
//
// Une seule carte pour l'App et la gestion : sur la fiche d'aujourd'hui
// (/evenements/<id>) ; B3 la posera aussi sur la fiche du Back-Office.

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useConfirmer } from "@/components/layout/Confirmer"
import { DndContext, closestCenter, type Announcements, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Check, GripVertical, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { peutAjouterSujet, peutOrdonnerSujets, peutRetirerSujet } from "@/lib/access"
import { useSensorsAvecClavier } from "@/lib/dnd/sensors"
import { aCommence, nowIsoParis } from "@/lib/evenements/agenda"
import { ajouterSujet, listSujets, majSujet, retirerSujet } from "@/lib/firebase/sujets"
import { estRouge, jourDuMois, ordreSuivant, reordonner, trierSujets } from "@/lib/reunions/sujets"
import type { Evenement } from "@/types/evenement"
import type { Sujet } from "@/types/reunion"
import type { UserProfile } from "@/types/user"

const ROUGE = "text-red-700 dark:text-red-400"

/** « 28/09 », en heure de Paris. */
function dateCourte(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" })
}

function LigneSujet({ sujet, rouge, provenance, ordonner, retirer, onTraite, onRetirer }: {
  sujet: Sujet
  rouge: boolean
  /** « repris le 7 novembre » ou « repris du 3 octobre » (R2), sinon vide. */
  provenance: string
  ordonner: boolean
  retirer: boolean
  onTraite: () => void
  onRetirer: () => void
}) {
  const { t, i18n } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: sujet.id, disabled: !ordonner })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-start gap-1 bg-card py-1.5 ${isDragging ? "relative z-10 rounded-xl shadow-lg" : ""}`}>
      {ordonner && (
        <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners}
          aria-label={t("evenements.sujets.deplacer", { texte: sujet.texte })}
          className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button type="button" role="checkbox" aria-checked={sujet.traite} aria-label={t("evenements.sujets.traite", { texte: sujet.texte })}
        disabled={!ordonner} onClick={onTraite}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-150 enabled:active:scale-[.94] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-[7px] ${sujet.traite ? "bg-foreground text-background" : "border-2 border-muted-foreground/40"}`}>
          {sujet.traite && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
        </span>
      </button>
      <div className="min-w-0 flex-1 py-2">
        <p className={`font-semibold leading-snug break-words ${sujet.traite ? "text-muted-foreground line-through" : sujet.reprisDans ? "text-muted-foreground" : rouge ? ROUGE : "text-foreground"}`}>{sujet.texte}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {sujet.auteurNom} · {dateCourte(sujet.creeLe, i18n.language)}{rouge ? ` · ${t("evenements.sujets.nonTraite")}` : ""}
          {/* « repris le 7 novembre » ne se coupe pas au milieu de la date. */}
          {provenance && <> · <span className="whitespace-nowrap">{provenance}</span></>}
        </p>
      </div>
      {retirer && (
        <button type="button" aria-label={t("evenements.sujets.retirer", { texte: sujet.texte })} onClick={onRetirer}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  )
}

export function SujetsAborder({ evenement: e, user, profile, reunions = [] }: {
  evenement: Evenement
  user: { uid: string; email?: string | null }
  profile: UserProfile | null
  /** Réunions du même public, pour dater « repris le … » (R2). */
  reunions?: Pick<Evenement, "id" | "date">[]
}) {
  const { t, i18n } = useTranslation()
  const confirmer = useConfirmer()
  const sensors = useSensorsAvecClavier()
  const [sujets, setSujets] = useState<Sujet[] | null>(null)
  const [texte, setTexte] = useState("")
  const [erreur, setErreur] = useState("")
  const [busy, setBusy] = useState(false)
  // Lu au rendu ; relu à l'envoi : un ajout tapé avant le début et envoyé après est refusé.
  const [now, setNow] = useState(() => nowIsoParis())

  const charger = useCallback(() => {
    listSujets(e.id)
      .then((s) => setSujets(trierSujets(s)))
      .catch(() => { setSujets((s) => s ?? []); setErreur(t("evenements.sujets.erreurLecture")) })
  }, [e.id, t])

  useEffect(() => { charger() }, [charger])

  const ordonner = peutOrdonnerSujets(user, e)
  const commencee = aCommence(e, now)
  const liste = sujets ?? []
  const traites = liste.filter((s) => s.traite).length
  const rouges = liste.filter((s) => estRouge(e, s, now)).length
  const nom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  /** Où le sujet a été repris, ou d'où vient sa copie (R2). */
  function provenance(s: Sujet): string {
    if (s.reprisDans) {
      const dans = reunions.find((r) => r.id === s.reprisDans)
      return dans ? t("evenements.sujets.reprisLe", { date: jourDuMois(dans.date, i18n.language) }) : t("evenements.sujets.reprisSansDate")
    }
    return s.repriseDe ? t("evenements.sujets.reprisDu", { date: jourDuMois(s.repriseDe.date, i18n.language) }) : ""
  }

  /** Une écriture refusée ou perdue : on le dit, et on relit la vérité. */
  function echec() {
    setErreur(t("evenements.sujets.erreur"))
    charger()
  }

  async function ajouter(ev: FormEvent) {
    ev.preventDefault()
    const propre = texte.trim()
    if (!propre || !sujets) return
    const maintenant = nowIsoParis()
    if (!peutAjouterSujet(user, profile, e, maintenant)) {
      setNow(maintenant)
      setErreur(t("evenements.sujets.commencee"))
      return
    }
    setBusy(true)
    setErreur("")
    const nouveau: Omit<Sujet, "id"> = {
      texte: propre, auteurUid: user.uid, auteurNom: nom, creeLe: new Date().toISOString(),
      ordre: ordreSuivant(sujets), traite: false, reprisDans: null, repriseDe: null,
    }
    try {
      const id = await ajouterSujet(e.id, nouveau)
      setSujets((s) => [...(s ?? []), { id, ...nouveau }])
      setTexte("")
    } catch {
      setErreur(t("evenements.sujets.erreur"))
    } finally {
      setBusy(false)
    }
  }

  async function basculer(s: Sujet) {
    const traite = !s.traite
    setErreur("")
    setSujets((l) => l && l.map((x) => (x.id === s.id ? { ...x, traite } : x)))
    try { await majSujet(e.id, s.id, { traite }) } catch { echec() }
  }

  async function retirer(s: Sujet) {
    if (!(await confirmer({ titre: t("evenements.sujets.confirmRetirer", { texte: s.texte }), action: t("common.buttons.remove"), destructif: true }))) return
    setErreur("")
    try {
      await retirerSujet(e.id, s.id)
      setSujets((l) => l && l.filter((x) => x.id !== s.id))
    } catch { echec() }
  }

  async function poser({ active, over }: DragEndEvent) {
    if (!sujets || !over || active.id === over.id) return
    const ids = sujets.map((s) => s.id)
    const { sujets: nouvelOrdre, changes } = reordonner(sujets, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)))
    setErreur("")
    setSujets(nouvelOrdre)
    try {
      for (const c of changes) await majSujet(e.id, c.id, { ordre: c.ordre })
    } catch { echec() }
  }

  // Annonces du glisser au clavier, pour les lecteurs d'écran (sinon en anglais).
  const texteDe = (id: UniqueIdentifier) => liste.find((s) => s.id === id)?.texte ?? ""
  const rang = (id: UniqueIdentifier) => liste.findIndex((s) => s.id === id) + 1
  const total = liste.length
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("evenements.sujets.annonceSaisi", { texte: texteDe(active.id), position: rang(active.id), total }),
    onDragOver: ({ active, over }) => over ? t("evenements.sujets.annonceDeplace", { texte: texteDe(active.id), position: rang(over.id), total }) : undefined,
    onDragEnd: ({ active, over }) => over ? t("evenements.sujets.annoncePose", { texte: texteDe(active.id), position: rang(over.id), total }) : undefined,
    onDragCancel: ({ active }) => t("evenements.sujets.annonceAnnule", { texte: texteDe(active.id) }),
  }

  return (
    <section aria-labelledby="sujets-titre" data-testid="sujets-carte" className="space-y-3 raised rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {/* « Sujets à aborder » avant le début, « Sujets » et le bilan après (planches). */}
        <h3 id="sujets-titre" className="text-base font-semibold text-foreground">{t(commencee ? "evenements.sujets.titreApres" : "evenements.sujets.titre")}</h3>
        {sujets && !commencee && <span className="rounded-md bg-secondary px-1.5 text-xs font-semibold tabular-nums text-muted-foreground">{total}</span>}
        {/* Le bilan, court, reste à droite même sur téléphone ; l'aide, longue, y passe à la ligne. */}
        <span className={`text-xs text-muted-foreground ${commencee ? "ml-auto" : "w-full sm:ml-auto sm:w-auto"}`}>
          {commencee ? t("evenements.sujets.traites", { count: traites, total }) : t("evenements.sujets.aide")}
        </span>
      </div>

      {peutAjouterSujet(user, profile, e, now) && (
        <form onSubmit={ajouter}
          className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-foreground bg-background pl-3.5 pr-1.5 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <Plus className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
          <input value={texte} onChange={(ev) => setTexte(ev.target.value)}
            aria-label={t("evenements.sujets.nouveau")} placeholder={t("evenements.sujets.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground" />
          <Button type="submit" size="sm" className="h-8" disabled={busy || !texte.trim()}>{t("evenements.sujets.ajouter")}</Button>
        </form>
      )}

      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}

      {sujets === null && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
      {sujets?.length === 0 && <p className="text-sm text-muted-foreground">{t("evenements.sujets.vide")}</p>}
      {liste.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={poser}
          accessibility={{ announcements, screenReaderInstructions: { draggable: t("evenements.sujets.instructions") } }}>
          <SortableContext items={liste.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul aria-label={t("evenements.sujets.titre")} className="divide-y divide-border">
              {liste.map((s) => (
                <LigneSujet key={s.id} sujet={s} rouge={estRouge(e, s, now)} provenance={provenance(s)} ordonner={ordonner}
                  retirer={peutRetirerSujet(user, e, s)} onTraite={() => basculer(s)} onRetirer={() => retirer(s)} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {!commencee && <p className="text-sm text-muted-foreground">{t("evenements.sujets.noteAvant")}</p>}
      {rouges > 0 && <p className={`text-sm ${ROUGE}`}>{t("evenements.sujets.noteRouge", { count: rouges })}</p>}
    </section>
  )
}
