"use client"

// Volet « Programme {nom} » : l'ordre de passage du jour J, numéroté, sans
// horaire ni durée (la brochure, digitalisée). La coordination ajoute,
// modifie, retire et réordonne (glisser-déposer, comme les setlists).

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { useDefaultSensors } from "@/lib/dnd/sensors"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { QUOI, type Passage } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuiChecklist } from "./CreneauForm"

const COLOR = PLANNING_COLORS.scene

function PassageForm({ title, initial, onSubmit, onCancel }: {
  title: string
  initial: Passage
  onSubmit: (p: Passage) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState<Passage>(initial)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (v.qui.length === 0) { setError(t("planning.programme.needQui")); return }
    setBusy(true); setError("")
    try { await onSubmit({ ...v, titre: v.titre.trim() }) } catch { setError(t("planning.programme.error")) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="bg-card shadow-soft rounded-xl p-4 space-y-3" aria-labelledby="passage-form-title">
      <h3 id="passage-form-title" className="text-sm font-bold">{title}</h3>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="space-y-1">
        <label htmlFor="passage-titre" className="text-xs font-semibold">{t("planning.programme.titre")}</label>
        <Input id="passage-titre" value={v.titre} maxLength={80} placeholder={t("planning.programme.titreHint")} onChange={(e) => setV({ ...v, titre: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <label htmlFor="passage-quoi" className="text-xs font-semibold">{t("planning.programme.quoi")}</label>
        <select id="passage-quoi" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={v.quoi} onChange={(e) => setV({ ...v, quoi: e.target.value })}>
          {QUOI.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <QuiChecklist value={v.qui} onChange={(qui) => setV({ ...v, qui })} />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} style={{ background: COLOR }}>{t("planning.programme.save")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("planning.programme.cancel")}</Button>
      </div>
    </form>
  )
}

function Row({ id, index, passage, canEdit, onEdit, onRemove }: {
  id: string; index: number; passage: Passage; canEdit: boolean; onEdit: () => void; onRemove: () => void
}) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !canEdit })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`px-4 py-3 grid grid-cols-[2rem_1fr_auto] gap-3 items-center bg-card ${isDragging ? "shadow-lg relative z-10" : ""}`}>
      <span className="text-lg font-extrabold tabular-nums text-center" style={{ color: COLOR }}>{index + 1}</span>
      <div className="min-w-0">
        <p className="font-semibold">{passage.titre}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="inline-block text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${COLOR}18`, color: COLOR }}>{passage.quoi}</span>
          {passage.qui.map((q) => <span key={q} className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary">{q}</span>)}
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onEdit}>{t("planning.programme.edit")}</Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={onRemove}>{t("planning.programme.remove")}</Button>
          <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} aria-label={t("planning.programme.move")}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground cursor-grab touch-none">
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      )}
    </li>
  )
}

export function OrdrePassage({ passages, canEdit, onSave }: {
  passages: Passage[]
  canEdit: boolean
  onSave: (passages: Passage[]) => Promise<void>
}) {
  const { t } = useTranslation()
  const sensors = useDefaultSensors()
  const [editing, setEditing] = useState<number | "new" | null>(null)
  const ids = passages.map((_, i) => `passage-${i}`)

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    onSave(arrayMove(passages, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  async function submit(p: Passage) {
    const next = editing === "new" ? [...passages, p] : passages.map((x, i) => (i === editing ? p : x))
    await onSave(next)
    setEditing(null)
  }

  async function remove(i: number) {
    if (!window.confirm(t("planning.programme.confirmRemovePassage"))) return
    await onSave(passages.filter((_, j) => j !== i))
  }

  const initial: Passage = editing !== null && editing !== "new" ? passages[editing] : { quoi: "Chant", qui: [], titre: "" }

  return (
    <div className="space-y-4">
      {canEdit && !editing && editing !== 0 && (
        <div className="flex justify-end">
          <Button size="sm" style={{ background: COLOR }} onClick={() => setEditing("new")}>{t("planning.programme.addPassage")}</Button>
        </div>
      )}
      {editing !== null && (
        <PassageForm
          title={editing === "new" ? t("planning.programme.newPassage") : t("planning.programme.editPassage")}
          initial={initial}
          onSubmit={submit}
          onCancel={() => setEditing(null)}
        />
      )}
      <section className="bg-card shadow-soft rounded-xl overflow-hidden">
        <h3 className="px-4 py-2.5 text-sm font-semibold text-white" style={{ background: COLOR }}>{t("planning.programme.ordreTitle")}</h3>
        {passages.length === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">{t("planning.programme.noPassage")}</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol className="divide-y divide-border" aria-label={t("planning.programme.ordreTitle")}>
              {passages.map((p, i) => (
                <Row key={ids[i]} id={ids[i]} index={i} passage={p} canEdit={canEdit}
                  onEdit={() => setEditing(i)} onRemove={() => remove(i)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  )
}
