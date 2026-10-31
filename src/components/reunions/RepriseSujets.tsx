"use client"

// « Reprendre les sujets non traités ? » (lot U6, R2, docs/spec-back-office.md ;
// planche bo-reunion-nouvelle-telephone) : posée à la création d'une réunion,
// par « Créer » comme par « Dupliquer », quand des réunions déjà tenues du même
// public ont laissé des sujets. Il faut répondre : Échap ne ferme pas.

import { useTranslation } from "react-i18next"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { jourDuMois, type SujetAReprendre } from "@/lib/reunions/sujets"

export function RepriseSujets({ aReprendre, onChoix }: {
  /** null ou vide : pas de question. */
  aReprendre: SujetAReprendre[] | null
  onChoix: (reprendre: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const liste = aReprendre ?? []
  const reunions = new Set(liste.map((a) => a.reunion.id)).size
  const date = (a: SujetAReprendre) => jourDuMois(a.reunion.date, i18n.language)

  return (
    <AlertDialog open={liste.length > 0}>
      <AlertDialogContent onEscapeKeyDown={(ev) => ev.preventDefault()}
        className="w-[calc(100%-2.5rem)] max-w-sm gap-0 rounded-[20px] border-0 bg-card p-[18px] sm:rounded-[20px]">
        <AlertDialogTitle className="text-[17px] font-bold leading-snug text-foreground">{t("evenements.reprise.titre")}</AlertDialogTitle>
        <AlertDialogDescription className="mb-2.5 mt-1.5">
          {reunions === 1
            ? t("evenements.reprise.uneReunion", { date: liste[0] ? date(liste[0]) : "", count: liste.length })
            : t("evenements.reprise.plusieurs", { count: liste.length })}
        </AlertDialogDescription>
        <ul className="max-h-[40vh] space-y-1.5 overflow-y-auto">
          {liste.map((a) => (
            <li key={`${a.reunion.id}/${a.sujet.id}`}
              className="rounded-[10px] bg-red-50 px-2.5 py-2 font-semibold leading-snug text-red-700 break-words dark:bg-red-950/40 dark:text-red-400">
              {a.sujet.texte}
              {reunions > 1 && <span className="font-normal"> · {date(a)}</span>}
            </li>
          ))}
        </ul>
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <AlertDialogCancel onClick={() => onChoix(false)} className="mt-0 h-auto min-h-11 whitespace-normal border-0 bg-secondary px-2 py-2 text-[15px] text-secondary-foreground hover:bg-secondary/80">
            {t("evenements.reprise.non")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onChoix(true)} className="h-auto min-h-11 whitespace-normal px-2 py-2 text-[15px]">{t("evenements.reprise.oui")}</AlertDialogAction>
        </div>
        <p className="mt-2.5 text-xs text-muted-foreground">{t(reunions === 1 ? "evenements.reprise.noteUne" : "evenements.reprise.notePlusieurs")}</p>
      </AlertDialogContent>
    </AlertDialog>
  )
}
