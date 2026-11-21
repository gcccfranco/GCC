"use client"

// Évènement épinglé en grand (Lot AS, T6, AS11, AS12) : sans image, aplat encre neutre ; avec image,
// disposition I1 (image 16:9 en tête, texte dessous sur fond de carte).

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Clock, MapPin } from "lucide-react"
import { JOUR_MS, versUtc } from "@/lib/dates/iso"
import { nowIsoParis, refusInscription } from "@/lib/evenements/agenda"
import { lieuAffiche } from "@/lib/salles/salles"
import type { Evenement } from "@/types/evenement"
import { dateEnLettres, PILULE } from "./CarteFete"

export function CarteEpingle({ evenement: e, today, inscrit = false, className = "" }: { evenement: Evenement; today: string; inscrit?: boolean; className?: string }) {
  const { t, i18n } = useTranslation()
  const image = e.images[0]
  const jours = Math.round((versUtc(e.date) - versUtc(today)) / JOUR_MS)
  const fiche = `/evenements/${e.id}`
  const lieu = lieuAffiche(e)
  const externe = !!e.lienExterne
  // Déjà inscrit : « Voir » (la ligne du mois, qui portait « Inscrit », est retirée).
  const ouvertes = !externe && !inscrit && refusInscription(e, 0, nowIsoParis()) === null
  const pilule = `${PILULE} ${image ? "bg-foreground text-background" : "bg-white text-[#1c1c1e]"}`
  const action = externe
    ? <a href={e.lienExterne} target="_blank" rel="noopener noreferrer" className={pilule}>{t("planning.accueil.inscrire")}</a>
    : <Link href={fiche} className={pilule}>{t(ouvertes ? "planning.accueil.inscrire" : "evenements.epingle.voir")}</Link>
  return (
    <section
      data-testid="carte-epingle"
      aria-label={e.titre}
      className={`flex flex-col overflow-hidden rounded-2xl ${image ? "bg-card text-foreground" : "bg-[#1c1c1e] text-white dark:bg-[#2c2c2e]"} ${className}`}
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-[16/9] w-full object-cover object-center" />
      )}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-xl font-bold leading-tight"><Link href={fiche}>{e.titre}</Link></h2>
        <p className="mt-1 text-sm">
          {e.dateFin && e.dateFin !== e.date
            ? t("evenements.du", { from: dateEnLettres(e.date, i18n.language, true), to: dateEnLettres(e.dateFin, i18n.language, true) })
            : dateEnLettres(e.date, i18n.language)} · {jours <= 0 ? t("evenements.fete.aujourdhui") : t("evenements.fete.dansJours", { count: jours })}
        </p>
        {(e.heure || lieu) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm">
            {e.heure && <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{e.heure}{e.heureFin ? ` – ${e.heureFin}` : ""}</span>}
            {lieu && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{lieu}</span>}
          </p>
        )}
        <div className="mt-auto flex pt-4">{action}</div>
      </div>
    </section>
  )
}
