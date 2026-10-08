"use client"

// Évènement dans le calendrier. À venir : une grande carte comme la maquette de
// Timothée (17/09/2026) : bannière, badges, titre, date · horaire · lieu,
// « Pour plus d'infos », état d'inscription et « N déjà inscrits ». Infos
// épinglées et évènements passés : une ligne compacte (jour, titre, heure ·
// lieu). Toute la carte est un lien vers la fiche : « S'inscrire » n'inscrit
// pas, il y mène (lot 6 bis, 16/09/2026). Le haut de carte sert aussi à la fiche.

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CalendarDays, Check, Clock, ExternalLink, Image as ImageIcon, Info, MapPin } from "lucide-react"
import { isInfo, nowIsoParis, placesRestantes, refusInscription, type EntreeSheetPublique } from "@/lib/evenements/agenda"
import { useRaisonInscription } from "@/components/evenements/ChoixInscriptions"
import { fdFullL } from "@/lib/planning/utils"
import { categoryColor, categoryLabel, PLANNING_COLORS } from "@/lib/serviceColors"
import { equipeDuPour, estReunion, poleDuPour, publicDeReunion } from "@/lib/access"
import type { Evenement } from "@/types/evenement"
import { buttonVariants } from "@/components/ui/button"
import { Tile } from "@/components/ui/tile"

const COLOR = PLANNING_COLORS.scene

/** « oct. » / « 10月 » : le mois court de la vignette de date. */
function monthLabel(iso: string, lang: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === "zh-CN" ? "zh-CN" : "fr-FR", { month: "short" })
}

/** Le public en pastille : « Toute l'église », une section, « Pôle DA », une équipe. */
function PastillePublic({ pour, className }: { pour: string; className: string }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-block rounded-full font-semibold bg-secondary text-foreground ${className}`}
      style={pour === "eglise" ? undefined : { background: `${categoryColor(pour)}18`, color: categoryColor(pour) }}>
      {pour === "eglise"
        ? t("evenements.pourEglise")
        : poleDuPour(pour)
          ? t("evenements.pourPole", { pole: t(`taches.pole.${poleDuPour(pour)}`) })
          : equipeDuPour(pour)
            ? t(`equipes.team.${equipeDuPour(pour)}`)
            : categoryLabel(pour)}
    </span>
  )
}

export function TypePour({ e }: { e: Pick<Evenement, "type" | "pour"> }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="inline-block text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${COLOR}18`, color: COLOR }}>
        {t(`evenements.types.${e.type}`)}
      </span>
      <PastillePublic pour={e.pour} className="text-xs px-2 py-0.5" />
    </>
  )
}

/** La bannière : l'image, ou une zone d'attente (une info sans image n'en a pas). */
export function Banniere({ e }: { e: Evenement }) {
  if (isInfo(e) && !e.images[0]) return null
  return (
    <div data-testid="banniere" className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-secondary">
      {e.images[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.images[0]} alt={e.titre} className="h-full w-full object-cover" />
      ) : (
        <ImageIcon className="h-10 w-10 text-muted-foreground/50" aria-hidden />
      )}
    </div>
  )
}

/** Badges (type, public) et titre ; `grand` : le titre d'une fiche dans le volet de droite, 24 px
 *  (agencement v18, R3). */
export function TitreEvenement({ e, niveau = "h2", grand = false }: { e: Evenement; niveau?: "h1" | "h2" | "h3"; grand?: boolean }) {
  const Titre = niveau
  return (
    <div>
      <div className="flex flex-wrap gap-1"><TypePour e={e} /></div>
      <Titre className={`mt-2 font-bold text-foreground text-balance ${grand ? "text-[24px] leading-[29px] tracking-tight" : "text-xl"}`}>{e.titre}</Titre>
    </div>
  )
}

/** Date · horaire · lieu, chacun avec son icône (rien pour une info). */
export function InfosEvenement({ e }: { e: Evenement }) {
  const { i18n, t } = useTranslation()
  if (isInfo(e)) return null
  return (
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
  )
}

/** Haut de la maquette, commun à la carte et à la fiche : bannière (image ou
 *  zone d'attente), badges et titre (`titre` : niveau, ou `false` quand la
 *  carte de gestion les porte déjà), lignes date · horaire · lieu. Lot U4 bis (B2) :
 *  les trois morceaux se posent aussi séparément (fiche en deux colonnes). */
export function EnteteEvenement({ e, titre }: { e: Evenement; titre: "h2" | "h3" | false }) {
  return (
    <>
      <Banniere e={e} />
      {titre && <TitreEvenement e={e} niveau={titre} />}
      <InfosEvenement e={e} />
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
 *  ou une réunion (de pôle ou d'équipe) n'a pas d'inscriptions : rien. */
function PiedCarte({ e, inscrit }: { e: Evenement; inscrit: boolean }) {
  const { t } = useTranslation()
  const raison = useRaisonInscription()
  if (isInfo(e) || estReunion(e)) return null
  const places = placesRestantes(e)
  const refus = refusInscription(e, 0, nowIsoParis())
  // Lot 11 : inscription sur un formulaire externe — la pilule, et rien d'autre.
  // La carte reste un lien vers la fiche : c'est elle qui mène au formulaire.
  const externe = refus === "externe"
  let etat
  if (externe) {
    etat = <span className={buttonVariants({ size: "lg", className: "w-full" })}>{t("evenements.sinscrire")}</span>
  } else if (inscrit) {
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
      {!externe && (
        <p className="text-sm text-muted-foreground">
          {t("evenements.dejaInscrits", { count: e.inscrits })}
          {places !== null && places > 0 && ` · ${t("evenements.places", { count: places })}`}
        </p>
      )}
    </div>
  )
}

/** Évènement à venir : la grande carte de la maquette. */
export function EvenementCarte({ evenement: e, inscrit = false }: { evenement: Evenement; inscrit?: boolean }) {
  return (
    <Link href={`/evenements/${e.id}`} data-testid="carte-evenement"
      className="block space-y-4 rounded-2xl bg-card p-4 transition-transform duration-150 active:scale-[.99]">
      <EnteteEvenement e={e} titre="h3" />
      <PlusInfos e={e} />
      <PiedCarte e={e} inscrit={inscrit} />
    </Link>
  )
}

/** Info épinglée ou évènement passé : la ligne compacte. Au Back-Office (lot U6, B3), elle
 *  mène à la fiche de gestion (`href`). Lot U4 bis (B2) : c'est aussi la ligne de l'agenda en
 *  deux volets — `actif` (la fiche montrée à droite) et `inscrit` (badge « Inscrit », sinon
 *  « Complet » ou « Bientôt » d'après l'inscription). */
export function EvenementCard({ evenement: e, past, href, actif = false, inscrit }: {
  evenement: Evenement; past?: boolean; href?: string; actif?: boolean; inscrit?: boolean
}) {
  const { i18n, t } = useTranslation()
  const reserve = publicDeReunion(e.pour) && !estReunion(e)
  let badge: React.ReactNode = null
  if (inscrit !== undefined && !past && !isInfo(e) && !estReunion(e)) {
    const refus = refusInscription(e, 0, nowIsoParis())
    if (inscrit) {
      badge = (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" aria-hidden />{t("evenements.inscrit")}
        </span>
      )
    } else if (refus === "complet") {
      badge = <span className="shrink-0 rounded-md bg-red-500/10 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">{t("evenements.complet")}</span>
    } else if (refus === "pasEncore") {
      badge = <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">{t("evenements.bientot")}</span>
    }
  }
  return (
    <Link href={href ?? `/evenements/${e.id}`} aria-current={actif ? "page" : undefined}
      className={`block rounded-xl px-4 py-3 transition-colors duration-150 ${actif
        ? "bg-foreground text-background [&_.text-foreground]:text-background [&_.text-muted-foreground]:text-background/75"
        : "bg-card active:bg-secondary/70 hover:bg-secondary/40"} ${past ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        {!isInfo(e) && <Tile color={COLOR} big={Number(e.date.slice(8, 10))} small={monthLabel(e.date, i18n.language)} size="lg" className={actif ? "!bg-background" : undefined} />}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{e.epingle ? "📌 " : ""}{e.titre}</p>
          <p className="text-sm text-muted-foreground truncate">
            {/* Évènement réservé à un pôle ou une équipe (retouches v18, E4) : son badge, comme sur la carte. */}
            {reserve && <PastillePublic pour={e.pour} className={`mr-1.5 px-1.5 py-px text-xs ${actif ? "!bg-background" : ""}`} />}
            {[e.heure, e.lieu].filter(Boolean).join(" · ")}
          </p>
        </div>
        {badge}
      </div>
    </Link>
  )
}

/** Entrée du Sheet des évènements (lot U9, B2, jusqu'au 31/12/2026) : la ligne compacte, sans
 *  fiche ni compteur, avec la mention « Tableau des évènements ». Connecté (à venir), dessous :
 *  « Pour plus d'infos » et « S'inscrire sur le tableau » (l'onglet du mois, nouvel onglet). */
export function EntreeSheetCarte({ entree: s, past }: { entree: EntreeSheetPublique; past?: boolean }) {
  const { i18n, t } = useTranslation()
  const horaire = s.heure ? `${s.heure}${s.heureFin ? ` – ${s.heureFin}` : ""}` : s.horaire
  return (
    <div data-source="sheet" className={`bg-card rounded-xl px-4 py-3 ${past ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <Tile color={COLOR} big={Number(s.date.slice(8, 10))} small={monthLabel(s.date, i18n.language)} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">{s.titre}</p>
          <p className="text-sm text-muted-foreground truncate">{[horaire, s.lieu].filter(Boolean).join(" · ")}</p>
          <p className="text-xs text-muted-foreground">{t("evenements.tableau")}</p>
        </div>
      </div>
      {(s.responsable || s.lien) && (
        <div className="mt-3 space-y-1 border-t border-border pt-2 text-sm text-muted-foreground">
          {s.responsable && (
            <p className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{t("evenements.plusInfos", { nom: s.responsable })}</span>
            </p>
          )}
          {s.lien && (
            <a href={s.lien} target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2.5 font-semibold text-foreground underline-offset-4 hover:underline">
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              {t("evenements.sinscrireTableau")}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
