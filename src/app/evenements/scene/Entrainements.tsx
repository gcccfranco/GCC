"use client"

// Volet Entraînements. Lot U1 (docs/spec-scene-saison.md) : un bloc par jour
// réservable à venir, en grille — l'heure, « Libre · Réserver », « Pris », ou la
// réservation et son auteur. « Réserver » ouvre le formulaire sur ce créneau ;
// « Modifier » propose les créneaux libres pour déplacer. Les chevauchements
// restent refusés à l'enregistrement et marqués en rouge s'ils existent
// malgré tout ; les jours passés attendent derrière un lien.

import { useState, type CSSProperties } from "react"
import { useTranslation } from "react-i18next"
import type { User } from "firebase/auth"
import { canEditCreneau, canReserverPour, isCoordination } from "@/lib/access"
import { createCreneau, deleteCreneau, listCreneaux, updateCreneau } from "@/lib/firebase/programmes"
import { overlaps, todayIso } from "@/lib/scene/dimanches"
import {
  commence, creneauxLibres, heureLocale, joursReservables, lignesDuJour, quiPermis, saisonDe, type Place,
} from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { QUI, type Creneau, type Programme } from "@/types/programme"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"
import { BadgeHorsGrille } from "./Apercu"
import { CreneauForm, type CreneauValues } from "./CreneauForm"
import { LigneJour } from "./LigneJour"
import { titreDuJour } from "./libelles"

const COLOR = PLANNING_COLORS.scene

type Action = { type: "nouveau"; place: Place } | { type: "modifier"; creneau: Creneau }

const memePlace = (a: { debut: string; fin: string }, b: { debut: string; fin: string }) => a.debut === b.debut && a.fin === b.fin

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
  const [action, setAction] = useState<Action | null>(null)

  const conflicts = new Set(creneaux.filter((c) => creneaux.some((o) => o.id !== c.id && overlaps(c, o))).map((c) => c.id))
  const slotLabel = (c: Creneau) => `${c.debut} – ${c.fin} · ${c.quoi} · ${c.qui.join(", ")} (${c.auteurNom})`
  const auteurNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""
  // Q4 : la coordination n'est pas limitée ; un membre choisit parmi les groupes permis.
  const quiOptions = coordination ? QUI : quiPermis(programme)

  async function save(values: CreneauValues): Promise<string | null> {
    const editingId = action?.type === "modifier" ? action.creneau.id : null
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
      setAction(null)
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

  function formulaire(d: string, l: { debut: string; fin: string }, c?: Creneau) {
    if (c && action?.type === "modifier" && action.creneau.id === c.id) {
      return (
        <CreneauForm
          title={t("planning.programme.editTitle")}
          places={placesPour(c)}
          initial={{ dimanche: c.dimanche, debut: c.debut, fin: c.fin, quoi: c.quoi, qui: c.qui, note: c.note }}
          quiOptions={[...new Set([...quiOptions, ...c.qui])]}
          onSubmit={save}
          onCancel={() => setAction(null)}
        />
      )
    }
    if (!c && action?.type === "nouveau" && action.place.jour === d && memePlace(action.place, l)) {
      return (
        <CreneauForm
          title={t("planning.programme.newTitle")}
          place={action.place}
          initial={{ dimanche: d, debut: l.debut, fin: l.fin, quoi: "Séance louange", qui: [], note: "" }}
          quiOptions={quiOptions}
          onSubmit={save}
          onCancel={() => setAction(null)}
        />
      )
    }
    return null
  }

  const shown = [...(showPast ? past : []), ...upcoming]

  return (
    <div className="space-y-4">
      {past.length > 0 && (
        <button type="button" className="text-xs font-semibold svc-ink" style={{ "--svc": COLOR } as CSSProperties} onClick={() => setShowPast(!showPast)}>
          {showPast ? t("planning.programme.hidePast") : t("planning.programme.showPast", { n: past.length })}
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        {shown.map((d) => {
          const label = titreDuJour(d, i18n.language)
          return (
            <section key={d} aria-label={label} className="bg-card shadow-soft rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: d < today ? "#8b8fa8" : COLOR }}>{label}</div>
              <ul className="p-3 space-y-2">
                {lignesDuJour(saison, d, creneaux).map((l) => {
                  if (l.type !== "reserve") {
                    const ouvert = l.type === "libre" && !commence(d, l.debut, today, maintenant)
                    return (
                      <LigneJour
                        key={`${l.type}-${l.debut}`}
                        ligne={l}
                        droite={ouvert && !formulaire(d, l) ? (
                          <Button size="sm" variant="ghost" className="h-8 svc-ink" style={{ "--svc": COLOR } as CSSProperties}
                            aria-label={t("planning.saison.reserverA", { debut: l.debut, fin: l.fin })}
                            onClick={() => setAction({ type: "nouveau", place: { jour: d, debut: l.debut, fin: l.fin } })}>
                            {t("planning.saison.reserver")}
                          </Button>
                        ) : undefined}
                        sous={formulaire(d, l)}
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
                      droite={
                        <>
                          <span className="text-muted-foreground">{c.auteurNom}</span>
                          {canEditCreneau(user, profile, c) && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setAction({ type: "modifier", creneau: c })}>{t("planning.programme.edit")}</Button>
                              <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => remove(c)}>{t("planning.programme.remove")}</Button>
                            </>
                          )}
                        </>
                      }
                      sous={
                        <>
                          {c.note && <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>}
                          {formulaire(d, l, c)}
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
    </div>
  )
}
