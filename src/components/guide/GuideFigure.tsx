"use client";

import { useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TOUCHER_44 } from "@/lib/toucher44";
import type { Annotation, GuideFigure as Figure } from "@/lib/guide/figures";

// Couleur des annotations (cercles/flèches) — orange de marque, ressort sur les
// captures en clair comme en sombre. Doublé d'un halo blanc pour le contraste.
const INK = "#EA580C";

/** Une flèche = trait principal + deux segments de pointe (coord. 0–100). */
function Arrow({ a }: { a: Extract<Annotation, { kind: "arrow" }> }) {
  const ang = Math.atan2(a.y2 - a.y1, a.x2 - a.x1);
  const len = 4;
  const spread = 0.5;
  const hx1 = a.x2 - len * Math.cos(ang - spread);
  const hy1 = a.y2 - len * Math.sin(ang - spread);
  const hx2 = a.x2 - len * Math.cos(ang + spread);
  const hy2 = a.y2 - len * Math.sin(ang + spread);
  return (
    <>
      <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
      <line x1={hx1} y1={hy1} x2={a.x2} y2={a.y2} />
      <line x1={hx2} y1={hy2} x2={a.x2} y2={a.y2} />
    </>
  );
}

/** Formes vectorielles (cercles + flèches) — les légendes sont rendues à part. */
function Shapes({ items }: { items: Annotation[] }) {
  const shapes = items.filter((a) => a.kind !== "label");
  const draw = (a: Annotation, key: number) =>
    a.kind === "circle" ? (
      <ellipse key={key} cx={a.x} cy={a.y} rx={a.rx ?? 8} ry={a.ry ?? 8} />
    ) : a.kind === "rect" ? (
      <rect key={key} x={a.x - a.rx} y={a.y - a.ry} width={2 * a.rx} height={2 * a.ry} rx={0.8} ry={1.3} />
    ) : a.kind === "arrow" ? (
      <Arrow key={key} a={a} />
    ) : null;
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* Halo blanc dessous pour le contraste */}
      <g
        fill="none"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.85}
      >
        {shapes.map(draw)}
      </g>
      {/* Trait de couleur au-dessus */}
      <g
        fill="none"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        {shapes.map(draw)}
      </g>
    </svg>
  );
}

/** Petites légendes posées sur l'image (HTML pour un texte net et multilingue). */
function Labels({ items, figureId }: { items: Annotation[]; figureId: string }) {
  const { t } = useTranslation();
  const labels = items.filter(
    (a): a is Extract<Annotation, { kind: "label" }> => a.kind === "label"
  );
  return (
    <div className="pointer-events-none absolute inset-0">
      {labels.map((a, i) => {
        const tx =
          a.align === "left" ? "0" : a.align === "right" ? "-100%" : "-50%";
        return (
          <span
            key={i}
            className="absolute inline-block w-max max-w-[45%] rounded bg-primary text-primary-foreground px-1 py-px text-xs font-medium leading-snug shadow-sm"
            style={{
              left: `${a.x}%`,
              top: `${a.y}%`,
              transform: `translate(${tx}, -50%)`,
            }}
          >
            {t(`guide.captures.${figureId}.labels.${a.labelId}`)}
          </span>
        );
      })}
    </div>
  );
}

/** Annotations posées sur l'image (communes à la figure et à la feuille). */
function Surimpression({ figure, zh }: { figure: Figure; zh: boolean }) {
  // Capture chinoise : ses coordonnées `zh` si la figure en a, sinon celles du français.
  const items = (zh && figure.zh) || figure.annotations;
  if (!items || items.length === 0) return null;
  return (
    <>
      <Shapes items={items} />
      <Labels items={items} figureId={figure.id} />
    </>
  );
}

// En sombre seulement, la capture claire est adoucie (les annotations, posées dessus, restent hors filtre).
const IMG_SOMBRE = "dark:[filter:brightness(.85)_contrast(.95)]";

/** Capture annotée d'une section du guide (masquée si l'image manque). Le bouton « Agrandir la capture »
 *  ouvre une feuille où l'image garde sa largeur réelle (1 280 px) : on la fait défiler ou on la pince. */
export function GuideFigure({ figure }: { figure: Figure }) {
  const { t, i18n } = useTranslation();
  const [hidden, setHidden] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  // En 中文, la capture chinoise ; si elle manque, repli sur la capture française et ses coordonnées.
  const [zhAbsent, setZhAbsent] = useState(false);
  const [origine, setOrigine] = useState("50% 50%");
  const cadre = useRef<HTMLDivElement>(null);
  if (hidden) return null;

  const zh = (i18n.language ?? "").startsWith("zh") && !zhAbsent;
  const src = zh ? `/guide/zh/${figure.id}.png` : `/guide/${figure.id}.png`;
  const alt = t(`guide.captures.${figure.id}.caption`, { defaultValue: "" });

  function agrandir() {
    const r = cadre.current?.getBoundingClientRect();
    if (r) setOrigine(`${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height / 2)}px`);
    setOuvert(true);
  }

  return (
    <figure className="space-y-1.5">
      {/* Passe-partout de 6 px en --secondary, liseré plus net en contraste élevé. */}
      <div
        ref={cadre}
        className="relative w-full rounded-lg border border-foreground/15 bg-secondary p-1.5 contrast-more:border-foreground/40"
      >
        <div className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: String(figure.aspect ?? 1.6) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={`h-full w-full object-cover ${IMG_SOMBRE}`}
            onError={() => (zh ? setZhAbsent(true) : setHidden(true))}
          />
          <Surimpression figure={figure} zh={zh} />
        </div>
      </div>
      {/* R2 : le bouton « Agrandir » sort de la capture, dans la ligne de légende, à droite (zone de 44 px au doigt) :
          il ne couvre rien et ne touche plus le bord de la section. La légende reste centrée (cale de 36 px à gauche). */}
      <div className="flex items-center gap-2">
        {figure.caption ? (
          <figcaption className="min-w-0 flex-1 pl-9 text-center text-xs text-muted-foreground">
            {t(`guide.captures.${figure.id}.caption`)}
          </figcaption>
        ) : (
          <span className="flex-1" />
        )}
        <button
          type="button"
          onClick={agrandir}
          aria-label={t("guide.agrandirCapture")}
          title={t("guide.agrandirCapture")}
          className={`${TOUCHER_44} flex h-9 w-9 shrink-0 cursor-zoom-in items-center justify-center rounded-full border border-foreground/15 bg-background/90 text-foreground shadow-sm transition-transform duration-150 active:scale-[.94]`}
        >
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent
          aria-describedby={undefined}
          data-testid="capture-feuille"
          className="capture-scrim inset-0 flex items-stretch justify-center sm:items-center sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOuvert(false);
          }}
        >
          <div style={{ transformOrigin: origine }} className="capture-feuille flex h-full max-h-full w-full flex-col overflow-hidden bg-card max-sm:pt-[env(safe-area-inset-top)] max-sm:pb-[env(safe-area-inset-bottom)] sm:h-auto sm:w-[92vw] sm:max-w-[1280px] sm:rounded-2xl sm:border sm:border-foreground/15">
            <div className="flex items-start gap-3 border-b border-border px-4 py-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="sr-only">{alt || t("guide.agrandirCapture")}</DialogTitle>
                <p className="text-xs leading-snug text-muted-foreground sm:hidden">{t("guide.captureDefilement")}</p>
                <p className="hidden text-xs leading-snug text-muted-foreground sm:block">{t("guide.captureFermerAide")}</p>
              </div>
              <DialogClose
                aria-label={t("common.buttons.close")}
                title={t("common.buttons.close")}
                className={`${TOUCHER_44} flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground`}
              >
                <X className="h-4 w-4" aria-hidden />
              </DialogClose>
            </div>
            <div data-testid="capture-defilement" className="min-h-0 flex-1 overflow-auto [touch-action:pan-x_pan-y_pinch-zoom]">
              <div className="relative" style={{ width: 1280, aspectRatio: String(figure.aspect ?? 1.6) }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} data-testid="capture-agrandie" className={`h-full w-full max-w-none ${IMG_SOMBRE}`} />
                <Surimpression figure={figure} zh={zh} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}
