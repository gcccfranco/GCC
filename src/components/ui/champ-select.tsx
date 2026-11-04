import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

// Le `<select>` natif des formulaires (jeu de contrôles B, lot CD, T3a) : on garde la roue d'iOS au téléphone, on
// l'habille comme un champ — 44 px, rayon 12, `--secondary` (`--secondary-fond` posé sur le gris), chevron lucide de 16 px
// (`appearance: none`), police du site. Hors formulaire, un choix passe par `Menu`, jamais par un `<select>`.

/** La classe du `<select>` lui-même, pour un cas où le wrapper ne convient pas (le chevron est alors à poser à la main). */
export const SELECT_CHAMP =
  "h-11 w-full min-w-0 appearance-none rounded-[12px] border-0 bg-secondary pl-3 pr-10 font-sans text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-muted-foreground"

export type ChampSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Posé directement sur le fond gris de la page (recette de surface C). */
  surGris?: boolean
  /** Classe du conteneur (largeur, marges). */
  classeConteneur?: string
}

export const ChampSelect = React.forwardRef<HTMLSelectElement, ChampSelectProps>(
  ({ className, classeConteneur, surGris = false, children, ...props }, ref) => (
    <span className={cn("relative block", classeConteneur)}>
      <select ref={ref} className={cn(SELECT_CHAMP, surGris && "bg-secondary-fond dark:bg-secondary", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </span>
  ),
)
ChampSelect.displayName = "ChampSelect"
