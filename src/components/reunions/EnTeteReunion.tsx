"use client"

// En-tête d'une réunion au Back-Office (lot U6, B3, planche bo-reunion-avant) :
// « Réunion de pôle · DA » (ou « Réunion d'équipe · Régie », nom court de l'équipe), le titre, « Samedi 3 octobre ·
// 20:00 · Salle 2 · organisée par Alice Q. » ; à droite, pour qui la gère, « Dupliquer pour la prochaine »,
// « Modifier » et « ⋯ » (Supprimer).
// Agencement v18 (B4, planche `v18-bo-reunions`) : en grand, la fiche est dans le volet de droite, sous
// l'en-tête « Réunions » : badge du pôle, titre en h2 de 24 px. En un volet, la fiche est une page : l'en-tête
// commun (`EnTetePage`) avec « ‹ Réunions » pour seul retour (R8), le titre en h1.
import type { CSSProperties } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Copy, Pencil, Trash2, Users } from "lucide-react"
import { equipeDuPour, poleDuPour } from "@/lib/access"
import { categoryColor } from "@/lib/serviceColors"
import { titreDuJour } from "@/app/evenements/scene/libelles"
import type { Evenement } from "@/types/evenement"
import { EnTetePage } from "@/components/layout/EnTetePage"
import { MenuActions } from "@/components/layout/MenuActions"
import { Button } from "@/components/ui/button"
import { useDeuxVolets } from "@/hooks/useDeuxVolets"

export function EnTeteReunion({ e, gestion, onSupprimer }: { e: Evenement; gestion: boolean; onSupprimer: () => void }) {
  const { t, i18n } = useTranslation()
  const deuxVolets = useDeuxVolets()
  const pole = poleDuPour(e.pour)
  const equipe = equipeDuPour(e.pour)
  const libelle = pole
    ? t("backOffice.reunionDePole", { pole: t(`taches.pole.${pole}`) })
    : t("backOffice.reunionDEquipe", { equipe: t(`equipes.court.${equipe}`) })
  const ligne = [
    e.date ? titreDuJour(e.date, i18n.language) : "",
    e.heure,
    e.lieu,
    t("backOffice.organiseePar", { nom: e.organisateurNom }),
  ].filter(Boolean).join(" · ")

  const badge = (
    <p className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12.5px] font-semibold svc-ink"
      style={{ "--svc": categoryColor(e.pour), backgroundColor: `${categoryColor(e.pour)}18` } as CSSProperties}>
      <Users className="h-3.5 w-3.5" aria-hidden /> {libelle}
    </p>
  )
  const dupliquer = gestion && (
    <Button asChild size="sm" variant="outline" className="rounded-full">
      <Link href={`/back-office/reunions/nouvelle?from=${e.id}`}><Copy aria-hidden /> {t("backOffice.dupliquerProchaine")}</Link>
    </Button>
  )
  const modifier = gestion && (
    <Button asChild size="sm" variant="outline" className="rounded-full">
      <Link href={`/back-office/reunions/${e.id}/modifier`}><Pencil aria-hidden /> {t("evenements.modifier")}</Link>
    </Button>
  )
  const menu = gestion && (
    <MenuActions actions={[{ label: t("evenements.supprimer"), icone: Trash2, destructif: true, onSelect: onSupprimer }]} />
  )

  if (!deuxVolets) {
    return (
      <>
        <EnTetePage
          retour={{ href: "/back-office/reunions", label: t("backOffice.parties.reunions") }}
          titre={e.titre}
          outils={gestion && <>{modifier}{menu}</>}
        />
        <div className="space-y-2">
          {badge}
          <p className="text-[13px] text-muted-foreground">{ligne}</p>
          {dupliquer}
        </div>
      </>
    )
  }

  return (
    <header>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {badge}
          <h2 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-foreground text-balance">{e.titre}</h2>
        </div>
        {gestion && <div className="flex flex-wrap items-center gap-2">{dupliquer}{modifier}{menu}</div>}
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">{ligne}</p>
    </header>
  )
}
