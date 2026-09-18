"use client"

// Évènement dans le calendrier. À venir : une grande carte comme la maquette de
// Timothée (17/09/2026) : bannière, badges, titre, date · horaire · lieu,
// « Pour plus d'infos », état d'inscription et « N déjà inscrits ». Infos
// épinglées et évènements passés : une ligne compacte (jour, titre, heure ·
// lieu). Toute la carte est un lien vers la fiche : « S'inscrire » n'inscrit
// pas, il y mène (lot 6 bis, 16/09/2026). Le haut de carte sert aussi à la fiche.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CalendarDays, Check, Clock, Image as ImageIcon, Info, MapPin } from "lucide-react"
import { isInfo, nowIsoParis, placesRestantes, refusInscription } from "@/lib/evenements/agenda"
import { useRaisonInscription } from "@/components/evenements/ChoixInscriptions"
import { fdFullL } from "@/lib/planning/utils"
import { categoryColor, categoryLabel, PLANNING_COLORS } from "@/lib/serviceColors"
import { poleDuPour } from "@/lib/access"
import type { Evenement } from "@/types/evenement"
import { buttonVariants } from "@/components/ui/button"
import { Tile } from "@/components/ui/tile"

const COLOR = PLANNING_COLORS.scene

/** « oct. » / « 10月 » : le mois court de la vignette de date. */
function monthLabel(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" })
}

export function TypePour({ e }: { e: Pick<Evenement, "type" | "pour"> }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${COLOR}18`, color: COLOR }}>
        {t(`evenements.types.${e.type}`)}
      </span>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold bg-secondary text-foreground"
        style={e.pour === "eglise" ? undefined : { background: `${categoryColor(e.pour)}18`, color: categoryColor(e.pour) }}>
        {e.pour === "eglise"
          ? t("evenements.pourEglise")
          : poleDuPour(e.pour)
            ? t("evenements.pourPole", { pole: t(`taches.pole.${poleDuPour(e.pour)}`) })
            : categoryLabel(e.pour)}
      </span>
    </>
  )
}

/** Haut de la maquette, commun à la carte et à la fiche : bannière (image ou
 *  zone d'attente), badges et titre (`titre` : niveau, ou `false` quand la
 *  carte de gestion les porte déjà), lignes date · horaire · lieu. */
export function EnteteEvenement({ e, titre }: { e: Evenement; titre: "h2" | "h3" | false }) {
  const { i18n, t } = useTranslation()
  const Titre = titre || "h2"
  return (
    <>
      {(!isInfo(e) || e.images[0]) && (
        <div data-testid="banniere" className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-secondary">
          {e.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.images[0]} alt={e.titre} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
          )}
        </div>
      )}
      {titre && (
        <div>
          <div className="flex flex-wrap gap-1"><TypePour e={e} /></div>
          <Titre className="mt-2 text-xl font-bold text-foreground text-balance">{e.titre}</Titre>
        </div>
      )}
      {!isInfo(e) && (
        <ul className="space-y-1.5 text-sm text-foreground">
          <li className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            {/* Majuscule à l'écran seulement (« Dimanche 27 septembre ») : le texte reste celui du planning. */}
            <span className="inline-block first-letter:uppercase">
              {e.dateFin
                ? t("evenements.du", { from: fdFullL(e.date, i18n.language), to: fdFullL(e.dateFin, i18n.language) })
                : fdFullL(e.date, i18n.language)}
            </span>
          </li>
          {e.heure && (
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{e.heure}{e.heureFin ? ` – ${e.heureFin}` : ""}</span>
            </li>
          )}
          {e.lieu && (
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span>{e.lieu}</span>
            </li>
          )}
        </ul>
      )}
    </>
  )
}

/** « Pour plus d'infos : responsable », sous un filet. */
export function PlusInfos({ e }: { e: Evenement }) {
  const { t } = useTranslation()
  return (
    <p className="flex items-start gap-2.5 border-t border-border pt-4 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{t("evenements.plusInfos", { nom: e.contact || e.organisateurNom })}</span>
    </p>
  )
}

/** Bas de la grande carte : l'état d'inscription, puis le compteur. Une info
 *  ou une réunion de pôle n'a pas d'inscriptions : rien. */
function PiedCarte({ e, inscrit }: { e: Evenement; inscrit: boolean }) {
  const { t } = useTranslation()
  const raison = useRaisonInscription()
  if (isInfo(e) || poleDuPour(e.pour)) return null
  const places = placesRestantes(e)
  const refus = refusInscription(e, 0, nowIsoParis())
  let etat
  if (inscrit) {
    etat = (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <Check className="h-4 w-4" aria-hidden />{t("evenements.inscrit")}
      </span>
    )
  } else if (refus === "complet") {
    etat = <p className="text-sm font-semibold text-muted-foreground">{t("evenements.complet")}</p>
  } else if (refus === null) {
    etat = <span className={buttonVariants({ size: "lg", className: "w-full" })}>{t("evenements.sinscrire")}</span>
  } else {
    etat = <p className="text-sm text-muted-foreground">{raison(e, refus, true)}</p>
  }
  return (
    <div className="space-y-2 text-center">
      {etat}
      <p className="text-sm text-muted-foreground">
        {t("evenements.dejaInscrits", { count: e.inscrits })}
        {places !== null && places > 0 && ` · ${t("evenements.places", { count: places })}`}
      </p>
    </div>
  )
}

/** Évènement à venir : la grande carte de la maquette. */
export function EvenementCarte({ evenement: e, inscrit = false }: { evenement: Evenement; inscrit?: boolean }) {
  return (
    <Link href={`/evenements/${e.id}`}
      className="block space-y-4 rounded-2xl bg-card p-4 transition-transform duration-150 active:scale-[.99]">
      <EnteteEvenement e={e} titre="h3" />
      <PlusInfos e={e} />
      <PiedCarte e={e} inscrit={inscrit} />
    </Link>
  )
}

/** Info épinglée ou évènement passé : la ligne compacte. */
export function EvenementCard({ evenement: e, past }: { evenement: Evenement; past?: boolean }) {
  const { i18n } = useTranslation()
  return (
    <Link href={`/evenements/${e.id}`}
      className={`block bg-card rounded-xl px-4 py-3 transition-colors duration-150 active:bg-secondary/70 hover:bg-secondary/40 ${past ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        {!isInfo(e) && <Tile color={COLOR} big={Number(e.date.slice(8, 10))} small={monthLabel(e.date, i18n.language)} size="lg" />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{e.epingle ? "📌 " : ""}{e.titre}</p>
          <p className="text-sm text-muted-foreground truncate">{[e.heure, e.lieu].filter(Boolean).join(" · ")}</p>
        </div>
      </div>
    </Link>
  )
}
