"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
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
            className="absolute inline-block max-w-[45%] rounded bg-[#EA580C] px-1 py-px text-[9px] font-medium leading-snug text-white shadow-sm"
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

/** Capture annotée d'une section du guide (masquée si l'image manque). */
export function GuideFigure({ figure }: { figure: Figure }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <figure className="space-y-1.5">
      <div
        className="relative w-full overflow-hidden rounded-lg border border-border bg-secondary/40"
        style={{ aspectRatio: String(figure.aspect ?? 1.6) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/guide/${figure.id}.png`}
          alt={t(`guide.captures.${figure.id}.caption`, { defaultValue: "" })}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setHidden(true)}
        />
        {figure.annotations && figure.annotations.length > 0 && (
          <>
            <Shapes items={figure.annotations} />
            <Labels items={figure.annotations} figureId={figure.id} />
          </>
        )}
      </div>
      {figure.caption && (
        <figcaption className="text-xs text-muted-foreground/80 text-center">
          {t(`guide.captures.${figure.id}.caption`)}
        </figcaption>
      )}
    </figure>
  );
}
