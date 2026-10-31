"use client";

import { useEffect, useRef, useState } from "react";

interface RepereChant {
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

  useEffect(() => () => clearTimeout(minuterie.current), []);
  const racine = useRef<HTMLDivElement>(null);
  // Glissé commencé sur un repère : il déplace quand même le curseur (la zone du repère recouvre la piste).
  const glisse = useRef<{ x: number; actif: boolean } | null>(null);
  const pageA = (clientX: number) => {
    const r = racine.current?.getBoundingClientRect();
    if (!r) return courante;
    const f = (clientX - r.left - MARGE_POUCE) / (r.width - 2 * MARGE_POUCE);
    return Math.round(Math.min(1, Math.max(0, f)) * max);
  };

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
      ref={racine}
      data-curseur-page
      className="relative h-10 -mb-1.5 basis-full w-full overflow-x-clip"
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
          onClick={() => {
            if (glisse.current?.actif) return;
            onAller(r.page);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
            glisse.current = { x: e.clientX, actif: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const g = glisse.current;
            if (!g || (!g.actif && Math.abs(e.clientX - g.x) < 6)) return;
            g.actif = true;
            const p = pageA(e.clientX);
            viser(p);
            onAller(p);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            if (glisse.current?.actif) oublier(400);
            // Le clic qui suit le relâchement lit encore `actif` : on libère après lui.
            setTimeout(() => { glisse.current = null; }, 0);
          }}
          onPointerCancel={() => { glisse.current = null; }}
          // Zone de 44 × 44 px centrée sur le trait, qui reste fin.
          className="absolute -top-1.5 flex h-11 w-11 -translate-x-1/2 touch-none items-start justify-center pt-1.5"
          style={{ left: position(r.page) }}
        >
          <span className="block h-3 w-0.5 rounded-full bg-muted-foreground/70" />
        </button>
      ))}
    </div>
  );
}
