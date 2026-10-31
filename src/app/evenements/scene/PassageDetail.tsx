"use client"

// Ce qu'une ligne de l'ordre de passage porte en plus de son titre (docs/spec-chants-fetes.md, CF6,
// CF7) : ses chants (lus dans la setlist du passage, jamais recopiés), ses musiques et danses, et les
// boutons que la route /api/fetes/droits accorde. Aucun droit n'est recalculé ici.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { estUnChant, resoudrePropositions } from "@/lib/setlist/propositions"
import type { FSSetlist } from "@/lib/firebase/setlists"
import type { MediaPassage, Passage } from "@/types/programme"
import type { SetlistItem } from "@/types/setList"
import type { SongIndexEntry } from "@/types/song"
import { Button } from "@/components/ui/button"
import { MenuActions } from "@/components/layout/MenuActions"

const COLOR = PLANNING_COLORS.scene

export type DroitsPassage = { id: string; chants: boolean; musiques: boolean; mien: boolean }

export type DetailFete = {
  setlists: FSSetlist[]
  songs: SongIndexEntry[] | null
  /** Aligné sur les passages ; `null` = rien à montrer (lecture, ou droits pas encore lus). */
  droits: DroitsPassage[] | null
  onSaisir?: (p: Passage) => void
  onAjouterMedia?: (p: Passage) => void
  onModifierMedia?: (p: Passage, m: MediaPassage) => void
  onRetirerMedia?: (p: Passage, m: MediaPassage) => void
}

/** La setlist d'un passage (celle dont `fete.passage` est son id), avec ses propositions résolues. */
function setlistDuPassage(p: Passage, d: DetailFete): { setlist: FSSetlist; items: SetlistItem[] } | null {
  const setlist = p.id ? d.setlists.find((s) => s.fete?.passage === p.id) : undefined
  if (!setlist) return null
  return { setlist, items: resoudrePropositions(setlist.items, d.songs ?? []) }
}

function Chant({ item, songs }: { item: SetlistItem; songs: SongIndexEntry[] | null }) {
  const { t } = useTranslation()
  const song = (slug: string) => songs?.find((s) => s.slug === slug)
  if (item.type === "proposition") {
    return (
      <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
        <span>{item.proposition?.titre}</span>
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300" style={{ background: "#ea580c1f" }}>
          {t("planning.fete.propositionEnAttente")}
        </span>
      </li>
    )
  }
  const slugs = item.type === "fusion" && item.fusionSongs?.length ? item.fusionSongs.map((f) => f.songSlug) : [item.songSlug]
  const titre = slugs.map((s) => song(s)?.title ?? s).join(" / ")
  const premier = song(slugs[0])
  const ton = item.keyOverride ?? premier?.recommendedKey ?? premier?.originalKey
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
      <span>{titre}</span>
      {ton && <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-bold tabular-nums">{ton}</span>}
    </li>
  )
}

function Media({ m, p, d }: { m: MediaPassage; p: Passage; d: DetailFete }) {
  const { t } = useTranslation()
  const droit = d.droits?.find((x) => x.id === p.id)
  const titre = m.lien ? <a href={m.lien} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{m.titre}</a> : m.titre
  const detail = [m.duree, m.depart && t("planning.fete.departA", { temps: m.depart })].filter(Boolean).join(" · ")
  return (
    <li className="text-[14px]">
      <div className="flex items-start gap-1">
        <span className="min-w-0 flex-1">
          <span aria-hidden>▷</span> {t(`planning.fete.media.${m.type}`)} · {titre}{detail && <> · {detail}</>}
          {m.note && <span className="block text-[13px] italic text-muted-foreground">{t("planning.fete.regie", { note: m.note })}</span>}
        </span>
        {droit?.musiques && (
          <MenuActions
            label={`${t("common.moreActions")} · ${m.titre}`}
            actions={[
              { label: t("planning.programme.edit"), ouvreUnChamp: true, onSelect: () => d.onModifierMedia?.(p, m) },
              {
                label: t("planning.programme.remove"), destructif: true, onSelect: () => d.onRetirerMedia?.(p, m),
                confirmer: { titre: t("planning.fete.media.confirmerRetrait"), texte: m.titre, action: t("planning.programme.remove") },
              },
            ]}
          />
        )}
      </div>
    </li>
  )
}

/** Le contenu d'une ligne sous son titre : chants, musiques et danses, « + Musique ou danse ». */
export function PassageContenu({ passage, d }: { passage: Passage; d: DetailFete }) {
  const { t } = useTranslation()
  const trouve = setlistDuPassage(passage, d)
  const chants = (trouve?.items ?? []).filter((i) => estUnChant(i) || i.type === "proposition")
  const droit = d.droits?.find((x) => x.id === passage.id)
  const medias = passage.medias ?? []
  return (
    <div className="mt-2 space-y-1.5">
      {chants.length > 0 ? (
        <ul className="space-y-1" aria-label={t("planning.fete.chants")}>{chants.map((c, i) => <Chant key={i} item={c} songs={d.songs} />)}</ul>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t("planning.fete.pasDeChant")}</p>
      )}
      {medias.length > 0 && <ul className="space-y-1" aria-label={t("planning.fete.media.liste")}>{medias.map((m) => <Media key={m.id} m={m} p={passage} d={d} />)}</ul>}
      {droit?.musiques && (
        <Button type="button" size="sm" variant="ghost" className="-ml-2 h-9 px-2 text-[14px]" onClick={() => d.onAjouterMedia?.(passage)}>
          {t("planning.fete.media.ajouter")}
        </Button>
      )}
    </div>
  )
}

/** « Setlist » (si elle a des chants) et « Saisir les chants » (si la route l'accorde). Sur un passage
 *  à moi, le bouton est plein ; sur un autre (coordination), discret. */
export function PassageBoutons({ passage, d }: { passage: Passage; d: DetailFete }) {
  const { t } = useTranslation()
  const trouve = setlistDuPassage(passage, d)
  const droit = d.droits?.find((x) => x.id === passage.id)
  // Sur un passage à moi, « Saisir les chants » remplace « Setlist » (CF7) ; le lien reste à côté du bouton discret de la coordination.
  const lien = trouve && trouve.items.length > 0 && !(droit?.mien && droit.chants) ? (
    <Button asChild size="sm" variant="outline"><Link href={`/setlists/${trouve.setlist.id}`}>{t("planning.fete.setlist")}</Link></Button>
  ) : null
  const saisir = droit?.chants ? (
    <Button type="button" size="sm" variant={droit.mien ? "default" : "outline"} style={droit.mien ? { background: COLOR } : undefined}
      onClick={() => d.onSaisir?.(passage)}>
      {t("planning.fete.saisir")}
    </Button>
  ) : null
  if (!lien && !saisir) return null
  return <div className="flex flex-wrap items-center gap-2">{lien}{saisir}</div>
}

