"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import type { CSSProperties } from "react";
import { useEchelleFeuille } from "./FeuilleDeRoute";
import { IndiceRappel } from "./IndiceRappel";
import type { PerfPage } from "@/lib/performance/columns";
import { NEXT_PILL_RESERVE } from "@/lib/performance/pagination";
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
  showChrome,
  pastille,
  sansIndice = false,
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
  /** Barres affichées : l'aperçu s'efface (pas d'aperçu pendant qu'on règle quelque chose). */
  showChrome: boolean;
  /** Pastille « Ensuite » : rendue à la fin de la colonne `page.suivant`, dans le flux. */
  pastille?: ReactNode;
  /** Calques de la demi-page (FS-E) : pas d'indice du rappel (il appartient à la page lue). */
  sansIndice?: boolean;
}) {
  const multiCol = page.cols.length > 1;
  // Vue structure : le contenu des lignes grossit avec la place libre (`--fdr-echelle` sur la colonne).
  const lignesRef = useRef<HTMLDivElement>(null);
  useEchelleFeuille(lignesRef, !!page.etire, page.naturel, page);
  return (
    <>
    <div className={page.etire ? "flex h-full flex-col" : undefined} data-page-deux-colonnes={page.twoColumns || undefined}>
      {rappel && (
        <div ref={rappelRef} data-rappel className="relative mb-2">
          {rappelTrame}
          {!sansIndice && (affichageVu === "played" || affichageVu === "unique") && <IndiceRappel mode={affichageVu} page={currentPage} />}
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
        className={page.etire ? "flex min-h-0 flex-1 flex-col" : undefined}
        style={
          page.etire
            ? { paddingBottom: NEXT_PILL_RESERVE }
            : page.scale !== 1
            ? {
                transform: `scale(${page.scale})`,
                transformOrigin: "top left",
                width: `${100 / page.scale}%`,
              }
            : undefined
        }
      >
        {/* Deux colonnes : gouttière de 2rem, celle de la mesure en colonne. */}
        <div className={multiCol ? `flex items-start ${page.twoColumns ? "gap-x-8" : "gap-x-4"}` : page.etire ? "flex min-h-0 flex-1 flex-col" : undefined}>
          {page.cols.map((colIdxs, ci) => (
            <div key={ci} data-col-page ref={page.etire ? lignesRef : undefined} className={multiCol ? "flex-1 min-w-0" : page.etire ? "flex min-h-0 flex-1 flex-col" : undefined}>
              {colIdxs.map((i) => renderBlock(i))}
              {pastille && page.suivant === ci && <div className="mt-4 flex">{pastille}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
    {apercu && (
      <div
        data-apercu-suivant
        aria-hidden="true"
        data-chrome={showChrome ? "1" : "0"}
        className={`pointer-events-none absolute left-0 right-0 ease-out motion-reduce:transition-none ${showChrome ? "opacity-0 transition-opacity duration-100" : "opacity-100 transition-opacity duration-150"}`}
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
