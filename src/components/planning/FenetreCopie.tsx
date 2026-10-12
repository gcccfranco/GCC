"use client"

import { useTranslation } from "react-i18next"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { buttonVariants } from "@/components/ui/button"
import { fdShort } from "@/lib/planning/utils"
import type { CaseGeste } from "@/lib/planning/gestes"

// La fenêtre de « Copier le dimanche précédent » quand la cible porte déjà d'autres noms
// (lot 3, PG13) : trois boutons, ce que `useConfirmer` (deux boutons) ne sait pas faire. Elle
// montre les seules cases qui changeraient de nom. L'action principale remplit les cases vides.

export type DemandeCopie = { source: string; cible: string; vides: CaseGeste[]; remplace: CaseGeste[]; verrouillees: number }

export function FenetreCopie({ demande, libelle, onChoix }: {
  demande: DemandeCopie | null
  /** Le nom d'une colonne, dans la langue de l'interface. */
  libelle: (cle: string) => string
  /** `vides` : seulement les cases vides ; `tout` : les cases vides et les noms remplacés ; `null` : rien. */
  onChoix: (choix: "vides" | "tout" | null) => void
}) {
  const { t } = useTranslation()
  const source = demande ? fdShort(demande.source) : ""
  const cible = demande ? fdShort(demande.cible) : ""
  const vides = demande?.vides.length ?? 0
  const remplies = demande?.remplace.length ?? 0
  return (
    <AlertDialog open={!!demande} onOpenChange={(o) => { if (!o) onChoix(null) }}>
      <AlertDialogContent className="max-w-[calc(100%-32px)] rounded-2xl sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("planning.gestes.confirmerCopie", { source, cible })}</AlertDialogTitle>
          <AlertDialogDescription>
            {vides > 0 ? t("planning.gestes.confirmerCopieVides", { cible, count: vides }) : t("planning.gestes.confirmerCopieSansVide", { cible })}
            {" "}
            {t("planning.gestes.confirmerCopieRemplies", { count: remplies })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {demande && (
          <table className="w-full text-left text-xs" data-testid="copie-changements">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-semibold">{t("planning.gestes.colonne")}</th>
                <th className="py-1 pr-2 font-semibold">{t("planning.gestes.aujourdhuiLe", { date: cible })}</th>
                <th className="py-1 font-semibold">{t("planning.gestes.le", { date: source })}</th>
              </tr>
            </thead>
            <tbody>
              {demande.remplace.map((c) => (
                <tr key={c.cle} className="border-t border-border">
                  <td className="py-1 pr-2">{libelle(c.cle)}</td>
                  <td className="py-1 pr-2">{c.avant}</td>
                  <td className="py-1 font-semibold">{c.apres}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel className="mt-0 rounded-full" onClick={() => onChoix(null)}>
            {t("planning.gestes.annuler")}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "secondary", className: "rounded-full text-foreground" })}
            onClick={() => onChoix("tout")}
          >
            {t("planning.gestes.remplacerAussi", { count: remplies })}
          </AlertDialogAction>
          {vides > 0 && (
            <AlertDialogAction className={buttonVariants({ className: "rounded-full" })} onClick={() => onChoix("vides")}>
              {t("planning.gestes.remplirVides", { count: vides })}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
