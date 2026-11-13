"use client"

// « Mon prochain service » de l'onglet Setlists (lot Pupitre PU-2, docs/spec-entree-musiciens.md) :
// date et culte, le rôle d'après le planning, « Jouer » (à l'encre : la couleur du service est
// réservée à l'écran d'un culte, 5C1), puis les chants. Téléphone : rangées sans vignette (le
// premier service de la liste reste visible dessous) ; tablette et grand : vignettes, le scan
// 简谱 de la page 1 (inversé et atténué en sombre) ou, sans scan, la structure du chant. Lot PU-3 : une ligne
// « Prêt hors-ligne » quand la copie et le cache du service sont là (rien sinon).

import { useEffect, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CloudCheck, Play } from "lucide-react"
import type { FSSetlist } from "@/types/setList"
import type { SongIndexEntry } from "@/types/song"
import type { ServiceDuJour } from "@/lib/planning/accueil"
import type { RolePreset } from "@/lib/performance/roleCompte"
import type { Disposition } from "@/hooks/useDisposition"
import { serviceColor } from "@/lib/serviceColors"
import { jianpuImageUrl, loadJianpuManifest, type JianpuManifest } from "@/lib/jianpu/images"
import { getJianpuPref, sheetEnabled, type JianpuPref } from "@/lib/jianpu/preference"
import { KeyPill } from "@/components/ui/key-pill"
import { compter } from "@/lib/usage"

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR")
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function Pupitre({
  setlist,
  services,
  songsMap,
  role,
  disposition,
  pret,
}: {
  setlist: FSSetlist
  services: ServiceDuJour[]
  songsMap: Record<string, SongIndexEntry>
  role: RolePreset | null
  disposition: Disposition
  pret: boolean
}) {
  const { t, i18n } = useTranslation()
  const vignettes = disposition !== "telephone"
  const [manifeste, setManifeste] = useState<JianpuManifest>({})
  const [pref, setPref] = useState<JianpuPref>("auto")
  useEffect(() => {
    if (!vignettes) return
    setPref(getJianpuPref())
    let vivant = true
    loadJianpuManifest().then((m) => { if (vivant) setManifeste(m) })
    return () => { vivant = false }
  }, [vignettes])

  const jour = new Date(`${services[0].date}T12:00:00`)
  const dateLongue = majuscule(new Intl.DateTimeFormat(locale(i18n.language), { weekday: "long", day: "numeric", month: "long" }).format(jour))
  const chants = setlist.items.filter((it) => it.type !== "transition" && it.type !== "proposition").map((it, i) => {
    const song = songsMap[it.songSlug]
    const fusion = it.type === "fusion" && !!it.fusionSongs
    const titre = fusion ? it.fusionSongs!.map((f) => songsMap[f.songSlug]?.title ?? f.songSlug).join(" / ") : (song?.title ?? it.songSlug)
    return { it, song, fusion, titre, n: i + 1, tonalite: it.keyOverride ?? song?.originalKey }
  })
  const lien = (n: number) => `/setlists/${setlist.id}?louange=1&chant=${n}`

  return (
    <section data-pupitre aria-labelledby="pupitre-titre" className="min-w-0">
      <h2 id="pupitre-titre" className="text-lg font-bold">{t("setlists.pupitre.titre")}</h2>
      <div className="mt-1 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <b className="font-semibold">{dateLongue}</b>
            {" · "}
            {/* Même libellé que la liste (catégorie traduite), à la couleur du service. */}
            <b className="svc-ink font-semibold" style={{ "--svc": serviceColor(services[0].service) } as React.CSSProperties}>
              {t("categories." + setlist.category, { defaultValue: setlist.category })}
            </b>
          </p>
          {role && (role === "pianiste" || role === "guitariste" || role === "batteur") && (
            <p className="text-sm text-muted-foreground">
              {t("setlists.pupitre.tuJoues", { role: t(`performance.planning.instrument.${role}`).toLowerCase() })}
            </p>
          )}
          {pret && (
            <p data-pret-hors-ligne className="text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CloudCheck className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {t("setlists.pupitre.pretHorsLigne")}
              </span>
            </p>
          )}
        </div>
        <Link
          data-pupitre-jouer
          href={`/setlists/${setlist.id}?louange=1`}
          onClick={() => compter("cmd.setlist.pupitre.jouer")}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-semibold text-background transition-transform duration-150 active:scale-[.97]"
        >
          <Play className="h-4 w-4" aria-hidden />
          {t("setlists.pupitre.jouer")}
        </Link>
      </div>
      {vignettes ? (
        <ol className="mt-3 grid grid-cols-3 gap-3">
          {chants.map(({ it, song, fusion, titre, n, tonalite }) => {
            const page = manifeste[it.songSlug]?.pages[0]
            const scan = !!page && sheetEnabled(pref, it.jianpuSheet)
            const sections = song?.sections ?? []
            return (
              <li key={it.position}>
                <Link data-pupitre-chant data-vignette href={lien(n)} className="carte-groupe block overflow-hidden rounded-2xl transition-transform duration-150 active:scale-[.98]">
                  {scan ? (
                    <div data-vignette-scan className="aspect-[16/9] overflow-hidden border-b border-border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element -- scan servi tel quel, déjà en cache hors ligne */}
                      <img src={jianpuImageUrl(page.file)} alt="" loading="lazy" className="h-full w-full object-cover object-top dark:[filter:invert(1)_hue-rotate(180deg)_brightness(.85)]" />
                    </div>
                  ) : (
                    <div data-vignette-structure className="aspect-[16/9] overflow-hidden border-b border-border bg-secondary/50 p-3">
                      <p className="line-clamp-3 text-xs text-muted-foreground">{sections.map((s, i) => <span key={s.uid ?? i}>{i > 0 && " · "}<span className="whitespace-nowrap">{s.name}</span></span>)}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 px-3 py-2.5">
                    <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{n}</span>
                    <span className="min-w-0 flex-1 line-clamp-2 text-sm font-semibold">{titre}</span>
                    {!fusion && tonalite && <KeyPill tonalite={tonalite} langue={song?.language === "zh" ? "zh" : "fr"} />}
                  </div>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <ol className="mt-2">
          {chants.map(({ song, fusion, titre, n, tonalite }) => (
            <li key={n} className="border-t border-border/70">
              <Link data-pupitre-chant href={lien(n)} className="flex min-h-10 items-center gap-2.5 py-1 text-base">
                <span className="w-3.5 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{n}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{titre}</span>
                {!fusion && tonalite && <KeyPill tonalite={tonalite} langue={song?.language === "zh" ? "zh" : "fr"} />}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
