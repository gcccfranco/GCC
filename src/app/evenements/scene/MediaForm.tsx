"use client"

// Feuille « Musique ou danse » d'un passage de fête (docs/spec-chants-fetes.md, CF22) : type, titre,
// lien, durée et départ (« m:ss », facultatifs), note pour la régie. En bas sur téléphone, centrée et
// étroite au-delà, comme la feuille « Réserver ».

import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { validerMedias, type ErreurMedia } from "@/lib/fetes/passages"
import type { MediaPassage } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Pilules } from "@/components/layout/Onglets"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"

const COLOR = PLANNING_COLORS.scene

/** Le champ qui porte chaque erreur de `validerMedias`. */
const CHAMP: Record<ErreurMedia, "titre" | "lien" | "duree" | "depart" | "note" | "general"> = {
  titre: "titre", lien: "lien", duree: "duree", depart: "depart", note: "note", format: "general", trop: "general", type: "general",
}

function Champs({ initial, onSubmit, onCancel }: {
  initial: MediaPassage
  /** Renvoie un message d'erreur, ou `null` si c'est enregistré. */
  onSubmit: (m: MediaPassage) => Promise<string | null>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [v, setV] = useState<MediaPassage>(initial)
  const [erreur, setErreur] = useState<{ champ: string; message: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const verdict = validerMedias([v])
    if (!verdict.ok) {
      setErreur({ champ: CHAMP[verdict.erreur], message: t(`planning.fete.media.erreur.${verdict.erreur}`) })
      return
    }
    setBusy(true); setErreur(null)
    const message = await onSubmit(verdict.medias[0])
    setBusy(false)
    if (message) setErreur({ champ: "general", message })
  }

  const sous = (champ: string) => erreur?.champ === champ && <p role="alert" className="text-sm text-destructive">{erreur.message}</p>
  const facultatif = <span className="font-normal"> · {t("planning.fete.media.facultatif")}</span>
  const etiquette = "text-[13px] font-semibold text-muted-foreground"

  return (
    <form onSubmit={submit} noValidate className="px-4 pb-6 space-y-4 overflow-y-auto">
      {sous("general")}
      <Pilules
        etiquette={t("planning.fete.media.type")}
        options={[
          { cle: "musique", nom: t("planning.fete.media.musique"), couleur: COLOR },
          { cle: "danse", nom: t("planning.fete.media.danse"), couleur: COLOR },
        ]}
        valeur={v.type}
        choisir={(type) => type && setV({ ...v, type })}
        obligatoire
      />
      <div className="space-y-2">
        <label htmlFor="media-titre" className={etiquette}>{t("planning.fete.media.titre")}</label>
        <Input id="media-titre" className="h-11 rounded-xl" value={v.titre} maxLength={80} onChange={(e) => setV({ ...v, titre: e.target.value })} />
        {sous("titre")}
      </div>
      <div className="space-y-2">
        <label htmlFor="media-lien" className={etiquette}>{t("planning.fete.media.lien")}{facultatif}</label>
        <Input id="media-lien" className="h-11 rounded-xl" type="url" inputMode="url" placeholder="YouTube, Drive…" value={v.lien} onChange={(e) => setV({ ...v, lien: e.target.value })} />
        {sous("lien")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="media-duree" className={etiquette}>{t("planning.fete.media.duree")}{facultatif}</label>
          <Input id="media-duree" className="h-11 rounded-xl" placeholder="3:40" value={v.duree} onChange={(e) => setV({ ...v, duree: e.target.value })} />
          {sous("duree")}
        </div>
        <div className="space-y-2">
          <label htmlFor="media-depart" className={etiquette}>{t("planning.fete.media.depart")}{facultatif}</label>
          <Input id="media-depart" className="h-11 rounded-xl" placeholder="0:12" value={v.depart} onChange={(e) => setV({ ...v, depart: e.target.value })} />
          {sous("depart")}
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="media-note" className={etiquette}>{t("planning.fete.media.note")}{facultatif}</label>
        <Input id="media-note" className="h-11 rounded-xl" value={v.note} maxLength={200} onChange={(e) => setV({ ...v, note: e.target.value })} />
        {sous("note")}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="h-11 flex-1 rounded-xl" style={{ background: COLOR }}>{t("planning.programme.save")}</Button>
        <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={onCancel}>{t("planning.programme.cancel")}</Button>
      </div>
    </form>
  )
}

export function MediaForm({ open, initial, onSubmit, onCancel }: {
  open: boolean
  initial: MediaPassage
  onSubmit: (m: MediaPassage) => Promise<string | null>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  useStandaloneScrollLock(open)
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onCancel()}>
      <DrawerContent className="max-h-[92vh] md:max-w-lg md:mx-auto" aria-describedby={undefined}>
        <DrawerHeader className="pb-1 text-left">
          <DrawerTitle className="text-xl font-bold">{t("planning.fete.media.feuille")}</DrawerTitle>
        </DrawerHeader>
        {/* Remontée à neuf à chaque ouverture : un champ n'en garde pas un autre. */}
        {open && <Champs key={initial.id} initial={initial} onSubmit={onSubmit} onCancel={onCancel} />}
      </DrawerContent>
    </Drawer>
  )
}
