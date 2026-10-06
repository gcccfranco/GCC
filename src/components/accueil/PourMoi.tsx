"use client"

// « Pour moi » de l'accueil A (lot U4 bis, B1, docs/spec-pages-en-grand.md, Q14 ; planches
// `accueil-a-*`). En grand : le prochain service et les deux suivants, puis la setlist de ce
// service, l'une sous l'autre. Tablette portrait : les deux cartes côte à côte, trois services
// suivants. Téléphone : une seule carte (le service et sa setlist), « Ensuite » reste dans
// Mes services, pour que « Ce dimanche » entre dans le premier écran.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ChevronRight, ListMusic, Play } from "lucide-react"
import type { FSSetlist } from "@/lib/firebase/setlists"
import type { SongIndexEntry } from "@/types/song"
import type { ServiceDuJour } from "@/lib/planning/accueil"
import { joursAvant } from "@/lib/planning/accueil"
import { cleDuService } from "@/lib/planning/mesServices"
import { serviceColor } from "@/lib/serviceColors"
import { serviceButtonFill } from "@/lib/serviceButton"
import { Tile } from "@/components/ui/tile"
import { KeyPill } from "@/components/ui/key-pill"

import type { Disposition } from "@/hooks/useDisposition"
export type { Disposition }

const locale = (lang: string) => (lang === "zh-CN" ? "zh-CN" : "fr-FR")
const jourDe = (iso: string) => new Date(`${iso}T12:00:00`)
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Le nom du service à sa couleur, puis ses rôles : « Culte Franco · Piano ». */
function ServiceRoles({ s }: { s: ServiceDuJour }) {
  return (
    <>
      <b className="svc-ink font-semibold" style={{ "--svc": serviceColor(s.service) } as React.CSSProperties}>{s.service}</b>
      {" · "}{s.roles.join(", ")}
    </>
  )
}

export function PourMoi({
  prochain,
  ensuite,
  setlist,
  songs,
  aujourdhui,
  disposition,
}: {
  prochain: ServiceDuJour[]
  ensuite: ServiceDuJour[]
  setlist: FSSetlist | null
  songs: Record<string, SongIndexEntry>
  aujourdhui: string
  disposition: Disposition
}) {
  const { t, i18n } = useTranslation()
  const date = prochain[0].date
  const couleur = serviceColor(prochain[0].service)
  const jour = jourDe(date)
  const mois = new Intl.DateTimeFormat(locale(i18n.language), { month: "short" }).format(jour)
  const dateLongue = majuscule(new Intl.DateTimeFormat(locale(i18n.language), { weekday: "long", day: "numeric", month: "long" }).format(jour))
  const n = joursAvant(date, aujourdhui)
  const quand = n === 0 ? t("planning.accueil.aujourdhui") : n === 1 ? t("planning.accueil.demain") : t("planning.accueil.dansJours", { count: n })
  const tuile = <Tile color={couleur} big={jour.getDate()} small={mois} size="lg" />

  // La setlist : ses chants numérotés, la tonalité jouée en rectangle (5C1), « Ouvrir » et
  // « Mode louange » (bouton plein à la couleur du service, l'écran lui appartient).
  const chants = setlist ? (
    <>
      <ol className="mt-1.5">
        {setlist.items.filter((it) => it.type !== "transition").map((it, i) => {
          const song = songs[it.songSlug]
          const fusion = it.type === "fusion" && !!it.fusionSongs
          const titre = fusion ? it.fusionSongs!.map((f) => songs[f.songSlug]?.title ?? f.songSlug).join(" / ") : (song?.title ?? it.songSlug)
          const tonalite = it.keyOverride ?? song?.originalKey
          return (
            <li key={it.position} className="flex min-h-9 items-center gap-2.5 border-t border-border/70 py-1 text-[15px]">
              <span className="w-3.5 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-semibold">{titre}</span>
              {!fusion && tonalite && <KeyPill tonalite={tonalite} langue={song?.language === "zh" ? "zh" : "fr"} />}
            </li>
          )
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/setlists/${setlist.id}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm font-semibold text-foreground transition-transform duration-150 active:scale-[.97]">
          <ListMusic className="h-4 w-4" aria-hidden />
          {t("planning.accueil.ouvrir")}
        </Link>
        <Link
          href={`/setlists/${setlist.id}?louange=1`}
          className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-transform duration-150 active:scale-[.97]"
          style={{ background: serviceButtonFill(couleur) }}
        >
          <Play className="h-4 w-4" aria-hidden />
          {t("setlists.detail.performanceMode")}
        </Link>
      </div>
    </>
  ) : null
  const presidence = setlist?.leader ? t("planning.accueil.presidence", { nom: setlist.leader }) : null

  if (disposition === "telephone") {
    return (
      <section aria-labelledby="pour-moi">
        <h2 id="pour-moi" className="sr-only">{t("planning.accueil.pourMoi")}</h2>
        <article data-carte className="raised rounded-2xl p-4">
          <Link href="/mes-services" className="flex items-center gap-3">
            {tuile}
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-muted-foreground">{t("planning.nextService")}</span>
              {prochain.map((s) => (
                <span key={cleDuService(s)} className="block text-base font-bold leading-snug"><ServiceRoles s={s} /></span>
              ))}
              <span className="block text-sm text-muted-foreground">{dateLongue} · {quand}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" aria-hidden />
          </Link>
          {setlist && (
            <>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm">
                <b>{t("planning.accueil.laSetlist")}</b>
                {presidence && <span className="text-muted-foreground">{presidence}</span>}
              </p>
              {chants}
            </>
          )}
        </article>
      </section>
    )
  }

  return (
    <section aria-labelledby="pour-moi" className="min-w-0">
      <h2 id="pour-moi" className="mb-3 text-[17px] font-bold">{t("planning.accueil.pourMoi")}</h2>
      <div className={disposition === "tablette" ? "grid grid-cols-2 items-stretch gap-3.5" : "flex flex-col gap-3.5"}>
        <article data-carte className="raised flex flex-col rounded-2xl p-4">
          <p className="mb-2.5 text-[13px] font-semibold text-muted-foreground">{t("planning.nextService")}</p>
          <div className="flex items-center gap-3.5">
            {tuile}
            <div className="min-w-0">
              <p className="text-lg font-bold leading-snug">{dateLongue}</p>
              {prochain.map((s) => (
                <p key={cleDuService(s)} className="text-sm"><ServiceRoles s={s} /></p>
              ))}
              <p className="text-[13px] text-muted-foreground">{quand}</p>
            </div>
          </div>
          {ensuite.length > 0 && (
            <>
              <p className="mt-3 text-[13px] text-muted-foreground">{t("planning.accueil.ensuite")}</p>
              <ul>
                {ensuite.map((s) => (
                  <li key={cleDuService(s)} data-testid="ensuite" className="flex gap-3 border-t border-border/70 py-1.5 text-sm">
                    <span className="w-14 shrink-0 font-bold">{new Intl.DateTimeFormat(locale(i18n.language), { day: "numeric", month: "short" }).format(jourDe(s.date))}</span>
                    <span className="min-w-0"><ServiceRoles s={s} /></span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href="/mes-services" className="mt-auto inline-flex items-center gap-1 pt-2.5 text-[13px] font-semibold">
            {t("mesServices.title")}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </article>
        {setlist && (
          <article data-carte className="raised rounded-2xl p-4">
            <p className="text-[13px] font-semibold text-muted-foreground">{t("planning.accueil.setlistDuService")}</p>
            <p className="text-base font-bold">{setlist.title}</p>
            {presidence && <p className="text-[13px] text-muted-foreground">{presidence}</p>}
            {chants}
          </article>
        )}
      </div>
    </section>
  )
}
