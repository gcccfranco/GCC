"use client";

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StructureStrip } from "@/components/song/SongView";
import type { JianpuSheetBlock, PerformanceBlock, SongHeaderBlock } from "@/lib/performance/blocks";
import { sansTransitions } from "@/lib/performance/pagination";
import { langAccent } from "./langAccent";

/** Page 简谱 : en-tête d'une ligne et bandeau de structure en haut, scan
 *  (`children`, déjà rendu par PerformanceMode) à l'échelle de la hauteur qui
 *  reste. Pas de pagination — un scan ne se coupe pas en deux. L'en-tête
 *  complet du chant n'est pas rendu : ses 200 px devenaient des marges
 *  blanches sur les côtés (la page est contrainte par sa hauteur) ; une ligne
 *  remplace le titre gravé, coupé depuis L3-T2b (K3). Le bandeau reprend ce que
 *  le scan ne peut pas savoir : l'ordre des sections voulu pour ce dimanche.
 *  Les pastilles du site (D14), avec notes et transitions sur chaque page de
 *  scan : le scan ne peut pas les porter (O8). */
export function PageScan({
  sheet,
  showTransitions,
  colonneScan,
  isLastPageOfSong,
  nextEntry,
  onSuivant,
  reserveBas = 0,
  children,
}: {
  sheet: PerformanceBlock | undefined;
  showTransitions: boolean;
  colonneScan: boolean;
  isLastPageOfSong: boolean;
  nextEntry: { block: SongHeaderBlock; index: number } | undefined;
  onSuivant: () => void;
  /** Hauteur (px de la page) gardée sous le scan pour la pastille « Ensuite » flottante : elle ne recouvre pas le scan. */
  reserveBas?: number;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const enTete: JianpuSheetBlock | null = sheet?.kind === "jianpu-sheet" ? sheet : null;
  const rond = enTete && (
    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">
      {enTete.position}
    </span>
  );
  const tempo = enTete?.tempo ? (
    <span className="shrink-0 flex items-baseline gap-1 text-xs font-medium text-muted-foreground">
      <span className="text-foreground/70 text-[15px] leading-none">♩</span>{enTete.tempo}
    </span>
  ) : null;
  // Place comptée (téléphone, A+) : « setlist : X » se tronque avant le titre.
  const tonalite = enTete && (
    <span className={`${colonneScan ? "flex-wrap " : "ml-auto "}flex min-w-0 items-center gap-1.5`}>
      {enTete.capo ? (
        <span className="shrink-0 text-xs font-bold font-mono border-2 border-border rounded-full px-2.5 py-0.5 text-muted-foreground">
          {t("performance.capoBadge", { n: enTete.capo })}
        </span>
      ) : null}
      <span className="shrink-0 text-sm font-bold font-mono border-2 rounded-full px-2.5 py-0.5"
        style={{ color: langAccent("zh"), borderColor: langAccent("zh") }}>
        {enTete.songKey}
      </span>
      {enTete.setlistKey && (
        <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">
          {t("performance.personalKey", { key: enTete.setlistKey })}
        </span>
      )}
    </span>
  );
  const bandeauScan = enTete && (
    <StructureStrip
      steps={sansTransitions(enTete.steps, showTransitions)}
      details
      colonne={colonneScan}
      className={colonneScan ? "" : "mb-1.5"}
    />
  );
  // Paysage sur grand écran : l'en-tête et le bandeau passent dans une
  // colonne de la marge gauche, « Ensuite » en bas ; le scan, seul à
  // droite, prend toute la hauteur entre les barres.
  if (colonneScan) {
    return (
      <div className="flex h-full gap-6">
        <div data-colonne-scan className="flex h-full w-[200px] shrink-0 flex-col pl-5 pt-1">
          {enTete && (
            <>
              <div data-entete-scan className="mb-4">
                <div className="flex items-start gap-2">
                  <span className="mt-1">{rond}</span>
                  <h2 className="min-w-0 break-words text-[22px] font-bold text-foreground leading-tight uppercase tracking-tight">
                    {enTete.songTitle}
                  </h2>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7">
                  {tempo}
                  {tonalite}
                </div>
              </div>
              {/* Une structure longue défile seule : « Ensuite » reste en bas. */}
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{bandeauScan}</div>
            </>
          )}
          {isLastPageOfSong && nextEntry && (
            <div className="mt-auto shrink-0 pt-4 pb-1">
              <button
                type="button"
                data-suivant
                onClick={onSuivant}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                className="pointer-events-auto min-h-11 w-full rounded-xl border border-border/60 bg-background/85 px-3 py-2 text-left text-sm text-muted-foreground backdrop-blur"
              >
                {t("performance.next")}{" "}
                <span className="font-semibold text-foreground">{nextEntry.block.title}</span>
                {" · "}
                <span className="font-mono">{nextEntry.block.songKey}</span>
              </button>
            </div>
          )}
        </div>
        <div className="h-full min-w-0 flex-1">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      {enTete && (
        // Retrait des autres pages (px-6) : la page de scan n'a que 0,25rem de marge.
        <div className="shrink-0 px-5">
          {/* En-tête du chant sur une ligne (K3) : le titre gravé est coupé. */}
          <div data-entete-scan className="mb-2 flex items-center gap-2 [[data-barre-ouverte]_&]:invisible [[data-barre-ouverte]_&]:opacity-0 transition-[opacity,visibility] duration-150">
            {rond}
            <h2 className="min-w-[3em] truncate text-[22px] font-bold text-foreground leading-tight uppercase tracking-tight">
              {enTete.songTitle}
            </h2>
            {tempo}
            {tonalite}
          </div>
          {bandeauScan}
        </div>
      )}
      <div className="min-h-0 flex-1" style={reserveBas ? { paddingBottom: reserveBas } : undefined}>{children}</div>
    </div>
  );
}
