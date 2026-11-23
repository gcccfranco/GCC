"use client";

import { useEffect, useRef, useState } from "react";
import { compter } from "@/lib/usage";

interface RepereChant {
  /** Index de page (0-based) de la première page du chant. */
  page: number;
  titre: string;
  /** Chant ajouté depuis « Tous les chants » : ses marques sont creuses. */
  ajout?: boolean;
}

interface Props {
  total: number;
  courante: number;
  reperes: RepereChant[];
  libelle: string;
  texteValeur: string;
  /** Texte de la vignette sous le titre du chant visé (« page 3 »). */
  pageVignette: (n: number) => string;
  onAller: (page: number) => void;
}

// Marge de chaque côté : le rayon de la poignée (11 px) et un peu d'air.
const MARGE = 14;
// Pas d'un point à l'autre : la rangée garde cette largeur quand il y a peu de pages, centrée dans la barre.
const PAS = 24;
// Écart supplémentaire entre deux chants, en pas de point (1 = un point de vide).
const ECART_CHANTS = 1;
// Au-delà, les points deviennent une piste continue (un trait par chant).
const MAX_POINTS = 40;
const COULEUR = "var(--couleur-icones, hsl(var(--primary)))";
// Points et traits pas encore atteints : une teinte neutre du thème (≥ 3:1 contre le fond de la barre, clair et sombre).
const COULEUR_INACTIVE = "hsl(var(--muted-foreground))";

/** Curseur de page (forScore, lots L7 et FS-A) : une rangée de points, un par page de toute la setlist,
 *  un écart plus large entre deux chants, une poignée ronde. Un pas fixe par point : la rangée est centrée
 *  et ne s'étale pas d'un bord à l'autre (au-delà de 40 pages, piste continue sur toute la largeur).
 *  L'input range natif reste dessous, invisible mais focalisable : clavier et lecteur d'écran n'ont rien perdu.
 *  Le toucher et la souris passent par la rangée elle-même, qui connaît la place des points et mène à la page
 *  la plus proche. Les repères de chant restent dans le DOM (focalisables, Entrée) mais ne captent aucun
 *  pointeur : leur zone de 44 px recouvrirait le point voisin. Chaque élément arrête les pointeurs : un geste
 *  ici ne tourne jamais la page par la racine. */
export function CurseurPage({ total, courante, reperes, libelle, texteValeur, pageVignette, onAller }: Props) {
  const [visee, setVisee] = useState<number | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(minuterie.current), []);
  const racine = useRef<HTMLDivElement>(null);
  const glisseRangee = useRef(false);

  // Place de chaque page sur la rangée : un pas par page, plus un écart à chaque début de chant.
  const debuts = [...reperes].map((r) => r.page).sort((a, b) => a - b);
  const indiceChant = (p: number) => Math.max(0, debuts.filter((d) => d <= p).length - 1);
  const place = (p: number) => p + ECART_CHANTS * indiceChant(p);
  const longueur = Math.max(place(total - 1), 1);
  const fraction = (p: number) => place(p) / longueur;

  const pageA = (clientX: number) => {
    const r = racine.current?.getBoundingClientRect();
    if (!r) return courante;
    const f = Math.min(1, Math.max(0, (clientX - r.left - MARGE) / (r.width - 2 * MARGE)));
    const u = f * longueur;
    let meilleure = 0;
    for (let p = 0; p < total; p++) if (Math.abs(place(p) - u) < Math.abs(place(meilleure) - u)) meilleure = p;
    return meilleure;
  };

  const viser = (p: number) => {
    setVisee(p);
    clearTimeout(minuterie.current);
  };
  const oublier = (delai: number) => {
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setVisee(null), delai);
  };
  const aller = (p: number) => {
    viser(p);
    onAller(p);
  };
  const position = (p: number) => `calc(${MARGE}px + (100% - ${2 * MARGE}px) * ${fraction(p)})`;

  const cible = visee ?? courante;
  const chantVise =
    visee === null ? null : [...reperes].reverse().find((r) => r.page <= visee) ?? reperes[0] ?? null;
  const frac = fraction(cible);

  // Rangée de points, ou piste continue d'un trait par chant au-delà de MAX_POINTS pages.
  const ajoutDe = (p: number) => !!reperes.find((r) => r.page === debuts.filter((d) => d <= p).pop())?.ajout;
  const creux = (couleur: string) => ({ background: "transparent", border: `2px solid ${couleur}` });
  const marques = (pleine: boolean) =>
    total <= MAX_POINTS
      ? Array.from({ length: total }, (_, p) => {
          const couleur = pleine ? COULEUR : COULEUR_INACTIVE;
          const ajout = ajoutDe(p);
          return (
            <span
              key={p}
              data-point={pleine ? "passe" : "inactif"}
              data-ajout={ajout ? "" : undefined}
              className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: position(p), ...(ajout ? creux(couleur) : { background: couleur }) }}
            />
          );
        })
      : (debuts.length ? debuts : [0]).map((d, i, tous) => {
          const fin = (tous[i + 1] ?? total) - 1;
          const couleur = pleine ? COULEUR : COULEUR_INACTIVE;
          const ajout = ajoutDe(d);
          return (
            <span
              key={d}
              data-point={pleine ? "passe" : "inactif"}
              data-ajout={ajout ? "" : undefined}
              className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
              style={{ left: position(d), width: `calc((100% - ${2 * MARGE}px) * ${(place(fin) - place(d)) / longueur})`, ...(ajout ? creux(couleur) : { background: couleur }) }}
            />
          );
        });

  return (
    <div
      ref={racine}
      data-curseur-page
      className="relative mx-auto h-11 touch-none"
      style={{ width: total <= MAX_POINTS ? `min(100%, ${longueur * PAS + 2 * MARGE}px)` : "100%" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button > 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        glisseRangee.current = true;
        aller(pageA(e.clientX));
      }}
      onPointerMove={(e) => {
        if (glisseRangee.current) aller(pageA(e.clientX));
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (glisseRangee.current) {
          glisseRangee.current = false;
          compter("cmd.louange.reperes");
          oublier(400);
        }
      }}
      onPointerCancel={() => {
        glisseRangee.current = false;
        oublier(0);
      }}
    >
      {chantVise && (
        <div
          aria-hidden="true"
          data-bulle-curseur
          className="pointer-events-none absolute bottom-[calc(100%-4px)] w-max max-w-[min(80vw,20rem)] rounded-xl border border-border bg-background px-3 py-1.5 text-center shadow-lg"
          style={{
            left: position(cible),
            transform: `translateX(${frac < 0.2 ? "-14px" : frac > 0.8 ? "calc(-100% + 14px)" : "-50%"})`,
          }}
        >
          <div data-bulle-titre className="truncate text-sm font-semibold leading-tight text-foreground">{chantVise.titre}</div>
          <div data-bulle-page className="text-xs leading-tight text-muted-foreground tabular-nums">{pageVignette(cible + 1)}</div>
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
        className="peer pointer-events-none absolute inset-x-0 top-0 m-0 h-11 w-full opacity-0"
        onChange={(e) => {
          aller(Number(e.target.value));
          oublier(1500);
        }}
        onKeyUp={(e) => { if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") compter("cmd.louange.reperes"); }}
        onBlur={() => oublier(0)}
        onKeyDown={(e) => {
          // Pédales Bluetooth : PageUp / PageDown / espace tournent d'une page, comme hors du curseur.
          const delta = e.key === "PageDown" || e.key === " " ? 1 : e.key === "PageUp" ? -1 : 0;
          if (delta === 0) return;
          e.preventDefault();
          onAller(courante + delta);
        }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 peer-focus-visible:[&_[data-poignee-curseur]]:ring-2 peer-focus-visible:[&_[data-poignee-curseur]]:ring-ring">
        {marques(false)}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 calc(100% - ${MARGE}px - (100% - ${2 * MARGE}px) * ${frac}) 0 0)` }}
        >
          {marques(true)}
        </div>
        {/* Poignée ronde, dans la couleur des icônes. */}
        <span
          data-poignee-curseur
          className="absolute top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-md"
          style={{ left: position(cible), background: COULEUR }}
        />
      </div>
      {reperes.map((r) => (
        <button
          key={`${r.page}-${r.titre}`}
          type="button"
          data-repere-chant
          data-page={r.page}
          data-titre={r.titre}
          aria-label={r.titre}
          onClick={() => onAller(r.page)}
          // Zone de 44 × 44 px centrée sur le premier point du chant, sans pointeur : la rangée traite tout toucher.
          className="pointer-events-none absolute top-0 h-11 w-11 -translate-x-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ left: position(r.page) }}
        />
      ))}
    </div>
  );
}
