"use client"

// En-tête d'une réunion au Back-Office (lot U6, B3, planche bo-reunion-avant) :
// « Réunion de pôle · DA » (ou « Réunion d'équipe · Régie », nom court de l'équipe), le titre, « Samedi 3 octobre ·
// 20:00 · Salle 2 · organisée par Alice Q. » ; à droite, pour qui la gère, « Modifier »,
// « Dupliquer pour la prochaine », et « Supprimer » (absent de la planche).
import type { CSSProperties } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Copy, Pencil, Users } from "lucide-react"
import { equipeDuPour, poleDuPour } from "@/lib/access"
import { categoryColor } from "@/lib/serviceColors"
import { titreDuJour } from "@/app/evenements/scene/libelles"
import type { Evenement } from "@/types/evenement"
import { Button } from "@/components/ui/button"

export function EnTeteReunion({ e, gestion, onSupprimer }: { e: Evenement; gestion: boolean; onSupprimer: () => void }) {
  const { t, i18n } = useTranslation()
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

  return (
    <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold svc-ink" style={{ "--svc": categoryColor(e.pour) } as CSSProperties}>
          <Users className="h-3.5 w-3.5" aria-hidden /> {libelle}
        </p>
        <h1 className="text-[26px] sm:text-[30px] leading-tight font-bold tracking-tight text-foreground text-balance">{e.titre}</h1>
        <p className="text-[13px] text-muted-foreground">{ligne}</p>
      </div>
      {gestion && (
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href={`/back-office/evenements/${e.id}/modifier`}><Pencil aria-hidden /> {t("evenements.modifier")}</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/back-office/evenements/nouveau?from=${e.id}`}><Copy aria-hidden /> {t("backOffice.dupliquerProchaine")}</Link>
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onSupprimer}>
            {t("evenements.supprimer")}
          </Button>
        </div>
      )}
    </header>
  )
}
