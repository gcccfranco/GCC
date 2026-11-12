"use client";

import { useTranslation } from "react-i18next";
import { TOUCHER_44 } from "@/lib/toucher44";

export type CibleCrayon = "accord" | "paroles";

/** Barre basse du Crayon (docs/spec-ma-partition.md, « Le Crayon ») : Accord · Paroles · Ordre · Terminé. Fixe, opaque,
 *  sans mouvement au-delà d'un fondu de 120 ms (aucun sous `prefers-reduced-motion`). « Ordre » absent : la page n'a pas
 *  d'éditeur de structure. Le Trait arrive en MP-5. */
export function BarreCrayon({ cible, onCible, onOrdre, onTermine, deuxVolets }: {
  cible: CibleCrayon;
  onCible: (c: CibleCrayon) => void;
  onOrdre?: () => void;
  onTermine: () => void;
  /** Sans barre d'onglets en bas (ordinateur, tablette en paysage) : la barre se pose au bord de la fenêtre. */
  deuxVolets: boolean;
}) {
  const { t } = useTranslation();
  const bouton = `${TOUCHER_44} h-9 rounded-full px-4 text-sm font-semibold transition-colors`;
  const choix = (c: CibleCrayon) => (
    <button
      type="button"
      aria-pressed={cible === c}
      onClick={() => onCible(c)}
      className={`${bouton} ${cible === c ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
    >
      {t(`maPartition.crayon.${c}`)}
    </button>
  );
  return (
    <div
      role="toolbar"
      aria-label={t("maPartition.crayon.barre")}
      data-barre-crayon
      className={`print:hidden fixed z-30 flex items-center justify-center gap-2 border-t border-border bg-background px-3 py-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-[120ms] ${
        deuxVolets ? "inset-x-0 bottom-0 left-[var(--barre-laterale)]" : "inset-x-0 bottom-0 pb-[calc(var(--tabbar-bottom)+78px+8px)]"
      }`}
    >
      {choix("accord")}
      {choix("paroles")}
      {onOrdre && (
        <button type="button" onClick={onOrdre} className={`${bouton} bg-secondary text-muted-foreground hover:text-foreground`}>
          {t("maPartition.crayon.ordre")}
        </button>
      )}
      <button type="button" onClick={onTermine} className={`${bouton} border border-border bg-background text-foreground hover:bg-secondary`}>
        {t("maPartition.crayon.termine")}
      </button>
    </div>
  );
}
