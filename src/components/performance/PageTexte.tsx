"use client";

import type { ReactNode, RefObject } from "react";
import type { CSSProperties } from "react";
import { IndiceRappel } from "./IndiceRappel";
import type { PerfPage } from "@/lib/performance/columns";
import type { PartitionLayout } from "@/lib/partitionLayoutPref";
import type { SectionOccurrence } from "@/lib/setlist/sectionSteps";

/** Page de texte (sections, hors scan 简谱) : rappel de structure, en-tête hors
 *  échelle, corps mis à l'échelle, aperçu de la page suivante. `rappelRef` et
 *  `scaledBodyRef` sont les refs de mesure lues par PerformanceMode ;
 *  `renderBlock` rend un bloc (BlockRenderer, fermé sur l'état du mode) ;
 *  `rappelTrame` rend la rangée de rappel (RappelRangee). */
export function PageTexte({
  page,
  rappel,
  rappelRef,
  rappelTrame,
  affichageVu,
  currentPage,
  scaledBodyRef,
  renderBlock,
  apercu,
  apercuHauteur,
  contentPadding,
}: {
  page: PerfPage;
  rappel: SectionOccurrence[] | undefined;
  rappelRef: RefObject<HTMLDivElement | null>;
  rappelTrame: ReactNode;
  affichageVu: PartitionLayout;
  currentPage: number;
  scaledBodyRef: RefObject<HTMLDivElement | null>;
  renderBlock: (i: number) => ReactNode;
  apercu: PerfPage | null;
  apercuHauteur: number;
  contentPadding: CSSProperties;
}) {
  const multiCol = page.cols.length > 1;
  return (
    <>
    <div>
      {rappel && (
        <div ref={rappelRef} data-rappel className="relative mb-2">
          {rappelTrame}
          {(affichageVu === "played" || affichageVu === "unique") && <IndiceRappel mode={affichageVu} page={currentPage} />}
        </div>
      )}
      {/* En-tête hors échelle, en pleine largeur : vue structure et
          première page d'un chant en deux colonnes. */}
      {page.header != null && renderBlock(page.header)}
      {/* Mise à l'échelle d'une page (réduction si elle déborde, agrandissement
          en vue structure) : transform + largeur compensée, comme le
          conteneur parent (jamais `zoom` — arrondis de mise en page non
          déterministes, cf. commentaire du conteneur). */}
      <div
        ref={scaledBodyRef}
        style={
          page.scale !== 1
            ? {
                transform: `scale(${page.scale})`,
                transformOrigin: "top left",
                width: `${100 / page.scale}%`,
              }
            : undefined
        }
      >
        {/* Deux colonnes : gouttière de 2rem, celle de la mesure en colonne. */}
        <div className={multiCol ? `flex items-start ${page.twoColumns ? "gap-x-8" : "gap-x-4"}` : undefined}>
          {page.cols.map((colIdxs, ci) => (
            <div key={ci} className={multiCol ? "flex-1 min-w-0" : undefined}>
              {colIdxs.map((i) => renderBlock(i))}
            </div>
          ))}
        </div>
      </div>
    </div>
    {apercu && (
      <div
        data-apercu-suivant
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0"
        style={{ bottom: contentPadding.paddingBottom, paddingLeft: contentPadding.paddingLeft, paddingRight: contentPadding.paddingRight }}
      >
        <div className="relative overflow-hidden" style={{ height: apercuHauteur }}>
          <div className="h-0.5 bg-primary/70" />
          {apercu.header != null && renderBlock(apercu.header)}
          {apercu.cols.flat().map((i) => renderBlock(i))}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    )}
    </>
  );
}
