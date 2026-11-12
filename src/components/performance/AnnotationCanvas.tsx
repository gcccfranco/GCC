"use client";

// Annotations vectorielles du Mode Louange.
// - dessin doigt/stylet/souris : 1 pointeur = tracé, 2 pointeurs = pincer (zoom)
//   + déplacement. Marche partout (tablette au stylet, téléphone doigt+stylet)
//   sans détection d'appareil, et sans jamais entrer en conflit avec le trait.
// - rendu au devicePixelRatio → traits nets, jamais pixelisés (même zoomés)
// - gomme TRAIT par trait ; outil, couleur, tailles et annuler vivent dans BarreAnnotation et PerformanceMode
// - le zoom/déplacement (loupe) est possédé par le parent (PerformanceMode), qui
//   l'applique aussi au texte ; ici on s'en sert pour le rendu et la conversion
//   écran→données. Le parent possède aussi les données (AnnotationData).

import { useRef, useEffect, useCallback } from "react";
import {
  type AnnotationData,
  type Stroke,
  type StrokeTool,
  drawStrokes,
  simplifyStroke,
  styleTrait,
  strokeHitTest,
} from "@/lib/annotations/strokes";

// Stylo et surligneur : épaisseur, couleur et transparence viennent des préréglages (`src/lib/annotations/prereglages.ts`).
export const SIZES = { eraser: [12, 24, 40] };

export type Tool = StrokeTool | "eraser";

export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.5;

export type Pan = { x: number; y: number };
const dist = (a: Pan, b: Pan) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pan, b: Pan): Pan => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
// Borne le déplacement pour que le contenu couvre toujours le viewport
// (à 100 %, force le pan à 0 → la loupe se réinitialise d'elle-même).
export function clampPan(zoom: number, p: Pan): Pan {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.min(0, Math.max(w * (1 - zoom), p.x)),
    y: Math.min(0, Math.max(h * (1 - zoom), p.y)),
  };
}

/** Calque de LECTURE : affiche les traits, sans interaction. */
// `rogneBas` : hauteur (CSS) du bas de l'écran que le calque ne couvre pas (aperçu de page, lot L6).
// clip-path garde les coordonnées intactes et retire aussi les touchers de la bande.
// `clipPath` (px écran) remplace `rogneBas` : le Crayon y ajoute des trous (repères de section, au-dessus de l'encre).
// Demi-page : `clip` (clip-path en px écran, sur un cadre fixe) et `decalage` (px écran) rognent et descendent les traits comme le texte.
export function StrokesLayer({ data, rogneBas, clip, decalage, clipPath, fond }: { data: AnnotationData; rogneBas?: string; clip?: string; decalage?: number; clipPath?: string; fond?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = window.innerWidth;
  const h = window.innerHeight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawStrokes(ctx, data.strokes, {
      dpr,
      scaleX: w / (data.w || w),
      scaleY: h / (data.h || h),
      fond,
    });
  }, [data, w, h, fond]);

  const canvas = (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      // Boîtes englobantes des tracés (px écran) : lues par les tests, qui comparent un trait à son mot.
      data-strokes-boites={JSON.stringify(data.strokes.map((s) => {
        const xs = s.points.map((p) => p[0] * w / (data.w || w));
        const ys = s.points.map((p) => p[1] * h / (data.h || h));
        return [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)), Math.round(Math.max(...xs)), Math.round(Math.max(...ys))];
      }))}
      // Couleurs réellement dessinées (garde de lisibilité comprise) : lues par les tests.
      data-strokes-couleurs={JSON.stringify(data.strokes.map((s) => styleTrait(s, fond).color))}
      style={{ zIndex: clip ? undefined : 5, clipPath: clipPath ?? (rogneBas ? `inset(0 0 ${rogneBas} 0)` : undefined), transform: decalage ? `translateY(${decalage}px)` : undefined }}
      aria-hidden="true"
    />
  );
  return clip ? <div data-strokes-demi className="absolute inset-0 pointer-events-none" style={{ zIndex: 5, clipPath: clip }}>{canvas}</div> : canvas;
}

// ─── Canvas d'édition ─────────────────────────────────────────────────────────

interface Props {
  data: AnnotationData;
  onChange: (data: AnnotationData) => void;
  /** Loupe (possédée par le parent) : facteur de zoom et déplacement en px écran. */
  zoom: number;
  pan: Pan;
  onZoomPanChange: (zoom: number, pan: Pan) => void;
  /** Bas de l'écran non couvert (aperçu de page, lot L6). */
  rogneBas?: string;
  /** Remplace `rogneBas` si fourni (clip-path en px écran, avec des trous : repères de section au-dessus de l'encre). */
  clipPath?: string;
  /** Outil, couleur, épaisseur (px), transparence et taille de gomme : possédés par le parent, qui porte la barre d'outils. */
  tool: Tool;
  color: string;
  size: number;
  alpha: number;
  /** Fond de la page (garde de lisibilité au rendu, AN-4). */
  fond: string;
  tailleGomme: number;
  /** Aucun tracé ni gomme (partition pas encore lue) ; la loupe reste. */
  inerte?: boolean;
  /** Un tracé ou un passage de gomme commence (le parent regroupe ce qui suit en une action à annuler). */
  onDebutGeste?: () => void;
  /** AN-2 : « le doigt ne dessine pas » : un doigt seul ne trace pas, ses évènements remontent à la page (deux doigts gardent la loupe). */
  doigtLibre?: boolean;
  /** AN-2 : contact du stylet qui a ouvert le Crayon ; le premier trait commence là, repris au montage. */
  contactInitial?: { x: number; y: number; id: number } | null;
  /** AN-2 : un trait vient d'être fini au stylet. */
  onTraitStylet?: () => void;
}

export function AnnotationCanvas({ data, onChange, zoom, pan, onZoomPanChange, rogneBas, clipPath, tool, color, size, alpha, fond, tailleGomme, inerte, onDebutGeste, doigtLibre, contactInitial, onTraitStylet }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pointeurs actifs sur le canvas (multi-touch). 1 = tracé, 2 = pincer/déplacer.
  const pointers = useRef<Map<number, Pan>>(new Map());
  const drawingPointer = useRef<number | null>(null);
  // Geste pince/déplacement en cours (figé au démarrage du 2e pointeur)
  const gesture = useRef<null | { startDist: number; startZoom: number; startPan: Pan; startMid: Pan }>(null);
  // Après un geste à 2 doigts, ignorer le(s) pointeur(s) restant(s) pour le tracé
  // jusqu'à relâchement complet (évite un trait parasite en levant un doigt).
  const suppressDraw = useRef(false);
  const livePoints = useRef<[number, number][]>([]);
  // Cercle de prévisualisation qui suit le pointeur (position pilotée hors React)
  const cursorRef = useRef<HTMLDivElement>(null);

  // Conversion écran → espace d'origine des données : on annule d'abord la loupe
  // (déplacement puis zoom), puis l'échelle viewport↔données.
  const toOrig = useCallback(
    (x: number, y: number): [number, number] => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return [
        ((x - pan.x) / zoom) * ((data.w || w) / w),
        ((y - pan.y) / zoom) * ((data.h || h) / h),
      ];
    },
    [data.w, data.h, zoom, pan.x, pan.y],
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    drawStrokes(ctx, data.strokes, {
      dpr,
      scaleX: w / (data.w || w),
      scaleY: h / (data.h || h),
      zoom,
      panX: pan.x,
      panY: pan.y,
      fond,
    });
  }, [data, zoom, pan.x, pan.y, fond]);

  // Dimensionner au devicePixelRatio (et au resize)
  useEffect(() => {
    const setup = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redraw();
    };
    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { redraw(); }, [redraw]);

  const eraseAt = useCallback(
    (clientX: number, clientY: number) => {
      const [ox, oy] = toOrig(clientX, clientY);
      // Gomme de taille fixe à l'écran → rayon en espace données = rayon écran
      // ramené par l'échelle viewport↔données et par le zoom de la loupe.
      const w = window.innerWidth;
      const radius = (SIZES.eraser[tailleGomme] * ((data.w || w) / w)) / zoom;
      const remaining = data.strokes.filter((s) => !strokeHitTest(s, ox, oy, radius));
      if (remaining.length !== data.strokes.length) {
        onChange({ ...data, strokes: remaining });
      }
    },
    [data, onChange, tailleGomme, toOrig, zoom],
  );

  // ── Cercle indicateur de taille (suit le pointeur, piloté hors React) ──
  const showCursorAt = (x: number, y: number) => {
    const el = cursorRef.current;
    if (!el) return;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.opacity = "1";
  };
  const hideCursor = () => {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  };

  // ── Dessin live (segment incrémental, sans re-render React) ──
  const drawLiveSegment = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const pts = livePoints.current;
    const prev = pts[pts.length - 1];
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const st = tool === "eraser" ? null : styleTrait({ tool, size, color, alpha, points: [] }, fond);
    ctx.strokeStyle = st?.color ?? color;
    // Le segment live est tracé en coordonnées écran (sans la matrice de zoom) :
    // on multiplie donc l'épaisseur par le zoom pour coller au rendu final.
    ctx.lineWidth = size * zoom;
    ctx.globalAlpha = st?.alpha ?? 1;
    if (st) ctx.globalCompositeOperation = st.composite;
    ctx.beginPath();
    ctx.moveTo(prev[0], prev[1]);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();
  };

  // Abandonne le trait en cours (ex. l'utilisateur pose un 2e doigt pour zoomer)
  const cancelStroke = () => {
    drawingPointer.current = null;
    livePoints.current = [];
    hideCursor();
    redraw(); // efface le segment live partiel
  };

  // Un doigt seul qui ne dessine pas : ses évènements remontent à la page (tourner la page).
  const doigtSeul = (e: React.PointerEvent) => !!doigtLibre && e.pointerType === "touch";

  // Premier trait du stylet qui a ouvert le Crayon : il commence au point de contact.
  useEffect(() => {
    if (!contactInitial) return;
    pointers.current.set(contactInitial.id, { x: contactInitial.x, y: contactInitial.y });
    try { canvasRef.current?.setPointerCapture(contactInitial.id); } catch { /* pointeur simulé : refusé */ }
    debuterTrace(contactInitial.id, contactInitial.x, contactInitial.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function debuterTrace(id: number, x: number, y: number) {
    drawingPointer.current = id;
    onDebutGeste?.();
    showCursorAt(x, y);
    if (tool === "eraser") {
      eraseAt(x, y);
      return;
    }
    livePoints.current = [[x, y]];
  }

  function onPointerDown(e: React.PointerEvent) {
    // Un doigt posé pendant un trait au stylet est une paume : ignorée, sans tourner la page.
    const paume = doigtSeul(e) && drawingPointer.current !== null;
    if (!doigtSeul(e) || paume) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (paume) return;
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* pointeur simulé : refusé */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2e pointeur → bascule en geste pincer + déplacement
    if (pointers.current.size === 2) {
      cancelStroke();
      const [a, b] = [...pointers.current.values()];
      gesture.current = { startDist: dist(a, b), startZoom: zoom, startPan: { ...pan }, startMid: mid(a, b) };
      return;
    }
    if (pointers.current.size > 2) return; // geste à 2 prioritaire

    // 1 pointeur = tracé (sauf juste après un geste : attendre le relâchement total)
    if (suppressDraw.current || inerte || doigtSeul(e)) return;
    debuterTrace(e.pointerId, e.clientX, e.clientY);
  }

  function onPointerMove(e: React.PointerEvent) {
    const tracked = pointers.current.get(e.pointerId);
    if (tracked) { tracked.x = e.clientX; tracked.y = e.clientY; }

    // Geste pincer + déplacement
    if (gesture.current && pointers.current.size >= 2) {
      e.preventDefault();
      const [a, b] = [...pointers.current.values()];
      const g = gesture.current;
      const newZoom = Math.min(MAX_ZOOM, Math.max(1, g.startZoom * (g.startDist > 0 ? dist(a, b) / g.startDist : 1)));
      // Le point sous le milieu de départ reste sous le milieu courant
      // (= zoom autour des doigts ET déplacement à deux doigts).
      const curMid = mid(a, b);
      const p0x = (g.startMid.x - g.startPan.x) / g.startZoom;
      const p0y = (g.startMid.y - g.startPan.y) / g.startZoom;
      onZoomPanChange(newZoom, clampPan(newZoom, { x: curMid.x - p0x * newZoom, y: curMid.y - p0y * newZoom }));
      return;
    }

    if (!doigtSeul(e)) showCursorAt(e.clientX, e.clientY); // survol + dessin : le cercle suit toujours
    if (e.pointerId !== drawingPointer.current) return;
    e.preventDefault();
    if (tool === "eraser") {
      eraseAt(e.clientX, e.clientY);
      return;
    }
    drawLiveSegment(e.clientX, e.clientY);
    livePoints.current.push([e.clientX, e.clientY]);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!doigtSeul(e)) e.stopPropagation();
    pointers.current.delete(e.pointerId);

    // Fin (ou allègement) d'un geste à 2 pointeurs
    if (gesture.current) {
      if (pointers.current.size < 2) {
        gesture.current = null;
        suppressDraw.current = pointers.current.size > 0; // un doigt encore posé ⇒ pas de tracé
      }
      if (pointers.current.size === 0) suppressDraw.current = false;
      return;
    }
    if (pointers.current.size === 0) suppressDraw.current = false;

    if (e.pointerId !== drawingPointer.current) return;
    drawingPointer.current = null;
    if (e.pointerType === "touch") hideCursor(); // au doigt, pas de survol après le lever
    if (tool === "eraser") return;
    const pts = livePoints.current;
    livePoints.current = [];
    if (pts.length === 0) return;
    const stroke: Stroke = {
      tool,
      size,
      color,
      alpha,
      points: simplifyStroke(pts.map(([x, y]) => toOrig(x, y))),
    };
    onChange({ ...data, strokes: [...data.strokes, stroke] });
    if (e.pointerType === "pen") onTraitStylet?.();
  }

  // Diamètre du cercle qui suit le pointeur : empreinte de la gomme (= 2× son rayon,
  // taille fixe à l'écran), ou épaisseur du trait stylo/surligneur — qui suit le zoom.
  const cursorDiameter = tool === "eraser" ? SIZES.eraser[tailleGomme] * 2 : size * zoom;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 touch-none"
        style={{
          zIndex: 10,
          cursor: tool === "eraser" ? "cell" : "crosshair",
          clipPath: clipPath ?? (rogneBas ? `inset(0 0 ${rogneBas} 0)` : undefined),
        }}
        data-reperes-dessus={clipPath?.includes("Z M") ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={hideCursor}
      />

      {/* Cercle qui suit le pointeur : montre la taille réelle de l'outil.
          Position/visibilité pilotées hors React (style.transform / opacity). */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="absolute top-0 left-0 rounded-full pointer-events-none opacity-0"
        style={{
          zIndex: 10,
          width: cursorDiameter,
          height: cursorDiameter,
          marginLeft: -cursorDiameter / 2,
          marginTop: -cursorDiameter / 2,
          border: `1.5px solid ${tool === "eraser" ? "var(--muted-foreground)" : color}`,
          background: tool === "eraser" ? "rgba(120,120,120,0.15)" : "transparent",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
        }}
      />
    </>
  );
}
