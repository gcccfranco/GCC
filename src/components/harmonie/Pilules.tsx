"use client";

// Harmonie (lot 9) — une rangée de filtres en pilules, au style des onglets de
// section (lot 4) : neutres, l'actif en encre. La rangée défile
// horizontalement quand elle ne tient pas — douze sensations ne tiennent pas
// sur un téléphone.

import { cn } from "@/lib/utils";

export function Pilules<T extends string>({
  etiquette,
  options,
  valeur,
  choisir,
  obligatoire,
}: {
  /** Nom du groupe de filtres, lu par les lecteurs d'écran. */
  etiquette: string;
  options: { cle: T; nom: string }[];
  valeur: T | null;
  /** `null` = filtre retiré (retoucher la pilule active l'enlève). */
  choisir: (v: T | null) => void;
  /** Un choix est toujours actif (instrument) : on ne peut pas le retirer. */
  obligatoire?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={etiquette}
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const actif = valeur === o.cle;
        return (
          <button
            key={o.cle}
            type="button"
            aria-pressed={actif}
            onClick={() => choisir(actif && !obligatoire ? null : o.cle)}
            className={cn(
              "h-10 shrink-0 rounded-full px-3.5 text-[15px] transition-colors duration-150",
              actif ? "bg-foreground text-background font-semibold" : "bg-card text-muted-foreground active:bg-secondary",
            )}
          >
            {o.nom}
          </button>
        );
      })}
    </div>
  );
}
