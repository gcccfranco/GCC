"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { currentSundayStr, fdLongL, moisName, EDD_PERIODES } from "@/lib/planning/utils"
import {
  CULTE_FALLBACK, FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK,
  PAIX_FALLBACK, BONTE_FALLBACK, DEJEUNER_FALLBACK, EDD_FALLBACK, CAMP_LOUANGE_FALLBACK
} from "@/lib/planning/data"
import { fetchCulte, fetchDejeuner, fetchPaix, fetchFidelite, fetchFideliteMusic, fetchBonte, fetchEDD, fetchCampus, fetchIntergroupe, fetchInterfranco } from "@/lib/planning/sheets"
import { StaleBanner } from "@/components/planning/StaleBanner"
import type { EddDataStructure, CampusSeance } from "@/lib/planning/utils"
import { useProfile } from "@/lib/firebase/users"
import { findMyServices, type PlanningData } from "@/lib/planning/names"

function val(v: string) { return v?.trim() || "—" }

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function SectionBlock({ dot, label, children }: { dot: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <div className="w-2 h-2 rounded-full mt-[7px] shrink-0" style={{ background: dot }} />
      <div className="w-24 shrink-0 text-sm font-semibold text-foreground pt-px">{label}</div>
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  )
}

function GroupBlock({ badge, children }: { badge: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 pb-3 border-b border-dashed border-border last:mb-0 last:pb-0 last:border-0">
      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-2">{badge}</span>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function PlanningAccueil() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useProfile()
  const [culte, setCulte] = useState(CULTE_FALLBACK)
  const [dej, setDej] = useState(DEJEUNER_FALLBACK)
  const [paix, setPaix] = useState(PAIX_FALLBACK)
  const [fid, setFid] = useState(FIDELITE_FALLBACK)
  const [fidM, setFidM] = useState(FIDELITE_MUSIC_FALLBACK)
  const [bonte, setBonte] = useState(BONTE_FALLBACK)
  const [edd, setEdd] = useState<EddDataStructure>(EDD_FALLBACK)
  const [campus, setCampus] = useState<CampusSeance[]>(CAMP_LOUANGE_FALLBACK)
  const [intergroupe, setIntergroupe] = useState<string[][]>([])
  const [interfranco, setInterfranco] = useState<string[][]>([])
  // « Ce dimanche » s'appuie sur les fallbacks compilés : si les fetchs
  // échouent, on le signale pour ne pas laisser lire un planning périmé.
  const [stale, setStale] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      fetchCulte().then(d => { if (d.length) setCulte(d) }),
      fetchDejeuner().then(d => { if (d.length) setDej(d) }),
      fetchPaix().then(d => { if (d.length) setPaix(d) }),
      fetchFidelite().then(d => { if (d.length) setFid(d) }),
      fetchFideliteMusic().then(d => { if (d.length) setFidM(d) }),
      fetchBonte().then(d => { if (d.length) setBonte(d) }),
      fetchEDD().then(d => setEdd(d)),
      fetchCampus().then(({ louange }) => { if (louange.length) setCampus(louange) }),
      fetchIntergroupe().then(d => { if (d.length) setIntergroupe(d) }),
      fetchInterfranco().then(d => { if (d.length) setInterfranco(d) }),
    ]).then(results => setStale(results.some(r => r.status === "rejected")))
  }, [])

  // Prochain service de la personne connectée (d'après son nom de planning)
  const nextServices = useMemo(() => {
    if (!user || !profile?.planningName) return null
    const data: PlanningData = { culte, dejeuner: dej, paix, fidelite: fid, fideliteMusic: fidM, bonte, edd, campus, intergroupe, interfranco }
    const today = new Date().toISOString().split("T")[0]
    const upcoming = findMyServices(data, profile.planningName).filter(e => e.date >= today)
    if (!upcoming.length) return null
    return upcoming.filter(e => e.date === upcoming[0].date)
  }, [user, profile, culte, dej, paix, fid, fidM, bonte, edd, campus, intergroupe, interfranco])

  const sun = currentSundayStr()
  const sunParts = sun.split("-")
  const sunDate = new Date(+sunParts[0], +sunParts[1]-1, +sunParts[2])
  const sunLabel = i18n.language === "zh-CN"
    ? `${sunDate.getFullYear()}年${sunDate.getMonth() + 1}月${sunDate.getDate()}日`
    : `${sunDate.getDate()} ${moisName(sunDate.getMonth() + 1, "fr")} ${sunDate.getFullYear()}`

  const cRow = culte.find(r => r[0] === sun) ?? null
  const dRow = dej.find(r => r[0] === sun) ?? null
  const paixRow = paix.find(r => r[0] === sun) ?? null
  const fidRow = fid.find(r => r[0] === sun) ?? null
  const fidMRow = fidM.find(r => r[0] === sun) ?? null
  const bonteRow = bonte.find(r => r[0] === sun) ?? null

  const m = +sunParts[1]
  const pk = EDD_PERIODES[m<=2?0:m<=4?1:m<=6?2:m<=8?3:m<=10?4:5]
  const eddP = edd[pk]?.classes ?? null
  const eddZb = eddP?.["中班"]?.find(r => r[0] === sun) ?? null
  const eddDb = eddP?.["大班"]?.find(r => r[0] === sun) ?? null
  const eddGb = eddP?.["高班"]?.find(r => r[0] === sun) ?? null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Intro */}
      <div className="bg-card shadow-soft rounded-xl p-5 text-center space-y-2">
        <p className="text-xs text-muted-foreground font-medium italic">{t("planning.welcome")}</p>
        <h1 className="text-lg font-bold text-foreground">{t("planning.title")}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("planning.subtitle")}
        </p>
      </div>

      <StaleBanner show={stale} />

      {/* Prochain service de la personne connectée */}
      {nextServices && (
        <Link
          href="/mes-services"
          className="block bg-card border border-primary/30 rounded-xl p-4 hover:border-primary/60 transition-colors"
        >
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
            {t("planning.nextService")}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {fdLongL(nextServices[0].date, i18n.language)} —{" "}
            {nextServices.map(e => `${e.service} (${e.role})`).join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{t("planning.seeAllServices")}</p>
        </Link>
      )}

      {/* Ce dimanche */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("planning.thisSunday", { date: sunLabel })}
        </p>
        <div className="bg-card shadow-soft rounded-xl overflow-hidden">
          {/* Culte Franco */}
          <SectionBlock dot="#2d5a65" label={t("planning.tabs.culte")}>
            {cRow ? (
              <>
                <InfoRow label={t("planning.roles.presidence")} value={val(cRow[1])} />
                {(cRow[2] || cRow[3]) && (
                  <InfoRow label={t("planning.roles.choristes")} value={[cRow[2],cRow[3]].filter(v=>v?.trim()).join(", ")} />
                )}
                <InfoRow label={t("planning.roles.piano")} value={val(cRow[4])} />
                <InfoRow label={t("planning.roles.guitare")} value={val(cRow[5])} />
                <InfoRow label={t("planning.roles.batterie")} value={val(cRow[6])} />
                <InfoRow label={t("planning.roles.sono")} value={val(cRow[7])} />
                <InfoRow label={t("planning.roles.ppt")} value={val(cRow[8])} />
                <InfoRow label={t("planning.roles.orateur")} value={val(cRow[9])} />
                {cRow[10] && <InfoRow label={t("planning.roles.trad")} value={val(cRow[10])} />}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("planning.dataPending")}</p>
            )}
          </SectionBlock>

          {/* Prépa Table */}
          <SectionBlock dot="#c87941" label={t("planning.tabs.table")}>
            {dRow?.[ 1]?.trim() ? (
              <p className="text-sm text-foreground">{dRow[1]}</p>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </SectionBlock>

          {/* Groupes */}
          <SectionBlock dot="#6b4a8e" label={t("planning.tabs.groupes")}>
            <GroupBlock badge={t("planning.groupes.paix")}>
              <InfoRow label={t("planning.roles.presidence")} value={val(paixRow?.[1] ?? "")} />
              <InfoRow label={t("planning.roles.musiciens")} value={val(paixRow?.[2] ?? "")} />
              <InfoRow label={t("planning.roles.orateur")} value={val(paixRow?.[3] ?? "")} />
            </GroupBlock>
            <GroupBlock badge={t("planning.groupes.fidelite")}>
              <InfoRow label={t("planning.roles.presidence")} value={val(fidRow?.[1] ?? "")} />
              {fidMRow && (
                <InfoRow label={t("planning.roles.musiciens")} value={[fidMRow[2],fidMRow[3],fidMRow[4]].filter(Boolean).join(", ")} />
              )}
              <InfoRow label={t("planning.roles.orateur")} value={val(fidRow?.[2] ?? "")} />
            </GroupBlock>
            <GroupBlock badge={t("planning.groupes.bonte")}>
              <InfoRow label={t("planning.roles.presidence")} value={val(bonteRow?.[1] ?? "")} />
              <InfoRow label={t("planning.roles.musiciens")} value={val(bonteRow?.[2] ?? "")} />
              <InfoRow label={t("planning.roles.orateur")} value={val(bonteRow?.[3] ?? "")} />
            </GroupBlock>
          </SectionBlock>

          {/* EDD */}
          <SectionBlock dot="#3b6d11" label={t("planning.tabs.edd")}>
            {[["中班", eddZb], ["大班", eddDb], ["高班", eddGb]].map(([cls, row]) => (
              <GroupBlock key={cls as string} badge={cls as string}>
                <InfoRow label={t("planning.roles.presidence")} value={val((row as string[]|null)?.[1] ?? "")} />
                <InfoRow label={t("planning.roles.suppleant")} value={val((row as string[]|null)?.[2] ?? "")} />
                <InfoRow label={t("planning.roles.piano")} value={val((row as string[]|null)?.[3] ?? "")} />
                <InfoRow label={t("planning.roles.cajon")} value={val((row as string[]|null)?.[4] ?? "")} />
                <InfoRow label={t("planning.roles.guitare")} value={val((row as string[]|null)?.[5] ?? "")} />
              </GroupBlock>
            ))}
          </SectionBlock>
        </div>
      </div>

      {/* Verset */}
      <blockquote className="bg-secondary rounded-xl p-5">
        <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
          {t("planning.verse.text")}
        </p>
        <footer className="text-xs font-semibold text-primary text-right">{t("planning.verse.ref")}</footer>
      </blockquote>
    </div>
  )
}
