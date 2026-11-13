"use client";

import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { CurseurPage } from "@/components/performance/CurseurPage";

/** Barre du bas du mode louange (FS-A) : seulement la rangée de points, un point par page de toute la
 *  setlist. `barreRef` est la ref de mesure lue par PerformanceMode. */
export function BarreBas({
  barreRef,
  showChrome,
  pageCount,
  currentPage,
  reperesChants,
  goToPage,
}: {
  barreRef: RefObject<HTMLDivElement | null>;
  showChrome: boolean;
  pageCount: number;
  currentPage: number;
  reperesChants: { page: number; titre: string }[];
  goToPage: (p: number, pgCount: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={barreRef}
      data-barre-bas
      className={`absolute bottom-0 left-0 right-0 ${showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_-1px_0_hsl(var(--border))] py-1 [--marge-barre:0.75rem] md:[--marge-barre:1.5rem]`}
      style={{
        paddingBottom: "calc(0.25rem + var(--sab, 0px))",
        paddingLeft: "calc(var(--marge-barre) + var(--sal, 0px))",
        paddingRight: "calc(var(--marge-barre) + var(--sar, 0px))",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {pageCount > 1 && (
        <CurseurPage
          total={pageCount}
          courante={currentPage}
          reperes={reperesChants}
          libelle={t("performance.pageSlider")}
          texteValeur={t("performance.pageSliderValue", { n: currentPage + 1, total: pageCount })}
          pageVignette={(n) => t("performance.pagePoint", { n })}
          onAller={(p) => goToPage(p, pageCount)}
        />
      )}
    </div>
  );
}
