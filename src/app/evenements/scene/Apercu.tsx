"use client"

// « Aperçu des membres » (lot U1 ; une semaine à la fois depuis Pâques · Noël, P7, Q19 ; planche
// `v18-scene-a-coord-avant-ordinateur`) : la semaine choisie (‹ ›), son premier jour en lignes
// comme le verront les membres, les autres jours et le total de la saison en une phrase
// (« Dimanche 7 février : 5 créneaux, de 14:00 à 19:00. 7 semaines, 49 créneaux en tout. »).
// Dessous, pour la coordination seule, les réservations hors grille (Q8), à déplacer ou retirer
// (confirmation du site, plus de fenêtre du navigateur).

import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { deleteCreneau, listCreneaux, updateCreneau } from "@/lib/firebase/programmes"
import { overlaps, todayIso } from "@/lib/scene/dimanches"
import {
  commence, compteCreneaux, creneauxLibres, grilleDuJour, heureLocale, horsGrille, jourDeSemaine, lignesDuJour, quiPermis,
  saisonDe, semainesDe,
} from "@/lib/scene/saison"
import type { Creneau, Programme } from "@/types/programme"
import { Button } from "@/components/ui/button"
import { useConfirmer } from "@/components/layout/Confirmer"
import { CreneauForm, type CreneauValues } from "./CreneauForm"
import { Fleche, TuileDate } from "./Entrainements"
import { LigneJour } from "./LigneJour"
import { bornesSemaine, jourEnLettres, titreDuJour } from "./libelles"

/** Pastille « Hors grille » : réservation hors des jours ou des créneaux de la saison. */
export function BadgeHorsGrille() {
  const { t } = useTranslation()
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold border border-foreground/30 text-foreground">{t("planning.saison.horsGrille")}</span>
}

export function Apercu({ programme, creneaux, onChanged }: {
  programme: Programme
  creneaux: Creneau[]
  onChanged: () => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const confirmer = useConfirmer()
  const titreId = useId()
  const horsId = useId()
  const saison = saisonDe(programme)
  const today = todayIso()
  const maintenant = heureLocale()
  const semaines = semainesDe(saison, programme.jourJ, creneaux)
  const prochaine = semaines.find((s) => s.jours.at(-1)! >= today) ?? semaines.at(-1) ?? null
  // La semaine montrée reste tant qu'elle existe, même quand la saison change (cocher « sam. »
  // ne fait pas sauter l'aperçu) ; sinon la prochaine à venir.
  const [choisie, setChoisie] = useState<string | null>(prochaine?.lundi ?? null)
  const semaine = semaines.find((s) => s.lundi === choisie) ?? prochaine
  const i = semaine ? semaines.indexOf(semaine) : -1
  // La feuille « Déplacer » garde son contenu pendant qu'elle se referme ;
  // `fois` la remonte à neuf à chaque ouverture.
  const [deplace, setDeplace] = useState<Creneau | null>(null)
  const [ouverte, setOuverte] = useState(false)
  const [fois, setFois] = useState(0)
  const [erreurRetrait, setErreurRetrait] = useState("")
  // Les jours passés ne se déplacent plus : seule l'alerte à venir compte.
  const hors = horsGrille(saison, creneaux).filter((c) => c.dimanche >= today)

  async function deplacer(c: Creneau, values: CreneauValues): Promise<string | null> {
    // Q11, revu à l'enregistrement : le créneau a pu commencer feuille ouverte.
    if (commence(values.dimanche, values.debut, todayIso(), heureLocale())) return t("planning.saison.dejaCommence")
    try {
      // Relecture juste avant d'écrire : la scène est unique, un chevauchement est refusé.
      const fresh = await listCreneaux(programme.id)
      const clash = fresh.find((o) => o.id !== c.id && overlaps(o, values))
      if (clash) return t("planning.programme.overlap", { slot: `${clash.debut} – ${clash.fin} · ${clash.quoi} · ${clash.qui.join(", ")} (${clash.auteurNom})` })
      await updateCreneau(programme.id, c.id, values)
      setOuverte(false)
      await onChanged()
      return null
    } catch {
      return t("planning.programme.error")
    }
  }

  async function retirer(c: Creneau) {
    const oui = await confirmer({
      titre: t("planning.programme.confirmRemove"),
      texte: t("planning.semaines.retirerTexte", { resa: `${c.quoi} · ${c.qui.join(", ")}`, jour: jourEnLettres(c.dimanche, lang), debut: c.debut, fin: c.fin }),
      action: t("planning.programme.remove"),
      destructif: true,
    })
    if (!oui) return
    setErreurRetrait("")
    try {
      await deleteCreneau(programme.id, c.id)
      await onChanged()
    } catch {
      setErreurRetrait(t("planning.programme.error"))
    }
  }

  const premier = semaine?.jours[0] ?? null
  const bornes = semaine ? bornesSemaine(semaine.jours, lang) : null
  /** « Dimanche 7 février : 5 créneaux, de 14:00 à 19:00. » */
  const phraseDuJour = (d: string) => t("planning.gestion.apercuJour", {
    jour: titreDuJour(d, lang),
    count: grilleDuJour(saison, d).length,
    plages: saison.plages.filter((p) => p.jour === jourDeSemaine(d))
      .map((p) => t("planning.gestion.plage", { debut: p.debut, fin: p.fin })).join(t("planning.fete.et")),
  })
  const compte = compteCreneaux(saison, programme.jourJ)
  const zh = lang === "zh-CN"
  const total = `${t("planning.gestion.totalSemaines", { count: compte.semaines })}${zh ? "，" : ", "}${t("planning.gestion.totalCreneaux", { count: compte.total })}${zh ? "。" : "."}`
  const lignes = premier ? lignesDuJour(saison, premier, creneaux) : []
  const libres = premier ? lignes.filter((l) => l.type === "libre" && !commence(premier, l.debut, today, maintenant)).length : 0

  return (
    <div className="space-y-4">
      <section aria-labelledby={titreId} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 id={titreId} className="text-[17px] font-semibold">{t("planning.gestion.apercu")}</h3>
            <p className="text-[13px] text-muted-foreground">
              {bornes ? (bornes.au ? t("planning.semaines.titre", bornes) : t("planning.semaines.titreJour", { du: bornes.du })) : t("planning.saison.aucunJour")}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Fleche label={t("planning.semaines.precedente")} disabled={i <= 0} onClick={() => setChoisie(semaines[i - 1].lundi)}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Fleche>
            <Fleche label={t("planning.semaines.suivante")} disabled={i < 0 || i >= semaines.length - 1} onClick={() => setChoisie(semaines[i + 1].lundi)}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Fleche>
          </div>
        </div>
        {premier && (
          <section aria-label={titreDuJour(premier, lang)} className="raised rounded-2xl">
            <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
              <TuileDate iso={premier} lang={lang} />
              <h4 className="min-w-0 flex-1 text-[17px] font-bold text-foreground">{titreDuJour(premier, lang)}</h4>
              <span className="shrink-0 text-[13px] text-muted-foreground">{t("planning.gestion.libres", { count: libres })}</span>
            </div>
            <ul className="px-3 pb-3 space-y-1.5">
              {lignes.map((l) => (
                <LigneJour
                  key={l.type === "reserve" ? l.creneau.id : `${l.type}-${l.debut}`}
                  ligne={l}
                  badges={l.type === "reserve" && l.horsGrille ? <BadgeHorsGrille /> : undefined}
                  droite={l.type === "reserve"
                    ? <span>{l.creneau.auteurNom}</span>
                    : !commence(premier, l.debut, today, maintenant)
                      ? <span className="rounded-full bg-secondary px-3 py-1 font-semibold">{t("planning.saison.reserver")}</span>
                      : undefined}
                />
              ))}
            </ul>
          </section>
        )}
        {semaine && (
          <p className="raised rounded-2xl px-4 py-3 text-[13px] text-muted-foreground">
            {[...semaine.jours.slice(1).map(phraseDuJour), total].join(" ")}
          </p>
        )}
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
                      <b className="tabular-nums">{titreDuJour(c.dimanche, lang)} · {c.debut} – {c.fin}</b>
                      {" · "}{c.quoi} · {c.qui.join(", ")} <span className="text-muted-foreground">({c.auteurNom})</span>
                    </span>
                    <span className="ml-auto flex gap-1">
                      {depart && (
                        <Button size="sm" variant="ghost" onClick={() => { setDeplace(c); setOuverte(true); setFois((n) => n + 1) }}>{t("planning.saison.deplacer")}</Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => retirer(c)}>{t("planning.programme.remove")}</Button>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          {erreurRetrait && <p role="alert" className="text-sm text-destructive">{erreurRetrait}</p>}
        </section>
      )}

      {deplace && (() => {
        const places = creneauxLibres(saison, programme.jourJ, creneaux, { sauf: deplace.id, today, maintenant })
        const depart = places.find((p) => p.jour === deplace.dimanche) ?? places[0]
        return depart && (
          <CreneauForm
            key={fois}
            open={ouverte}
            title={t("planning.saison.deplacerTitre")}
            submitLabel={t("planning.programme.save")}
            places={places}
            initial={{ dimanche: depart.jour, debut: depart.debut, fin: depart.fin, quoi: deplace.quoi, qui: deplace.qui, note: deplace.note }}
            quiOptions={quiPermis({})}
            onSubmit={(values) => deplacer(deplace, values)}
            onCancel={() => setOuverte(false)}
          />
        )
      })()}
    </div>
  )
}
