"use client"

// Volet Entraînements. Lot U1 (docs/spec-scene-saison.md, planche
// scene-reserver-telephone) : un bloc par jour réservable à venir, en grille —
// l'heure, « Libre · Réserver », ou la réservation et son auteur.
// « Réserver » ouvre la feuille sur ce créneau ; sur sa réservation (toutes pour
// la coordination), « Modifier » propose les créneaux libres pour déplacer et
// « Retirer » la supprime. Les chevauchements restent refusés à
// l'enregistrement et marqués en rouge s'ils existent malgré tout ; les jours
// passés attendent derrière un lien.

import { useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, Pencil, Trash2 } from "lucide-react"
import type { User } from "firebase/auth"
import { canEditCreneau, canReserverPour, isCoordination } from "@/lib/access"
import { createCreneau, deleteCreneau, listCreneaux, updateCreneau } from "@/lib/firebase/programmes"
import { overlaps, todayIso } from "@/lib/scene/dimanches"
import {
  commence, creneauxLibres, heureLocale, joursReservables, lignesDuJour, quiPermis, saisonDe, type Place,
} from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Creneau, Programme } from "@/types/programme"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"
import { BadgeHorsGrille } from "./Apercu"
import { CreneauForm, type CreneauValues } from "./CreneauForm"
import { LigneJour } from "./LigneJour"
import { titreDuJour } from "./libelles"

const COLOR = PLANNING_COLORS.scene

type Action = { type: "nouveau"; place: Place } | { type: "modifier"; creneau: Creneau }

const memePlace = (a: { debut: string; fin: string }, b: { debut: string; fin: string }) => a.debut === b.debut && a.fin === b.fin

/** Bouton blanc sous sa réservation (planche : « Modifier », « Retirer »). */
const ACTION = "h-11 px-4 text-sm bg-card shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary"

export function Entrainements({ programme, creneaux, user, profile, onChanged, onConflict }: {
  programme: Programme
  creneaux: Creneau[]
  user: User
  profile: UserProfile | null
  onChanged: () => Promise<void>
  /** Appelé quand un créneau qu'on vient d'enregistrer en chevauche un autre (course perdue). */
  onConflict?: (a: Creneau, b: Creneau) => void
}) {
  const { t, i18n } = useTranslation()
  const saison = saisonDe(programme)
  const today = todayIso()
  const maintenant = heureLocale()
  const coordination = isCoordination(user, profile)
  // Les jours réservables, plus ceux d'une réservation hors grille (Q8) : rien ne disparaît.
  const jours = [...new Set([...joursReservables(saison, programme.jourJ), ...creneaux.map((c) => c.dimanche)])].sort()
  const upcoming = jours.filter((d) => d >= today)
  const past = jours.filter((d) => d < today)
  const [showPast, setShowPast] = useState(false)
  // La feuille garde son contenu pendant qu'elle se referme : `action` reste,
  // `ouverte` passe à faux. `fois` la remonte à neuf à chaque ouverture.
  const [action, setAction] = useState<Action | null>(null)
  const [ouverte, setOuverte] = useState(false)
  const [fois, setFois] = useState(0)

  const conflicts = new Set(creneaux.filter((c) => creneaux.some((o) => o.id !== c.id && overlaps(c, o))).map((c) => c.id))
  const slotLabel = (c: Creneau) => `${c.debut} – ${c.fin} · ${c.quoi} · ${c.qui.join(", ")} (${c.auteurNom})`
  const auteurNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""
  // Q4 : la coordination n'est pas limitée ; un membre choisit parmi les groupes permis.
  const quiLimite = !coordination && saison.quiAutorises.length > 0
  const quiOptions = quiPermis(coordination ? {} : programme)

  function ouvrir(a: Action) {
    setAction(a)
    setOuverte(true)
    setFois((n) => n + 1)
  }

  async function save(values: CreneauValues): Promise<string | null> {
    const editingId = action?.type === "modifier" ? action.creneau.id : null
    // Q11, revu à l'enregistrement : la feuille a pu rester ouverte pendant que le
    // créneau commençait. Garder son créneau (changer la note, le qui) reste permis.
    const autreCreneau = action?.type !== "modifier"
      || values.dimanche !== action.creneau.dimanche || values.debut !== action.creneau.debut
    if (autreCreneau && commence(values.dimanche, values.debut, todayIso(), heureLocale())) return t("planning.saison.dejaCommence")
    if (!canReserverPour(user, profile, programme, values.qui)) {
      return t("planning.saison.quiRefuse", { qui: values.qui.filter((q) => !quiPermis(programme).includes(q)).join(", ") })
    }
    try {
      // Relecture juste avant d'écrire : la scène est unique, un chevauchement est refusé.
      const fresh = await listCreneaux(programme.id)
      const clash = fresh.find((c) => c.id !== editingId && overlaps(c, values))
      if (clash) return t("planning.programme.overlap", { slot: slotLabel(clash) })
      const now = new Date().toISOString()
      let id = editingId
      if (id) await updateCreneau(programme.id, id, values)
      else id = await createCreneau(programme.id, { ...values, auteurUid: user.uid, auteurNom, createdAt: now, updatedAt: now })
      // Course perdue (deux enregistrements à la même seconde) : on prévient.
      const after = await listCreneaux(programme.id)
      const mine = after.find((c) => c.id === id)
      const other = mine && after.find((c) => c.id !== id && overlaps(c, mine))
      if (mine && other) onConflict?.(mine, other)
      setOuverte(false)
      await onChanged()
      return null
    } catch {
      return t("planning.programme.error")
    }
  }

  async function remove(c: Creneau) {
    if (!window.confirm(t("planning.programme.confirmRemove"))) return
    await deleteCreneau(programme.id, c.id)
    await onChanged()
  }

  /** « Modifier » : les créneaux libres de la saison, et l'actuel pour ne changer que le reste. */
  function placesPour(c: Creneau): Place[] {
    const libres = creneauxLibres(saison, programme.jourJ, creneaux, { sauf: c.id, today, maintenant })
    const actuelle = { jour: c.dimanche, debut: c.debut, fin: c.fin }
    if (libres.some((p) => p.jour === c.dimanche && memePlace(p, c))) return libres
    return [...libres, actuelle].sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut))
  }

  const shown = [...(showPast ? past : []), ...upcoming]

  return (
    <div className="space-y-3">
      {past.length > 0 && (
        <button type="button" className="h-11 -my-1 inline-flex items-center gap-1.5 text-sm font-semibold svc-ink" style={{ "--svc": COLOR } as CSSProperties}
          aria-expanded={showPast} onClick={() => setShowPast(!showPast)}>
          {showPast ? t("planning.programme.hidePast") : t("planning.programme.showPast", { n: past.length })}
          <ChevronDown className={`h-4 w-4 transition-transform ${showPast ? "rotate-180" : ""}`} aria-hidden />
        </button>
      )}

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        {shown.map((d) => {
          const label = titreDuJour(d, i18n.language)
          return (
            <section key={d} aria-label={label} className="bg-card shadow-soft rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 text-[15px] font-semibold text-white" style={{ background: d < today ? "#8b8fa8" : COLOR }}>{label}</div>
              <ul className="px-3 pt-2.5 pb-3 space-y-1.5">
                {lignesDuJour(saison, d, creneaux).map((l) => {
                  if (l.type !== "reserve") {
                    const libre = l.type === "libre" && !commence(d, l.debut, today, maintenant)
                    return (
                      <LigneJour
                        key={`${l.type}-${l.debut}`}
                        ligne={l}
                        droite={libre ? (
                          <Button size="sm" className="h-11 -my-2 -mr-2 px-4 svc-ink hover:opacity-80"
                            style={{ "--svc": COLOR, background: `${COLOR}1f` } as CSSProperties}
                            aria-label={t("planning.saison.reserverA", { debut: l.debut, fin: l.fin })}
                            onClick={() => ouvrir({ type: "nouveau", place: { jour: d, debut: l.debut, fin: l.fin } })}>
                            {t("planning.saison.reserver")}
                          </Button>
                        ) : undefined}
                      />
                    )
                  }
                  const c = l.creneau
                  const conflict = conflicts.has(c.id)
                  return (
                    <LigneJour
                      key={c.id}
                      ligne={l}
                      conflit={conflict}
                      badges={
                        <>
                          {conflict && <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-800">⚠ {t("planning.programme.conflict")}</span>}
                          {coordination && l.horsGrille && <BadgeHorsGrille />}
                        </>
                      }
                      droite={<span className="text-foreground/80">{c.auteurNom}</span>}
                      sous={
                        <>
                          {c.note && <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>}
                          {canEditCreneau(user, profile, c) && (
                            <div className="mt-2 mb-0.5 flex flex-wrap gap-2 pl-16">
                              <Button size="sm" variant="ghost" className={ACTION} onClick={() => ouvrir({ type: "modifier", creneau: c })}>
                                <Pencil aria-hidden />{t("planning.programme.edit")}
                              </Button>
                              <Button size="sm" variant="ghost" className={`${ACTION} text-destructive hover:text-destructive`} onClick={() => remove(c)}>
                                <Trash2 aria-hidden />{t("planning.programme.remove")}
                              </Button>
                            </div>
                          )}
                        </>
                      }
                    />
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {action && (
        <CreneauForm
          key={fois}
          open={ouverte}
          {...(action.type === "nouveau"
            ? {
              title: t("planning.saison.reserver"),
              submitLabel: t("planning.saison.reserver"),
              place: action.place,
              initial: { dimanche: action.place.jour, debut: action.place.debut, fin: action.place.fin, quoi: "Séance louange", qui: [], note: "" },
              quiOptions,
            }
            : {
              title: t("planning.programme.editTitle"),
              submitLabel: t("planning.programme.save"),
              places: placesPour(action.creneau),
              initial: {
                dimanche: action.creneau.dimanche, debut: action.creneau.debut, fin: action.creneau.fin,
                quoi: action.creneau.quoi, qui: action.creneau.qui, note: action.creneau.note,
              },
              quiOptions: [...new Set([...quiOptions, ...action.creneau.qui])],
            })}
          quiLimite={quiLimite}
          onSubmit={save}
          onCancel={() => setOuverte(false)}
        />
      )}
    </div>
  )
}
