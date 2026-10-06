"use client"

// « Réunions précédentes » (lot U6, R2, docs/spec-back-office.md ; planche
// bo-reunion-avant) : les réunions du même public tenues avant celle-ci, la plus
// récente d'abord, chacune vers sa fiche (ses sujets laissés y restent en rouge)
// et vers son compte rendu s'il y en a un (collé avec R3). Rien avant la première.
// La fiche s'ouvre dans l'espace où l'on est : l'App, ou le Back-Office (B3).

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { FileText } from "lucide-react"
import { jourDuMois, reunionsPrecedentes } from "@/lib/reunions/sujets"
import type { Evenement } from "@/types/evenement"

export function ReunionsPrecedentes({ courante, reunions, espace = "app" }: {
  courante: Evenement; reunions: Evenement[]; espace?: "app" | "back-office"
}) {
  const { t, i18n } = useTranslation()
  const precedentes = reunionsPrecedentes(reunions, courante)
  if (precedentes.length === 0) return null
  const annee = courante.date.slice(0, 4)

  return (
    <section aria-labelledby="precedentes-titre" data-testid="precedentes-carte" className="rounded-2xl bg-card px-4 pb-2 pt-4">
      <h3 id="precedentes-titre" className="text-base font-semibold text-foreground">{t("evenements.precedentes.titre")}</h3>
      <ul className="mt-1 divide-y divide-border">
        {precedentes.map((r) => (
          <li key={r.id} className="flex min-h-11 items-center gap-3 py-1">
            <Link href={`${espace === "back-office" ? "/back-office/reunions" : "/evenements"}/${r.id}`} className="font-semibold text-foreground underline-offset-2 hover:underline">
              {jourDuMois(r.date, i18n.language, { court: true, annee: r.date.slice(0, 4) !== annee })}
            </Link>
            {r.compteRendu?.url
              ? (
                <a href={r.compteRendu.url} target="_blank" rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--chord-color)] underline-offset-2 hover:underline">
                  <FileText className="h-3.5 w-3.5" aria-hidden />{t("evenements.precedentes.compteRendu")}
                </a>
              )
              : <span className="ml-auto text-xs text-muted-foreground">{t("evenements.precedentes.sansCompteRendu")}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
