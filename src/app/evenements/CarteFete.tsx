"use client"

// Carte de la fête en haut d'Évènements (Lot AS, T5, AS10, RS5) : deux mois avant le jour J jusqu'au
// soir du jour J, puis la fête passe dans « Passés » (`LigneFetePassee`). Aplat bleu scène.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { JOUR_MS, versUtc } from "@/lib/dates/iso"
import { dateFermeture, etatEdition, libelleEdition, type Edition, type Fete } from "@/lib/scene/fetes"

const BLEU = PLANNING_COLORS.scene
const ZH = "zh-CN"

/** « jeudi 24 décembre » / « 12月24日 星期四 » ; `court` : sans le jour de la semaine. */
function dateEnLettres(iso: string, lang: string, court = false): string {
  const d = new Date(versUtc(iso))
  const opts = { timeZone: "UTC" } as const
  if (lang === ZH) {
    const jour = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
    return court ? jour : `${jour} ${d.toLocaleDateString(ZH, { ...opts, weekday: "long" })}`
  }
  // Espace insécable entre le jour et le mois : « 20 décembre » ne se coupe pas en fin de ligne.
  return d.toLocaleDateString("fr-FR", { ...opts, weekday: court ? undefined : "long", day: "numeric", month: "long" }).replace(/(\d) /, "$1\u00a0")
}

const PILULE = "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold"

export function CarteFete({ edition, today }: { edition: Edition; today: string }) {
  const { t, i18n } = useTranslation()
  const p = edition.programme!
  const langue = i18n.language === ZH ? "zh" : "fr"
  const titre = libelleEdition(edition.fete, edition.annee, langue)
  const jours = Math.round((versUtc(p.jourJ) - versUtc(today)) / JOUR_MS)
  const etat = etatEdition(edition, today)
  const page = `/evenements/scene/${edition.fete}`
  return (
    <section data-testid="carte-fete" aria-label={titre} className="rounded-2xl p-5 text-white" style={{ background: BLEU }}>
      <h2 className="text-xl font-bold leading-tight">{titre}</h2>
      <p className="mt-1 text-sm">
        {dateEnLettres(p.jourJ, i18n.language)} · {jours === 0 ? t("evenements.fete.aujourdhui") : t("evenements.fete.dansJours", { count: jours })}
      </p>
      <p className="mt-3 text-sm">
        {etat === "ouvertes" ? t("evenements.fete.ouvertesJusqua", { date: dateEnLettres(dateFermeture(p), i18n.language, true) })
          : etat === "bientot" ? t("evenements.fete.desLe", { date: dateEnLettres(p.debut, i18n.language, true) })
          : t("evenements.fete.fermees")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {etat === "ouvertes" && (
          <Link href={`${page}?reserver=1`} className={`${PILULE} bg-white`} style={{ color: BLEU }}>{t("evenements.fete.reserver")}</Link>
        )}
        <Link href={page} className={`${PILULE} border border-white/70 text-white`}>{t("evenements.fete.voir")}</Link>
      </div>
    </section>
  )
}

/** La ligne d'une fête passée dans « Passés » : le gabarit d'`EvenementCard` passé, pavé de date en bleu scène.
 *  Pas d'`opacity-70` sur la ligne (il délavait le pavé, texte blanc à ≈ 3:1) : le titre seul est atténué. */
export function LigneFetePassee({ fete, annee, jourJ, lien }: { fete: Fete; annee: number; jourJ: string; lien: string }) {
  const { i18n } = useTranslation()
  const mois = new Date(versUtc(jourJ)).toLocaleDateString(i18n.language === ZH ? ZH : "fr-FR", { timeZone: "UTC", month: "short" })
  return (
    <Link href={lien} data-testid="fete-passee" className="block rounded-xl bg-card px-4 py-3 transition-colors duration-150 active:bg-secondary/70 hover:bg-secondary/40">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg font-bold leading-none tabular-nums text-white" style={{ background: BLEU }}>
          <span className="text-base leading-none">{Number(jourJ.slice(8, 10))}</span>
          <span className="mt-0.5 text-xs font-semibold leading-none">{mois}</span>
        </span>
        <p className="min-w-0 flex-1 truncate font-semibold text-muted-foreground">{libelleEdition(fete, annee, i18n.language === ZH ? "zh" : "fr")}</p>
      </div>
    </Link>
  )
}
