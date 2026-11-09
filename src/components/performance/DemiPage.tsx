"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { bordsLibres, bordsParmi, bornerPart, choisirCoupe, type BordsDemi, type GroupeDemi, type SectionDemi, type ZoneDemi } from "@/lib/performance/demiPage";

/** Place (px écran) du rappel du nom de section entre le filet et la reprise de la moitié basse. */
const RESERVE_RAPPEL = 18;

/** Lot FS-E : affichage de la demi-page. Deux calques de la même zone de lecture, rendus par la même page de texte :
 *  la page suivante en haut (rognée au bord bas d'un bloc), la fin de la page en cours dessous (rognée à un bord haut de
 *  bloc ≥ la coupe) ; un filet de 2 px, couleur des icônes, et sa poignée à trois traits entre les deux. La coupe tombe
 *  toujours entre deux blocs, mesurée à l'écran sur les rendus eux-mêmes. Les annotations ne s'y montrent pas. */
export function DemiPage({
  clePage, rendreHaut, rendreBas, part, onPart, onPartFin, fontScale, contentPadding, nom, onEchec,
}: {
  /** Change quand la page, sa mise en page ou la taille du texte changent : remesure. */
  clePage: string;
  rendreHaut: () => ReactNode;
  rendreBas: () => ReactNode;
  part: number;
  onPart: (v: number) => void;
  onPartFin: (v: number) => void;
  fontScale: number;
  contentPadding: CSSProperties;
  nom: string;
  /** Aucune coupe ne convient : le parent passe en tour normal. */
  onEchec: () => void;
}) {
  const hautRef = useRef<HTMLDivElement>(null);
  const basRef = useRef<HTMLDivElement>(null);
  const [mesure, setMesure] = useState<{ bords: BordsDemi; top: number; left: number; largeur: number } | null>(null);
  const partRef = useRef(part);
  partRef.current = part;
  const echecRef = useRef(onEchec);
  echecRef.current = onEchec;
  const vuePourCle = useRef<string | null>(null);
  const fontsPretes = useRef(false);

  const mesurer = useCallback(() => {
    const h = hautRef.current;
    const b = basRef.current;
    if (!h || !b) return;
    // Un groupe = l'en-tête du chant (pleine largeur) ou une colonne de la page : chacun se coupe à ses propres bords de bloc.
    const lire = (couche: HTMLElement, cote: "haut" | "bas"): GroupeDemi[] => {
      const rects = (els: Iterable<Element>) => Array.from(els, (el): [number, number] => {
        const q = el.getBoundingClientRect();
        return [q.top, q.bottom];
      });
      const cadre = couche.getBoundingClientRect();
      const groupes: GroupeDemi[] = [];
      for (const e of couche.querySelectorAll("[data-entete-chant]")) {
        const q = e.getBoundingClientRect();
        groupes.push({ x0: cadre.left, x1: cadre.right, top: q.top, blocs: bordsLibres(rects([e]), cote), lignes: [], sections: [] });
      }
      for (const col of couche.querySelectorAll("[data-col-page]")) {
        const q = col.getBoundingClientRect();
        // Bords de ligne : les rangées de vers (les enfants `[data-rangee]` d'une ligne, ou la ligne elle-même) et, pour la
        // reprise en bas, le libellé de chaque section. Les libellés ne servent pas de bord bas : on ne coupe pas sous un titre.
        const rangees: Element[] = [];
        for (const l of col.querySelectorAll("[data-copy-line]")) {
          const r = l.querySelectorAll("[data-rangee]");
          if (r.length > 0) rangees.push(...r); else rangees.push(l);
        }
        const libelles = Array.from(col.querySelectorAll("[data-section] > [data-copy-ignore]:first-child:not([data-repere-gouttiere])"));
        const obstacles = rects([...rangees, ...libelles]);
        const sections: SectionDemi[] = Array.from(col.querySelectorAll("[data-section]"), (sec) => {
          const r = sec.getBoundingClientRect();
          const pastille = sec.querySelector<HTMLElement>("[data-repere-pastille]");
          const libelle = sec.querySelector(":scope > [data-copy-ignore]:first-child:not([data-repere-gouttiere]) > span:last-child");
          const nom = (pastille?.title ?? libelle?.firstChild?.textContent ?? "").trim();
          return { top: r.top, bottom: r.bottom, nom };
        });
        groupes.push({
          x0: q.left, x1: q.right, top: q.top,
          blocs: bordsLibres(rects(Array.from(col.children)), cote),
          lignes: bordsParmi(rects(cote === "bas" ? rangees : [...rangees, ...libelles]), obstacles, cote),
          sections,
        });
      }
      return groupes;
    };
    const bords: BordsDemi = { haut: lire(h, "bas"), bas: lire(b, "haut") };
    const cadre = h.getBoundingClientRect();
    setMesure({ bords, top: cadre.top, left: cadre.left, largeur: cadre.width });
    // L'échec ne se juge qu'à l'arrivée sur la page (avec la part retenue), pas pendant un réglage au doigt.
    // Pas de verdict tant que les polices ne sont pas prêtes : des rangées mesurées avant leur chargement ne valent rien.
    if (fontsPretes.current && vuePourCle.current !== clePageRef.current) {
      vuePourCle.current = clePageRef.current;
      const c = choisirCoupe(bords, partRef.current * window.innerHeight, window.innerHeight, RESERVE_RAPPEL);
      if (!c) echecRef.current();
    }
  }, []);
  const clePageRef = useRef(clePage);
  clePageRef.current = clePage;

  useLayoutEffect(() => {
    fontsPretes.current = false;
    mesurer();
    let raf = 0;
    let annule = false;
    void document.fonts.ready.then(() => { if (!annule) { fontsPretes.current = true; mesurer(); } });
    raf = requestAnimationFrame(() => requestAnimationFrame(mesurer));
    window.addEventListener("resize", mesurer);
    return () => {
      annule = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", mesurer);
    };
  }, [clePage, mesurer]);

  const hauteurFenetre = typeof window === "undefined" ? 0 : window.innerHeight;
  const coupe = useMemo(() => (mesure ? choisirCoupe(mesure.bords, part * hauteurFenetre, hauteurFenetre, RESERVE_RAPPEL) : null), [mesure, part, hauteurFenetre]);
  const aLocal = (y: number) => (y - (mesure?.top ?? 0)) / fontScale;
  const yFiletLocal = coupe && mesure ? aLocal(coupe.yCoupe) : 0;
  const pret = !!coupe && !!mesure;
  // Rectangles visibles de chaque calque (px écran) : les colonnes s'étendent jusqu'au milieu de la gouttière, les bords
  // extérieurs jusqu'à ceux du calque ; l'en-tête garde la pleine largeur.
  const zones = useMemo(() => {
    if (!coupe || !mesure) return null;
    const { left, largeur, top } = mesure;
    const bottom = top + 1e5;
    const etendre = (liste: ZoneDemi[]) => {
      const colonnes = liste.filter((z) => z.x1 - z.x0 < largeur * 0.95).sort((p, q) => p.x0 - q.x0);
      colonnes.forEach((z, i) => {
        z.x0 = i === 0 ? left : (colonnes[i - 1].x1 + z.x0) / 2;
        z.x1 = i === colonnes.length - 1 ? left + largeur : (z.x1 + colonnes[i + 1].x0) / 2;
      });
      return liste;
    };
    const copie = (liste: ZoneDemi[]) => etendre(liste.map((z) => ({ ...z })));
    const haut = copie(coupe.haut).filter((z) => z.y > top).map((z): [number, number, number, number] => [z.x0, top, z.x1, z.y]);
    const bas = copie(coupe.bas).filter((z) => Number.isFinite(z.y)).map((z): [number, number, number, number] => [z.x0, z.y, z.x1, bottom]);
    return { haut, bas };
  }, [coupe, mesure]);
  const chemin = (rects: Array<[number, number, number, number]>) => {
    if (!mesure || rects.length === 0) return "inset(100% 0 0 0)";
    const lx = (x: number) => ((x - mesure.left) / fontScale).toFixed(2);
    const ly = (y: number) => aLocal(y).toFixed(2);
    return `path("${rects.map(([x0, y0, x1, y1]) => `M${lx(x0)} ${ly(y0)}H${lx(x1)}V${ly(y1)}H${lx(x0)}Z`).join("")}")`;
  };

  const [glisse, setGlisse] = useState(false);
  const partDe = (e: React.PointerEvent) => bornerPart(e.clientY / window.innerHeight);
  const derniere = useRef(part);

  return (
    <div data-demi-page-calques className="relative h-full">
      <div
        ref={hautRef}
        data-demi-haut
        className="absolute inset-0"
        data-demi-zones={zones ? JSON.stringify(zones.haut) : undefined}
        style={{ visibility: pret ? undefined : "hidden", clipPath: zones ? chemin(zones.haut) : undefined }}
      >
        {rendreHaut()}
      </div>
      <div
        ref={basRef}
        data-demi-bas
        className="absolute inset-0"
        data-demi-zones={zones ? JSON.stringify(zones.bas) : undefined}
        style={{ visibility: pret ? undefined : "hidden", clipPath: zones ? chemin(zones.bas) : undefined }}
      >
        {rendreBas()}
      </div>
      {pret && (
        <>
          <div
            data-demi-filet
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              left: `calc(-1 * ${contentPadding.paddingLeft})`,
              right: `calc(-1 * ${contentPadding.paddingRight})`,
              top: yFiletLocal,
              height: 2 / fontScale,
              transform: "translateY(-50%)",
              background: "var(--couleur-icones)",
            }}
          />
          {coupe.bas.map((z, i) =>
            z.rappel && Number.isFinite(z.y) ? (
              <div
                key={i}
                data-demi-rappel
                aria-hidden="true"
                className="pointer-events-none absolute truncate text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground"
                style={{
                  left: (z.x0 - mesure.left) / fontScale,
                  width: (z.x1 - z.x0) / fontScale,
                  top: aLocal(z.y) - RESERVE_RAPPEL / fontScale,
                  height: RESERVE_RAPPEL / fontScale,
                  lineHeight: `${RESERVE_RAPPEL / fontScale}px`,
                  fontSize: 11 / fontScale,
                }}
              >
                {z.rappel}
              </div>
            ) : null,
          )}
          <div
            role="slider"
            tabIndex={0}
            aria-label={nom}
            aria-orientation="vertical"
            aria-valuemin={25}
            aria-valuemax={75}
            aria-valuenow={Math.round(part * 100)}
            aria-valuetext={`${Math.round(part * 100)} %`}
            data-demi-poignee
            data-glisse={glisse ? "" : undefined}
            className="absolute flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--couleur-icones)]"
            style={{
              left: "50%",
              top: yFiletLocal,
              width: 44 / fontScale,
              height: 44 / fontScale,
              transform: "translate(-50%, -50%)",
              touchAction: "none",
              cursor: "ns-resize",
              zIndex: 2,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setGlisse(true);
              derniere.current = partRef.current;
            }}
            onPointerMove={(e) => {
              if (!glisse) return;
              derniere.current = partDe(e);
              onPart(derniere.current);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (!glisse) return;
              setGlisse(false);
              onPartFin(partDe(e));
            }}
            onPointerCancel={() => {
              setGlisse(false);
              onPartFin(derniere.current);
            }}
            onKeyDown={(e) => {
              if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
              e.preventDefault();
              e.stopPropagation();
              const v = bornerPart(Math.round((partRef.current + (e.key === "ArrowUp" ? -0.05 : 0.05)) * 100) / 100);
              onPart(v);
              onPartFin(v);
            }}
          >
            <span
              aria-hidden="true"
              className="flex flex-col items-center justify-center gap-[3px] rounded-full"
              style={{ width: 36 / fontScale, height: 20 / fontScale, background: "var(--couleur-icones)" }}
            >
              {[0, 1, 2].map((k) => (
                <span key={k} className="block rounded-full bg-background" style={{ width: 18 / fontScale, height: 2 / fontScale }} />
              ))}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
