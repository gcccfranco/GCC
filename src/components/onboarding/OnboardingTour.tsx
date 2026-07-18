"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { Annotation, OnboardingStep } from "@/lib/onboarding/steps";

// Couleur des annotations (cercles/flèches) — orange de marque, ressort sur les
// captures en clair comme en sombre. Doublé d'un halo blanc pour le contraste.
const INK = "#EA580C";

/** Met en gras les segments entre **doubles astérisques** (comme la page /guide). */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

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
        strokeWidth={2.6}
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
        strokeWidth={1.4}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      >
        {shapes.map(draw)}
      </g>
    </svg>
  );
}

/** Petites légendes posées sur l'image (HTML pour un texte net et multilingue). */
function Labels({ items, stepId }: { items: Annotation[]; stepId: string }) {
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
            {t(`onboarding.steps.${stepId}.labels.${a.labelId}`)}
          </span>
        );
      })}
    </div>
  );
}

export function OnboardingTour({
  steps,
  onClose,
}: {
  steps: OnboardingStep[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [index]);
  const total = steps.length;
  const step = steps[index];
  const isLast = index === total - 1;
  const points = (step
    ? t(`onboarding.steps.${step.id}.points`, { returnObjects: true, defaultValue: [] })
    : []) as unknown as string[];

  const go = useCallback(
    (dir: 1 | -1) =>
      setIndex((i) => Math.min(total - 1, Math.max(0, i + dir))),
    [total]
  );

  // Navigation clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Verrouille le scroll de la page pendant le tour
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!step) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 print:hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.title")}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200">
        {/* En-tête : progression + fermer */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <button
                key={s.id}
                aria-label={`${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === index
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>
          <button
            onClick={onClose}
            aria-label={t("onboarding.skip")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Corps défilant */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {step.intro ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="relative mb-5 h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-sm">
                <Image src="/logo.png" alt="GCC" fill sizes="64px" className="object-contain" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-foreground">
                {t(`onboarding.steps.${step.id}.title`)}
              </h2>
              <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
                <RichText text={t(`onboarding.steps.${step.id}.body`)} />
              </p>
            </div>
          ) : (
            <>
              {/* Cadre visuel : capture + annotations (ou placeholder Phase 1) */}
              <div
                className="relative w-full overflow-hidden rounded-xl border border-border bg-secondary/40"
                style={{ aspectRatio: String(step.aspect ?? 1.6) }}
              >
                {!imgError ? (
                  // Convention : capture dans /public/onboarding/<id>.png. Repli
                  // placeholder si l'image est absente (onError).
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={step.image ?? `/onboarding/${step.id}.png`}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
                    <ImageOff className="h-7 w-7" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      {t("onboarding.placeholder")}
                    </span>
                    <span className="text-[11px] opacity-70">{step.id}</span>
                  </div>
                )}
                {step.annotations && step.annotations.length > 0 && (
                  <>
                    <Shapes items={step.annotations} />
                    <Labels items={step.annotations} stepId={step.id} />
                  </>
                )}
              </div>

              <h2 className="mt-4 mb-1.5 text-lg font-bold text-foreground">
                {t(`onboarding.steps.${step.id}.title`)}
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                <RichText text={t(`onboarding.steps.${step.id}.body`)} />
              </p>
              {points.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {points.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-[14px] leading-snug text-muted-foreground">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>
                        <RichText text={pt} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Pied : précédent · compteur · suivant/terminer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-0 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("onboarding.prev")}
          </button>

          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {t("onboarding.step", { n: index + 1, total })}
          </span>

          <button
            onClick={() => (isLast ? onClose() : go(1))}
            className="flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[.97] cursor-pointer"
          >
            {isLast ? t("onboarding.done") : t("onboarding.next")}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
