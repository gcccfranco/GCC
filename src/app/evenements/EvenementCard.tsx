"use client"

// Carte d'un évènement dans le calendrier : jour, titre, heure · lieu, places
// s'il y a une limite, et l'état d'inscription à droite (« Inscrit »,
// « S'inscrire », « Complet »). Toute la carte est un lien vers la fiche : le
// bouton « S'inscrire » n'inscrit pas, il y mène (lot 6 bis, 16/09/2026). Les
// badges de type et de public restent sur la fiche.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import { aCommence, isInfo, nowIsoParis, placesRestantes } from "@/lib/evenements/agenda"
import { categoryColor, categoryLabel, PLANNING_COLORS } from "@/lib/serviceColors"
import type { Evenement } from "@/types/evenement"
import { Tile } from "@/components/ui/tile"

const COLOR = PLANNING_COLORS.scene

/** « oct. » / « 10月 » : le mois court de la vignette de date. */
function monthLabel(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" })
}

export function TypePour({ e }: { e: Pick<Evenement, "type" | "pour"> }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${COLOR}18`, color: COLOR }}>
        {t(`evenements.types.${e.type}`)}
      </span>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-secondary text-foreground"
        style={e.pour === "eglise" ? undefined : { background: `${categoryColor(e.pour)}18`, color: categoryColor(e.pour) }}>
        {e.pour === "eglise" ? t("evenements.pourEglise") : categoryLabel(e.pour)}
      </span>
    </>
  )
}

/** État d'inscription d'une carte : inscrit, complet, ouvert (→ fiche), sinon rien. */
function Etat({ e, inscrit }: { e: Evenement; inscrit: boolean }) {
  const { t } = useTranslation()
  if (isInfo(e)) return null
  if (inscrit) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5" aria-hidden />{t("evenements.inscrit")}
      </span>
    )
  }
  if (placesRestantes(e) === 0) {
    return <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">{t("evenements.complet")}</span>
  }
  if (e.inscriptionOuverte && !aCommence(e, nowIsoParis())) {
    return <span className="shrink-0 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-foreground">{t("evenements.sinscrire")}</span>
  }
  return null
}

export function EvenementCard({ evenement: e, past, inscrit = false }: { evenement: Evenement; past?: boolean; inscrit?: boolean }) {
  const { t, i18n } = useTranslation()
  const places = placesRestantes(e)
  return (
    <Link href={`/evenements/${e.id}`}
      className={`block bg-card rounded-xl px-4 py-3 transition-colors duration-150 active:bg-secondary/70 hover:bg-secondary/40 ${past ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        {!isInfo(e) && <Tile color={COLOR} big={Number(e.date.slice(8, 10))} small={monthLabel(e.date, i18n.language)} size="lg" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{e.epingle ? "📌 " : ""}{e.titre}</p>
          <p className="text-sm text-muted-foreground truncate">
            {[e.heure, e.lieu].filter(Boolean).join(" · ")}
            {places !== null && places > 0 && ` · ${t("evenements.places", { count: places })}`}
          </p>
        </div>
        {!past && <Etat e={e} inscrit={inscrit} />}
      </div>
    </Link>
  )
}
