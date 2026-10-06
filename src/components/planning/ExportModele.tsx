"use client"

import { useState, useSyncExternalStore } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Check, FileText, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useStandaloneScrollLock } from "@/hooks/useStandaloneScrollLock"
import { modeleDe, porteesExport, type Portee } from "@/lib/planning/modeles"
import type { DefinitionGrille } from "@/lib/planning/grilles"

// Menu « Exporter (modèle du Sheet) » (lot U2, P7, docs/spec-planning-2027.md,
// « Écrans ») : ce que la page montre, toute l'année du planning, et pour les
// admins tous les plannings de l'année ; un bouton par format. Fenêtre sur
// ordinateur et tablette, feuille sur téléphone. Il remplace « Exporter en
// CSV » et « Exporter en PDF » du lot 17 (question 6). P8 : le bouton « .xlsx ».

export type ExportPlanning = {
  annee: number
  /** Page affichée : trimestre (1 à 4), période de l'EDD (1 à 6), 1 pour l'année. */
  rang: number
  /** Admin : « Tous les plannings {{annee}} » (Q13). */
  tout: boolean
}

const LARGE = "(min-width: 768px)"
const suivreLargeur = (rappel: () => void) => {
  const mq = window.matchMedia(LARGE)
  mq.addEventListener("change", rappel)
  return () => mq.removeEventListener("change", rappel)
}

/** Ordinateur et tablette (≥ 768 px) : fenêtre ; téléphone : feuille. */
const useOrdinateur = () =>
  useSyncExternalStore(suivreLargeur, () => window.matchMedia(LARGE).matches, () => false)

export function ExportModele({
  definition,
  periode,
  exporter,
}: {
  definition: DefinitionGrille
  /** Période affichée, telle que le bandeau l'écrit (« T1 2027 »). */
  periode: string
  exporter: ExportPlanning
}) {
  const { t } = useTranslation()
  const [ouvert, setOuvert] = useState(false)
  const ordinateur = useOrdinateur()
  useStandaloneScrollLock(ouvert && !ordinateur)
  const titre = t("planning.export.titre")

  const contenu = ouvert && (
    <Choix definition={definition} periode={periode} exporter={exporter} onFini={() => setOuvert(false)} />
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        // Agencement v18 (B6) : un outil de l'en-tête, en contour, « Exporter » ; le nom complet
        // reste celui que lisent les lecteurs d'écran.
        aria-label={t("planning.export.bouton")}
        className="h-9 px-3.5 rounded-full border border-border bg-card text-[13px] font-semibold text-foreground hover:bg-secondary inline-flex items-center gap-1.5 transition-[background-color,color,transform] duration-150 active:scale-[.96] cursor-pointer"
      >
        <FileText className="h-3.5 w-3.5" aria-hidden />
        {titre}
      </button>
      {ordinateur ? (
        <DialogPrimitive.Root open={ouvert} onOpenChange={setOuvert}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-5 shadow-lg"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">{titre}</DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label={t("common.buttons.close")}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden />
                </DialogPrimitive.Close>
              </div>
              {contenu}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      ) : (
        <Drawer open={ouvert} onOpenChange={setOuvert}>
          <DrawerContent aria-describedby={undefined}>
            <DrawerHeader className="pb-1">
              <DrawerTitle>{titre}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">{contenu}</div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}

function Choix({
  definition,
  periode,
  exporter,
  onFini,
}: {
  definition: DefinitionGrille
  periode: string
  exporter: ExportPlanning
  onFini: () => void
}) {
  const { t } = useTranslation()
  const portees = porteesExport(definition.key, exporter.tout)
  const [portee, setPortee] = useState<Portee>(portees[0])
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState(false)
  // Ce que le nom du fichier dit de la page affichée : « T1 », ou « P5 » pour l'EDD.
  const periodeCourte = `${modeleDe(definition.key)?.decoupage === "periodeEdd" ? "P" : "T"}${exporter.rang}`

  const libelle: Record<Portee, string> = {
    affiche: t("planning.export.affiche", { periode, planning: definition.label }),
    annee: t("planning.export.annee", { planning: definition.label }),
    tout: t("planning.export.tout", { annee: exporter.annee }),
  }

  async function lancer(format: "pdf" | "xlsx") {
    setEnCours(true)
    setEchec(false)
    try {
      const { exporterModele } = await import("@/lib/planning/exporter")
      await exporterModele(format, {
        portee, key: definition.key, annee: exporter.annee, rang: exporter.rang, periodeCourte,
      })
      onFini()
    } catch {
      setEchec(true)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t("planning.export.titre")} className="overflow-hidden rounded-xl bg-card">
        {portees.map((p) => {
          const coche = p === portee
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={coche}
              onClick={() => setPortee(p)}
              className="flex w-full min-h-[48px] items-center gap-3 px-4 py-2.5 text-left text-base text-foreground transition-colors duration-150 active:bg-secondary/70 cursor-pointer"
            >
              <span className="min-w-0 flex-1">{libelle[p]}</span>
              <Check aria-hidden className={`h-5 w-5 shrink-0 ${coche ? "" : "invisible"}`} />
            </button>
          )
        })}
      </div>
      {enCours && <p aria-live="polite" className="text-sm text-muted-foreground">{t("planning.export.enCours")}</p>}
      {echec && <p role="alert" className="text-sm text-destructive">{t("planning.export.echec")}</p>}
      <div className="flex gap-2">
        <Button type="button" className="flex-1" disabled={enCours} onClick={() => void lancer("pdf")}>
          {t("planning.export.pdf")}
        </Button>
        <Button type="button" className="flex-1" disabled={enCours} onClick={() => void lancer("xlsx")}>
          {t("planning.export.xlsx")}
        </Button>
      </div>
    </div>
  )
}
