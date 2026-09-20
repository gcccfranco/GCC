"use client"

// Volet Entraînements : un bloc par dimanche réservable (« Scène libre » si
// vide), réservation, modification et retrait selon les droits, chevauchements
// refusés à l'enregistrement et marqués en rouge s'ils existent malgré tout.

import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { User } from "firebase/auth"
import { canEditCreneau } from "@/lib/access"
import { createCreneau, deleteCreneau, listCreneaux, updateCreneau } from "@/lib/firebase/programmes"
import { overlaps, sundaysBetween, todayIso } from "@/lib/scene/dimanches"
import { fdLongL } from "@/lib/planning/utils"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Creneau, Programme } from "@/types/programme"
import type { UserProfile } from "@/types/user"
import { Button } from "@/components/ui/button"
import { CreneauForm, type CreneauValues } from "./CreneauForm"

const COLOR = PLANNING_COLORS.scene

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  return accent
    ? <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${COLOR}18`, color: COLOR }}>{label}</span>
    : <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground">{label}</span>
}

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
  const today = todayIso()
  const dimanches = sundaysBetween(programme.debut, programme.jourJ)
  const upcoming = dimanches.filter((d) => d >= today)
  const past = dimanches.filter((d) => d < today)
  const [showPast, setShowPast] = useState(false)
  const [editing, setEditing] = useState<Creneau | null | "new">(null)

  const conflicts = new Set(creneaux.filter((c) => creneaux.some((o) => o.id !== c.id && overlaps(c, o))).map((c) => c.id))
  const slotLabel = (c: Creneau) => `${c.debut} – ${c.fin} · ${c.quoi} · ${c.qui.join(", ")} (${c.auteurNom})`
  const auteurNom = profile ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email : user.email ?? ""

  async function save(values: CreneauValues): Promise<string | null> {
    const editingId = editing && editing !== "new" ? editing.id : null
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
      setEditing(null)
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

  const initial: CreneauValues = editing && editing !== "new"
    ? { dimanche: editing.dimanche, debut: editing.debut, fin: editing.fin, quoi: editing.quoi, qui: editing.qui, note: editing.note }
    : { dimanche: upcoming[0] ?? "", debut: "17:00", fin: "18:00", quoi: "Séance louange", qui: [], note: "" }

  const shown = [...(showPast ? past : []), ...upcoming]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {past.length > 0 ? (
          <button type="button" className="text-xs font-semibold" style={{ color: COLOR }} onClick={() => setShowPast(!showPast)}>
            {showPast ? t("planning.programme.hidePast") : t("planning.programme.showPast", { n: past.length })}
          </button>
        ) : <span />}
        {upcoming.length > 0 && !editing && (
          <Button size="sm" style={{ background: COLOR }} onClick={() => setEditing("new")}>{t("planning.programme.reserver")}</Button>
        )}
      </div>

      {editing && (
        <CreneauForm
          title={editing === "new" ? t("planning.programme.newTitle") : t("planning.programme.editTitle")}
          dimanches={editing === "new" ? upcoming : Array.from(new Set([editing.dimanche, ...upcoming])).sort()}
          initial={initial}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      )}

      {shown.map((d) => {
        const label = t("planning.programme.sunday", { date: fdLongL(d, i18n.language) })
        const rows = creneaux.filter((c) => c.dimanche === d)
        return (
          <section key={d} aria-label={label} className="bg-card shadow-soft rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: d < today ? "#8b8fa8" : COLOR }}>{label}</div>
            {rows.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">{t("planning.programme.sceneLibre")}</p>}
            {rows.map((c) => {
              const conflict = conflicts.has(c.id)
              return (
                <div key={c.id} className="px-4 py-3 border-t border-border grid gap-1 sm:grid-cols-[auto_1fr_auto] sm:items-start sm:gap-3">
                  <div className="font-bold tabular-nums whitespace-nowrap" style={conflict ? { color: "#b91c1c" } : undefined}>
                    {c.debut} – {c.fin}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                      <Chip label={c.quoi} accent />
                      {c.qui.map((q) => <Chip key={q} label={q} />)}
                      {conflict && <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-800">⚠ {t("planning.programme.conflict")}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{c.auteurNom}{c.note ? ` — ${c.note}` : ""}</p>
                  </div>
                  {canEditCreneau(user, profile, c) && (
                    <div className="flex gap-1 sm:justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>{t("planning.programme.edit")}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(c)}>{t("planning.programme.remove")}</Button>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
