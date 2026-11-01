"use client";

import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, ListMusic, PenLine, Settings, X } from "lucide-react";
import { CurseurPage } from "@/components/performance/CurseurPage";

/** Barre du bas du mode louange : curseur de page, sommaire, réglages,
 *  annotation, flèches, sortie. `barreRef` est la ref de mesure lue par
 *  PerformanceMode. `onAnnoter` absent = bouton « Annoter » masqué. */
export function BarreBas({
  barreRef,
  showChrome,
  pageCount,
  currentPage,
  reperesChants,
  goToPage,
  settingsOpen,
  annotateMode,
  onAnnoter,
  onSommaire,
  onReglages,
  onQuitter,
}: {
  barreRef: RefObject<HTMLDivElement | null>;
  showChrome: boolean;
  pageCount: number;
  currentPage: number;
  reperesChants: { page: number; titre: string }[];
  goToPage: (p: number, pgCount: number) => void;
  settingsOpen: boolean;
  annotateMode: boolean;
  onAnnoter: (() => void) | undefined;
  onSommaire: () => void;
  onReglages: () => void;
  onQuitter: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      ref={barreRef}
      className={`absolute bottom-0 left-0 right-0 ${showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_-1px_0_hsl(var(--border))] px-3 py-2.5 flex items-center gap-1.5 flex-wrap`}
      style={{
        paddingBottom: "calc(0.625rem + var(--sab, 0px))",
        paddingLeft: "calc(0.75rem + var(--sal, 0px))",
        paddingRight: "calc(0.75rem + var(--sar, 0px))",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Curseur de page sur toute la setlist (L7) */}
      {pageCount > 1 && (
        <CurseurPage
          total={pageCount}
          courante={currentPage}
          reperes={reperesChants}
          libelle={t("performance.pageSlider")}
          texteValeur={t("performance.pageSliderValue", { n: currentPage + 1, total: pageCount })}
          onAller={(p) => goToPage(p, pageCount)}
        />
      )}

      {/* Sommaire des chants */}
      <IconBtn label={t("performance.songList")} onClick={onSommaire}>
        <ListMusic className="h-5 w-5" />
      </IconBtn>

      {/* Réglages */}
      <IconBtn label={t("performance.settings")} active={settingsOpen} onClick={onReglages}>
        <Settings className="h-5 w-5" />
      </IconBtn>

      {/* Annoter (connecté uniquement) */}
      {onAnnoter && (
        <IconBtn
          label={t("performance.annotate")}
          active={annotateMode}
          accent="amber"
          onClick={onAnnoter}
        >
          <PenLine className="h-5 w-5" />
        </IconBtn>
      )}

      {/* Spacer + navigation arrows */}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => goToPage(currentPage - 1, pageCount)}
          disabled={currentPage === 0}
          className="h-11 w-11 flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-30 hover:text-foreground active:bg-muted"
          aria-label={t("performance.prevPage")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => goToPage(currentPage + 1, pageCount)}
          disabled={currentPage >= pageCount - 1}
          className="h-11 w-11 flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-30 hover:text-foreground active:bg-muted"
          aria-label={t("performance.nextPage")}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Quitter */}
      <IconBtn label={t("performance.exit")} onClick={onQuitter}>
        <X className="h-5 w-5" />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  active = false,
  accent = "primary",
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  accent?: "primary" | "amber";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClass =
    accent === "amber"
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent"
      : "bg-secondary text-foreground border-transparent";

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`h-11 w-11 flex items-center justify-center rounded-lg border transition-colors active:bg-muted ${
        active ? activeClass : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
