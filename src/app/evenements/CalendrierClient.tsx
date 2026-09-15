"use client"

// Calendrier des évènements (lot 6) : lisible sans compte (« toute l'église »
// seulement), plus les évènements de ses sections quand on est connecté.
// Infos épinglées en tête, puis agenda par mois, passés derrière un lien.

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/firebase/auth"
import { useProfile } from "@/lib/firebase/users"
import { canSeeEvenement, creatableEvenementPours } from "@/lib/access"
import { ANNONCE_SECTIONS } from "@/types/annonce"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import { EVENEMENTS_CHANGED, listEvenements } from "@/lib/firebase/evenements"
import { daysAgo, groupByMonth, isExpired, isInfo, isPast } from "@/lib/evenements/agenda"
import { todayIso } from "@/lib/scene/dimanches"
import type { Evenement } from "@/types/evenement"
import { EvenementCard } from "./EvenementCard"
import { QrCodeButton } from "@/components/evenements/QrCode"

export function CalendrierClient() {
  const { t, i18n } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [evenements, setEvenements] = useState<Evenement[] | null>(null)
  const [showPast, setShowPast] = useState(false)

  useEffect(() => {
    if (authLoading) return
    const load = () => { listEvenements(!user).then(setEvenements).catch(() => setEvenements([])) }
    load()
    window.addEventListener(EVENEMENTS_CHANGED, load)
    return () => window.removeEventListener(EVENEMENTS_CHANGED, load)
  }, [authLoading, user])

  const today = todayIso()
  const visible = useMemo(
    () => (evenements ?? []).filter((e) => canSeeEvenement(user, profile, e) && !isExpired(e, today)),
    [evenements, user, profile, today],
  )

  if (authLoading || (user && profileLoading) || evenements === null) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
  }

  const infos = visible.filter(isInfo).sort((a, b) => Number(b.epingle) - Number(a.epingle) || b.createdAt.localeCompare(a.createdAt))
  const upcoming = groupByMonth(visible.filter((e) => !isInfo(e) && !isPast(e, today)), i18n.language)
  const since = daysAgo(today, 92)
  const past = visible
    .filter((e) => !isInfo(e) && isPast(e, today) && (e.dateFin || e.date) >= since)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">{t("evenements.title")}</h2>
        {creatableEvenementPours(user, profile, ANNONCE_SECTIONS).length > 0 && (
          <Link href="/evenements/nouveau" className="text-sm font-semibold text-white rounded-lg px-3 py-1.5" style={{ background: PLANNING_COLORS.scene }}>
            {t("evenements.nouveau")}
          </Link>
        )}
      </div>

      {infos.length > 0 && (
        <section className="space-y-2" aria-label={t("evenements.infos")}>
          {infos.map((e) => <EvenementCard key={e.id} evenement={e} />)}
        </section>
      )}

      {upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t("evenements.none")}</p>}
      {upcoming.map((g) => (
        <section key={g.key} className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{g.label}</h2>
          {g.evenements.map((e) => <EvenementCard key={e.id} evenement={e} />)}
        </section>
      ))}

      {past.length > 0 && (
        <section className="space-y-2">
          <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => setShowPast(!showPast)}>
            {showPast ? t("evenements.hidePast") : t("evenements.past")} ({past.length})
          </button>
          {showPast && past.map((e) => <EvenementCard key={e.id} evenement={e} past />)}
        </section>
      )}

      {creatableEvenementPours(user, profile, ANNONCE_SECTIONS).length > 0 && (
        <QrCodeButton path="/evenements" label={t("evenements.title")} />
      )}

      {!user && (
        <p className="text-xs text-muted-foreground">
          {t("evenements.loginHint")} <Link href="/login?from=%2Fevenements" className="font-semibold underline">{t("evenements.login")}</Link>
        </p>
      )}
    </div>
  )
}
