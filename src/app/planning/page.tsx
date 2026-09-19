"use client"

import { GuideLien } from "@/components/guide/GuideLien"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { currentSundayStr, fdLongL, moisName, EDD_PERIODES } from "@/lib/planning/utils"
import {
  FIDELITE_FALLBACK, FIDELITE_MUSIC_FALLBACK,
  PAIX_FALLBACK, BONTE_FALLBACK, DEJEUNER_FALLBACK, EDD_FALLBACK, CAMP_LOUANGE_FALLBACK
} from "@/lib/planning/data"
import { fetchCulte, fetchDejeuner, fetchPetitDej, fetchPaix, fetchFidelite, fetchFideliteMusic, fetchBonte, fetchEDD, fetchCampus, fetchIntergroupe, fetchInterfranco } from "@/lib/planning/sheets"
import { StaleBanner } from "@/components/planning/StaleBanner"
import type { EddDataStructure, CampusSeance } from "@/lib/planning/utils"
import { useProfile } from "@/lib/firebase/users"
import { findMyServices, type PlanningData } from "@/lib/planning/names"
import { PLANNING_COLORS, serviceColor } from "@/lib/serviceColors"
import { ChevronRight } from "lucide-react"
import { PageTitle } from "@/components/layout/PageTitle"
import { Tile } from "@/components/ui/tile"

function val(v: string) { return v?.trim() || "—" }

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-xs font-semibold text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function SectionBlock({ dot, label, children }: { dot: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <div data-testid="carre-service" className="w-2.5 h-2.5 rounded-[3px] mt-[6px] shrink-0" style={{ background: dot }} />
      <div className="w-24 shrink-0 text-sm font-semibold text-foreground pt-px">{label}</div>
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  )
}

function GroupBlock({ badge, children }: { badge: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 pb-3 border-b border-dashed border-border last:mb-0 last:pb-0 last:border-0">
      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground mb-2">{badge}</span>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export default function PlanningAccueil() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useProfile()
  // G5 (19/09/2026) : le Culte n’a plus de données de secours de 2026.
  const [culte, setCulte] = useState<string[][]>([])
  const [dej, setDej] = useState(DEJEUNER_FALLBACK)
  // Petit déj : aucune donnée de secours, il ne s'affiche que s'il est lu.
  const [petitDej, setPetitDej] = useState<string[][]>([])
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
      fetchCulte().then(d => setCulte(d)),
      fetchDejeuner().then(d => { if (d.length) setDej(d) }),
      fetchPetitDej().then(d => { if (d.length) setPetitDej(d) }),
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
    const data: PlanningData = { culte, dejeuner: dej, petitDej, paix, fidelite: fid, fideliteMusic: fidM, bonte, edd, campus, intergroupe, interfranco }
    const today = new Date().toISOString().split("T")[0]
    const upcoming = findMyServices(data, profile.planningName).filter(e => e.date >= today)
    if (!upcoming.length) return null
    return upcoming.filter(e => e.date === upcoming[0].date)
  }, [user, profile, culte, dej, petitDej, paix, fid, fidM, bonte, edd, campus, intergroupe, interfranco])

  const sun = currentSundayStr()
  const sunParts = sun.split("-")
  const sunDate = new Date(+sunParts[0], +sunParts[1]-1, +sunParts[2])
  const sunLabel = i18n.language === "zh-CN"
    ? `${sunDate.getFullYear()}年${sunDate.getMonth() + 1}月${sunDate.getDate()}日`
    : `${sunDate.getDate()} ${moisName(sunDate.getMonth() + 1, "fr")} ${sunDate.getFullYear()}`

  const cRow = culte.find(r => r[0] === sun) ?? null
  const dRow = dej.find(r => r[0] === sun) ?? null
  const pdRow = petitDej.find(r => r[0] === sun) ?? null
  const paixRow = paix.find(r => r[0] === sun) ?? null
  const fidRow = fid.find(r => r[0] === sun) ?? null
  const fidMRow = fidM.find(r => r[0] === sun) ?? null
  const bonteRow = bonte.find(r => r[0] === sun) ?? null

  // Dimanche d'Interfranco ou d'Intergroupe (jamais les deux) : ce service
  // remplace toute la section Groupes. Intergroupe a 3 choristes, Interfranco 2 ;
  // les colonnes suivantes sont les mêmes (piano … traduction).
  const interfrancoRow = interfranco.find(r => r[0] === sun)
  const intergroupeRow = intergroupe.find(r => r[0] === sun)
  const inter = interfrancoRow
    ? { key: "interfranco" as const, choristes: interfrancoRow.slice(2, 4), rest: interfrancoRow.slice(4), pres: interfrancoRow[1] }
    : intergroupeRow
      ? { key: "intergroupe" as const, choristes: intergroupeRow.slice(2, 5), rest: intergroupeRow.slice(5), pres: intergroupeRow[1] }
      : null

  const m = +sunParts[1]
  const pk = EDD_PERIODES[m<=2?0:m<=4?1:m<=6?2:m<=8?3:m<=10?4:5]
  const eddP = edd[pk]?.classes ?? null
  const eddZb = eddP?.["中班"]?.find(r => r[0] === sun) ?? null
  const eddDb = eddP?.["大班"]?.find(r => r[0] === sun) ?? null
  const eddGb = eddP?.["高班"]?.find(r => r[0] === sun) ?? null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageTitle title={t("common.header.planning")} />

      <StaleBanner show={stale} />

      {/* Prochain service de la personne connectée */}
      {nextServices && (() => {
        const jour = new Date(nextServices[0].date + "T12:00:00")
        const mois = new Intl.DateTimeFormat(i18n.language === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" }).format(jour)
        return (
          <section>
            <h2 className="mb-1.5 px-4 text-sm font-semibold text-muted-foreground">{t("planning.nextService")}</h2>
            <Link
              href="/mes-services"
              className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 transition-colors duration-150 active:bg-secondary/70"
            >
              <Tile color={serviceColor(nextServices[0].service)} big={jour.getDate()} small={mois} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-foreground">
                  {nextServices.map(e => `${e.service} (${e.role})`).join(" · ")}
                </span>
                <span className="block text-sm text-muted-foreground">
                  <span className="capitalize">{fdLongL(nextServices[0].date, i18n.language)}</span> · {t("planning.seeAllServices")}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />
            </Link>
          </section>
        )
      })()}

      {/* Ce dimanche */}
      <section aria-labelledby="ce-dimanche">
        <h2 id="ce-dimanche" className="mb-1.5 px-4 text-sm font-semibold text-muted-foreground">
          {t("planning.thisSunday", { date: sunLabel })}
        </h2>
        <div className="rounded-xl bg-card overflow-hidden">
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
                {cRow[11] && <InfoRow label={t("planning.roles.sainteCene")} value={val(cRow[11])} />}
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

          {/* Petit déj — seulement quand la case de la feuille est remplie */}
          {pdRow?.[1]?.trim() && (
            <SectionBlock dot={PLANNING_COLORS.table} label={t("planning.tabs.petitDej")}>
              <p className="text-sm text-foreground">{pdRow[1]}</p>
            </SectionBlock>
          )}

          {/* Groupes — ou, ces dimanches-là, Interfranco / Intergroupe */}
          {inter ? (
          <SectionBlock dot={PLANNING_COLORS[inter.key]} label={t(`planning.tabs.${inter.key}`)}>
            <InfoRow label={t("planning.roles.presidence")} value={val(inter.pres)} />
            <InfoRow label={t("planning.roles.choristes")} value={inter.choristes.filter(v => v?.trim()).join(", ")} />
            <InfoRow label={t("planning.roles.piano")} value={val(inter.rest[0])} />
            <InfoRow label={t("planning.roles.guitare")} value={val(inter.rest[1])} />
            <InfoRow label={t("planning.roles.cajonBatt")} value={val(inter.rest[2])} />
            <InfoRow label={t("planning.roles.sono")} value={val(inter.rest[3])} />
            <InfoRow label={t("planning.roles.ppt")} value={val(inter.rest[4])} />
            <InfoRow label={t("planning.roles.orateur")} value={val(inter.rest[5])} />
            <InfoRow label={t("planning.roles.trad")} value={val(inter.rest[6])} />
          </SectionBlock>
          ) : (
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
          )}

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
      </section>

      {/* Verset */}
      <blockquote className="bg-secondary rounded-xl p-5">
        <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
          {t("planning.verse.text")}
        </p>
        <footer className="text-xs font-semibold text-muted-foreground text-right">{t("planning.verse.ref")}</footer>
      </blockquote>
      <GuideLien section="planning" />
    </div>
  )
}
