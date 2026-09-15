"use client"

// Carte d'un évènement dans le calendrier : jour, titre, type, public, lieu,
// places. Toute la carte est un lien vers la fiche.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { isInfo, placesRestantes } from "@/lib/evenements/agenda"
import { categoryColor, categoryLabel, PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"

const COLOR = PLANNING_COLORS.scene

/** « sam. 10 oct. » / « 10月10日 ». */
function dayLabel(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { weekday: "short", day: "numeric", month: "short" })
}

export function TypePour({ e }: { e: Pick<Evenement, "type" | "pour"> }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${COLOR}18`, color: COLOR }}>
        {t(`evenements.types.${e.type}`)}
      </span>
      <span className="inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold bg-secondary text-foreground"
        style={e.pour === "eglise" ? undefined : { background: `${categoryColor(e.pour)}18`, color: categoryColor(e.pour) }}>
        {e.pour === "eglise" ? t("evenements.pourEglise") : categoryLabel(e.pour)}
      </span>
    </>
  )
}

export function EvenementCard({ evenement: e, past }: { evenement: Evenement; past?: boolean }) {
  const { t, i18n } = useTranslation()
  const places = placesRestantes(e)
  return (
    <Link href={`/evenements/${e.id}`}
      className={`block bg-card shadow-soft rounded-xl px-4 py-3 hover:bg-secondary/40 transition-colors ${past ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        {!isInfo(e) && (
          <div className="shrink-0 w-14 text-center leading-tight">
            <div className="text-lg font-extrabold tabular-nums" style={{ color: COLOR }}>{Number(e.date.slice(8, 10))}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{dayLabel(e.date, i18n.language).replace(/\d+/, "").replace(/\s+/g, " ").trim()}</div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{e.epingle ? "📌 " : ""}{e.titre}</p>
          <p className="text-xs text-muted-foreground truncate">
            {[e.heure, e.lieu].filter(Boolean).join(" · ")}
            {places !== null && (places === 0 ? ` · ${t("evenements.complet")}` : ` · ${t("evenements.places", { count: places })}`)}
          </p>
          <div className="flex flex-wrap gap-1 mt-1"><TypePour e={e} /></div>
        </div>
      </div>
    </Link>
  )
}
