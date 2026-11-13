// La pastille d'état d'une édition ou d'une inscription (bo-evenements-10) : fond neutre, texte de 12 px, et un
// point de couleur qui répète le mot sans le remplacer (lisible sans la couleur). Un seul composant pour la scène
// des fêtes et la fiche de gestion d'un évènement ; le mot vient de l'appelant (l'élément entier porte le texte).

import type { ReactNode } from "react"

/** Le point : vert « ouvertes », ambre « bientôt » et « lancée », gris « fermées », « terminé » et « externe »,
 *  creux « brouillon » et « aucune ». */
const POINTS: Record<string, string> = {
  ouvertes: "bg-[var(--etat-ouvert)]",
  bientot: "bg-[var(--etat-attente)]",
  fermees: "bg-muted-foreground",
  passee: "bg-muted-foreground",
  externe: "bg-muted-foreground",
  brouillon: "border-[1.5px] border-muted-foreground",
  aucune: "border-[1.5px] border-muted-foreground",
}

export function PastilleEtat({ etat, testId, children }: { etat: string; testId?: string; children: ReactNode }) {
  return (
    <span data-testid={testId} data-etat={etat} className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-xs font-semibold text-foreground/80">
      <span aria-hidden data-point="" className={`h-2 w-2 shrink-0 rounded-full ${POINTS[etat] ?? POINTS.fermees}`} />
      {children}
    </span>
  )
}
