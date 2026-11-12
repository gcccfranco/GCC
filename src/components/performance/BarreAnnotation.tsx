"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PointerReact, type ReactNode, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Check, CloudOff, Eraser, GripVertical, Highlighter, Pencil, ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Redo2, Trash2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import type { StrokeTool } from "@/lib/annotations/strokes";
import { COLORS, SIZES } from "./AnnotationCanvas";
import { accrocheSuivante, lirePosition, normaliser, placerBarre, poserBarre, type PositionBarre, type Zone } from "@/lib/performance/barreAnnotation";

export type EtatTraits = "chargement" | "enregistre" | "en-attente";
export type DispositionBarre = "telephone" | "tablette" | "large";
type MenuId = "outils" | "gomme" | "plus";
const CLE_POSITION = "annot-barre-position";

/** Zone permise : l'écran moins les marges sûres et 8 px ; au téléphone, sous la barre du haut (sa hauteur mesurée) ;
 *  sur tablette et ordinateur, au-dessus de la barre du bas (page) que `barreBasRef` désigne alors. */
function mesurerZone(ancre: HTMLElement | null, tel: boolean, hauteurBas: number): Zone {
  const sonde = document.createElement("div");
  sonde.style.cssText = "position:fixed;visibility:hidden;padding:var(--sat,0px) var(--sar,0px) var(--sab,0px) var(--sal,0px)";
  (ancre ?? document.body).appendChild(sonde);
  const c = getComputedStyle(sonde);
  const [t, r, b, l] = [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].map((v) => parseFloat(v) || 0);
  sonde.remove();
  return { left: l + 8, top: (tel ? ancre?.offsetHeight ?? 0 : t) + 8, right: window.innerWidth - r - 8, bottom: window.innerHeight - (tel ? b : Math.max(b, hauteurBas)) - 8 };
}

/** Barre d'annotation (forScore piste A). AN-3a, attachée : elle prend la place de la barre de titre (`BarreHaut`) à partir
 *  de 768 px, ou, au téléphone, se partage entre le haut (Annuler, Rétablir, pages, Terminé, toujours fixe) et le bas
 *  (Outils, Gomme, ⋯). AN-3b, détachable : la poignée la glisse (suivi 1:1) ; au lâcher elle s'accroche à un bord (en colonne
 *  contre un bord latéral) ou reste libre ; attachée = haut (tablette, ordinateur) ou bas (téléphone). Détachée, son ancienne
 *  place reste une bande vide de même hauteur (`barreRef` / `barreBasRef`), pour que la mise en page ne bouge pas.
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

  // AN-3b : position retenue par appareil, zone permise, taille mesurée de la barre détachée.
  const [position, setPosition] = useState<PositionBarre>(() => {
    try { return lirePosition(localStorage.getItem(CLE_POSITION)); } catch { return { accroche: "attachee" }; }
  });
  const [glisse, setGlisse] = useState<{ left: number; top: number; colonne: boolean } | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [taille, setTaille] = useState({ largeur: 0, hauteur: 0 });
  const [rotation, rafraichir] = useState(0);
  const flottRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<Zone | null>(null);
  const attachee = !glisse && position.accroche === "attachee";
  // Zone : à l'ouverture, à la rotation et au redimensionnement seulement.
  useLayoutEffect(() => {
    const z = mesurerZone(barreRef.current, tel, barreBasRef.current?.offsetHeight ?? 0);
    setZone((o) => (o && o.left === z.left && o.top === z.top && o.right === z.right && o.bottom === z.bottom ? o : z));
  }, [barreRef, barreBasRef, tel, rotation]);
  useLayoutEffect(() => { zoneRef.current = zone; });
  useEffect(() => {
    const f = () => rafraichir((n) => n + 1);
    window.addEventListener("resize", f);
    return () => window.removeEventListener("resize", f);
  }, []);
  // Taille de la capsule : mesurée dès qu'elle est montée, puis à chaque changement (colonne, texte d'état).
  useLayoutEffect(() => {
    const el = flottRef.current;
    if (!el) return;
    const mesurer = () => setTaille((o) => (o.largeur === el.offsetWidth && o.hauteur === el.offsetHeight ? o : { largeur: el.offsetWidth, hauteur: el.offsetHeight }));
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, [attachee, tel]); // `tel` : la capsule est un autre nœud d'une disposition à l'autre
  const poser = (pos: PositionBarre) => {
    setPosition(pos);
    try { localStorage.setItem(CLE_POSITION, JSON.stringify(pos)); } catch { /* stockage refusé : position pour la séance seulement */ }
  };
  const place = zone && !attachee ? placerBarre(position, taille, zone) : null;
  const lieu = glisse ?? place ?? { left: 0, top: 0, colonne: false };
  const colonne = lieu.colonne;
  const aDroite = !!zone && lieu.left + taille.largeur / 2 > (zone.left + zone.right) / 2;
  const enBas = !!zone && lieu.top + taille.hauteur / 2 > (zone.top + zone.bottom) / 2;
  const sous = attachee ? undefined : !enBas;
  const accAffichee = glisse ? "libre" : position.accroche;
  const glisser = (e: PointerReact<HTMLElement>) => {
    if (!e.isPrimary || e.button !== 0) return;
    // Capture sur la bande d'origine, nœud stable : la poignée se démonte quand la barre se détache.
    try { (tel ? barreBasRef : barreRef).current?.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    const r = flottRef.current?.getBoundingClientRect();
    // Attachée, la capsule apparaît sous le pointeur, poignée au centre de son coin (4 px + 22 px).
    const g = { x0: e.clientX, y0: e.clientY, offX: r ? e.clientX - r.left : 26, offY: r ? e.clientY - r.top : 26, actif: false, detachee: !attachee, colonne: r ? colonne : false, dernier: { left: 0, top: 0 }, hist: [] as { t: number; x: number; y: number }[] };
    const fin = () => { window.removeEventListener("pointermove", bouge); window.removeEventListener("pointerup", leve); window.removeEventListener("pointercancel", annule); };
    const bouge = (m: PointerEvent) => {
      if (!g.actif && Math.hypot(m.clientX - g.x0, m.clientY - g.y0) < 6) return;
      g.actif = true;
      const z = zoneRef.current;
      const c = flottRef.current;
      const [w, h] = c ? [c.offsetWidth, c.offsetHeight] : [0, 0];
      const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), Math.max(a, b));
      g.dernier = z ? { left: clamp(m.clientX - g.offX, z.left, z.right - w), top: clamp(m.clientY - g.offY, z.top, z.bottom - h) } : { left: m.clientX - g.offX, top: m.clientY - g.offY };
      const t = performance.now();
      g.hist = [...g.hist, { t, x: m.clientX, y: m.clientY }].filter((p) => t - p.t <= 80);
      setGlisse({ ...g.dernier, colonne: g.colonne });
    };
    const leve = () => {
      const z = zoneRef.current;
      const c = flottRef.current;
      if (g.actif && z && c) {
        const t = performance.now();
        const h = g.hist.filter((p) => t - p.t <= 80);
        const dt = h.length > 1 ? h[h.length - 1].t - h[0].t : 0;
        const v = dt > 0 ? { x: (h[h.length - 1].x - h[0].x) / dt, y: (h[h.length - 1].y - h[0].y) / dt } : { x: 0, y: 0 };
        const b = c.getBoundingClientRect(); // la boîte réelle de la capsule
        poser(normaliser(poserBarre({ left: b.left, top: b.top, width: b.width, height: b.height }, z, v), tel));
      } else if (!g.actif && g.detachee) poser({ accroche: "attachee" }); // un toucher simple rattache
      setGlisse(null);
      fin();
    };
    const annule = () => { setGlisse(null); fin(); };
    window.addEventListener("pointermove", bouge);
    window.addEventListener("pointerup", leve);
    window.addEventListener("pointercancel", annule);
  };
  const dessous = tel ? "bottom-full mb-2" : "top-full mt-2";
  // Popover : vers l'intérieur de l'écran quand la barre est détachée.
  const pop = (cote: "g" | "d") =>
    attachee ? `${cote === "d" && !tel ? "right-0" : "left-0"} ${dessous}`
    : colonne ? `${aDroite ? "right-full mr-2" : "left-full ml-2"} ${enBas ? "bottom-0" : "top-0"}`
    : `${enBas ? "bottom-full mb-2" : "top-full mt-2"} ${aDroite ? "right-0" : "left-0"}`;

  const IconeOutil = p.outil === "pen" ? Pencil : Highlighter;
  const annuler = (
    <Btn label={t("performance.tools.undo")} onClick={p.onAnnuler} disabled={!p.peutAnnuler} sousBulle={sous ?? true}>
      <Undo2 className="h-5 w-5" />
    </Btn>
  );
  const retablir = (
    <Btn label={t("performance.tools.redo")} onClick={p.onRetablir} disabled={!p.peutRetablir} sousBulle={sous ?? true}>
      <Redo2 className="h-5 w-5" />
    </Btn>
  );
  const precedent = (
    <Btn label={t("performance.tools.prevPage")} onClick={p.onPagePrec} disabled={!p.peutPrec} sousBulle={sous ?? true}>
      <ChevronLeft className="h-5 w-5" />
    </Btn>
  );
  const suivant = (
    <Btn label={t("performance.tools.nextPage")} onClick={p.onPageSuiv} disabled={!p.peutSuiv} sousBulle={sous ?? true}>
      <ChevronRight className="h-5 w-5" />
    </Btn>
  );
  const termine = (
    <button
      type="button"
      onClick={p.onTermine}
      className={`flex h-11 min-w-11 items-center justify-center rounded-lg font-bold text-[color:var(--couleur-icones)] hover:bg-muted/60 active:bg-muted ${colonne ? "px-0 text-[11px]" : "px-2.5 text-sm"}`}
    >
      {t("performance.tools.done")}
    </button>
  );
  const texteEtat = t(`performance.tools.${p.etat === "chargement" ? "loading" : p.etat === "en-attente" ? "pending" : "saved"}`);
  const IconeEtat = p.etat === "chargement" ? Loader2 : p.etat === "en-attente" ? CloudOff : Check;
  // En colonne : une icône seule (le texte ne tient pas dans 52 px), le texte reste lisible pour les lecteurs d'écran.
  const etat = colonne ? (
    <span data-etat-traits={p.etat} title={texteEtat} className="flex h-5 w-5 items-center justify-center text-muted-foreground">
      <IconeEtat aria-hidden="true" className="h-5 w-5" />
      <span className="sr-only">{texteEtat}</span>
    </span>
  ) : (
    <span data-etat-traits={p.etat} className="whitespace-nowrap px-1 text-xs text-muted-foreground">{texteEtat}</span>
  );

  const menuOutils = (
    <div className="relative" data-menu-annotation>
      <Btn label={t("performance.tools.tools")} actif={!p.gomme} onClick={() => basculer("outils")} sousBulle={sous ?? !tel} menuOuvert={ouvert === "outils"}>
        <IconeOutil className="h-5 w-5" />
        <span aria-hidden="true" data-pastille-couleur className={`rounded-full border border-current ${colonne ? "absolute bottom-1.5 right-1.5 h-2.5 w-2.5" : "h-3 w-3"}`} style={{ background: p.couleur }} />
      </Btn>
      {ouvert === "outils" && (
        <Popover className={pop("g")}>
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
        sousBulle={sous ?? !tel}
        onClick={() => (p.gomme ? basculer("gomme") : (setOuvert(null), p.onGomme(true)))}
        menuOuvert={ouvert === "gomme"}
      >
        <Eraser className="h-5 w-5" />
      </Btn>
      {ouvert === "gomme" && (
        <Popover className={pop("g")}>
          <Epaisseurs gomme etiquette={t("performance.tools.eraserSize")} valeur={p.tailleGomme} onChoix={p.onTailleGomme} />
        </Popover>
      )}
    </div>
  );

  const loupe = (vertical: boolean) => (
    <div data-loupe className={`flex items-center ${vertical ? "flex-col" : ""}`}>
      <Btn label={t("performance.tools.zoomOut")} onClick={() => p.onZoom(-1)} sousBulle={sous ?? !tel}>
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
      <Btn label={t("performance.tools.zoomIn")} onClick={() => p.onZoom(1)} sousBulle={sous ?? !tel}>
        <ZoomIn className="h-5 w-5" />
      </Btn>
    </div>
  );

  const apple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const menuPlus = (
    <div className="relative" data-menu-annotation>
      <Btn label={t("performance.tools.more")} onClick={() => basculer("plus")} sousBulle={sous ?? !tel} menuOuvert={ouvert === "plus"}>
        <MoreHorizontal className="h-5 w-5" />
      </Btn>
      {ouvert === "plus" && (
        <Popover className={`${pop("d")} min-w-56`}>
          <button type="button" role="switch" aria-checked={p.doigtLibre} onClick={() => p.onDoigtLibre(!p.doigtLibre)} className="flex h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-sm text-foreground hover:bg-muted">
            {t("performance.tools.fingerFree")}
            <span aria-hidden="true" className={`flex h-5 w-9 items-center rounded-full p-0.5 ${p.doigtLibre ? "justify-end bg-[color:var(--couleur-icones)]" : "justify-start bg-muted-foreground/40"}`}>
              <span className="h-4 w-4 rounded-full bg-background" />
            </span>
          </button>
          {p.disposition !== "large" && (
            <Rubrique titre={t("performance.tools.loupe")}>{loupe(false)}</Rubrique>
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

  const poignee = (
    <span data-poignee className="inline-flex touch-none" onPointerDown={glisser} onClick={(e) => { if (e.detail === 0) poser({ accroche: accrocheSuivante(position.accroche, tel) }); }} onDoubleClick={() => poser({ accroche: "attachee" })}>
      <Btn label={t("performance.tools.deplacerBarre")} aide={t("performance.tools.deplacerBarreAide")} glisse={glisse !== null} onClick={() => {}} sousBulle={sous ?? !tel}>
        <GripVertical className="h-5 w-5" />
      </Btn>
    </span>
  );
  const evtsBarre = { onPointerDown: (e: PointerReact) => e.stopPropagation(), onPointerUp: (e: PointerReact) => e.stopPropagation() };
  const pointeurs = p.showChrome ? "pointer-events-auto" : "pointer-events-none";
  // Barre détachée : capsule posée en `left`/`top` (suivi 1:1, aucune transition), même contenu, même ordre.
  const capsule = (contenu: ReactNode) => (
    <div
      ref={flottRef}
      {...(tel ? { "data-crayon-barre-bas": true } : { "data-crayon-barre": "haut" })}
      data-accroche={accAffichee}
      data-colonne={colonne ? "" : undefined}
      className={`absolute ${pointeurs} material-chrome material-steady [box-shadow:var(--shadow-flottant)] rounded-[14px] p-1 flex items-center gap-0.5 ${colonne ? "w-[52px] flex-col" : "h-[52px] w-max"}`}
      style={{ left: lieu.left, top: lieu.top, visibility: zone ? undefined : "hidden" }}
      {...evtsBarre}
    >
      {contenu}
    </div>
  );
  // La bande d'origine porte la ref de mesure et reste montée au même endroit, attachée ou non : attachée elle contient
  // la barre, détachée elle est vide mais de même hauteur (mêmes marges, un corps de 44 px).
  const bande = (cls: string, vide: { cls: string; style: React.CSSProperties }, ref: RefObject<HTMLDivElement | null>, barreAttachee: ReactNode) => (
    <div ref={ref} className={`absolute left-0 right-0 pointer-events-none ${cls}`}>
      {attachee ? barreAttachee : (
        <div aria-hidden="true" className={vide.cls} style={vide.style}>
          <div className="h-11" />
        </div>
      )}
    </div>
  );

  if (tel) {
    return (
      <>
        <div
          ref={barreRef}
          data-crayon-barre="haut"
          className={`absolute top-0 left-0 right-0 ${pointeurs} material-chrome material-steady shadow-[0_1px_0_hsl(var(--border))] py-3 flex items-center justify-between gap-1`}
          style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", paddingLeft: "calc(0.5rem + var(--sal, 0px))", paddingRight: "calc(0.5rem + var(--sar, 0px))" }}
          {...evtsBarre}
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
        {bande("bottom-0", { cls: "py-1", style: { paddingBottom: "calc(0.25rem + var(--sab, 0px))" } }, barreBasRef, (
          <div
            data-crayon-barre-bas
            data-accroche={accAffichee}
            className={`${pointeurs} material-chrome material-steady shadow-[0_-1px_0_hsl(var(--border))] py-1 flex items-center gap-0.5`}
            style={{ paddingBottom: "calc(0.25rem + var(--sab, 0px))", paddingLeft: "calc(0.5rem + var(--sal, 0px))", paddingRight: "calc(0.5rem + var(--sar, 0px))" }}
            {...evtsBarre}
          >
            {poignee}
            {menuOutils}
            {menuGomme}
            {menuPlus}
            <span className="ml-auto">{etat}</span>
          </div>
        ))}
        {!attachee && capsule(<>{poignee}{menuOutils}{menuGomme}{menuPlus}<span className={colonne ? "" : "ml-1"}>{etat}</span></>)}
      </>
    );
  }

  const contenu = (
    <>
      {poignee}
      {precedent}
      {suivant}
      {annuler}
      {retablir}
      <Separateur colonne={colonne} />
      {menuOutils}
      {menuGomme}
      {p.disposition === "large" && loupe(colonne)}
      {menuPlus}
      {colonne ? <>{termine}{etat}</> : <div className="ml-auto flex items-center gap-1">{etat}{termine}</div>}
    </>
  );
  return (
    <>
      {bande("top-0", { cls: "py-3", style: { paddingTop: "calc(0.75rem + var(--sat, 0px))" } }, barreRef, (
        <div
          data-crayon-barre="haut"
          data-accroche={accAffichee}
          className={`${pointeurs} material-chrome material-steady shadow-[0_1px_0_hsl(var(--border))] py-3 [--marge-barre:1rem]`}
          style={{ paddingTop: "calc(0.75rem + var(--sat, 0px))", paddingLeft: "calc(var(--marge-barre) + var(--sal, 0px))", paddingRight: "calc(var(--marge-barre) + var(--sar, 0px))" }}
          {...evtsBarre}
        >
          <div className="mx-auto flex w-full max-w-[1440px] items-center gap-0.5">{contenu}</div>
        </div>
      ))}
      {!attachee && capsule(contenu)}
    </>
  );
}

const Separateur = ({ colonne }: { colonne?: boolean }) => <div aria-hidden="true" className={colonne ? "my-1 h-px w-6 bg-border" : "mx-1 h-6 w-px bg-border"} />;

function Popover({ className, children }: { className: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // Gardé dans l'écran (barre détachée près d'un bord) : décalé d'un coup, sans animation.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : Math.max(0, 8 - r.left);
    const dy = r.bottom > window.innerHeight - 8 ? window.innerHeight - 8 - r.bottom : Math.max(0, 8 - r.top);
    if (dx || dy) el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);
  return (
    <div ref={ref} className={`absolute z-30 flex flex-col gap-1 rounded-xl p-2 material-panel [box-shadow:var(--shadow-flottant)] ${className}`}>
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
function Btn({ label, aide, glisse, actif = false, disabled = false, menuOuvert, sousBulle, onClick, children }: {
  label: string;
  /** Texte de la bulle, si différent de `label`. */
  aide?: string;
  /** Poignée seulement : `true` pendant un glisser ; la bulle et l'appui long s'effacent au début du glisser et au lâcher. */
  glisse?: boolean;
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
  useEffect(() => {
    if (glisse === undefined) return;
    window.addEventListener("pointerup", effacer);
    window.addEventListener("pointercancel", effacer);
    return () => { window.removeEventListener("pointerup", effacer); window.removeEventListener("pointercancel", effacer); };
  }, [glisse]);
  useEffect(() => { if (glisse) effacer(); }, [glisse]); // eslint-disable-line react-hooks/set-state-in-effect -- efface la bulle au début du glisser
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
          {aide ?? label}
        </span>
      )}
    </span>
  );
}
