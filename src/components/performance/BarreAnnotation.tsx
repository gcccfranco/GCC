"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Eraser, GripVertical, Highlighter, Pencil, ChevronLeft, ChevronRight, MoreHorizontal, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import type { StrokeTool } from "@/lib/annotations/strokes";
import { COLORS, SIZES } from "./AnnotationCanvas";

export type EtatTraits = "chargement" | "enregistre" | "en-attente";
export type DispositionBarre = "telephone" | "tablette" | "large";
type MenuId = "outils" | "gomme" | "plus";

/** Barre d'annotation attachée (AN-3a, forScore piste A) : elle prend la place de la barre de titre (`BarreHaut`) à partir de
 *  768 px, ou, au téléphone, se partage entre le haut (Annuler, Rétablir, pages, Terminé) et le bas (Outils, Gomme, ⋯).
 *  Aucune animation (AN-Q1). Icônes et Terminé à `--couleur-icones` ; l'outil actif a le fond plein de cette couleur. */
export function BarreAnnotation(p: {
  barreRef: RefObject<HTMLDivElement | null>;
  /** Téléphone seulement : la barre du bas, mesurée comme `BarreBas`. */
  barreBasRef: RefObject<HTMLDivElement | null>;
  showChrome: boolean;
  disposition: DispositionBarre;
  outil: StrokeTool;
  gomme: boolean;
  couleur: string;
  taille: number;
  tailleGomme: number;
  onOutil: (o: StrokeTool) => void;
  onGomme: (actif: boolean) => void;
  onCouleur: (c: string) => void;
  onTaille: (i: number) => void;
  onTailleGomme: (i: number) => void;
  onAnnuler: () => void;
  onRetablir: () => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  onPagePrec: () => void;
  onPageSuiv: () => void;
  peutPrec: boolean;
  peutSuiv: boolean;
  page: number;
  pages: number;
  zoom: number;
  onZoom: (delta: number) => void;
  onZoom100: () => void;
  onToutEffacer: () => void;
  onTermine: () => void;
  /** AN-2 : « le doigt ne dessine pas » (réglage par appareil). */
  doigtLibre: boolean;
  onDoigtLibre: (v: boolean) => void;
  etat: EtatTraits;
}) {
  const { t } = useTranslation();
  const { barreRef, barreBasRef } = p;
  const tel = p.disposition === "telephone";
  const [ouvert, setOuvert] = useState<MenuId | null>(null);
  // Un toucher hors du menu ouvert le ferme (les barres arrêtent les évènements React, d'où l'écouteur du document).
  useEffect(() => {
    if (!ouvert) return;
    const ferme = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest("[data-menu-annotation]")) setOuvert(null); };
    // Échap ferme d'abord le menu : marqué, il ne sort pas du Crayon (PerformanceMode ignore un Échap déjà consommé).
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setOuvert(null); } };
    document.addEventListener("pointerdown", ferme, true);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("pointerdown", ferme, true); document.removeEventListener("keydown", echap); };
  }, [ouvert]);
  const basculer = (m: MenuId) => setOuvert((o) => (o === m ? null : m));
  const dessous = tel ? "bottom-full mb-2" : "top-full mt-2";

  const IconeOutil = p.outil === "pen" ? Pencil : Highlighter;
  const annuler = (
    <Btn label={t("performance.tools.undo")} onClick={p.onAnnuler} disabled={!p.peutAnnuler} sousBulle>
      <Undo2 className="h-5 w-5" />
    </Btn>
  );
  const retablir = (
    <Btn label={t("performance.tools.redo")} onClick={p.onRetablir} disabled={!p.peutRetablir} sousBulle>
      <Redo2 className="h-5 w-5" />
    </Btn>
  );
  const precedent = (
    <Btn label={t("performance.tools.prevPage")} onClick={p.onPagePrec} disabled={!p.peutPrec} sousBulle>
      <ChevronLeft className="h-5 w-5" />
    </Btn>
  );
  const suivant = (
    <Btn label={t("performance.tools.nextPage")} onClick={p.onPageSuiv} disabled={!p.peutSuiv} sousBulle>
      <ChevronRight className="h-5 w-5" />
    </Btn>
  );
  const termine = (
    <button
      type="button"
      onClick={p.onTermine}
      className="flex h-11 min-w-11 items-center justify-center rounded-lg px-2.5 text-sm font-bold text-[color:var(--couleur-icones)] hover:bg-muted/60 active:bg-muted"
    >
      {t("performance.tools.done")}
    </button>
  );
  const etat = (
    <span data-etat-traits={p.etat} className="whitespace-nowrap px-1 text-xs text-muted-foreground">
      {t(`performance.tools.${p.etat === "chargement" ? "loading" : p.etat === "en-attente" ? "pending" : "saved"}`)}
    </span>
  );

  const menuOutils = (
    <div className="relative" data-menu-annotation>
      <Btn label={t("performance.tools.tools")} actif={!p.gomme} onClick={() => basculer("outils")} sousBulle={!tel} menuOuvert={ouvert === "outils"}>
        <IconeOutil className="h-5 w-5" />
        <span aria-hidden="true" data-pastille-couleur className="h-3 w-3 rounded-full border border-current" style={{ background: p.couleur }} />
      </Btn>
      {ouvert === "outils" && (
        <Popover className={`left-0 ${dessous}`}>
          <div className="flex gap-1">
            {(["pen", "highlighter"] as const).map((o) => {
              const I = o === "pen" ? Pencil : Highlighter;
              const actif = !p.gomme && p.outil === o;
              return (
                <button key={o} type="button" aria-pressed={actif} onClick={() => p.onOutil(o)} className={`flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm ${actif ? "bg-[color:var(--couleur-icones)] text-background" : "text-foreground hover:bg-muted"}`}>
                  <I className="h-5 w-5" />
                  {t(`performance.tools.${o === "pen" ? "pen" : "highlighter"}`)}
                </button>
              );
            })}
          </div>
          <Epaisseurs outil={p.outil} couleur={p.couleur} valeur={p.taille} onChoix={p.onTaille} />
          <div className="mt-1 flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                aria-pressed={p.couleur === c}
                onClick={() => p.onCouleur(c)}
                className="h-8 w-8 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: p.couleur === c ? "var(--couleur-icones)" : "hsl(var(--border))", boxShadow: c === "#ffffff" ? "inset 0 0 0 1px hsl(var(--border))" : undefined }}
              />
            ))}
          </div>
        </Popover>
      )}
    </div>
  );

  const menuGomme = (
    <div className="relative" data-menu-annotation>
      <Btn
        label={t("performance.tools.eraser")}
        actif={p.gomme}
        sousBulle={!tel}
        onClick={() => (p.gomme ? basculer("gomme") : (setOuvert(null), p.onGomme(true)))}
        menuOuvert={ouvert === "gomme"}
      >
        <Eraser className="h-5 w-5" />
      </Btn>
      {ouvert === "gomme" && (
        <Popover className={`left-0 ${dessous}`}>
          <Epaisseurs gomme etiquette={t("performance.tools.eraserSize")} valeur={p.tailleGomme} onChoix={p.onTailleGomme} />
        </Popover>
      )}
    </div>
  );

  const loupe = (
    <div data-loupe className="flex items-center">
      <Btn label={t("performance.tools.zoomOut")} onClick={() => p.onZoom(-1)} sousBulle={!tel}>
        <ZoomOut className="h-5 w-5" />
      </Btn>
      <button
        type="button"
        aria-label={t("performance.tools.resetZoom")}
        onClick={p.onZoom100}
        disabled={p.zoom === 1}
        className="h-11 min-w-11 rounded-lg px-1 text-xs font-semibold tabular-nums text-[color:var(--couleur-icones)] hover:bg-muted/60 disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {Math.round(p.zoom * 100)}%
      </button>
      <Btn label={t("performance.tools.zoomIn")} onClick={() => p.onZoom(1)} sousBulle={!tel}>
        <ZoomIn className="h-5 w-5" />
      </Btn>
    </div>
  );

  const apple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const menuPlus = (
    <div className="relative" data-menu-annotation>
      <Btn label={t("performance.tools.more")} onClick={() => basculer("plus")} sousBulle={!tel} menuOuvert={ouvert === "plus"}>
        <MoreHorizontal className="h-5 w-5" />
      </Btn>
      {ouvert === "plus" && (
        <Popover className={`${tel ? "left-0" : "right-0"} ${dessous} min-w-56`}>
          <button type="button" role="switch" aria-checked={p.doigtLibre} onClick={() => p.onDoigtLibre(!p.doigtLibre)} className="flex h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-sm text-foreground hover:bg-muted">
            {t("performance.tools.fingerFree")}
            <span aria-hidden="true" className={`flex h-5 w-9 items-center rounded-full p-0.5 ${p.doigtLibre ? "justify-end bg-[color:var(--couleur-icones)]" : "justify-start bg-muted-foreground/40"}`}>
              <span className="h-4 w-4 rounded-full bg-background" />
            </span>
          </button>
          {p.disposition !== "large" && (
            <Rubrique titre={t("performance.tools.loupe")}>{loupe}</Rubrique>
          )}
          {!tel && (
            <Rubrique titre={t("performance.tools.shortcuts")}>
              <ul className="space-y-0.5 px-1 text-sm">
                <li className="flex justify-between gap-4"><span>{t("performance.tools.undo")}</span><kbd className="font-mono text-xs text-muted-foreground">{apple ? "⌘Z" : "Ctrl+Z"}</kbd></li>
                <li className="flex justify-between gap-4"><span>{t("performance.tools.redo")}</span><kbd className="font-mono text-xs text-muted-foreground">{apple ? "⇧⌘Z" : "Ctrl+Y"}</kbd></li>
              </ul>
            </Rubrique>
          )}
          <button type="button" onClick={() => { setOuvert(null); p.onToutEffacer(); }} className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-sm text-destructive hover:bg-muted">
            <Trash2 className="h-5 w-5" />
            {t("performance.tools.clearAll")}…
          </button>
        </Popover>
      )}
    </div>
  );

  if (tel) {
    return (
      <>
        <div
          ref={barreRef}
          data-crayon-barre="haut"
          className={`absolute top-0 left-0 right-0 ${p.showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_1px_0_hsl(var(--border))] py-3 flex items-center justify-between gap-1`}
          style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", paddingLeft: "calc(0.5rem + var(--sal, 0px))", paddingRight: "calc(0.5rem + var(--sar, 0px))" }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-0.5">{annuler}{retablir}</div>
          <div className="flex items-center">
            {precedent}
            <span data-page-courte className="whitespace-nowrap px-1 text-sm font-semibold tabular-nums text-[color:var(--couleur-icones)]">
              {t("performance.tools.pageCourte", { n: p.page + 1, total: p.pages })}
            </span>
            {suivant}
          </div>
          {termine}
        </div>
        <div
          ref={barreBasRef}
          data-crayon-barre-bas
          className={`absolute bottom-0 left-0 right-0 ${p.showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_-1px_0_hsl(var(--border))] py-1 flex items-center gap-0.5`}
          style={{ paddingBottom: "calc(0.25rem + var(--sab, 0px))", paddingLeft: "calc(0.5rem + var(--sal, 0px))", paddingRight: "calc(0.5rem + var(--sar, 0px))" }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {menuOutils}
          {menuGomme}
          {menuPlus}
          <span className="ml-auto">{etat}</span>
        </div>
      </>
    );
  }

  return (
    <div
      ref={barreRef}
      data-crayon-barre="haut"
      className={`absolute top-0 left-0 right-0 ${p.showChrome ? "pointer-events-auto" : "pointer-events-none"} material-chrome material-steady shadow-[0_1px_0_hsl(var(--border))] py-3 [--marge-barre:1rem]`}
      style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", paddingLeft: "calc(var(--marge-barre) + var(--sal, 0px))", paddingRight: "calc(var(--marge-barre) + var(--sar, 0px))" }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-0.5">
        {/* Poignée : inerte jusqu'à AN-3b (barre détachable). */}
        <div aria-hidden="true" data-poignee className="flex h-11 w-11 items-center justify-center text-[color:var(--couleur-icones)]">
          <GripVertical className="h-5 w-5" />
        </div>
        {precedent}
        {suivant}
        {annuler}
        {retablir}
        <Separateur />
        {menuOutils}
        {menuGomme}
        {p.disposition === "large" && loupe}
        {menuPlus}
        <div className="ml-auto flex items-center gap-1">
          {etat}
          {termine}
        </div>
      </div>
    </div>
  );
}

const Separateur = () => <div aria-hidden="true" className="mx-1 h-6 w-px bg-border" />;

function Popover({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div className={`absolute z-30 flex flex-col gap-1 rounded-xl p-2 material-panel [box-shadow:var(--shadow-flottant)] ${className}`}>
      {children}
    </div>
  );
}

const Rubrique = ({ titre, children }: { titre: string; children: ReactNode }) => (
  <div className="mb-1">
    <p className="px-1 pb-0.5 text-xs font-semibold text-muted-foreground">{titre}</p>
    {children}
  </div>
);

/** Les trois épaisseurs d'un outil (barre à l'épaisseur réelle du trait, plafonnée) ou de la gomme (disque à son diamètre, plafonné). */
function Epaisseurs({ outil, gomme = false, couleur, etiquette, valeur, onChoix }: { outil?: StrokeTool; gomme?: boolean; couleur?: string; etiquette?: string; valeur: number; onChoix: (i: number) => void }) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={etiquette} className="flex gap-1">
      {([0, 1, 2] as const).map((i) => {
        const taille = gomme ? Math.min(SIZES.eraser[i], 30) : Math.min(SIZES[outil!][i], 14 + i * 4);
        return (
          <button
            key={i}
            type="button"
            aria-label={[t("performance.tools.small"), t("performance.tools.medium"), t("performance.tools.large")][i]}
            aria-pressed={valeur === i}
            onClick={() => onChoix(i)}
            className={`flex h-9 w-11 items-center justify-center rounded-lg ${valeur === i ? "bg-[color-mix(in_srgb,var(--couleur-icones)_16%,transparent)]" : "hover:bg-muted"}`}
          >
            <span
              className="rounded-full"
              style={{
                width: gomme ? taille : 24,
                height: gomme ? taille : taille,
                background: gomme ? "hsl(var(--muted-foreground))" : couleur,
                opacity: outil === "highlighter" ? 0.35 : 1,
                boxShadow: !gomme && couleur === "#ffffff" ? "inset 0 0 0 1px hsl(var(--border))" : undefined,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Bouton à icône : `aria-label` plutôt que `title`, et une bulle d'aide au survol souris (400 ms) ou à l'appui long
 *  au doigt ou au stylet (500 ms, le clic du lâcher est alors ignoré). `sousBulle` : bulle sous le bouton, sinon au-dessus. */
function Btn({ label, actif = false, disabled = false, menuOuvert, sousBulle, onClick, children }: {
  label: string;
  actif?: boolean;
  disabled?: boolean;
  menuOuvert?: boolean;
  sousBulle: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const [bulle, setBulle] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout>>(undefined);
  const appuiLong = useRef(false);
  const armer = (ms: number) => { clearTimeout(minuterie.current); minuterie.current = setTimeout(() => setBulle(true), ms); };
  const effacer = () => { clearTimeout(minuterie.current); setBulle(false); };
  useEffect(() => () => clearTimeout(minuterie.current), []);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-haspopup={menuOuvert !== undefined ? "true" : undefined}
        aria-expanded={menuOuvert}
        disabled={disabled}
        onClick={(e) => {
          if (appuiLong.current) { appuiLong.current = false; e.preventDefault(); return; }
          onClick();
        }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") armer(400); }}
        onPointerLeave={effacer}
        onPointerDown={(e) => {
          appuiLong.current = false;
          if (e.pointerType === "mouse") { clearTimeout(minuterie.current); setBulle(false); return; }
          clearTimeout(minuterie.current);
          minuterie.current = setTimeout(() => { appuiLong.current = true; setBulle(true); }, 500);
        }}
        onPointerUp={() => { clearTimeout(minuterie.current); if (appuiLong.current) minuterie.current = setTimeout(effacer, 1500); }}
        onPointerCancel={effacer}
        className={`flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2.5 disabled:opacity-40 ${
          actif ? "bg-[color:var(--couleur-icones)] text-background" : `text-[color:var(--couleur-icones)] ${disabled ? "" : "hover:bg-muted/60 active:bg-muted"}`
        }`}
      >
        {children}
      </button>
      {bulle && (
        <span role="tooltip" data-bulle className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background ${sousBulle ? "top-full mt-1" : "bottom-full mb-1"}`}>
          {label}
        </span>
      )}
    </span>
  );
}
