"use client"

// La saison en résumé, sur téléphone (docs/spec-scene-paques-noel.md, P9, Q22 ; planche
// `v18-scene-a-coord-avant-telephone`) : une ligne par réglage — Jour J, Réservations, Jours et
// plages, Un créneau dure, Qui peut réserver — qui ouvre une feuille avec ce réglage seul. La
// feuille est la carte de la saison réduite à ce réglage (`SaisonForm seul`) : même écriture à
// chaque changement, même erreur sous le champ, rien d'écrit tant qu'elle s'affiche. Refermer la
// feuille oublie un réglage refusé : le résumé dit ce qui est en base.

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronRight } from "lucide-react"
import { famillesDe, saisonDe } from "@/lib/scene/saison"
import type { Programme } from "@/types/programme"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { SaisonForm, type AutreFete, type ReglageSeul, type SaisonPatch } from "@/app/evenements/scene/SaisonForm"
import { heureCourte, jourCourt, semaineCourte } from "@/app/evenements/scene/libelles"

export function ResumeSaison({ programme, onSave, jourJCalcule, autre, onErreur }: {
  programme: Programme
  onSave: (patch: SaisonPatch) => Promise<void>
  jourJCalcule?: { date: string; fete: string }
  autre?: AutreFete
  onErreur?: (erreur: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const zh = lang === "zh-CN"
  // La feuille garde son réglage pendant qu'elle se referme : `montre` reste, `ouverte` passe à faux.
  const [montre, setMontre] = useState<ReglageSeul | null>(null)
  const [ouverte, setOuverte] = useState(false)
  useStandaloneScrollLock(ouverte)
  const s = saisonDe(programme)
  const annee = programme.jourJ.slice(0, 4)

  const lignes: { cle: ReglageSeul; titre: string; valeur: string }[] = [
    { cle: "jourJ", titre: t("planning.gestion.jourJ"), valeur: zh ? `${annee}年${jourCourt(programme.jourJ, lang)}` : `${jourCourt(programme.jourJ, lang)} ${annee}` },
    { cle: "dates", titre: t("planning.saison.periode"), valeur: `${semaineCourte([s.debut], lang)} → ${semaineCourte([s.fin], lang)}` },
    {
      cle: "joursPlages", titre: t("planning.gestion.joursEtPlages"),
      valeur: s.plages.map((p) => `${t(`planning.saison.jourCourt.${p.jour}`)} ${heureCourte(p.debut)}–${heureCourte(p.fin)}`).join(" · "),
    },
    { cle: "duree", titre: t("planning.saison.duree"), valeur: t(`planning.saison.dureeCourte.${s.duree}`) },
    {
      cle: "qui", titre: t("planning.saison.qui"),
      valeur: s.quiAutorises.length === 0
        ? t("planning.saison.tous")
        : famillesDe(s.quiAutorises).map((f) => t(`planning.saison.familles.${f}`)).join(zh ? "、" : ", "),
    },
  ]
  const titre = lignes.find((l) => l.cle === montre)?.titre ?? ""

  function fermer() {
    setOuverte(false)
    onErreur?.(false)
  }

  return (
    <>
      <ul aria-label={t("planning.gestion.reglagesSaison")} className="raised divide-y divide-border overflow-hidden rounded-2xl">
        {lignes.map((l) => (
          <li key={l.cle}>
            <button
              type="button"
              onClick={() => { setMontre(l.cle); setOuverte(true) }}
              className="flex min-h-[52px] w-full items-center gap-3 py-2 pr-3 pl-4 text-left transition-colors hover:bg-secondary"
            >
              <span className="shrink-0 text-[15px] font-semibold text-foreground">{l.titre}</span>
              <span className="ml-auto min-w-0 text-right text-[14px] text-muted-foreground">{l.valeur}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Drawer open={ouverte} onOpenChange={(o) => { if (!o) fermer() }}>
        <DrawerContent className="max-h-[92vh] md:mx-auto md:max-w-lg" aria-describedby={undefined}>
          <DrawerHeader className="pb-1 text-left">
            <DrawerTitle className="text-xl font-bold">{titre}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-5 overflow-y-auto px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {montre && (
              <SaisonForm
                key={`${programme.id}-${montre}`}
                seul={montre}
                programme={programme}
                onSave={onSave}
                jourJCalcule={jourJCalcule}
                autre={autre}
                onErreur={onErreur}
              />
            )}
            <Button type="button" className="h-12 w-full rounded-full text-[15px]" onClick={fermer}>{t("planning.gestion.termine")}</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
