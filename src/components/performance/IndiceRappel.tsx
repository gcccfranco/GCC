"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Indice du rappel (lot RS-D, décision D6) : une bulle sous la rangée, la 1re fois qu'un rappel
 * s'affiche, une clé par mode. Posée par-dessus la page (aucune place dans la pagination) ; elle
 * part à la page suivante ou d'un toucher sur elle, et ne retient aucun geste de page.
 */
export function IndiceRappel({ mode, page }: { mode: "played" | "unique"; page: number }) {
  const { t } = useTranslation();
  const [pageVue, setPageVue] = useState<number | null>(null);
  const cle = mode === "played" ? "perf-astuce-rappel-joue" : "perf-astuce-rappel-unique";

  useEffect(() => {
    try {
      if (localStorage.getItem(cle)) return;
      localStorage.setItem(cle, "1");
    } catch {
      return;
    }
    setPageVue(page);
    // Une seule fois par appareil : la page de la première apparition suffit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  // Changement de page : la bulle part pour de bon (elle ne revient pas en revenant sur la page).
  if (pageVue !== null && pageVue !== page) setPageVue(null);
  if (pageVue !== page) return null;
  return (
    <div
      data-indice-rappel
      role="note"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPageVue(null);
      }}
      className="material-panel pointer-events-auto absolute left-0 top-full z-20 mt-1 max-w-full rounded-xl border border-border/60 bg-background/85 px-3 py-1.5 text-[13px] leading-snug text-foreground shadow-soft backdrop-blur"
    >
      {t(mode === "played" ? "performance.indiceRappelJoue" : "performance.indiceRappelUnique")}
    </div>
  );
}
