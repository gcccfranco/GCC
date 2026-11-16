"use client"

// Le refus d'un chevauchement (docs/spec-salles.md, SA8) : ce qui prend la salle et ses heures, « Décaler » (même salle,
// première fenêtre de même durée) et les salles libres au même moment. Partagé par la feuille « Réserver » (lot 3) et
// le champ « Salle de l'église » d'un évènement ou d'une réunion (lot 4, SA12).

import { useTranslation } from "react-i18next"
import { nomOccupant, type Occupation } from "@/lib/salles/occupations"
import { SALLES, type SalleId } from "@/lib/salles/salles"

export function RefusSalle({ salle, bloque, libres, decale, langue, decaler, choisir, discret = false }: {
  salle: SalleId
  bloque: Occupation
  libres: SalleId[]
  decale: { debut: string; fin: string } | null
  langue: "fr" | "zh"
  decaler: (plage: { debut: string; fin: string }) => void
  choisir: (salle: SalleId) => void
  /** Dans un formulaire qui a déjà son bouton plein : « Décaler » en contour (critique-design T4a). */
  discret?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div role="alert" data-refus className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
      <p className="text-sm font-medium text-foreground">
        {t("salles.refus", { salle: SALLES.find((s) => s.id === salle)!.nom, qui: nomOccupant(bloque, langue), debut: bloque.debut, fin: bloque.fin === "24:00" ? "23:59" : bloque.fin }).replace(/ – /g, " – ")}
      </p>
      {decale && (
        <button type="button" onClick={() => decaler(decale)} className={`flex h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${discret ? "border border-foreground bg-background text-foreground hover:bg-secondary active:bg-secondary/80" : "bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}>
          {t("salles.decaler", decale)}
        </button>
      )}
      {libres.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{t("salles.libresMemeMoment")}</p>
          <div className="flex flex-wrap gap-2" data-libres>
            {libres.map((l) => (
              <button key={l} type="button" data-salle={l} onClick={() => choisir(l)} className="flex h-11 items-center rounded-full border border-border bg-background px-4 text-sm hover:bg-secondary active:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                {(({ nom, autreNom }) => (autreNom ? `${nom} · ${autreNom}` : nom))(SALLES.find((s) => s.id === l)!)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
