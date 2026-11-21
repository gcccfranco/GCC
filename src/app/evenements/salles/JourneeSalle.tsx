"use client"

// La journée d'une salle (docs/spec-salles.md, SA4) : en un volet (téléphone, tablette portrait), une page avec son
// retour « ‹ Salles », les occupations du jour choisi dans la liste ; en grand, le volet de droite montre la semaine de
// la salle (sept jours à partir du jour choisi, marqué en tête). Les occupations comptent les lieux liés (AR6) :
// la journée de la Grande salle montre les créneaux de la Scène. T3a : une réservation s'ouvre en détail (`Detail` de
// la Grille), où son auteur et la coordination la modifient ou la suppriment (SA10).

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Squelette } from "@/components/layout/Squelette"
import { useDisposition } from "@/hooks/useDisposition"
import { addDays } from "@/lib/taches/echeances"
import { couleurDe, type Occupation } from "@/lib/salles/occupations"
import { Detail } from "./GrilleSalles"
import { salleLue, SALLES, type SalleId } from "@/lib/salles/salles"
import { dateLongue, ligneOccupation, occupationsDeLaSalle, RACINE_SALLES, useSalles } from "./SallesClient"

export function JourneeSalle({ salle }: { salle: SalleId }) {
  const { t } = useTranslation()
  const etat = useSalles()
  const grand = useDisposition() === "grand"
  const [detail, setDetail] = useState<{ o: Occupation; jour: string } | null>(null)
  const s = SALLES.find((x) => x.id === salleLue(salle))!
  if (!etat) return <Squelette enTete={false} />
  const { date, langue } = etat
  // La semaine part du jour choisi (critique-design T2b : partir du lundi montrait surtout des jours passés).
  const jours = grand ? Array.from({ length: 7 }, (_, i) => addDays(date, i)) : [date]

  return (
    <section data-journee-salle className="space-y-5">
      {!grand && (
        <Link href={RACINE_SALLES} className="-ml-1 inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft aria-hidden className="h-4 w-4" />
          {t("salles.retour")}
        </Link>
      )}
      <header className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">
          {s.nom}
          {s.autreNom && <span className="ml-2 text-lg font-semibold text-muted-foreground">{s.autreNom}</span>}
        </h2>
        {!grand && <p className="text-sm text-muted-foreground first-letter:uppercase">{dateLongue(date, langue)}</p>}
      </header>
      <div className="carte-groupe divide-y divide-border/60 overflow-hidden">
        {jours.map((j) => {
          const occupations = occupationsDeLaSalle(etat, salle, j)
          const choisi = grand && j === date
          return (
            <div key={j} aria-current={choisi ? "date" : undefined} className={`px-4 py-3 ${choisi ? "bg-secondary/70" : ""}`}>
              {grand && <h3 className="mb-1.5 text-sm font-semibold first-letter:uppercase">{dateLongue(j, langue)}</h3>}
              {occupations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("salles.rien")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {occupations.map((o, i) => (
                    <li key={o.id ?? i} className="flex items-start gap-2.5 text-sm tabular-nums">
                      <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: couleurDe(o) }} />
                      {o.source === "reservation" ? (
                        <button type="button" onClick={() => setDetail({ o, jour: j })} className="-my-1 min-h-7 text-left underline-offset-4 hover:underline">{ligneOccupation(o, langue)}</button>
                      ) : o.lien ? <Link href={o.lien} className="underline-offset-4 hover:underline">{ligneOccupation(o, langue)}</Link> : <span>{ligneOccupation(o, langue)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      <Detail occupation={detail?.o ?? null} langue={langue} dateLongue={detail ? dateLongue(detail.jour, langue) : ""} fermer={() => setDetail(null)} />
    </section>
  )
}
