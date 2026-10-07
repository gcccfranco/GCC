"use client"

// « Cette semaine » au Back-Office, sur une colonne (docs/spec-scene-paques-noel.md, P9, Q22 ;
// planche `v18-scene-a-coord-pendant-telephone`) : pendant la saison, les réservations de la
// semaine à venir (la première qui a un jour réservable à partir d'aujourd'hui, Q12), en cartes
// par jour ; chaque ligne dit le créneau, « Quoi · Qui · Réservé par », et porte le « ⋯ » des
// membres (Déplacer, Modifier, Retirer). Une réservation hors grille de la semaine y est aussi,
// avec sa pastille. Le tableau de toute la saison reste « Toutes les réservations ».

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { todayIso } from "@/lib/scene/dimanches"
import { horsGrille, saisonDe, semainesDe } from "@/lib/scene/saison"
import type { Creneau, Programme } from "@/types/programme"
import { BadgeHorsGrille } from "@/app/evenements/scene/Apercu"
import { semaineCourte, titreDuJour } from "@/app/evenements/scene/libelles"

/** Le dimanche qui clôt la semaine de ce lundi. */
function dimancheDe(lundi: string): string {
  const d = new Date(`${lundi}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 6)
  return d.toISOString().slice(0, 10)
}

export function CetteSemaine({ programme, creneaux, menu, erreur }: {
  programme: Programme
  creneaux: Creneau[]
  /** Le « ⋯ » d'une réservation (celui des membres, `Entrainements`). */
  menu: (c: Creneau) => ReactNode
  /** Un retrait manqué. */
  erreur: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const saison = saisonDe(programme)
  const today = todayIso()
  const semaine = semainesDe(saison, programme.jourJ, creneaux).find((s) => s.jours.at(-1)! >= today)
  if (!semaine) return null
  const fin = dimancheDe(semaine.lundi)
  const resas = creneaux.filter((c) => c.dimanche >= semaine.lundi && c.dimanche <= fin)
  const hors = new Set(horsGrille(saison, resas).map((c) => c.id))
  const jours = [...new Set([...semaine.jours, ...resas.map((c) => c.dimanche)])].sort()

  return (
    <section aria-labelledby="scene-cette-semaine" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="scene-cette-semaine" className="text-[17px] font-bold text-foreground">{t("planning.gestion.cetteSemaine")}</h3>
        <span className="text-[13px] tabular-nums text-muted-foreground">{semaineCourte(jours, lang)}</span>
      </div>
      {erreur}
      {jours.map((d) => {
        const duJour = resas.filter((c) => c.dimanche === d).sort((a, b) => a.debut.localeCompare(b.debut))
        return (
          <section key={d} aria-label={titreDuJour(d, lang)} className="raised overflow-hidden rounded-2xl">
            <h4 className="px-4 pt-3 pb-2 text-[14px] font-bold text-foreground">{titreDuJour(d, lang)}</h4>
            <ul>
              {duJour.length === 0 && (
                <li className="border-t border-border px-4 py-3 text-[13.5px] text-muted-foreground">{t("planning.gestion.aucuneReservation")}</li>
              )}
              {duJour.map((c) => (
                <li key={c.id} className="flex items-center gap-2 border-t border-border py-2.5 pr-1.5 pl-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tabular-nums text-foreground">
                      {c.debut} – {c.fin}
                      {hors.has(c.id) && <BadgeHorsGrille />}
                    </p>
                    <p className="text-[13px] text-muted-foreground">{[c.quoi, c.qui.join(", "), c.auteurNom].join(" · ")}</p>
                  </div>
                  {menu(c)}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
