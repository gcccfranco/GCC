"use client"

// « Aperçu de ce que verront les groupes » (lot U1) : un jour réservable, les
// flèches vers le précédent et le suivant, les lignes du jour. Dessous, pour la
// coordination seule, les réservations hors grille (Q8), à déplacer ou retirer.

import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { deleteCreneau, listCreneaux, updateCreneau } from "@/lib/firebase/programmes"
import { overlaps, todayIso } from "@/lib/scene/dimanches"
import {
  commence, creneauxLibres, heureLocale, horsGrille, joursReservables, lignesDuJour, saisonDe,
} from "@/lib/scene/saison"
import { QUI, type Creneau, type Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { CreneauForm, type CreneauValues } from "./CreneauForm"
import { LigneJour } from "./LigneJour"
import { titreDuJour } from "./libelles"

/** Pastille « Hors grille » : réservation hors des jours ou des créneaux de la saison. */
export function BadgeHorsGrille() {
  const { t } = useTranslation()
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold border border-foreground/30 text-foreground">{t("planning.saison.horsGrille")}</span>
}

const fleche = "h-8 w-8 rounded-full bg-secondary inline-flex items-center justify-center disabled:opacity-40"

export function Apercu({ programme, creneaux, onChanged }: {
  programme: Programme
  creneaux: Creneau[]
  onChanged: () => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const horsId = useId()
  const saison = saisonDe(programme)
  const today = todayIso()
  const maintenant = heureLocale()
  const jours = joursReservables(saison, programme.jourJ)
  const [choisi, setChoisi] = useState<string | null>(null)
  const [deplace, setDeplace] = useState<Creneau | null>(null)
  // Le jour choisi reste tant qu'il est réservable ; sinon le prochain à venir.
  const jour = choisi && jours.includes(choisi) ? choisi : (jours.find((d) => d >= today) ?? jours.at(-1) ?? null)
  const i = jour ? jours.indexOf(jour) : -1
  const hors = horsGrille(saison, creneaux)

  async function deplacer(c: Creneau, values: CreneauValues): Promise<string | null> {
    try {
      // Relecture juste avant d'écrire : la scène est unique, un chevauchement est refusé.
      const fresh = await listCreneaux(programme.id)
      const clash = fresh.find((o) => o.id !== c.id && overlaps(o, values))
      if (clash) return t("planning.programme.overlap", { slot: `${clash.debut} – ${clash.fin} · ${clash.quoi} · ${clash.qui.join(", ")} (${clash.auteurNom})` })
      await updateCreneau(programme.id, c.id, values)
      setDeplace(null)
      await onChanged()
      return null
    } catch {
      return t("planning.programme.error")
    }
  }

  async function retirer(c: Creneau) {
    if (!window.confirm(t("planning.programme.confirmRemove"))) return
    await deleteCreneau(programme.id, c.id)
    await onChanged()
  }

  return (
    <div className="space-y-4">
      <section aria-label={t("planning.saison.apercu")} className="bg-card shadow-soft rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-semibold">{jour ? titreDuJour(jour, i18n.language) : t("planning.saison.aucunJour")}</h3>
          <span className="ml-auto flex gap-1.5">
            <button type="button" className={fleche} aria-label={t("planning.saison.precedent")} disabled={i <= 0} onClick={() => setChoisi(jours[i - 1])}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" className={fleche} aria-label={t("planning.saison.suivant")} disabled={i < 0 || i >= jours.length - 1} onClick={() => setChoisi(jours[i + 1])}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </span>
        </div>
        <p className="mt-1 mb-3 text-[13px] text-muted-foreground">{t("planning.saison.apercu")}</p>
        <ul className="space-y-2">
          {jour && lignesDuJour(saison, jour, creneaux).map((l) => (
            <LigneJour
              key={l.type === "reserve" ? l.creneau.id : `${l.type}-${l.debut}`}
              ligne={l}
              badges={l.type === "reserve" && l.horsGrille ? <BadgeHorsGrille /> : undefined}
              droite={l.type === "reserve"
                ? <span className="text-muted-foreground">{l.creneau.auteurNom}</span>
                : l.type === "libre" && !commence(jour, l.debut, today, maintenant)
                  ? <span className="text-muted-foreground">{t("planning.saison.reserver")}</span>
                  : undefined}
            />
          ))}
        </ul>
      </section>

      {hors.length > 0 && (
        <section aria-labelledby={horsId} className="bg-card shadow-soft rounded-2xl p-5 space-y-2">
          <h3 id={horsId} className="text-sm font-bold">{t("planning.saison.horsGrilleN", { count: hors.length })}</h3>
          <ul className="divide-y divide-border">
            {hors.map((c) => {
              const places = creneauxLibres(saison, programme.jourJ, creneaux, { sauf: c.id, today, maintenant })
              const depart = places.find((p) => p.jour === c.dimanche) ?? places[0]
              return (
                <li key={c.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>
                      <b className="tabular-nums">{titreDuJour(c.dimanche, i18n.language)} · {c.debut} – {c.fin}</b>
                      {" · "}{c.quoi} · {c.qui.join(", ")} <span className="text-muted-foreground">({c.auteurNom})</span>
                    </span>
                    <span className="ml-auto flex gap-1">
                      {depart && (
                        <Button size="sm" variant="ghost" onClick={() => setDeplace(deplace?.id === c.id ? null : c)}>{t("planning.saison.deplacer")}</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => retirer(c)}>{t("planning.programme.remove")}</Button>
                    </span>
                  </div>
                  {deplace?.id === c.id && depart && (
                    <CreneauForm
                      title={t("planning.saison.deplacerTitre")}
                      places={places}
                      initial={{ dimanche: depart.jour, debut: depart.debut, fin: depart.fin, quoi: c.quoi, qui: c.qui, note: c.note }}
                      quiOptions={QUI}
                      onSubmit={(values) => deplacer(c, values)}
                      onCancel={() => setDeplace(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
