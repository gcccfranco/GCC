"use client";

import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { FOND_CLAIR, FOND_SOMBRE, garderContraste, hexVersHsl, hslVersHex } from "@/lib/performance/couleurIcones";

const arreter = (e: React.PointerEvent) => e.stopPropagation();
const TAILLE = 176;
const EPAISSEUR = 28;
// Saturation fixe du cercle : la teinte et la luminosité suffisent à choisir.
const SATURATION = 70;

/** Cercle chromatique : teinte au tour du cercle, luminosité au centre. Souris, toucher
 *  (pointer events) et clavier (flèches ±5°, Maj ±30° sur la teinte). L'aperçu montre la
 *  couleur corrigée par le garde-fou sur le fond de la barre, en clair et en sombre. */
export function CercleChromatique({ valeur, onChange }: { valeur: string; onChange: (hex: string) => void }) {
  const { t } = useTranslation();
  const anneau = useRef<HTMLDivElement>(null);
  const [h0, s0, l] = hexVersHsl(valeur);
  const h = h0;
  const s = s0 < 15 ? SATURATION : s0;

  const teinteA = (x: number, y: number) => {
    const r = anneau.current?.getBoundingClientRect();
    if (!r) return;
    const dx = x - (r.left + r.width / 2);
    const dy = y - (r.top + r.height / 2);
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    onChange(hslVersHex((deg + 360) % 360, s, Math.min(85, Math.max(15, l))));
  };

  const rayon = TAILLE / 2 - EPAISSEUR / 2;
  const angle = (h * Math.PI) / 180;
  const px = TAILLE / 2 + rayon * Math.sin(angle);
  const py = TAILLE / 2 - rayon * Math.cos(angle);

  return (
    <div data-cercle-chromatique className="flex flex-col items-center gap-3" onPointerDown={arreter} onPointerUp={arreter}>
      <div
        ref={anneau}
        role="slider"
        tabIndex={0}
        aria-label={t("performance.cercle.teinte")}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(h)}
        aria-valuetext={`${Math.round(h)}°`}
        className="relative touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          width: TAILLE,
          height: TAILLE,
          background: "conic-gradient(from 0deg, hsl(0 70% 50%), hsl(60 70% 50%), hsl(120 70% 50%), hsl(180 70% 50%), hsl(240 70% 50%), hsl(300 70% 50%), hsl(360 70% 50%))",
          WebkitMask: `radial-gradient(circle, transparent ${TAILLE / 2 - EPAISSEUR - 1}px, #000 ${TAILLE / 2 - EPAISSEUR}px)`,
          mask: `radial-gradient(circle, transparent ${TAILLE / 2 - EPAISSEUR - 1}px, #000 ${TAILLE / 2 - EPAISSEUR}px)`,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          teinteA(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) teinteA(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onKeyDown={(e) => {
          const pas = e.shiftKey ? 30 : 5;
          const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? pas : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -pas : 0;
          if (d === 0) return;
          e.preventDefault();
          e.stopPropagation();
          onChange(hslVersHex((h + d + 360) % 360, s, l));
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full border-2 border-white shadow-md"
          style={{ left: px - 11, top: py - 11, width: 22, height: 22, background: valeur }}
        />
      </div>
      {/* Luminosité : le curseur du centre, un second slider. */}
      <label className="flex w-full items-center gap-3 text-xs text-muted-foreground">
        <span className="shrink-0">{t("performance.cercle.luminosite")}</span>
        <input
          type="range"
          min={15}
          max={85}
          step={1}
          value={Math.round(Math.min(85, Math.max(15, l)))}
          aria-label={t("performance.cercle.luminosite")}
          className="h-11 min-w-0 flex-1 cursor-pointer accent-[hsl(var(--primary))]"
          onChange={(e) => onChange(hslVersHex(h, s, Number(e.target.value)))}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </label>
      <div className="flex items-center gap-3 text-xs text-muted-foreground" data-apercu-couleur>
        <span>{t("performance.cercle.apercu")}</span>
        {([FOND_CLAIR, FOND_SOMBRE] as const).map((fond) => (
          <span
            key={fond}
            data-apercu-fond={fond}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border"
            style={{ background: fond }}
          >
            <span className="h-5 w-5 rounded-full" style={{ background: garderContraste(valeur, fond) }} />
          </span>
        ))}
      </div>
    </div>
  );
}
