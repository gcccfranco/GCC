"use client";

import { useRef, useState } from "react";

export interface RepereChant {
  /** Index de page (0-based) de la première page du chant. */
  page: number;
  titre: string;
}

interface Props {
  total: number;
  courante: number;
  reperes: RepereChant[];
  libelle: string;
  texteValeur: string;
  onAller: (page: number) => void;
}

// Demi-largeur du pouce natif (16 px en Chromium) : la piste utile commence et finit à ce décalage.
const MARGE_POUCE = 8;
const arreter = (e: React.PointerEvent) => e.stopPropagation();

/** Curseur de page (forScore, lot L7) : toute la setlist, un repère au début de chaque chant.
 *  Chaque élément arrête les pointeurs : un geste ici ne tourne jamais la page par la racine. */
export function CurseurPage({ total, courante, reperes, libelle, texteValeur, onAller }: Props) {
  const max = Math.max(total - 1, 1);
  const [visee, setVisee] = useState<number | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const viser = (p: number) => {
    setVisee(p);
    clearTimeout(minuterie.current);
  };
  const oublier = (delai: number) => {
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setVisee(null), delai);
  };
  const position = (p: number) => `calc(${MARGE_POUCE}px + (100% - ${2 * MARGE_POUCE}px) * ${p / max})`;

  const chantVise =
    visee === null ? null : [...reperes].reverse().find((r) => r.page <= visee) ?? reperes[0] ?? null;
  const frac = visee === null ? 0 : visee / max;

  return (
    <div
      data-curseur-page
      className="relative h-10 -mb-1.5 basis-full w-full"
      onPointerDown={arreter}
      onPointerUp={arreter}
    >
      {chantVise && (
        <div
          aria-hidden="true"
          data-bulle-curseur
          className="pointer-events-none absolute bottom-full mb-1 max-w-[70%] truncate rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground shadow-md"
          style={{
            left: position(visee ?? 0),
            transform: `translateX(${frac < 0.25 ? "-8px" : frac > 0.75 ? "calc(-100% + 8px)" : "-50%"})`,
          }}
        >
          {chantVise.titre}
        </div>
      )}
      <input
        type="range"
        min={0}
        max={total - 1}
        step={1}
        value={courante}
        aria-label={libelle}
        aria-valuetext={texteValeur}
        className="absolute left-0 right-0 top-0.5 m-0 h-11 w-full cursor-pointer accent-[hsl(var(--primary))]"
        onChange={(e) => {
          const p = Number(e.target.value);
          viser(p);
          onAller(p);
          oublier(1500);
        }}
        onPointerDown={() => viser(courante)}
        onPointerUp={(e) => {
          oublier(400);
          // Le focus resterait sur le curseur : PageUp / PageDown des pédales sauteraient alors de dix pages.
          e.currentTarget.blur();
        }}
        onPointerCancel={() => oublier(0)}
        onBlur={() => oublier(0)}
        onKeyDown={(e) => {
          // Pédales Bluetooth : PageUp / PageDown / espace tournent d'une page, comme hors du curseur.
          const delta = e.key === "PageDown" || e.key === " " ? 1 : e.key === "PageUp" ? -1 : 0;
          if (delta === 0) return;
          e.preventDefault();
          onAller(courante + delta);
        }}
      />
      {reperes.map((r) => (
        <button
          key={`${r.page}-${r.titre}`}
          type="button"
          data-repere-chant
          data-page={r.page}
          data-titre={r.titre}
          aria-label={r.titre}
          onClick={() => onAller(r.page)}
          onPointerDown={arreter}
          onPointerUp={arreter}
          className="absolute top-0 flex h-3.5 w-8 -translate-x-1/2 items-start justify-center"
          style={{ left: position(r.page) }}
        >
          <span className="block h-3 w-0.5 rounded-full bg-muted-foreground/70" />
        </button>
      ))}
    </div>
  );
}
