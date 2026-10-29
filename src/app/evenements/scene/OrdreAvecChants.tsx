"use client"

// L'ordre de passage d'une fête avec ses chants, ses musiques et ses danses (docs/spec-chants-fetes.md,
// CF6-CF9, CF22-CF23) : enveloppe d'`OrdrePassage` qui lit les setlists de l'édition et, pour la page de
// la fête, les droits de la personne (`/api/fetes/droits`, seule source des boutons). `actions` faux
// (Back-Office, lecture) : chants et musiques seulement, ni boutons de saisie ni filtre.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { getSetlistsDeFete, type FSSetlist } from "@/lib/firebase/setlists"
import { PROGRAMMES_CHANGED } from "@/lib/firebase/programmes"
import { appelerFetes } from "@/lib/fetes/client"
import { nouvelIdPassage, validerMedias } from "@/lib/fetes/passages"
import { useSongsIndex } from "@/hooks/useSongsIndex"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { MediaPassage, Passage, Programme } from "@/types/programme"
import { Pilules } from "@/components/layout/Onglets"
import { MediaForm } from "./MediaForm"
import { OrdrePassage } from "./OrdrePassage"
import type { DetailFete, DroitsPassage } from "./PassageDetail"

const COLOR = PLANNING_COLORS.scene

const vide = (): MediaPassage => ({ id: nouvelIdPassage(), type: "musique", titre: "", lien: "", duree: "", depart: "", note: "" })

export function OrdreAvecChants({ programme, actions, canEdit = false, onSave, entete }: {
  programme: Programme
  /** Le titre de la section : le filtre « Tous · Le mien » se pose à sa droite (en dessous sur téléphone, CF8). */
  entete?: ReactNode
  actions: boolean
  canEdit?: boolean
  onSave?: (passages: Passage[]) => Promise<boolean | void>
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const { songs } = useSongsIndex()
  const [setlists, setSetlists] = useState<FSSetlist[]>([])
  const [droits, setDroits] = useState<DroitsPassage[] | null>(null)
  const [filtre, setFiltre] = useState<"tous" | "mien">("tous")
  const [message, setMessage] = useState("")
  const [feuille, setFeuille] = useState<{ passage: Passage; media: MediaPassage; nouveau: boolean } | null>(null)
  const idsPoses = useRef(false)

  const [lecture, setLecture] = useState(0)
  const charger = () => setLecture((n) => n + 1)
  const sansId = programme.passages.some((p) => !p.id)
  // Signature des passages : un rechargement du programme (musique écrite, réservation) ne relit pas les droits.
  const signature = programme.passages.map((p) => `${p.id}:${p.qui.join("|")}`).join(",")
  const alerte = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (message) alerte.current?.scrollIntoView({ block: "nearest" }) }, [message])

  useEffect(() => {
    let vivant = true
    ;(async () => {
      const lues = await getSetlistsDeFete(programme.id).catch(() => [])
      const r = actions ? await appelerFetes<{ passages: DroitsPassage[] }>("droits", { programme: programme.id }) : null
      if (!vivant) return
      setSetlists(lues)
      if (!r) return
      setDroits(r.ok ? r.data.passages : null)
      // La route vient de donner leurs `id` aux passages d'avant : on relit le programme une fois.
      if (r.ok && sansId && !idsPoses.current) {
        idsPoses.current = true
        window.dispatchEvent(new Event(PROGRAMMES_CHANGED))
      }
    })()
    return () => { vivant = false }
  }, [programme.id, actions, sansId, signature, lecture])

  /** Message de la réponse : la saisie close se dit ; un passage devenu autre est « recharge » ; le reste est générique. */
  const dire = (status: number, erreur = "") =>
    t(/close/.test(erreur) ? "planning.fete.saisieClose" : status === 409 || status === 403 ? "planning.fete.erreurPassage" : "planning.programme.error")

  async function saisir(p: Passage) {
    setMessage("")
    const r = await appelerFetes<{ setlistId: string }>("saisir", { programme: programme.id, passage: p.id })
    if (r.ok) return router.push(`/setlists/${r.data.setlistId}/edit?depuis=fete`)
    setMessage(dire(r.status, r.erreur))
    // Le passage a peut-être changé (plusieurs Qui, retiré) : on relit aussi le programme.
    window.dispatchEvent(new Event(PROGRAMMES_CHANGED))
    charger()
  }

  async function ecrireMedias(p: Passage, medias: MediaPassage[]): Promise<string | null> {
    const r = await appelerFetes("musiques", { programme: programme.id, passage: p.id, medias })
    if (r.ok) { window.dispatchEvent(new Event(PROGRAMMES_CHANGED)); return null }
    return dire(r.status, r.erreur)
  }

  const detail: DetailFete = {
    setlists, songs, droits: actions ? droits : null,
    ...(actions && {
      onSaisir: saisir,
      onAjouterMedia: (passage: Passage) => setFeuille({ passage, media: vide(), nouveau: true }),
      onModifierMedia: (passage: Passage, media: MediaPassage) => setFeuille({ passage, media, nouveau: false }),
      onRetirerMedia: async (passage: Passage, media: MediaPassage) => {
        const m = await ecrireMedias(passage, (passage.medias ?? []).filter((x) => x.id !== media.id))
        if (m) setMessage(m)
      },
    }),
  }
  const aDesMiens = !!droits?.some((d) => d.mien)
  // Plus aucun passage à moi (droits relus) : le filtre disparaît, la liste revient entière.
  const seulementMiens = aDesMiens && filtre === "mien"

  return (
    <div className="space-y-3">
      {(entete || (actions && aDesMiens)) && <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-4 [&>*:only-child]:flex-1">
        {entete}
        {actions && aDesMiens && (
        <Pilules
          etiquette={t("planning.fete.filtre")}
          options={[
            { cle: "tous", nom: t("planning.fete.tous"), couleur: COLOR },
            { cle: "mien", nom: t("planning.fete.mien"), couleur: COLOR },
          ]}
          valeur={seulementMiens ? "mien" : "tous"}
          choisir={(v) => setFiltre(v ?? "tous")}
          obligatoire
        />
        )}
      </div>}
      {message && <p ref={alerte} role="alert" className="text-sm text-destructive">{message}</p>}
      <OrdrePassage passages={programme.passages} canEdit={canEdit} onSave={onSave ?? (async () => undefined)} detail={detail} seulementMiens={seulementMiens} />
      {feuille && (
        <MediaForm
          open
          initial={feuille.media}
          onCancel={() => setFeuille(null)}
          onSubmit={async (m) => {
            const liste = feuille.passage.medias ?? []
            const suivante = feuille.nouveau ? [...liste, m] : liste.map((x) => (x.id === m.id ? m : x))
            const verdict = validerMedias(suivante)
            if (!verdict.ok) return t(`planning.fete.media.erreur.${verdict.erreur}`)
            const erreur = await ecrireMedias(feuille.passage, suivante)
            if (!erreur) setFeuille(null)
            return erreur
          }}
        />
      )}
    </div>
  )
}
