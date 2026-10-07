"use client"

// Back-Office › Pâques ou Noël › « Toutes les réservations » (docs/spec-scene-paques-noel.md, P8,
// Q20 ; planche `v18-scene-a-coord-pendant-ordinateur`). Qui a réservé quoi, jour par jour : un
// tableau Jour · Créneau · Quoi · Qui · Réservé par · « ⋯ », un jour par groupe de lignes, filtré
// en pilules (À venir · Passées · Hors grille). Une réservation hors grille à venir est surlignée
// et porte « Déplacer » à la place de « ⋯ ». Le menu et la feuille sont ceux des membres
// (`Entrainements`, P6) : l'appelant les passe. Remplace la liste hors grille de l'aperçu.

import { useId, useState, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, Eye } from "lucide-react"
import { todayIso } from "@/lib/scene/dimanches"
import { heureLocale, horsGrille, saisonDe } from "@/lib/scene/saison"
import { PLANNING_COLORS } from "@/lib/serviceColors"
import type { Creneau, Programme } from "@/types/programme"
import { Pilules } from "@/components/layout/Onglets"
import { BadgeHorsGrille } from "@/app/evenements/scene/Apercu"
import { jourCourt } from "@/app/evenements/scene/libelles"

const COLOR = PLANNING_COLORS.scene

type Filtre = "avenir" | "passees" | "hors"

/** Réservations à venir (aujourd'hui compris tant qu'elles ne sont pas finies) et passées, et
 *  les réservations hors grille à venir (les seules qu'on puisse encore déplacer). */
export function rangerReservations(programme: Programme, creneaux: Creneau[], today = todayIso(), maintenant = heureLocale()) {
  const ordre = [...creneaux].sort((a, b) => (a.dimanche + a.debut).localeCompare(b.dimanche + b.debut))
  const aVenir = ordre.filter((c) => c.dimanche > today || (c.dimanche === today && c.fin > maintenant))
  const passees = ordre.filter((c) => !aVenir.includes(c))
  const hors = horsGrille(saisonDe(programme), aVenir)
  return { aVenir, passees, hors }
}

export function ToutesReservations({ programme, creneaux, titre, voirCommeMembre, menu, deplacer, erreur }: {
  programme: Programme
  creneaux: Creneau[]
  /** « Noël 2026 ». */
  titre: string
  /** L'onglet de la fête dans l'App. */
  voirCommeMembre: string
  menu: (c: Creneau) => ReactNode
  deplacer: (c: Creneau) => void
  erreur?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const titreId = useId()
  const [filtre, setFiltre] = useState<Filtre>("avenir")
  const { aVenir, passees, hors } = rangerReservations(programme, creneaux)
  const lignes = filtre === "avenir" ? aVenir : filtre === "passees" ? passees : hors

  return (
    <section aria-labelledby={titreId} className="space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-[min(100%,280px)] flex-1">
          <h2 id={titreId} className="text-[24px] leading-tight font-bold tracking-tight text-foreground">{t("planning.gestion.toutes")}</h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">{t("planning.gestion.toutesSousTitre", { edition: titre })}</p>
        </div>
        <Link
          href={voirCommeMembre}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-secondary px-4 text-[15px] font-semibold text-foreground transition-colors hover:bg-secondary/70"
        >
          <Eye className="h-4 w-4" aria-hidden /> {t("planning.gestion.voirCommeMembre")}
        </Link>
      </header>

      <Pilules<Filtre>
        etiquette={t("planning.gestion.filtrer")}
        obligatoire
        valeur={filtre}
        choisir={(v) => v && setFiltre(v)}
        options={[
          { cle: "avenir", nom: t("planning.gestion.filtres.avenir", { n: aVenir.length }) },
          { cle: "passees", nom: t("planning.gestion.filtres.passees", { n: passees.length }) },
          { cle: "hors", nom: t("planning.gestion.filtres.hors", { n: hors.length }) },
        ]}
      />
      {erreur}

      <div className="raised overflow-x-auto rounded-2xl">
        <table aria-labelledby={titreId} className="w-full min-w-[560px] border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-border text-[12.5px] whitespace-nowrap text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">{t("planning.gestion.colonnes.jour")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("planning.gestion.colonnes.creneau")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("planning.gestion.colonnes.quoi")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("planning.gestion.colonnes.qui")}</th>
              <th scope="col" className="px-3 py-3 font-medium">{t("planning.gestion.colonnes.par")}</th>
              <th scope="col" aria-label={t("common.moreActions")} className="w-px px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {lignes.map((c, i) => {
              const nouveauJour = i === 0 || lignes[i - 1].dimanche !== c.dimanche
              const estHors = hors.includes(c)
              return (
                <tr
                  key={c.id}
                  data-hors-grille={estHors ? "true" : undefined}
                  className={`border-b border-border last:border-b-0 ${estHors ? "bg-secondary/70" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums text-foreground">{nouveauJour ? jourCourt(c.dimanche, lang) : ""}</td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                    <span className="inline-flex items-center gap-2">{c.debut} – {c.fin}{estHors && <BadgeHorsGrille />}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[12.5px] font-semibold svc-ink"
                      style={{ "--svc": COLOR, background: `color-mix(in srgb, ${COLOR} 12%, transparent)` } as CSSProperties}>
                      {c.quoi}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{c.qui.join(", ")}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-foreground/80">{c.auteurNom}</td>
                  <td className="px-3 py-2 text-right">
                    {estHors ? (
                      <button type="button" onClick={() => deplacer(c)}
                        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-background px-3 text-[13.5px] font-semibold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))] hover:bg-secondary">
                        <ArrowLeftRight className="h-4 w-4" aria-hidden /> {t("planning.saison.deplacer")}
                      </button>
                    ) : menu(c)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {lignes.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">{t("planning.gestion.aucuneReservation")}</p>}
      </div>
    </section>
  )
}
